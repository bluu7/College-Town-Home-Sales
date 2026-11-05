"""Writes data/site_summary.json, the small summary the web page reads.

Run from the repository root:  python3 scripts/make_site_summary.py

Rules (also written into the JSON so the page can state them):
- Price rule: keep sales from $10,000 to $5,000,000. This drops the implausible prices the
  data description sheet warns about (40 sales under $10,000, 31 over $5,000,000, some overlap).
- Price per square foot: only homes with at least 300 sq ft of living area (living area is 0 on
  some rows).
- Days on market = contract_date - list_date, only where both exist (never treating blank as 0).
- Campus = the `university` column. Medians are used everywhere because of the long tails.
- Property tax rate = tax_annual_amount / sale_price, kept only between 0.1% and 5% of the sale
  price. This drops $0 bills, tiny bills and the $1,000,000,000 bill the description sheet warns about.
- Distance bands and year-built groups need at least MIN_CELL homes to be shown.
"""
import json
import pandas as pd

SRC = "data/college_town_home_sales.csv"
OUT = "data/site_summary.json"
MIN_PRICE, MAX_PRICE, MIN_SQFT = 10_000, 5_000_000, 300
MIN_RATE, MAX_RATE, MIN_CELL = 0.001, 0.05, 30

df = pd.read_csv(SRC, dtype={"zipcode": str, "county_fips": str, "parcel_number": str})
total = len(df)
d = df[(df.sale_price >= MIN_PRICE) & (df.sale_price <= MAX_PRICE)].copy()

d["ppsf"] = d.sale_price / d.living_area_sqft.where(d.living_area_sqft >= MIN_SQFT)
d["dom"] = (pd.to_datetime(d.contract_date) - pd.to_datetime(d.list_date)).dt.days
d["month"] = pd.to_datetime(d.sale_date).dt.month
d["near"] = d.miles_to_campus <= 1
d["year"] = pd.to_datetime(d.sale_date).dt.year
d["tax_rate"] = d.tax_annual_amount / d.sale_price
d["tax_ok"] = d.tax_rate.between(MIN_RATE, MAX_RATE)
BANDS = [(0, 1, "Under 1 mi"), (1, 2, "1 to 2 mi"), (2, 3, "2 to 3 mi"), (3, 5, "3 to 5 mi"), (5, 8, "5 to 8 mi"), (8, 99, "8+ mi")]
YEAR_GROUPS = [(0, 1949, "Before 1950")] + [(y, y + 9, f"{y}s") for y in range(1950, 2020, 10)] + [(2020, 2026, "2020 to 2026")]


def med(series, minimum=1):
    series = series.dropna()
    return float(series.median()) if len(series) >= minimum else None


def bands(g):
    out = []
    for lo, hi, label in BANDS:
        x = g[(g.miles_to_campus > lo) & (g.miles_to_campus <= hi) if lo else (g.miles_to_campus <= hi)].ppsf.dropna()
        out.append({"label": label, "n": int(len(x)), "median_ppsf": med(x, MIN_CELL)})
    return out


def years(g):
    out = []
    for y, h in g.groupby("year"):
        out.append({"year": int(y), "sales": int(len(h)), "median_price": float(h.sale_price.median()),
                    "last_month": int(pd.to_datetime(h.sale_date).dt.month.max())})
    return out

campuses = []
for uni, g in d.groupby("university"):
    near, far = g[g.near].ppsf.dropna(), g[~g.near].ppsf.dropna()
    dom = g.dom.dropna()
    campuses.append({
        "university": uni,
        "sales": int(len(g)),
        "median_price": float(g.sale_price.median()),
        "median_ppsf": float(g.ppsf.median()),
        "near_sales": int(len(near)),
        "near_median_ppsf": float(near.median()),
        "far_sales": int(len(far)),
        "far_median_ppsf": float(far.median()),
        "dom_sales": int(len(dom)),
        "dom_share_of_sales": float(len(dom) / len(g)),
        "median_dom": float(dom.median()),
        "cities": sorted(g.city.unique().tolist()),
        "states": sorted(g.state.unique().tolist()),
        "median_tax_rate": med(g[g.tax_ok].tax_rate),
        "tax_sales": int(g.tax_ok.sum()),
        "bands": bands(g),
        "years": years(g),
        "no_list_share": float(g.list_date.isna().mean()),
    })

months = []
for m, g in d.groupby("month"):
    months.append({"month": int(m), "sales": int(len(g)), "median_dom": float(g.dom.dropna().median()),
                   "dom_sales": int(g.dom.notna().sum())})

cities = []
for (city, state), g in d.groupby(["city", "state"]):
    cities.append({"city": city, "state": state, "university": g.university.mode().iloc[0], "sales": int(len(g)),
                   "median_price": float(g.sale_price.median()), "median_ppsf": med(g.ppsf),
                   "median_dom": med(g.dom, MIN_CELL), "no_list_share": float(g.list_date.isna().mean()),
                   "median_tax_rate": med(g[g.tax_ok].tax_rate, MIN_CELL)})

# Newly built homes are the ones most often sold with no listing (description sheet, problem 1)
d["no_list"] = d.list_date.isna()
d["new_build"] = d.year_built >= d.year - 1
built = []
for lo, hi, label in YEAR_GROUPS:
    g = d[d.year_built.between(lo, hi)]
    built.append({"label": label, "sales": int(len(g)), "median_price": med(g.sale_price, MIN_CELL),
                  "median_ppsf": med(g.ppsf, MIN_CELL), "median_dom": med(g.dom, MIN_CELL)})

summary = {
    "source": SRC,
    "rows_in_file": int(total),
    "rows_used": int(len(d)),
    "rows_dropped_by_price_rule": int(total - len(d)),
    "min_price": MIN_PRICE, "max_price": MAX_PRICE, "min_sqft": MIN_SQFT,
    "median_price_all": float(d.sale_price.median()),
    "median_dom_all": float(d.dom.dropna().median()),
    "min_rate": MIN_RATE, "max_rate": MAX_RATE, "min_cell": MIN_CELL,
    "tax_rows_used": int(d.tax_ok.sum()),
    "all_years": years(d),
    "all_bands": bands(d),
    "no_list_new_build_share": float(d[d.no_list].new_build.mean()),
    "listed_new_build_share": float(d[~d.no_list].new_build.mean()),
    "built": built,
    "cities": cities,
    "campuses": campuses,
    "months": months,
}
with open(OUT, "w") as f:
    json.dump(summary, f, indent=1)
print("wrote", OUT)

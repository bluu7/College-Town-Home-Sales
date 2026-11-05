"""Writes data/site_summary.json, the small summary the web page reads.

Run from the repository root:  python3 scripts/make_site_summary.py

Rules (also written into the JSON so the page can state them):
- Price rule: keep sales from $10,000 to $5,000,000. This drops the implausible prices the
  data description sheet warns about (40 sales under $10,000, 31 over $5,000,000, some overlap).
- Price per square foot: only homes with at least 300 sq ft of living area (living area is 0 on
  some rows).
- Days on market = contract_date - list_date, only where both exist (never treating blank as 0).
- Campus = the `university` column. Medians are used everywhere because of the long tails.
"""
import json
import pandas as pd

SRC = "data/college_town_home_sales.csv"
OUT = "data/site_summary.json"
MIN_PRICE, MAX_PRICE, MIN_SQFT = 10_000, 5_000_000, 300

df = pd.read_csv(SRC, dtype={"zipcode": str, "county_fips": str, "parcel_number": str})
total = len(df)
d = df[(df.sale_price >= MIN_PRICE) & (df.sale_price <= MAX_PRICE)].copy()

d["ppsf"] = d.sale_price / d.living_area_sqft.where(d.living_area_sqft >= MIN_SQFT)
d["dom"] = (pd.to_datetime(d.contract_date) - pd.to_datetime(d.list_date)).dt.days
d["month"] = pd.to_datetime(d.sale_date).dt.month
d["near"] = d.miles_to_campus <= 1

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
    })

months = []
for m, g in d.groupby("month"):
    months.append({"month": int(m), "sales": int(len(g)), "median_dom": float(g.dom.dropna().median()),
                   "dom_sales": int(g.dom.notna().sum())})

summary = {
    "source": SRC,
    "rows_in_file": int(total),
    "rows_used": int(len(d)),
    "rows_dropped_by_price_rule": int(total - len(d)),
    "min_price": MIN_PRICE, "max_price": MAX_PRICE, "min_sqft": MIN_SQFT,
    "median_price_all": float(d.sale_price.median()),
    "median_dom_all": float(d.dom.dropna().median()),
    "campuses": campuses,
    "months": months,
}
with open(OUT, "w") as f:
    json.dump(summary, f, indent=1)
print("wrote", OUT)

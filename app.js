// Reads data/site_summary.json (made by scripts/make_site_summary.py) and draws the page.
// Every number shown comes from that file.
const $ = (id) => document.getElementById(id);
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const num = (n) => Math.round(n).toLocaleString("en-US");
const pct = (n) => Math.round(n * 100) + "%";
const pct1 = (n) => (n * 100).toFixed(2) + "%";
const SHORT = {
  "University of California, Davis": "UC Davis",
  "The University of North Carolina at Chapel Hill": "UNC Chapel Hill",
  "University of Illinois Urbana-Champaign": "U. Illinois",
  "University of Wisconsin-Madison": "U. Wisconsin",
  "The Pennsylvania State University": "Penn State",
  "Purdue University": "Purdue",
  "The University of Iowa": "U. Iowa",
  "University of Florida": "U. Florida",
  "University of Georgia": "U. Georgia",
  "University of Michigan": "U. Michigan",
  "University of Virginia": "U. Virginia",
};
const short = (u) => SHORT[u] || u;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const median = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const set = (id, t) => { $(id).textContent = t; };

function bars(el, rows, fmt) {
  const max = Math.max(...rows.map((r) => r.value));
  el.innerHTML = "";
  for (const r of rows) {
    const row = document.createElement("div");
    row.className = "row" + (r.hi ? " hi" : "") + (r.dim ? " dim" : "");
    const label = document.createElement("div");
    label.textContent = r.label;
    const track = document.createElement("div");
    track.className = "track";
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.width = (r.value / max * 70) + "%";
    const val = document.createElement("span");
    val.className = "val";
    val.textContent = fmt(r.value) + (r.sub ? " " : "");
    if (r.sub) { const s = document.createElement("span"); s.className = "sub"; s.textContent = r.sub; val.append(s); }
    track.append(bar, val);
    row.append(label, track);
    el.append(row);
  }
}

function card(el, items) {
  el.innerHTML = "";
  for (const [big, small, wide] of items) {
    const d = document.createElement("div");
    if (wide) d.className = "wide";
    const b = document.createElement("b"); b.textContent = big;
    const s = document.createElement("span"); s.textContent = small;
    d.append(b, s); el.append(d);
  }
}

fetch("data/site_summary.json?v=3", { cache: "no-cache" }).then((r) => r.json()).then((s) => {
  const C = s.campuses;
  set("lede", `${num(s.rows_used)} completed home sales around ${C.length} university campuses, ${s.all_years[0].year} to early ${s.all_years[s.all_years.length - 1].year}. The typical home sold for ${money(s.median_price_all)} and went under contract ${num(s.median_dom_all)} days after listing.`);

  // ---- Campus picker + card + the charts that follow it
  const sel = $("focus");
  sel.innerHTML = '<option value="">All campuses</option>' + [...C].sort((a, b) => short(a.university).localeCompare(short(b.university)))
    .map((c) => `<option value="${c.university}">${short(c.university)}</option>`).join("");

  function focus() {
    const c = C.find((x) => x.university === sel.value);
    const name = c ? short(c.university) : "all campuses";
    const years = c ? c.years : s.all_years;
    const bands = c ? c.bands : s.all_bands;

    if (c) {
      card($("card"), [[money(c.median_price), "median sale price"], [money(c.median_ppsf), "median per sq ft"],
        [num(c.median_dom) + " days", "median days on market"], [num(c.sales), "sales"],
        [c.cities.join(", ") + " (" + c.states.join(", ") + ")", "cities in this campus area", true]]);
    } else {
      card($("card"), [[money(s.median_price_all), "median sale price"], [num(s.median_dom_all) + " days", "median days on market"],
        [num(s.rows_used), "sales"], [String(C.length), "campuses"]]);
    }

    // Price over time
    const first = years[0], last = years[years.length - 1];
    const partial = (y) => y.last_month < 12;
    set("h-year", `Median price over time: ${name}`);
    set("t-year", `Median sale price by year the sale closed, from ${money(first.median_price)} in ${first.year} to ${money(years[years.length - 2].median_price)} in ${years[years.length - 2].year}. ${last.year} is partial: its sales run only through ${MONTHS[last.last_month - 1]}, so compare it with caution (sales are also seasonal).`);
    bars($("c-year"), years.map((y) => ({ label: String(y.year) + (partial(y) ? " (to " + MONTHS[y.last_month - 1] + ")" : ""), value: y.median_price, dim: partial(y), sub: `n=${num(y.sales)}` })), money);

    // Distance curve, indexed to the campus's own median price per sq ft
    let rows;
    if (c) {
      rows = bands.filter((b) => b.median_ppsf !== null).map((b) => ({ label: b.label, value: b.median_ppsf, sub: `n=${num(b.n)}` }));
      set("t-dist", `Median price per square foot by straight-line distance from the ${name} landmark. Bands with fewer than ${s.min_cell} homes are left out.`);
      bars($("c-dist"), rows, money);
    } else {
      // For all campuses: each campus's band median relative to its own overall median, then the median across campuses
      const labels = s.all_bands.map((b) => b.label);
      rows = labels.map((l, i) => {
        const v = C.map((k) => k.bands[i].median_ppsf !== null ? k.bands[i].median_ppsf / k.median_ppsf : null).filter((x) => x !== null);
        return { label: l, value: median(v) * 100, sub: `${v.length} of ${C.length} campuses` };
      });
      set("t-dist", `Each campus's price per square foot by distance is first compared with that campus's own median (100 = the campus median), then the median across campuses is shown. Pick a campus above for dollar figures.`);
      bars($("c-dist"), rows, (v) => num(v));
    }
    set("h-dist", `Price per square foot by distance from campus: ${name}`);
  }
  sel.addEventListener("change", focus);

  // ---- 1. Price by campus
  const byPrice = [...C].sort((a, b) => b.median_price - a.median_price);
  const hiP = byPrice[0], loP = byPrice[byPrice.length - 1];
  set("h-price", `A typical home costs ${(hiP.median_price / loP.median_price).toFixed(1)}× more near ${short(hiP.university)} than near ${short(loP.university)}`);
  set("t-price", `Median sale price runs from ${money(loP.median_price)} near ${short(loP.university)} to ${money(hiP.median_price)} near ${short(hiP.university)}.`);
  bars($("c-price"), byPrice.map((c, i) => ({ label: short(c.university), value: c.median_price, hi: i === 0 || i === byPrice.length - 1, sub: `n=${num(c.sales)}` })), money);

  // ---- 2. Premium within one mile
  const prem = C.map((c) => ({ c, p: c.near_median_ppsf / c.far_median_ppsf - 1 })).sort((a, b) => b.p - a.p);
  const allUp = prem.every((x) => x.p > 0);
  set("h-near", `Homes within a mile of campus cost more per square foot${allUp ? " at every campus" : ""}`);
  set("t-near", `Comparing price per square foot inside one mile of campus with homes farther out (same campus, so city price levels cancel out): the premium is ${pct(prem[prem.length - 1].p)} near ${short(prem[prem.length - 1].c.university)} and ${pct(prem[0].p)} near ${short(prem[0].c.university)}. Only ${num(Math.min(...C.map((c) => c.near_sales)))} to ${num(Math.max(...C.map((c) => c.near_sales)))} homes per campus fall inside a mile, so read the small gaps cautiously.`);
  bars($("c-near"), prem.map((x, i) => ({ label: short(x.c.university), value: x.p, hi: i === 0, sub: `${money(x.c.near_median_ppsf)} vs ${money(x.c.far_median_ppsf)} per sq ft` })), (v) => "+" + pct(v));

  // ---- Tax burden
  const byTax = C.filter((c) => c.median_tax_rate !== null).sort((a, b) => b.median_tax_rate - a.median_tax_rate);
  const hiT = byTax[0], loT = byTax[byTax.length - 1];
  set("h-tax", `Property tax takes ${pct1(hiT.median_tax_rate)} of a home's price near ${short(hiT.university)}, ${pct1(loT.median_tax_rate)} near ${short(loT.university)}`);
  set("t-tax", `Median of annual property tax divided by sale price. ${hiT === byTax.find((c) => c.university === loP.university) ? `The lowest-priced campus area (${short(loP.university)}) has the highest rate, so a cheaper home does not mean a smaller tax bill relative to its price. ` : ""}Based on ${num(s.tax_rows_used)} sales with a plausible tax bill; tax is the most recent bill, which may not match the sale year.`);
  bars($("c-tax"), byTax.map((c, i) => ({ label: short(c.university), value: c.median_tax_rate, hi: i === 0 || i === byTax.length - 1, sub: `n=${num(c.tax_sales)}` })), pct1);

  // ---- Unlisted sales by city
  const byNL = [...s.cities].sort((a, b) => b.no_list_share - a.no_list_share);
  set("h-nolist", `${pct(byNL[0].no_list_share)} of sales in ${byNL[0].city} have no listing on record, against ${pct(byNL[byNL.length - 1].no_list_share)} in ${byNL[byNL.length - 1].city}`);
  set("t-nolist", `Share of sales with no listing date: off-market deals, or homes sold directly by a builder. ${pct(s.no_list_new_build_share)} of these unlisted sales were built the year of the sale or the year before, against ${pct(s.listed_new_build_share)} of listed sales. This is why days on market describes listed homes only.`);
  bars($("c-nolist"), byNL.map((c, i) => ({ label: `${c.city}, ${c.state}`, value: c.no_list_share, hi: i === 0, sub: `n=${num(c.sales)}` })), pct);

  // ---- Year built
  const B = s.built.filter((b) => b.median_price !== null);
  const newest = B[B.length - 1], oldest = B[0];
  set("h-built", `Homes built ${newest.label} take ${num(newest.median_dom)} days to go under contract; homes built ${oldest.label.toLowerCase()} take ${num(oldest.median_dom)}`);
  set("t-built", `Median sale price by decade built, with median days on market beside each bar. The data does not say why newer homes take longer, only that they do. Homes built ${newest.label} are included only when they sold, so unsold new homes are not counted.`);
  bars($("c-built"), B.map((b, i) => ({ label: b.label, value: b.median_price, hi: i === B.length - 1, sub: `${num(b.median_dom)} days on market, n=${num(b.sales)}` })), money);

  // ---- Seasonality
  const M = s.months;
  const minD = Math.min(...M.map((m) => m.median_dom)), maxD = Math.max(...M.map((m) => m.median_dom));
  const fastM = M.filter((m) => m.median_dom === minD), slow = M.find((m) => m.median_dom === maxD);
  const fastNames = fastM.length > 1 ? `${MONTHS[fastM[0].month - 1]} to ${MONTHS[fastM[fastM.length - 1].month - 1]}` : MONTHS[fastM[0].month - 1];
  set("h-month", `Homes closing in ${fastNames} spend ${num(minD)} days on the market (median); in ${MONTHS[slow.month - 1]}, ${num(maxD)}`);
  set("t-month", `Median days from listing to contract, by the month the sale closed. Spring and early summer are the fast season, and winter sales sit much longer.`);
  bars($("c-month"), M.map((m) => ({ label: MONTHS[m.month - 1], value: m.median_dom, hi: m.median_dom === minD || m === slow })), (v) => num(v) + " days");

  // ---- Days on market by campus
  const byDom = [...C].sort((a, b) => a.median_dom - b.median_dom);
  const q = byDom[0], sl = byDom[byDom.length - 1];
  const fastN = byDom.filter((c) => c.median_dom <= 10).length;
  set("h-dom", `Speed varies by campus: ${num(q.median_dom)} days near ${short(q.university)}, ${num(sl.median_dom)} near ${short(sl.university)}`);
  set("t-dom", `${fastN} of ${C.length} campuses have a median of 10 days or less from listing to contract. This only counts homes with both a listing date and a contract date (${pct(Math.min(...C.map((c) => c.dom_share_of_sales)))} to ${pct(Math.max(...C.map((c) => c.dom_share_of_sales)))} of each campus's sales), so it describes listed homes.`);
  bars($("c-dom"), byDom.map((c) => ({ label: short(c.university), value: c.median_dom, sub: `n=${num(c.dom_sales)}` })), (v) => num(v) + " days");

  focus();

  // ---- Notes
  const notes = [
    `Sales priced under ${money(s.min_price)} or over ${money(s.max_price)} were left out (${num(s.rows_dropped_by_price_rule)} of ${num(s.rows_in_file)} rows), because the data contains impossible prices.`,
    `All figures are medians, since a few extreme homes would distort averages.`,
    `Price per square foot only uses homes with at least ${num(s.min_sqft)} sq ft of living area; some rows report 0.`,
    `Tax rate is annual tax divided by sale price, kept only between ${pct1(s.min_rate)} and ${pct1(s.max_rate)} (the data has $0 bills and a $1,000,000,000 bill).`,
    `"Days on market" is listing date to contract date. Blank dates are skipped, never counted as zero.`,
    `Distance bands and decades with fewer than ${s.min_cell} homes are not shown.`,
    `Campus comes from the dataset's "university" column (nearest campus by coordinates). Distance is straight-line miles.`,
    `Values are as reported by the collection source and have not been checked against county records. Differences between campuses are descriptive, not proof of what causes them.`,
  ];
  $("notes").innerHTML = "";
  for (const n of notes) { const li = document.createElement("li"); li.textContent = n; $("notes").append(li); }
}).catch((e) => { set("lede", "Could not load data/site_summary.json: " + e.message); });

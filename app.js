// Reads data/site_summary.json (made by scripts/make_site_summary.py) and draws the page.
// Every number shown comes from that file.
const $ = (id) => document.getElementById(id);
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const num = (n) => Math.round(n).toLocaleString("en-US");
const pct = (n) => Math.round(n * 100) + "%";
const short = (u) => u.replace(/^The /, "").replace("University of ", "U. ").replace("The Pennsylvania State University", "Penn State")
  .replace("Pennsylvania State University", "Penn State").replace(" University", "").replace("U. California, Davis", "UC Davis")
  .replace("U. North Carolina at Chapel Hill", "UNC Chapel Hill").replace("U. Illinois Urbana-Champaign", "U. Illinois").replace("U. Wisconsin-Madison", "U. Wisconsin");
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function bars(el, rows, fmt) {
  const max = Math.max(...rows.map((r) => r.value));
  el.innerHTML = "";
  for (const r of rows) {
    const row = document.createElement("div");
    row.className = "row" + (r.hi ? " hi" : "");
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

fetch("data/site_summary.json").then((r) => r.json()).then((s) => {
  const C = s.campuses;
  $("lede").textContent = `${num(s.rows_used)} completed home sales around ${C.length} university campuses, 2023 to early 2026. The typical home sold for ${money(s.median_price_all)} and went under contract ${num(s.median_dom_all)} days after listing.`;

  // 1. Price by campus
  const byPrice = [...C].sort((a, b) => b.median_price - a.median_price);
  const hiP = byPrice[0], loP = byPrice[byPrice.length - 1];
  $("h-price").textContent = `A typical home costs ${(hiP.median_price / loP.median_price).toFixed(1)}× more near ${short(hiP.university)} than near ${short(loP.university)}`;
  $("t-price").textContent = `Median sale price runs from ${money(loP.median_price)} near ${short(loP.university)} to ${money(hiP.median_price)} near ${short(hiP.university)}.`;
  bars($("c-price"), byPrice.map((c, i) => ({ label: short(c.university), value: c.median_price, hi: i === 0 || i === byPrice.length - 1, sub: `n=${num(c.sales)}` })), money);

  // 2. Premium within one mile of campus
  const prem = C.map((c) => ({ c, p: c.near_median_ppsf / c.far_median_ppsf - 1 })).sort((a, b) => b.p - a.p);
  const allUp = prem.every((x) => x.p > 0);
  $("h-near").textContent = `Homes within a mile of campus cost more per square foot${allUp ? " at every campus" : ""}`;
  $("t-near").textContent = `Comparing price per square foot inside one mile of campus with homes farther out (same campus, so city price levels cancel out): the premium is ${pct(prem[prem.length - 1].p)} near ${short(prem[prem.length - 1].c.university)} and ${pct(prem[0].p)} near ${short(prem[0].c.university)}. Only ${num(Math.min(...C.map((c) => c.near_sales)))} to ${num(Math.max(...C.map((c) => c.near_sales)))} homes per campus fall inside a mile, so read the small gaps cautiously.`;
  bars($("c-near"), prem.map((x, i) => ({ label: short(x.c.university), value: x.p, hi: i === 0, sub: `${money(x.c.near_median_ppsf)} vs ${money(x.c.far_median_ppsf)} per sq ft` })), (v) => "+" + pct(v));

  // 3. Seasonality
  const M = s.months;
  const minD = Math.min(...M.map((m) => m.median_dom)), maxD = Math.max(...M.map((m) => m.median_dom));
  const fastM = M.filter((m) => m.median_dom === minD), slow = M.find((m) => m.median_dom === maxD);
  const fast = fastM[0];
  const fastNames = fastM.length > 1 ? `${MONTHS[fastM[0].month - 1]} to ${MONTHS[fastM[fastM.length - 1].month - 1]}` : MONTHS[fast.month - 1];
  $("h-month").textContent = `Homes closing in ${fastNames} spend ${num(minD)} days on the market (median); in ${MONTHS[slow.month - 1]}, ${num(maxD)}`;
  $("t-month").textContent = `Median days from listing to contract, by the month the sale closed. Spring and early summer are the fast season, and winter sales sit much longer.`;
  bars($("c-month"), M.map((m) => ({ label: MONTHS[m.month - 1], value: m.median_dom, hi: m.median_dom === minD || m === slow })), (v) => num(v) + " days");

  // 4. Days on market by campus
  const byDom = [...C].sort((a, b) => a.median_dom - b.median_dom);
  const q = byDom[0], sl = byDom[byDom.length - 1];
  const fastN = byDom.filter((c) => c.median_dom <= 10).length;
  $("h-dom").textContent = `Speed varies by campus: ${num(q.median_dom)} days near ${short(q.university)}, ${num(sl.median_dom)} near ${short(sl.university)}`;
  $("t-dom").textContent = `${fastN} of ${C.length} campuses have a median of 10 days or less from listing to contract. This only counts homes with both a listing date and a contract date (${pct(Math.min(...C.map((c) => c.dom_share_of_sales)))} to ${pct(Math.max(...C.map((c) => c.dom_share_of_sales)))} of each campus's sales), and homes sold with no listing are often new construction, so it describes listed homes.`;
  bars($("c-dom"), byDom.map((c) => ({ label: short(c.university), value: c.median_dom, sub: `n=${num(c.dom_sales)}` })), (v) => num(v) + " days");

  // Notes
  const notes = [
    `Sales priced under ${money(s.min_price)} or over ${money(s.max_price)} were left out (${num(s.rows_dropped_by_price_rule)} of ${num(s.rows_in_file)} rows), because the data contains impossible prices.`,
    `All figures are medians, since a few extreme homes would distort averages.`,
    `Price per square foot only uses homes with at least ${num(s.min_sqft)} sq ft of living area; some rows report 0.`,
    `"Days on market" is listing date to contract date. Blank dates are skipped, never counted as zero.`,
    `Campus comes from the dataset's "university" column (nearest campus by coordinates). Distance is straight-line miles.`,
    `Values are as reported by the collection source and have not been checked against county records. Differences between campuses are descriptive, not proof of what causes them.`,
  ];
  $("notes").innerHTML = "";
  for (const n of notes) { const li = document.createElement("li"); li.textContent = n; $("notes").append(li); }
}).catch((e) => { $("lede").textContent = "Could not load data/site_summary.json: " + e.message; });

# [Your site's title]

## Start here (delete this section before you submit)

This repository is your starting point for the Home Sales case. It already holds the dataset, its description sheet, project instructions for your AI coding agent, and outlines of the README and agent log that the case asks for.

1. **Turn on GitHub Pages.** In this repository, open **Settings**, then **Pages**. Under "Build and deployment," set **Source** to **GitHub Actions**. GitHub may suggest workflows to add. Skip them: this repository already has one, `.github/workflows/pages.yml`.
2. **Publish for the first time.** Open the **Actions** tab, choose **Publish site to GitHub Pages** in the sidebar, click **Run workflow**, then click **Run workflow** again to confirm. If the tab already shows a failed run from when you created the repository, that's expected: Pages wasn't turned on yet. When the new run shows a green check, your site is at `https://your-username.github.io/your-repo-name/`. It shows a placeholder page until you replace `index.html`.

    From then on, every push to the main branch publishes the site within a few minutes. If the live site doesn't show a change, open the **Actions** tab. A red X means the publish failed, and the run's log says why.
3. **Open the repository in your AI coding agent.** Its project instructions are in `AGENTS.md`. If your agent reads its instructions from a file with a different name, check its documentation and copy `AGENTS.md` to that name. Add to the instructions as you learn what your agent needs.
4. **Read `docs/data_description_sheet.md`** before you ask the agent for any analysis.
5. **Build in small steps,** as the setup guide describes. Add an entry to `AGENT_LOG.md` each time you work with the agent.
6. **Fill in every section below** before you submit.

| Path | What it is |
|---|---|
| `index.html` | A placeholder page. Replace it with your site. |
| `data/college_town_home_sales.csv` | The dataset, version 1.0: 35,442 rows. Your site reads this file. |
| `data/college_town_home_sales.xlsx`, `.sqlite`, `.duckdb`, `.parquet` | The same data in Excel, SQLite, DuckDB and Parquet formats, with identical values |
| `docs/data_description_sheet.md` | What every column means, and five problems in the data |
| `AGENTS.md` | Project instructions for your AI coding agent |
| `AGENT_LOG.md` | Your agent log |
| `scripts/` | Scripts that make smaller data files for the site |
| `.github/workflows/pages.yml` | Publishes the site to GitHub Pages each time you push to main. It publishes your files as they are. If you switch to a framework that needs a build step, have your agent update it. |

Don't edit any of the five dataset files. Your site needs only the CSV file. The other formats make it easier to check numbers a second way, for example with a pivot table in Excel or a SQL query on the SQLite file. In SQLite and DuckDB, the table is named `home_sales`.

## What this site is for

_Replace this line with your site's question and audience, or a short description of the site._

## Live site

https://your-username.github.io/your-repo-name/

## Data notes

The page reads `data/site_summary.json`, which `scripts/make_site_summary.py` builds from the CSV. To rebuild it, run `python3 scripts/make_site_summary.py` from the repository root (needs pandas).

- **Rows left out:** sales under $10,000 or over $5,000,000 (71 of 35,442 rows), because of the impossible prices described in the description sheet.
- **Medians** are used for every figure, not averages.
- **Price per square foot** only uses homes with at least 300 sq ft of living area (some rows are 0).
- **Days on market** is `contract_date - list_date`, only where both dates exist. Blanks are skipped, never counted as zero.
- **Campus** is the `university` column. "Near campus" means within 1 straight-line mile.
- Still to cover: the repeated street addresses and the unreliable `home_type` column (neither is used so far).

## Tools we used

_Replace this line with your AI coding agent or agents, and any libraries and other tools you used._

## Citation

College-town home sales dataset, version 1.0 (2026). University of Illinois-Deloitte Foundation Center for Business Emerging Technologies. Data collected March 2026.

## Who did what

_For teams: replace this line with each member's name and what they did. If you worked alone, delete this section._

# Data Sourcing Playbook — FRED / BLS / BEA

How we turned the original static chart images into real, multi-source datasets, and
how to repeat the same treatment for any other image in `public/images/`.

## Case study: chart 03 (`images/03-wages2arrow.jpg`)

**What the image contained**
CBPP chart "Income Gains Widely Shared in Early Postwar Decades — But Not Since Then":
*real family income, 1947–2016, indexed 1973=100*, with three curves — 95th percentile,
median, 20th percentile. Footnote: "CBPP calculations based on U.S. Census Bureau Data"
(i.e. Census CPS income percentiles).

**What we uncovered**
- FRED, BLS, and BEA do **not** publish those exact CPS percentiles.
- FRED hosts: the World Bank real median household income series, Census **CE-survey**
  quintile/decile average incomes (best percentile *proxies*), BEA NIPA series, and BLS
  CES wage series — under the original agency series IDs.
- BLS's API is usable directly (10-year chunks, daily quota).
- BEA's own API is effectively dead (see below) → use FRED's official BEA mirror.

**What we built**
- `scripts/fetch-income-distribution.js` — re-runnable multi-source fetcher.
- `public/data/median-household-income.json` — replaced the old single-series file with:

| Series | Source (ID) | Range | Base | 2016 value |
|---|---|---|---|---|
| Median household income | FRED / World Bank `MEHOINUSA672N` | 1984–2024 | 1984=100 | 124.8 (image: ~124 ✓) |
| Top 20% avg — 95th pct proxy | FRED / Census CE `CXUINCBEFTXLB0106M` | 1984–2024 | 1984=100 | 152.5 |
| Bottom 20% avg — 20th pct proxy | FRED / Census CE `CXUINCBEFTXLB0102M` | 1984–2024 | 1984=100 | 155.6 |
| Personal income per capita (mean) | BEA `A792RC0A052NBEA` | 1947–2025 | 1973=100 | 168.3 (image: ~168 ✓; 1947: 49.9 ≈ image's ~50 ✓) |
| Avg weekly earnings, production workers | BLS `CES0500000030` | 1964–2026 | 1973=100 | 87.8 (peaks ~1973, stagnates ✓) |

Nominal series deflated with CPI-U (`CPIAUCSL`); each series indexed to 1973=100 when it
has 1973 data, else to its first year (`baseYear` field).

**Wiring**
- `src/App.jsx` — entry #3 now points at the new file (title/source/fredIds/description).
- `scripts/fetch-data.js` — entry #3 removed, so re-running the FRED-only script can't
  overwrite the multi-source file.
- `src/components/InteractiveLineChart.jsx` — x-axis domain now spans **all** series
  (previously series[0] only, which clipped the BEA 1947–83 segment).

---

## Playbook — applying the same treatment to another image

1. **Read the image.** Title, subtitle (units, base year, year span), curve labels,
   source line, and footnotes. Identify the underlying dataset and its *true* agency
   (e.g. "CBPP calculations based on U.S. Census Bureau Data" → Census CPS).
2. **Pick the closest series per requested source** (FRED, BLS, BEA). Prefer:
   - the exact measure if published (median > mean > proxy, with honest labels),
   - longest history covering the image's base year,
   - official agency data (even if served via FRED).
3. **Search FRED first** — it mirrors BLS/BEA/Census/World Bank series under original IDs.
4. **BLS directly** for native series (wages, CPI, employment) — see API notes below.
5. **BEA** — try their API once; it will probably fail → use FRED's BEA mirror.
6. **Compute:** annualize → deflate nominal with `CPIAUCSL` → index to the image's
   base year (1973 for CBPP charts; 1971 is the site default) → sanity-check a few
   values by eye against the image (start year, 1973, end year).
7. **Ship:** save `public/data/<name>.json` (format below), add/replace the `App.jsx`
   entry, guard the entry in `scripts/fetch-data.js`, `npm run build`.

## API field guide

### FRED — works well
Base: `https://api.stlouisfed.org/fred/` · auth: `api_key` query param · ~120 req/min.

```bash
# observations (JSON)
curl "https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=$FRED_API_KEY&file_type=json&sort_order=asc&start_date=1947-01-01&end_date=2024-12-31"

# series metadata (title, start/end dates, units)
curl "https://api.stlouisfed.org/fred/series?series_id=CENS&api_key=$FRED_API_KEY"

# search — ⚠ returns XML, not JSON
curl "https://api.stlouisfed.org/fred/series/search?search_text=percentile%20income&limit=60&api_key=$FRED_API_KEY"
```

XML search results: `<series id title observation_start observation_end frequency units_short>`.
Useful search terms: `household income`, `percentile income`, `decile income`,
`weekly earnings`, `personal income per capita`.

FRED mirrors other agencies under their original IDs:
- BLS: `CES0500000003`, `CES0500000030`, `CES0500000011`, `AHETPI`, `CPIAUCSL` (BLS CPI-U)
- BEA: IDs ending in `BEA`, e.g. `A792RC0A052NBEA`, `A229RX0A048NBEA`, `A939RX0Q048SBEA`
- Census CE survey: `CXU*` (quintiles `…LB0102M/0106M` from 1984, deciles `…LB15xxM` from 2014)
- World Bank: `MEHOINUSA672N` (real median HHI, 1984–), `SIPOVGINIUSA`, `SPDYNLE00INUSA`

### BLS v2 — works, with limits
`POST https://api.bls.gov/publicAPI/v2/timeseries/data/`
Body: `{"seriesid":["CES0500000030"],"startyear":"1964","endyear":"1973","key":"..."}`

- **10 years of data per request** (even with a key) → chunk the range.
- **Daily request quota per key** — error: *"daily threshold for total number of
  requests allocated to the user ... reached"*. The fetch script falls back to FRED's
  mirror of the same series. Budget requests; don't debug-loop.
- `catalog:true` is disabled → no series titles from the API. Identify titles via FRED
  (search the series ID) or the FRED series page.
- `www.bls.gov` and `download.bls.gov` **block bots** (Access Denied) — don't scrape.
- CPI series IDs tried and rejected: `CUSR0000SA0L01`, `CUUR0000SA0L01`,
  `CUUSR0000SA0L01`, `CUUSC0000SA0L01` → use FRED's `CPIAUCSL` (same BLS CPI-U).
- Verified good: `CES0500000003` (avg hourly earnings, all employees, NSA, 1964–),
  `CES0500000030` (avg weekly earnings, production & nonsupervisory, 1964–),
  `CES0500000011` (avg weekly earnings, all employees, 2006–).

### BEA — API effectively dead
- Modern REST `https://apps.bea.gov/api/data/?UserID=...&Frequency=Annual&Table=...`
  accepts the key (it echoes params) but rejects **every** `Table` variant with
  `APIErrorCode 20 — The Dataset requested does not exist`. Tried: `NIPA`, `NIPA-T-24`,
  `NIPA-T-2-24`, `AN`, `24`, `2.24`, with/without `Sector=AN`, GET and POST.
- Legacy API (`apps.bea.gov/API/?Method=GetData&DatasetName=NIPA`, swagger at
  `apps.bea.gov/API/swagger/swagger.json`) is **retired** — every method redirects to
  `/api/signup`.
- The "API Guide PDF" URLs return HTML, and the docs page is a JS shell — no table list
  is publicly enumerable anymore.
- **Workaround that works: FRED's BEA mirror** (official BEA NIPA series, e.g.
  `A792RC0A052NBEA` personal income per capita 1929–2025, `A229RX0A048NBEA` real
  disposable PI per capita 1929–2025, `A939RX0Q048SBEA` real GDP per capita 1947–).

## Math

```text
annualize:  avg of that year's available observations
deflate:    real_t    = nominal_t / CPI_t                      (CPI = CPIAUCSL)
index:      index_t   = (real_t / real_base) × 100
           ≡ (nominal_t / CPI_t) × (CPI_base / nominal_base) × 100
base year:  the image's base (1973 for CBPP); if a series lacks it, use its first year
            and record it in the series' "baseYear" field
```

## Output format (`public/data/<name>.json`)

```json
{
  "title": "Real Household Income by Percentile",
  "unit": "Index (1973=100 where available, else first year=100)",
  "note": "provenance, proxies, and caveats — be honest about what is a proxy",
  "series": [
    {
      "name": "Median household income",
      "color": "#8D6E63",
      "source": "World Bank via FRED (MEHOINUSA672N)",
      "baseYear": 1984,
      "values": [ { "year": 1984, "value": 100.0 }, ... ]
    }
  ]
}
```

`ChartSection.jsx` fetches `data/<name>.json` (served from `public/`), shows the
original image on toggle, links `fredIds[0]` to FRED, and offers a JSON download —
so every field above is either displayed or useful to the reader.

## Environment

- Keys stay in environment variables only (`.env` is gitignored; never commit keys):
  `FRED_API_KEY`, `BLS_API_KEY`, `BEA_API_KEY` (BEA key is currently useless — see above).
- Run:
  ```bash
  export FRED_API_KEY=... BLS_API_KEY=...
  node scripts/fetch-income-distribution.js   # chart 03 (multi-source)
  node scripts/fetch-data.js                  # all other FRED-only charts
  ```

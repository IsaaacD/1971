# Missing Chart Datasets

36 of 81 chart datasets are missing. 45 datasets were successfully fetched from FRED.

---

## FRED Fetch Failed (21 charts)

These had FRED series IDs but the API returned HTTP 400 (invalid or restricted series ID). Need alternative FRED IDs or another data source.

| # | Dataset Name | Chart Title | Failed FRED ID(s) |
|---|-------------|-------------|-------------------|
| 06 | `labor-share-income` | Labor Share of National Income | `CL30109093` |
| 07 | `top-income-share` | Top Income Share | `EMPLRU` |
| 09 | `racial-inequality` | Racial Income Gap | `MEHOINUSAAA672N`, `MEHOINUSAAB672N` |
| 10 | `gender-pay-gap` | Gender Earnings Gap | `LRAC43FEUSM088S`, `LRAC43MAUSM088S` |
| 12 | `national-income-share` | National Income: Labor Compensation Share | `CL30109093` |
| 16 | `minimum-wage` | Real Minimum Wage | `LEU0255537500A` |
| 19 | `student-loan-debt` | Student Loan Debt | `HHSFCALTT027S` |
| 26 | `education-spending` | Education Spending | `PCECC` |
| 27 | `rd-spending` | R&D Government Spending | `FSGDRES` |
| 28 | `currency-stability` | Currency Stability | `DTWEXBPA` |
| 29 | `m1-money-supply` | M1 Money Supply | `MSL` |
| 34 | `debt-per-capita` | National Debt | `GYGSFDQ189S` |
| 38 | `defense-spending` | Defense Spending | `FSDDEF` |
| 39 | `bank-assets` | Bank Assets | `BOGZ1BB027922405` |
| 40 | `sp500-pe-ratio` | S&P 500 P/E Ratio | `TBMEY` |
| 41 | `shiller-cape` | Cyclically Adjusted P/E Ratio | `TBMEY` |
| 43 | `corporate-investment` | Corporate Investment | `CI` |
| 46 | `private-savings-gdp` | Private Savings | `PS` |
| 49 | `consumer-credit` | Consumer Credit | `HHSFCALTT027S` |
| 78 | `meat-consumption` | Meat Consumption | `PCECC` |
| 79 | `food-consumption` | Food Consumption | `PCECC` |

---

## No FRED Data Available (17 charts)

These topics have no FRED equivalent. Need manual data, CSV imports, or alternative APIs (CDC, Census, FBI, World Bank, OPEC, etc.).

| # | Dataset Name | Chart Title | Suggested Source |
|---|-------------|-------------|------------------|
| 55 | `political-polarization` | Political Polarization | DW-NOMINATE scores, manual CSV |
| 56 | `lobbying-spending` | Lobbying Spending | OpenSecrets API |
| 57 | `government-effectiveness` | Government Effectiveness | World Bank Governance Indicators |
| 58 | `voter-turnout` | Voter Turnout | MIT Election Data Lab, Census |
| 59 | `senate-filibuster` | Senate Filibuster / Cloture | Senate.gov cloture vote records |
| 60 | `campaign-contributions` | Campaign Contributions | OpenSecrets, FEC API |
| 61 | `lobbyists` | Number of Lobbyists | OpenSecrets API |
| 62 | `incarceration-rate` | Incarceration Rate | Bureau of Justice Statistics |
| 63 | `violent-crime-rate` | Violent Crime Rate | FBI Uniform Crime Reporting |
| 64 | `robbery-rate` | Robbery Rate | FBI Uniform Crime Reporting |
| 65 | `incarceration-rate-alt` | Incarceration Rate | Bureau of Justice Statistics |
| 66 | `drug-overdose` | Drug Overdose Deaths | CDC WISQARS, NCHS |
| 70 | `obesity-rate` | Obesity Rate | CDC NHANES data |
| 72 | `divorce-rate` | Divorce Rate | CDC, Census Bureau |
| 77 | `suicide-rate` | Suicide Rate | CDC WISQARS |
| 80 | `diet-nutrition` | Diet and Nutrition | USDA, NHANES |
| 81 | `processed-food` | Processed Food Consumption | USDA, manual estimates |

---

## Summary

| Category | Count |
|----------|-------|
| Successfully fetched | **45** |
| FRED fetch failed (need new IDs) | **21** |
| No FRED data (need other sources) | **17** |
| **Total** | **83** |

## Next Steps

1. **FRED failures**: Search FRED API for corrected series IDs, or hardcode data from alternative sources
2. **No FRED data**: Create static JSON files with manually sourced historical data in the same format as the fetched files
3. Once all 81 JSON files exist in `/public/data/`, every chart will render

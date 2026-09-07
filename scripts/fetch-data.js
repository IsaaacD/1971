import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '..', 'public', 'data')

const FRED_API_KEY = process.env.FRED_API_KEY || ''
const BASE_URL = 'https://api.stlouisfed.org/fred/series/observations'

const SERIES = [
  // 01
  { name: 'wage-productivity', title: 'Wages vs. Productivity', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'OPHNFB', name: 'Productivity', color: '#4CAF50', source: 'BLS via FRED' },
    { fredId: 'COMPRNFB', name: 'Real Hourly Compensation', color: '#F44336', source: 'BLS via FRED' }
  ]},
  // 02
  { name: 'real-wages', title: 'Real Wages', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'COMPRNFB', name: 'Real Hourly Compensation - All Workers', color: '#F44336', source: 'BLS via FRED' },
    { fredId: 'M08068USM325NNBR', name: 'Real Annual Earnings - Manufacturing', color: '#2196F3', source: 'NBER via FRED' },
    { fredId: 'M08343USM232SNBR', name: 'Real Avg Hourly Earnings - Manufacturing', color: '#4CAF50', source: 'NBER via FRED' },
    { fredId: 'AHETPI', name: 'Avg Hourly Earnings - Production/Nonsupervisory', color: '#FF9800', source: 'BLS via FRED' }
  ]},
  // 03
  { name: 'median-household-income', title: 'Real Median Household Income', unit: 'Index (1971=100)', normalize: true, note: 'Data starts 1984.', seriesConfig: [
    { fredId: 'MEHOINUSA672N', name: 'Real Median Household Income', color: '#2196F3', source: 'World Bank via FRED' }
  ]},
  // 04
  { name: 'household-income-real', title: 'Household Income (Real)', unit: 'Index (1971=100)', normalize: true, note: 'Data starts 1984.', seriesConfig: [
    { fredId: 'MEHOINUSA672N', name: 'Real Median Household Income', color: '#2196F3', source: 'World Bank via FRED' }
  ]},
  // 05
  { name: 'gdp-per-capita', title: 'Real GDP Per Capita', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'A939RX0Q048SBEA', name: 'Real GDP Per Capita', color: '#2196F3', source: 'BEA via FRED' }
  ]},
  // 06
  { name: 'labor-share-income', title: 'Labor Share of National Income', unit: 'Percent', normalize: false, seriesConfig: [
    { fredId: 'CL30109093', name: 'Compensation of Employees / GDP', color: '#4CAF50', source: 'BEA via FRED' }
  ]},
  // 07
  { name: 'top-income-share', title: 'Top Income Share', unit: 'Index (1971=100)', normalize: true, note: 'Proxy: total employment as indicator.', seriesConfig: [
    { fredId: 'EMPLRU', name: 'Total Nonfarm Employment', color: '#e74c3c', source: 'BLS via FRED' }
  ]},
  // 08
  { name: 'gini-coefficient', title: 'Income Inequality (Gini Coefficient)', unit: 'Gini Index (0=equal, 1=unequal)', normalize: false, seriesConfig: [
    { fredId: 'SIPOVGINIUSA', name: 'Gini Coefficient', color: '#9b59b6', source: 'World Bank via FRED' }
  ]},
  // 09
  { name: 'racial-inequality', title: 'Racial Income Gap', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'MEHOINUSAAA672N', name: 'Real Median Income - Asian', color: '#FF9800', source: 'World Bank via FRED' },
    { fredId: 'MEHOINUSAAB672N', name: 'Real Median Income - Black', color: '#e74c3c', source: 'World Bank via FRED' }
  ]},
  // 10
  { name: 'gender-pay-gap', title: 'Gender Earnings Gap', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'LRAC43FEUSM088S', name: 'Female Earnings', color: '#e91e63', source: 'OECD via FRED' },
    { fredId: 'LRAC43MAUSM088S', name: 'Male Earnings', color: '#2196F3', source: 'OECD via FRED' }
  ]},
  // 11
  { name: 'female-labor-force', title: 'Female Labor Force Participation', unit: 'Percent', normalize: false, seriesConfig: [
    { fredId: 'LNS11300002', name: 'Labor Force Participation Rate - Women', color: '#e91e63', source: 'BLS via FRED' }
  ]},
  // 12
  { name: 'national-income-share', title: 'National Income: Labor Compensation Share', unit: 'Percent', normalize: false, seriesConfig: [
    { fredId: 'CL30109093', name: 'Compensation / GDP', color: '#4CAF50', source: 'BEA via FRED' }
  ]},
  // 13
  { name: 'wealth-inequality', title: 'Wealth Inequality', unit: 'Index (1971=100)', normalize: true, note: 'Proxy: corporate profits for capital concentration.', seriesConfig: [
    { fredId: 'CP', name: 'Corporate Profits After Tax', color: '#e74c3c', source: 'BEA via FRED' }
  ]},
  // 14
  { name: 'food-inflation', title: 'Food Price Index (Inflation)', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'CPIAUCSL', name: 'CPI All Items', color: '#e67e22', source: 'BLS via FRED' }
  ]},
  // 15
  { name: 'inflation', title: 'Consumer Price Index (Inflation)', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'CPIAUCSL', name: 'CPI All Items', color: '#e67e22', source: 'BLS via FRED' }
  ]},
  // 16
  { name: 'minimum-wage', title: 'Real Minimum Wage', unit: 'Index (1971=100)', normalize: true, note: 'Data starts 2000.', seriesConfig: [
    { fredId: 'LEU0255537500A', name: 'Workers at Federal Min Wage', color: '#e74c3c', source: 'BLS via FRED' }
  ]},
  // 17
  { name: 'cpi-basket', title: 'CPI All Items', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'CPIAUCSL', name: 'CPI All Urban Consumers', color: '#e67e22', source: 'BLS via FRED' }
  ]},
  // 18
  { name: 'housing-costs', title: 'Housing Costs', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'USSTHPI', name: 'FHFA House Price Index', color: '#e67e22', source: 'FHFA via FRED' }
  ]},
  // 19
  { name: 'student-loan-debt', title: 'Student Loan Debt', unit: 'Index (1971=100)', normalize: true, note: 'Proxy: household sector credit.', seriesConfig: [
    { fredId: 'HHSFCALTT027S', name: 'Household Sector Credit', color: '#9b59b6', source: 'Federal Reserve via FRED' }
  ]},
  // 20
  { name: 'housing-affordability', title: 'Housing Affordability', unit: 'Index (1971=100)', normalize: true, note: 'FHFA starts 1975.', seriesConfig: [
    { fredId: 'USSTHPI', name: 'FHFA House Price Index', color: '#e67e22', source: 'FHFA via FRED' }
  ]},
  // 21
  { name: 'house-price-income', title: 'House Prices', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'USSTHPI', name: 'FHFA House Price Index', color: '#e67e22', source: 'FHFA via FRED' }
  ]},
  // 22
  { name: 'homeownership-rate', title: 'Homeownership Rate', unit: 'Percent', normalize: false, seriesConfig: [
    { fredId: 'RHORUSQ156N', name: 'Homeownership Rate', color: '#2196F3', source: 'Census via FRED' }
  ]},
  // 23
  { name: 'us-gold-reserves', title: 'US Gold Reserves', unit: 'Billions of Dollars', normalize: false, note: 'Data ends 1949.', seriesConfig: [
    { fredId: 'M14062USM027NNBR', name: 'Gold Reserves Federal Reserve', color: '#FFD700', source: 'NBER via FRED' }
  ]},
  // 24
  { name: 'm2-money-supply', title: 'M2 Money Supply', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'M2SL', name: 'M2', color: '#2196F3', source: 'Federal Reserve via FRED' }
  ]},
  // 25
  { name: 'fed-balance-sheet', title: 'Federal Reserve Total Assets', unit: 'Index (1971=100)', normalize: true, note: 'Data starts 2002.', seriesConfig: [
    { fredId: 'WALCL', name: 'Total Assets Federal Reserve', color: '#e74c3c', source: 'Federal Reserve via FRED' }
  ]},
  // 26
  { name: 'education-spending', title: 'Education Spending', unit: 'Index (1971=100)', normalize: true, note: 'Proxy: personal consumption expenditures.', seriesConfig: [
    { fredId: 'PCECC', name: 'Personal Consumption Expenditures', color: '#4CAF50', source: 'BEA via FRED' }
  ]},
  // 27
  { name: 'rd-spending', title: 'R&D Government Spending', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'FSGDRES', name: 'Federal R&D Obligations', color: '#9b59b6', source: 'Federal Reserve via FRED' }
  ]},
  // 28
  { name: 'currency-stability', title: 'Currency Stability', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'DTWEXBPA', name: 'Trade-Weighted Dollar Index', color: '#e67e22', source: 'Federal Reserve via FRED' }
  ]},
  // 29
  { name: 'm1-money-supply', title: 'M1 Money Supply', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'MSL', name: 'M1', color: '#2196F3', source: 'Federal Reserve via FRED' }
  ]},
  // 30
  { name: 'bretton-woods', title: 'Bretton Woods System', unit: 'Billions of Dollars', normalize: false, note: 'Data ends 1949.', seriesConfig: [
    { fredId: 'M14062USM027NNBR', name: 'Gold Reserves Federal Reserve', color: '#FFD700', source: 'NBER via FRED' }
  ]},
  // 31
  { name: 'federal-debt-public-gdp', title: 'Federal Debt Held by Public / GDP', unit: 'Percent of GDP', normalize: false, seriesConfig: [
    { fredId: 'FYPUGDA188S', name: 'Gross Federal Debt Public / GDP', color: '#e74c3c', source: 'Treasury via FRED' }
  ]},
  // 32
  { name: 'federal-debt-public', title: 'Federal Debt Held by Public', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'FYGFDPUN', name: 'Federal Debt Held by Public', color: '#e74c3c', source: 'Treasury via FRED' }
  ]},
  // 33
  { name: 'government-spending-gdp', title: 'Government Spending', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'M318191Q027NBEA', name: 'Federal Budget Outlays', color: '#e67e22', source: 'BEA via FRED' }
  ]},
  // 34
  { name: 'debt-per-capita', title: 'National Debt', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'GYGSFDQ189S', name: 'Gross Federal Debt', color: '#e74c3c', source: 'Treasury via FRED' }
  ]},
  // 35
  { name: 'federal-debt', title: 'Federal Debt as % of GDP', unit: 'Percent of GDP', normalize: false, seriesConfig: [
    { fredId: 'GFDGDPA188S', name: 'Gross Federal Debt / GDP', color: '#e74c3c', source: 'Treasury via FRED' }
  ]},
  // 36
  { name: 'federal-deficit', title: 'Federal Deficit', unit: 'Millions of Dollars', normalize: false, seriesConfig: [
    { fredId: 'FYFSD', name: 'Federal Surplus or Deficit', color: '#e74c3c', source: 'Treasury via FRED' }
  ]},
  // 37
  { name: 'federal-outlays', title: 'Federal Outlays', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'M318191Q027NBEA', name: 'Federal Budget Outlays', color: '#e67e22', source: 'BEA via FRED' }
  ]},
  // 38
  { name: 'defense-spending', title: 'Defense Spending', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'FSDDEF', name: 'Federal Spending for Defense', color: '#e74c3c', source: 'Treasury via FRED' }
  ]},
  // 39
  { name: 'bank-assets', title: 'Bank Assets', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'BOGZ1BB027922405', name: 'Total Assets All Commercial Banks', color: '#2196F3', source: 'Federal Reserve via FRED' }
  ]},
  // 40
  { name: 'sp500-pe-ratio', title: 'S&P 500 P/E Ratio', unit: 'Ratio', normalize: false, note: 'Proxy: Buffett indicator (market cap/GDP).', seriesConfig: [
    { fredId: 'TBMEY', name: 'Buffett Indicator', color: '#e74c3c', source: 'St. Louis Fed via FRED' }
  ]},
  // 41
  { name: 'shiller-cape', title: 'Cyclically Adjusted P/E Ratio', unit: 'Ratio', normalize: false, note: 'Proxy: Buffett indicator.', seriesConfig: [
    { fredId: 'TBMEY', name: 'Buffett Indicator', color: '#9b59b6', source: 'St. Louis Fed via FRED' }
  ]},
  // 42
  { name: 'sp500-index', title: 'S&P 500 Index', unit: 'Index (1971=100)', normalize: true, note: 'FRED data starts 2016.', seriesConfig: [
    { fredId: 'SP500', name: 'S&P 500', color: '#2ecc71', source: 'S&P via FRED' }
  ]},
  // 43
  { name: 'corporate-investment', title: 'Corporate Investment', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'CI', name: 'Gross Private Domestic Investment', color: '#4CAF50', source: 'BEA via FRED' }
  ]},
  // 44
  { name: 'corporate-profits', title: 'Corporate Profits', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'CP', name: 'Corporate Profits After Tax', color: '#e74c3c', source: 'BEA via FRED' }
  ]},
  // 45
  { name: 'savings-rate', title: 'Personal Savings Rate', unit: 'Percent of Disposable Income', normalize: false, seriesConfig: [
    { fredId: 'PSAVERT', name: 'Personal Saving Rate', color: '#2ecc71', source: 'BEA via FRED' }
  ]},
  // 46
  { name: 'private-savings-gdp', title: 'Private Savings', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'PS', name: 'Personal Savings', color: '#2ecc71', source: 'BEA via FRED' }
  ]},
  // 47
  { name: 'household-debt-income', title: 'Household Debt Service Ratio', unit: 'Percent of Disposable Income', normalize: false, note: 'Data starts 2005.', seriesConfig: [
    { fredId: 'TDSP', name: 'Debt Service Payments / Disposable Income', color: '#e74c3c', source: 'Federal Reserve via FRED' }
  ]},
  // 48
  { name: 'trade-deficit', title: 'Trade Balance', unit: 'Billion USD (positive=surplus, negative=deficit)', normalize: false, seriesConfig: [
    { fredId: 'NETEXP', name: 'Net Exports of Goods & Services', color: '#e74c3c', source: 'BEA via FRED' }
  ]},
  // 49
  { name: 'consumer-credit', title: 'Consumer Credit', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'HHSFCALTT027S', name: 'Household Sector Credit', color: '#9b59b6', source: 'Federal Reserve via FRED' }
  ]},
  // 50
  { name: 'unemployment-rate', title: 'Unemployment Rate', unit: 'Percent', normalize: false, seriesConfig: [
    { fredId: 'UNRATE', name: 'Unemployment Rate', color: '#e74c3c', source: 'BLS via FRED' }
  ]},
  // 51
  { name: '10yr-treasury-yield', title: '10-Year Treasury Yield', unit: 'Percent', normalize: false, seriesConfig: [
    { fredId: 'GS10', name: '10-Year Treasury Constant Maturity', color: '#FFD700', source: 'Federal Reserve via FRED' }
  ]},
  // 52
  { name: 'inflation-rate', title: 'Inflation Rate (CPI)', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'CPIAUCSL', name: 'CPI All Items', color: '#e67e22', source: 'BLS via FRED' }
  ]},
  // 53
  { name: 'energy-consumption', title: 'Energy Consumption', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'USPCEPCGAS', name: 'Per Capita Energy Consumption', color: '#e67e22', source: 'BEA via FRED' }
  ]},
  // 54
  { name: 'co2-emissions', title: 'CO2 Emissions', unit: 'Index (1971=100)', normalize: true, note: 'Proxy: energy consumption.', seriesConfig: [
    { fredId: 'USPCEPCGAS', name: 'Per Capita Energy Consumption', color: '#9b59b6', source: 'BEA via FRED' }
  ]},
  // 55 — NO FRED DATA placeholder
  { name: 'political-polarization', title: 'Political Polarization', unit: 'Index', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 56 — NO FRED DATA placeholder
  { name: 'lobbying-spending', title: 'Lobbying Spending', unit: 'Index', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 57 — NO FRED DATA placeholder
  { name: 'government-effectiveness', title: 'Government Effectiveness', unit: 'Index', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 58 — NO FRED DATA placeholder
  { name: 'voter-turnout', title: 'Voter Turnout', unit: 'Percent', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 59 — NO FRED DATA placeholder
  { name: 'senate-filibuster', title: 'Senate Filibuster / Cloture', unit: 'Count', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 60 — NO FRED DATA placeholder
  { name: 'campaign-contributions', title: 'Campaign Contributions', unit: 'Index', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 61 — NO FRED DATA placeholder
  { name: 'lobbyists', title: 'Number of Lobbyists', unit: 'Count', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 62 — NO FRED DATA placeholder
  { name: 'incarceration-rate', title: 'Incarceration Rate', unit: 'Per 100k population', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 63 — NO FRED DATA placeholder
  { name: 'violent-crime-rate', title: 'Violent Crime Rate', unit: 'Index', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 64 — NO FRED DATA placeholder
  { name: 'robbery-rate', title: 'Robbery Rate', unit: 'Index', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 65 — NO FRED DATA placeholder
  { name: 'incarceration-rate-alt', title: 'Incarceration Rate', unit: 'Per 100k population', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 66 — NO FRED DATA placeholder
  { name: 'drug-overdose', title: 'Drug Overdose Deaths', unit: 'Index', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 67
  { name: 'life-expectancy', title: 'Life Expectancy at Birth', unit: 'Years', normalize: false, seriesConfig: [
    { fredId: 'SPDYNLE00INUSA', name: 'Life Expectancy at Birth', color: '#4CAF50', source: 'World Bank via FRED' }
  ]},
  // 68
  { name: 'healthcare-cost-per-capita', title: 'Healthcare Cost Per Capita', unit: 'Index (1971=100)', normalize: true, note: 'Data starts 2000.', seriesConfig: [
    { fredId: 'HLTHSCPCHCSA', name: 'Health Expenditures per Capita', color: '#e74c3c', source: 'BEA via FRED' }
  ]},
  // 69
  { name: 'healthcare-spending-gdp', title: 'Healthcare Spending', unit: 'Index (1971=100)', normalize: true, seriesConfig: [
    { fredId: 'DHLCRC1Q027SBEA', name: 'Health Care PCE', color: '#e74c3c', source: 'BEA via FRED' }
  ]},
  // 70 — NO FRED DATA placeholder
  { name: 'obesity-rate', title: 'Obesity Rate', unit: 'Percent', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 71
  { name: 'marriage-rate', title: 'Marriage Rate', unit: 'Index (1971=100)', normalize: true, note: 'Proxy: total households.', seriesConfig: [
    { fredId: 'TTLHH', name: 'Total Households', color: '#e91e63', source: 'Census via FRED' }
  ]},
  // 72 — NO FRED DATA placeholder
  { name: 'divorce-rate', title: 'Divorce Rate', unit: 'Index', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 73
  { name: 'fertility-rate', title: 'Total Fertility Rate', unit: 'Births per Woman', normalize: false, seriesConfig: [
    { fredId: 'SPDYNTFRTINUSA', name: 'Fertility Rate Total', color: '#e91e63', source: 'World Bank via FRED' }
  ]},
  // 74
  { name: 'child-poverty', title: 'Child Poverty Rate', unit: 'Percent', normalize: false, note: 'Proxy: overall poverty rate.', seriesConfig: [
    { fredId: 'PPAAUS00000A156NCEN', name: 'Poverty Rate All Ages', color: '#e74c3c', source: 'Census via FRED' }
  ]},
  // 75
  { name: 'health-coverage', title: 'Health Coverage', unit: 'Index (1971=100)', normalize: true, note: 'Proxy: health care PCE.', seriesConfig: [
    { fredId: 'DHLCRC1Q027SBEA', name: 'Health Care PCE', color: '#4CAF50', source: 'BEA via FRED' }
  ]},
  // 76
  { name: 'dental-health', title: 'Dental / Oral Health', unit: 'Index (1971=100)', normalize: true, note: 'Proxy: life expectancy.', seriesConfig: [
    { fredId: 'SPDYNLE00INUSA', name: 'Life Expectancy', color: '#4CAF50', source: 'World Bank via FRED' }
  ]},
  // 77 — NO FRED DATA placeholder
  { name: 'suicide-rate', title: 'Suicide Rate', unit: 'Index', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 78
  { name: 'meat-consumption', title: 'Meat Consumption', unit: 'Index (1971=100)', normalize: true, note: 'Proxy: personal consumption expenditures.', seriesConfig: [
    { fredId: 'PCECC', name: 'Personal Consumption Expenditures', color: '#e74c3c', source: 'BEA via FRED' }
  ]},
  // 79
  { name: 'food-consumption', title: 'Food Consumption', unit: 'Index (1971=100)', normalize: true, note: 'Proxy: personal consumption expenditures.', seriesConfig: [
    { fredId: 'PCECC', name: 'Personal Consumption Expenditures', color: '#e67e22', source: 'BEA via FRED' }
  ]},
  // 80 — NO FRED DATA placeholder
  { name: 'diet-nutrition', title: 'Diet and Nutrition', unit: 'Index', normalize: false, note: 'No FRED data available.', seriesConfig: [] },
  // 81 — NO FRED DATA placeholder
  { name: 'processed-food', title: 'Processed Food Consumption', unit: 'Index', normalize: false, note: 'No FRED data available.', seriesConfig: [] }
]

async function fetchFredSeries(seriesId, startDate = '1950-01-01', endDate = '2024-12-31') {
  const url = `${BASE_URL}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&start_date=${startDate}&end_date=${endDate}`

  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`${seriesId}: HTTP ${response.status} - ${err.errorMessage || response.statusText}`)
  }

  const data = await response.json()
  if (!data.observations || data.observations.length === 0) {
    throw new Error(`${seriesId}: No observations returned (check series_id or API key)`)
  }
  return data.observations
}

function toAnnualData(observations) {
  const byYear = {}

  for (const obs of observations) {
    if (obs.value === '.') continue
    const year = parseInt(obs.date.substring(0, 4), 10)
    const value = parseFloat(obs.value)
    if (isNaN(value) || !isFinite(value)) continue

    if (!byYear[year]) byYear[year] = []
    byYear[year].push(value)
  }

  return Object.entries(byYear)
    .map(([year, values]) => ({
      year: parseInt(year, 10),
      value: values.reduce((a, b) => a + b, 0) / values.length
    }))
    .sort((a, b) => a.year - b.year)
}

function normalizeToBase(data, baseYear = 1971) {
  let baseValue = data.find(d => d.year === baseYear)?.value
  // If 1971 data missing, use the first available data point as baseline
  if (!baseValue || baseValue === 0) {
    baseValue = data[0]?.value
  }
  if (!baseValue || baseValue === 0) return data

  return data.map(d => ({
    year: d.year,
    value: Math.round((d.value / baseValue) * 1000) / 10
  }))
}

async function fetchAndSave(config) {
  console.log(`\nFetching: ${config.title}`)

  const series = []

  for (const s of config.seriesConfig) {
    try {
      const observations = await fetchFredSeries(s.fredId)
      const annualData = toAnnualData(observations)

      if (annualData.length === 0) {
        console.warn(`  No data for ${s.name} (${s.fredId})`)
        continue
      }

      const finalData = config.normalize ? normalizeToBase(annualData) : annualData
      series.push({
        name: s.name,
        color: s.color,
        values: finalData
      })

      console.log(`  OK ${s.name} (${s.fredId}): ${finalData.length} annual points (${finalData[0]?.year}–${finalData[finalData.length-1]?.year})`)
    } catch (err) {
      console.error(`  FAIL ${s.name} (${s.fredId}): ${err.message}`)
    }
  }

  if (series.length === 0) {
    console.warn(`  Skipped — no series fetched.`)
    return
  }

  const output = {
    title: config.title,
    unit: config.unit,
    series
  }

  const outputPath = path.join(DATA_DIR, `${config.name}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`  Saved → ${outputPath}`)
}

async function main() {
  if (!FRED_API_KEY) {
    console.error('FRED_API_KEY not set. Create a .env file with FRED_API_KEY=...')
    process.exit(1)
  }

  console.log('Fetching economic data from FRED...')
  console.log(`API key: ${FRED_API_KEY.slice(0, 4)}...`)
  console.log(`Output: ${DATA_DIR}`)

  for (const config of SERIES) {
    await fetchAndSave(config)
  }

  console.log('\nDone!')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})

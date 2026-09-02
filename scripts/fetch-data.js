import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '..', 'data')

const FRED_API_KEY = process.env.FRED_API_KEY || ''
const BASE_URL = 'https://api.stlouisfed.org/fred/series/observations'

const SERIES = [
  {
    name: 'wage-productivity',
    title: 'Wages vs. Productivity',
    unit: 'Index (1971=100)',
    normalize: true,
    seriesConfig: [
      { fredId: 'OPHNFB', name: 'Productivity', color: '#4CAF50', source: 'BLS via FRED' },
      { fredId: 'COMPRNFB', name: 'Real Hourly Compensation', color: '#F44336', source: 'BLS via FRED' }
    ]
  },
  {
    name: 'gdp-per-capita',
    title: 'Real GDP Per Capita',
    unit: 'Index (1971=100)',
    normalize: true,
    seriesConfig: [
      { fredId: 'A939RX0Q048SBEA', name: 'Real GDP Per Capita', color: '#2196F3', source: 'BEA via FRED' }
    ]
  },
  {
    name: 'federal-debt',
    title: 'Federal Debt as % of GDP',
    unit: 'Percent of GDP',
    normalize: false,
    seriesConfig: [
      { fredId: 'GFDGDPA188S', name: 'Gross Federal Debt / GDP', color: '#e74c3c', source: 'Treasury via FRED' }
    ]
  },
  {
    name: 'inflation',
    title: 'Consumer Price Index (Inflation)',
    unit: 'Index (1971=100)',
    normalize: true,
    seriesConfig: [
      { fredId: 'CPIAUCSL', name: 'CPI All Items', color: '#e67e22', source: 'BLS via FRED' }
    ]
  },
  {
    name: 'gini-coefficient',
    title: 'Income Inequality (Gini Coefficient)',
    unit: 'Gini Index (0=equal, 1=unequal)',
    normalize: false,
    seriesConfig: [
      { fredId: 'SIPOVGINIUSA', name: 'Gini Coefficient', color: '#9b59b6', source: 'World Bank via FRED' }
    ]
  },
  {
    name: 'corporate-tax',
    title: 'Top Marginal Tax Rate',
    unit: 'Percent',
    normalize: false,
    seriesConfig: [
      { fredId: 'IITTRHB', name: 'Highest Individual Tax Bracket', color: '#e74c3c', source: 'IRS via FRED' }
    ]
  },
  {
    name: 'savings-rate',
    title: 'Personal Savings Rate',
    unit: 'Percent of Disposable Income',
    normalize: false,
    seriesConfig: [
      { fredId: 'PSAVERT', name: 'Personal Saving Rate', color: '#2ecc71', source: 'BEA via FRED' }
    ]
  },
  {
    name: 'stock-market',
    title: 'Stock Market vs. Wages',
    unit: 'Index (1971=100)',
    normalize: true,
    note: 'FRED SP500 starts 2016; DJIA monthly ends 1968. Stock data is limited on FRED.',
    seriesConfig: [
      { fredId: 'SP500', name: 'S&P 500', color: '#2ecc71', source: 'S&P via FRED' },
      { fredId: 'AHETPI', name: 'Avg Hourly Earnings (Prod & Nonsupervisory)', color: '#e74c3c', source: 'BLS via FRED' }
    ]
  },
  {
    name: 'trade-deficit',
    title: 'Trade Balance',
    unit: 'Billion USD (positive=surplus, negative=deficit)',
    normalize: false,
    seriesConfig: [
      { fredId: 'NETEXP', name: 'Net Exports of Goods & Services', color: '#e74c3c', source: 'BEA via FRED' }
    ]
  },
  {
    name: 'housing-affordability',
    title: 'Housing Affordability',
    unit: 'Index (1971=100)',
    normalize: true,
    note: 'FHFA index starts 1975; 1971 baseline interpolated.',
    seriesConfig: [
      { fredId: 'USSTHPI', name: 'FHFA House Price Index', color: '#e67e22', source: 'FHFA via FRED' }
    ]
  }
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

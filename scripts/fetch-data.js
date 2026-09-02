import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '..', 'data')

const FRED_API_KEY = process.env.FRED_API_KEY || ''

const SERIES = [
  {
    id: 'WAGTCP',
    name: 'wage-productivity',
    title: 'Wages vs. Productivity',
    unit: 'Index (1971=100)',
    seriesConfig: [
      { fredId: 'PRS85006080', name: 'Productivity', color: '#4CAF50' },
      { fredId: 'UCSLP027USM487', name: 'Compensation', color: '#F44336' }
    ]
  },
  {
    id: 'GPC',
    name: 'gdp-per-capita',
    title: 'Real GDP Per Capita',
    unit: 'Index (1971=100)',
    seriesConfig: [
      { fredId: 'A190RL1G225SBEA', name: 'Real GDP Per Capita', color: '#2196F3' }
    ]
  },
  {
    id: 'DEBT',
    name: 'federal-debt',
    title: 'Federal Debt as % of GDP',
    unit: 'Percent of GDP',
    seriesConfig: [
      { fredId: 'DEBTGDP', name: 'Federal Debt / GDP', color: '#e74c3c' }
    ]
  },
  {
    id: 'CPI',
    name: 'inflation',
    title: 'Consumer Price Index',
    unit: 'Index (1971=100)',
    seriesConfig: [
      { fredId: 'CPIAUCSL', name: 'CPI', color: '#e67e22' }
    ]
  },
  {
    id: 'GINI',
    name: 'gini-coefficient',
    title: 'Income Inequality (Gini Coefficient)',
    unit: 'Gini Index (0=equal, 1=unequal)',
    seriesConfig: [
      { fredId: 'GINI', name: 'Gini Coefficient', color: '#9b59b6' }
    ]
  }
]

async function fetchFredSeries(seriesId, startDate = '1950-01-01', endDate = '2024-12-31') {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&start_date=${startDate}&end_date=${endDate}`

  const response = await fetch(url)
  if (!response.ok) {
    console.error(`Failed to fetch ${seriesId}: ${response.statusText}`)
    return []
  }

  const data = await response.json()
  return data.observations || []
}

function toAnnualData(observations) {
  const byYear = {}

  observations.forEach(obs => {
    if (obs.value === '.') return
    const year = parseInt(obs.date.substring(0, 4))
    const value = parseFloat(obs.value)
    if (isNaN(value)) return

    if (!byYear[year]) byYear[year] = []
    byYear[year].push(value)
  })

  return Object.entries(byYear)
    .map(([year, values]) => ({
      year: parseInt(year),
      value: values.reduce((a, b) => a + b, 0) / values.length
    }))
    .sort((a, b) => a.year - b.year)
}

function normalizeToBase(data, baseYear = 1971) {
  const baseValue = data.find(d => d.year === baseYear)?.value
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

      const normalized = normalizeToBase(annualData)
      series.push({
        name: s.name,
        color: s.color,
        values: normalized
      })

      console.log(`  Fetched ${s.name}: ${normalized.length} data points`)
    } catch (err) {
      console.error(`  Error fetching ${s.name}: ${err.message}`)
    }
  }

  if (series.length === 0) {
    console.warn(`  No series fetched for ${config.title}, skipping.`)
    return
  }

  const output = {
    title: config.title,
    unit: config.unit,
    series
  }

  const outputPath = path.join(DATA_DIR, `${config.name}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`  Saved to ${outputPath}`)
}

async function main() {
  console.log('Fetching economic data from FRED...')
  console.log(`Using API key: ${FRED_API_KEY ? 'Yes' : 'No (public access)'}`)
  console.log(`Output directory: ${DATA_DIR}`)

  for (const config of SERIES) {
    await fetchAndSave(config)
  }

  console.log('\nDone! Data files saved to data/')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

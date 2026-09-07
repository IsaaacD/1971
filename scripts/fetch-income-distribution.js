// Fetches the closest available data to the CBPP chart "Income Gains Widely Shared
// in Early Postwar Decades — But Not Since Then" (real family income, 1947-2016,
// indexed 1973=100, with 20th percentile / median / 95th percentile curves).
//
// Sources:
//   FRED  - World Bank real median household income (MEHOINUSA672N)
//   FRED  - Census Bureau CE survey: bottom-20% / top-20% average income (percentile proxies)
//   BEA   - Personal income per capita (A792RC0A052NBEA), served by FRED
//           (BEA's own API rejected all table-name variants with "Dataset requested
//            does not exist"; the legacy API redirects to signup, so BEA data is
//            pulled via FRED's mirror of the official BEA NIPA series)
//   BLS   - CES average weekly earnings, production & nonsupervisory employees (CES0500000030)
//
// Nominal series are deflated with CPI-U (CPIAUCSL) and everything is indexed to 1973=100.
//
// Usage:
//   FRED_API_KEY=... BLS_API_KEY=... node scripts/fetch-income-distribution.js

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '..', 'public', 'data')

const FRED_API_KEY = process.env.FRED_API_KEY || ''
const BLS_API_KEY = process.env.BLS_API_KEY || ''
const BASE_YEAR = 1973
const END_YEAR = 2024

// ---------- FRED ----------

async function fetchFredSeries(seriesId, startDate = '1940-01-01', endDate = '2026-12-31') {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&start_date=${startDate}&end_date=${endDate}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`${seriesId}: HTTP ${res.status} - ${err.error_message || res.statusText}`)
  }
  const data = await res.json()
  if (!data.observations || data.observations.length === 0) {
    throw new Error(`${seriesId}: no observations`)
  }
  return data.observations
}

function toAnnual(observations) {
  const byYear = {}
  for (const obs of observations) {
    if (obs.value === '.' || obs.value === null) continue
    const value = parseFloat(obs.value)
    if (!isFinite(value)) continue
    const year = parseInt(obs.date.substring(0, 4), 10)
    if (!byYear[year]) byYear[year] = []
    byYear[year].push(value)
  }
  return Object.fromEntries(
    Object.entries(byYear).map(([y, v]) => [y, v.reduce((a, b) => a + b, 0) / v.length])
  )
}

// ---------- BLS (v2, max 10 years per request) ----------

async function fetchBlsChunk(seriesId, startYear, endYear) {
  const body = {
    seriesid: [seriesId],
    startyear: String(startYear),
    endyear: String(endYear),
    key: BLS_API_KEY
  }
  const res = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (data.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`${seriesId}: ${data.status} ${JSON.stringify(data.message || '')}`)
  }
  const series = (data.Results && data.Results.series) || []
  const monthly = {}
  for (const s of series) {
    for (const x of s.data || []) {
      if (x.value === '.' || x.value === null || x.value === undefined) continue
      const v = parseFloat(x.value)
      if (!isFinite(v)) continue
      const year = parseInt(x.year, 10)
      if (!monthly[year]) monthly[year] = []
      monthly[year].push(v)
    }
  }
  return Object.fromEntries(Object.entries(monthly).map(([y, v]) => [y, v.reduce((a, b) => a + b, 0) / v.length]))
}

async function fetchBlsSeries(seriesId, startYear, endYear) {
  const annual = {}
  const chunks = []
  for (let y = startYear; y <= endYear; y += 10) {
    chunks.push([y, Math.min(y + 9, endYear)])
  }
  for (const [sy, ey] of chunks) {
    Object.assign(annual, await fetchBlsChunk(seriesId, sy, ey))
  }
  return annual
}

// ---------- Indexing ----------

function pickBaseYear(valuesByYear, preferred = BASE_YEAR) {
  if (valuesByYear[preferred]) return preferred
  const years = Object.keys(valuesByYear).map(Number).sort((a, b) => a - b)
  if (years.length === 0) throw new Error('no values at all')
  return years[0]
}

function indexNominalToBase(nominalByYear, cpiByYear) {
  const baseYear = pickBaseYear(nominalByYear)
  const baseNom = nominalByYear[baseYear]
  const baseCpi = cpiByYear[baseYear]
  if (!baseCpi) throw new Error(`CPI missing for base year ${baseYear}`)
  const scale = (baseCpi / baseNom) * 100
  const out = []
  for (const [y, v] of Object.entries(nominalByYear).sort((a, b) => a[0] - b[0])) {
    const cpi = cpiByYear[y]
    if (!cpi) continue
    out.push({ year: parseInt(y, 10), value: Math.round((v / cpi) * scale * 10) / 10 })
  }
  return { values: out, baseYear }
}

function indexRealToBase(realByYear) {
  const baseYear = pickBaseYear(realByYear)
  const base = realByYear[baseYear]
  return {
    baseYear,
    values: Object.entries(realByYear)
      .sort((a, b) => a[0] - b[0])
      .map(([y, v]) => ({ year: parseInt(y, 10), value: Math.round((v / base) * 1000) / 10 }))
  }
}

// ---------- Main ----------

async function main() {
  if (!FRED_API_KEY) {
    console.error('FRED_API_KEY not set')
    process.exit(1)
  }
  if (!BLS_API_KEY) {
    console.error('BLS_API_KEY not set')
    process.exit(1)
  }

  console.log('Fetching CPI-U (deflator) from FRED...')
  const cpi = toAnnual(await fetchFredSeries('CPIAUCSL'))
  console.log(`  CPI ${Math.min(...Object.keys(cpi))} - ${Math.max(...Object.keys(cpi))} (1973 avg: ${cpi[1973].toFixed(2)})`)

  const jobs = [
    {
      label: 'Median household income (FRED/World Bank, real)',
      kind: 'real',
      name: 'Median household income',
      color: '#8D6E63',
      run: async () => ({ annual: toAnnual(await fetchFredSeries('MEHOINUSA672N')), source: 'World Bank via FRED (MEHOINUSA672N)' })
    },
    {
      label: '95th percentile proxy: top-20% average income (FRED/Census CE, nominal)',
      kind: 'nominal',
      name: 'Top 20% average (95th pct proxy)',
      color: '#E53935',
      run: async () => ({ annual: toAnnual(await fetchFredSeries('CXUINCBEFTXLB0106M')), source: 'Census Bureau CE survey via FRED (CXUINCBEFTXLB0106M)' })
    },
    {
      label: '20th percentile proxy: bottom-20% average income (FRED/Census CE, nominal)',
      kind: 'nominal',
      name: 'Bottom 20% average (20th pct proxy)',
      color: '#1E88E5',
      run: async () => ({ annual: toAnnual(await fetchFredSeries('CXUINCBEFTXLB0102M')), source: 'Census Bureau CE survey via FRED (CXUINCBEFTXLB0102M)' })
    },
    {
      label: 'Real personal income per capita (BEA via FRED, nominal)',
      kind: 'nominal',
      name: 'Personal income per capita (mean)',
      color: '#43A047',
      run: async () => ({ annual: toAnnual(await fetchFredSeries('A792RC0A052NBEA')), source: 'BEA NIPA via FRED (A792RC0A052NBEA)' })
    },
    {
      label: 'Real average weekly earnings, production workers (BLS, nominal)',
      kind: 'nominal',
      name: 'Avg weekly earnings, production workers',
      color: '#FB8C00',
      run: async () => {
        try {
          return { annual: await fetchBlsSeries('CES0500000030', 1964, 2023), source: 'BLS CES (CES0500000030)' }
        } catch (err) {
          console.warn(`    BLS API unavailable (${err.message}); falling back to FRED's BLS mirror CES0500000030`)
          return { annual: toAnnual(await fetchFredSeries('CES0500000030')), source: 'BLS CES via FRED (CES0500000030)' }
        }
      }
    }
  ]

  const series = []
  for (const job of jobs) {
    try {
      const { annual, source } = await job.run()
      const { values, baseYear } =
        job.kind === 'nominal'
          ? indexNominalToBase(annual, cpi)
          : indexRealToBase(annual)
      if (values.length === 0) {
        console.warn(`  SKIP ${job.label}: no values`)
        continue
      }
      series.push({
        name: job.name,
        color: job.color,
        source,
        baseYear,
        values
      })
      console.log(`  OK  ${job.label}: ${values.length} points (${values[0].year}-${values[values.length - 1].year}, base ${baseYear}=100)`)
    } catch (err) {
      console.error(`  FAIL ${job.label}: ${err.message}`)
    }
  }

  if (series.length === 0) {
    console.error('No series fetched, aborting.')
    process.exit(1)
  }

  const output = {
    title: 'Real Household Income by Percentile',
    unit: 'Index (1973=100 where available, else first year=100)',
    note: 'Reconstruction of the CBPP chart "Income Gains Widely Shared in Early Postwar Decades - But Not Since Then" (Census CPS percentiles P20/P50/P95 of real family income, 1947-2016, 1973=100). FRED/BLS/BEA do not publish those exact CPS percentiles, so the closest available series are used: FRED median household income (1984-), Census Bureau CE-survey bottom/top-20% average incomes as percentile proxies (1984-), BEA personal income per capita (1947-), and BLS average weekly earnings (1964-). Nominal series are deflated with CPI-U. Each series is indexed to 1973=100 when it has 1973 data, otherwise to its first year (1984) = 100; see each series "baseYear".',
    series
  }

  const outputPath = path.join(DATA_DIR, 'median-household-income.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`\nSaved -> ${outputPath}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})

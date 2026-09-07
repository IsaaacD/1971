import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FRED_API_KEY = process.env.FRED_API_KEY || ''
const SEARCH_URL = 'https://api.stlouisfed.org/fred/series/search'

async function searchFred(query, { maxResults = 50, tagId = null, frequency = null, realTimeStart = null, realTimeEnd = null } = {}) {
  if (!FRED_API_KEY) {
    console.error('FRED_API_KEY not set. Export it or create a .env file.')
    process.exit(1)
  }

  const params = new URLSearchParams({
    search_text: query,
    api_key: FRED_API_KEY,
    file_type: 'json',
    sort_order: 'asc',
    limit: maxResults,
    page: 1
  })

  if (tagId) params.append('tag_id', tagId)
  if (frequency) params.append('frequency', frequency)
  if (realTimeStart) params.append('realtime_start', realTimeStart)
  if (realTimeEnd) params.append('realtime_end', realTimeEnd)

  const url = `${SEARCH_URL}?${params}`
  console.log(`Searching FRED for: "${query}"`)
  console.log(`URL: ${url.replace(FRED_API_KEY, 'KEY...')}\n`)

  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`HTTP ${response.status}: ${err.errorMessage || response.statusText}`)
  }

  const data = await response.json()

  if (!data.seriess || !data.seriess.length) {
    console.log('No results found.')
    return []
  }

  const results = data.seriess
  console.log(`Found ${results.length} series (limit: ${maxResults}):\n`)

  return results.map((s, i) => ({
    id: s.id,
    title: s.title,
    units: s.units,
    freq: s.frequency,
    source: s.source,
    lastUpdated: s.lastupdated
  }))
}

async function getSeriesInfo(seriesId) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&limit=5`

  const response = await fetch(url)
  if (!response.ok) return null

  const data = await response.json()
  return {
    id: data.id,
    title: data.title,
    units: data.units,
    freq: data.frequency,
    observations: data.observations?.length || 0,
    firstDate: data.observations?.[0]?.date,
    lastDate: data.observations?.[data.observations?.length - 1]?.date
  }
}

async function main() {
  const query = process.argv[2]

  if (!query) {
    console.log('Usage: node scripts/fred-search.js <search-term> [--info <series-id>]')
    console.log('')
    console.log('Examples:')
    console.log('  node scripts/fred-search.js "wages"')
    console.log('  node scripts/fred-search.js "real hourly earnings"')
    console.log('  node scripts/fred-search.js "productivity"')
    console.log('  node scripts/fred-search.js "minimum wage"')
    console.log('')
    console.log('Options:')
    console.log('  --info <id>    Get details for a specific series ID')
    console.log('  --limit <n>    Max results (default: 50)')
    console.log('  --freq <freq>  Filter by frequency (e.g. "annual", "monthly")')
    process.exit(0)
  }

  // Parse flags
  const args = process.argv.slice(2)
  const infoFlag = args.indexOf('--info')
  const limitFlag = args.indexOf('--limit')
  const freqFlag = args.indexOf('--freq')

  if (infoFlag > -1 && args[infoFlag + 1]) {
    const seriesId = args[infoFlag + 1]
    console.log(`Getting info for series: ${seriesId}\n`)
    const info = await getSeriesInfo(seriesId)
    if (info) {
      console.log(JSON.stringify(info, null, 2))
    } else {
      console.log('Series not found or API error.')
    }
    return
  }

  const options = {}
  if (limitFlag > -1 && args[limitFlag + 1]) {
    options.maxResults = parseInt(args[limitFlag + 1], 10)
  }
  if (freqFlag > -1 && args[freqFlag + 1]) {
    options.frequency = args[freqFlag + 1]
  }

  const results = await searchFred(query, options)

  if (results.length) {
    console.log('\n--- Results ---')
    for (const r of results) {
      console.log(`  ${r.id.padEnd(20)} | ${r.title}`)
      console.log(`                       ${r.freq.padEnd(12)} | ${r.units.padEnd(20)} | Source: ${r.source}`)
    }
  }

  // Save results to file for reference
  const outputFile = path.join(__dirname, 'fred-search-results.json')
  fs.writeFileSync(outputFile, JSON.stringify({ query, results, timestamp: new Date().toISOString() }, null, 2))
  console.log(`\nResults saved to ${outputFile}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})

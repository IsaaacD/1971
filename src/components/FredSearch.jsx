import { useState, useEffect, useRef, useMemo } from 'react'
import './FredSearch.css'
import InteractiveLineChart from './InteractiveLineChart'

const FRED_SEARCH_URL = '/api/fred/fred/series/search'
const FRED_OBS_URL = '/api/fred/fred/series/observations'
const BLS_DATA_URL = '/api/bls/timeseries/data/'
const BEA_BASE_URL = '/api/bea'
const ASSIGN_KEY = 'fred_target02_assignments'

function parseYear(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.getFullYear()
}

function hashColor(str) {
  str = str || ''
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (str.charCodeAt(i) + ((hash << 5) - hash)) | 0
  }
  const h = Math.abs(hash) % 360
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  const r = 90 + 125 * Math.sin(h * 0.01745)
  const g = 90 + 125 * Math.sin((h + 120) * 0.01745)
  const b = 90 + 125 * Math.sin((h + 240) * 0.01745)
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const SOURCES = [
  { id: 'fred', label: 'FRED', desc: 'Federal Reserve Economic Data — primary discovery channel (mirrors BLS, BEA, Census, World Bank)' },
  { id: 'bls', label: 'BLS', desc: 'Bureau of Labor Statistics — verify exact BLS series IDs (v2 search deprecated)' },
  { id: 'bea', label: 'BEA', desc: 'Bureau of Economic Analysis — dataset families; data via FRED mirrors' }
]

const TARGET_CHART = {
  number: '02',
  name: 'real-wages',
  title: 'Real Wages',
  unit: 'Index (1947=100)',
  baseYear: 1947,
  anchorYear: 2014,
  note: 'Composite chart — 5 lines from mixed BEA / BLS / Census sources (the “BEA, BLS” source line is doing real work). The red arrow near 1971–74 is a trade-policy annotation, not a data series. Every line must index to 100 in 1947.',
  rows: [
    {
      key: 'gdp-per-capita',
      label: 'Real GDP per capita',
      color: '#2C5F8A',
      formula: 'Real GDP (GDPC1) ÷ Population',
      trueSource: 'BEA + Census',
      anchor: [370, 380],
      derived: false,
      candidates: [
        { id: 'A939RX0Q048SBEA', label: 'Real GDP per capita (BEA)', kind: 'direct', note: 'BEA per-capita series, 1947–present. Anchor-verified ≈ 377 at 2014.' },
        { id: 'GDPC1', label: 'Real GDP (BEA)', kind: 'ingredient', note: 'Numerator — divide by population (e.g. B230RC0A052NBEA).' }
      ]
    },
    {
      key: 'gdp-per-fte',
      label: 'Real GDP per FTE',
      color: '#2E7D5B',
      formula: 'Real GDP (GDPC1) ÷ FTE employment',
      trueSource: 'BEA + BLS',
      anchor: [300, 310],
      derived: true,
      note: 'FTE is author-defined (hours ÷ 35 or 40). No single FRED series — confirm the construction in the source paper before claiming exact replication.',
      candidates: [
        { id: 'GDPC1', label: 'Real GDP (BEA)', kind: 'ingredient', note: 'Numerator — denominator is FTE employment (BLS CES hours or BEA NIPA 6.3).' }
      ]
    },
    {
      key: 'avg-wage-gdpdef',
      label: 'Avg real wage, GDP deflator',
      color: '#6B4F2A',
      formula: 'Avg weekly earnings ÷ GDP deflator',
      trueSource: 'BLS + BEA',
      anchor: [255, 265],
      derived: true,
      note: 'Use the GDP deflator (GDPDEF), NOT the PCE deflator (PCEPI). CEU0500000030 starts 1964 — the original line starts 1947.',
      candidates: [
        { id: 'CEU0500000030', label: 'Avg weekly earnings P/N, NSA (BLS)', kind: 'ingredient', note: '1964–present. BLS ID CES0500000030.' },
        { id: 'GDPDEF', label: 'GDP deflator (BEA)', kind: 'ingredient', note: '1947–present. Level index — not the rate-of-change A191 series.' },
        { id: 'AHETPI', label: 'Avg hourly earnings P/N, NSA (BLS)', kind: 'ingredient', note: 'Hourly variant, 1964–present.' }
      ]
    },
    {
      key: 'avg-wage-cpi',
      label: 'Avg real wage, cpi',
      color: '#E67E22',
      formula: 'Avg weekly earnings ÷ CPI-U',
      trueSource: 'BLS',
      anchor: [205, 215],
      derived: true,
      note: 'Same BLS wage series as the brown line, deflated with CPI-U (CPIAUCSL) instead of the GDP deflator.',
      candidates: [
        { id: 'CEU0500000030', label: 'Avg weekly earnings P/N, NSA (BLS)', kind: 'ingredient', note: '1964–present.' },
        { id: 'CPIAUCSL', label: 'CPI-U, all items (BLS)', kind: 'ingredient', note: '1947–present.' }
      ]
    },
    {
      key: 'median-wage-cpi',
      label: 'Real median weekly earnings, FT, cpi',
      color: '#C0392B',
      formula: 'Median weekly earnings (full-time) ÷ CPI-U',
      trueSource: 'BLS (CPS) + BLS (CPI)',
      anchor: [165, 175],
      derived: true,
      note: 'Median ≠ mean: this is the CPS median weekly earnings series. LEU0252881500A starts 1979 — the original line starts 1947, so find a longer series for the early years.',
      candidates: [
        { id: 'LEU0252881500A', label: 'Median usual weekly earnings, FT, NSA (CPS)', kind: 'ingredient', note: '1979–present. BLS CPS series.' },
        { id: 'CPIAUCSL', label: 'CPI-U, all items (BLS)', kind: 'ingredient', note: '1947–present.' }
      ]
    }
  ]
}

const PITFALLS = [
  'Don’t source the wage/CPI lines from BEA — they aren’t there; that’s the main trap in the “from BEA” framing.',
  'GDP deflator (PGDP/GDPDEF) ≠ PCE deflator (PCEPI) ≠ CPI.',
  'Mean (average) and median wage are different BLS series — don’t substitute one for the other.',
  'FTE employment is a derived, author-defined quantity — confirm the construction before claiming exact replication.',
  'Use one BEA vintage for GDP and deflator; chained base-year changes silently alter intermediate ratios.',
  'Verify series IDs by name search — BLS has several near-identical “average weekly earnings” series (SA vs NSA, all-employees vs P/N).',
  'Every line must equal 100 in 1947. Off by an order of magnitude → you mixed nominal and real, or used PCEPI instead of the GDP deflator.'
]

function sourceLabel(row) {
  const t = row.trueSource.toLowerCase()
  if (t.includes('bls') && t.includes('bea')) return 'BLS + BEA via FRED'
  if (t.includes('bea')) return 'BEA via FRED'
  if (t.includes('bls')) return 'BLS via FRED'
  if (t.includes('census')) return 'Census via FRED'
  return 'via FRED'
}

function esc(str) {
  return (str || '').replace(/'/g, "\\'")
}

function rowSnippet(row, items) {
  const anchor = `${row.anchor[0]}–${row.anchor[1]}`
  if (items.length === 0) {
    return `    // ${row.label}: PENDING — ${row.formula}. True source: ${row.trueSource}. Anchor 2014 ≈ ${anchor}`
  }

  const direct = items.find((i) => i.kind === 'direct')
  if (direct) {
    return `    { fredId: '${direct.id}', name: '${esc(row.label)}', color: '${row.color}', source: '${sourceLabel(row)}' },`
  }

  if (items.length >= 2) {
    return `    { name: '${esc(row.label)}', color: '${row.color}', source: '${sourceLabel(row)}', derived: { numerator: '${items[0].id}', denominator: '${items[1].id}' } },`
  }

  return `    // ${row.label}: ingredient '${items[0].id}' — add the second ingredient (${row.formula}), then index to 1947=100. Anchor 2014 ≈ ${anchor}`
}

function generateConfig(assignments) {
  const c = TARGET_CHART
  const out = []
  out.push(`  // ${c.number} — ${c.title} (composite, ${c.rows.length} lines)`)
  out.push(`  { name: '${c.name}', title: '${c.title}', unit: '${c.unit}', normalize: true, baseYear: ${c.baseYear}, seriesConfig: [`)
  for (const row of c.rows) {
    out.push(rowSnippet(row, assignments[row.key] || []))
  }
  out.push(`  ]},`)
  return out.join('\n')
}

function anchorCheck(values, baseYear, anchorYear, [lo, hi]) {
  if (!values || values.length < 2) return null
  const base = values.find((v) => v.year === baseYear) || values[0]
  const at = values.find((v) => v.year === anchorYear)
  if (!base || !base.value) return null
  const target = at || values[values.length - 1]
  const idx = (target.value / base.value) * 100
  return {
    idx: Math.round(idx * 10) / 10,
    year: target.year,
    ok: idx >= lo * 0.88 && idx <= hi * 1.12
  }
}

function loadAssignments() {
  try {
    const raw = JSON.parse(localStorage.getItem(ASSIGN_KEY) || '{}')
    const normalized = {}
    for (const [k, v] of Object.entries(raw)) {
      normalized[k] = Array.isArray(v) ? v : v ? [v] : []
    }
    return normalized
  } catch {
    return {}
  }
}

function FredSearch() {
  const [source, setSource] = useState('fred')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('fred_api_key_fred') || '')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selected, setSelected] = useState(null)
  const [seriesInfo, setSeriesInfo] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [obsLoading, setObsLoading] = useState(false)
  const [freq, setFreq] = useState('')
  const [unitsFilter, setUnitsFilter] = useState('')
  const [limit, setLimit] = useState(50)
  const [tagId, setTagId] = useState('')
  const [savedKey, setSavedKey] = useState(false)
  const [assignments, setAssignments] = useState(loadAssignments)
  const [copied, setCopied] = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    setPage(1)
  }, [limit])

  useEffect(() => {
    if (apiKey && !savedKey) {
      localStorage.setItem(`fred_api_key_${source}`, apiKey)
      setSavedKey(true)
    }
  }, [apiKey, savedKey, source])

  useEffect(() => {
    localStorage.setItem(ASSIGN_KEY, JSON.stringify(assignments))
  }, [assignments])

  useEffect(() => {
    setApiKey(localStorage.getItem(`fred_api_key_${source}`) || '')
    setSavedKey(true)
    setSelected(null)
    setSeriesInfo(null)
    setChartData(null)
    setResults([])
    setError('')
    setInfo('')
    setQuery('')
    setPage(1)
    setUnitsFilter('')
  }, [source])

  const copyText = (key, text) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {})
    }
    setCopied(key)
    setTimeout(() => setCopied((c) => (c === key ? '' : c)), 1600)
  }

  const addToRow = (rowKey, payload) => {
    setAssignments((a) => {
      const list = a[rowKey] || []
      if (list.some((i) => i.id === payload.id)) return a
      return { ...a, [rowKey]: [...list, payload] }
    })
  }

  const removeFromRow = (rowKey, id) => {
    setAssignments((a) => ({ ...a, [rowKey]: (a[rowKey] || []).filter((i) => i.id !== id) }))
  }

  const doSearch = async (pageNum = 1) => {
    if (!apiKey.trim()) {
      setError('Enter an API key first.')
      searchRef.current?.focus()
      return
    }
    if (!query.trim()) {
      setError(source === 'bls' ? 'Enter a BLS series ID.' : 'Enter a search term.')
      return
    }

    setLoading(true)
    setError('')
    setInfo('')
    setSelected(null)
    setSeriesInfo(null)
    setChartData(null)

    try {
      if (source === 'fred') {
        await searchFred(query, pageNum)
      } else if (source === 'bls') {
        await loadBlsSeries(query.trim().toUpperCase())
      } else if (source === 'bea') {
        await searchBea(query, pageNum)
      }
    } catch (e) {
      setError(e.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function searchFred(q, pageNum) {
    setInfo('')
    const params = new URLSearchParams({
      search_text: q,
      api_key: apiKey,
      file_type: 'json',
      sort_order: 'asc',
      limit: limit,
      page: pageNum
    })
    if (freq) params.append('frequency', freq)
    if (tagId) params.append('tag_id', tagId)

    const res = await fetch(`${FRED_SEARCH_URL}?${params}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.errorMessage || `HTTP ${res.status}`)
    }
    const data = await res.json()
    setResults(data.seriess || [])
    setPage(pageNum)
    setTotalPages(data.total_pages || 1)
  }

  async function searchBea(q, pageNum) {
    const params = new URLSearchParams({
      UserID: apiKey,
      Method: 'GetDatasetList',
      ResultFormat: 'JSON'
    })
    const res = await fetch(`${BEA_BASE_URL}?${params}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.ERROR || `HTTP ${res.status}`)
    }
    const data = await res.json()
    const datasets = data.BEAAPI?.Results?.Dataset || data.DataSets?.Data || data.DataSet?.Data || []
    let items = datasets.map((d) => ({
      id: d.DatasetName || '',
      title: d.DatasetDescription || d.DatasetName || '',
      units: '',
      frequency: '',
      source: 'BEA'
    }))

    if (q) {
      const lower = q.toLowerCase()
      items = items.filter((i) => i.title.toLowerCase().includes(lower) || i.id.toLowerCase().includes(lower))
    }

    const start = (pageNum - 1) * limit
    const paged = items.slice(start, start + limit)

    setResults(paged)
    setPage(pageNum)
    setTotalPages(Math.ceil(items.length / limit))
    setInfo('BEA data endpoints (legacy GetData, api.bea.gov) are deprecated/unreachable from this network. BEA series are on FRED under the same IDs (GDPC1, PGDP, GDP, A939RX0Q048SBEA…) — use the FRED tab to load and chart them.')
  }

  const loadSeries = async (id) => {
    setSelected(id)
    setObsLoading(true)
    setError('')

    try {
      await loadFredSeries(id)
    } catch (e) {
      setError(`Failed to load series: ${e.message}`)
    } finally {
      setObsLoading(false)
    }
  }

  async function loadFredSeries(id) {
    setInfo('')
    const params = new URLSearchParams({
      series_id: id,
      api_key: apiKey,
      file_type: 'json',
      sort_order: 'asc',
      limit: 500
    })
    const res = await fetch(`${FRED_OBS_URL}?${params}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    if (!data.observations) {
      throw new Error('Unexpected API response — no observations field.')
    }

    const validObs = data.observations.filter(
      (o) => o.value !== '.' && o.value !== '' && o.value != null
    )

    const parsed = validObs.map((o) => ({
      year: parseYear(o.date),
      value: parseFloat(o.value)
    })).filter((p) => p.year != null && !isNaN(p.value))

    if (parsed.length === 0) {
      throw new Error('No valid numeric data to chart for this series.')
    }

    const seriesTitle = data.title || results.find((r) => r.id === id)?.title || id

    setSeriesInfo({
      id: data.id || id,
      title: seriesTitle,
      units: data.units,
      frequency: data.frequency,
      observations: validObs.length,
      firstDate: validObs[0]?.date,
      lastDate: validObs[validObs.length - 1]?.date
    })

    setChartData({
      title: seriesTitle,
      series: [
        {
          name: seriesTitle,
          color: hashColor(seriesTitle),
          values: parsed
        }
      ]
    })
  }

  async function loadBlsSeries(id) {
    setInfo('')
    setSelected(id)
    const body = {
      userapi: apiKey,
      seriesid: id,
      sort: 'A',
      startyear: '1947',
      endyear: '2026'
    }
    const res = await fetch(`${BLS_DATA_URL}${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message?.[0] || err.ErrorMessage || `HTTP ${res.status}`)
    }
    const data = await res.json()

    const series = data.Results?.series?.[0]
    if (!series) throw new Error('No series data returned from BLS.')

    const validObs = (series.data || []).filter(
      (o) => o.value !== '.' && o.value !== '' && o.value != null
    )

    const parsed = validObs
      .map((o) => ({
        year: parseInt(o.year, 10),
        value: parseFloat(o.value)
      }))
      .filter((p) => !isNaN(p.year) && !isNaN(p.value))
      .sort((a, b) => a.year - b.year)

    if (parsed.length === 0) {
      throw new Error('No valid numeric data to chart for this series.')
    }

    const seriesTitle = series.seriesTitle || series.name || id

    setSeriesInfo({
      id: series.seriesID || id,
      title: seriesTitle,
      units: series.unitOfMeasure || '',
      frequency: series.periodicity || '',
      observations: validObs.length,
      firstDate: validObs[0]?.year,
      lastDate: validObs[validObs.length - 1]?.year
    })

    setChartData({
      title: seriesTitle,
      series: [
        {
          name: seriesTitle,
          color: hashColor(seriesTitle),
          values: parsed
        }
      ]
    })

    setInfo('Verified directly on BLS. BLS series usually exist on FRED under the same ID — check the FRED mirror before pasting into fetch-data.js (it fetches via the FRED API).')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    doSearch(1)
  }

  const filteredResults = useMemo(() => {
    if (!unitsFilter) return results
    return results.filter((s) => s.units && s.units.toLowerCase().includes(unitsFilter.toLowerCase()))
  }, [results, unitsFilter])

  const uniqueUnits = useMemo(() => {
    const set = new Set()
    for (const s of results) {
      if (s.units) set.add(s.units)
    }
    return Array.from(set).sort()
  }, [results])

  const freqOptions = [
    { value: '', label: 'Any frequency' },
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Quarterly', label: 'Quarterly' },
    { value: 'Annual', label: 'Annual' }
  ]

  const currentSource = SOURCES.find((s) => s.id === source)

  const assignedDirectRow = useMemo(() => {
    if (!selected) return null
    return (
      TARGET_CHART.rows.find((row) =>
        (assignments[row.key] || []).some((i) => i.kind === 'direct' && i.id === selected)
      ) || null
    )
  }, [selected, assignments])

  const anchorResult = useMemo(() => {
    if (!assignedDirectRow || !chartData?.series?.[0]?.values) return null
    const check = anchorCheck(
      chartData.series[0].values,
      TARGET_CHART.baseYear,
      TARGET_CHART.anchorYear,
      assignedDirectRow.anchor
    )
    return check ? { row: assignedDirectRow, ...check } : null
  }, [assignedDirectRow, chartData])

  const configText = generateConfig(assignments)
  const assignedCount = TARGET_CHART.rows.filter((r) => (assignments[r.key] || []).length > 0).length

  return (
    <div className="fred-search">
      <h2>Economic Data Search — FRED · BLS · BEA</h2>
      <p className="fred-hint">
        Discover the right series per agency, verify it, then assign it to a line of the target chart below.
        <strong> FRED</strong> is the primary discovery channel (it mirrors BLS, BEA, Census, World Bank under the same IDs).
        <strong> BLS</strong> verifies exact BLS IDs. <strong> BEA</strong> lists dataset families (data flows via FRED mirrors).
      </p>

      <div className="fred-source-tabs">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            className={`fred-source-tab ${source === s.id ? 'fred-source-tab-active' : ''}`}
            onClick={() => setSource(s.id)}
            title={s.desc}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="fred-key-row">
        <label>
          {currentSource.label} API Key
          <input
            ref={searchRef}
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setSavedKey(false) }}
            placeholder={`Your ${currentSource.label} API key`}
            autoComplete="off"
          />
        </label>
        <span className="fred-key-note">Stored in localStorage, never sent anywhere except {currentSource.label}.</span>
      </div>

      <form onSubmit={handleSubmit} className="fred-search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            source === 'bls'
              ? 'BLS series ID, e.g. CES0500000030 or 13-0900'
              : source === 'bea'
                ? 'Filter BEA dataset families (e.g. NIPA, GDP)'
                : 'Search term (e.g. wages, inflation, productivity)'
          }
          className="fred-query-input"
        />

        <div className="fred-filters">
          {source === 'fred' && (
            <select value={freq} onChange={(e) => setFreq(e.target.value)}>
              {freqOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={20}>20 results</option>
            <option value={50}>50 results</option>
            <option value={100}>100 results</option>
            <option value={200}>200 results</option>
          </select>
          {source === 'fred' && (
            <select value={unitsFilter} onChange={(e) => setUnitsFilter(e.target.value)}>
              <option value="">All units</option>
              {uniqueUnits.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          )}
          {source === 'fred' && (
            <input
              type="text"
              value={tagId}
              onChange={(e) => setTagId(e.target.value)}
              placeholder="Tag ID (optional)"
              className="fred-tag-input"
            />
          )}
          <button type="submit" disabled={loading} className="fred-search-btn">
            {loading
              ? 'Loading…'
              : source === 'bls'
                ? 'Verify on BLS'
                : source === 'bea'
                  ? 'List BEA datasets'
                  : 'Search FRED'}
          </button>
        </div>
      </form>

      {source === 'bls' && (
        <div className="fred-blscard">
          <p className="fred-blscard-note">
            BLS v2 <em>search</em> is deprecated (returns 404). Enter a known BLS series ID to verify it directly against BLS,
            then confirm the FRED mirror — BLS series usually exist on FRED under the same ID, which is what fetch-data.js consumes.
          </p>
          {selected && (
            <div className="fred-blscard-row">
              <a
                className="fred-blscard-link"
                href={`https://fred.stlouisfed.org/series/${selected}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {selected} on FRED ↗
              </a>
              <a
                className="fred-blscard-link"
                href={`https://fred.stlouisfed.org/search?st=${encodeURIComponent(selected)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Search FRED for “{selected}” ↗
              </a>
            </div>
          )}
        </div>
      )}

      {error && <div className="fred-error">{error}</div>}
      {info && <div className="fred-info">{info}</div>}

      {source === 'fred' && filteredResults.length > 0 && (
        <div className="fred-results">
          <div className="fred-results-header">
            <span>Found {filteredResults.length} series{unitsFilter ? ` matching "${unitsFilter}"` : ''} on page {page} of {totalPages}</span>
            <div className="fred-pagination">
              <button disabled={page <= 1} onClick={() => doSearch(page - 1)}>&larr; Prev</button>
              <span className="fred-page-num">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => doSearch(page + 1)}>Next &rarr;</button>
            </div>
          </div>

          <table className="fred-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Freq</th>
                <th>Units</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((s) => (
                <tr
                  key={s.id}
                  className={selected === s.id ? 'fred-selected' : ''}
                  onClick={() => loadSeries(s.id)}
                >
                  <td className="fred-id">
                    <a href={`https://fred.stlouisfed.org/series/${s.id}`} target="_blank" rel="noopener noreferrer" className="fred-id-link" onClick={(e) => e.stopPropagation()}>{s.id}</a>
                  </td>
                  <td className="fred-title">
                    <a href={`https://fred.stlouisfed.org/series/${s.id}`} target="_blank" rel="noopener noreferrer" className="fred-title-link" onClick={(e) => e.stopPropagation()}>{s.title}</a>
                  </td>
                  <td>{s.frequency}</td>
                  <td>{s.units}</td>
                  <td>
                    <button
                      className="fred-btn-sm"
                      onClick={(e) => { e.stopPropagation(); copyText(`id-${s.id}`, s.id) }}
                    >
                      {copied === `id-${s.id}` ? 'Copied ✓' : 'Copy ID'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {source === 'bea' && filteredResults.length > 0 && (
        <div className="fred-results">
          <div className="fred-results-header">
            <span>{filteredResults.length} BEA dataset families</span>
          </div>

          <table className="fred-table">
            <thead>
              <tr>
                <th>Dataset</th>
                <th>Description</th>
                <th>Find data</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((s) => (
                <tr key={s.id} className="fred-row-static">
                  <td className="fred-id">{s.id}</td>
                  <td className="fred-title">{s.title}</td>
                  <td className="fred-bea-links">
                    <a
                      className="fred-btn-sm"
                      href={`https://fred.stlouisfed.org/search?st=${encodeURIComponent(s.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Search FRED ↗
                    </a>{' '}
                    <a
                      className="fred-btn-sm"
                      href="https://www.bea.gov/data/gdp/gross-domestic-product"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      BEA DataViewer ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {seriesInfo && (
        <div className="fred-series-detail">
          <div className="fred-series-header">
            <h3>{seriesInfo.title}</h3>
            <div className="fred-series-meta">
              <span>ID: <a href={`https://fred.stlouisfed.org/series/${seriesInfo.id}`} target="_blank" rel="noopener noreferrer">{seriesInfo.id}</a></span>
              <span>Freq: {seriesInfo.frequency}</span>
              <span>Units: {seriesInfo.units}</span>
              <span>Observations: {seriesInfo.observations}</span>
              <span>Range: {seriesInfo.firstDate} &rarr; {seriesInfo.lastDate}</span>
            </div>
          </div>

          {anchorResult && (
            <div className={`fred-anchor ${anchorResult.ok ? 'fred-anchor-ok' : 'fred-anchor-bad'}`}>
              <strong>Anchor check</strong> — {anchorResult.row.label}: index at {anchorResult.year} ={' '}
              <strong>{anchorResult.idx}</strong> (expected {anchorResult.row.anchor[0]}–{anchorResult.row.anchor[1]} in {TARGET_CHART.anchorYear}){' '}
              {anchorResult.ok ? '✓ consistent with the target chart' : '✗ off by more than ~12% — try another candidate or check SA/NSA and deflator choice'}
            </div>
          )}

          {obsLoading && <div className="fred-loading">Loading chart data...</div>}

          {chartData && !obsLoading && (
            <div className="fred-chart-wrap">
              <InteractiveLineChart key={seriesInfo.id} data={chartData} interactive={true} />
            </div>
          )}
        </div>
      )}

      {source === 'fred' && filteredResults.length === 0 && !loading && !error && query && (
        <div className="fred-empty">No results found.</div>
      )}

      <div className="fred-target">
        <div className="fred-target-head">
          <h3>Target chart {TARGET_CHART.number} — {TARGET_CHART.title}</h3>
          <span className="fred-target-progress">{assignedCount}/{TARGET_CHART.rows.length} lines assigned</span>
        </div>
        <p className="fred-target-note">{TARGET_CHART.note}</p>

        <table className="fred-target-table">
          <thead>
            <tr>
              <th></th>
              <th>Line</th>
              <th>Formula</th>
              <th>True source</th>
              <th>Anchor ({TARGET_CHART.anchorYear})</th>
              <th>Status</th>
              <th>Candidates / actions</th>
            </tr>
          </thead>
          <tbody>
            {TARGET_CHART.rows.map((row) => {
              const items = assignments[row.key] || []
              return (
                <tr key={row.key}>
                  <td><span className="fred-swatch" style={{ background: row.color }} /></td>
                  <td className="fred-target-label">
                    {row.label}
                    {row.note && <div className="fred-target-rownote">{row.note}</div>}
                  </td>
                  <td>{row.formula}</td>
                  <td>{row.trueSource}</td>
                  <td className="fred-target-anchor">{row.anchor[0]}–{row.anchor[1]}</td>
                  <td>
                    {items.length > 0 ? (
                      <span className="fred-chip-list">
                        {items.map((i) => (
                          <span key={i.id} className={`fred-chip fred-chip-${i.kind}`}>
                            {i.id}
                            <button
                              className="fred-chip-x"
                              title="Remove"
                              onClick={() => removeFromRow(row.key, i.id)}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="fred-chip fred-chip-pending">pending</span>
                    )}
                  </td>
                  <td className="fred-target-actions">
                    {items.length > 0 && (
                      <button
                        className="fred-btn-sm"
                        onClick={() => copyText(`row-${row.key}`, rowSnippet(row, items))}
                      >
                        {copied === `row-${row.key}` ? 'Copied ✓' : 'Copy entry'}
                      </button>
                    )}
                    {row.candidates.map((c) => {
                      const already = items.some((i) => i.id === c.id)
                      return (
                        <button
                          key={c.id}
                          className={`fred-btn-sm fred-btn-candidate ${already ? 'fred-btn-candidate-on' : ''}`}
                          title={`${c.label} — ${c.note} (${c.kind})`}
                          disabled={already}
                          onClick={() => addToRow(row.key, { id: c.id, label: c.label, kind: c.kind })}
                        >
                          {c.id}
                        </button>
                      )
                    })}
                    {selected && (
                      <button
                        className="fred-btn-sm fred-btn-use"
                        onClick={() =>
                          addToRow(row.key, {
                            id: selected,
                            label: seriesInfo?.title,
                            kind: row.derived ? 'ingredient' : 'direct'
                          })
                        }
                      >
                        Use loaded
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="fred-build">
          <div className="fred-build-head">
            <h4>Generated entry for <code>scripts/fetch-data.js</code></h4>
            <button className="fred-btn" onClick={() => copyText('config', configText)}>
              {copied === 'config' ? 'Copied ✓' : 'Copy full config'}
            </button>
          </div>
          <pre className="fred-code">{configText}</pre>
          <p className="fred-build-note">
            Paste into the SERIES array (replacing the existing “02” entry). <code>derived</code> entries are computed
            as numerator ÷ denominator over overlapping years, then indexed to <code>baseYear: 1947</code> — both are
            supported by fetch-data.js.
          </p>
        </div>

        <details className="fred-pitfalls">
          <summary>Pitfalls checklist (from the source brief)</summary>
          <ul>
            {PITFALLS.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  )
}

export default FredSearch

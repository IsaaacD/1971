import { useState, useEffect, useRef, useMemo } from 'react'
import './FredSearch.css'
import InteractiveLineChart from './InteractiveLineChart'

const SEARCH_URL = '/api/fred/fred/series/search'
const OBS_URL = '/api/fred/fred/series/observations'

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

function FredSearch() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('fred_api_key') || '')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selected, setSelected] = useState(null)
  const [seriesInfo, setSeriesInfo] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [obsLoading, setObsLoading] = useState(false)
  const [freq, setFreq] = useState('')
  const [tagId, setTagId] = useState('')
  const [savedKey, setSavedKey] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    if (apiKey && !savedKey) {
      localStorage.setItem('fred_api_key', apiKey)
      setSavedKey(true)
    }
  }, [apiKey, savedKey])

  const doSearch = async (pageNum = 1) => {
    if (!apiKey.trim()) {
      setError('Enter a FRED API key first.')
      searchRef.current?.focus()
      return
    }
    if (!query.trim()) {
      setError('Enter a search term.')
      return
    }

    setLoading(true)
    setError('')
    setSelected(null)
    setSeriesInfo(null)
    setChartData(null)

    const params = new URLSearchParams({
      search_text: query,
      api_key: apiKey,
      file_type: 'json',
      sort_order: 'asc',
      limit: 20,
      page: pageNum
    })

    if (freq) params.append('frequency', freq)
    if (tagId) params.append('tag_id', tagId)

    try {
      const res = await fetch(`${SEARCH_URL}?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.errorMessage || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setResults(data.seriess || [])
      setPage(pageNum)
      setTotalPages(data.total_pages || 1)
    } catch (e) {
      setError(e.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const loadSeries = async (id) => {
    setSelected(id)
    setObsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        series_id: id,
        api_key: apiKey,
        file_type: 'json',
        sort_order: 'asc',
        limit: 500
      })
      const res = await fetch(`${OBS_URL}?${params}`)
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

      console.log('parsed points:', parsed.length, parsed.slice(0, 3))

      const seriesTitle = data.title || results.find(r => r.id === id)?.title || id

      setSeriesInfo({
        id: data.id || id,
        title: seriesTitle,
        units: data.units,
        frequency: data.frequency,
        observations: validObs.length,
        firstDate: validObs[0]?.date,
        lastDate: validObs[validObs.length - 1]?.date
      })

      if (parsed.length === 0) {
        setError('No valid numeric data to chart for this series.')
        return
      }

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
    } catch (e) {
      setError(`Failed to load series: ${e.message}`)
    } finally {
      setObsLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    doSearch(1)
  }

  const freqOptions = [
    { value: '', label: 'Any frequency' },
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Quarterly', label: 'Quarterly' },
    { value: 'Annual', label: 'Annual' }
  ]

  return (
    <div className="fred-search">
      <h2>FRED Series Search</h2>
      <p className="fred-hint">Search the Federal Reserve Economic Data database. Click a series to view its chart.</p>

      <div className="fred-key-row">
        <label>
          API Key
          <input
            ref={searchRef}
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setSavedKey(false) }}
            placeholder="Your FRED API key"
            autoComplete="off"
          />
        </label>
        <span className="fred-key-note">Stored in localStorage, never sent anywhere except FRED.</span>
      </div>

      <form onSubmit={handleSubmit} className="fred-search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search term (e.g. wages, inflation, productivity)"
          className="fred-query-input"
        />

        <div className="fred-filters">
          <select value={freq} onChange={(e) => setFreq(e.target.value)}>
            {freqOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={tagId}
            onChange={(e) => setTagId(e.target.value)}
            placeholder="Tag ID (optional)"
            className="fred-tag-input"
          />
          <button type="submit" disabled={loading} className="fred-search-btn">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && <div className="fred-error">{error}</div>}

      {results.length > 0 && (
        <div className="fred-results">
          <div className="fred-results-header">
            <span>Found {results.length} series on page {page} of {totalPages}</span>
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
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {results.map((s) => (
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
                  <td>{s.source}</td>
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

          {obsLoading && <div className="fred-loading">Loading chart data...</div>}

          {chartData && !obsLoading && (
            <div className="fred-chart-wrap">
              <InteractiveLineChart key={seriesInfo.id} data={chartData} interactive={true} />
            </div>
          )}
        </div>
      )}

      {results.length === 0 && !loading && !error && query && (
        <div className="fred-empty">No results found.</div>
      )}
    </div>
  )
}

export default FredSearch

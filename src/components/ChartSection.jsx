import { useRef, useEffect, useState } from 'react'
import InteractiveLineChart from './InteractiveLineChart'
import { useData } from '../hooks/useData'

const DESCRIPTIONS = {
  'Wages vs. Productivity': 'From 1948 to 1973, productivity and compensation grew in tandem. After 1973, productivity continued rising while real wages stagnated, creating a widening gap. This chart shows the divergence that defined late-20th century inequality.',
  'Real GDP Per Capita': 'Real GDP per capita measures average economic output per person, adjusted for inflation. The steady climb reflects long-term growth, but the rate of growth slowed noticeably after the early 1970s.',
  'Federal Debt as % of GDP': 'Federal debt as a share of GDP fell dramatically after WWII, reaching a low near 30% in the early 1970s. Since then, debt has climbed steadily, accelerating sharply after 2008 and again in 2020.',
  'Consumer Price Index (Inflation)': 'The CPI tracks the cost of a representative basket of goods and services. The index shows the cumulative effect of inflation over decades, with particularly sharp rises in the 1970s energy crises and 2021-2022 pandemic period.',
  'Income Inequality (Gini Coefficient)': 'The Gini coefficient measures income inequality on a scale from 0 (perfect equality) to 1 (perfect inequality). The U.S. Gini was relatively stable until the mid-1970s, then began a steady climb that continues today.',
  'Top Marginal Tax Rate': 'The top marginal income tax rate fell from over 90% in the 1950s to 70% by 1964, then dropped sharply in the 1980s and again after 2017. The highest bracket rate has not exceeded 70% since 1980.',
  'Personal Savings Rate': 'The personal savings rate peaked in the 1970s and has trended downward since, falling below 3% in the mid-2000s. The spike in 2020 reflects pandemic-era lockdowns and stimulus checks.',
  'Stock Market (S&P 500) vs. Wages': 'This chart compares stock market performance to wage growth. The S&P 500 data on FRED begins in 2016, limiting historical comparison. Both series are indexed to their first available data point.',
  'Trade Balance': 'The U.S. trade balance shifted from surplus to persistent deficit starting in the 1970s. Net exports have been negative for most years since 1975, reflecting growing import dependence.',
  'Housing Affordability': 'The FHFA House Price Index tracks median home prices. The index begins in 1975, so the 1971 baseline is extrapolated. Home prices have risen far faster than incomes since the 1990s.'
}

export default function ChartSection({ dataFile, title, source, fredIds = [] }) {
  const [revealed, setRevealed] = useState(false)
  const [interactive, setInteractive] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const { data, loading, error, ref } = useData(dataFile, true)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '-50px' }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])

  const description = DESCRIPTIONS[title] || ''

  const formatValue = (val) => {
    if (typeof val !== 'number') return val
    return Number.isInteger(val) ? val.toString() : val.toFixed(1)
  }

  return (
    <section
      ref={ref}
      className={`chart-section ${revealed ? 'revealed' : ''} ${flipped ? 'flipped' : ''}`}
    >
      <div className="section-header">
        <button
          className="flip-btn"
          onClick={() => setFlipped(prev => !prev)}
          aria-label="Flip card"
          title="Flip to details"
        >
          {flipped ? 'Chart' : 'Details'}
        </button>
        <h2>{title || data?.title}</h2>
      </div>

      {loading && <div className="loading-spinner">Loading...</div>}
      {error && <div className="error-message">{error}</div>}

      {data && !loading && (
        <>
          <div className="card-face card-front">
            <InteractiveLineChart data={data} interactive={interactive} />
            {source && <div className="source-attribution">Source: {source}</div>}
            {data.unit && <div className="unit-label">Unit: {data.unit}</div>}
          </div>

          <div className="card-face card-back">
            {description && <p className="chart-description">{description}</p>}
            {source && <div className="source-attribution">Source: {source}</div>}
            {data.unit && <div className="unit-label">Unit: {data.unit}</div>}

            <div className="dataset-links">
              <a href={dataFile} download className="download-link" title="Download JSON">
                Download dataset (JSON)
              </a>
              {fredIds.length > 0 && (
                <a
                  href={`https://fred.stlouisfed.org/series/${fredIds[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-link"
                  title="View on FRED"
                >
                  View source on FRED
                  {fredIds.length > 1 && ` (${fredIds.join(', ')})`}
                </a>
              )}
            </div>

            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    {data.series.map(s => <th key={s.name} style={{ borderLeft: `3px solid ${s.color}` }}>{s.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allYears = new Set()
                    data.series.forEach(s => s.values.forEach(v => allYears.add(v.year)))
                    const sortedYears = [...allYears].sort((a, b) => a - b)
                    return sortedYears.map(year => (
                      <tr key={year}>
                        <td>{year}</td>
                        {data.series.map(s => {
                          const pt = s.values.find(v => v.year === year)
                          return <td key={s.name}>{pt ? formatValue(pt.value) : '—'}</td>
                        })}
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <button
        className="interactive-toggle"
        onClick={() => setInteractive(prev => !prev)}
        aria-pressed={interactive}
      >
        {interactive ? 'Static' : 'Interactive'}
      </button>
    </section>
  )
}

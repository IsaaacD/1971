import { useRef, useEffect, useState } from 'react'
import InteractiveLineChart from './InteractiveLineChart'
import { useData } from '../hooks/useData'

export default function ChartSection({ dataFile, title, source, fredIds = [], description = '' }) {
  const [revealed, setRevealed] = useState(false)
  const [interactive, setInteractive] = useState(false)
  const [descOpen, setDescOpen] = useState(false)
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

  return (
    <section
      ref={ref}
      className={`chart-section ${revealed ? 'revealed' : ''}`}
    >
      <h2>{title || data?.title}</h2>

      {description && (
        <div className="chart-description-wrap">
          <button
            className="desc-toggle"
            onClick={() => setDescOpen(prev => !prev)}
            aria-expanded={descOpen}
          >
            <span className={`arrow-icon ${descOpen ? 'open' : ''}`}>▼</span>
            {descOpen ? 'Hide description' : 'Show description'}
          </button>
          {descOpen && <p className="chart-description">{description}</p>}
        </div>
      )}

      {loading && <div className="loading-spinner">Loading...</div>}
      {error && <div className="error-message">{error}</div>}

      {data && !loading && (
        <>
          <InteractiveLineChart data={data} interactive={interactive} />

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

import { useRef, useEffect, useState } from 'react'
import InteractiveLineChart from './InteractiveLineChart'
import { useData } from '../hooks/useData'

export default function ChartSection({ dataFile, title, source }) {
  const [revealed, setRevealed] = useState(false)
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

      {loading && <div className="loading-spinner">Loading...</div>}
      {error && <div className="error-message">{error}</div>}

      {data && !loading && (
        <>
          <InteractiveLineChart data={data} />
          {source && <div className="source-attribution">Source: {source}</div>}
          {data.unit && <div className="unit-label">Unit: {data.unit}</div>}
        </>
      )}
    </section>
  )
}

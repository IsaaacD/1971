import { useRef, useEffect, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { useTheme } from '../styles/ThemeContext'

export default function InteractiveLineChart({ data, width, height, interactive = false }) {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const zoomBehaviorRef = useRef(null)
  const { theme } = useTheme()
  const [hiddenSeries, setHiddenSeries] = useState([])
  const [tooltip, setTooltip] = useState(null)

  const W = width || 860
  const H = height || 420
  const margin = { top: 30, right: 30, bottom: 50, left: 60 }
  const innerW = W - margin.left - margin.right
  const innerH = H - margin.top - margin.bottom

  const isDark = theme === 'dark'
  const textColor = isDark ? '#e0e0e0' : '#333'
  const gridColor = isDark ? '#3a3a3a' : '#e8e8e8'
  const markerColor = '#ff6b6b'

  const resetZoom = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const svg = d3.select(svgRef.current)
      svg.transition().duration(300).call(zoomBehaviorRef.current.transform, d3.zoomIdentity)
    }
  }, [])

  useEffect(() => {
    if (!data || !data.series || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()



    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const visibleSeries = data.series.filter(s => !hiddenSeries.includes(s.name))
    const allValues = visibleSeries.flatMap(s => s.values.map(v => v.value))

    const years = data.series[0]?.values.map(v => v.year) || []
    const minYear = d3.min(years)
    const maxYear = d3.max(years)

    const x = d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([0, innerW])

    const y = d3.scaleLinear()
      .domain(d3.extent(allValues).map((v, i) => i === 0 ? v * 0.95 : v * 1.05))
      .nice()
      .range([innerH, 0])

    const clipId = `clip-${(data.title || 'chart').replace(/[^a-zA-Z0-9]/g, '-')}`

    svg.append('defs')
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('width', innerW)
      .attr('height', innerH)

    const chartArea = g.append('g')
      .attr('clip-path', `url(#${clipId})`)

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSize(-innerH).tickFormat(''))
      .selectAll('line')
      .attr('stroke', gridColor)
      .attr('stroke-opacity', 0.5)

    g.append('g')
      .attr('class', 'grid-y')
      .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(''))
      .selectAll('line')
      .attr('stroke', gridColor)
      .attr('stroke-opacity', 0.5)

    g.selectAll('.grid path, .grid-y path').attr('stroke', 'none')
    g.selectAll('.grid text, .grid-y text').attr('fill', 'none')

    const lineGen = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX)

    visibleSeries.forEach(series => {
      chartArea.append('path')
        .datum(series.values)
        .attr('fill', 'none')
        .attr('stroke', series.color)
        .attr('stroke-width', 2.5)
        .attr('d', lineGen)

      const dotClass = `dot-${series.name.replace(/[^a-zA-Z0-9]/g, '-')}`

      chartArea.selectAll(`.${dotClass}`)
        .data(series.values)
        .enter()
        .append('circle')
        .attr('class', dotClass)
        .attr('cx', d => x(d.year))
        .attr('cy', d => y(d.value))
        .attr('r', 3)
        .attr('fill', series.color)
        .attr('opacity', 0)
        .attr('pointer-events', 'all')
        .on('mouseenter', function(event, d) {
          d3.select(this).transition().duration(100).attr('r', 6).attr('opacity', 1)
          setTooltip({
            x: x(d.year),
            y: y(d.value),
            year: d.year,
            value: d.value,
            series: series.name,
            color: series.color
          })
        })
        .on('mouseleave', function() {
          d3.select(this).transition().duration(100).attr('r', 3).attr('opacity', 0)
          setTooltip(null)
        })
    })

    const year1971 = 1971
    if (year1971 >= minYear && year1971 <= maxYear) {
      g.append('line')
        .attr('class', 'marker-1971')
        .attr('x1', x(year1971))
        .attr('x2', x(year1971))
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', markerColor)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,4')
        .attr('opacity', 0.8)

      g.append('text')
        .attr('class', 'marker-1971-label')
        .attr('x', x(year1971) + 6)
        .attr('y', 14)
        .attr('fill', markerColor)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text('1971')
    }

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format('d')))
      .selectAll('text')
      .attr('fill', textColor)
      .attr('font-size', '11px')

    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y).ticks(6))
      .selectAll('text')
      .attr('fill', textColor)
      .attr('font-size', '11px')

    g.selectAll('.x-axis path, .y-axis path')
      .attr('stroke', textColor)
      .attr('stroke-opacity', 0.3)

    g.selectAll('.x-axis line, .y-axis line')
      .attr('stroke', textColor)
      .attr('stroke-opacity', 0.2)

    // Only enable zoom in interactive mode
    if (interactive) {
      const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .translateExtent([[0, 0], [innerW, innerH]])
        .extent([[0, 0], [innerW, innerH]])
        .on('zoom', (event) => {
          const newX = event.transform.rescaleX(x)

          g.select('.x-axis').call(
            d3.axisBottom(newX).ticks(10).tickFormat(d3.format('d'))
          )
          g.selectAll('.x-axis text')
            .attr('fill', textColor)
            .attr('font-size', '11px')

          chartArea.selectAll('path')
            .attr('d', d3.line()
              .x(d => newX(d.year))
              .y(d => y(d.value))
              .curve(d3.curveMonotoneX)
            )

          chartArea.selectAll('circle')
            .attr('cx', d => newX(d.year))
            .attr('cy', d => y(d.value))

          g.select('.marker-1971')
            .attr('x1', newX(year1971))
            .attr('x2', newX(year1971))

          g.select('.marker-1971-label')
            .attr('x', newX(year1971) + 6)
        })

      svg.call(zoom)
      zoomBehaviorRef.current = zoom
    }

    return () => {
      zoomBehaviorRef.current = null
    }
  }, [data, hiddenSeries, theme, interactive])

  const toggleSeries = (name) => {
    setHiddenSeries(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ maxWidth: '100%', height: 'auto', cursor: interactive ? 'grab' : 'default' }}
      />

      {tooltip && (
        <div
          className="chart-tooltip"
          style={{
            left: margin.left + tooltip.x,
            top: margin.top + tooltip.y - 10,
            transform: 'translate(-50%, -100%)',
            borderLeft: `3px solid ${tooltip.color}`
          }}
        >
          <div style={{ fontWeight: 600, color: tooltip.color }}>{tooltip.series}</div>
          <div>Year: {tooltip.year}</div>
          <div>Value: {typeof tooltip.value === 'number' ? tooltip.value.toFixed(1) : tooltip.value}</div>
        </div>
      )}

      <div className="chart-legend">
        {data.series.map(series => (
          <label key={series.name} style={{ opacity: hiddenSeries.includes(series.name) ? 0.3 : 1 }}>
            <input
              type="checkbox"
              checked={!hiddenSeries.includes(series.name)}
              onChange={() => toggleSeries(series.name)}
              disabled={!interactive}
            />
            <span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: series.color, marginRight: 4, borderRadius: 2 }} />
            {series.name}
          </label>
        ))}
      </div>

      {interactive && (
        <button className="zoom-reset" onClick={resetZoom} title="Reset zoom">
          Reset Zoom
        </button>
      )}
    </div>
  )
}

import { useRef, useState } from 'react'

const numberFormat = new Intl.NumberFormat('fa-IR')
const shortDateFormat = new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' })
const fullDateFormat = new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric', year: 'numeric' })

const VIEW_W = 640
const VIEW_H = 220
const PAD_LEFT = 48
const PAD_RIGHT = 16
const PAD_TOP = 24
const PAD_BOTTOM = 32
const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM

export default function LineChart({ series, emptyLabel = 'داده‌ای موجود نیست' }) {
  const svgRef = useRef(null)
  const [hoverTime, setHoverTime] = useState(null)

  const activeSeries = series.filter((s) => s.points.length > 0)
  const allPoints = activeSeries.flatMap((s) => s.points)

  if (allPoints.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">{emptyLabel}</p>
  }

  const times = allPoints.map((p) => p.x.getTime())
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const timeSpan = maxTime - minTime || 1

  const values = allPoints.map((p) => p.y)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const valueSpan = rawMax - rawMin || rawMax * 0.1 || 1
  const min = rawMin - valueSpan * 0.15
  const max = rawMax + valueSpan * 0.15

  const xFor = (t) => (allPoints.length <= 1 ? PAD_LEFT + PLOT_W / 2 : PAD_LEFT + ((t - minTime) / timeSpan) * PLOT_W)
  const yFor = (v) => PAD_TOP + (1 - (v - min) / (max - min)) * PLOT_H
  const baselineY = PAD_TOP + PLOT_H

  const seriesPoints = activeSeries.map((s) => ({
    ...s,
    plotted: s.points.map((p) => ({ x: xFor(p.x.getTime()), y: yFor(p.y), raw: p })),
  }))

  const gridLevels = [max, (max + min) / 2, min]

  const handleMove = (event) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const fraction = (event.clientX - rect.left) / rect.width
    const targetTime = minTime + fraction * timeSpan
    setHoverTime(targetTime)
  }

  let hoverX = null
  const hoverEntries = []
  if (hoverTime != null) {
    let nearestOverall = null
    seriesPoints.forEach((s) => {
      let nearest = s.plotted[0]
      let nearestDist = Infinity
      s.plotted.forEach((p) => {
        const dist = Math.abs(p.raw.x.getTime() - hoverTime)
        if (dist < nearestDist) {
          nearestDist = dist
          nearest = p
        }
      })
      hoverEntries.push({ ...s, point: nearest })
      if (nearestOverall == null || nearestDist < nearestOverall.dist) {
        nearestOverall = { dist: nearestDist, x: nearest.x }
      }
    })
    hoverX = nearestOverall?.x ?? null
  }

  return (
    <div className="relative">
      {activeSeries.length > 1 && (
        <div className="mb-2 flex items-center gap-4">
          {activeSeries.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: s.color }} />
              {s.label}
            </div>
          ))}
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full touch-none"
        onPointerMove={handleMove}
        onPointerLeave={() => setHoverTime(null)}
      >
        {gridLevels.map((level, i) => (
          <g key={i}>
            <line x1={PAD_LEFT} x2={VIEW_W - PAD_RIGHT} y1={yFor(level)} y2={yFor(level)} stroke="#334155" strokeWidth="1" />
            <text x={PAD_LEFT - 8} y={yFor(level)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500" fontSize="11">
              {numberFormat.format(Math.round(level))}
            </text>
          </g>
        ))}

        {seriesPoints.map((s) => {
          const linePath = s.plotted.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
          const areaPath =
            activeSeries.length === 1 && s.plotted.length > 1
              ? `${linePath} L${s.plotted[s.plotted.length - 1].x},${baselineY} L${s.plotted[0].x},${baselineY} Z`
              : null

          return (
            <g key={s.key}>
              {areaPath && <path d={areaPath} fill={s.color} opacity="0.1" stroke="none" />}
              {s.plotted.length > 1 && (
                <path d={linePath} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              )}
              {s.plotted.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="4" fill={s.color} stroke="#0f172a" strokeWidth="2" />
              ))}
            </g>
          )
        })}

        <text x={xFor(minTime)} y={VIEW_H - 6} textAnchor="start" className="fill-slate-500" fontSize="11">
          {shortDateFormat.format(new Date(minTime))}
        </text>
        <text x={xFor(maxTime)} y={VIEW_H - 6} textAnchor="end" className="fill-slate-500" fontSize="11">
          {shortDateFormat.format(new Date(maxTime))}
        </text>

        {hoverX != null && (
          <line x1={hoverX} x2={hoverX} y1={PAD_TOP} y2={baselineY} stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
        )}
      </svg>

      {hoverX != null && hoverEntries.length > 0 && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-xl"
          style={{
            left: `${(hoverX / VIEW_W) * 100}%`,
            top: `${Math.max((hoverEntries[0].point.y / VIEW_H) * 100 - 4, 2)}%`,
          }}
        >
          {hoverEntries.map((entry) => (
            <div key={entry.key} className="flex items-center gap-2 py-0.5">
              <span className="inline-block h-0.5 w-3 rounded" style={{ backgroundColor: entry.color }} />
              <span className="font-semibold text-slate-100">{numberFormat.format(entry.point.raw.y)}</span>
              <span className="text-slate-500">{fullDateFormat.format(entry.point.raw.x)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

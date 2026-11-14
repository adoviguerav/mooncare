import { useEffect, useRef, useState } from 'react'
import type { HistoryReading, Rule } from '../../lib/api.ts'
import { formatTakenAt, formatValue } from '../../lib/format.ts'

const HEIGHT = 280
const MARGIN = { top: 28, right: 24, bottom: 34, left: 52 }
const DEFAULT_WIDTH = 640
const VALUE_PADDING_RATIO = 0.1
const MAX_READINGS_WITH_DOTS = 40
const TARGET_VALUE_TICKS = 6
const PIXELS_PER_TIME_TICK = 110
const MS_PER_HOUR = 3_600_000
const MS_PER_DAY = 24 * MS_PER_HOUR
// Which label a moment gets on the time axis, by how much time the chart covers
const HOURS_UP_TO_MS = 2 * MS_PER_DAY
const DAYS_UP_TO_MS = 120 * MS_PER_DAY

const HOUR_FORMAT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const TICK_FORMAT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })

type Props = { name: string; unit: string | null; readings: HistoryReading[]; rules: Rule[] }

// A plain SVG line with the limits of the rules: no chart library. Drawn at the real width of its box,
// so the text keeps its size on a phone and on a tablet.
export function HistoryChart({ name, unit, readings, rules }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)

  useEffect(() => {
    const box = boxRef.current
    if (box === null) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  // Read as UTC, so the ticks fall on whole hours and days in any time zone
  const times = readings.map((reading) => Date.parse(`${reading.taken_at}Z`))
  const limits = rules.flatMap((rule) => [rule.low, rule.high]).filter((limit) => limit !== null)
  const values = [...readings.map((reading) => reading.value), ...limits]

  const firstTime = Math.min(...times)
  const timeSpan = Math.max(...times) - firstTime || 1
  const lowestValue = Math.min(...values)
  const valueSpan = Math.max(...values) - lowestValue || Math.abs(lowestValue) || 1
  const bottomValue = lowestValue - valueSpan * VALUE_PADDING_RATIO
  const topValue = lowestValue + valueSpan * (1 + VALUE_PADDING_RATIO)

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1)
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const toX = (time: number) => MARGIN.left + ((time - firstTime) / timeSpan) * plotWidth
  const toY = (value: number) => MARGIN.top + plotHeight - ((value - bottomValue) / (topValue - bottomValue)) * plotHeight

  const points = readings.map((reading, index) => ({ ...reading, x: toX(times[index]), y: toY(reading.value) }))
  const outOfRangeCount = readings.filter((reading) => reading.broken_rule_id !== null).length
  const showEveryDot = readings.length <= MAX_READINGS_WITH_DOTS
  const valueTicks = getValueTicks(bottomValue, topValue)
  const timeTicks = getTimeTicks(firstTime, timeSpan, Math.max(2, Math.floor(plotWidth / PIXELS_PER_TIME_TICK)))
  const formatTime = getTimeFormat(timeSpan)

  return (
    <div ref={boxRef} className="chart-box">
      <svg
        className="chart"
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`${name} history: ${readings.length} readings, ${outOfRangeCount} out of range`}
      >
        <text className="chart-label chart-unit" x={MARGIN.left} y={14} textAnchor="end">
          {unit ?? ''}
        </text>
        {valueTicks.map((tick) => (
          <g key={tick}>
            <line className="chart-grid" x1={MARGIN.left} x2={width - MARGIN.right} y1={toY(tick)} y2={toY(tick)} />
            <text className="chart-label" x={MARGIN.left - 8} y={toY(tick) + 4} textAnchor="end">
              {TICK_FORMAT.format(tick)}
            </text>
          </g>
        ))}
        {rules.map((rule) => {
          // The band of normal values: between the two limits, or from the one limit to the edge of the plot
          const top = rule.high === null ? MARGIN.top : toY(rule.high)
          const bottom = rule.low === null ? MARGIN.top + plotHeight : toY(rule.low)
          return (
            <rect key={rule.id} className="chart-band" x={MARGIN.left} y={top} width={plotWidth} height={bottom - top} />
          )
        })}
        {limits.map((limit) => (
          <g key={limit}>
            <line className="chart-limit" x1={MARGIN.left} x2={width - MARGIN.right} y1={toY(limit)} y2={toY(limit)} />
            <text className="chart-label chart-limit-label" x={width - MARGIN.right - 4} y={toY(limit) - 5} textAnchor="end">
              limit {TICK_FORMAT.format(limit)}
            </text>
          </g>
        ))}
        {timeTicks.map((tick) => (
          <text key={tick} className="chart-label" x={toX(tick)} y={HEIGHT - 10} textAnchor="middle">
            {formatTime.format(tick)}
          </text>
        ))}
        <polyline className="chart-line" points={points.map((point) => `${point.x},${point.y}`).join(' ')} />
        {points
          .filter((point) => showEveryDot || point.broken_rule_id !== null)
          .map((point) => (
            <circle
              key={point.taken_at}
              className={point.broken_rule_id === null ? 'chart-dot' : 'chart-dot chart-dot-alert'}
              cx={point.x}
              cy={point.y}
              r={point.broken_rule_id === null ? 3.5 : 5.5}
            >
              <title>{`${formatTakenAt(point.taken_at)}: ${formatValue(point.value, unit)}`}</title>
            </circle>
          ))}
      </svg>
    </div>
  )
}

// Round numbers inside the range, about TARGET_VALUE_TICKS of them: steps of 1, 2 or 5 times a power of ten
function getValueTicks(bottom: number, top: number): number[] {
  const roughStep = (top - bottom) / TARGET_VALUE_TICKS
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= roughStep) ?? magnitude
  const ticks = []
  for (let tick = Math.ceil(bottom / step) * step; tick <= top; tick += step) {
    ticks.push(Number(tick.toPrecision(12)))
  }
  return ticks
}

// On whole hours when the chart covers hours, on whole days when it covers days
function getTimeTicks(firstTime: number, timeSpan: number, maxCount: number): number[] {
  const unit = timeSpan <= HOURS_UP_TO_MS ? MS_PER_HOUR : MS_PER_DAY
  const step = Math.max(1, Math.ceil(timeSpan / maxCount / unit)) * unit
  const ticks = []
  for (let tick = Math.ceil(firstTime / step) * step; tick <= firstTime + timeSpan; tick += step) {
    ticks.push(tick)
  }
  return ticks
}

function getTimeFormat(timeSpan: number): Intl.DateTimeFormat {
  if (timeSpan <= HOURS_UP_TO_MS) return HOUR_FORMAT
  return timeSpan <= DAYS_UP_TO_MS ? DAY_FORMAT : MONTH_FORMAT
}

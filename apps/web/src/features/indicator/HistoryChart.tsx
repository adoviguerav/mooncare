import type { HistoryReading, Rule } from '../../lib/api.ts'
import { formatTakenAt, formatValue } from '../../lib/format.ts'

const WIDTH = 640
const HEIGHT = 240
const MARGIN = { top: 16, right: 16, bottom: 28, left: 48 }
const VALUE_PADDING_RATIO = 0.1
const MAX_READINGS_WITH_DOTS = 40

type Props = { name: string; unit: string | null; readings: HistoryReading[]; rules: Rule[] }

// A plain SVG line with the limits of the rules: no chart library.
export function HistoryChart({ name, unit, readings, rules }: Props) {
  const times = readings.map((reading) => new Date(reading.taken_at).getTime())
  const limits = rules.flatMap((rule) => [rule.low, rule.high]).filter((limit) => limit !== null)
  const values = [...readings.map((reading) => reading.value), ...limits]

  const firstTime = Math.min(...times)
  const timeSpan = Math.max(...times) - firstTime || 1
  const lowestValue = Math.min(...values)
  const valueSpan = Math.max(...values) - lowestValue || 1
  const bottomValue = lowestValue - valueSpan * VALUE_PADDING_RATIO
  const paddedSpan = valueSpan * (1 + 2 * VALUE_PADDING_RATIO)

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const toX = (time: number) => MARGIN.left + ((time - firstTime) / timeSpan) * plotWidth
  const toY = (value: number) => MARGIN.top + plotHeight - ((value - bottomValue) / paddedSpan) * plotHeight

  const points = readings.map((reading, index) => ({ ...reading, x: toX(times[index]), y: toY(reading.value) }))
  const outOfRangeCount = readings.filter((reading) => reading.broken_rule_id !== null).length
  const showEveryDot = readings.length <= MAX_READINGS_WITH_DOTS

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`${name} history: ${readings.length} readings, ${outOfRangeCount} out of range`}
    >
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
          <line className="chart-limit" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={toY(limit)} y2={toY(limit)} />
          <text className="chart-label" x={MARGIN.left - 6} y={toY(limit) + 4} textAnchor="end">
            {limit}
          </text>
        </g>
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
            r={point.broken_rule_id === null ? 4 : 6}
          >
            <title>{`${formatTakenAt(point.taken_at)}: ${formatValue(point.value, unit)}`}</title>
          </circle>
        ))}
      <text className="chart-label" x={MARGIN.left} y={HEIGHT - 8}>
        {formatTakenAt(readings[0].taken_at)}
      </text>
      <text className="chart-label" x={WIDTH - MARGIN.right} y={HEIGHT - 8} textAnchor="end">
        {formatTakenAt(readings[readings.length - 1].taken_at)}
      </text>
    </svg>
  )
}

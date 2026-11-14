// Small SVG charts in the style of the prototype. No chart library: a few paths are enough.

import type { HistoryReading, Rule } from '@mooncare/api'
import { formatHour, formatShortDay } from '../lib/dates'

const WIDTH = 440
const PAD = { left: 34, right: 10, top: 12, bottom: 22 }

type Point = { label: string; value: number; alert: boolean }

/** A line of readings over time, with the rule limits as dashed lines and alerting readings in amber. */
export function HistoryChart({
  readings,
  rules = [],
  baseline,
  hourly = false,
  height = 180,
  label,
}: {
  readings: HistoryReading[]
  rules?: Rule[]
  baseline?: number | null
  hourly?: boolean
  height?: number
  label: string
}) {
  const points: Point[] = readings.map((reading) => ({
    label: hourly ? formatHour(reading.taken_at) : formatShortDay(reading.taken_at),
    value: reading.value,
    alert: reading.broken_rule_id !== null,
  }))
  if (points.length === 0) {
    return <p className="note">No readings in this range.</p>
  }

  const limits = rules.flatMap((rule) => [rule.low, rule.high]).filter((limit): limit is number => limit !== null)
  const marks = baseline != null ? [...limits, baseline] : limits
  const values = [...points.map((point) => point.value), ...marks]
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 1
    max += 1
  }
  const margin = (max - min) * 0.1
  min -= margin
  max += margin

  const innerWidth = WIDTH - PAD.left - PAD.right
  const innerHeight = height - PAD.top - PAD.bottom
  const x = (index: number) => PAD.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth)
  const y = (value: number) => PAD.top + (1 - (value - min) / (max - min)) * innerHeight
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(point.value).toFixed(1)}`).join('')
  const labelEvery = Math.max(1, Math.ceil(points.length / 6))

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} width="100%" role="img" aria-label={label}>
      {[min + margin, max - margin].map((tick) => (
        <text key={tick} x={PAD.left - 6} y={y(tick) + 4} textAnchor="end" fontSize="10" fill="var(--mute)">
          {Math.round(tick)}
        </text>
      ))}
      {limits.map((limit) => (
        <g key={`limit-${limit}`}>
          <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(limit)} y2={y(limit)} stroke="var(--warn)" strokeDasharray="5 4" strokeOpacity=".8" />
          <text x={WIDTH - PAD.right} y={y(limit) - 4} textAnchor="end" fontSize="10" fill="var(--warn)">
            limit {limit}
          </text>
        </g>
      ))}
      {baseline != null && (
        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(baseline)} y2={y(baseline)} stroke="var(--mute)" strokeDasharray="2 4" />
      )}
      <path d={line} fill="none" stroke="var(--cy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <circle
          key={index}
          cx={x(index)}
          cy={y(point.value)}
          r={point.alert ? 4.5 : points.length > 40 ? 0 : 3}
          fill={point.alert ? 'var(--warn)' : 'var(--cy)'}
        >
          <title>
            {point.label}: {point.value}
          </title>
        </circle>
      ))}
      {points.map((point, index) =>
        index % labelEvery === 0 ? (
          <text key={`x-${index}`} x={x(index)} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--mute)">
            {point.label}
          </text>
        ) : null,
      )}
    </svg>
  )
}

/** A ring split in parts, as the prototype's sleep donut. */
export function Donut({ parts, label }: { parts: { value: number; color: string }[]; label: string }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1
  const shares = parts.map((part) => (part.value / total) * 100)
  const offsets = shares.map((_, index) => shares.slice(0, index).reduce((sum, share) => sum + share, 0))
  return (
    <svg viewBox="0 0 120 120" width="140" role="img" aria-label={label}>
      <circle cx="60" cy="60" r="46" fill="none" stroke="var(--line)" strokeWidth="14" />
      {parts.map((part, index) => (
          <circle
            key={part.color}
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke={part.color}
            strokeWidth="14"
            pathLength="100"
            strokeDasharray={`${shares[index]} ${100 - shares[index]}`}
            strokeDashoffset={-offsets[index]}
            transform="rotate(-90 60 60)"
          />
      ))}
    </svg>
  )
}

/** The prototype's "today at a glance" ring: a share of 100, in the middle a number. */
export function Ring({ share, text, color }: { share: number; text: string; color: string }) {
  return (
    <svg viewBox="0 0 84 84" width="84" height="84" aria-hidden="true">
      <circle cx="42" cy="42" r="36" fill="none" stroke="var(--line)" strokeWidth="7" />
      <circle
        cx="42"
        cy="42"
        r="36"
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray="100"
        strokeDashoffset={100 - share}
        transform="rotate(-90 42 42)"
        style={{ transition: 'stroke-dashoffset .8s ease' }}
      />
      <text x="42" y="48" textAnchor="middle" fontSize="18" fontWeight="700" fill="currentColor">
        {text}
      </text>
    </svg>
  )
}

const WIDTH = 120
const HEIGHT = 32
const PADDING = 3

// The shape of the last readings, with no axis: the detail screen has the full chart.
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null

  const lowest = Math.min(...values)
  const span = Math.max(...values) - lowest || 1
  const points = values.map((value, index) => {
    const x = PADDING + (index / (values.length - 1)) * (WIDTH - 2 * PADDING)
    const y = HEIGHT - PADDING - ((value - lowest) / span) * (HEIGHT - 2 * PADDING)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg className="sparkline" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
      <polyline pathLength="1" points={points.join(' ')} />
    </svg>
  )
}

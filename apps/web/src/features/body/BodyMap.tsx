import { Icon } from '../../components/Icon.tsx'
import type { BodySystemId, BodySystemState } from '../../lib/bodySystems.ts'

type Point = [number, number]

// The standing figure of the design prototype (apps/landing/index.html), in a drawing of 360 by 400
const VIEW_WIDTH = 360
const VIEW_HEIGHT = 400
const CENTER_X = 180
// The right half of the outline, as distances from the centre line. The left half mirrors it.
const HALF_OUTLINE: Point[] = [
  [7, 80], [22, 86], [40, 92], [46, 104], [42, 124], [36, 146], [30, 166], [28, 184], [33, 200], [35, 226], [33, 262],
  [29, 296], [27, 330], [24, 360], [27, 374], [16, 378], [11, 362], [11, 330], [10, 296], [10, 262], [8, 232], [3, 214],
]
const ARM: { shoulder: Point; elbow: Point; wrist: Point } = { shoulder: [41, 100], elbow: [50, 150], wrist: [56, 198] }
const UPPER_ARM_WIDTH = 15
const FOREARM_WIDTH = 12
const HAND_RADIUS = 7
const HAND_DROP = 5
const HEAD = { y: 46, radiusX: 18, radiusY: 24 }
const NECK = { y: 70, size: 16, radius: 6 }
const RIB_COUNT = 5
// Where the dashed line of a label starts: the inner edge of the labels, which take 34% of each side
const LABEL_EDGE_X = { left: 122, right: 238 }
const DOT_RADIUS = 5
const SIDES = [1, -1]

// A closed curve through the points, each joined to the next with the slope of its neighbours
function getSmoothPath(points: Point[]): string {
  const at = (index: number) => points[(index + points.length) % points.length]
  const format = ([x, y]: Point) => `${x.toFixed(1)} ${y.toFixed(1)}`
  const curves = points.map((point, index) => {
    const before = at(index - 1)
    const next = at(index + 1)
    const afterNext = at(index + 2)
    const leaving: Point = [point[0] + (next[0] - before[0]) / 6, point[1] + (next[1] - before[1]) / 6]
    const arriving: Point = [next[0] - (afterNext[0] - point[0]) / 6, next[1] - (afterNext[1] - point[1]) / 6]
    return `C${format(leaving)} ${format(arriving)} ${format(next)}`
  })
  return `M${format(points[0])}${curves.join('')}Z`
}

const OUTLINE_PATH = getSmoothPath([
  ...HALF_OUTLINE.map(([x, y]): Point => [CENTER_X + x, y]),
  ...HALF_OUTLINE.toReversed().map(([x, y]): Point => [CENTER_X - x, y]),
])

const RIBS_PATH = Array.from({ length: RIB_COUNT }, (_, rib) => {
  const y = 100 + rib * 9
  const reach = 22 - rib * 2
  return (
    `M${CENTER_X} ${y}Q${CENTER_X + reach} ${y + 2} ${CENTER_X + reach - 2} ${y + 12}` +
    `M${CENTER_X} ${y}Q${CENTER_X - reach} ${y + 2} ${CENTER_X - reach + 2} ${y + 12}`
  )
}).join('')

type Props = {
  states: BodySystemState[]
  selectedId: BodySystemId | null
  onSelect: (systemId: BodySystemId) => void
}

/** The body with a dot on each system and a button for each on both sides. The state is in the button's name too. */
export function BodyMap({ states, selectedId, onSelect }: Props) {
  return (
    <div className="body-map">
      <svg className="body-figure" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} aria-hidden="true">
        {SIDES.map((side) => (
          <g key={side} className="body-arm">
            <path
              d={`M${CENTER_X + side * ARM.shoulder[0]} ${ARM.shoulder[1]}L${CENTER_X + side * ARM.elbow[0]} ${ARM.elbow[1]}`}
              strokeWidth={UPPER_ARM_WIDTH}
            />
            <path
              d={`M${CENTER_X + side * ARM.elbow[0]} ${ARM.elbow[1]}L${CENTER_X + side * ARM.wrist[0]} ${ARM.wrist[1]}`}
              strokeWidth={FOREARM_WIDTH}
            />
            <circle cx={CENTER_X + side * ARM.wrist[0]} cy={ARM.wrist[1] + HAND_DROP} r={HAND_RADIUS} strokeWidth={0} />
          </g>
        ))}
        <g className="body-shape">
          <rect x={CENTER_X - NECK.size / 2} y={NECK.y} width={NECK.size} height={NECK.size} rx={NECK.radius} />
          <path d={OUTLINE_PATH} />
          <ellipse cx={CENTER_X} cy={HEAD.y} rx={HEAD.radiusX} ry={HEAD.radiusY} />
        </g>
        <g className="body-bones">
          <path d={`M${CENTER_X} 84V204`} strokeDasharray="1 4" />
          <path d={RIBS_PATH} />
          <path d={`M${CENTER_X - 26} 204Q${CENTER_X} 222 ${CENTER_X + 26} 204`} />
          <path d={`M${CENTER_X - 16} 214V300M${CENTER_X + 16} 214V300`} strokeDasharray="1 5" />
        </g>
        {states.map(({ system, status }) => (
          <g key={system.id} className={`body-mark body-mark-${status ?? 'none'}`}>
            <path
              d={`M${LABEL_EDGE_X[system.side]} ${system.labelY}L${system.dot[0]} ${system.dot[1]}`}
              strokeDasharray="3 3"
            />
            {status === 'alert' && <circle className="body-ping" cx={system.dot[0]} cy={system.dot[1]} r={DOT_RADIUS} />}
            <circle className="body-dot" cx={system.dot[0]} cy={system.dot[1]} r={DOT_RADIUS} />
          </g>
        ))}
      </svg>
      {states.map(({ system, status, alertCount }) => (
        <button
          key={system.id}
          type="button"
          className={`ghost body-system body-system-${system.side}${status === 'alert' ? ' body-system-alert' : ''}`}
          style={{ top: `${(system.labelY / VIEW_HEIGHT) * 100}%` }}
          aria-pressed={system.id === selectedId}
          aria-label={`${system.title}, ${describeStatus(status, alertCount)}`}
          onClick={() => onSelect(system.id)}
        >
          <Icon name={system.icon} size={18} />
          <span>{system.title}</span>
          {status !== null && <span className={`body-status body-status-${status}`} aria-hidden="true" />}
        </button>
      ))}
    </div>
  )
}

function describeStatus(status: BodySystemState['status'], alertCount: number): string {
  if (status === null) return 'no reading yet'
  return status === 'alert' ? `${alertCount} out of range` : 'all in range'
}

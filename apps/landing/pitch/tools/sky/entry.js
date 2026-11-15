// Mounts Alex's solar-system sky of the dashboard (apps/web/src/components/SolarSky.tsx) in the mini demo,
// with no React: the component is called once, its canvas is created here and its effect is run.
import { SolarSky } from '../../../../web/src/components/SolarSky.tsx'
import { takeEffects } from './react-shim.js'

const element = SolarSky()
const canvas = document.createElement(element.type)
canvas.className = element.props.className
canvas.setAttribute('aria-hidden', 'true')
element.props.ref.current = canvas
document.body.prepend(canvas)
takeEffects().forEach((effect) => effect())

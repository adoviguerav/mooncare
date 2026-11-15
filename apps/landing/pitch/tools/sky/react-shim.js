// Just enough of React for SolarSky.tsx (apps/web) to run once, outside React, in the dashboard mini demo.
// The component only keeps a ref to its canvas and starts the sky in one effect.
let effects = []

export function useRef(initial) {
  return { current: initial }
}

export function useEffect(effect) {
  effects.push(effect)
}

export function takeEffects() {
  const taken = effects
  effects = []
  return taken
}

// The JSX of SolarSky.tsx is one <canvas>: keep its type and props, entry.js makes the element.
export function jsx(type, props) {
  return { type, props }
}

export const jsxs = jsx
export const Fragment = 'fragment'

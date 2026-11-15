// Builds demo/js/sky.js: the dashboard's solar-system sky as a plain script for the mini demo.
// Run from apps/web, whose Vite does the build:  npx vite build --config ../landing/pitch/tools/sky/vite.config.mjs
// No imports here on purpose: this file sits outside apps/web, where Vite is installed.
const here = new URL('.', import.meta.url)
const path = (file) => decodeURIComponent(new URL(file, here).pathname).replace(/^\/([A-Za-z]:)/, '$1')

export default {
  configFile: false,
  root: path('.'),
  publicDir: false,
  resolve: {
    alias: [
      { find: /^react\/jsx-runtime$/, replacement: path('jsx-shim.js') },
      { find: /^react$/, replacement: path('react-shim.js') },
    ],
  },
  build: {
    lib: { entry: path('entry.js'), formats: ['iife'], name: 'MoonCareSky', fileName: () => 'sky.js' },
    outDir: path('../../demo/js'),
    emptyOutDir: false,
    minify: true,
  },
}

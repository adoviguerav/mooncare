import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

// The crew app talks only to the MOON server. In development Vite proxies /api to it, so the page and the API
// share one origin and the session cookie works without CORS. Deployed, the same origin serves both.
const MOON_API_URL = process.env.MOON_API_URL ?? 'http://localhost:8000'

const WEB_SRC = fileURLToPath(new URL('../web/src', import.meta.url))
const WEB_STYLES = `${WEB_SRC}/styles/index.css`
const WEB_UI_MARKER = '/* @web-styles */'
const KEYFRAMES_PREFIX = 'web-'
// Rules that cannot live inside another rule: they stay at the top of the file
const HOISTED_AT_RULES = /^@(keyframes|font-face|import)\b/

function splitTopLevelRules(css: string): string[] {
  const rules: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < css.length; index++) {
    if (css.startsWith('/*', index)) {
      index = css.indexOf('*/', index) + 1
      continue
    }
    if (css[index] === '{') depth++
    if (css[index] === '}' && --depth === 0) {
      rules.push(css.slice(start, index + 1).trim())
      start = index + 1
    }
  }
  return rules
}

// Both stylesheets name some animations alike (drift, rise): the dashboard's get a prefix so neither replaces the other
function prefixKeyframes(css: string): string {
  const names = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((match) => match[1])
  const anyName = new RegExp(`\\b(${names.join('|')})\\b(?![\\w-])`, 'g')
  return css
    .replace(/@keyframes\s+([\w-]+)/g, `@keyframes ${KEYFRAMES_PREFIX}$1`)
    .replace(/animation(-name)?\s*:[^;{}]+/g, (declaration) =>
      declaration.replace(anyName, (name, _group, offset: number) =>
        // Not the property itself, and not part of a longer word such as fade-in-up
        declaration[offset - 1] === '-' ? name : `${KEYFRAMES_PREFIX}${name}`,
      ),
    )
}

// The screens brought from the dashboard (apps/web) keep the dashboard's stylesheet, so the two apps cannot
// drift apart. Its rules are nested under .web-ui, which keeps them away from the crew app's own screens.
function webStyles(): Plugin {
  return {
    name: 'mooncare-web-styles',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/styles/web-ui.css') || !code.includes(WEB_UI_MARKER)) return null
      this.addWatchFile(WEB_STYLES)
      const rules = splitTopLevelRules(readFileSync(WEB_STYLES, 'utf8'))
      const hoisted = rules.filter((rule) => HOISTED_AT_RULES.test(rule.replace(/^(\/\*[\s\S]*?\*\/\s*)+/, '')))
      const scoped = rules.filter((rule) => !hoisted.includes(rule)).map((rule) => rule.replaceAll(':root', '&'))
      const css = `${hoisted.join('\n')}\n.web-ui {\n${scoped.join('\n')}\n}`
      return code.replace(WEB_UI_MARKER, prefixKeyframes(css))
    },
  }
}

export default defineConfig({
  plugins: [webStyles(), react()],
  resolve: {
    alias: {
      '@mooncare/api': fileURLToPath(new URL('../../packages/api-client/src/index.ts', import.meta.url)),
      '@mooncare/web': WEB_SRC,
    },
    // The dashboard's files live outside this app: their imports must find this app's copies, not their own
    dedupe: ['react', 'react-dom', '@elevenlabs/react'],
  },
  server: { port: 5174, proxy: { '/api': MOON_API_URL } },
  preview: { port: 4174, proxy: { '/api': MOON_API_URL } },
})

import type { ReactNode } from 'react'

// The mood faces of the design prototype (apps/landing/index.html). Alert and Tired are drawn here in the
// same style, because the prototype has no face for them.
const INK = '#2b1408'
const EYES = (
  <>
    <circle cx="24" cy="29" r="2.6" fill={INK} stroke="none" />
    <circle cx="40" cy="29" r="2.6" fill={INK} stroke="none" />
  </>
)
const BLUSH = (
  <>
    <circle cx="17" cy="37" r="4" fill="#ff5d73" opacity=".35" stroke="none" />
    <circle cx="47" cy="37" r="4" fill="#ff5d73" opacity=".35" stroke="none" />
  </>
)

type Face = { light: string; dark: string; features: ReactNode }

const FACES: Record<string, Face> = {
  mood_happy: {
    light: '#ffe35c',
    dark: '#f2b705',
    features: (
      <>
        {EYES}
        <path d="M22 38q10 9 20 0" />
      </>
    ),
  },
  mood_rested: {
    light: '#ffc27a',
    dark: '#f08a3c',
    features: (
      <>
        <path d="M19 29q5-6 10 0M35 29q5-6 10 0" />
        <path d="M25 40q7 5 14 0" />
        {BLUSH}
      </>
    ),
  },
  mood_alert: {
    light: '#9fe9ff',
    dark: '#1fa8d8',
    features: (
      <>
        <circle cx="24" cy="28" r="4.5" fill="#fff" />
        <circle cx="40" cy="28" r="4.5" fill="#fff" />
        <circle cx="24" cy="28" r="1.8" fill={INK} stroke="none" />
        <circle cx="40" cy="28" r="1.8" fill={INK} stroke="none" />
        <path d="M19 20q5-3 10-1M35 19q5-2 10 1" />
        <path d="M25 40q7 5 14 0" />
      </>
    ),
  },
  mood_neutral: {
    light: '#fff1a0',
    dark: '#e9cf4a',
    features: (
      <>
        {EYES}
        <path d="M26 41h12" />
      </>
    ),
  },
  mood_tired: {
    light: '#d9dde3',
    dark: '#8a94a3',
    features: (
      <>
        <path d="M19 29h10M35 29h10" />
        <path d="M20 33q4 2 8 0M36 33q4 2 8 0" opacity=".45" />
        <ellipse cx="32" cy="43" rx="4" ry="3" fill={INK} stroke="none" />
      </>
    ),
  },
  mood_tense: {
    light: '#9ee89b',
    dark: '#3fae5a',
    features: (
      <>
        <circle cx="24" cy="28" r="4.5" fill="#fff" />
        <circle cx="40" cy="28" r="4.5" fill="#fff" />
        <circle cx="24" cy="28" r="1.6" fill={INK} stroke="none" />
        <circle cx="40" cy="28" r="1.6" fill={INK} stroke="none" />
        <rect x="22" y="38" width="20" height="9" rx="3" fill="#fff" />
        <path d="M27 38v9M32 38v9M37 38v9" />
      </>
    ),
  },
  mood_sad: {
    light: '#8fd0f5',
    dark: '#3b86c4',
    features: (
      <>
        <path d="M19 28l10-4M45 28l-10-4" />
        {EYES}
        <path d="M25 44q7-6 14 0" />
        <path d="M44 34q3 4 0 6q-3-2 0-6" fill="#d6f0ff" stroke="none" />
      </>
    ),
  },
}

export function MoodFace({ moodId, size = 44 }: { moodId: string; size?: number }) {
  const face = FACES[moodId]
  if (face === undefined) return null
  const gradientId = `face-${moodId}`

  return (
    <svg className="mood-face" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id={gradientId} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor={face.light} />
          <stop offset="1" stopColor={face.dark} />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill={`url(#${gradientId})`} />
      <ellipse cx="24" cy="15" rx="13" ry="6" fill="#fff" opacity=".3" />
      <g fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        {face.features}
      </g>
    </svg>
  )
}

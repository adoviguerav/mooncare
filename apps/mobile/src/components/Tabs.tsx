// The bottom tab bar of the prototype: six icon buttons.

export type Tab = 'today' | 'vitals' | 'sleep' | 'list' | 'data' | 'alerts'

const ICONS: Record<Tab, { label: string; path: string }> = {
  today: { label: 'Today', path: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5' },
  vitals: {
    label: 'Vitals',
    path: 'M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10ZM7 12h2.5l1.5-2.5 2 5 1.5-2.5H17',
  },
  sleep: { label: 'Sleep', path: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5ZM16 4v3M14.5 5.5h3' },
  list: { label: 'Checklist', path: 'M8 4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4ZM8.5 12.3l2.4 2.4 4.6-5' },
  data: {
    label: 'Data',
    path: 'M4.5 6c0-1.7 3.4-3 7.5-3s7.5 1.3 7.5 3-3.4 3-7.5 3-7.5-1.3-7.5-3ZM4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6',
  },
  alerts: { label: 'Alerts', path: 'M12 4 2.8 19.5h18.4L12 4ZM12 10v4.2M12 17h.01' },
}

const TABS = Object.keys(ICONS) as Tab[]

export function Tabs({ current, alertCount, onChange }: { current: Tab; alertCount: number; onChange: (tab: Tab) => void }) {
  return (
    <nav className="tabs" aria-label="Sections">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          aria-label={tab === 'alerts' && alertCount ? `${ICONS[tab].label}, ${alertCount} active` : ICONS[tab].label}
          title={ICONS[tab].label}
          aria-current={current === tab ? 'page' : undefined}
          className={tab === 'alerts' && alertCount ? 'alerting' : undefined}
          onClick={() => onChange(tab)}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={ICONS[tab].path} />
          </svg>
          {tab === 'alerts' && alertCount > 0 && <span className="count">{alertCount}</span>}
        </button>
      ))}
    </nav>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { ApiError, NetworkError, api } from '@mooncare/api'
import type { Me, NodeStatus, Panel } from '@mooncare/api'
import { Logo } from '../components/Logo'
import { type Tab, Tabs } from '../components/Tabs'
import { formatDay, getToday, timeAgo } from '../lib/dates'
import { flushPendingCheckins, readPanelCopy, readPendingCheckins, savePanelCopy } from '../lib/offline'
import { AlertsScreen } from './AlertsScreen'
import { ChecklistScreen } from './ChecklistScreen'
import { DataScreen } from './DataScreen'
import { IndicatorSheet } from './IndicatorSheet'
import { SleepScreen } from './SleepScreen'
import { TodayScreen } from './TodayScreen'
import { VitalsScreen } from './VitalsScreen'

/** Where the data on screen comes from: the moon server now, or the copy kept on this device. */
export type Connection = { kind: 'online' } | { kind: 'device-offline' } | { kind: 'server-unreachable' }

export type ScreenProps = {
  me: Me
  crewMemberId: number
  today: string
  panel: Panel
  onOpenIndicator: (indicatorId: string) => void
  onCheckinSaved: () => void
}

export function CrewApp({
  me,
  startedOffline,
  onSessionEnded,
  onSignOut,
}: {
  me: Me
  startedOffline: boolean
  onSessionEnded: () => void
  onSignOut: () => void
}) {
  const crewMemberId = me.crew_member_id ?? 0
  const today = getToday()
  const [tab, setTab] = useState<Tab>('today')
  const [panel, setPanel] = useState<Panel | null>(() => readPanelCopy(crewMemberId, today)?.panel ?? null)
  const [copySavedAt, setCopySavedAt] = useState<string | null>(null)
  const [connection, setConnection] = useState<Connection>(
    startedOffline ? { kind: navigator.onLine ? 'server-unreachable' : 'device-offline' } : { kind: 'online' },
  )
  const [node, setNode] = useState<NodeStatus | null>(null)
  const [openIndicator, setOpenIndicator] = useState<string | null>(null)
  const [pendingCheckins, setPendingCheckins] = useState(() => readPendingCheckins().length)

  const handleFailure = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) onSessionEnded()
      else if (error instanceof NetworkError) {
        setConnection({ kind: navigator.onLine ? 'server-unreachable' : 'device-offline' })
        const copy = readPanelCopy(crewMemberId, today)
        if (copy) {
          setPanel(copy.panel)
          setCopySavedAt(copy.savedAt)
        }
      }
    },
    [crewMemberId, today, onSessionEnded],
  )

  const refresh = useCallback(async () => {
    try {
      await flushPendingCheckins()
      const fresh = await api.panel(crewMemberId, today)
      setPanel(fresh)
      savePanelCopy(crewMemberId, fresh)
      setCopySavedAt(null)
      setConnection({ kind: 'online' })
      setPendingCheckins(readPendingCheckins().length)
      setNode(await api.node().catch(() => null))
    } catch (error) {
      handleFailure(error)
      setPendingCheckins(readPendingCheckins().length)
    }
  }, [crewMemberId, today, handleFailure])

  useEffect(() => {
    void refresh()
    // Back online, or back to the app: send what is pending and reload
    const onOnline = () => void refresh()
    const onOffline = () => setConnection({ kind: 'device-offline' })
    const onVisible = () => document.visibilityState === 'visible' && void refresh()
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const alertCount = panel?.indicators.filter((indicator) => indicator.broken_rule).length ?? 0
  const screenProps: ScreenProps | null = panel && {
    me,
    crewMemberId,
    today,
    panel,
    onOpenIndicator: setOpenIndicator,
    onCheckinSaved: () => void refresh(),
  }

  return (
    <div className="wrap">
      <header className="top">
        <h1>
          <Logo className="logo-mini" />
          <small>
            {formatDay(today)} · Lunar base · {me.display_name}
          </small>
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <ConnectionPill connection={connection} node={node} />
          <button className="back" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {connection.kind !== 'online' && (
        <p className="banner" role="status">
          {connection.kind === 'device-offline'
            ? 'This device is offline.'
            : 'The lunar base server cannot be reached.'}{' '}
          {copySavedAt ? `Showing the panel saved ${timeAgo(copySavedAt)}.` : 'Nothing saved for this day yet.'}{' '}
          {pendingCheckins > 0 && `${pendingCheckins} check-in waiting to be sent.`}
        </p>
      )}

      {!screenProps && connection.kind === 'online' && <p className="note">Loading your panel…</p>}

      {screenProps && (
        <>
          {tab === 'today' && <TodayScreen {...screenProps} pendingCheckins={pendingCheckins} connection={connection} />}
          {tab === 'vitals' && <VitalsScreen {...screenProps} />}
          {tab === 'sleep' && <SleepScreen {...screenProps} />}
          {tab === 'list' && <ChecklistScreen {...screenProps} />}
          {tab === 'data' && <DataScreen {...screenProps} />}
          {tab === 'alerts' && <AlertsScreen {...screenProps} />}
        </>
      )}

      {openIndicator && (
        <IndicatorSheet
          crewMemberId={crewMemberId}
          indicatorId={openIndicator}
          today={today}
          onClose={() => setOpenIndicator(null)}
        />
      )}

      <footer className="foot">
        Readings are real dataset values on their original dates, shown for a fictional crew: health data from
        LifeSnaps and NASA OSDR (Inspiration4), station radiation from NASA RadLab (ISS). Mood is a private
        self-report and never triggers a diagnosis.
      </footer>

      <Tabs current={tab} alertCount={alertCount} onChange={(next) => {
        setTab(next)
        window.scrollTo({ top: 0 })
      }} />
    </div>
  )
}

function ConnectionPill({ connection, node }: { connection: Connection; node: NodeStatus | null }) {
  if (connection.kind === 'device-offline') {
    return (
      <span className="pill bad" role="status">
        <i /> Device offline
      </span>
    )
  }
  if (connection.kind === 'server-unreachable') {
    return (
      <span className="pill bad" role="status">
        <i /> Base server unreachable
      </span>
    )
  }
  const lastPush = node?.last_push
  const earth = !lastPush
    ? 'Earth: not synced yet'
    : lastPush.status === 'ok'
      ? `Earth synced ${timeAgo(lastPush.finished_at)}`
      : `Earth link down ${timeAgo(lastPush.finished_at)}`
  return (
    <span className={`pill${lastPush?.status === 'failed' ? ' warn' : ''}`} role="status" title="Base server online. The Earth line is the last sync of the base with Earth.">
      <i /> Online · {earth}
    </span>
  )
}

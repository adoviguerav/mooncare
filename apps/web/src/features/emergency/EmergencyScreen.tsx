import { ConversationProvider } from '@elevenlabs/react'
import { Fragment, useEffect, useState } from 'react'
import { Icon } from '../../components/Icon.tsx'
import type { IconName } from '../../components/Icon.tsx'
import { fetchIndicatorDetail } from '../../lib/api.ts'
import type { CrewMember } from '../../lib/api.ts'
import { TODAY } from '../../lib/config.ts'
import { addDays } from '../../lib/format.ts'
import { useApi } from '../../hooks/useApi.ts'
import { closeCase, endEmergency, goBack, goToStep, recordFinding, sendReport } from '../../lib/emergency.ts'
import type { Emergency } from '../../lib/emergency.ts'
import { PROCEDURE_BY_EVENT, getAudioPath } from '../../lib/procedures.ts'
import type { EventId, Procedure, ProcedureStep } from '../../lib/procedures.ts'
import { GIVEN, PRESENT, VOICE_AGENT_EVENT } from '../../lib/voiceAgent.ts'
import { INFECTION_SIGNALS } from '../../lib/infectionSignals.ts'
import { InfectionSignals } from './InfectionSignals.tsx'
import { useVoiceAgent } from './useVoiceAgent.ts'
import type { VoiceAgent } from './useVoiceAgent.ts'

// What each kind of alert says. The model behind each one is simulated.
type Alert = {
  title: string
  flagged: string
  model: string
  icon: IconName
  // What the crew member the alert is about reads
  patientTitle: string
  patientText: string
}

const ALERTS: Record<EventId, Alert> = {
  cardiac: {
    title: 'Cardiac alert',
    flagged: 'The heart model flagged an abnormal rhythm.',
    model: 'a model trained on in-flight heart data',
    icon: 'heart',
    patientTitle: 'Help is on the way',
    patientText: 'The medical officer and the commander have been alerted and can see this alert now.',
  },
  infection: {
    title: 'Possible infection',
    flagged: `The infection model flagged ${INFECTION_SIGNALS.length} readings away from their usual values.`,
    model: 'a model trained on in-flight wearable and blood data',
    icon: 'alert',
    patientTitle: 'Your readings point to a possible infection',
    patientText: 'The medical officer has been alerted and will come to examine you. The commander knows too.',
  },
}
// Alerts whose procedure is not in the app yet, so the screen is honest about what it covers
const NOT_LOADED_PROTOCOLS = ['Low glucose', 'Potassium out of range', 'Radiation storm']
const MS_PER_SECOND = 1000
// The invented part of the demo: the heart rate the model would have seen, in bpm, after the real readings.
// It is drawn dashed and labelled as simulated. The real readings before it come from LifeSnaps.
const SIMULATED_HEART_RATES = [118, 164, 41, 172, 38]
const DETECTION_CHART = { width: 640, height: 150, padding: 12 }
const SECONDS_PER_MINUTE = 60

type Props = { crewMember: CrewMember; emergency: Emergency; onOpenPanel: () => void }

// What each profile sees while the emergency lasts: the patient a notice, the commander the status,
// the medical officer the guided procedure. Everyone starts on the alert.
export function EmergencyScreen({ crewMember, emergency, onOpenPanel }: Props) {
  const [acknowledged, setAcknowledged] = useState(false)
  const procedure = PROCEDURE_BY_EVENT[emergency.event]
  const alert = ALERTS[emergency.event]
  const isPatient = crewMember.id === emergency.patientId
  const responds = crewMember.role === 'medical_officer' || crewMember.role === 'commander'

  if (isPatient) {
    return (
      <main className="screen emergency">
        <SimulationBanner />
        <section className="card emergency-card">
          <span className="emergency-triangle">
            <Icon name="alert" size={72} />
          </span>
          <h1>{alert.patientTitle}</h1>
          <p>{alert.patientText}</p>
        </section>
      </main>
    )
  }

  if (!acknowledged) {
    return (
      <main className="screen emergency">
        <SimulationBanner />
        <button className="card emergency-card emergency-alert" onClick={() => setAcknowledged(true)}>
          <span className="emergency-triangle">
            <Icon name="alert" size={120} />
          </span>
          <strong className="emergency-title">
            {alert.title}: {emergency.patientName}
          </strong>
          <span>{alert.flagged} Tap to respond.</span>
        </button>
        <Evidence emergency={emergency} />
        {!responds && (
          <button className="ghost" onClick={onOpenPanel}>
            Back to my panel
          </button>
        )}
      </main>
    )
  }

  return (
    <main className="screen emergency">
      <SimulationBanner />
      <header className="screen-header">
        <div>
          <h1>
            {alert.title}: {emergency.patientName}
          </h1>
          <p className="muted">
            {procedure.title}. Started <Elapsed since={emergency.startedAt} /> ago.
          </p>
        </div>
        <button className="ghost" onClick={onOpenPanel}>
          My panel
        </button>
      </header>
      {crewMember.role === 'medical_officer' ? (
        <ConversationProvider>
          <Guide procedure={procedure} emergency={emergency} />
        </ConversationProvider>
      ) : (
        <Status procedure={procedure} emergency={emergency} isCommander={crewMember.role === 'commander'} />
      )}
      {emergency.event === 'infection' && <SurgeonReport procedure={procedure} emergency={emergency} />}
      <Evidence emergency={emergency} />
      <details className="card group">
        <summary className="card-heading">
          <h2>About this simulation</h2>
          <span className="group-chevron">
            <Icon name="back" size={18} />
          </span>
        </summary>
        <div className="prose">
          <p>
            On a mission, {alert.model} would raise this alert from the crew member's own readings. That model is not
            built: there is no open in-flight dataset to train it on. Here the event is started by hand and the
            abnormal readings are invented.
          </p>
          <p>
            This alert opens {procedure.title}. Not loaded yet: {NOT_LOADED_PROTOCOLS.join(', ')}.
          </p>
          <p>
            The instructions, the lists and the drug entries are the manual's own words. The titles of the steps, the
            buttons, the drawings and the notes marked "Our note" are ours.
          </p>
          <p className="muted">{procedure.source}</p>
        </div>
      </details>
    </main>
  )
}

// What the model saw: the real heart rate of the last day, then the simulated abnormal readings
function Detection({ emergency }: { emergency: Emergency }) {
  const { data: detail } = useApi(() =>
    fetchIndicatorDetail(emergency.patientId, 'heart_rate', addDays(TODAY, -1), TODAY),
  )
  const realRates = detail?.readings.map((reading) => reading.value) ?? []
  if (realRates.length < 2) return null

  const usualRate = Math.round(realRates.toSorted((a, b) => a - b)[Math.floor(realRates.length / 2)])
  const rates = [...realRates, ...SIMULATED_HEART_RATES]
  const lowest = Math.min(...rates)
  const span = Math.max(...rates) - lowest || 1
  const { width, height, padding } = DETECTION_CHART
  const toPoint = (rate: number, index: number) => {
    const x = padding + (index / (rates.length - 1)) * (width - 2 * padding)
    const y = height - padding - ((rate - lowest) / span) * (height - 2 * padding)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }
  const points = rates.map(toPoint)
  const firstSimulated = realRates.length - 1
  const detectedAt = new Date(emergency.startedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <section className="card">
      <div className="card-heading">
        <span className="icon-badge icon-badge-alert">
          <Icon name="heart" />
        </span>
        <div>
          <h2>What the heart model saw</h2>
          <p className="origin">Detected at {detectedAt}. Simulated detection.</p>
        </div>
      </div>
      <svg
        className="detection-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Heart rate of ${emergency.patientName}: the real readings of the last day, then simulated abnormal readings`}
      >
        <polyline className="detection-real" points={points.slice(0, firstSimulated + 1).join(' ')} />
        <polyline className="detection-simulated" points={points.slice(firstSimulated).join(' ')} />
      </svg>
      <p className="detection-legend">
        <span className="legend-real">Real readings, last 24 hours. Usual value {usualRate} bpm.</span>
        <span className="legend-simulated">
          Simulated: swings between {Math.min(...SIMULATED_HEART_RATES)} and {Math.max(...SIMULATED_HEART_RATES)} bpm.
        </span>
      </p>
    </section>
  )
}

// What has been recorded so far, waiting for the link. The agent fills it in as the medical officer answers.
function SurgeonReport({ procedure, emergency }: { procedure: Procedure; emergency: Emergency }) {
  const isRecorded = (name: string) => emergency.record[name] !== undefined
  const present = procedure.steps
    .flatMap((step) => step.checklist?.flatMap((group) => group.items) ?? [])
    .filter(isRecorded)
  const forms = procedure.steps.flatMap((step) => (step.record === undefined ? [] : [step.record]))
  const given = procedure.steps
    .flatMap((step) => step.reference?.map((entry) => entry.title) ?? [])
    .filter(isRecorded)
  const stepsDone = emergency.path.map((stepId) => findStep(procedure, stepId).title)
  const sentAt = emergency.sentAt === null ? null : formatClock(emergency.sentAt)

  return (
    <section className="card report">
      <div className="card-heading">
        <div>
          <h2>Report for the Surgeon</h2>
          <p className="origin">Filled in as the medical officer answers the voice guide.</p>
        </div>
        {sentAt === null ? (
          <span className="chip chip-alert">No link with Earth · queued</span>
        ) : (
          <span className="chip chip-ok">Link restored · sent at {sentAt}</span>
        )}
      </div>
      <dl>
        <dt>Patient</dt>
        <dd>{emergency.patientName}</dd>
        <dt>Symptoms and signs</dt>
        <dd>{present.length === 0 ? 'None recorded yet' : present.join(', ')}</dd>
        <dt>Raised by</dt>
        <dd>The infection model: {INFECTION_SIGNALS.map((signal) => signal.label.toLowerCase()).join(', ')}</dd>
        {forms.map((form) => {
          const values = form.fields.filter(isRecorded)
          return (
            <Fragment key={form.title}>
              <dt>{form.title}</dt>
              <dd>
                {values.length === 0
                  ? 'Not recorded yet'
                  : values.map((field) => `${field} ${emergency.record[field]}`).join(', ')}
              </dd>
            </Fragment>
          )
        })}
        <dt>Drugs given</dt>
        <dd>{given.length === 0 ? 'None recorded yet' : given.join(', ')}</dd>
        <dt>Steps done</dt>
        <dd>{stepsDone.length === 0 ? 'None yet' : stepsDone.join(', ')}</dd>
      </dl>
      <p className="muted">
        {sentAt === null ? 'Sent when the link returns.' : 'The Surgeon has the report.'} The link status is simulated.
      </p>
    </section>
  )
}

// What the model saw, for the kind of alert
function Evidence({ emergency }: { emergency: Emergency }) {
  return emergency.event === 'infection' ? (
    <InfectionSignals emergency={emergency} />
  ) : (
    <Detection emergency={emergency} />
  )
}

function SimulationBanner() {
  return (
    <div className="simulation-banner" role="status">
      <span>Simulation. This is not a real emergency.</span>
      <button onClick={endEmergency}>End simulation</button>
    </div>
  )
}

function findStep(procedure: Procedure, stepId: string | null): ProcedureStep {
  return procedure.steps.find((step) => step.id === stepId) ?? procedure.steps[0]
}

// --- The medical officer: one step at a time, read aloud ---

function Guide({ procedure, emergency }: { procedure: Procedure; emergency: Emergency }) {
  const step = findStep(procedure, emergency.stepId ?? procedure.firstStepId)
  const previousStepId = emergency.path.at(-1)
  const isClosed = emergency.closedAt !== null
  const agent = useVoiceAgent(procedure, step, previousStepId, emergency.event === VOICE_AGENT_EVENT && !isClosed)
  // The recorded voice is the fallback: it reads the step when the agent is off or not reachable
  const agentHasTheVoice = agent.state === 'live' || agent.state === 'starting'
  useNarration(procedure, step, !agentHasTheVoice)

  // The first step starts when the guide opens
  useEffect(() => {
    if (emergency.stepId === null) goToStep(procedure.firstStepId)
  }, [emergency.stepId, procedure.firstStepId])

  if (isClosed) return <CaseClosed emergency={emergency} />

  return (
    <section className="card guide">
      <div className="guide-top">
        <Progress procedure={procedure} step={step} />
        <VoiceIndicator agent={agent} />
      </div>
      <span className="chip chip-alert">{step.block}</span>
      <h2 className="guide-title">{step.title}</h2>
      {step.checklist?.map((group) => (
        <div key={group.title} className="guide-checklist">
          <p className="muted">{group.title}</p>
          <div className="guide-ticks">
            {group.items.map((item) => {
              const present = emergency.record[item] !== undefined
              return (
                <button
                  key={item}
                  className="tick"
                  aria-pressed={present}
                  onClick={() => recordFinding(item, present ? null : PRESENT)}
                >
                  {item}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <div className="guide-body">
        {step.lines.length > 0 && (
          <ol className="guide-lines">
            {step.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        )}
        {step.image !== undefined && (
          <figure className="guide-figure">
            <img src={step.image.src} alt={step.image.caption} />
            <figcaption>{step.image.caption}</figcaption>
          </figure>
        )}
      </div>
      {step.pictures !== undefined && (
        <div className="guide-pictures">
          {step.pictures.map((picture) => (
            <figure key={picture.src}>
              <img src={picture.src} alt="" />
              <figcaption>{picture.caption}</figcaption>
            </figure>
          ))}
          <p className="muted">Drawings to recognise the items. They are ours, not from the manual.</p>
        </div>
      )}
      {step.record !== undefined && (
        <div className="guide-record">
          <p className="muted">{step.record.title}</p>
          <div className="guide-record-fields">
            {step.record.fields.map((field) => (
              <label key={field}>
                <span>{field}</span>
                <input
                  type="text"
                  autoComplete="off"
                  value={emergency.record[field] ?? ''}
                  onChange={(event) => recordFinding(field, event.target.value === '' ? null : event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      )}
      {step.reference?.map((entry) => {
        const given = emergency.record[entry.title] !== undefined
        return (
          <details key={entry.title} className="guide-reference">
            <summary>{entry.title}</summary>
            {entry.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <button className="tick" aria-pressed={given} onClick={() => recordFinding(entry.title, given ? null : GIVEN)}>
              {given ? 'Given · in the report' : 'Mark as given'}
            </button>
          </details>
        )
      })}
      {step.note !== undefined && (
        <p className="guide-note">
          <strong>Our note, not from the manual.</strong> {step.note}
        </p>
      )}
      {step.timerSeconds !== undefined && <Timer key={emergency.stepStartedAt} seconds={step.timerSeconds} />}
      {step.question !== undefined && <p className="guide-question">{step.question}</p>}
      <div className="guide-options">
        {step.options.map((option) => (
          <button key={option.next} className="primary guide-option" onClick={() => goToStep(option.next)}>
            {option.label}
          </button>
        ))}
        {step.options.length === 0 && (
          <button className="primary guide-option" onClick={closeCase}>
            Close the case
          </button>
        )}
      </div>
      {previousStepId !== undefined && (
        <button className="ghost guide-back" onClick={goBack}>
          Back to the step before
        </button>
      )}
    </section>
  )
}

// The end of the guide: the report waits for the link, and the demo can bring the link back
function CaseClosed({ emergency }: { emergency: Emergency }) {
  const isSent = emergency.sentAt !== null
  return (
    <section className="card guide guide-closed">
      <span className="chip chip-ok">Case closed at {formatClock(emergency.closedAt ?? emergency.startedAt)}</span>
      <h2 className="guide-title">{isSent ? 'The report reached the Surgeon' : 'The report is waiting for the link'}</h2>
      <p>
        {isSent
          ? 'The link with Earth is back and the report below was sent. The Surgeon can now answer.'
          : 'The procedure is done without Earth. Everything recorded is in the report below, and it leaves by itself when the link returns.'}
      </p>
      <div className="guide-options">
        {isSent ? (
          <button className="primary guide-option" onClick={endEmergency}>
            End the simulation
          </button>
        ) : (
          <button className="primary guide-option" onClick={sendReport}>
            Simulate: the link returns
          </button>
        )}
      </div>
    </section>
  )
}

function formatClock(isoTime: string): string {
  return new Date(isoTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// One dot per step of the procedure, in the order of the manual
function Progress({ procedure, step }: { procedure: Procedure; step: ProcedureStep }) {
  const current = procedure.steps.indexOf(step)
  return (
    <ol className="guide-progress" aria-label={`Step ${current + 1} of ${procedure.steps.length}`}>
      {procedure.steps.map((each, index) => (
        <li key={each.id} className={index < current ? 'done' : index === current ? 'current' : undefined} />
      ))}
    </ol>
  )
}

const VOICE_LABELS = {
  starting: 'Connecting',
  listening: 'Listening',
  speaking: 'Speaking',
  off: 'Voice guide off',
  unavailable: 'Voice guide not connected',
}

// The one control of the voice: what the guide is doing, and a tap to turn it off or on
function VoiceIndicator({ agent }: { agent: VoiceAgent }) {
  const mode = agent.state === 'live' ? (agent.isSpeaking ? 'speaking' : 'listening') : agent.state
  return (
    <button className={`voice voice-${mode}`} onClick={agent.toggle} aria-label={`${VOICE_LABELS[mode]}. Tap to turn the voice guide on or off.`}>
      <span className="voice-orb" aria-hidden="true" />
      {VOICE_LABELS[mode]}
    </button>
  )
}

// Plays the recorded audio of the step, where one exists. A step without a file stays silent:
// the browser's own voice reads a whole step in one go, which is worse than the screen alone.
function useNarration(procedure: Procedure, step: ProcedureStep, voiceOn: boolean): void {
  useEffect(() => {
    if (!voiceOn) return
    const audio = new Audio(getAudioPath(procedure, step))
    audio.play().catch(() => {
      // Autoplay refused or no recording for this step: the screen guides in silence
    })
    return () => audio.pause()
  }, [procedure, step, voiceOn])
}

function Timer({ seconds }: { seconds: number }) {
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt === null) return
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [startedAt])

  const left = startedAt === null ? seconds : Math.max(0, seconds - Math.floor((now - startedAt) / MS_PER_SECOND))

  return (
    <div className={left === 0 ? 'timer timer-done' : 'timer'}>
      <span className="timer-value" aria-live="off">
        {formatSeconds(left)}
      </span>
      {startedAt === null ? (
        <button className="ghost" onClick={() => setStartedAt(Date.now())}>
          Start timer
        </button>
      ) : (
        <span className="muted">{left === 0 ? 'Time is up' : 'Counting down'}</span>
      )}
    </div>
  )
}

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  return `${minutes}:${String(totalSeconds % SECONDS_PER_MINUTE).padStart(2, '0')}`
}

function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), MS_PER_SECOND)
    return () => window.clearInterval(interval)
  }, [])
  return <>{formatSeconds(Math.max(0, Math.floor((now - Date.parse(since)) / MS_PER_SECOND)))}</>
}

// --- The commander and the rest of the crew: where the response is ---

type StatusProps = { procedure: Procedure; emergency: Emergency; isCommander: boolean }

function Status({ procedure, emergency, isCommander }: StatusProps) {
  const step = emergency.stepId === null ? null : findStep(procedure, emergency.stepId)

  return (
    <>
      <section className="card">
        <div className="card-heading">
          <span className="icon-badge icon-badge-alert">
            <Icon name={ALERTS[emergency.event].icon} />
          </span>
          <div>
            <h2>Where the medical officer is</h2>
            <p className="origin">Updates as each step is confirmed.</p>
          </div>
        </div>
        {step === null ? (
          <p className="muted">The medical officer has not opened the guide yet.</p>
        ) : (
          <>
            <p className="guide-title">
              {step.block}: {step.title}
            </p>
            {emergency.stepStartedAt !== null && (
              <p className="muted">
                On this step for <Elapsed since={emergency.stepStartedAt} />.
              </p>
            )}
          </>
        )}
      </section>
      {isCommander && procedure.secondRescuer.length > 0 && (
        <section className="card">
          <div className="card-heading">
            <h2>Your task</h2>
          </div>
          <div className="guide-task">
            {procedure.secondRescuer.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="guide-note">Procedure 1.103 is not loaded in this demo.</p>
        </section>
      )}
    </>
  )
}

import { ConversationProvider } from '@elevenlabs/react'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon.tsx'
import { fetchIndicatorDetail } from '../../lib/api.ts'
import type { CrewMember } from '../../lib/api.ts'
import { TODAY } from '../../lib/config.ts'
import { addDays } from '../../lib/format.ts'
import { useApi } from '../../hooks/useApi.ts'
import { endEmergency, goToStep } from '../../lib/emergency.ts'
import type { Emergency } from '../../lib/emergency.ts'
import { PROCEDURE_BY_EVENT, getAudioPath, getNarration } from '../../lib/procedures.ts'
import type { Procedure, ProcedureStep } from '../../lib/procedures.ts'
import { useVoiceAgent } from './useVoiceAgent.ts'
import type { VoiceAgentState } from './useVoiceAgent.ts'

const PROCEDURE = PROCEDURE_BY_EVENT.cardiac
// Alerts whose procedure is not in the app yet, so the screen is honest about what it covers
const NOT_LOADED_PROTOCOLS = ['Low glucose', 'Potassium out of range', 'Radiation storm']
// The same pace as the recorded audio, which is generated at 1.2 times normal speech
const FALLBACK_VOICE_RATE = 1.2
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
          <h1>Help is on the way</h1>
          <p>The medical officer and the commander have been alerted and can see this alert now.</p>
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
          <strong className="emergency-title">Cardiac alert: {emergency.patientName}</strong>
          <span>The heart model flagged an abnormal rhythm. Tap to respond.</span>
        </button>
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
          <h1>Cardiac alert: {emergency.patientName}</h1>
          <p className="muted">
            {PROCEDURE.title}. Started <Elapsed since={emergency.startedAt} /> ago.
          </p>
        </div>
        <button className="ghost" onClick={onOpenPanel}>
          My panel
        </button>
      </header>
      {crewMember.role === 'medical_officer' ? (
        <ConversationProvider>
          <Guide procedure={PROCEDURE} emergency={emergency} />
        </ConversationProvider>
      ) : (
        <Status procedure={PROCEDURE} emergency={emergency} isCommander={crewMember.role === 'commander'} />
      )}
      <Detection emergency={emergency} />
      <details className="card group">
        <summary className="card-heading">
          <h2>About this simulation</h2>
          <span className="group-chevron">
            <Icon name="back" size={18} />
          </span>
        </summary>
        <div className="prose">
          <p>
            On a mission, a model trained on in-flight heart data would raise this alert from the crew member's own
            readings. That model is not built: there is no open in-flight dataset to train it on. Here the event is
            started by hand and the abnormal readings are invented.
          </p>
          <p>
            A heart alert opens {PROCEDURE.title}. Not loaded yet: {NOT_LOADED_PROTOCOLS.join(', ')}.
          </p>
          <p className="muted">{PROCEDURE.source}</p>
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
  const [voiceOn, setVoiceOn] = useState(true)
  const agent = useVoiceAgent(procedure, step)
  // The recorded voice and the spoken commands are the fallback: they work when the agent does not
  const agentHasTheVoice = agent.state === 'live' || agent.state === 'starting'
  const { listening, heard, toggleListening, canListen } = useVoiceCommands(step)
  const replay = useNarration(procedure, step, voiceOn && !agentHasTheVoice)

  // The first step starts when the guide opens
  useEffect(() => {
    if (emergency.stepId === null) goToStep(procedure.firstStepId)
  }, [emergency.stepId, procedure.firstStepId])

  return (
    <section className="card guide">
      <div className="guide-top">
        <span className="chip chip-alert">{step.block}</span>
        <div className="guide-controls">
          <button className="ghost" aria-pressed={agentHasTheVoice} onClick={agent.toggle}>
            {agentHasTheVoice ? 'Stop talking' : 'Talk to the guide'}
          </button>
          {!agentHasTheVoice && (
            <>
              <button className="ghost" onClick={replay}>
                Repeat
              </button>
              <button className="ghost" aria-pressed={voiceOn} onClick={() => setVoiceOn(!voiceOn)}>
                Voice {voiceOn ? 'on' : 'off'}
              </button>
              {canListen && (
                <button className="ghost" aria-pressed={listening} onClick={toggleListening}>
                  {listening ? 'Listening' : 'Voice commands'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <p className={`agent-status agent-status-${agent.state}`} role="status">
        {describeAgent(agent.state, agent.isSpeaking)}
      </p>
      <h2 className="guide-title">{step.title}</h2>
      <div className="guide-body">
        <ol className="guide-lines">
          {step.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        {step.image !== undefined && (
          <figure className="guide-figure">
            <img src={step.image.src} alt={step.image.caption} />
            <figcaption>{step.image.caption}</figcaption>
          </figure>
        )}
      </div>
      {step.note !== undefined && <p className="guide-note">{step.note}</p>}
      {step.timerSeconds !== undefined && <Timer key={emergency.stepStartedAt} seconds={step.timerSeconds} />}
      {step.question !== undefined && <p className="guide-question">{step.question}</p>}
      <div className="guide-options">
        {step.options.map((option) => (
          <button key={option.next} className="primary guide-option" onClick={() => goToStep(option.next)}>
            {option.label}
          </button>
        ))}
        {step.options.length === 0 && (
          <button className="primary guide-option" onClick={endEmergency}>
            End simulation
          </button>
        )}
      </div>
      {listening && (
        <p className="muted" aria-live="polite">
          Say {step.options.map((option) => `"${option.heard[0]}"`).join(' or ')}, or "repeat".
          {heard !== '' && ` Heard: ${heard}`}
        </p>
      )}
    </section>
  )
}

function describeAgent(state: VoiceAgentState, isSpeaking: boolean): string {
  if (state === 'starting') return 'Connecting the voice guide'
  if (state === 'live') return isSpeaking ? 'The guide is speaking. Talk over it to interrupt.' : 'The guide is listening'
  if (state === 'unavailable') return 'Voice guide not reachable. The recorded voice reads each step.'
  return 'Voice guide off. The recorded voice reads each step.'
}

// Plays the recorded audio of the step. Without the file, the browser's own voice reads the same text.
function useNarration(procedure: Procedure, step: ProcedureStep, voiceOn: boolean): () => void {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [replays, setReplays] = useState(0)

  useEffect(() => {
    if (!voiceOn) return
    const audio = new Audio(getAudioPath(procedure, step))
    audioRef.current = audio
    const speakInstead = () => {
      window.speechSynthesis?.cancel()
      const utterance = new SpeechSynthesisUtterance(getNarration(step))
      utterance.rate = FALLBACK_VOICE_RATE
      window.speechSynthesis?.speak(utterance)
    }
    audio.addEventListener('error', speakInstead)
    audio.play().catch(() => {
      // Autoplay refused or file missing: the "error" listener covers the missing file
    })
    return () => {
      audio.removeEventListener('error', speakInstead)
      audio.pause()
      window.speechSynthesis?.cancel()
    }
  }, [procedure, step, voiceOn, replays])

  return () => setReplays(replays + 1)
}

type SpeechRecognitionLike = {
  continuous: boolean
  lang: string
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | undefined {
  const scope = window as unknown as Record<string, new () => SpeechRecognitionLike>
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition
}

// Hands are busy during CPR: with the microphone on, saying the choice moves to the next step.
// It uses the browser's own recognition, where it exists.
function useVoiceCommands(step: ProcedureStep) {
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const stepRef = useRef(step)
  const canListen = getSpeechRecognition() !== undefined

  useEffect(() => {
    stepRef.current = step
  }, [step])

  useEffect(() => {
    const Recognition = getSpeechRecognition()
    if (!listening || Recognition === undefined) return
    const recognition = new Recognition()
    recognition.continuous = true
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase()
      setHeard(transcript)
      // The longest phrase first, so "not breathing" is not read as "breathing normally" or "no"
      const matches = stepRef.current.options
        .flatMap((option) => option.heard.map((phrase) => ({ phrase, next: option.next })))
        .filter(({ phrase }) => transcript.includes(phrase))
        .toSorted((a, b) => b.phrase.length - a.phrase.length)
      if (matches.length > 0) goToStep(matches[0].next)
    }
    // The browser stops listening after a silence: start again while the switch is on
    let stopped = false
    recognition.onend = () => {
      if (!stopped) recognition.start()
    }
    recognition.start()
    return () => {
      stopped = true
      recognition.stop()
    }
  }, [listening])

  return { listening, heard, canListen, toggleListening: () => setListening(!listening) }
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
            <Icon name="heart" />
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
      {isCommander && (
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

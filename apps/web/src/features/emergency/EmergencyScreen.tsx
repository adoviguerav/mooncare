import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon.tsx'
import type { CrewMember } from '../../lib/api.ts'
import { endEmergency, goToStep } from '../../lib/emergency.ts'
import type { Emergency } from '../../lib/emergency.ts'
import { PROCEDURE_BY_EVENT, getAudioPath, getNarration } from '../../lib/procedures.ts'
import type { Procedure, ProcedureStep } from '../../lib/procedures.ts'

const PROCEDURE = PROCEDURE_BY_EVENT.cardiac
// Alerts whose procedure is not in the app yet, so the screen is honest about what it covers
const NOT_LOADED_PROTOCOLS = ['Low glucose', 'Potassium out of range', 'Radiation storm']
const MS_PER_SECOND = 1000
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
        <Guide procedure={PROCEDURE} emergency={emergency} />
      ) : (
        <Status procedure={PROCEDURE} emergency={emergency} isCommander={crewMember.role === 'commander'} />
      )}
      <details className="card group">
        <summary className="card-heading">
          <h2>What raised this alert</h2>
          <span className="group-chevron">
            <Icon name="back" size={18} />
          </span>
        </summary>
        <div className="prose">
          <p>
            This event is simulated. On a mission, a model trained on in-flight heart data would raise it from the
            crew member's own readings. That model is not built: there is no open in-flight dataset to train it on.
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
  const { listening, heard, toggleListening, canListen } = useVoiceCommands(step)
  const replay = useNarration(procedure, step, voiceOn)

  // The first step starts when the guide opens
  useEffect(() => {
    if (emergency.stepId === null) goToStep(procedure.firstStepId)
  }, [emergency.stepId, procedure.firstStepId])

  return (
    <section className="card guide">
      <div className="guide-top">
        <span className="chip chip-alert">{step.block}</span>
        <div className="guide-controls">
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
        </div>
      </div>
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
      window.speechSynthesis?.speak(new SpeechSynthesisUtterance(getNarration(step)))
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
          <ol className="guide-lines">
            {procedure.secondRescuer.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <p className="guide-note">Procedure 1.103 is not loaded in this demo.</p>
        </section>
      )}
    </>
  )
}

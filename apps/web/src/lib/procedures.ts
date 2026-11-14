// Emergency procedures as state machines. Every line of a step is copied from the manual, word for word.
// What is ours (a note, a question to pick the branch, the end of the demo) is marked as such.
// This file has no imports, so the audio script (scripts/generate-emergency-audio.mjs) can load it with Node.

export type StepOption = {
  label: string
  next: string
  // Words that pick this option when said aloud
  heard: string[]
}

export type ProcedureStep = {
  id: string
  // The block of the flow chart in the manual, e.g. "Block 3"
  block: string
  title: string
  lines: string[]
  // Ours, not from the manual
  note?: string
  image?: { src: string; caption: string }
  timerSeconds?: number
  // The decision that picks the next step. The wording of the choices is the manual's.
  question?: string
  options: StepOption[]
}

export type Procedure = {
  id: string
  title: string
  source: string
  // What the second rescuer does, from the side column of the flow chart
  secondRescuer: string[]
  firstStepId: string
  steps: ProcedureStep[]
}

const NO_LINK_NOTE =
  'No link with Earth: the call to mission control is recorded here and sent when the link returns.'

export const AED_ASSISTED_CPR: Procedure = {
  id: 'aed-assisted-cpr',
  title: '1.102 AED Assisted CPR',
  source:
    'NASA, Emergency Medical Procedures Manual for the International Space Station, MED CL 1.102 AED ASSISTED CPR, 09 APR 15. Released under FOIA 16-JSC-F-00174.',
  secondRescuer: ['If two rescuers available, Rescuer 2:', 'Deploy AED, then:', 'Go to 1.103 ALS ALGORITHM, block 1.'],
  firstStepId: 'assess',
  steps: [
    {
      id: 'assess',
      block: 'Block 1',
      title: 'Assess',
      lines: ['Assess environment for safety hazards.', 'Assess patient status.'],
      question: 'What is the patient status?',
      options: [
        {
          label: 'Patient unresponsive and not breathing or no normal breathing (only gasping)',
          next: 'cpr',
          heard: ['not breathing', 'no breathing', 'gasping'],
        },
        { label: 'Patient unresponsive and breathing normally', next: 'transport', heard: ['breathing normally'] },
      ],
    },
    {
      id: 'transport',
      block: 'Block 2',
      title: 'Transport / provide care',
      lines: [
        'Relocate to and restrain patient on the Crew Medical Restraint System.',
        'Page additional crewmember for assistance.',
        'Call MCC-H to request PMC.',
        'Go to 1.103 ALS ALGORITHM, block 13, page 5, Respiratory Assessment.',
      ],
      note: NO_LINK_NOTE,
      options: [{ label: 'Done', next: 'handover', heard: ['done', 'next'] }],
    },
    {
      id: 'cpr',
      block: 'Block 3',
      title: 'Perform CPR',
      lines: [
        'Perform 30 chest compressions for every 2 breaths (1 second each breath) for 5 cycles (approximately 2 minutes).',
        'As required, relocate to and restrain patient on the Crew Medical Restraint System.',
        'Page additional crewmember for assistance.',
        'Call MCC-H to request PMC.',
      ],
      note: NO_LINK_NOTE,
      timerSeconds: 120,
      options: [{ label: '5 cycles done', next: 'aed', heard: ['done', 'next'] }],
    },
    {
      id: 'aed',
      block: 'Block 4',
      title: 'Deploy AED',
      lines: [
        "Connect AED electrodes to patient's chest. (Figure 1)",
        "AED 'ON' (green): Press.",
        'Follow verbal prompts.',
        'If verbal prompts inaudible, read prompts on screen.',
      ],
      image: { src: '/emergency/aed-electrode-placement.png', caption: 'Figure 1. AED Electrode Placement.' },
      options: [{ label: 'AED deployed', next: 'monitor', heard: ['deployed', 'done', 'next'] }],
    },
    {
      id: 'monitor',
      block: 'Block 5',
      title: 'Monitor patient response',
      lines: ["After AED prompts 'Start CPR', perform a 10-second pulse check."],
      timerSeconds: 10,
      question: 'Is pulse detected?',
      options: [
        { label: 'Yes', next: 'assist', heard: ['yes'] },
        { label: 'No', next: 'cpr-until-prompted', heard: ['no'] },
      ],
    },
    {
      id: 'assist',
      block: 'Block 6',
      title: 'Assist patient',
      lines: [
        'If patient begins spontaneous breathing or a pulse is detected: stop chest compressions. Assist breathing as necessary.',
        'If second rescuer assisting: stop medication administration.',
        'Go to 1.103 ALS ALGORITHM, block 13, page 5, Respiratory Assessment.',
      ],
      options: [{ label: 'Done', next: 'handover', heard: ['done', 'next'] }],
    },
    {
      id: 'cpr-until-prompted',
      block: 'Block 7',
      title: 'Perform CPR',
      lines: [
        'Perform 30 chest compressions for every 2 breaths (1 second each breath) until prompted by AED.',
        "Repeat block 5 after each 'Start CPR' prompt from AED.",
      ],
      options: [{ label: "AED prompts 'Start CPR'", next: 'monitor', heard: ['start cpr', 'prompt', 'next'] }],
    },
    {
      id: 'handover',
      block: 'End of 1.102',
      title: 'Continue with the ALS algorithm',
      lines: ['Go to 1.103 ALS ALGORITHM, block 13, page 5, Respiratory Assessment.'],
      note: 'Procedure 1.103 is not loaded in this demo. The guide ends here.',
      options: [],
    },
  ],
}

// Which procedure an alert opens. The others are listed in the app as not loaded yet.
export const PROCEDURE_BY_EVENT = { cardiac: AED_ASSISTED_CPR }

// What the voice says for a step: its lines as written, then the decision
export function getNarration(step: ProcedureStep): string {
  const choices = step.question === undefined ? [] : [step.question]
  return [`${step.block}. ${step.title}.`, ...step.lines, ...choices].join(' ')
}

export function getAudioPath(procedure: Procedure, step: ProcedureStep): string {
  return `/emergency/${procedure.id}-${step.id}.mp3`
}

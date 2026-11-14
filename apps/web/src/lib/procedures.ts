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
  // Things of the manual to tick when the patient has them, such as symptoms
  checklist?: { title: string; items: string[] }[]
  // Ours, not from the manual: drawings of the items to fetch
  pictures?: { src: string; caption: string }[]
  // The form of the manual where the result of the step is written down
  record?: { title: string; fields: string[] }
  // Entries of the manual to look up, such as the drugs of a treatment. Shown on screen, read aloud only on request.
  reference?: { title: string; lines: string[] }[]
  // The decision that picks the next step. In 1.102 the choices are the manual's words; elsewhere they are ours.
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

export const BLADDER_KIDNEY_INFECTION: Procedure = {
  id: 'bladder-kidney-infection',
  title: 'Bladder/Kidney Infection',
  source:
    'NASA, International Space Station Integrated Medical Group (IMG) Medical Checklist, ISS - All Expeditions, JSC-48522-E4, 12 NOV 01. Procedure BLADDER/KIDNEY INFECTION (ISS MED/3A - ALL/FIN), 22 AUG 00.',
  secondRescuer: [],
  firstStepId: 'symptoms',
  steps: [
    {
      id: 'symptoms',
      block: 'Symptoms and signs',
      title: 'Check symptoms and signs',
      lines: [],
      checklist: [
        {
          title: 'Symptoms',
          items: [
            'Painful urination',
            'Bladder spasms',
            "Feeling of 'heaviness' in groin",
            'Fever may or may not be present',
            'Pain in lower abdomen',
            'Back pain/flank pain',
            'Pain is constant',
          ],
        },
        { title: 'Signs', items: ['Frequent urination', 'Small volume of urine', 'Cloudy or bloody urine'] },
      ],
      options: [{ label: 'Checked', next: 'unstow', heard: ['checked', 'done', 'next'] }],
    },
    {
      id: 'unstow',
      block: 'Diagnosis · 1',
      // The title is ours: the manual says "Unstow"
      title: 'Get the kit out',
      lines: ['Gloves, Non-Sterile (P3-B2)', 'Cotton Swabs (P2-B3)', 'Urine Chemstrips w/Color Chart (P4-A3)'],
      pictures: [
        { src: '/emergency/gloves.svg', caption: 'Gloves, Non-Sterile' },
        { src: '/emergency/cotton-swabs.svg', caption: 'Cotton Swabs' },
        { src: '/emergency/urine-chemstrips.svg', caption: 'Urine Chemstrips w/Color Chart' },
      ],
      options: [{ label: 'I have the kit', next: 'urinalysis', heard: ['done', 'next'] }],
    },
    {
      id: 'urinalysis',
      block: 'Diagnosis · 2',
      // The title is ours: the manual says "Analyze Urine with Urine Chemstrips w/Color Chart"
      title: 'Urine test',
      lines: [
        'Don Non-Sterile Gloves.',
        'Hold two Cotton Swabs together under urine stream to saturate.',
        'Pass two Cotton Swabs over Chemstrip to saturate colored reagent pads.',
        'Compare with Color Chart after recommended time, record results.',
        'Dispose of Cotton Swabs, Urine Chemstrips w/Color Chart in biohazardous trash.',
      ],
      record: {
        title: 'Urinalysis (CHEMSTRIP 10SG)',
        fields: [
          'SpG',
          'pH',
          'Leuk',
          'Nit',
          'Protein (mg/dL)',
          'Glucose (mg/dL)',
          'Ketones',
          'Urobilinogen (mg/dL)',
          'Bilirubin',
          'Blood',
          'Hemoglobin (Ery/uL)',
        ],
      },
      options: [{ label: 'Results recorded', next: 'treatment', heard: ['recorded', 'done', 'next'] }],
    },
    {
      id: 'treatment',
      block: 'Treatment · 3',
      title: 'Treatment',
      lines: [
        'Contact Surgeon to discuss treatment.',
        // In the manual this note opens the procedure. It is here because this is the step it applies to.
        'Contact Surgeon before giving any medication marked with an asterisk. In an emergency or during Loss of Signal, begin appropriate treatment; then call Surgeon as soon as possible.',
        'Increase daily fluid intake (at least 1 L extra per day).',
      ],
      options: [{ label: 'Done', next: 'antibiotics', heard: ['done', 'next'] }],
    },
    {
      id: 'antibiotics',
      block: 'Treatment · 4',
      title: 'Antibiotics',
      lines: [
        'All of these medications (Bactrim, Ampioks, Duricef, Cipro/Ciprolet, Tarivid, Nitroxoline) are generally effective for urinary tract infection and serious side effects are uncommon. Selection depends on individual experience and known allergies or sensitivities. It is best to check with Surgeon before selecting.',
      ],
      reference: [
        {
          title: '*Bactrim DS (Trimethoprim/Sulfamethoxasole) (P1-A4,5)',
          lines: [
            'Dose: 1 tablet 2 times/day for 7 days',
            'WARNING: Do not use if allergy to Sulfa or Trimethoprim exists. Give with caution to patients with severe allergy or asthma.',
            'Possible side effects: Skin rash, headache, stomach upset',
          ],
        },
        {
          title: '*Duricef (Cefadroxil) (P1-A18,19)',
          lines: [
            'Dose: 1 capsule 2 times/day for 10 days',
            'WARNING: Do not use if there is history of Penicillin or Cephalosporin allergy.',
            'Possible side effects: Diarrhea, nausea, vomiting, abdominal pain, rash',
          ],
        },
        {
          title: '*Cipro (Ciprofloxacin, Oral) (P1-A7)',
          lines: [
            'Dose: 1 capsule 2 times/day for 7 days',
            'Possible side effects: Nausea, diarrhea, vomiting, abdominal pain',
          ],
        },
      ],
      // Ours: the manual also gives the drugs of the Russian kits (Biseptol, Ampioks, Ciprolet, Tarivid,
      // Nitroxoline). The three shown are the ones of the US Ambulatory Medical Pack.
      options: [{ label: 'Antibiotic given', next: 'pain-relief', heard: ['given', 'done', 'next'] }],
    },
    {
      id: 'pain-relief',
      block: 'Treatment · 5',
      title: 'Pain/Spasm Relief',
      lines: [],
      reference: [
        {
          title: 'Pyridium (Phenazopyridine) (P1-B8)',
          lines: [
            'Relieves pain from bladder infection, compatible with antibacterial treatment',
            'Dose: 1 tablet per day as needed for pain',
            'Possible side effects: Colors urine orange, occasional stomach or intestinal upset',
          ],
        },
      ],
      options: [{ label: 'Done', next: 'kidney-check', heard: ['done', 'next'] }],
    },
    {
      id: 'kidney-check',
      block: 'Step 6',
      title: 'Check for kidney stones',
      lines: [
        'If contracting pain (pain coming and going) and blood in urine, proceed to {KIDNEY STONES} (SODF: ISS MED: F THROUGH N).',
        'If not, continue to step 7.',
      ],
      options: [
        { label: 'Contracting pain and blood in urine', next: 'kidney-stones', heard: ['yes'] },
        { label: 'Neither: continue to step 7', next: 'follow-up', heard: ['no'] },
      ],
    },
    {
      id: 'follow-up',
      block: 'Step 7',
      title: 'Follow up',
      lines: [
        'If no improvement or relief from antibiotic treatment and pain worsens within 24 hours, contact Surgeon.',
      ],
      options: [],
    },
    {
      id: 'kidney-stones',
      block: 'Kidney stones',
      title: 'Continue with Kidney Stones',
      lines: [],
      note: 'The Kidney Stones procedure is not loaded in this demo. The guide ends here.',
      options: [],
    },
  ],
}

// Which procedure an alert opens. The others are listed in the app as not loaded yet.
export const PROCEDURE_BY_EVENT = { cardiac: AED_ASSISTED_CPR, infection: BLADDER_KIDNEY_INFECTION }

export type EventId = keyof typeof PROCEDURE_BY_EVENT

// What the voice says for a step: its lines as written, then the decision
export function getNarration(step: ProcedureStep): string {
  const choices = step.question === undefined ? [] : [step.question]
  return [`${step.block}. ${step.title}.`, ...step.lines, ...choices].join(' ')
}

export function getAudioPath(procedure: Procedure, step: ProcedureStep): string {
  return `/emergency/${procedure.id}-${step.id}.mp3`
}

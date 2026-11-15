// Study notes of a parameter, shown folded on its page (docs/learn_more.md).
// Every statement comes from a source of the same entry, opened and read on 14 Nov 2026 and rewritten
// in our words. No range, limit or dose is written here: those live in the rules of the database.
// To add a parameter: one more entry, with its drawing in public/learn/. No code change.

export type LearnNote = {
  // alt says what the drawing shows, for whoever cannot see it; the caption says what to take from it
  body: { text: string; drawing: { src: string; alt: string; caption: string } }
  raises: string[]
  lowers: string[]
  inSpace?: string
  readWith: string[] // parameter ids
  sources: { title: string; url: string }[]
}

const MEDLINEPLUS_FEVER = {
  title: 'MedlinePlus, U.S. National Library of Medicine: Fever',
  url: 'https://medlineplus.gov/ency/article/003090.htm',
}
const MEDLINEPLUS_PULSE_OXIMETRY = {
  title: 'MedlinePlus, U.S. National Library of Medicine: Pulse oximetry',
  url: 'https://medlineplus.gov/lab-tests/pulse-oximetry/',
}
const MEDLINEPLUS_DIFFERENTIAL = {
  title: 'MedlinePlus, U.S. National Library of Medicine: Blood differential test',
  url: 'https://medlineplus.gov/ency/article/003657.htm',
}
const NASA_HABITABLE_ATMOSPHERE = {
  title: 'NASA OCHMO: Habitable Atmosphere, NASA-STD-3001 technical brief OCHMO-TB-003, Rev A (2023)',
  url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf',
}
const NASA_SLEEP_REPORT = {
  title:
    'NASA Human Research Program: Evidence report, risk of performance decrements and adverse health outcomes resulting from sleep loss, circadian desynchronization, and work overload (2016)',
  url: 'https://ntrs.nasa.gov/api/citations/20160003864/downloads/20160003864.pdf',
}
const NASA_IMMUNE_REPORT = {
  title: 'NASA Human Research Program: Evidence report, risk of crew adverse health event due to altered immune response (2013)',
  url: 'https://ntrs.nasa.gov/api/citations/20140002769/downloads/20140002769.pdf',
}
const SHAFFER_2017 = {
  title: 'Shaffer and Ginsberg (2017): An overview of heart rate variability metrics and norms. Frontiers in Public Health',
  url: 'https://www.frontiersin.org/articles/10.3389/fpubh.2017.00258/full',
}
const SMARR_2020 = {
  title: 'Smarr and others (2020): Feasibility of continuous fever monitoring using wearable devices. Scientific Reports',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7736301/',
}
const THESEUS_2016 = {
  title:
    'Aubert and others (2016): Towards human exploration of space, the THESEUS review series on cardiovascular, respiratory, and renal research priorities. npj Microgravity',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5515532/',
}
const CRUCIAN_2018 = {
  title:
    'Crucian and others (2018): Immune system dysregulation during spaceflight, potential countermeasures for deep space exploration missions. Frontiers in Immunology',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6038331/',
}

export function getLearnNote(indicatorId: string): LearnNote | undefined {
  return Object.hasOwn(LEARN_NOTES, indicatorId) ? LEARN_NOTES[indicatorId] : undefined
}

export const LEARN_NOTES: Record<string, LearnNote> = {
  skin_temperature: {
    body: {
      text: 'The body holds its inner temperature steady by moving heat through the skin. It opens the small blood vessels of the skin to let heat out, and narrows them to keep it in. During an infection, signals of the immune system tell the brain to hold a higher temperature: that is a fever, and it works against germs, which grow best at the normal temperature of the body. Skin temperature differs a lot from one person to the next, so a reading is compared with your own usual value and not with one number for everyone.',
      drawing: {
        src: '/learn/skin-temperature.svg',
        alt: 'Two cuts of the skin. On the left a wide blood vessel near the surface, with heat rising from the skin. On the right a narrow vessel, with almost no heat leaving.',
        caption: 'Open vessels in the skin let heat out. Narrow vessels keep it in.',
      },
    },
    raises: [
      'An infection or another illness that brings a fever.',
      'Physical activity, a strong emotion or a meal.',
      'Heavy clothing, or a warm and humid room.',
      'The time of day: body temperature is highest in the evening, and the skin of the hand is warmer at night than by day.',
      'The second half of the menstrual cycle.',
    ],
    lowers: [
      'The early morning, when body temperature is at its lowest.',
      'Narrowed blood vessels in the skin, which is how the body keeps its heat.',
    ],
    inSpace:
      'On six-month stays on the International Space Station, the inner body temperature of astronauts at rest rose little by little over the first months and stayed high, and it reached higher values during exercise than on the ground. Without weight, the body loses less heat to the air around the skin and through sweat. The authors think the body may answer by sending more blood to the skin.',
    readWith: ['breathing_rate', 'heart_rate_variability', 'crp', 'resting_heart_rate'],
    sources: [
      {
        title: 'MedlinePlus, U.S. National Library of Medicine: Body temperature norms',
        url: 'https://medlineplus.gov/ency/article/001982.htm',
      },
      MEDLINEPLUS_FEVER,
      SMARR_2020,
      {
        title: 'Stahn and others (2017): Increased core body temperature in astronauts during long-duration space missions. Scientific Reports',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5701078/',
      },
    ],
  },

  breathing_rate: {
    body: {
      text: 'The breathing rate is how many breaths you take in one minute. It is one of the vital signs, with the pulse, the temperature and the blood pressure. To breathe in, the diaphragm, a sheet of muscle under the lungs, tightens and moves down: the chest gets bigger and air flows into the lungs. When it relaxes, the chest gets smaller and the air is pushed out. That air is where the blood takes its oxygen.',
      drawing: {
        src: '/learn/breathing-rate.svg',
        alt: 'Two pairs of lungs. On the left the diaphragm under them is flat, the lungs are large and an arrow shows air going in. On the right the diaphragm is domed, the lungs are smaller and an arrow shows air going out.',
        caption: 'The diaphragm moves down and air flows in. It relaxes and the air goes out.',
      },
    },
    raises: [
      'An infection of the lungs, such as pneumonia.',
      'Asthma and other diseases of the lungs.',
      'A heart that pumps too weakly, or a blood clot in a lung.',
      'Anxiety and panic.',
      'Too much acid in the blood, as in uncontrolled diabetes.',
      'Too little oxygen in the air you breathe.',
    ],
    lowers: [
      'Alcohol, strong painkillers and sedatives in excess: they can slow breathing or stop it.',
      'Sleep apnea, where breathing stops and starts again during sleep.',
    ],
    inSpace:
      'The lungs keep working well without weight, and show no lasting change after six months in space. A slower breathing rate has been reported on long stays, and it is still hard to explain. A cabin kept at low pressure to get ready for work outside can leave the air slightly short of oxygen, and the body answers that by breathing more.',
    readWith: ['spo2', 'skin_temperature', 'heart_rate', 'crp'],
    sources: [
      {
        title: 'MedlinePlus, U.S. National Library of Medicine: Vital signs',
        url: 'https://medlineplus.gov/ency/article/002341.htm',
      },
      {
        title: 'MedlinePlus, U.S. National Library of Medicine: Breathing (health video)',
        url: 'https://medlineplus.gov/ency/anatomyvideos/000018.htm',
      },
      {
        title: 'MedlinePlus, U.S. National Library of Medicine: Rapid shallow breathing',
        url: 'https://medlineplus.gov/ency/article/007198.htm',
      },
      {
        title: 'MedlinePlus, U.S. National Library of Medicine: Breathing, slowed or stopped',
        url: 'https://medlineplus.gov/ency/article/003069.htm',
      },
      MEDLINEPLUS_PULSE_OXIMETRY,
      THESEUS_2016,
      NASA_HABITABLE_ATMOSPHERE,
    ],
  },

  heart_rate_variability: {
    body: {
      text: 'A healthy heart does not beat like a metronome: the time between one beat and the next changes all the time. Heart rate variability measures how much. It comes from the two branches of the nervous system that run the body without you thinking about it, one that speeds the heart up and one that slows it down, and it lets the heart adjust fast to what the body needs. The heart speeds up a little as you breathe in and slows as you breathe out. More is not always better: some illnesses also raise it.',
      drawing: {
        src: '/learn/heart-rate-variability.svg',
        alt: 'A heartbeat trace with four beats. Three bars under it mark the gaps between the beats, each of a different length.',
        caption: 'The gap between beats is never the same twice. That change is what is measured.',
      },
    },
    raises: [
      'Better aerobic fitness.',
      'Slow, deep breathing.',
      'The night: the part of it that follows breathing can be higher at night than by day.',
    ],
    lowers: [
      'Stress, worry and anxiety.',
      'Poorer health in general.',
      'Age.',
      'A faster heart rate, which leaves less time between beats for the gap to change.',
    ],
    inSpace:
      'In a study of seven astronauts on six-month stays on the International Space Station, the slow, long-term pattern of the changes between beats was different in space from on Earth. The change showed within the first month, lasted the whole flight and went back to normal after the return. The authors read it as the nervous system adjusting to life without weight, and say the reasons are not yet clear.',
    readWith: ['resting_heart_rate', 'sleep_efficiency', 'stress_score', 'breathing_rate'],
    sources: [
      SHAFFER_2017,
      {
        title:
          'Otsuka and others (2015): Intrinsic cardiovascular autonomic regulatory system of astronauts exposed long-term to microgravity in space, observational study. npj Microgravity',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5516430/',
      },
    ],
  },

  spo2: {
    body: {
      text: 'Blood picks up oxygen in the lungs. The red blood cells carry it to the heart, and the heart pumps it to the rest of the body. Oxygen saturation says how full of oxygen that blood is. The clip on the finger shines a light through the skin and measures how much of it comes out on the other side. Cold skin, poor blood flow in the hand or dark nail polish can make the clip read wrong.',
      drawing: {
        src: '/learn/spo2.svg',
        alt: 'A fingertip held between the two jaws of a clip. Dotted rays of light go from one jaw to the other through the finger, where red blood cells travel.',
        caption: 'A light crosses the fingertip. How much arrives tells how much oxygen the blood carries.',
      },
    },
    raises: ['Breathing air with more oxygen in it: giving oxygen is the main treatment when the body is short of it.'],
    lowers: [
      'Diseases of the lungs, such as pneumonia, asthma or COVID-19.',
      'A heart that pumps too weakly.',
      'Sleep apnea, where breathing stops and starts again during sleep.',
      'Air with less oxygen, as at high altitude.',
    ],
    inSpace:
      'A suit for work outside runs at low pressure, so the cabin may be kept at a lower pressure too, with a larger share of oxygen, to make the change to the suit shorter and safer. NASA accepts air slightly short of oxygen in that case. The first signs of low oxygen, such as tiredness, headache or slower thinking, are easy to take for something else, and the crew is trained to spot them in themselves and in each other.',
    readWith: ['breathing_rate', 'heart_rate', 'sleep_efficiency'],
    sources: [MEDLINEPLUS_PULSE_OXIMETRY, NASA_HABITABLE_ATMOSPHERE],
  },

  sleep_efficiency: {
    body: {
      text: 'Sleep efficiency is the share of the time in bed that you are really asleep. The time it takes to fall asleep and the time awake in the night both bring it down. Sleep is not a pause: the brain and the body stay busy, and the night moves through stages from light to deep sleep and the sleep of dreams. All of them are needed. Sleep restores energy, fixes what you learned in memory, repairs tissue and helps the body make the signals that fight infection.',
      drawing: {
        src: '/learn/sleep-efficiency.svg',
        alt: 'A bed under a moon, and under it a long bar for the night. Two filled stretches of the bar are sleep. The empty parts at the start, in the middle and at the end are time awake.',
        caption: 'The whole bar is the time in bed. The filled part is the time asleep.',
      },
    },
    raises: [
      'Going to bed and getting up at the same times every day.',
      'Regular exercise.',
      'A cool, dark and quiet place to sleep.',
    ],
    lowers: [
      'Caffeine, nicotine and alcohol.',
      'A large meal late in the day, or a late nap.',
      'Work in shifts.',
      'Age: older adults wake more easily.',
      'Air short of oxygen.',
    ],
    inSpace:
      'Astronauts sleep less in space than on the ground, and NASA does not yet know whether the cause is space itself or the workload. Crews say that a busy mind, work, discomfort, light and the noise of alarms get in the way of sleep. Recordings of sleep on the Mir station found a smaller share of the time in bed spent asleep than before the flight.',
    readWith: ['sleep_duration', 'sleep_awake_minutes', 'heart_rate_variability', 'stress_score'],
    sources: [
      {
        title: 'MedlinePlus, U.S. National Library of Medicine: Healthy sleep',
        url: 'https://medlineplus.gov/healthysleep.html',
      },
      {
        title: 'Reed and Sacco (2016): Measuring sleep efficiency, what should the denominator be? Journal of Clinical Sleep Medicine',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4751425/',
      },
      NASA_SLEEP_REPORT,
      NASA_HABITABLE_ATMOSPHERE,
    ],
  },

  crp: {
    body: {
      text: 'C-reactive protein is a protein that the liver makes and sends into the blood when there is inflammation. Inflammation is how the body fights germs and heals an injury: useful when it is short, harmful to healthy tissue when it lasts too long. The amount of this protein says how much inflammation there is in the body. It does not say where it is or what causes it.',
      drawing: {
        src: '/learn/crp.svg',
        alt: 'A liver with an arrow that goes from it to a blood vessel, where three small five-sided proteins travel.',
        caption: 'The liver makes the protein and releases it into the blood when there is inflammation.',
      },
    },
    raises: [
      'An infection by bacteria or by a virus.',
      'Diseases where the immune system attacks the body itself, such as rheumatoid arthritis or lupus.',
      'Long-lasting inflammation of the bowel, and diseases of the lungs such as asthma.',
      'Smoking and polluted air.',
      'Obesity.',
      'Insomnia and depression.',
    ],
    lowers: ['Healing: it falls as the inflammation settles, by itself or because the treatment works.'],
    readWith: ['il_6', 'white_blood_cells', 'lymphocytes', 'skin_temperature'],
    sources: [
      {
        title: 'MedlinePlus, U.S. National Library of Medicine: C-reactive protein (CRP) test',
        url: 'https://medlineplus.gov/lab-tests/c-reactive-protein-crp-test/',
      },
    ],
  },

  lymphocytes: {
    body: {
      text: 'Lymphocytes are one of the five kinds of white blood cell, the cells of the blood that defend the body. There are two main types. B cells turn into the cells that make antibodies, which stick to a germ and mark it to be destroyed. T cells attack directly and release the chemical signals that steer the whole defence. After an infection, a few of them stay as a memory, so the body answers faster the next time it meets the same germ.',
      drawing: {
        src: '/learn/lymphocytes.svg',
        alt: 'A germ in the middle. On the left a B cell sends Y-shaped antibodies towards it. On the right a T cell points an arrow straight at it.',
        caption: 'B cells make antibodies that mark the germ. T cells attack it directly.',
      },
    },
    raises: [
      'Infections by a virus, such as mononucleosis, mumps or measles.',
      'Infectious hepatitis and tuberculosis.',
      'A bacterial infection that lasts a long time.',
      'Some cancers of the blood.',
    ],
    lowers: [
      'Steroid medicines.',
      'Radiation, as a treatment or as an exposure.',
      'Sepsis, a severe reaction of the body to an infection.',
      'Infection by HIV.',
      'Chemotherapy.',
      'Age.',
    ],
    inSpace:
      'On long flights the mix of white blood cells in the blood shifts and T cells answer less well, while some other defences are more active than usual. Viruses that sleep in the body, such as the herpes viruses, wake up and are shed in saliva, often with no symptoms. Reviews by NASA name stress, radiation, life without weight, long isolation and disturbed sleep as the likely causes.',
    readWith: ['white_blood_cells', 'crp', 'radiation_dose_rate'],
    sources: [
      MEDLINEPLUS_DIFFERENTIAL,
      {
        title: 'MedlinePlus, U.S. National Library of Medicine: Immune response',
        url: 'https://medlineplus.gov/ency/article/000821.htm',
      },
      CRUCIAN_2018,
      NASA_IMMUNE_REPORT,
    ],
  },
}

// The names of the parameters a note points to, as the API gives them.
// shortcut: copied here so a button has its name without asking for the whole panel; drop it if the API returns the names with the notes
export const PARAMETER_NAMES: Record<string, string> = {
  breathing_rate: 'Breathing rate during sleep',
  crp: 'C-reactive protein (CRP)',
  heart_rate: 'Heart rate',
  heart_rate_variability: 'Heart rate variability',
  il_6: 'Interleukin 6 (IL-6)',
  lymphocytes: 'Lymphocytes',
  radiation_dose_rate: 'Radiation dose rate in the ship',
  resting_heart_rate: 'Resting heart rate',
  skin_temperature: 'Skin temperature',
  sleep_awake_minutes: 'Time awake during the night',
  sleep_duration: 'Sleep duration',
  sleep_efficiency: 'Sleep efficiency',
  spo2: 'Blood oxygen (SpO2)',
  stress_score: 'Stress score of the watch',
  white_blood_cells: 'White blood cells',
}

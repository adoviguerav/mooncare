# Real Telemetry · Parameters and datasets

Agreed on 13 Nov 2026. It joins two pieces of work: the ASTRA-HEALTH parameter and alert list (Àngels) and the datasets we can download today. Every download link was checked that day from a terminal, with no account.

## How to read the tables

The three tables have the same columns.

- **Module.** The ASTRA-HEALTH module the parameter belongs to.
- **Alert and response.** The alert it triggers and what the system does, as written in ASTRA-HEALTH.
- **Priority.** The ASTRA-HEALTH level the alert would usually get. L1 critical, L2 high, L3 moderate, L4 low. ASTRA-HEALTH defines the four levels but does not give one to each alert, so this column is a proposal for Àngels to confirm.
- **Measured in space.** Equipment and frequency from ASTRA-HEALTH. A real device is named where we found one in use.
- **Dataset and data type.** The file and column the app reads, and whose data it is. Dataset numbers refer to the dataset cards further down.

## Table 1 · MVP

What the panel shows first. These are the indicators the challenge brief suggests. Only glucose needs a blood sample, and it is the NASA data that makes us eligible.

| Parameter | Module | Alert and response | Priority | Measured in space | Dataset and data type |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Heart rate | CARDIO | Tachycardia. Resting HR stays above the personal baseline. Assess hydration, infection, stress and cardiovascular status | L3 | Wearable ECG or smartwatch, continuous. On the ISS, the Bio-Monitor shirt (CSA) | 5 daily · `resting_hr` for the alert. 5 hourly · `bpm` for the curve through the day. Real, Earth |
| Sleep duration and efficiency | MIND | Sleep deprivation. Duration below the personal target. Adjust schedule and review factors | L3 | Actigraphy and diary, wrist tracker, every night. On the ISS, the Actiwatch (NASA) | 5 daily · `minutesAsleep`, `sleep_efficiency`. Real, Earth |
| Mood | MIND | Behavioural changes. Deviations in self-report, sleep or activity. Confidential assessment, no automatic diagnosis | L4 | Self-assessment on the tablet, daily | 5 · `HAPPY`, `SAD`, `TENSE/ANXIOUS`, `ALERT`, `RESTED/RELAXED`, `NEUTRAL`. Real, Earth |
| Body temperature | IMMUNE | Possible infection. Raised temperature plus symptoms. Start the infection assessment protocol | L2 | Thermometer or wearable, daily. Bio-Monitor measures skin temperature | 5 daily · `nightly_temperature` (skin, not core). Real, Earth |
| Exercise | BONE | Insufficient exercise. Resistance exercise below the prescribed programme. Notify the astronaut | L3 | Wearable sensor, continuous, plus an exercise log on the tablet, daily | 5 daily · `very_active_minutes`, `steps`. General activity, not resistance exercise, so it covers the alert only in part. Real, Earth |
| Blood glucose | NUTRI | Abnormal glucose regulation. Glucose outside the personal target. Metabolic assessment | L2 | Glucometer or continuous monitor. A continuous monitor flew on Ax-4 in 2025 | 1 · `glucose_value_milligram_per_deciliter`. Real, astronauts |

## Table 2 · Nice to have

We have data for all of these. They go after the MVP, in this order. NASA data comes first because it reuses the glucose loader and it is what the judges ask for. The Earth wearable ones follow, from the most to the least serious alert.

| Parameter | Module | Alert and response | Priority | Measured in space | Dataset and data type |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Radiation dose | VITAL | Radiation exposure warning. Cumulative dose near or over mission limits. Radiation protection protocol | L2 | Wearable dosimeter and detectors, continuous. RadLab has readings from dosimeters inside ISS modules | 4 · `absorbed_dose_rate` (μGy/hour). Real, measured in orbit |
| White cells and lymphocytes | IMMUNE | Lymphocyte reduction. Count falls well below baseline. Flag immune suppression and repeat the test | L2 | Portable haematology analyser, finger blood, periodically | 2 · `white_blood_cell_count_value...`, `absolute_lymphocytes_value...`. Real, astronauts |
| Inflammation markers (IL-6, IL-1β, TNF-α, IFN-γ) | IMMUNE | Increased inflammation. Any of them above baseline. Assess infection, inflammation and stress | L2 | Microfluidic analyser, venous blood, periodically | 3 · IL-6 and TNF-α in the Eve file, IL-1β and IFN-γ in the Alamar file. Real, astronauts |
| Electrolytes (sodium, potassium, chloride) | NUTRI | Electrolyte imbalance. Outside limits. Repeat the test, clinical review | L2 | Portable chemistry analyser, finger blood, periodically | 1 · `sodium_value...`, `potassium_value...`, `chloride_value...`. Real, astronauts |
| Kidney function (creatinine, urea, eGFR) | VITAL | Renal deterioration. Creatinine up or eGFR down against baseline. Renal assessment | L2 | Portable analyser, finger or venous blood, periodically | 1 · `creatinine_value...`, `urea_nitrogen_bun_value...`, `egfr_..._value...`. Real, astronauts |
| Haemoglobin and albumin | NUTRI | Nutritional deficiency risk. Abnormal values. Targeted nutritional assessment | L3 | Portable haematology and chemistry analysers, periodically | 2 · `hemoglobin_value_percent`. 1 · `albumin_value_gram_per_deciliter`. Real, astronauts |
| Blood calcium, CRP, fibrinogen | NUTRI, CARDIO | Not in ASTRA-HEALTH as such. Blood calcium relates to its calcium alerts, which use diet and urine. CRP and fibrinogen have no alert in ASTRA-HEALTH, so what they would trigger is still to be defined | L3 | Blood test, periodically | 1 · `calcium_value...`. 3 · `crp_concentration...`, `fibrinogen_concentration...`. Real, astronauts |
| Blood oxygen (SpO2) | CARDIO | Reduced SpO2. Below threshold or falling from baseline. Repeat, assess respiratory and cardiovascular status | L1 if severe, else L2 | Pulse oximeter, daily or continuous. Bio-Monitor | 5 daily · `spo2`. Real, Earth |
| Breathing rate | VITAL | Respiratory dysfunction. Abnormal rate or symptoms. Respiratory assessment | L2 | Wearable sensor, continuous or daily. Bio-Monitor | 5 daily · `full_sleep_breathing_rate` (during sleep). Real, Earth |
| Heart rate variability | CARDIO, MIND | No alert of its own. It is the physiological stress signal and it feeds the cross-module sleep alert below | L3 | ECG or wearable, continuous or daily trend. Bio-Monitor | 5 daily · `rmssd`. Real, Earth |
| Stress | MIND | Increased stress. Rising from baseline. Stress management and reassess | L3 | PSS questionnaire on the tablet, daily or weekly | 5 daily · `stress_score` (computed by the watch, not PSS). Real, Earth |
| Fatigue | MIND | Increased fatigue. Persistently high scores. Assess sleep, workload, nutrition and physiology | L3 | Questionnaire on the tablet, daily | 5 · `TIRED`. Real, Earth |
| Sleep stages and awakenings | MIND | Reduced sleep quality. Lower efficiency or frequent awakenings. Assess environment, stress and circadian rhythm | L3 | Actigraphy, wrist tracker, every night | 5 daily · `minutesAwake`, `sleep_deep_ratio`, `sleep_rem_ratio`. Real, Earth |
| Cardiovascular fitness | CARDIO | Reduced cardiovascular fitness. Review conditioning and tolerance | L3 | Wearable ECG or HR monitor in a standard exercise | 5 daily · `filteredDemographicVO2Max` (estimated by the watch). ASTRA-HEALTH defines this alert by HR and recovery in a standard exercise, which this estimate does not measure directly. Real, Earth |
| Anxiety and affect questionnaires | MIND | Anxiety symptoms. Rising scores. Confidential psychological support | L3 | GAD-7 and PHQ-9 on the tablet, weekly or periodically | 5 surveys · `stai_stress` and `positive_affect_score`, `negative_affect_score`. Different questionnaires (STAI, PANAS), no depression score. Real, Earth |

## Table 3 · Next steps

Important for long missions and already defined in ASTRA-HEALTH, but we found no open data. Ordered by how serious the alert is and how much it matters on a long mission. Heart, eyes, bone and muscle come first because the System_design names them as the severe effects.

| Parameter | Module | Alert and response | Priority | Measured in space | Dataset and data type |
| :-- | :-- | :-- | :-- | :-- | :-- |
| ECG and QT interval | CARDIO | Abnormal rhythm, QT prolongation. ECG assessment, medical review, review medications | L1 | Portable ECG, periodically or as indicated | No open data |
| Blood pressure | CARDIO | Hypertension or hypotension on repeat readings. Repeat, cardiovascular assessment | L2 | Digital BP monitor, daily. Bio-Monitor | No open data with a daily history |
| Eye pressure and retina (SANS) | VITAL | SANS-related changes, increased eye pressure. Dedicated SANS assessment | L2 | Portable tonometer, OCT and fundus camera, periodically | No open data |
| Bone turnover markers (CTX-I, P1NP) | BONE | Increased bone resorption, reduced formation. Flag bone-loss risk, review exercise and nutrition | L3 | Blood kit and analyser, every 2 to 4 weeks | No open data |
| Bone density | BONE | Reduced bone density. Clinical review, reassess countermeasures | L3 | DXA scanner, before and after the mission | No open data |
| Muscle mass and grip strength | BONE | Muscle mass loss, reduced strength. Review resistance exercise and protein | L3 | Bioimpedance or ultrasound, handgrip dynamometer, weekly | No open data |
| Viral reactivation (EBV, CMV) | IMMUNE | Viral DNA detected or load rising. Targeted infection assessment, medical review | L2 | Portable PCR device, saliva or blood | No open data |
| DNA and oxidative damage | VITAL | Radiation biological effect. Markers up. Medical review, evaluate exposure | L2 | Blood or urine collection and lab analysis, periodically | No open data |
| Lung function (FVC, FEV1) | VITAL | Respiratory dysfunction. Respiratory assessment | L2 | Portable spirometer, periodically | No open data |
| Vitamin D | BONE, NUTRI | Low vitamin D. Review intake and supplementation | L3 | Blood analyser, periodically | No open data |
| Immune cell subsets (CD4, CD8, NK) | IMMUNE | T-cell imbalance, reduced NK activity. Immune-function assessment | L3 | Compact flow cytometer, venous blood, periodically | No open data |
| Cognition (attention, memory, reaction time) | MIND | Cognitive decline. Rest, repeat the test | L3 | Computerised tests on the tablet, weekly | No open data. Needs only the tablet, so the app could collect it itself |
| Diet and hydration | NUTRI | Insufficient energy intake, dehydration risk. Dietary review, hydration assessment | L3 | Food and fluid tracker on the tablet, every meal | No open data. Needs only the tablet |
| Body mass and composition | NUTRI | Unintended body mass loss, loss of lean mass. Review energy intake and exercise | L3 | Space-compatible mass device and bioimpedance, weekly | No open data |
| Urinary calcium and stone risk | VITAL | Kidney stone risk. Hydration and renal risk assessment | L3 | Urine analyser, periodically | No open data |
| Balance and coordination | VITAL | Vestibular dysfunction. Sensorimotor assessment | L3 | Balance and eye-movement tests, periodically | No open data |
| Cortisol | IMMUNE, MIND | No alert of its own in ASTRA-HEALTH | L3 | Saliva kit and analyser, periodically | No open data |
| Microbiome | VITAL | Gastrointestinal disturbance. Assess diet, hydration and infection | L4 | Stool kit, analysed with a molecular platform | No open data |

## Cross-module alert we can show with real data

ASTRA-HEALTH defines 12 alerts that combine modules. One of them can be fired with the data we have, for the same person.

- **Sleep-related deterioration** (MIND, CARDIO, IMMUNE). Poor sleep, altered HRV and raised heart rate together.
- Columns, all in dataset 5 daily: `minutesAsleep` or `sleep_efficiency`, `rmssd`, `resting_hr`.
- Response in ASTRA-HEALTH: sleep recovery and keep monitoring the parameters.
- The inflammatory part of the alert stays out, because the blood data belongs to other people.

## Two level systems

- The four ASTRA-HEALTH levels say how serious an alert is. Once they are decided, they set the colour on the panel.
- The three levels in the System_design say who is told: only the astronaut, then the flight surgeon, then the crew.
- They don't compete. One is severity, the other is who gets the message.
- Neither is in the MVP. Alert levels are not decided (MVP architecture, section 1) and the `rule` table has no level, so the panel has two states: in range or out of range. Adding levels means a new column in `rule` and a new field in the contracts.

## Datasets

Five datasets from three sources. Four are NASA data.

| # | Dataset | Source | Whose data | Used for |
| :-- | :-- | :-- | :-- | :-- |
| 1 | Inspiration4 metabolic panel | NASA OSDR, OSD-575 | 4 astronauts | Glucose, electrolytes, kidney function, albumin, calcium |
| 2 | Inspiration4 blood count | NASA OSDR, OSD-569 | 4 astronauts | White cells, lymphocytes, haemoglobin |
| 3 | Inspiration4 cardiovascular and immune panels | NASA OSDR, OSD-575 | 4 astronauts | Inflammation markers, CRP, fibrinogen |
| 4 | RadLab | NASA OSDR | ISS dosimeters | Radiation dose |
| 5 | LifeSnaps | Zenodo | 71 volunteers on Earth | Daily life and long history |

### 1. Inspiration4 metabolic panel (OSD-575)

- SpaceX Inspiration4, September 2021, 3 days in orbit, 4 crew (C001 to C004).
- 7 blood draws per person. Before flight: L-92, L-44, L-3. After: R+1, R+45, R+82, R+194. No in-flight samples.
- 8 KB CSV, 28 rows. Each analyte comes with its value and its normal range, minimum and maximum.
- Download: https://nasa-osdr.s3.us-west-2.amazonaws.com/OSD-575/version-3/Comprehensive_Metabolic_Panel/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv
- Study page: https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
- For the demo: at R+45, three crew have glucose at 44, 36 and 43 mg/dL, below the 65 to 99 range in the file. The alert fires with the rule from the data itself.

### 2. Inspiration4 blood count (OSD-569)

- Same 4 crew and same 7 dates.
- 9 KB CSV, with normal ranges.
- Download: https://nasa-osdr.s3.us-west-2.amazonaws.com/OSD-569/version-4/Complete_Blood_Count/LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv
- Study page: https://osdr.nasa.gov/bio/repo/data/studies/OSD-569
- The rest of the study (sequencing) needs credentials. The blood count does not.

### 3. Inspiration4 cardiovascular and immune panels (OSD-575)

- Same 4 crew and same dates. Three files in the same folder.
- Cardiovascular panel, 6 KB, 9 markers including CRP and fibrinogen:
  https://nasa-osdr.s3.us-west-2.amazonaws.com/OSD-575/version-3/Multiplex/LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv
- Immune panel (Eve), 41 KB, 71 markers in pg/mL. IL-6 is `il_6_concentration_picogram_per_milliliter`. TNF-α is `tnfα_concentration_picogram_per_milliliter`:
  https://nasa-osdr.s3.us-west-2.amazonaws.com/OSD-575/version-3/Multiplex/LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv
- Immune panel (Alamar), 142 KB, 203 markers in normalised units (NPQ), 27 rows. IL-1β is `il1b_concentration_npq` and IFN-γ is `ifng_concentration_npq`:
  https://nasa-osdr.s3.us-west-2.amazonaws.com/OSD-575/version-3/Multiplex/LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv
- None of the three files has a normal range. Show the change against each person's pre-flight baseline, which is also how ASTRA-HEALTH defines these alerts.
- Use only the markers in the tables. The rest can't be explained in a short demo.

### 4. RadLab

- Readings from ISS dosimeters (DosTel1, DosTel2, Lidal, REM and others), by module.
- Fields: `timestamp`, `instrument`, `module`, `absorbed_dose_rate` in μGy/hour, `dose_equivalent_rate` in μSv/hour, `flux`, and the position of the station.
- Continuous series, with a reading every few seconds or minutes.
- API with no account. CSV, TSV or JSON.
- Working example (2 hours of 1 April 2022):
  https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&timestamp%3E=2022-04-01T00:00&timestamp%3C2022-04-01T02:00&absorbed_dose_rate&instrument&module&format=tsv
- Documentation: https://visualization.osdr.nasa.gov/radlab/gui/data-api
- Save a slice to a file before the hackathon so the demo does not depend on the API.

### 5. LifeSnaps

- 71 volunteers wearing a Fitbit Sense, April 2021 to January 2022.
- Files inside the zip:
  - `rais_anonymized/csv_rais_anonymized/daily_fitbit_sema_df_unprocessed.csv`, 2 MB, 7,410 rows, one per person and day.
  - `rais_anonymized/csv_rais_anonymized/hourly_fitbit_sema_df_unprocessed.csv`, 21 MB, 159,508 rows, one per person and hour. It has `bpm`, `steps`, `calories`, `temperature` and the mood at the hour it was logged.
  - `rais_anonymized/scored_surveys/stai.csv` (anxiety, 53 people, 279 entries) and `panas.csv` (positive and negative affect, 51 people, 268 entries).
- Licence CC BY 4.0.
- Download (615 MB zip): https://zenodo.org/records/7229547/files/rais_anonymized.zip
- Page: https://zenodo.org/records/7229547
- Some days are empty. In the daily file, resting heart rate is present on 59% of days, sleep on 47% and mood on 30%.
- Suggested crew, the four people with the most complete days (heart rate, sleep, mood, temperature and HRV on the same day):

| `id` | Complete days | Total days |
| :-- | :-- | :-- |
| `621e2f9167b776a240011ccb` | 63 | 187 |
| `621e2fce67b776a240279baa` | 61 | 64 |
| `621e366567b776a24076a727` | 60 | 71 |
| `621e337667b776a240ce78ab` | 59 | 114 |

- The first one has 78 days with heart rate in at least 22 of the 24 hours, 57 of them with a mood entry. That is the candidate for the day-in-the-life view.
- Limit: hourly heart rate is an average, not beat by beat.

## How to cite them in the app and in the submission

- **OSD-575.** NASA Open Science Data Repository, "SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays", OSD-575, released 14 May 2024. https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
- **OSD-569.** NASA Open Science Data Repository, "Whole Blood Measurements from the SpaceX Inspiration4 Mission", OSD-569, released 14 May 2024. https://osdr.nasa.gov/bio/repo/data/studies/OSD-569
- **Inspiration4 data access paper.** "Inspiration4 data access through the NASA Open Science Data Repository", npj Microgravity, 2024. https://www.nature.com/articles/s41526-024-00393-5
- **RadLab.** NASA Open Science Data Repository, RadLab portal and data API. https://visualization.osdr.nasa.gov/radlab/ . The documentation gives no official citation.
- **LifeSnaps.** Yfantidou et al., "LifeSnaps, a 4-month multi-modal dataset capturing unobtrusive snapshots of our lives in the wild", Scientific Data, 2022. https://doi.org/10.1038/s41597-022-01764-x . Data at https://doi.org/10.5281/zenodo.7229547 , licence CC BY 4.0.

## What to say in the pitch

- The blood tests are from real astronauts and the radiation is measured on the ISS. Both come from NASA.
- Daily life comes from volunteers on Earth, because astronaut vital signs are not public. NASA releases them on request.
- The blood tests are from before and after the flight, not during it.
- The parameters in Table 3 are the next ones to monitor. They are defined, with their alerts, and waiting for data.
- We found no open human data for the most severe effects (bone, muscle, eyesight). The panel tracks exercise, the main countermeasure, and their alerts are ready for when data exists.

## Not checked

- How blood tests are run on board. CSA has a device called Bio-Analyzer that we have not looked at.
- The priority level of each alert, which is a proposal.

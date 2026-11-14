// The readings the infection model looks at together, proposed by the team's medical reviewer.
// `simulatedChange` is the invented part of the demo: how far the reading of the alert is from the
// crew member's own usual value, in the unit of the indicator. The usual value is real.
export const INFECTION_SIGNALS = [
  { id: 'skin_temperature', label: 'Body temperature', simulatedChange: 1.3 },
  { id: 'breathing_rate', label: 'Breathing rate', simulatedChange: 5 },
  { id: 'heart_rate_variability', label: 'Heart rate variability', simulatedChange: -18 },
  { id: 'spo2', label: 'Blood oxygen', simulatedChange: -3 },
  { id: 'sleep_efficiency', label: 'Sleep quality', simulatedChange: -14 },
  { id: 'crp', label: 'C-reactive protein', simulatedChange: 40 },
  { id: 'lymphocytes', label: 'Lymphocytes', simulatedChange: -1150 },
] as const

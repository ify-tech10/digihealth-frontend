/* Shared by providers (writing reports) and supervisors (reviewing them). */

export const ACTIVITIES = [
  ['VITALS_CHECK', 'Vital signs checked'],
  ['MEDICATION', 'Medication administered'],
  ['WOUND_CARE', 'Wound dressing / care'],
  ['MOBILITY', 'Mobility / physio exercises'],
  ['HYGIENE', 'Personal hygiene support'],
  ['FEEDING', 'Feeding assistance'],
  ['SAMPLE_COLLECTION', 'Sample collection'],
  ['NEWBORN_CARE', 'Newborn care'],
  ['EDUCATION', 'Patient / family education'],
];
export const ACTIVITY_LABEL = Object.fromEntries(ACTIVITIES);

/* [value, label, badge variant] */
export const CONDITIONS = [
  ['IMPROVING', 'Improving', 'active'],
  ['STABLE', 'Stable', 'new'],
  ['DETERIORATING', 'Deteriorating', 'urgent'],
];
export const CONDITION_VARIANT = Object.fromEntries(CONDITIONS.map(([v, , b]) => [v, b]));

/* [field, label, placeholder, unit] */
export const VITALS = [
  ['bloodPressure', 'Blood pressure', 'e.g. 120/80', 'mmHg'],
  ['pulse', 'Pulse', 'bpm', 'bpm'],
  ['temperature', 'Temperature', '°C', '°C'],
  ['spo2', 'SpO₂', '%', '%'],
  ['bloodSugar', 'Blood sugar', 'mmol/L', 'mmol/L'],
  ['respiratoryRate', 'Respiratory rate', 'breaths/min', '/min'],
];

export function activitiesOf(r) {
  const a = r?.activities ?? r?.activitiesDone;
  if (Array.isArray(a)) return a;
  if (typeof a === 'string') return a.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
}

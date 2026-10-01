/*
 * Roles an admin can create, grouped for the role picker.
 * Values come from the role names the backend already returns at login
 * (see config/roles.js). Rename here if the Spring enum differs.
 */
export const USER_ROLE_GROUPS = [
  {
    group: 'Administration',
    roles: [
      ['ADMIN', 'Admin'],
      ['FINANCE_MANAGER', 'Finance Manager'],
      ['CUSTOMER_CARE', 'Customer Care Specialist'],
      ['RELATIONSHIP_MANAGER', 'Relationship Manager'],
    ],
  },
  {
    group: 'Clinical leadership',
    roles: [
      ['CNO_MEDICAL_DIRECTOR', 'Medical Director'],
      ['CNO', 'Chief Nursing Officer'],
      ['CHIEF_MEDICAL_OFFICER', 'Chief Medical Officer'],
      ['HEAD_OF_CLINICAL_OPERATIONS', 'Head of Clinical Operations'],
      ['NURSING_SUPERVISOR', 'Nursing Supervisor'],
    ],
  },
  {
    group: 'Care providers (doctors, nurses, caregivers)',
    roles: [
      ['SERVICE_PROVIDER', 'Service Provider'],
      ['CLINICAL_PERSONNEL', 'Clinical Personnel'],
      ['LAB_SCIENTIST', 'Lab Scientist'],
      ['PHARMACIST', 'Pharmacist'],
    ],
  },
  {
    group: 'Partner facilities',
    roles: [
      ['HOSPITAL_ADMIN', 'Hospital Admin'],
      ['PHARMACY_ADMIN', 'Pharmacy Admin'],
      ['LAB_ADMIN', 'Laboratory Admin'],
    ],
  },
  {
    group: 'Customers',
    roles: [
      ['PATIENT', 'Patient'],
      ['HMO', 'HMO Organisation Admin'],
    ],
  },
];

const LABELS = Object.fromEntries(USER_ROLE_GROUPS.flatMap((g) => g.roles));

export function roleLabel(role) {
  if (!role) return '—';
  return LABELS[String(role).toUpperCase()] || String(role);
}

/* Roles that need a provider type (doctor / nurse / caregiver…). */
export const PROVIDER_ROLES = ['SERVICE_PROVIDER', 'CLINICAL_PERSONNEL'];

export const PROVIDER_TYPES = [
  ['DOCTOR', 'Doctor'],
  ['REGISTERED_NURSE', 'Registered Nurse'],
  ['COMMUNITY_HEALTH_NURSE', 'Community Health Nurse'],
  ['CAREGIVER', 'Caregiver'],
  ['PHYSIOTHERAPIST', 'Physiotherapist'],
  ['POSTNATAL_CARE_SPECIALIST', 'Postnatal Care Specialist'],
  ['ELDERLY_CARE_ASSISTANT', 'Elderly Care Assistant'],
  ['HOME_HEALTH_AIDE', 'Home Health Aide'],
];

/* HMO patients vs standard (invoiced per request). */
export const PATIENT_TYPES = [
  ['STANDARD', 'Standard — invoiced per request'],
  ['HMO', 'HMO — covered by a plan'],
];

/* Services an HMO plan can cover. */
export const COVERED_SERVICES = [
  ['POST_DISCHARGE_RECOVERY', 'Post-Discharge Recovery'],
  ['CHRONIC_DISEASE_MANAGEMENT', 'Chronic Disease Management'],
  ['POSTNATAL_NEWBORN_CARE', 'Postnatal & Newborn Care'],
  ['ELDERLY_CARE', 'Elderly Care'],
  ['PHYSIOTHERAPY', 'Physiotherapy & Rehabilitation'],
  ['LAB_DIAGNOSTICS', 'Lab & Diagnostic Services'],
  ['PHARMACY', 'Pharmacy & Drug Delivery'],
  ['TELEMEDICINE', 'Telemedicine'],
  ['HOSPITAL_REFERRAL', 'Hospital Referral'],
];

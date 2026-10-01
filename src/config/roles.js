/*
 * Where each backend role lands after login.
 * Shared by Login and ProtectedRoute so the two never drift apart.
 */
export const ROLE_HOME = {
  ADMIN: '/admin',
  SUPER_ADMIN: '/admin', // same portal as ADMIN
  SERVICE_PROVIDER: '/caregiver',
  CLINICAL_PERSONNEL: '/caregiver',
  PATIENT: '/patient',
  HMO: '/hmo-dashboard',
  RELATIONSHIP_MANAGER: '/relationship',
  LAB_SCIENTIST: '/lab',
  PHARMACIST: '/lab',
  CNO_MEDICAL_DIRECTOR: '/cno',
  CNO: '/cno',
  CHIEF_MEDICAL_OFFICER: '/cno',
  HEAD_OF_CLINICAL_OPERATIONS: '/cno',
  NURSING_SUPERVISOR: '/cno',
  CUSTOMER_CARE: '/ccs',
  FINANCE_MANAGER: '/finance',
  HOSPITAL_ADMIN: '/hospital',
  PHARMACY_ADMIN: '/pharmacy',
  LAB_ADMIN: '/laboratory',
};

export function homeFor(role) {
  return ROLE_HOME[String(role || '').toUpperCase()] || null;
}

import { apiFetch } from './apiFetch';

/*
 * Endpoints for an HMO organisation admin (role HMO) — the company whose
 * employees are covered by a DiGi Health HMO plan.
 *
 * The HTML reference had no endpoint contract, so every path here is a
 * GUESS — correct the path/shape HERE and the pages follow.
 */
export const hmoApi = {
  /* ── Dashboard: { registered, totalEmployees, pending, newUploads } ── */
  summary: () => apiFetch('/hmo/me/summary'),

  /* ── The organisation's subscription:
   * { organisationName, planName, planId, benefitLimit, benefitUsed, memberCount, memberLimit,
   *   startDate, expiryDate, status, coveredServices } ── */
  subscription: () => apiFetch('/hmo/me/subscription'),

  /* ── Employees (each becomes an HMO patient once registered) ── */
  employees: (status) => apiFetch('/hmo/me/employees', { params: { status } }),
  addEmployee: (body) => apiFetch('/hmo/me/employees', { method: 'POST', body }),
  /* re-send the email asking the employee to finish registration (next of kin + consent) */
  resendInvite: (id) => apiFetch(`/hmo/me/employees/${id}/invite`, { method: 'POST' }),
  deactivateEmployee: (id, reason) =>
    apiFetch(`/hmo/me/employees/${id}/deactivate`, { method: 'PUT', body: { reason } }),

  /* ── Bulk upload: FormData { file } → { created, updated, skipped, errors: [{ row, message }] } ── */
  uploadEmployees: (formData) => apiFetch('/hmo/me/employees/upload', { method: 'POST', body: formData }),
  uploads: () => apiFetch('/hmo/me/uploads'),

  /* ── Utilisation for a year:
   * { monthly: [{ month, requests, amount }], byService: [{ service, amount }],
   *   byEmployee: [{ employeeId, name, department, requests, amount }] } ── */
  utilisation: (year) => apiFetch('/hmo/me/utilisation', { params: { year } }),

  /* ── Plans on offer, and asking DiGi to move the organisation to another one ── */
  plans: () => apiFetch('/hmo/plans'),
  requestPlanChange: (planId, note) =>
    apiFetch('/hmo/me/plan-change', { method: 'POST', body: { planId, note } }),
};

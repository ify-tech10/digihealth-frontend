import { apiFetch } from './apiFetch';

/*
 * Endpoints for the clinical supervisors (Chief Nursing Officer, Medical
 * Director and other clinical-leadership roles).
 *
 *   REFERENCE -> already used by the HTML CNO dashboard
 *   GUESS     -> inferred; correct the path/shape HERE
 *
 * Provider applications, care requests, assignment and closure approval
 * reuse the admin endpoints (adminApi), exactly like the reference page did.
 * The backend must allow these supervisor roles on those routes.
 */
export const cnoApi = {
  /* ── Dashboard (REFERENCE) ── */
  stats: () => apiFetch('/cno/dashboard/stats'),
  activity: (limit = 6) => apiFetch('/cno/activity', { params: { limit } }),
  team: () => apiFetch('/caregivers', { params: { status: 'APPROVED' } }),

  /* ── Daily visit counts for the chart: [{ date, scheduled, completed }] (GUESS) ── */
  dailyVisits: (from, to) => apiFetch('/cno/visits/daily', { params: { from, to } }),

  /* ── Supervisors can create providers directly (GUESS) ── */
  createProvider: (body) => apiFetch('/cno/providers', { method: 'POST', body }),

  /* ── Review providers' visit reports (GUESS) ── */
  visitReports: (params) => apiFetch('/cno/visit-reports', { params }),
  approveVisitReport: (id, note) =>
    apiFetch(`/cno/visit-reports/${id}/approve`, { method: 'PUT', body: { note } }),
  returnVisitReport: (id, reason) =>
    apiFetch(`/cno/visit-reports/${id}/return`, { method: 'PUT', body: { reason } }),

  /* ── Team performance for a month, month = YYYY-MM (GUESS) ── */
  performance: (month) => apiFetch('/cno/performance', { params: { month } }),

  /* ── Visits in a date range, for exports (GUESS) ── */
  visits: (from, to) => apiFetch('/cno/visits', { params: { from, to } }),

  /* ── Financial requests raised by this supervisor → admin approves (GUESS) ── */
  financialRequests: () => apiFetch('/cno/financial-requests'),
  createFinancialRequest: (formData) =>
    apiFetch('/cno/financial-requests', { method: 'POST', body: formData }),
};

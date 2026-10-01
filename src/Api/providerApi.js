import { apiFetch } from './apiFetch';

/*
 * Endpoints for doctors, nurses and caregivers (the signed-in provider).
 *
 *   REFERENCE -> already used by the HTML provider dashboard
 *   GUESS     -> inferred from naming; correct the path/shape HERE
 */
export const providerApi = {
  /* ── Dashboard (REFERENCE) ── */
  dashboard: () => apiFetch('/caregivers/me/dashboard'),
  scheduleToday: () => apiFetch('/caregivers/me/schedule/today'),
  availabilityStatus: () => apiFetch('/caregivers/me/availability/status'),
  setAvailabilityStatus: (isAvailable) =>
    apiFetch('/caregivers/me/availability/status', { method: 'PUT', body: { isAvailable } }),
  earningsSummary: () => apiFetch('/caregivers/me/earnings/summary'),
  patients: () => apiFetch('/caregivers/me/patients'),

  /* ── Assigned requests: close → supervisor approves (GUESS) ── */
  closeRequest: (requestId, closureNote) =>
    apiFetch(`/caregivers/me/requests/${requestId}/close`, { method: 'PUT', body: { closureNote } }),

  /* ── Visits: from/to = YYYY-MM-DD (GUESS) ── */
  visits: (from, to) => apiFetch('/caregivers/me/visits', { params: { from, to } }),
  scheduleVisit: (body) => apiFetch('/caregivers/me/visits', { method: 'POST', body }),
  updateVisitStatus: (id, status) =>
    apiFetch(`/caregivers/me/visits/${id}/status`, { method: 'PUT', body: { status } }),

  /* ── Monthly availability calendar, month = YYYY-MM (GUESS) ── */
  availabilityMonth: (month) => apiFetch('/caregivers/me/availability', { params: { month } }),
  saveAvailability: (body) => apiFetch('/caregivers/me/availability', { method: 'PUT', body }),

  /* ── Visit reports / activity documentation (GUESS) ── */
  visitReports: () => apiFetch('/caregivers/me/visit-reports'),
  createVisitReport: (body) => apiFetch('/caregivers/me/visit-reports', { method: 'POST', body }),

  /* ── Profile incl. bank account, BVN, NIN (GUESS) ── */
  profile: () => apiFetch('/caregivers/me/profile'),
  updateProfile: (body) => apiFetch('/caregivers/me/profile', { method: 'PUT', body }),

  /* ── Earning structure + payout history (GUESS) ── */
  earningStructure: () => apiFetch('/caregivers/me/earnings/structure'),
  setEarningStructure: (body) =>
    apiFetch('/caregivers/me/earnings/structure', { method: 'PUT', body }),
  payouts: () => apiFetch('/caregivers/me/earnings'),
};

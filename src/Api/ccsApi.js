import { apiFetch } from './apiFetch';

/*
 * Endpoints for Customer Care Specialists (role CUSTOMER_CARE).
 *
 *   REFERENCE -> from the endpoint contract in the HTML CCS dashboard
 *   CONFIRMED -> already live on the backend
 *   GUESS     -> inferred; correct the path/shape HERE
 *
 * Ticket shape the pages read (other common names are tolerated too):
 *   { id, name, subject, preview, type, status, unread, createdAt, updatedAt,
 *     messages: [{ from: 'agent' | 'patient', name, text, createdAt }],
 *     patient:  { id, name, phone, email, plan, nurse, status } }
 */
export const ccsApi = {
  /* ── Dashboard + tickets (REFERENCE) ── */
  stats: () => apiFetch('/customer-care/me/stats'),
  tickets: () => apiFetch('/customer-care/me/tickets'),
  ticket: (id) => apiFetch(`/customer-care/me/tickets/${id}`),
  reply: (id, message) =>
    apiFetch(`/customer-care/me/tickets/${id}/reply`, { method: 'POST', body: { message } }),
  resolve: (id, note) =>
    apiFetch(`/customer-care/me/tickets/${id}/resolve`, { method: 'PATCH', body: note ? { note } : undefined }),
  /* the reference sent no body — escalateTo is one of ESCALATION_TEAMS below */
  escalate: (id, escalateTo, note) =>
    apiFetch(`/customer-care/me/tickets/${id}/escalate`, { method: 'PATCH', body: { escalateTo, note } }),
  activity: (limit = 6) => apiFetch('/customer-care/me/activity', { params: { limit } }),
  patient: (id) => apiFetch(`/patients/${id}`),

  /* ── Tickets logged from a call / WhatsApp / walk-in (GUESS) ── */
  createTicket: (body) => apiFetch('/customer-care/me/tickets', { method: 'POST', body }),
  reopen: (id) => apiFetch(`/customer-care/me/tickets/${id}/reopen`, { method: 'PATCH' }),

  /* ── Online / Away (GUESS): { status: 'ONLINE' | 'AWAY' } ── */
  myStatus: () => apiFetch('/customer-care/me/status'),
  setStatus: (status) => apiFetch('/customer-care/me/status', { method: 'PUT', body: { status } }),

  /* ── Patient lookup by name, phone, email or patient ID (GUESS) ── */
  searchPatients: (q) => apiFetch('/customer-care/patients', { params: { q } }),

  /* ── Care requests (list is a GUESS; creating one uses the public CONFIRMED endpoint) ── */
  careRequests: (status) => apiFetch('/customer-care/care-requests', { params: { status } }),
  logCareRequest: (body) => apiFetch('/care-requests', { method: 'POST', body }),

  /* ── My performance for a month, month = YYYY-MM (GUESS) ──
   * { ticketsHandled, resolved, escalated, avgFirstResponse, avgResolutionTime, csat,
   *   daily: [{ date, received, resolved }], byType: [{ type, count }],
   *   feedback: [{ patientName, rating, comment, createdAt }] } */
  performance: (month) => apiFetch('/customer-care/me/performance', { params: { month } }),
};

/* Who a ticket can be escalated to. */
export const ESCALATION_TEAMS = [
  ['CNO', 'Clinical team (CNO / Medical Director)'],
  ['FINANCE', 'Finance'],
  ['RELATIONSHIP_MANAGER', 'Relationship Manager (HMO)'],
  ['ADMIN', 'Admin'],
];

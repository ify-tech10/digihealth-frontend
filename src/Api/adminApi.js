import { apiFetch } from './apiFetch';

/*
 * Every Admin endpoint in one place.
 *
 *   CONFIRMED -> taken from the working HTML admin dashboard
 *   GUESS     -> inferred from naming; check against the Spring controllers
 *                and correct the path/shape HERE (pages won't need to change)
 */
export const adminApi = {
  /* ── Care requests (CONFIRMED) ── */
  careRequests: (status) =>
    apiFetch('/admin/care-requests', { params: { status } }),

  assignCareRequest: (id, providerId, adminNote) =>
    apiFetch(`/admin/care-requests/${id}/assign`, {
      method: 'PUT',
      body: { providerId: Number(providerId), adminNote },
    }),

  availableProviders: (careRequestId, location) =>
    apiFetch('/admin/providers/available', { params: { careRequestId, location } }),

  /* ── Service providers / personnel (CONFIRMED list + approve) ── */
  providers: (status) =>
    apiFetch('/admin/providers', { params: { status } }),

  approveProvider: (id) =>
    apiFetch(`/admin/providers/${id}/approve`, { method: 'PUT' }),

  // GUESS
  rejectProvider: (id, reason) =>
    apiFetch(`/admin/providers/${id}/reject`, { method: 'PUT', body: { reason } }),

  /* ── Patients (GUESS) ── */
  patients: () => apiFetch('/admin/patients'),

  /* ── Schedule / visits for one day, date = YYYY-MM-DD (GUESS) ── */
  visits: (date) => apiFetch('/admin/visits', { params: { date } }),

  /* ── HMO company applications (GUESS) ── */
  hmoApplications: (status) => apiFetch('/admin/hmo', { params: { status } }),
  approveHmo: (id) => apiFetch(`/admin/hmo/${id}/approve`, { method: 'PUT' }),
  rejectHmo: (id, reason) =>
    apiFetch(`/admin/hmo/${id}/reject`, { method: 'PUT', body: { reason } }),

  /* ── Facilities: kind = hospitals | pharmacies | laboratories (GUESS) ── */
  facilities: (kind) => apiFetch(`/admin/${kind}`),
  createFacility: (kind, body) => apiFetch(`/admin/${kind}`, { method: 'POST', body }),
  updateFacility: (kind, id, body) => apiFetch(`/admin/${kind}/${id}`, { method: 'PUT', body }),
  deleteFacility: (kind, id) => apiFetch(`/admin/${kind}/${id}`, { method: 'DELETE' }),

  /* ── Payments (GUESS) ── */
  payments: () => apiFetch('/admin/payments'),

  /* ── Care request closure: provider closes, supervisor/admin approves (GUESS) ── */
  approveClosure: (id, note) =>
    apiFetch(`/admin/care-requests/${id}/approve-closure`, { method: 'PUT', body: { note } }),
  rejectClosure: (id, reason) =>
    apiFetch(`/admin/care-requests/${id}/reject-closure`, { method: 'PUT', body: { reason } }),

  /* ── Users: admin creates every other user (GUESS) ── */
  users: (role) => apiFetch('/admin/users', { params: { role } }),
  createUser: (body) => apiFetch('/admin/users', { method: 'POST', body }),
  activateUser: (id) => apiFetch(`/admin/users/${id}/activate`, { method: 'PUT' }),
  deactivateUser: (id) => apiFetch(`/admin/users/${id}/deactivate`, { method: 'PUT' }),

  /* ── HMO plans — every plan has a benefit limit (GUESS) ── */
  hmoPlans: () => apiFetch('/admin/hmo/plans'),
  createHmoPlan: (body) => apiFetch('/admin/hmo/plans', { method: 'POST', body }),
  updateHmoPlan: (id, body) => apiFetch(`/admin/hmo/plans/${id}`, { method: 'PUT', body }),

  /* ── HMO subscriptions — expire yearly, renew on payment (GUESS) ── */
  hmoSubscriptions: (status) => apiFetch('/admin/hmo/subscriptions', { params: { status } }),
  createHmoSubscription: (body) => apiFetch('/admin/hmo/subscriptions', { method: 'POST', body }),
  renewHmoSubscription: (id, body) =>
    apiFetch(`/admin/hmo/subscriptions/${id}/renew`, { method: 'PUT', body }),

  /* ── Financial requests from MD / CNO / finance manager (GUESS) ── */
  financialRequests: (status) => apiFetch('/admin/financial-requests', { params: { status } }),
  approveFinancialRequest: (id, note) =>
    apiFetch(`/admin/financial-requests/${id}/approve`, { method: 'PUT', body: { note } }),
  rejectFinancialRequest: (id, reason) =>
    apiFetch(`/admin/financial-requests/${id}/reject`, { method: 'PUT', body: { reason } }),

  /* ── Invoices raised by hospitals / pharmacies / labs (GUESS) ── */
  invoices: (status) => apiFetch('/admin/invoices', { params: { status } }),
  approveInvoice: (id, note) =>
    apiFetch(`/admin/invoices/${id}/approve`, { method: 'PUT', body: { note } }),
  rejectInvoice: (id, reason) =>
    apiFetch(`/admin/invoices/${id}/reject`, { method: 'PUT', body: { reason } }),

  /* ── Activity log across all users (GUESS) ── */
  activity: (params) => apiFetch('/admin/activity', { params }),

  /* ── Account (GUESS) ── */
  changePassword: (currentPassword, newPassword) =>
    apiFetch('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),
};

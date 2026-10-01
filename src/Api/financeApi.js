import { apiFetch } from './apiFetch';

/*
 * Endpoints for the Finance Manager (role FINANCE_MANAGER).
 *
 * The HTML reference had no endpoint contract, so every path here is a
 * GUESS — correct the path/shape HERE and the pages follow.
 *
 * Money is plain naira numbers (no kobo). Dates are ISO strings;
 * month = YYYY-MM, year = YYYY.
 */
export const financeApi = {
  /* ── Dashboard ──
   * { revenue, outstanding, outstandingCount, expenses, netProfit, hmoPending, hmoPendingCount,
   *   expenseClaimsPending, expenseClaimsCount, payroll, payrollStaff, paymentsReceived,
   *   budgetUsed } for the given month */
  summary: (month) => apiFetch('/finance/summary', { params: { month } }),
  /* [{ month: 'YYYY-MM', revenue, expenses }] */
  monthly: (year) => apiFetch('/finance/monthly', { params: { year } }),
  /* [{ service, amount }] */
  revenueByService: (month) => apiFetch('/finance/revenue-by-service', { params: { month } }),
  activity: (limit = 6) => apiFetch('/finance/activity', { params: { limit } }),

  /* ── Invoices — standard patients get one per care request; corporate clients too ── */
  invoices: (status) => apiFetch('/finance/invoices', { params: { status } }),
  createInvoice: (body) => apiFetch('/finance/invoices', { method: 'POST', body }),
  sendReminder: (id) => apiFetch(`/finance/invoices/${id}/remind`, { method: 'POST' }),
  cancelInvoice: (id, reason) => apiFetch(`/finance/invoices/${id}/cancel`, { method: 'PUT', body: { reason } }),

  /* ── Payments — recording one against an invoice marks it paid / part-paid ── */
  payments: (params) => apiFetch('/finance/payments', { params }),
  recordPayment: (body) => apiFetch('/finance/payments', { method: 'POST', body }),

  /* ── HMO claims to insurers ── */
  hmoClaims: (status) => apiFetch('/finance/hmo-claims', { params: { status } }),
  createHmoClaim: (body) => apiFetch('/finance/hmo-claims', { method: 'POST', body }),
  followUpHmoClaim: (id, note) => apiFetch(`/finance/hmo-claims/${id}/follow-up`, { method: 'POST', body: { note } }),
  markHmoClaimPaid: (id, body) => apiFetch(`/finance/hmo-claims/${id}/paid`, { method: 'PUT', body }),

  /* ── Staff expense claims ── */
  expenseClaims: (status) => apiFetch('/finance/expense-claims', { params: { status } }),
  approveExpense: (id, note) => apiFetch(`/finance/expense-claims/${id}/approve`, { method: 'PUT', body: { note } }),
  rejectExpense: (id, reason) => apiFetch(`/finance/expense-claims/${id}/reject`, { method: 'PUT', body: { reason } }),

  /* ── Bills from hospitals / pharmacies / labs, once the admin has approved them ── */
  facilityBills: (status) => apiFetch('/finance/facility-invoices', { params: { status } }),
  payFacilityBill: (id, body) => apiFetch(`/finance/facility-invoices/${id}/pay`, { method: 'PUT', body }),

  /* ── Payroll: salaried staff + providers paid by their earning structure ── */
  payroll: (month) => apiFetch('/finance/payroll', { params: { month } }),
  processPayroll: (month) => apiFetch('/finance/payroll/process', { method: 'POST', body: { month } }),
  markPayslipPaid: (id, reference) => apiFetch(`/finance/payroll/${id}/paid`, { method: 'PUT', body: { reference } }),

  /* ── Budget: [{ category, budgeted, actual }] for a month ── */
  budget: (month) => apiFetch('/finance/budget', { params: { month } }),
  setBudget: (month, lines) => apiFetch('/finance/budget', { method: 'PUT', body: { month, lines } }),

  /* ── Reports: rows for the chosen report + range, turned into CSV in the browser ──
   * { columns: [{ key, label }], rows: [...] } */
  report: (type, from, to) => apiFetch('/finance/reports', { params: { type, from, to } }),

  /* ── Finance Manager raises fund requests → admin approves ── */
  financialRequests: () => apiFetch('/finance/financial-requests'),
  createFinancialRequest: (formData) => apiFetch('/finance/financial-requests', { method: 'POST', body: formData }),
};

import { apiFetch } from './apiFetch';

/*
 * Endpoints for the signed-in patient (or the family member managing their care).
 * Everything is scoped to "me" — the backend works out the patient from the token.
 *
 * Paths are a proposal for the new backend — rename freely.
 *
 * Booking: { id, reference, status: REQUESTED | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED,
 *   serviceType, date, timeSlot, address, notes, caregiver: { name, role, phone, photoUrl },
 *   createdAt, confirmedAt, cancelReason }
 * Visit: { id, bookingId, serviceType, scheduledAt, checkInAt, checkOutAt, status,
 *   caregiver: { name, role }, vitals: { bloodPressure, pulse, temperature, spo2, bloodSugar, weight },
 *   summary, nextSteps, reportUrl, rating }
 * Care plan: { programName, serviceType, startDate, endDate, frequency, visitsPlanned, visitsCompleted,
 *   goals: [], coordinator: { name, phone } }
 */
export const patientApi = {
  carePlan: () => apiFetch('/patient/me/care-plan'),

  bookings: () => apiFetch('/patient/me/bookings'),
  /* { serviceType, date, timeSlot, address, notes, forSomeoneElse, careRecipient } */
  book: (body) => apiFetch('/patient/me/bookings', { method: 'POST', body }),
  reschedule: (id, body) => apiFetch(`/patient/me/bookings/${id}/reschedule`, { method: 'PUT', body }),
  cancel: (id, reason) => apiFetch(`/patient/me/bookings/${id}/cancel`, { method: 'PUT', body: { reason } }),

  visits: () => apiFetch('/patient/me/visits'),
  /* { rating 1–5, comment } */
  rateVisit: (id, body) => apiFetch(`/patient/me/visits/${id}/feedback`, { method: 'POST', body }),

  labResults: () => apiFetch('/patient/me/lab-results'),
  medications: () => apiFetch('/patient/me/medications'),
  /* Visit reports, lab reports, discharge summaries, prescriptions, care plans, receipts */
  documents: () => apiFetch('/patient/me/documents'),

  invoices: () => apiFetch('/patient/me/invoices'),
  /* Starts a card/transfer payment — returns { authorizationUrl } (e.g. Paystack) to redirect to */
  pay: (id) => apiFetch(`/patient/me/invoices/${id}/pay`, { method: 'POST' }),
  payments: () => apiFetch('/patient/me/payments'),

  tickets: () => apiFetch('/patient/me/tickets'),
  ticket: (id) => apiFetch(`/patient/me/tickets/${id}`),
  /* { category, subject, message } — lands in the Customer Care inbox */
  createTicket: (body) => apiFetch('/patient/me/tickets', { method: 'POST', body }),
  reply: (id, message) => apiFetch(`/patient/me/tickets/${id}/reply`, { method: 'POST', body: { message } }),

  profile: () => apiFetch('/patient/me/profile'),
  updateProfile: (body) => apiFetch('/patient/me/profile', { method: 'PUT', body }),
};

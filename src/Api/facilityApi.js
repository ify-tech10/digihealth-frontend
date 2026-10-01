import { apiFetch } from './apiFetch';

/*
 * Endpoints for partner facility admins — hospitals, pharmacies and lab
 * centres that DiGi Health sends patients / drug orders / test requests to. The backend works out which
 * facility from the signed-in user, so the paths are the same for all three.
 *
 * Paths are a proposal for the new backend — rename freely.
 *
 * Hospital requests are referrals:
 *   { id, reference, status, urgency, createdAt, patient: { name, age, gender, phone, address, nextOfKin },
 *     reason, diagnosis, priorCareSummary, vitals, medications, allergies, referredByName, documents,
 *     expectedArrival, ward, admittedAt, dischargedAt, dischargeSummary }
 * Pharmacy requests are drug orders:
 *   { id, reference, status, urgency, createdAt, patient: { name, phone, address },
 *     items: [{ id, name, strength, quantity, instructions, unitPrice }], prescribedByName,
 *     dispatchAt, deliveredAt, receivedBy }
 * Lab requests are test requests:
 *   { id, reference, status, urgency, createdAt, patient: { name, age, gender, phone, address },
 *     tests: [{ id, name, code, sampleType, fasting, price, result }], collectionType: HOME | WALK_IN,
 *     clinicalNotes, requestedByName, scheduledAt, collectedAt, collectedBy, sampleId,
 *     resultedAt, critical, documents }
 */
export const facilityApi = {
  summary: () => apiFetch('/facility/me/summary'),

  requests: (status) => apiFetch('/facility/me/requests', { params: { status } }),
  request: (id) => apiFetch(`/facility/me/requests/${id}`),
  /* hospital: { expectedArrival, ward, note }
   * pharmacy: { dispatchAt, items: [{ id, unitPrice, available }], note }
   * lab:      { collectionType, scheduledAt, turnaroundHours, tests: [{ id, price, available }], note } */
  accept: (id, body) => apiFetch(`/facility/me/requests/${id}/accept`, { method: 'PUT', body }),
  decline: (id, reason) => apiFetch(`/facility/me/requests/${id}/decline`, { method: 'PUT', body: { reason } }),
  /* hospital: patient arrived and admitted { ward, admittedAt } */
  admit: (id, body) => apiFetch(`/facility/me/requests/${id}/admit`, { method: 'PUT', body }),
  /* hospital: FormData { summary, outcome, followUp, file } */
  discharge: (id, formData) => apiFetch(`/facility/me/requests/${id}/discharge`, { method: 'PUT', body: formData }),
  /* pharmacy: rider has left */
  dispatch: (id, body) => apiFetch(`/facility/me/requests/${id}/dispatch`, { method: 'PUT', body }),
  /* pharmacy: FormData { receivedBy, deliveredAt, note, proof } */
  deliver: (id, formData) => apiFetch(`/facility/me/requests/${id}/deliver`, { method: 'PUT', body: formData }),

  /* lab: sample taken { sampleId, collectedBy, collectedAt, note } */
  collect: (id, body) => apiFetch(`/facility/me/requests/${id}/collect`, { method: 'PUT', body }),
  /* lab: FormData { results: JSON [{ testId, value, unit, referenceRange, flag }], comment, critical, report } */
  submitResults: (id, formData) => apiFetch(`/facility/me/requests/${id}/results`, { method: 'PUT', body: formData }),

  /* lab: the tests this centre offers, with prices DiGi sees when ordering */
  tests: () => apiFetch('/facility/me/tests'),
  createTest: (body) => apiFetch('/facility/me/tests', { method: 'POST', body }),
  updateTest: (id, body) => apiFetch(`/facility/me/tests/${id}`, { method: 'PUT', body }),
  deleteTest: (id) => apiFetch(`/facility/me/tests/${id}`, { method: 'DELETE' }),

  /* Invoices to DiGi Health — admin approves, finance pays */
  invoices: () => apiFetch('/facility/me/invoices'),
  /* FormData { requestId?, items: JSON [{ description, quantity, unitPrice }], notes, attachment } */
  createInvoice: (formData) => apiFetch('/facility/me/invoices', { method: 'POST', body: formData }),

  profile: () => apiFetch('/facility/me/profile'),
  updateProfile: (body) => apiFetch('/facility/me/profile', { method: 'PUT', body }),
};

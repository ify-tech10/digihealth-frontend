import { apiFetch } from './apiFetch';

/*
 * Endpoints for Lab Scientists and Pharmacists. Both receive service requests
 * straight from the senior medical team (CNO / Medical Director), fulfil them at
 * the patient's home, and price every item for inventory. Requests are never
 * deleted — a request that can't be fulfilled is declined back to the team.
 *
 *   labApi('LAB')      -> /lab/me/...
 *   labApi('PHARMACY') -> /pharmacy/me/...
 *
 * No reference contract existed, so every path here is a GUESS — correct the
 * path/shape HERE and the pages follow.
 *
 * Request shape the pages read (other common names are tolerated):
 *   { id, requestNumber, status, priority, dueDate, scheduledAt, createdAt,
 *     patientName, patientPhone, address, locationArea, patientType,
 *     requestedByName, requestedByRole, notes,
 *     items: [{ id, name, quantity, unitPrice, instructions, sampleType }],
 *     totalAmount, resultUrl, resultSummary, receivedBy, completedAt }
 */
export function labApi(kind) {
  const base = kind === 'PHARMACY' ? '/pharmacy/me' : '/lab/me';
  return {
    /* { newRequests, inProgress, dueToday, completedThisMonth, valueThisMonth } */
    summary: () => apiFetch(`${base}/summary`),
    activity: (limit = 6) => apiFetch(`${base}/activity`, { params: { limit } }),

    requests: (status) => apiFetch(`${base}/requests`, { params: { status } }),
    request: (id) => apiFetch(`${base}/requests/${id}`),
    /* body: { scheduledAt, items: [{ id, unitPrice }], note } */
    accept: (id, body) => apiFetch(`${base}/requests/${id}/accept`, { method: 'PUT', body }),
    decline: (id, reason) => apiFetch(`${base}/requests/${id}/decline`, { method: 'PUT', body: { reason } }),
    /* lab: sample collected · pharmacy: out for delivery */
    start: (id, note) => apiFetch(`${base}/requests/${id}/start`, { method: 'PUT', body: { note } }),
    /* lab: FormData { summary, abnormal, file } */
    submitResults: (id, formData) => apiFetch(`${base}/requests/${id}/results`, { method: 'PUT', body: formData }),
    /* pharmacy: FormData { receivedBy, deliveredAt, note, proof } */
    confirmDelivery: (id, formData) => apiFetch(`${base}/requests/${id}/deliver`, { method: 'PUT', body: formData }),

    /* Price list (tests or drugs). Pharmacy items also carry stock. */
    catalogue: () => apiFetch(`${base}/catalogue`),
    createItem: (body) => apiFetch(`${base}/catalogue`, { method: 'POST', body }),
    updateItem: (id, body) => apiFetch(`${base}/catalogue/${id}`, { method: 'PUT', body }),
    /* body: { change: +/-n, reason } */
    adjustStock: (id, change, reason) => apiFetch(`${base}/catalogue/${id}/stock`, { method: 'PUT', body: { change, reason } }),
  };
}

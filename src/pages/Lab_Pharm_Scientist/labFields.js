import { pick } from '../../utils/format';

/* Lab scientists and pharmacists share one portal; this decides the wording. */
export const kindOf = (role) => (String(role || '').toUpperCase() === 'PHARMACIST' ? 'PHARMACY' : 'LAB');

export const WORDS = {
  LAB: {
    portal: 'Lab Portal',
    item: 'test', items: 'tests', Item: 'Test', Items: 'Tests',
    catalogue: 'Test Catalogue',
    startLabel: 'Sample collected',
    startDone: 'Sample marked as collected.',
    inProgress: 'Sample collected',
    visit: 'collection',
    visits: 'collections',
    Visit: 'Collection',
    completeLabel: 'Upload results',
    scheduleTitle: 'Collections',
    doneSub: 'Results sent',
  },
  PHARMACY: {
    portal: 'Pharmacy Portal',
    item: 'drug', items: 'drugs', Item: 'Drug', Items: 'Drugs',
    catalogue: 'Drug Catalogue',
    startLabel: 'Out for delivery',
    startDone: 'Marked as out for delivery.',
    inProgress: 'Out for delivery',
    visit: 'delivery',
    visits: 'deliveries',
    Visit: 'Delivery',
    completeLabel: 'Confirm delivery',
    scheduleTitle: 'Deliveries',
    doneSub: 'Delivered to patients',
  },
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
export { num };

/* Status → one of NEW, ACCEPTED, IN_PROGRESS, COMPLETED, DECLINED */
export function reqStatus(r) {
  const st = String(r?.status || 'NEW').toUpperCase();
  if (['PENDING', 'ASSIGNED', 'SENT'].includes(st)) return 'NEW';
  if (['SCHEDULED', 'CONFIRMED'].includes(st)) return 'ACCEPTED';
  if (['COLLECTED', 'SAMPLE_COLLECTED', 'OUT_FOR_DELIVERY', 'PROCESSING', 'STARTED'].includes(st)) return 'IN_PROGRESS';
  if (['DELIVERED', 'RESULTS_READY', 'DONE', 'CLOSED'].includes(st)) return 'COMPLETED';
  if (['REJECTED', 'CANNOT_FULFIL'].includes(st)) return 'DECLINED';
  return st;
}
export const isOpen = (r) => ['NEW', 'ACCEPTED', 'IN_PROGRESS'].includes(reqStatus(r));
export const isUrgent = (r) => ['URGENT', 'STAT', 'HIGH'].includes(String(pick(r || {}, 'priority') || '').toUpperCase());

export const reqNo = (r) => pick(r, 'requestNumber', 'reference', 'code') || `REQ-${r.id}`;
export const patientOf = (r) => pick(r, 'patientName', 'patient') || (r.patient && pick(r.patient, 'fullName', 'name')) || '—';
export const phoneOf = (r) => pick(r, 'patientPhone', 'phoneNumber', 'phone') || (r.patient && pick(r.patient, 'phone', 'phoneNumber'));
export const addressOf = (r) => pick(r, 'address', 'deliveryAddress', 'homeAddress') || (r.patient && pick(r.patient, 'address'));
export const requesterOf = (r) => pick(r, 'requestedByName', 'requestedBy', 'orderedBy');
export const dueOf = (r) => pick(r, 'dueDate', 'neededBy');
export const whenOf = (r) => pick(r, 'scheduledAt', 'scheduledFor');

export const itemsOf = (r) => (Array.isArray(r?.items) ? r.items : []).map((it, i) => ({
  ...it,
  key: it.id ?? i,
  name: pick(it, 'name', 'testName', 'drugName', 'itemName') || 'Item',
  quantity: num(pick(it, 'quantity', 'qty') ?? 1) || 1,
  unitPrice: pick(it, 'unitPrice', 'price') == null ? null : num(pick(it, 'unitPrice', 'price')),
}));
export const totalOf = (r) => {
  const explicit = pick(r, 'totalAmount', 'total', 'amount');
  if (explicit != null) return num(explicit);
  return itemsOf(r).reduce((t, it) => t + (it.unitPrice ?? 0) * it.quantity, 0);
};
export const unpriced = (r) => itemsOf(r).some((it) => it.unitPrice == null);

/* Google Maps search link for an address (opens outside the app). */
export const mapsUrl = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/* Urgent first, then soonest due / scheduled, then oldest. */
export function byUrgency(a, b) {
  const t = (r) => new Date(whenOf(r) || dueOf(r) || r.createdAt || 8.64e15).getTime();
  return isUrgent(b) - isUrgent(a) || t(a) - t(b);
}

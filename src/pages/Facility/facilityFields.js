import { pick } from '../../utils/format';

/* Partner facility admins: hospitals get referrals, pharmacies get drug orders, labs get test requests. */
const KIND_BY_ROLE = { PHARMACY_ADMIN: 'PHARMACY', LAB_ADMIN: 'LAB' };
export const kindOf = (role) => KIND_BY_ROLE[String(role || '').toUpperCase()] || 'HOSPITAL';

export const WORDS = {
  HOSPITAL: {
    base: '/hospital',
    portal: 'Hospital Portal',
    request: 'referral', requests: 'referrals', Request: 'Referral', Requests: 'Referrals',
    from: 'Referred by',
  },
  PHARMACY: {
    base: '/pharmacy',
    portal: 'Pharmacy Portal',
    request: 'order', requests: 'orders', Request: 'Order', Requests: 'Drug Orders',
    from: 'Prescribed by',
  },
  LAB: {
    base: '/laboratory',
    portal: 'Laboratory Portal',
    request: 'test request', requests: 'test requests', Request: 'Test request', Requests: 'Test Requests',
    from: 'Requested by',
  },
};

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/*
 * One status set per kind:
 *   hospital: NEW → ACCEPTED → ADMITTED → DISCHARGED   (or DECLINED)
 *   pharmacy: NEW → ACCEPTED → DISPATCHED → DELIVERED  (or DECLINED)
 *   lab:      NEW → ACCEPTED → COLLECTED  → RESULTED   (or DECLINED)
 */
export function reqStatus(r) {
  const st = String(r?.status || 'NEW').toUpperCase();
  if (['PENDING', 'SENT', 'ASSIGNED'].includes(st)) return 'NEW';
  if (['CONFIRMED', 'SCHEDULED'].includes(st)) return 'ACCEPTED';
  if (['IN_CARE', 'ARRIVED'].includes(st)) return 'ADMITTED';
  if (['OUT_FOR_DELIVERY', 'IN_TRANSIT'].includes(st)) return 'DISPATCHED';
  if (['SAMPLE_COLLECTED', 'PROCESSING', 'IN_PROGRESS'].includes(st)) return 'COLLECTED';
  if (['RESULTS_READY', 'REPORTED'].includes(st)) return 'RESULTED';
  if (['COMPLETED', 'CLOSED'].includes(st)) return r?.tests ? 'RESULTED' : r?.items ? 'DELIVERED' : 'DISCHARGED';
  if (['REJECTED'].includes(st)) return 'DECLINED';
  return st;
}
export const isDone = (r) => ['DISCHARGED', 'DELIVERED', 'RESULTED', 'DECLINED'].includes(reqStatus(r));
export const isUrgent = (r) => ['URGENT', 'EMERGENCY', 'STAT', 'HIGH'].includes(String(pick(r || {}, 'urgency', 'priority') || '').toUpperCase());

export const refOf = (r) => pick(r, 'reference', 'referralNumber', 'orderNumber', 'requestNumber') || `#${r.id}`;
const patient = (r) => r?.patient || {};
export const patientName = (r) => pick(patient(r), 'name', 'fullName') || pick(r, 'patientName') || '—';
export const patientPhone = (r) => pick(patient(r), 'phone', 'phoneNumber') || pick(r, 'patientPhone');
export const patientAddress = (r) => pick(patient(r), 'address') || pick(r, 'deliveryAddress', 'address');
export const fromOf = (r) => pick(r, 'referredByName', 'prescribedByName', 'requestedByName');

export const itemsOf = (r) => (Array.isArray(r?.items) ? r.items : []).map((it, i) => ({
  ...it,
  key: it.id ?? i,
  name: [pick(it, 'name', 'drugName'), it.strength].filter(Boolean).join(' '),
  quantity: num(pick(it, 'quantity', 'qty') ?? 1) || 1,
  unitPrice: pick(it, 'unitPrice', 'price') == null ? null : num(pick(it, 'unitPrice', 'price')),
}));
export const orderTotal = (r) => itemsOf(r).reduce((t, it) => t + (it.unitPrice ?? 0) * it.quantity, 0);

/* Lab test requests: tests: [{ id, name, code, sampleType, fasting, price, result }] */
export const testsOf = (r) => (Array.isArray(r?.tests) ? r.tests : []).map((t, i) => ({
  ...t,
  key: t.id ?? i,
  name: pick(t, 'name', 'testName') || t.code || 'Test',
  quantity: 1,
  unitPrice: pick(t, 'unitPrice', 'price') == null ? null : num(pick(t, 'unitPrice', 'price')),
}));
export const testsTotal = (r) => testsOf(r).reduce((t, x) => t + (x.unitPrice ?? 0), 0);
export const isHomeCollection = (r) => String(pick(r || {}, 'collectionType', 'collection') || 'HOME').toUpperCase() !== 'WALK_IN';

/* Urgent first, then oldest first (waiting longest). */
export const byUrgency = (a, b) => isUrgent(b) - isUrgent(a) || new Date(a.createdAt || 0) - new Date(b.createdAt || 0);

/* ── Invoices ── */
export const invStatus = (i) => {
  const st = String(i?.status || 'PENDING').toUpperCase();
  return st === 'SUBMITTED' ? 'PENDING' : st;
};
export const invTotal = (i) => {
  const t = pick(i, 'totalAmount', 'amount', 'total');
  if (t != null) return num(t);
  return (Array.isArray(i?.items) ? i.items : []).reduce((s, it) => s + num(it.unitPrice) * (num(it.quantity) || 1), 0);
};
export const invNo = (i) => pick(i, 'invoiceNumber', 'reference') || `INV-${i.id}`;

/* Google Maps search link for a delivery address (opens outside the app). */
export const mapsUrl = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

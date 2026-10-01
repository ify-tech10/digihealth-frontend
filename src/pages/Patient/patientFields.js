import { humanize, pick } from '../../utils/format';

export const DIGI_PHONE = '+2340974562456';
/* shown the same way as on the public site */
export const DIGI_PHONE_LABEL = '+234 097 456 2456';
export const DIGI_WHATSAPP = 'https://wa.me/2340974562456';
export const EMERGENCY = '112';

/* What a patient can book. `visit: false` services don't send a nurse to the home. */
export const SERVICES = [
  ['POST_DISCHARGE_RECOVERY', 'Post-Discharge Recovery', 'Nursing care at home after a hospital stay — wound care, medication, monitoring.', 'heart'],
  ['CHRONIC_DISEASE_MANAGEMENT', 'Chronic Disease Management', 'Regular checks for hypertension, diabetes and other long-term conditions.', 'activity'],
  ['ELDERLY_CARE', 'Elderly Care', 'Support and monitoring for older family members at home.', 'users'],
  ['POSTNATAL_NEWBORN_CARE', 'Postnatal & Newborn Care', 'Care for mother and baby in the first weeks after birth.', 'heart'],
  ['PHYSIOTHERAPY', 'Physiotherapy & Rehabilitation', 'Exercises and therapy at home to recover movement and strength.', 'activity'],
  ['LAB_DIAGNOSTICS', 'Lab Tests at Home', 'A sample is collected at home and results come to your portal.', 'flask'],
  ['TELEMEDICINE', 'Telemedicine Consultation', 'Speak to a doctor or nurse by video or phone.', 'phone'],
];
export const serviceLabel = (v) => SERVICES.find(([k]) => k === String(v || '').toUpperCase())?.[1] || humanize(v) || 'Care visit';
export const serviceIcon = (v) => SERVICES.find(([k]) => k === String(v || '').toUpperCase())?.[3] || 'heart';

export const TIME_SLOTS = [
  ['MORNING', 'Morning (8AM – 12PM)'],
  ['AFTERNOON', 'Afternoon (12PM – 4PM)'],
  ['EVENING', 'Evening (4PM – 7PM)'],
];
export const slotLabel = (v) => TIME_SLOTS.find(([k]) => k === String(v || '').toUpperCase())?.[1] || humanize(v);

/* REQUESTED → CONFIRMED (nurse assigned) → IN_PROGRESS → COMPLETED, or CANCELLED */
export function bookingStatus(b) {
  const st = String(b?.status || 'REQUESTED').toUpperCase();
  if (['PENDING', 'NEW', 'SUBMITTED'].includes(st)) return 'REQUESTED';
  if (['ASSIGNED', 'SCHEDULED', 'ACCEPTED'].includes(st)) return 'CONFIRMED';
  if (['STARTED', 'CHECKED_IN', 'ONGOING'].includes(st)) return 'IN_PROGRESS';
  if (['DONE', 'CLOSED'].includes(st)) return 'COMPLETED';
  if (['REJECTED', 'DECLINED'].includes(st)) return 'CANCELLED';
  return st;
}
export const BOOKING_LABEL = { REQUESTED: 'Awaiting confirmation', CONFIRMED: 'Upcoming', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };

/* When a booking/visit happens, as a Date (date + slot start, or an exact time). */
const SLOT_HOUR = { MORNING: 8, AFTERNOON: 12, EVENING: 16 };
export function whenOf(b) {
  const exact = pick(b, 'scheduledAt', 'startTime');
  if (exact) return new Date(exact);
  if (!b?.date) return null;
  const d = new Date(`${String(b.date).slice(0, 10)}T00:00:00`);
  d.setHours(SLOT_HOUR[String(b.timeSlot || '').toUpperCase()] ?? 8);
  return d;
}
export const isUpcoming = (b) => ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'].includes(bookingStatus(b));
/* Patients can change a booking until the day before. */
export const canChange = (b) => ['REQUESTED', 'CONFIRMED'].includes(bookingStatus(b)) && (!whenOf(b) || whenOf(b) - Date.now() > 12 * 3600000);

export const caregiverOf = (x) => x?.caregiver || x?.nurse || x?.provider || null;
export const caregiverName = (x) => pick(caregiverOf(x) || {}, 'name', 'fullName') || pick(x || {}, 'caregiverName', 'nurseName');
export const caregiverRole = (x) => {
  const r = pick(caregiverOf(x) || {}, 'role', 'title');
  if (!r) return 'Caregiver';
  return /^[A-Z]{2,4}$/.test(r) ? r : humanize(r); // keep RN, CNA… as written
};
export const refOf = (x) => pick(x, 'reference', 'bookingNumber') || `#${x.id}`;

/* ── Vitals ── */
export const VITALS = [
  ['bloodPressure', 'Blood pressure', ''],
  ['pulse', 'Pulse', 'bpm'],
  ['temperature', 'Temperature', '°C'],
  ['spo2', 'Oxygen (SpO₂)', '%'],
  ['bloodSugar', 'Blood sugar', 'mmol/L'],
  ['weight', 'Weight', 'kg'],
];
export const hasVitals = (v) => !!v && VITALS.some(([k]) => v[k] != null && v[k] !== '');

/* ── Documents ── */
export const DOC_TYPES = [
  ['VISIT_REPORT', 'Visit reports', 'Visit report', 'file'],
  ['LAB_REPORT', 'Lab results', 'Lab result', 'flask'],
  ['DISCHARGE_SUMMARY', 'Discharge summaries', 'Discharge summary', 'home'],
  ['PRESCRIPTION', 'Prescriptions', 'Prescription', 'plusHouse'],
  ['CARE_PLAN', 'Care plans', 'Care plan', 'heart'],
  ['RECEIPT', 'Receipts', 'Receipt', 'dollar'],
];
export const docType = (d) => String(pick(d, 'type', 'category') || 'OTHER').toUpperCase();
export const docTypeLabel = (t) => DOC_TYPES.find(([k]) => k === t)?.[2] || humanize(t);
export const docIcon = (t) => DOC_TYPES.find(([k]) => k === t)?.[3] || 'file';
export const docUrl = (d) => pick(d, 'url', 'fileUrl', 'downloadUrl');

/* ── Money ── */
export const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export function invStatus(i) {
  const st = String(i?.status || 'UNPAID').toUpperCase();
  if (['PENDING', 'ISSUED', 'SENT', 'DUE'].includes(st)) return 'UNPAID';
  if (['PARTIALLY_PAID'].includes(st)) return 'PARTIAL';
  return st;
}
export const invTotal = (i) => num(pick(i, 'totalAmount', 'amount', 'total'));
export const invPaid = (i) => num(pick(i, 'amountPaid', 'paid'));
export const invBalance = (i) => (invStatus(i) === 'PAID' ? 0 : Math.max(0, num(pick(i, 'balance', 'amountDue') ?? invTotal(i) - invPaid(i))));
export const invNo = (i) => pick(i, 'invoiceNumber', 'reference') || `INV-${i.id}`;
export const isOverdueInv = (i) => invBalance(i) > 0 && !!i.dueDate && new Date(i.dueDate) < new Date(new Date().toDateString());

export const isHmo = (profile) => String(pick(profile || {}, 'patientType', 'paymentType') || '').toUpperCase() === 'HMO';

/* ── Support ── */
export const TICKET_CATEGORIES = [
  ['BOOKING', 'A booking or visit'],
  ['CAREGIVER', 'My nurse / caregiver'],
  ['BILLING', 'Bills and payments'],
  ['RESULTS', 'Results or reports'],
  ['MEDICATION', 'Medication or delivery'],
  ['OTHER', 'Something else'],
];
export const ticketOpen = (t) => !['RESOLVED', 'CLOSED'].includes(String(t?.status || 'OPEN').toUpperCase());
export const hasNewReply = (t) => !!t?.unreadForPatient || !!t?.awaitingPatient;

/* "Thu 2 Oct · Morning (8AM – 12PM)", or an exact time when the nurse has one. */
export function whenLabel(b) {
  const d = whenOf(b);
  if (!d) return 'Date to be confirmed';
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const rel = d.toDateString() === today.toDateString() ? 'Today' : d.toDateString() === tomorrow.toDateString() ? 'Tomorrow' : day;
  if (pick(b, 'scheduledAt', 'startTime')) return `${rel} · ${d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  return `${rel} · ${slotLabel(b.timeSlot) === '—' ? 'Time to be confirmed' : slotLabel(b.timeSlot)}`;
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export const firstName = (name) => {
  const f = String(name || '').trim().split(/\s+/)[0];
  return f && !f.includes('@') ? f : '';
};

export const minutesBetween = (a, b) => (a && b ? Math.round((new Date(b) - new Date(a)) / 60000) : null);
export const durationLabel = (mins) => (mins == null || mins <= 0 ? '' : mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} hr${mins >= 120 ? 's' : ''}${mins % 60 ? ` ${mins % 60} min` : ''}`);

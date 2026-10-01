import { humanize, initials, pick, timeAgo } from '../../utils/format';

/* Tolerant readers for ticket records — the backend may name things differently. */

export const TICKET_STATUSES = [
  ['OPEN', 'Open'],
  ['URGENT', 'Urgent'],
  ['PENDING', 'Pending'],
  ['ESCALATED', 'Escalated'],
  ['RESOLVED', 'Resolved'],
];

export const TICKET_TYPES = [
  ['BOOKING', 'Booking'],
  ['BILLING', 'Billing'],
  ['COMPLAINT', 'Complaint'],
  ['HMO', 'HMO'],
  ['GENERAL', 'General'],
];

export const CHANNELS = [
  ['PHONE', 'Phone call'],
  ['WHATSAPP', 'WhatsApp'],
  ['EMAIL', 'Email'],
  ['WALK_IN', 'Walk-in'],
];

const TYPE_LABEL = Object.fromEntries(TICKET_TYPES);
const PALETTE = ['#1a2550', '#0891b2', '#16a34a', '#9333ea', '#b45309', '#dc2626', '#0e7490', '#7c3aed'];

export const ticketStatus = (t) => String(t?.status || 'OPEN').toUpperCase();
export const ticketType = (t) => String(pick(t || {}, 'type', 'category') || 'GENERAL').toUpperCase();
export const typeLabel = (t) => TYPE_LABEL[ticketType(t)] || humanize(ticketType(t));
export const isResolved = (t) => ['RESOLVED', 'CLOSED'].includes(ticketStatus(t));
export const isUrgent = (t) => ticketStatus(t) === 'URGENT' || String(t?.priority || '').toUpperCase() === 'URGENT';

export const patientOf = (t) => t?.patient || {};
export const patientId = (p) => pick(p || {}, 'patientCode', 'patientNumber', 'id', 'patientId');
export const patientName = (p) => pick(p || {}, 'name', 'fullName') || [p?.firstName, p?.lastName].filter(Boolean).join(' ');
export const patientPhone = (p) => pick(p || {}, 'phone', 'phoneNumber');
export const patientPlan = (p) => pick(p || {}, 'plan', 'carePlan', 'hmoName', 'patientType');
export const patientNurse = (p) => pick(p || {}, 'nurse', 'assignedNurse', 'assignedProviderName', 'providerName');

export const ticketName = (t) =>
  pick(t || {}, 'name', 'patientName', 'customerName', 'callerName') || patientName(patientOf(t)) || 'Unknown caller';
export const ticketSubject = (t) => pick(t || {}, 'subject', 'title') || 'No subject';
export const ticketColor = (t) => t?.color || colorFor(ticketName(t));
export const ticketInitials = (t) => t?.initials || initials(ticketName(t));

/* Newest activity on the ticket, for sorting and "8 min ago". */
export const ticketStamp = (t) => pick(t || {}, 'updatedAt', 'lastMessageAt', 'createdAt');
export const ticketTime = (t) => t?.time || timeAgo(ticketStamp(t)) || '';

const isAgent = (m) => {
  const from = String(pick(m, 'from', 'senderType', 'sender', 'role') || '').toUpperCase();
  return from === 'AGENT' || from === 'CUSTOMER_CARE' || from === 'STAFF' || m.fromAgent === true;
};

export function messagesOf(t) {
  return (t?.messages || []).map((m, i) => ({
    key: m.id ?? i,
    agent: isAgent(m),
    name: pick(m, 'name', 'senderName', 'author') || (isAgent(m) ? 'Customer Care' : ticketName(t)),
    text: String(pick(m, 'text', 'message', 'body', 'content') || ''),
    time: m.time || stampLabel(pick(m, 'createdAt', 'sentAt', 'timestamp')),
  }));
}

export const ticketPreview = (t) => {
  if (pick(t || {}, 'preview', 'lastMessage')) return pick(t, 'preview', 'lastMessage');
  const msgs = messagesOf(t);
  return msgs.length ? msgs[msgs.length - 1].text : '';
};

/* Unresolved first, urgent at the top, then the most recent activity. */
export function sortTickets(list) {
  const rank = (t) => (isResolved(t) ? 2 : isUrgent(t) ? 0 : 1);
  return list
    .map((t, i) => ({ t, i }))
    .sort((a, b) => {
      const r = rank(a.t) - rank(b.t);
      if (r) return r;
      const da = new Date(ticketStamp(a.t) || 0).getTime();
      const db = new Date(ticketStamp(b.t) || 0).getTime();
      return db - da || a.i - b.i;
    })
    .map((x) => x.t);
}

/* "14:02" today, otherwise "12 May, 14:02". */
export function stampLabel(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === new Date().toDateString()) return time;
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`;
}

export function colorFor(name = '') {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return PALETTE[h % PALETTE.length];
}

/* 4.2 -> "4.2m", 95 -> "1.6h"; strings like "4.2m" pass through. */
export function minutesLabel(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n < 60 ? `${Math.round(n * 10) / 10}m` : `${Math.round((n / 60) * 10) / 10}h`;
}

/* 96, 0.96 or "96%" -> "96%" */
export function percentLabel(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace('%', ''));
  if (Number.isNaN(n)) return String(v);
  return `${Math.round(n <= 1 ? n * 100 : n)}%`;
}

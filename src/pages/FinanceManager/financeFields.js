import { humanize, pick, toISODate } from '../../utils/format';

/* Tolerant readers for finance records — the backend may name things differently. */

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
export const sumBy = (list, fn) => list.reduce((t, x) => t + num(fn(x)), 0);

export const monthKey = (d = new Date()) => toISODate(d).slice(0, 7);
export function shiftMonth(key, n) {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
}
export const monthLabel = (key, style = 'long') =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', { month: style, year: 'numeric' });
export const inMonth = (value, key) => !!value && toISODate(new Date(value)).startsWith(key);

/* ₦4.2M / ₦860K / ₦12,500 */
export function nairaShort(v) {
  if (v == null || v === '') return null;
  const n = num(v);
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e9) return `${sign}₦${trim(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}₦${trim(abs / 1e6)}M`;
  if (abs >= 1e4) return `${sign}₦${Math.round(abs / 1e3)}K`;
  return `${sign}₦${abs.toLocaleString('en-NG')}`;
}
const trim = (x) => (Math.round(x * 10) / 10).toString();

/* ── Invoices ── */
export const invoiceNo = (i) => pick(i, 'invoiceNumber', 'reference', 'code') || (i.id != null ? `INV-${i.id}` : '—');
export const invoiceClient = (i) => pick(i, 'clientName', 'client', 'patientName', 'organisationName', 'billTo');
export const invoiceService = (i) => pick(i, 'service', 'description', 'serviceNeeded', 'title');
export const invoiceIssued = (i) => pick(i, 'issuedAt', 'issueDate', 'createdAt');
export const invoiceDue = (i) => pick(i, 'dueDate', 'dueAt');
export const invoiceAmount = (i) => num(pick(i, 'totalAmount', 'amount', 'total'));
export const invoicePaid = (i) => num(pick(i, 'amountPaid', 'paidAmount'));
export const invoiceBalance = (i) => {
  const explicit = pick(i, 'balance', 'balanceDue', 'outstanding');
  if (explicit != null) return num(explicit);
  return invoiceStatus(i) === 'PAID' ? 0 : Math.max(0, invoiceAmount(i) - invoicePaid(i));
};

/* Unpaid invoices past their due date read as OVERDUE even if the backend says PENDING. */
export function invoiceStatus(i) {
  const st = String(i?.status || 'PENDING').toUpperCase();
  if (['PAID', 'CANCELLED', 'VOID'].includes(st)) return st;
  const due = invoiceDue(i);
  if (due && toISODate(new Date(due)) < toISODate(new Date())) return 'OVERDUE';
  return st === 'PARTIALLY_PAID' ? 'PARTIAL' : st;
}
export const isOutstanding = (i) => !['PAID', 'CANCELLED', 'VOID'].includes(invoiceStatus(i));

/* ── Payments ── */
export const paymentDate = (p) => pick(p, 'paymentDate', 'paidAt', 'date', 'createdAt');
export const paymentFrom = (p) => pick(p, 'payerName', 'clientName', 'client', 'from', 'patientName');
export const paymentAmount = (p) => num(pick(p, 'amount', 'amountPaid'));

/* ── HMO claims ── */
export const claimStatus = (c) => String(c?.status || 'PENDING').toUpperCase();
export const claimAmount = (c) => num(pick(c, 'amountClaimed', 'amount'));
export const isClaimOpen = (c) => !['PAID', 'REJECTED', 'CANCELLED'].includes(claimStatus(c));

/* ── Expense claims ── */
export const expenseStatus = (e) => String(e?.status || 'PENDING').toUpperCase();
export const expenseAmount = (e) => num(pick(e, 'amount', 'totalAmount'));
export const expenseStaff = (e) => pick(e, 'staffName', 'staff', 'submittedByName', 'providerName');

/* Payment methods offered when recording money in or out. */
export const PAYMENT_METHODS = [
  ['BANK_TRANSFER', 'Bank transfer'],
  ['CASH', 'Cash'],
  ['CARD', 'Card (POS)'],
  ['CHEQUE', 'Cheque'],
  ['USSD', 'USSD'],
  ['PAYSTACK', 'Online (Paystack)'],
];

/* Colour for % of budget used: over → red, near → orange, fine → green. */
export const usageColor = (pct) => (pct > 100 ? '#ef4444' : pct > 85 ? '#f97316' : '#22c55e');

/* "2026-04" -> "April 2026"; anything else is humanised. */
export const periodLabel = (v) => {
  if (!v) return '—';
  if (/^\d{4}-\d{2}$/.test(String(v))) return monthLabel(String(v));
  return humanize(v);
};

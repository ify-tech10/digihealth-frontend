import { pick } from '../../utils/format';
import { num, reqStatus } from '../Facility/facilityFields';

export const SAMPLE_TYPES = ['Blood', 'Serum', 'Plasma', 'Urine', 'Stool', 'Swab', 'Sputum', 'Semen', 'CSF', 'Other'];
export const CATEGORIES = ['Haematology', 'Chemistry', 'Microbiology', 'Serology', 'Immunology', 'Hormones', 'Molecular', 'Imaging', 'Other'];

export const FLAGS = [
  ['NORMAL', 'Normal'],
  ['HIGH', 'High'],
  ['LOW', 'Low'],
  ['ABNORMAL', 'Abnormal'],
  ['CRITICAL', 'Critical'],
];
export const FLAG_VARIANT = { NORMAL: 'active', HIGH: 'pending', LOW: 'pending', ABNORMAL: 'pending', CRITICAL: 'urgent' };

/* A test on this lab's menu, read tolerantly. */
export const menuTest = (t) => ({
  ...t,
  name: pick(t, 'name', 'testName') || '—',
  code: t.code || '',
  category: t.category || '',
  sampleType: t.sampleType || '',
  price: num(pick(t, 'price', 'unitPrice')),
  turnaroundHours: num(pick(t, 'turnaroundHours', 'tat')),
  fasting: !!t.fasting,
  homeCollection: t.homeCollection !== false,
  active: t.active !== false,
  preparation: t.preparation || '',
});

/* Find a requested test on the menu — by code first, then by name. */
export function findInMenu(menu, test) {
  const low = (v) => String(v || '').trim().toLowerCase();
  const code = low(test.code);
  const name = low(test.name);
  return (code && menu.find((m) => low(m.code) === code)) || menu.find((m) => low(m.name) === name) || null;
}

export function turnaroundLabel(hours) {
  const h = num(hours);
  if (!h) return '—';
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'}`;
  const d = Math.round((h / 24) * 10) / 10;
  return `${d} day${d === 1 ? '' : 's'}`;
}

export const isToday = (v) => !!v && new Date(v).toDateString() === new Date().toDateString();

/* When results are promised: explicit due date, or collection time + turnaround. */
export function resultsDue(r) {
  if (r.resultsDueAt) return new Date(r.resultsDueAt);
  const h = num(pick(r, 'turnaroundHours'));
  if (!r.collectedAt || !h) return null;
  return new Date(new Date(r.collectedAt).getTime() + h * 3600000);
}
export const isOverdue = (r) => reqStatus(r) === 'COLLECTED' && !!resultsDue(r) && resultsDue(r) < new Date();

export const hasCritical = (r) => !!r.critical || (Array.isArray(r.tests) && r.tests.some((t) => String(t.result?.flag || t.flag || '').toUpperCase() === 'CRITICAL'));

export const testsSummary = (tests) => (tests.length ? `${tests.slice(0, 2).map((t) => t.name).join(', ')}${tests.length > 2 ? ` +${tests.length - 2}` : ''}` : '—');

export function localInput(d) {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
}

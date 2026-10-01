import { formatTime, pick } from '../../utils/format';
import { locationLabel } from '../../config/locations';

/* Field readers for provider data — tolerant of backend naming. */

export const patientName = (p) =>
  pick(p, 'fullName', 'patientName', 'name') || [p?.firstName, p?.lastName].filter(Boolean).join(' ') || '—';

/* Close/report actions need the care request id, not the patient id. */
export const requestIdOf = (p) => pick(p, 'careRequestId', 'requestId', 'id');

export const serviceOf = (x) => pick(x, 'serviceType', 'serviceNeeded', 'service', 'carePlan') || '—';

export const statusOf = (x) => String(pick(x, 'status', 'requestStatus') || 'ACTIVE').toUpperCase();

export const locationOf = (x) => {
  const v = pick(x, 'location', 'address');
  if (v) return v;
  return x?.locationArea ? locationLabel(x.locationArea) : '—';
};

/* Newly assigned and not yet opened by the provider. */
export const isNewAssignment = (p) =>
  p?.isNew === true || p?.acknowledged === false || ['ASSIGNED', 'NEW'].includes(statusOf(p));

export const isClosable = (p) => ['ACTIVE', 'ASSIGNED', 'IN_PROGRESS', 'WRAPPING_UP', 'NEW'].includes(statusOf(p));

/* ── visits ── */
export const visitDateOf = (v) => {
  const raw = pick(v, 'visitDate', 'date', 'scheduledDate', 'scheduledAt', 'startTime');
  return raw ? String(raw).slice(0, 10) : null;
};

export function visitTime(v) {
  if (v?.time) return `${v.time}${v.period ? ` ${v.period}` : ''}`;
  return formatTime(pick(v, 'scheduledTime', 'startTime', 'scheduledAt'));
}

export function visitDuration(v) {
  if (v?.duration) return v.duration;
  const mins = Number(pick(v, 'durationMins', 'durationMinutes'));
  if (!mins) return '';
  return mins % 60 === 0 ? `${mins / 60}hr` : mins > 60 ? `${(mins / 60).toFixed(1)}hr` : `${mins}min`;
}

export const visitStatus = (v) => String(v?.status || 'UPCOMING').toUpperCase();

/* Minutes past midnight, for sorting ("8:30"+"AM", "14:00:00", ISO timestamps). */
export function visitMinutes(v) {
  if (v?.time) {
    const [h, m] = String(v.time).split(':').map(Number);
    const period = String(v.period || '').toUpperCase();
    const hour = period ? (h % 12) + (period === 'PM' ? 12 : 0) : h;
    return hour * 60 + (m || 0);
  }
  const raw = pick(v, 'scheduledTime', 'startTime', 'scheduledAt');
  if (!raw) return 24 * 60;
  const hhmm = /^(\d{1,2}):(\d{2})/.exec(raw);
  if (hhmm) return Number(hhmm[1]) * 60 + Number(hhmm[2]);
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? 24 * 60 : d.getHours() * 60 + d.getMinutes();
}

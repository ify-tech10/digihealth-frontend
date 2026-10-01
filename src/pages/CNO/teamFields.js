import { humanize, initials, pick } from '../../utils/format';

/* Field readers for team members (providers) — tolerant of backend naming. */

const AVATAR_COLORS = ['#1a2550', '#0891b2', '#7c3aed', '#059669', '#b45309', '#be185d'];

export const memberName = (n) => pick(n, 'fullName', 'name') || 'Unknown';
export const memberRole = (n) => humanize(pick(n, 'serviceProviderType', 'role'));
export const memberPatients = (n) => Number(pick(n, 'activePatients', 'patients', 'activePatientCount') ?? 0);
export const memberCapacity = (n) => Number(pick(n, 'capacity', 'patientCapacity') ?? 10);
export const memberRating = (n) => Number(pick(n, 'rating', 'avgRating') ?? 0);
export const memberInitials = (n) => initials(memberName(n).replace(/^(Dr|Nurse|Physio)\.?\s+/i, ''));

export function memberColor(n) {
  if (n.color) return n.color;
  const name = memberName(n);
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

/* Load as a share of capacity, with status colour (≥100% full, ≥80% busy). */
export function load(n) {
  const cap = memberCapacity(n);
  const pct = cap > 0 ? Math.min(100, Math.round((memberPatients(n) / cap) * 100)) : 0;
  const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f97316' : '#22c55e';
  const label = pct >= 100 ? 'Full' : pct >= 80 ? 'Busy' : 'Has capacity';
  return { pct, color, label };
}

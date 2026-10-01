/* Status helpers shared by the Admin pages. */
export function canAssign(req) {
  const st = String(req?.status || '').toUpperCase();
  return !['ASSIGNED', 'COMPLETED', 'CANCELLED', 'PENDING_CLOSURE', 'CLOSED'].includes(st);
}

export function isPending(record, field = 'status') {
  return String(record?.[field] || 'PENDING').toUpperCase() === 'PENDING';
}

/* Provider has closed the request; supervisor/admin must approve. */
export function awaitingClosure(req) {
  const st = String(req?.status || '').toUpperCase();
  return st === 'PENDING_CLOSURE' || st === 'AWAITING_CLOSURE';
}

/* Users and facilities expose either `active`/`enabled` booleans or a status. */
export function isActiveRecord(r) {
  if (typeof r?.active === 'boolean') return r.active;
  if (typeof r?.enabled === 'boolean') return r.enabled;
  const st = String(r?.status || 'ACTIVE').toUpperCase();
  return !['INACTIVE', 'DEACTIVATED', 'DISABLED', 'SUSPENDED'].includes(st);
}

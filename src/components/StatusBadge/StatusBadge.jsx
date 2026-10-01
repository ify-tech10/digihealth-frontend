import Badge from '../Badge/Badge';
import { humanize } from '../../utils/format';

/* Backend status → badge colour. Anything unknown renders grey. */
const VARIANT = {
  URGENT: 'urgent',
  NEW: 'new',
  PENDING: 'pending',
  UNDER_REVIEW: 'pending',
  SCHEDULED: 'new',
  IN_PROGRESS: 'active',
  ASSIGNED: 'active',
  APPROVED: 'active',
  ACTIVE: 'active',
  PAID: 'active',
  SUCCESS: 'active',
  SUCCESSFUL: 'active',
  COMPLETED: 'done',
  INACTIVE: 'done',
  CANCELLED: 'done',
  REJECTED: 'urgent',
  SUSPENDED: 'urgent',
  FAILED: 'urgent',
  MISSED: 'urgent',
  PENDING_CLOSURE: 'pending',
  AWAITING_CLOSURE: 'pending',
  PENDING_PAYMENT: 'pending',
  EXPIRING: 'pending',
  EXPIRED: 'urgent',
  DEACTIVATED: 'urgent',
  DISABLED: 'urgent',
  CLOSED: 'done',
  UPCOMING: 'pending',
  ON_HOLD: 'pending',
  WRAPPING_UP: 'done',
  PENDING_REVIEW: 'pending',
  SUBMITTED: 'pending',
  RETURNED: 'urgent',
  OVERDUE: 'urgent',
  CONFIRMED: 'active',
  PARTIAL: 'pending',
  PARTIALLY_PAID: 'pending',
  UNPAID: 'pending',
  PROCESSED: 'active',
  SUBMITTED_TO_HMO: 'pending',
  QUERIED: 'urgent',
};

export default function StatusBadge({ status }) {
  if (!status) return <Badge variant="default">—</Badge>;
  const key = String(status).toUpperCase();
  return <Badge variant={VARIANT[key] || 'default'}>{humanize(key)}</Badge>;
}

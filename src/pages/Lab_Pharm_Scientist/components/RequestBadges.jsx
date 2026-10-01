import StatusBadge from '../../../components/StatusBadge/StatusBadge';
import Badge from '../../../components/Badge/Badge';
import Icon from '../../../components/Icon/Icon';
import { isUrgent, mapsUrl, reqStatus } from '../labFields';
import l from '../Lab.module.css';

const STATUS_LABEL = (words) => ({ NEW: 'New', ACCEPTED: 'Scheduled', IN_PROGRESS: words.inProgress, COMPLETED: 'Completed', DECLINED: 'Declined' });

export function RequestStatus({ request, words }) {
  const st = reqStatus(request);
  const variant = { NEW: 'new', ACCEPTED: 'pending', IN_PROGRESS: 'active', COMPLETED: 'done', DECLINED: 'urgent' }[st];
  return variant ? <Badge variant={variant}>{STATUS_LABEL(words)[st]}</Badge> : <StatusBadge status={st} />;
}

export function Priority({ request }) {
  return isUrgent(request) ? <Badge variant="urgent">Urgent</Badge> : null;
}

export function MapsLink({ address }) {
  if (!address) return null;
  return (
    <a className={l.maps} href={mapsUrl(address)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${address} in Google Maps`}>
      <Icon name="mapPin" /> Map
    </a>
  );
}

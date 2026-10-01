import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { locationLabel } from '../../config/locations';
import { toISODate } from '../../utils/format';
import { useLab } from './useLab';
import { useRequestFlow } from './components/useRequestFlow';
import { MapsLink, Priority, RequestStatus } from './components/RequestBadges';
import { addressOf, itemsOf, patientOf, phoneOf, reqStatus, whenOf } from './labFields';
import s from '../Admin/admin.module.css';
import l from './Lab.module.css';

function dayLabel(key) {
  const today = toISODate(new Date());
  const tomorrow = toISODate(new Date(Date.now() + 86400000));
  if (key === today) return 'Today';
  if (key === tomorrow) return 'Tomorrow';
  if (key < today) return `Overdue — ${new Date(`${key}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`;
  return new Date(`${key}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* Booked collections (lab) or deliveries (pharmacy), grouped by day, with addresses. */
export default function Schedule() {
  const { kind, words, api } = useLab();
  usePageHeader(words.scheduleTitle, `Where you need to be, day by day`);
  const { toast, showToast, clearToast } = useToast();

  const { data, loading, error, reload } = useApi(() => api.requests(), `lab-requests-${kind}`);
  const flow = useRequestFlow({ api, kind, words, showToast, onChanged: reload });

  const booked = asList(data)
    .filter((r) => ['ACCEPTED', 'IN_PROGRESS'].includes(reqStatus(r)) && whenOf(r))
    .sort((a, b) => new Date(whenOf(a)) - new Date(whenOf(b)));
  const days = booked.reduce((acc, r) => {
    const k = toISODate(new Date(whenOf(r)));
    (acc[k] = acc[k] || []).push(r);
    return acc;
  }, {});

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      <div className={s.card}>
        <div className={s.cardHeader}><h3>Upcoming {words.visits}</h3><span className={s.muted} style={{ fontSize: 12 }}>{loading ? '' : `${booked.length} booked`}</span></div>
        {loading ? (
          <div className={s.emptyBlock}>Loading…</div>
        ) : !booked.length ? (
          <div className={s.emptyBlock}><Icon name="calendar" /><p>{error || `Nothing booked. Accepting a request books a ${words.visit}.`}</p></div>
        ) : (
          Object.entries(days).map(([day, list]) => (
            <div key={day}>
              <div className={l.day}>{dayLabel(day)}</div>
              <div className={l.visits}>
                {list.map((r) => (
                  <div key={r.id} className={l.visit}>
                    <div className={l.time}>{new Date(whenOf(r)).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className={l.visitBody}>
                      <h4>{patientOf(r)} <RequestStatus request={r} words={words} /><Priority request={r} /></h4>
                      <p>{addressOf(r) || 'No address on file'}{r.locationArea ? ` · ${locationLabel(r.locationArea)}` : ''}</p>
                      <p>{itemsOf(r).map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ') || '—'}</p>
                      {phoneOf(r) && <p><a href={`tel:${phoneOf(r)}`} style={{ color: '#059669', fontWeight: 600 }}>{phoneOf(r)}</a></p>}
                    </div>
                    <div className={l.visitActions}>
                      <MapsLink address={addressOf(r)} />
                      {flow.actionsFor(r)}
                      <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => flow.view(r)}>View</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      {flow.modals}
    </>
  );
}

import { useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import StatCard from '../../components/Statcard/Statcard';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { formatDay, formatMoney, pick, timeAgo, toISODate, todayLabel } from '../../utils/format';
import { useLab } from './useLab';
import { useRequestFlow } from './components/useRequestFlow';
import { MapsLink, Priority, RequestStatus } from './components/RequestBadges';
import {
  addressOf, byUrgency, dueOf, isOpen, itemsOf, num, patientOf, reqStatus, requesterOf, totalOf, whenOf,
} from './labFields';
import s from '../Admin/admin.module.css';
import l from './Lab.module.css';

const PREVIEW_ROWS = 5;
const ACTIVITY_COLORS = { NEW: '#3b82f6', REQUEST: '#3b82f6', ACCEPTED: '#f97316', COMPLETED: '#22c55e', DELIVERED: '#22c55e', RESULTS: '#22c55e', DECLINED: '#ef4444', STOCK: '#9333ea' };
const plain = (html) => String(html || '').replace(/<[^>]*>/g, '');

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const itemSummary = (r, words) => {
  const items = itemsOf(r);
  if (!items.length) return '—';
  return items.length === 1 ? items[0].name : `${items[0].name} +${items.length - 1} ${words.item}${items.length > 2 ? 's' : ''}`;
};

export default function LabDashboard() {
  const { kind, words, api, user } = useLab();
  const { setHeader, setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const summary = useApi(() => api.summary(), `lab-summary-${kind}`);
  const requests = useApi(() => api.requests(), `lab-requests-${kind}`);
  const activity = useApi(() => api.activity(6), `lab-activity-${kind}`);
  const catalogue = useApi(() => (kind === 'PHARMACY' ? api.catalogue() : Promise.resolve([])), `lab-catalogue-${kind}`);

  const flow = useRequestFlow({ api, kind, words, showToast, onChanged: () => { requests.reload(); summary.reload(); activity.reload(); } });

  useEffect(() => {
    setHeader({ title: `${words.portal.replace(' Portal', '')} Dashboard`, subtitle: todayLabel() });
  }, [setHeader, words.portal]);

  const all = asList(requests.data);
  const ready = !requests.loading && !requests.error;
  const fresh = all.filter((r) => reqStatus(r) === 'NEW').sort(byUrgency);
  const active = all.filter((r) => ['ACCEPTED', 'IN_PROGRESS'].includes(reqStatus(r)));
  const today = toISODate(new Date());
  const todays = active.filter((r) => whenOf(r) && toISODate(new Date(whenOf(r))) === today).sort((a, b) => new Date(whenOf(a)) - new Date(whenOf(b)));
  const upcoming = todays.length ? todays : active.slice().sort(byUrgency).slice(0, 4);
  const month = today.slice(0, 7);
  const doneMonth = all.filter((r) => reqStatus(r) === 'COMPLETED' && String(pick(r, 'completedAt', 'deliveredAt') || '').slice(0, 7) === month);
  const lowStock = asList(catalogue.data).filter((i) => i.stock != null && num(i.stock) <= num(pick(i, 'reorderLevel', 'minStock') ?? 10));

  useEffect(() => {
    if (ready) setBadges({ newRequests: fresh.length });
  }, [ready, fresh.length, setBadges]);

  const sm = summary.data || {};
  const newCount = pick(sm, 'newRequests') ?? (ready ? fresh.length : null);
  const inProgress = pick(sm, 'inProgress') ?? (ready ? active.length : null);
  const dueToday = pick(sm, 'dueToday') ?? (ready ? all.filter((r) => isOpen(r) && dueOf(r) && toISODate(new Date(dueOf(r))) <= today).length : null);
  const completed = pick(sm, 'completedThisMonth') ?? (ready ? doneMonth.length : null);
  const value = pick(sm, 'valueThisMonth') ?? (ready ? doneMonth.reduce((t, r) => t + totalOf(r), 0) : null);
  const show = (v, fmt = (x) => x) => (v == null ? (requests.loading || summary.loading ? '…' : '—') : fmt(v));

  const first = String(pick(user || {}, 'name') || '').trim().split(/\s+/)[0];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <section className={l.hero}>
        <div className={l.heroLeft}>
          <div className={l.heroTag}>{words.portal}</div>
          <div className={l.heroTitle}>{greeting()}{first && !first.includes('@') ? `, ${first}` : ''}</div>
          <div className={l.heroSub}>
            {requests.loading ? 'Loading your requests…' : (
              <>
                <strong>{newCount ?? '—'} new request{newCount === 1 ? '' : 's'}</strong> from the medical team and{' '}
                <strong>{todays.length} {todays.length === 1 ? words.visit : words.visits}</strong> booked for today.
              </>
            )}
          </div>
        </div>
        <div className={l.heroRight}>
          <div className={l.heroStat}><div className={l.heroVal}>{show(newCount)}</div><div className={l.heroLbl}>New</div></div>
          <div className={l.heroStat}><div className={l.heroVal}>{show(inProgress)}</div><div className={l.heroLbl}>In progress</div></div>
          <div className={l.heroStat}><div className={l.heroVal}>{show(completed)}</div><div className={l.heroLbl}>Done this month</div></div>
        </div>
      </section>

      <div className={s.stats4}>
        <StatCard accent color="blue" icon="file" label="New requests" sub="Waiting for you to accept" value={show(newCount)} />
        <StatCard accent color="red" icon="clock" label="Due today or overdue" sub="Still open" value={show(dueToday)} />
        <StatCard accent color="green" icon="check" label={`Completed (${new Date().toLocaleDateString('en-GB', { month: 'short' })})`} sub={words.doneSub} value={show(completed)} />
        <StatCard accent color="purple" icon="dollar" label="Value this month" sub="Priced for inventory" value={show(value, formatMoney)} />
      </div>

      <div className={l.grid31}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>New requests</h3><span className={s.muted} style={{ fontSize: 12 }}>Urgent first</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.previewTable}>
              <thead><tr><th>Patient</th><th>{words.Items}</th><th>From</th><th>Needed by</th><th>Actions</th></tr></thead>
              <tbody>
                {requests.loading || !fresh.length ? (
                  <tr><td colSpan={5} className={s.previewEmpty}>{requests.loading ? 'Loading…' : requests.error || 'No new requests — you’re all caught up.'}</td></tr>
                ) : fresh.slice(0, PREVIEW_ROWS).map((r) => (
                  <tr key={r.id}>
                    <td><div className={s.tdName}>{patientOf(r)} <Priority request={r} /></div></td>
                    <td>{itemSummary(r, words)}</td>
                    <td>{requesterOf(r) || '—'}</td>
                    <td className={s.muted} style={{ whiteSpace: 'nowrap' }}>{formatDay(dueOf(r))}</td>
                    <td>
                      <div className={s.actions}>
                        {flow.actionsFor(r)}
                        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => flow.view(r)}>View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link to="/lab/requests" className={l.viewAll}>All requests <Icon name="chevronRight" /></Link>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>{todays.length ? `Today’s ${words.scheduleTitle.toLowerCase()}` : `Next ${words.scheduleTitle.toLowerCase()}`}</h3><Link to="/lab/schedule">Schedule</Link></div>
          <div className={l.visits}>
            {requests.loading ? (
              <p className={s.muted} style={{ fontSize: 13 }}>Loading…</p>
            ) : !upcoming.length ? (
              <p className={s.muted} style={{ fontSize: 13 }}>Nothing booked. Accept a request to schedule a {words.visit}.</p>
            ) : upcoming.map((r) => {
              const w = whenOf(r) ? new Date(whenOf(r)) : null;
              return (
                <div key={r.id} className={l.visit}>
                  <div className={l.time}>
                    {w ? w.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    <small>{w && toISODate(w) !== today ? w.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'today'}</small>
                  </div>
                  <div className={l.visitBody}>
                    <h4>{patientOf(r)} <RequestStatus request={r} words={words} /></h4>
                    <p>{addressOf(r) || 'No address on file'}</p>
                    <p>{itemSummary(r, words)}</p>
                  </div>
                  <div className={l.visitActions}>
                    <MapsLink address={addressOf(r)} />
                    {flow.actionsFor(r)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Recent activity</h3></div>
          <div className={l.activity}>
            {activity.loading ? (
              <p className={s.muted} style={{ fontSize: 13 }}>Loading…</p>
            ) : !asList(activity.data).length ? (
              <p className={s.muted} style={{ fontSize: 13 }}>{activity.error ? 'Activity is unavailable right now.' : 'No recent activity.'}</p>
            ) : asList(activity.data).map((a, i) => (
              <div key={a.id ?? i} className={l.actItem}>
                <span className={l.actDot} style={{ background: a.color || ACTIVITY_COLORS[String(a.type).toUpperCase()] || '#8898c8' }} />
                <div className={l.actText}>{plain(pick(a, 'text', 'description', 'message'))}</div>
                <div className={l.actTime}>{a.time || timeAgo(pick(a, 'createdAt', 'timestamp'))}</div>
              </div>
            ))}
          </div>
        </div>

        {kind === 'PHARMACY' ? (
          <div className={s.card}>
            <div className={s.cardHeader}><h3>Low stock</h3><Link to="/lab/catalogue">Catalogue</Link></div>
            <div style={{ overflowX: 'auto' }}>
              <table className={s.previewTable}>
                <thead><tr><th>Drug</th><th>In stock</th><th>Reorder at</th></tr></thead>
                <tbody>
                  {catalogue.loading || !lowStock.length ? (
                    <tr><td colSpan={3} className={s.previewEmpty}>{catalogue.loading ? 'Loading…' : catalogue.error ? 'Stock is unavailable right now.' : 'Everything is well stocked.'}</td></tr>
                  ) : lowStock.slice(0, 6).map((i) => (
                    <tr key={i.id}>
                      <td className={s.tdName}>{i.name}</td>
                      <td className={l.low}>{num(i.stock)}</td>
                      <td className={s.muted}>{pick(i, 'reorderLevel', 'minStock') ?? 10}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={s.card}>
            <div className={s.cardHeader}><h3>Awaiting results</h3><span className={s.muted} style={{ fontSize: 12 }}>Samples collected</span></div>
            <div className={l.visits}>
              {!all.filter((r) => reqStatus(r) === 'IN_PROGRESS').length ? (
                <p className={s.muted} style={{ fontSize: 13 }}>{requests.loading ? 'Loading…' : 'No samples waiting for results.'}</p>
              ) : all.filter((r) => reqStatus(r) === 'IN_PROGRESS').slice(0, 5).map((r) => (
                <div key={r.id} className={l.visit}>
                  <div className={l.visitBody}>
                    <h4>{patientOf(r)} <Priority request={r} /></h4>
                    <p>{itemSummary(r, words)} · for {requesterOf(r) || 'the medical team'}</p>
                  </div>
                  <div className={l.visitActions}>{flow.actionsFor(r)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {flow.modals}
    </>
  );
}

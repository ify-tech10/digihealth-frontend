import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import StatCard from '../../components/Statcard/Statcard';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { ccsApi } from '../../Api/ccsApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/useAuth';
import { pick, timeAgo, todayLabel } from '../../utils/format';
import { useTickets } from './useTickets';
import TicketWorkspace from './components/TicketWorkspace';
import { StatusTag } from './components/TicketBadge';
import {
  isResolved, minutesLabel, patientId, patientOf, percentLabel, ticketName, ticketStamp,
  ticketTime, typeLabel,
} from './ticketFields';
import s from '../Admin/admin.module.css';
import cno from '../CNO/Cno.module.css';
import c from './Ccs.module.css';

const ACTIVITY_COLORS = {
  RESOLVED: '#22c55e', ESCALATED: '#9333ea', REPLIED: '#3b82f6', REPLY: '#3b82f6',
  NEW_TICKET: '#ef4444', URGENT: '#ef4444', LOOKUP: '#0891b2', PATIENT_LOOKUP: '#0891b2',
};

/* Activity text may arrive with <strong> tags from the old page — show it as plain text. */
const plain = (html) => String(html || '').replace(/<[^>]*>/g, '');

const isToday = (v) => v && new Date(v).toDateString() === new Date().toDateString();

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function CcsDashboard() {
  const { user } = useAuth();
  const { setHeader } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const tickets = useTickets();
  const stats = useApi(() => ccsApi.stats(), 'ccs-stats');
  const activity = useApi(() => ccsApi.activity(6), 'ccs-activity');
  const [selectedId, setSelectedId] = useState(null);
  const workspaceRef = useRef(null);

  useEffect(() => {
    setHeader({ title: 'Customer Care Dashboard', subtitle: todayLabel() });
  }, [setHeader]);

  const st = stats.data || {};
  const listReady = !tickets.loading && !tickets.error;

  /* stats from the endpoint, or worked out from the tickets we already have */
  const open = pick(st, 'open', 'openTickets') ?? (listReady ? tickets.counts.open : null);
  const urgent = pick(st, 'urgent', 'urgentTickets') ?? (listReady ? tickets.counts.urgent + tickets.counts.escalated : null);
  const resolvedToday = pick(st, 'resolved', 'resolvedToday') ??
    (listReady ? tickets.list.filter((t) => isResolved(t) && isToday(pick(t, 'resolvedAt', 'updatedAt'))).length : null);
  const avgTime = minutesLabel(pick(st, 'avgTime', 'avgFirstResponse', 'avgResponseMinutes'));
  const csat = percentLabel(pick(st, 'csat', 'satisfaction'));

  const show = (v, loading) => (v == null ? (loading ? '…' : '—') : v);
  const busy = stats.loading && tickets.loading;
  const first = String(pick(user || {}, 'name') || '').trim().split(/\s+/)[0];
  const urgentNow = listReady ? tickets.counts.urgent : null;

  const recent = tickets.list
    .slice()
    .sort((a, b) => new Date(ticketStamp(b) || 0) - new Date(ticketStamp(a) || 0))
    .slice(0, 6);

  function openFromTable(t) {
    if (t.unread) tickets.patch(t.id, { unread: false });
    setSelectedId(t.id);
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      {/* ── HERO ── */}
      <section className={cno.hero}>
        <div className={cno.heroLeft}>
          <div className={cno.heroTag}>Customer Care Portal</div>
          <div className={cno.heroTitle}>{greeting()}{first && !first.includes('@') ? `, ${first}` : ''}</div>
          <div className={cno.heroSub}>
            {tickets.loading ? 'Loading your tickets…' : (
              <>
                You have <strong>{urgentNow ?? '—'} urgent ticket{urgentNow === 1 ? '' : 's'}</strong> and{' '}
                <strong>{open ?? '—'} open conversation{open === 1 ? '' : 's'}</strong> waiting for your attention.
              </>
            )}
          </div>
        </div>
        <div className={cno.heroRight}>
          <div className={cno.heroStat}><div className={cno.heroVal}>{show(open, busy)}</div><div className={cno.heroLbl}>Open Tickets</div></div>
          <div className={cno.heroStat}><div className={cno.heroVal}>{show(resolvedToday, busy)}</div><div className={cno.heroLbl}>Resolved Today</div></div>
          <div className={cno.heroStat}><div className={cno.heroVal}>{show(avgTime, stats.loading)}</div><div className={cno.heroLbl}>Avg Response</div></div>
          <div className={cno.heroStat}><div className={cno.heroVal}>{show(csat, stats.loading)}</div><div className={cno.heroLbl}>Satisfaction</div></div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className={c.stats5}>
        <StatCard accent color="teal" icon="message" label="Open Tickets" value={show(open, busy)} />
        <StatCard accent color="red" icon="alert" label="Urgent / Escalated" value={show(urgent, busy)} />
        <StatCard accent color="green" icon="check" label="Resolved Today" value={show(resolvedToday, busy)} />
        <StatCard accent color="orange" icon="clock" label="Avg First Response" value={show(avgTime, stats.loading)} />
        <StatCard accent color="purple" icon="heart" label="CSAT Score" value={show(csat, stats.loading)} />
      </div>

      {/* ── INBOX + CONVERSATION ── */}
      <div ref={workspaceRef} style={{ scrollMarginTop: 80 }}>
        <TicketWorkspace tickets={tickets} selectedId={selectedId} onSelect={setSelectedId} showToast={showToast} />
      </div>

      {/* ── ENQUIRIES + ACTIVITY ── */}
      <div className={c.bottom}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Recent Patient Enquiries</h3><span className={c.count}>Click to open the ticket</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.previewTable}>
              <thead><tr><th>Patient</th><th>Last Contact</th><th>Issue</th><th>Status</th></tr></thead>
              <tbody>
                {tickets.loading || !recent.length ? (
                  <tr><td colSpan={4} className={s.previewEmpty}>{tickets.loading ? 'Loading…' : tickets.error || 'No enquiries yet.'}</td></tr>
                ) : (
                  recent.map((t) => (
                    <tr
                      key={t.id}
                      className={c.clickRow}
                      tabIndex={0}
                      onClick={() => openFromTable(t)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFromTable(t); } }}
                    >
                      <td><div className={s.tdName}>{ticketName(t)}</div>{patientId(patientOf(t)) && <div className={c.sub}>{patientId(patientOf(t))}</div>}</td>
                      <td className={s.muted} style={{ fontSize: 12 }}>{ticketTime(t) || '—'}</td>
                      <td>{typeLabel(t)}</td>
                      <td><StatusTag ticket={t} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Link to="/ccs/patients" className={cno.viewAll}>Patient Lookup <Icon name="chevronRight" /></Link>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>Activity Feed</h3><span className={c.count}>Your recent actions</span></div>
          <div className={cno.activity}>
            {activity.loading ? (
              <p className={s.muted} style={{ fontSize: 13 }}>Loading…</p>
            ) : !asList(activity.data).length ? (
              <p className={s.muted} style={{ fontSize: 13 }}>{activity.error ? 'Activity is unavailable right now.' : 'No recent activity.'}</p>
            ) : (
              asList(activity.data).map((a, i) => (
                <div key={a.id ?? i} className={cno.actItem}>
                  <span className={cno.actDot} style={{ background: a.color || ACTIVITY_COLORS[String(a.type).toUpperCase()] || '#8898c8' }} />
                  <div className={cno.actText}>{plain(pick(a, 'text', 'description', 'message'))}</div>
                  <div className={cno.actTime}>{a.time || timeAgo(pick(a, 'createdAt', 'timestamp'))}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

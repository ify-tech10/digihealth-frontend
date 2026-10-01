import { useState } from 'react';
import StatCard from '../../components/Statcard/Statcard';
import Icon from '../../components/Icon/Icon';
import { ccsApi } from '../../Api/ccsApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, humanize, pick, toISODate } from '../../utils/format';
import { useTickets } from './useTickets';
import { TICKET_TYPES, isResolved, minutesLabel, percentLabel, ticketStatus, ticketType } from './ticketFields';
import s from '../Admin/admin.module.css';
import cno from '../CNO/Cno.module.css';
import a from '../Caregivers/Availability.module.css';
import c from './Ccs.module.css';

const monthKey = (d) => toISODate(d).slice(0, 7);
function shiftMonth(key, n) {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
}
const dayKey = (v) => (v ? toISODate(new Date(v)) : '');

/* When the performance endpoint isn't available, count what we can from the tickets. */
function fromTickets(list, month) {
  const mine = list.filter((t) => dayKey(pick(t, 'createdAt', 'openedAt')).startsWith(month));
  const days = {};
  mine.forEach((t) => {
    const d = dayKey(pick(t, 'createdAt', 'openedAt'));
    days[d] = days[d] || { date: d, received: 0, resolved: 0 };
    days[d].received += 1;
    if (isResolved(t)) days[d].resolved += 1;
  });
  const byType = TICKET_TYPES.map(([type]) => ({ type, count: mine.filter((t) => ticketType(t) === type).length })).filter((x) => x.count);
  return {
    ticketsHandled: mine.length,
    resolved: mine.filter(isResolved).length,
    escalated: mine.filter((t) => ticketStatus(t) === 'ESCALATED').length,
    daily: Object.values(days).sort((x, y) => x.date.localeCompare(y.date)),
    byType,
  };
}

export default function MyPerformance() {
  usePageHeader('My Performance', 'Tickets you handled and how patients rated you');
  const [month, setMonth] = useState(monthKey(new Date()));
  const perf = useApi(() => ccsApi.performance(month), `ccs-perf-${month}`);
  const tickets = useTickets();

  const derived = !!perf.error;
  const d = derived ? fromTickets(tickets.list, month) : perf.data || {};
  const loading = perf.loading || (derived && tickets.loading);

  const handled = pick(d, 'ticketsHandled', 'handled', 'total');
  const resolved = pick(d, 'resolved', 'ticketsResolved');
  const escalated = pick(d, 'escalated', 'ticketsEscalated');
  const rate = handled ? Math.round(((resolved ?? 0) / handled) * 100) : null;
  const firstResp = minutesLabel(pick(d, 'avgFirstResponse', 'avgTime', 'avgResponseMinutes'));
  const resolution = minutesLabel(pick(d, 'avgResolutionTime', 'avgResolutionMinutes'));
  const csat = percentLabel(pick(d, 'csat', 'satisfaction'));

  const daily = asList(d.daily).map((x) => ({
    date: String(pick(x, 'date', 'day') || '').slice(0, 10),
    received: Number(pick(x, 'received', 'opened', 'total') ?? 0),
    resolved: Number(pick(x, 'resolved', 'closed') ?? 0),
  })).filter((x) => x.date);
  const byType = asList(d.byType).map((x) => ({ type: pick(x, 'type', 'category'), count: Number(x.count ?? 0) }));
  const feedback = asList(d.feedback);

  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const v = (x) => (loading ? '…' : x ?? '—');

  return (
    <>
      <div className={`${s.card} ${s.spaced}`}>
        <div className={a.monthBar}>
          <button type="button" className={a.navBtn} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><Icon name="chevronLeft" /></button>
          <h3>{label}</h3>
          <button type="button" className={a.navBtn} onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= monthKey(new Date())} aria-label="Next month"><Icon name="chevronRight" /></button>
        </div>
      </div>

      {derived && !loading && (
        <p className={c.perfNote}>Counted from your tickets — response times and satisfaction will appear once your performance report is available.</p>
      )}

      <div className={s.stats4}>
        <StatCard accent color="teal" icon="message" label="Tickets handled" value={v(handled)} sub={escalated ? `${escalated} escalated` : undefined} />
        <StatCard accent color="green" icon="check" label="Resolved" value={v(resolved)} sub={rate != null ? `${rate}% resolution rate` : undefined} />
        <StatCard accent color="orange" icon="clock" label="Avg first response" value={v(firstResp)} sub={resolution ? `${resolution} to resolve` : undefined} />
        <StatCard accent color="purple" icon="heart" label="CSAT score" value={v(csat)} sub={feedback.length ? `${feedback.length} rating${feedback.length === 1 ? '' : 's'}` : undefined} />
      </div>

      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Tickets per day</h3><span className={s.muted} style={{ fontSize: 12 }}>Received vs resolved</span></div>
          <DailyChart days={daily} loading={loading} />
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>By type</h3><span className={s.muted} style={{ fontSize: 12 }}>What patients contacted you about</span></div>
          <div className={s.cardBody}>
            {loading ? (
              <p className={s.muted} style={{ fontSize: 13 }}>Loading…</p>
            ) : !byType.length ? (
              <p className={s.muted} style={{ fontSize: 13 }}>No tickets this month.</p>
            ) : (
              byType
                .slice()
                .sort((x, y) => y.count - x.count)
                .map((x) => {
                  const max = Math.max(...byType.map((b) => b.count), 1);
                  const name = (TICKET_TYPES.find(([k]) => k === String(x.type).toUpperCase()) || [])[1] || humanize(x.type);
                  return (
                    <div key={x.type} className={c.barRow}>
                      <span>{name}</span>
                      <div className={c.barTrack}><div className={c.barFill} style={{ width: `${(x.count / max) * 100}%` }} /></div>
                      <span className={c.barVal}>{x.count}</span>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {!derived && (
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Patient feedback</h3><span className={s.muted} style={{ fontSize: 12 }}>After a ticket was resolved</span></div>
          <div className={c.feedback}>
            {loading ? (
              <p className={s.muted} style={{ fontSize: 13 }}>Loading…</p>
            ) : !feedback.length ? (
              <p className={s.muted} style={{ fontSize: 13 }}>No ratings this month.</p>
            ) : (
              feedback.map((f, i) => {
                const r = Math.max(0, Math.min(5, Math.round(Number(pick(f, 'rating', 'score') ?? 0))));
                return (
                  <div key={f.id ?? i} className={c.fbItem}>
                    <div className={c.fbTop}>
                      <span>{pick(f, 'patientName', 'name') || 'Patient'}</span>
                      <span className={c.stars} aria-label={`${r} out of 5`}>{'★'.repeat(r)}{'☆'.repeat(5 - r)}</span>
                    </div>
                    {pick(f, 'comment', 'text') && <div className={c.fbText}>{pick(f, 'comment', 'text')}</div>}
                    <div className={c.fbDate}>{formatDay(pick(f, 'createdAt', 'date'))}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* Resolved (fill) inside received (track), same style as the CNO visits chart. */
function DailyChart({ days, loading }) {
  if (loading) return <div className={s.emptyBlock}>Loading…</div>;
  if (!days.length) return <div className={s.emptyBlock}><Icon name="activity" /><p>No tickets this month.</p></div>;

  const peak = Math.max(1, ...days.map((x) => Math.max(x.received, x.resolved)));
  const max = Math.max(2, Math.ceil(peak / 2) * 2);
  const totals = days.reduce((t, x) => ({ r: t.r + x.received, d: t.d + x.resolved }), { r: 0, d: 0 });
  const labelEvery = days.length > 14 ? 5 : days.length > 7 ? 2 : 1;

  return (
    <div className={cno.chart}>
      <div className={cno.legend}>
        <span><i className={cno.swDone} /> Resolved ({totals.d})</span>
        <span><i className={cno.swPlan} /> Received ({totals.r})</span>
      </div>
      <div className={cno.plot}>
        <div className={cno.yAxis} aria-hidden="true"><span>{max}</span><span>{max / 2}</span><span>0</span></div>
        <div className={cno.area}>
          <div className={cno.grid} aria-hidden="true"><span /><span /><span /></div>
          <div className={cno.cols} role="list">
            {days.map((x, i) => {
              const dt = new Date(`${x.date}T00:00:00`);
              const lbl = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              const plan = Math.max(x.received, x.resolved);
              return (
                <div key={x.date} className={cno.col} role="listitem" tabIndex={0} aria-label={`${lbl}: ${x.resolved} of ${x.received} resolved`}>
                  <div className={cno.colTrack}>
                    <div className={cno.planBar} style={{ height: `${(plan / max) * 100}%` }}>
                      <div className={cno.doneBar} style={{ height: plan ? `${(x.resolved / plan) * 100}%` : 0 }} />
                    </div>
                  </div>
                  <span className={cno.tip}><strong>{lbl}</strong><br />{x.resolved} resolved · {x.received} received</span>
                  <span className={cno.xLab}>{i % labelEvery === 0 ? dt.getDate() : ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

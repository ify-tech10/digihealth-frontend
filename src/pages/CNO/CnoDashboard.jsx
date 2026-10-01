import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { adminApi } from '../../Api/adminApi';
import { cnoApi } from '../../Api/cnoApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/useAuth';
import { roleLabel } from '../../config/userRoles';
import { locationLabel } from '../../config/locations';
import { formatDate, humanize, pick, timeAgo, toISODate, todayLabel } from '../../utils/format';
import { AssignProviderModal, CareRequestModal } from '../Admin/components/CareRequestModals';
import { ApplicationModal, RejectDialog } from '../Admin/components/ApplicationModals';
import { canAssign } from '../Admin/components/status';
import { useReviewActions } from '../Admin/components/useReviewActions';
import AddProviderModal from './components/AddProviderModal';
import { load, memberColor, memberInitials, memberName, memberPatients, memberCapacity, memberRating, memberRole } from './teamFields';
import s from '../Admin/admin.module.css';
import c from './Cno.module.css';

const PREVIEW_ROWS = 5;

const ACTIVITY_COLORS = {
  APPROVAL: '#22c55e', COMPLETED: '#22c55e', VISIT_COMPLETED: '#22c55e',
  REQUEST: '#f97316', URGENT: '#ef4444',
  APPLICATION: '#9333ea',
  ASSIGNED: '#3b82f6',
  REPORT: '#0891b2',
};

/* Activity text may arrive with <strong> tags from the old page — show it as plain text. */
const plain = (html) => String(html || '').replace(/<[^>]*>/g, '');

export default function CnoDashboard() {
  const { user } = useAuth();
  const { setHeader, setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const stats = useApi(() => cnoApi.stats(), 'cno-stats');
  const apps = useApi(() => adminApi.providers('PENDING'), 'cno-apps');
  const requests = useApi(() => adminApi.careRequests('PENDING'), 'cno-requests');
  const closures = useApi(() => adminApi.careRequests('PENDING_CLOSURE'), 'cno-closures');
  const reports = useApi(() => cnoApi.visitReports({ status: 'PENDING_REVIEW' }), 'cno-reports-pending');
  const team = useApi(() => cnoApi.team(), 'cno-team');
  const activity = useApi(() => cnoApi.activity(6), 'cno-activity');

  const monthStart = toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const today = toISODate(new Date());
  const daily = useApi(() => cnoApi.dailyVisits(monthStart, today), `cno-daily-${today}`);

  const appList = asList(apps.data);
  const reqList = asList(requests.data);
  const teamList = asList(team.data);
  const closureCount = closures.error ? 0 : asList(closures.data).length;
  const reportCount = reports.error ? 0 : asList(reports.data).length;
  const st = stats.data || {};

  /* stats from the endpoint, or worked out from the lists we already have */
  const pendingApps = apps.loading ? null : appList.length;
  const openRequests = requests.loading ? null : reqList.filter((r) => String(r.status).toUpperCase() !== 'ASSIGNED').length;
  const urgent = requests.loading ? null : reqList.filter((r) => String(r.status).toUpperCase() === 'URGENT').length;
  const activeNurses = pick(st, 'activeNurses', 'heroNurses') ?? (team.loading ? null : teamList.length);
  const pendingApprovals = (pendingApps ?? 0) + closureCount + reportCount;

  useEffect(() => {
    setHeader({ title: `${roleLabel(user?.role)} Dashboard`, subtitle: todayLabel() });
  }, [setHeader, user?.role]);

  useEffect(() => {
    setBadges({ applications: pendingApps ?? 0, careRequests: (openRequests ?? 0) + closureCount, reports: reportCount });
  }, [pendingApps, openRequests, closureCount, reportCount, setBadges]);

  /* ── actions ── */
  const review = useReviewActions({
    approveFn: adminApi.approveProvider,
    rejectFn: adminApi.rejectProvider,
    nameOf: (a) => a.fullName,
    onChanged: () => { apps.reload(); team.reload(); },
    showToast,
  });
  const [viewApp, setViewApp] = useState(null);
  const [viewReq, setViewReq] = useState(null);
  const [assignFor, setAssignFor] = useState(null);
  const [adding, setAdding] = useState(false);

  const show = (state, v, fmt = (x) => x) => (state.loading && v == null ? '…' : v == null ? '—' : fmt(v));
  const firstName = String(pick(user || {}, 'name') || '').trim();

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      {/* ── WELCOME HERO ── */}
      <section className={c.hero}>
        <div className={c.heroLeft}>
          <div className={c.heroTag}>{roleLabel(user?.role)} Portal</div>
          <div className={c.heroTitle}>Welcome{firstName && !firstName.includes('@') ? `, ${firstName}` : ''}</div>
          <div className={c.heroSub}>
            You have <strong>{pendingApps ?? '…'} provider application{pendingApps === 1 ? '' : 's'}</strong>,{' '}
            <strong>{openRequests ?? '…'} service request{openRequests === 1 ? '' : 's'}</strong> and{' '}
            <strong>{closureCount + reportCount} sign-off{closureCount + reportCount === 1 ? '' : 's'}</strong> awaiting your review.
          </div>
        </div>
        <div className={c.heroRight}>
          <div className={c.heroStat}><div className={c.heroVal}>{show(team, activeNurses)}</div><div className={c.heroLbl}>Active Nurses</div></div>
          <div className={c.heroStat}><div className={c.heroVal}>{show(stats, pick(st, 'visitsToday', 'heroVisits'))}</div><div className={c.heroLbl}>Visits Today</div></div>
          <div className={c.heroStat}><div className={c.heroVal}>{apps.loading ? '…' : pendingApprovals}</div><div className={c.heroLbl}>Pending Approvals</div></div>
          <div className={c.heroStat}><div className={c.heroVal}>{show(stats, pick(st, 'avgRating'), (v) => `${v}★`)}</div><div className={c.heroLbl}>Team Rating</div></div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className={c.stats}>
        <StatCard accent color="teal" icon="users" label="Active Caregivers" sub="Nurses, caregivers & doctors" value={show(team, activeNurses)} />
        <StatCard accent color="green" icon="activity" label="Visits Today" sub="Across all zones" value={show(stats, pick(st, 'visitsToday'))} />
        <StatCard accent color="purple" icon="userPlus" label="Pending Applications" sub="Awaiting your approval" value={show(apps, pendingApps)} />
        <StatCard accent color="orange" icon="file" label="Open Care Requests" sub="Needing assignment" value={show(requests, openRequests)} />
        <StatCard accent color="blue" icon="users" label="Active Patients" sub="Under nursing care" value={show(stats, pick(st, 'activePatients'))} />
        <StatCard accent color="red" icon="bell" label="Urgent Requests" sub="Requires immediate action" value={show(requests, pick(st, 'urgentRequests') ?? urgent)} />
        <StatCard accent color="green" icon="check" label="Visit Completion Rate" sub="This month" value={show(stats, pick(st, 'completionRate'), (v) => `${v}%`)} />
        <StatCard accent color="teal" icon="heart" label="Avg. Team Rating" sub="Patient satisfaction" value={show(stats, pick(st, 'avgRating'), (v) => `${v}★`)} />
      </div>

      {/* ── APPLICATIONS + QUICK ACTIONS ── */}
      <div className={c.grid31}>
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3>Provider Applications — Pending Approval</h3>
            <span className={s.muted} style={{ fontSize: 12 }}>{apps.loading ? '' : `${appList.length} pending`}</span>
          </div>
          <PreviewTable
            state={apps}
            rows={appList}
            empty="No pending applications."
            head={['Applicant', 'Role', 'Experience', 'Coverage', 'Actions']}
            row={(a) => (
              <tr key={a.id}>
                <td className={s.tdName}>{a.fullName}<small>{a.email}</small></td>
                <td>{humanize(a.serviceProviderType)}</td>
                <td>{pick(a, 'yearsOfExperience', 'experience') || '—'}</td>
                <td>{locationLabel(a.locationArea)}</td>
                <td>
                  <div className={s.actions}>
                    <button type="button" className={`${s.btn} ${s.btnApprove}`} disabled={review.busyId === a.id} onClick={() => review.approve(a)}>
                      {review.busyId === a.id ? 'Working…' : 'Approve'}
                    </button>
                    <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewApp(a)}>View</button>
                    <button type="button" className={`${s.btn} ${s.btnDanger}`} disabled={review.busyId === a.id} onClick={() => review.setRejecting(a)}>Reject</button>
                  </div>
                </td>
              </tr>
            )}
          />
          <Link to="/cno/applications" className={c.viewAll}>View All Applications <Icon name="chevronRight" /></Link>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>Quick Actions</h3></div>
          <div className={c.quick}>
            <button type="button" className={c.qa} onClick={() => setAdding(true)}>
              <div className={c.qaIcon}><Icon name="userPlus" /></div>
              <div><div className={c.qaLabel}>Add Provider</div><div className={c.qaSub}>Create nurse / caregiver</div></div>
            </button>
            <Link to="/cno/requests" className={c.qa}>
              <div className={c.qaIcon}><Icon name="calendar" /></div>
              <div><div className={c.qaLabel}>Assign Request</div><div className={c.qaSub}>Match patient to nurse</div></div>
            </Link>
            <Link to="/cno/schedule" className={c.qa}>
              <div className={c.qaIcon}><Icon name="activity" /></div>
              <div><div className={c.qaLabel}>View Schedule</div><div className={c.qaSub}>Team daily schedule</div></div>
            </Link>
            <Link to="/cno/exports" className={c.qa}>
              <div className={c.qaIcon}><Icon name="download" /></div>
              <div><div className={c.qaLabel}>Export Report</div><div className={c.qaSub}>Visits & performance</div></div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── REQUESTS + ACTIVITY ── */}
      <div className={c.grid31}>
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3>Incoming Care Requests</h3>
            <span className={s.muted} style={{ fontSize: 12 }}>
              {requests.loading ? '' : `${openRequests} open`}{closureCount ? ` · ${closureCount} awaiting closure` : ''}
            </span>
          </div>
          <PreviewTable
            state={requests}
            rows={reqList}
            empty="No open requests."
            head={['Patient', 'Service', 'Location', 'Received', 'Status', 'Actions']}
            row={(r) => (
              <tr key={r.id}>
                <td className={s.tdName}>{r.fullName}</td>
                <td>{humanize(r.serviceNeeded)}</td>
                <td>{locationLabel(r.locationArea)}</td>
                <td className={s.muted}>{formatDate(r.submittedAt)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <div className={s.actions}>
                    {canAssign(r) && <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setAssignFor(r)}>Assign</button>}
                    <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewReq(r)}>View</button>
                  </div>
                </td>
              </tr>
            )}
          />
          <Link to={closureCount ? '/cno/requests?status=PENDING_CLOSURE' : '/cno/requests'} className={c.viewAll}>
            {closureCount ? `Review ${closureCount} closure${closureCount === 1 ? '' : 's'} & all requests` : 'View All Requests'} <Icon name="chevronRight" />
          </Link>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>Recent Activity</h3><span className={s.muted} style={{ fontSize: 12 }}>Live feed</span></div>
          <div className={c.activity}>
            {activity.loading ? (
              <p className={s.muted} style={{ fontSize: 13 }}>Loading…</p>
            ) : !asList(activity.data).length ? (
              <p className={s.muted} style={{ fontSize: 13 }}>{activity.error ? 'Activity is unavailable right now.' : 'No recent activity.'}</p>
            ) : (
              asList(activity.data).map((a, i) => (
                <div key={a.id ?? i} className={c.actItem}>
                  <span className={c.actDot} style={{ background: a.color || ACTIVITY_COLORS[String(a.type).toUpperCase()] || '#8898c8' }} />
                  <div className={c.actText}>{plain(pick(a, 'text', 'description', 'message'))}</div>
                  <div className={c.actTime}>{a.time || timeAgo(pick(a, 'createdAt', 'timestamp'))}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── TEAM WORKLOAD + VISITS CHART ── */}
      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Team Workload</h3><span className={s.muted} style={{ fontSize: 12 }}>Active caregivers</span></div>
          <div className={c.nurseList}>
            {team.loading ? (
              <p className={s.muted} style={{ fontSize: 13 }}>Loading…</p>
            ) : !teamList.length ? (
              <p className={s.muted} style={{ fontSize: 13 }}>{team.error || 'No active personnel found.'}</p>
            ) : (
              teamList
                .slice()
                .sort((a, b) => load(b).pct - load(a).pct)
                .slice(0, 5)
                .map((n) => {
                  const l = load(n);
                  return (
                    <div key={n.id} className={c.nurse}>
                      <div className={c.nurseAv} style={{ background: memberColor(n) }}>{memberInitials(n)}</div>
                      <div className={c.nurseInfo}>
                        <h4>{memberName(n)}</h4>
                        <p>{memberRole(n)} · {l.label}</p>
                        <div className={c.bar} title={`${l.pct}% of capacity`}><div className={c.barFill} style={{ width: `${l.pct}%`, background: l.color }} /></div>
                      </div>
                      <div className={c.nurseStat}>
                        <div className={c.nurseVal}>{memberPatients(n)}/{memberCapacity(n)}</div>
                        <div className={c.nurseLbl}>patients</div>
                        <div className={c.rating}>{memberRating(n) > 0 ? `${memberRating(n).toFixed(1)}★` : '—'}</div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
          <Link to="/cno/personnel" className={c.viewAll}>Manage Personnel <Icon name="chevronRight" /></Link>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3>Visit Completion — This Month</h3>
            <span className={s.muted} style={{ fontSize: 12 }}>Daily visits logged</span>
          </div>
          <VisitsChart state={daily} />
        </div>
      </div>

      {/* ── MODALS ── */}
      <ApplicationModal
        application={viewApp}
        busy={review.busyId === viewApp?.id}
        onClose={() => setViewApp(null)}
        onApprove={async (a) => { if (await review.approve(a)) setViewApp(null); }}
        onReject={(a) => { setViewApp(null); review.setRejecting(a); }}
      />
      <RejectDialog
        key={review.rejecting?.id ?? 'none'}
        target={review.rejecting}
        name={review.rejecting?.fullName}
        busy={review.busyId === review.rejecting?.id}
        onClose={() => review.setRejecting(null)}
        onConfirm={(a, reason) => review.reject(a, reason)}
      />
      <CareRequestModal
        request={viewReq}
        onClose={() => setViewReq(null)}
        onAssign={(r) => { setViewReq(null); setAssignFor(r); }}
      />
      <AssignProviderModal
        request={assignFor}
        onClose={() => setAssignFor(null)}
        onDone={(msg) => { setAssignFor(null); showToast('success', msg); requests.reload(); team.reload(); }}
      />
      <AddProviderModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(msg) => { setAdding(false); showToast('success', msg); team.reload(); }}
      />
    </>
  );
}

function PreviewTable({ state, rows, empty, head, row }) {
  let msg = '';
  if (state.loading) msg = 'Loading…';
  else if (state.error && !rows.length) msg = state.error;
  else if (!rows.length) msg = empty;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className={s.previewTable}>
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {msg ? (
            <tr><td colSpan={head.length} className={s.previewEmpty}>{msg}</td></tr>
          ) : (
            rows.slice(0, PREVIEW_ROWS).map(row)
          )}
        </tbody>
      </table>
    </div>
  );
}

/* Completed visits drawn inside each day's scheduled total. */
function VisitsChart({ state }) {
  const days = useMemo(
    () =>
      asList(state.data).map((d) => ({
        date: String(pick(d, 'date', 'day') || '').slice(0, 10),
        scheduled: Number(pick(d, 'scheduled', 'scheduledVisits', 'total') ?? 0),
        completed: Number(pick(d, 'completed', 'completedVisits') ?? 0),
      })).filter((d) => d.date),
    [state.data]
  );

  if (state.loading) return <div className={s.emptyBlock}>Loading…</div>;
  if (!days.length) return <div className={s.emptyBlock}><Icon name="activity" /><p>{state.error ? 'Visit data is unavailable right now.' : 'No visits logged this month yet.'}</p></div>;

  const peak = Math.max(1, ...days.map((d) => Math.max(d.scheduled, d.completed)));
  const max = Math.ceil(peak / 5) * 5;
  const totals = days.reduce((t, d) => ({ s: t.s + d.scheduled, c: t.c + d.completed }), { s: 0, c: 0 });
  const labelEvery = days.length > 14 ? 5 : days.length > 7 ? 2 : 1;

  return (
    <div className={c.chart}>
      <div className={c.legend}>
        <span><i className={c.swDone} /> Completed ({totals.c})</span>
        <span><i className={c.swPlan} /> Scheduled ({totals.s})</span>
        <span className={s.muted}>{totals.s ? `${Math.round((totals.c / totals.s) * 100)}% completed` : ''}</span>
      </div>
      <div className={c.plot}>
        <div className={c.yAxis} aria-hidden="true"><span>{max}</span><span>{max / 2}</span><span>0</span></div>
        <div className={c.area}>
          <div className={c.grid} aria-hidden="true"><span /><span /><span /></div>
          <div className={c.cols} role="list">
            {days.map((d, i) => {
              const dt = new Date(`${d.date}T00:00:00`);
              const label = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              const plan = Math.max(d.scheduled, d.completed);
              return (
                <div key={d.date} className={c.col} role="listitem" tabIndex={0} aria-label={`${label}: ${d.completed} of ${d.scheduled} visits completed`}>
                  <div className={c.colTrack}>
                    <div className={c.planBar} style={{ height: `${(plan / max) * 100}%` }}>
                      <div className={c.doneBar} style={{ height: plan ? `${(d.completed / plan) * 100}%` : 0 }} />
                    </div>
                  </div>
                  <span className={c.tip}><strong>{label}</strong><br />{d.completed} completed · {d.scheduled} scheduled</span>
                  <span className={c.xLab}>{i % labelEvery === 0 ? dt.getDate() : ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

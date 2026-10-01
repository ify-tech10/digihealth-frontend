import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import StatCard from '../../components/Statcard/Statcard';
import Badge from '../../components/Badge/Badge';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Pagination from '../../components/Pagination/Pagination';
import Icon from '../../components/Icon/Icon';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { locationLabel } from '../../config/locations';
import { paginate } from '../../utils/paginate';
import { formatDate, humanize, initials, pick, timeAgo, toISODate, todayLabel } from '../../utils/format';
import { AssignProviderModal, CareRequestModal } from './components/CareRequestModals';
import { ApplicationModal, RejectDialog } from './components/ApplicationModals';
import { canAssign, isActiveRecord } from './components/status';
import { useReviewActions } from './components/useReviewActions';
import s from './admin.module.css';
import styles from './AdminDashboard.module.css';

const CARE_PAGE_SIZE = 3;
const APP_PAGE_SIZE = 3;
const POLL_MS = 30000;

const workloadOf = (p) => {
  const n = pick(p, 'activePatientCount', 'assignedRequestCount', 'activeRequestCount', 'patientCount');
  return n == null ? null : Number(n);
};

export default function AdminDashboard() {
  usePageHeader('Admin Dashboard', todayLabel());
  const { setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  /* ── everything the admin oversees ── */
  const care = useApi(() => adminApi.careRequests('PENDING'), 'dash-care');
  const apps = useApi(() => adminApi.providers('PENDING'), 'dash-apps');
  const personnel = useApi(() => adminApi.providers('APPROVED'), 'dash-personnel');
  const patients = useApi(() => adminApi.patients(), 'dash-patients');
  const visits = useApi(() => adminApi.visits(toISODate(new Date())), 'dash-visits');
  const closures = useApi(() => adminApi.careRequests('PENDING_CLOSURE'), 'dash-closures');
  const hmo = useApi(() => adminApi.hmoApplications('PENDING'), 'dash-hmo');
  const finance = useApi(() => adminApi.financialRequests('PENDING'), 'dash-finance');
  const invoices = useApi(() => adminApi.invoices('PENDING'), 'dash-invoices');

  const careRequests = asList(care.data);
  const applications = asList(apps.data);
  const approved = asList(personnel.data);

  const [carePage, setCarePage] = useState(1);
  const [appPage, setAppPage] = useState(1);
  const [viewRequest, setViewRequest] = useState(null);
  const [assignFor, setAssignFor] = useState(null);
  const [viewApp, setViewApp] = useState(null);

  const review = useReviewActions({
    approveFn: adminApi.approveProvider,
    rejectFn: adminApi.rejectProvider,
    nameOf: (a) => a.fullName,
    onChanged: () => { apps.reload(); personnel.reload(); },
    showToast,
  });

  /* refresh care requests every 30s */
  const reloadCare = care.reload;
  useEffect(() => {
    const t = setInterval(reloadCare, POLL_MS);
    return () => clearInterval(t);
  }, [reloadCare]);

  /* approval queues (null = endpoint unavailable) */
  const queue = (state) => (state.loading || state.error ? null : asList(state.data).length);
  const approvals = [
    { key: 'applications', label: 'Provider applications', icon: 'userPlus', to: '/admin/applications', count: queue(apps) },
    { key: 'closures', label: 'Request closures', icon: 'check', to: '/admin/care-requests?status=PENDING_CLOSURE', count: queue(closures) },
    { key: 'financial', label: 'Financial requests', icon: 'dollar', to: '/admin/financial-requests', count: queue(finance) },
    { key: 'invoices', label: 'Facility invoices', icon: 'file', to: '/admin/financial-requests', count: queue(invoices) },
    { key: 'hmo', label: 'HMO onboarding', icon: 'briefcase', to: '/admin/hmo-coverage', count: queue(hmo) },
  ];
  const totalApprovals = approvals.reduce((t, a) => t + (a.count || 0), 0);

  /* sidebar badges */
  const counts = Object.fromEntries(approvals.map((a) => [a.key, a.count || 0]));
  const careCount = careRequests.length;
  useEffect(() => {
    setBadges({
      careRequests: careCount + counts.closures,
      applications: counts.applications,
      financial: counts.financial + counts.invoices,
      hmo: counts.hmo,
    });
  }, [careCount, counts.closures, counts.applications, counts.financial, counts.invoices, counts.hmo, setBadges]);

  const safeCarePage = Math.min(carePage, Math.max(1, Math.ceil(careRequests.length / CARE_PAGE_SIZE)));
  const safeAppPage = Math.min(appPage, Math.max(1, Math.ceil(applications.length / APP_PAGE_SIZE)));

  const statValue = (state, n) => (state.loading ? '…' : state.error ? '—' : n);
  const activePatients = asList(patients.data).filter(isActiveRecord).length;

  const workload = useMemo(() => {
    const withCounts = approved.filter((p) => workloadOf(p) !== null);
    const list = withCounts.length ? withCounts.sort((a, b) => workloadOf(b) - workloadOf(a)) : approved;
    return list.slice(0, 5);
  }, [approved]);

  /* recent activity from live data */
  const activity = useMemo(() => {
    const items = [
      ...careRequests.map((r) => ({
        key: `req-${r.id}`,
        icon: 'file',
        title: `New care request from ${r.fullName}`,
        detail: [humanize(r.serviceNeeded), locationLabel(r.locationArea)].filter((x) => x !== '—').join(' · '),
        at: r.submittedAt,
        status: r.status,
      })),
      ...applications.map((a) => ({
        key: `app-${a.id}`,
        icon: 'userPlus',
        title: `New service provider application — ${a.fullName}`,
        detail: humanize(a.serviceProviderType),
        at: a.appliedAt,
        badge: 'Review',
      })),
    ];
    return items
      .filter((i) => i.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 5);
  }, [careRequests, applications]);

  function tableMessage(state, list, cols, empty) {
    let msg = '';
    if (state.loading) msg = 'Loading…';
    else if (state.error && !list.length) msg = state.error;
    else if (!list.length) msg = empty;
    return msg ? <tr><td colSpan={cols} className={styles.empty}>{msg}</td></tr> : null;
  }

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      {/* ── STATS ── */}
      <div className={styles.statsRow}>
        <StatCard
          label="New Requests" icon="file" color="blue"
          value={statValue(care, careRequests.length)}
          delta={careRequests.length ? 'pending' : undefined}
        />
        <StatCard label="Active Patients" icon="users" color="green" value={statValue(patients, activePatients)} />
        <StatCard label="Active Personnel" icon="heart" color="purple" value={statValue(personnel, approved.length)} />
        <StatCard label="Visits Today" icon="calendar" color="orange" value={statValue(visits, asList(visits.data).length)} />
        <StatCard
          label="Awaiting your approval" icon="check" color="red"
          value={totalApprovals}
          delta={totalApprovals ? 'action needed' : undefined}
          deltaType="down"
        />
      </div>

      {/* ── CARE REQUESTS ── */}
      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.cardHeader}>
          <h3>Incoming Care Requests</h3>
          <Link to="/admin/care-requests">View all</Link>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Patient</th><th>Service</th><th>Location</th><th>Received</th>
                <th>Pref. Contact Time</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableMessage(care, careRequests, 7, 'No pending requests.') ||
                paginate(careRequests, safeCarePage, CARE_PAGE_SIZE).map((req) => (
                  <tr key={req.id}>
                    <td className={s.tdName}>{req.fullName}<small>{req.email}</small></td>
                    <td>{humanize(req.serviceNeeded)}</td>
                    <td>{locationLabel(req.locationArea)}</td>
                    <td>{formatDate(req.submittedAt)}</td>
                    <td>{humanize(req.preferredContactTime)}</td>
                    <td><StatusBadge status={req.status} /></td>
                    <td>
                      <div className={s.actions}>
                        {canAssign(req) && (
                          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setAssignFor(req)}>Assign</button>
                        )}
                        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewRequest(req)}>View</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination page={safeCarePage} totalItems={careRequests.length} pageSize={CARE_PAGE_SIZE} onChange={setCarePage} />
      </div>

      <div className={s.grid2}>
        {/* ── APPLICATIONS ── */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3>Service Provider Applications</h3>
            <Link to="/admin/applications">View all</Link>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Applicant</th><th>Role</th><th>Submitted</th><th>Action</th></tr>
              </thead>
              <tbody>
                {tableMessage(apps, applications, 4, 'No pending applications.') ||
                  paginate(applications, safeAppPage, APP_PAGE_SIZE).map((app) => (
                    <tr key={app.id}>
                      <td className={s.tdName}>{app.fullName}<small>{app.email}</small></td>
                      <td>{humanize(app.serviceProviderType)}</td>
                      <td>{formatDate(app.appliedAt)}</td>
                      <td>
                        <div className={s.actions}>
                          <button
                            type="button"
                            className={`${s.btn} ${s.btnApprove}`}
                            onClick={() => review.approve(app)}
                            disabled={review.busyId === app.id}
                          >
                            {review.busyId === app.id ? 'Approving…' : 'Approve'}
                          </button>
                          <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewApp(app)}>View</button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <Pagination page={safeAppPage} totalItems={applications.length} pageSize={APP_PAGE_SIZE} onChange={setAppPage} />
        </div>

        {/* ── NEEDS YOUR APPROVAL ── */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3>Needs Your Approval</h3>
            <span className={s.muted} style={{ fontSize: 12.5 }}>{totalApprovals} waiting</span>
          </div>
          {approvals.map((a) => (
            <Link key={a.key} to={a.to} className={styles.queueItem}>
              <div className={styles.activityIcon}><Icon name={a.icon} /></div>
              <span className={styles.queueLabel}>{a.label}</span>
              {a.count === null ? (
                <span className={s.muted} style={{ fontSize: 12 }}>—</span>
              ) : (
                <span className={a.count ? styles.queueCount : styles.queueZero}>{a.count}</span>
              )}
              <Icon name="chevronRight" className={styles.queueArrow} />
            </Link>
          ))}
        </div>
      </div>

      <div className={s.grid2}>
        {/* ── PERSONNEL WORKLOAD ── */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3>Personnel Workload</h3>
            <Link to="/admin/personnel">Manage</Link>
          </div>
          {personnel.loading ? (
            <div className={s.emptyBlock}>Loading…</div>
          ) : !workload.length ? (
            <div className={s.emptyBlock}>
              <Icon name="heart" />
              <p>{personnel.error || 'No approved personnel yet.'}</p>
            </div>
          ) : (
            workload.map((p) => (
              <div key={p.id} className={styles.cgItem}>
                <div className={s.avatar}>{initials(p.fullName)}</div>
                <div className={styles.activityInfo}>
                  <h4>{p.fullName}</h4>
                  <p>{humanize(p.serviceProviderType)} · {locationLabel(p.locationArea)}</p>
                </div>
                <div className={styles.load}>
                  <strong>{workloadOf(p) ?? '—'}</strong>
                  <span>patients</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── RECENT ACTIVITY ── */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3>Recent Activity</h3>
            <Link to="/admin/activity">Full log</Link>
          </div>
          {activity.length === 0 ? (
            <div className={s.emptyBlock}>
              <Icon name="activity" />
              <p>{care.loading || apps.loading ? 'Loading…' : 'No recent activity.'}</p>
            </div>
          ) : (
            activity.map((item) => (
              <div key={item.key} className={styles.activityItem}>
                <div className={styles.activityIcon}><Icon name={item.icon} /></div>
                <div className={styles.activityInfo}>
                  <h4>{item.title}</h4>
                  {item.detail && <p>{item.detail}</p>}
                  <div className={styles.activityTime}>{timeAgo(item.at)}</div>
                </div>
                {item.badge ? <Badge variant="new">{item.badge}</Badge> : <StatusBadge status={item.status} />}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      <CareRequestModal
        request={viewRequest}
        onClose={() => setViewRequest(null)}
        onAssign={(r) => { setViewRequest(null); setAssignFor(r); }}
      />
      <AssignProviderModal
        request={assignFor}
        onClose={() => setAssignFor(null)}
        onDone={(msg) => { setAssignFor(null); showToast('success', msg); care.reload(); }}
      />
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
    </>
  );
}

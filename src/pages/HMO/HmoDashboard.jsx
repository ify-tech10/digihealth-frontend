import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { hmoApi } from '../../Api/hmoApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { pick, todayLabel } from '../../utils/format';
import { RejectDialog } from '../Admin/components/ApplicationModals';
import UploadPanel from './components/UploadPanel';
import { EmployeeModal, PlanSummary } from './components/HmoParts';
import { useEmployeeActions } from './useEmployeeActions';
import { employeeName, employeeStatus } from './hmoFields';
import s from '../Admin/admin.module.css';
import h from './Hmo.module.css';

const PREVIEW_ROWS = 6;

export default function HmoDashboard() {
  const { setHeader, setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const summary = useApi(() => hmoApi.summary(), 'hmo-summary');
  const employees = useApi(() => hmoApi.employees(), 'hmo-employees');
  const subscription = useApi(() => hmoApi.subscription(), 'hmo-subscription');
  const [viewing, setViewing] = useState(null);

  const actions = useEmployeeActions({ showToast, onChanged: () => { employees.reload(); summary.reload(); setViewing(null); } });

  const list = asList(employees.data);
  const listReady = !employees.loading && !employees.error;
  const sm = summary.data || {};
  const registered = pick(sm, 'registered') ?? (listReady ? list.filter((e) => employeeStatus(e) === 'REGISTERED').length : null);
  const total = pick(sm, 'totalEmployees', 'total') ?? (listReady ? list.filter((e) => employeeStatus(e) !== 'INACTIVE').length : null);
  const pending = pick(sm, 'pending') ?? (listReady ? list.filter((e) => employeeStatus(e) === 'PENDING').length : null);
  const uploads = pick(sm, 'newUploads', 'uploadsThisMonth');

  useEffect(() => {
    setHeader({ title: 'HMO Admin Dashboard', subtitle: todayLabel() });
  }, [setHeader]);
  useEffect(() => {
    if (pending != null) setBadges({ pending });
  }, [pending, setBadges]);

  const show = (v, loading) => (v == null ? (loading ? '…' : '—') : v);
  const busy = summary.loading && employees.loading;

  /* pending registrations first, then newest */
  const rows = list
    .filter((e) => employeeStatus(e) !== 'INACTIVE')
    .sort((a, b) => (employeeStatus(b) === 'PENDING') - (employeeStatus(a) === 'PENDING') ||
      new Date(pick(b, 'createdAt') || 0) - new Date(pick(a, 'createdAt') || 0));

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.stats4}>
        <StatCard color="blue" icon="check" label="Registered" value={show(registered, busy)} />
        <StatCard color="green" icon="users" label="Total employees" value={show(total, busy)} />
        <StatCard color="purple" icon="clock" label="Pending registration" value={show(pending, busy)} />
        <StatCard color="orange" icon="file" label="New uploads this month" value={show(uploads, summary.loading)} />
      </div>

      <div className={h.grid21}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Upload employee list</h3><Link to="/hmo-dashboard/uploads">Upload history</Link></div>
          <div className={s.cardBody}>
            <p className={s.hint} style={{ marginBottom: 12 }}>Add employees in bulk from a CSV or Excel file. Each person gets an email to finish registering.</p>
            <UploadPanel
              existingEmails={list.map((e) => e.email).filter(Boolean)}
              onUploaded={() => { employees.reload(); summary.reload(); }}
            />
          </div>
        </div>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Your plan</h3></div>
          <PlanSummary state={subscription} compact />
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardHeader}><h3>Employee records</h3><Link to="/hmo-dashboard/employees">View all</Link></div>
        <div style={{ overflowX: 'auto' }}>
          <table className={s.previewTable}>
            <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {employees.loading || !rows.length ? (
                <tr><td colSpan={5} className={s.previewEmpty}>{employees.loading ? 'Loading…' : employees.error || 'No employees yet — upload your list above.'}</td></tr>
              ) : (
                rows.slice(0, PREVIEW_ROWS).map((e) => (
                  <tr key={e.id}>
                    <td className={s.tdName}>{employeeName(e)}</td>
                    <td>{e.email}</td>
                    <td>{e.department || '—'}</td>
                    <td><StatusBadge status={employeeStatus(e)} /></td>
                    <td>
                      <div className={s.actions}>
                        {employeeStatus(e) === 'PENDING' && (
                          <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={actions.inviting === e.id} onClick={() => actions.invite(e)}>
                            {actions.inviting === e.id ? 'Sending…' : 'Re-send invite'}
                          </button>
                        )}
                        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(e)}>View</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {rows.length > PREVIEW_ROWS && (
          <Link to="/hmo-dashboard/employees" className={`${s.btn} ${s.btnView}`} style={{ margin: 12, justifyContent: 'center', display: 'flex' }}>
            See all {rows.length} employees <Icon name="chevronRight" />
          </Link>
        )}
      </div>

      <EmployeeModal
        employee={viewing}
        busy={actions.inviting === viewing?.id}
        onClose={() => setViewing(null)}
        onInvite={actions.invite}
        onDeactivate={(e) => { setViewing(null); actions.setRemoving(e); }}
      />
      <RejectDialog
        key={actions.removing?.id ?? 'none'}
        target={actions.removing}
        title="Remove from plan"
        message={actions.removing ? `Remove ${employeeName(actions.removing)} from the HMO plan? They won’t be able to book covered care.` : ''}
        confirmLabel="Remove"
        busy={actions.busy}
        onClose={() => actions.setRemoving(null)}
        onConfirm={actions.remove}
      />
    </>
  );
}

import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { hmoApi } from '../../Api/hmoApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatMoney, matches, pick } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { SearchBox, Tabs } from '../Admin/components/Common';
import { RejectDialog } from '../Admin/components/ApplicationModals';
import { AddEmployeeModal, EmployeeModal, RegistrationChecks } from './components/HmoParts';
import { useEmployeeActions } from './useEmployeeActions';
import { consentDone, employeeName, employeeStatus, employeeUsed, nextOfKinDone } from './hmoFields';
import s from '../Admin/admin.module.css';

const TABS = [
  ['ALL', 'All'],
  ['REGISTERED', 'Registered'],
  ['PENDING', 'Pending'],
  ['INACTIVE', 'Removed'],
];

export default function Employees() {
  usePageHeader('Employees', 'Staff covered by your HMO plan');
  const { setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const [tab, setTab] = useState('ALL');
  const [dept, setDept] = useState('');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [adding, setAdding] = useState(false);

  const { data, loading, error, reload } = useApi(() => hmoApi.employees(), 'hmo-employees');
  const all = asList(data);
  const pending = all.filter((e) => employeeStatus(e) === 'PENDING').length;
  const actions = useEmployeeActions({ showToast, onChanged: () => { reload(); setViewing(null); } });

  useEffect(() => {
    if (!loading && !error) setBadges({ pending });
  }, [loading, error, pending, setBadges]);

  const depts = [...new Set(all.map((e) => e.department).filter(Boolean))].sort();
  const inTab = (e) => (tab === 'ALL' ? employeeStatus(e) !== 'INACTIVE' : employeeStatus(e) === tab);
  const rows = all
    .filter((e) => inTab(e) && (!dept || e.department === dept) && matches(query, employeeName(e), e.email, pick(e, 'staffId', 'employeeId'), pick(e, 'phone', 'phoneNumber')))
    .sort((a, b) => employeeName(a).localeCompare(employeeName(b)));

  function exportCsv() {
    downloadCsv(
      'employees.csv',
      ['Name', 'Email', 'Phone', 'Department', 'Staff ID', 'Status', 'Next of kin', 'Consent', 'Benefit used'],
      rows.map((e) => [employeeName(e), e.email, pick(e, 'phone', 'phoneNumber'), e.department, pick(e, 'staffId', 'employeeId'), employeeStatus(e), nextOfKinDone(e) ? 'Yes' : 'No', consentDone(e) ? 'Yes' : 'No', employeeUsed(e)])
    );
  }

  const columns = [
    { key: 'name', header: 'Name', render: (e) => <div className={s.tdName}>{employeeName(e)}<small>{pick(e, 'staffId', 'employeeId') || e.email}</small></div> },
    { key: 'email', header: 'Email', render: (e) => e.email || '—' },
    { key: 'dept', header: 'Department', render: (e) => e.department || '—' },
    { key: 'reg', header: 'Registration', render: (e) => <RegistrationChecks employee={e} /> },
    { key: 'used', header: 'Benefit used', align: 'right', render: (e) => <span className={s.money}>{formatMoney(employeeUsed(e))}</span> },
    { key: 'status', header: 'Status', render: (e) => <StatusBadge status={employeeStatus(e)} /> },
    { key: 'actions', header: 'Actions', render: (e) => (
      <div className={s.actions} style={{ flexWrap: 'nowrap' }}>
        {employeeStatus(e) === 'PENDING' && (
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={actions.inviting === e.id} onClick={() => actions.invite(e)}>
            {actions.inviting === e.id ? 'Sending…' : 'Re-send invite'}
          </button>
        )}
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(e)}>View</button>
      </div>
    ) },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS} value={tab} onChange={setTab} />
          <div className={s.toolbarRight}>
            {depts.length > 1 && (
              <select className={s.select} value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter by department">
                <option value="">All departments</option>
                {depts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            <SearchBox value={query} onChange={setQuery} placeholder="Search name, email, staff ID…" />
            <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={exportCsv} disabled={!rows.length}><Icon name="download" /> CSV</button>
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setAdding(true)}><Icon name="plus" /> Add employee</button>
          </div>
        </div>
        <DataTable
          key={`${tab}-${dept}`}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query || dept ? 'No employees match your filters.' : tab === 'PENDING' ? 'Everyone has finished registering.' : 'No employees here yet.'}
        />
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
      <AddEmployeeModal open={adding} onClose={() => setAdding(false)} onAdded={(msg) => { setAdding(false); showToast('success', msg); reload(); }} />
    </>
  );
}

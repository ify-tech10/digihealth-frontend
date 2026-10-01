import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import { providerApi } from '../../Api/providerApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { humanize, matches, pick } from '../../utils/format';
import { Person, SearchBox, Tabs } from '../Admin/components/Common';
import { isClosable, isNewAssignment, locationOf, patientName, requestIdOf, serviceOf, statusOf } from './fields';
import { CloseRequestModal, PatientModal, ScheduleVisitModal } from './components/ProviderModals';
import s from '../Admin/admin.module.css';
import p from './Provider.module.css';

const TABS = [
  ['ACTIVE', 'Active'],
  ['PENDING_CLOSURE', 'Awaiting closure'],
  ['COMPLETED', 'Completed'],
  ['ALL', 'All'],
];

function inTab(pt, tab) {
  const st = statusOf(pt);
  if (tab === 'ALL') return true;
  if (tab === 'PENDING_CLOSURE') return st === 'PENDING_CLOSURE' || st === 'AWAITING_CLOSURE';
  if (tab === 'COMPLETED') return ['COMPLETED', 'CLOSED'].includes(st);
  return !['COMPLETED', 'CLOSED', 'PENDING_CLOSURE', 'AWAITING_CLOSURE'].includes(st);
}

export default function MyPatients() {
  usePageHeader('My Patients', 'Requests your supervisor has assigned to you');
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();

  const [tab, setTab] = useState('ACTIVE');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [scheduling, setScheduling] = useState(null);
  const [closing, setClosing] = useState(null);

  const { data, loading, error, reload } = useApi(() => providerApi.patients(), 'p-patients');
  const all = asList(data);
  const rows = all.filter((pt) => inTab(pt, tab) && matches(query, patientName(pt), serviceOf(pt), locationOf(pt)));
  const count = (t) => all.filter((pt) => inTab(pt, t)).length;

  const report = (pt) =>
    navigate('/caregiver/reports', { state: { newReportFor: { requestId: requestIdOf(pt), patientName: patientName(pt) } } });

  const columns = [
    { key: 'name', header: 'Patient', render: (pt) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Person name={patientName(pt)} sub={pt.phoneNumber} />
        {isNewAssignment(pt) && <span className={p.newTag}>NEW</span>}
      </div>
    ) },
    { key: 'service', header: 'Service', render: (pt) => humanize(serviceOf(pt)) },
    { key: 'location', header: 'Location', render: (pt) => locationOf(pt) },
    { key: 'next', header: 'Next visit', render: (pt) => pick(pt, 'nextVisit', 'nextVisitAt') || '—' },
    { key: 'status', header: 'Status', render: (pt) => <StatusBadge status={statusOf(pt)} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (pt) => (
        <div className={s.actions}>
          {isClosable(pt) && (
            <>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setScheduling(pt)}>Schedule</button>
              <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => report(pt)}>Record</button>
            </>
          )}
          <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(pt)}>View</button>
        </div>
      ),
    },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs
            options={TABS.map(([v, l]) => [v, loading ? l : `${l} (${count(v)})`])}
            value={tab}
            onChange={setTab}
          />
          <SearchBox value={query} onChange={setQuery} placeholder="Search patient, service, area…" />
        </div>
        <DataTable
          key={tab}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query ? 'No patients match your search.' : tab === 'ACTIVE' ? 'No active patients. New assignments appear here.' : 'Nothing here yet.'}
        />
      </div>

      <PatientModal
        patient={viewing}
        onClose={() => setViewing(null)}
        onSchedule={(pt) => { setViewing(null); setScheduling(pt); }}
        onReport={report}
        onCloseRequest={(pt) => { setViewing(null); setClosing(pt); }}
      />
      <ScheduleVisitModal
        open={!!scheduling}
        patient={scheduling}
        onClose={() => setScheduling(null)}
        onDone={(msg) => { setScheduling(null); showToast('success', msg); reload(); }}
      />
      <CloseRequestModal
        patient={closing}
        onClose={() => setClosing(null)}
        onDone={(msg) => { setClosing(null); showToast('success', msg); reload(); }}
      />
    </>
  );
}

import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DataTable from '../../components/DataTable/DataTable';
import Toast from '../../components/Toast/Toast';
import { facilityApi } from '../../Api/facilityApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDate, formatMoney, matches } from '../../utils/format';
import { SearchBox, Tabs } from '../Admin/components/Common';
import { useTestFlow } from './components/useTestFlow';
import { Collection, TestStatus, Urgency } from './components/TestParts';
import { byUrgency, fromOf, patientAddress, patientName, refOf, reqStatus, testsOf, testsTotal } from '../Facility/facilityFields';
import { hasCritical, isOverdue, resultsDue, testsSummary } from './labCentreFields';
import s from '../Admin/admin.module.css';
import l from './Laboratory.module.css';

const TABS = [
  ['NEW', 'New'],
  ['ACCEPTED', 'To collect'],
  ['COLLECTED', 'Processing'],
  ['RESULTED', 'Results sent'],
  ['DECLINED', 'Declined'],
  ['ALL', 'All'],
];

const bySchedule = (a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0);
const byDue = (a, b) => (resultsDue(a) || Infinity) - (resultsDue(b) || Infinity);
const newest = (a, b) => new Date(b.updatedAt || b.resultedAt || b.createdAt || 0) - new Date(a.updatedAt || a.resultedAt || a.createdAt || 0);
const SORT = { NEW: byUrgency, ACCEPTED: bySchedule, COLLECTED: byDue };

function When({ r }) {
  const st = reqStatus(r);
  if (st === 'ACCEPTED') return r.scheduledAt ? <>{formatDate(r.scheduledAt)}</> : '—';
  if (st === 'COLLECTED') {
    const due = resultsDue(r);
    if (!due) return <span className={s.muted}>Collected {formatDate(r.collectedAt)}</span>;
    return <span className={isOverdue(r) ? l.overdue : undefined}>{isOverdue(r) ? 'Overdue · ' : 'Due '}{formatDate(due)}</span>;
  }
  if (st === 'RESULTED') return <span className={s.muted}>{formatDate(r.resultedAt)}</span>;
  return <span className={s.muted}>—</span>;
}

export default function TestRequests() {
  usePageHeader('Test Requests', 'Lab tests DiGi Health needs for its patients');
  const { setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const [tab, setTab] = useState('NEW');
  const [query, setQuery] = useState('');
  const { data, loading, error, reload } = useApi(() => facilityApi.requests(), 'fac-requests-LAB');
  const all = asList(data);
  const flow = useTestFlow({ showToast, onChanged: reload });

  const counts = Object.fromEntries(TABS.map(([k]) => [k, k === 'ALL' ? all.length : all.filter((r) => reqStatus(r) === k).length]));
  const overdue = all.filter(isOverdue).length;
  useEffect(() => {
    if (!loading && !error) setBadges({ newRequests: counts.NEW });
  }, [loading, error, counts.NEW, setBadges]);

  const rows = all
    .filter((r) => (tab === 'ALL' || reqStatus(r) === tab) && matches(query, refOf(r), patientName(r), patientAddress(r), fromOf(r), r.sampleId, ...testsOf(r).map((t) => t.name)))
    .sort(SORT[tab] || newest);

  const whenHeader = { ACCEPTED: 'Collection', COLLECTED: 'Results due', RESULTED: 'Sent' }[tab] || 'Timing';

  const columns = [
    { key: 'ref', header: 'Request', render: (r) => <div className={s.tdName}>{refOf(r)}<small>{formatDate(r.createdAt)}</small></div> },
    { key: 'patient', header: 'Patient', render: (r) => (
      <div className={s.tdName}>
        <span>{patientName(r)} <Urgency request={r} /> <Collection request={r} /></span>
        {r.sampleId ? <small>Sample {r.sampleId}</small> : <small>{patientAddress(r) || ''}</small>}
      </div>
    ) },
    { key: 'tests', header: 'Tests', render: (r) => (
      <span>{testsSummary(testsOf(r))}{hasCritical(r) && <span className={l.tag} style={{ background: '#fee2e2', color: '#b91c1c' }}>Critical</span>}</span>
    ) },
    ...(tab === 'NEW' ? [] : [{ key: 'when', header: whenHeader, render: (r) => <When r={r} /> }]),
    { key: 'value', header: 'Value', align: 'right', render: (r) => (testsOf(r).some((t) => t.unitPrice != null) ? <span className={s.money}>{formatMoney(testsTotal(r))}</span> : <span className={s.muted}>To price</span>) },
    { key: 'status', header: 'Status', render: (r) => <TestStatus request={r} /> },
    { key: 'actions', header: 'Actions', render: (r) => (
      <div className={s.actions} style={{ flexWrap: 'nowrap' }}>
        {flow.actionsFor(r)}
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => flow.view(r)}>View</button>
      </div>
    ) },
  ];

  const label = (k, lbl) => {
    if (loading || k === 'ALL' || !counts[k]) return lbl;
    return k === 'COLLECTED' && overdue ? `${lbl} (${counts[k]} · ${overdue} late)` : `${lbl} (${counts[k]})`;
  };

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS.map(([k, lbl]) => [k, label(k, lbl)])} value={tab} onChange={setTab} />
          <SearchBox value={query} onChange={setQuery} placeholder="Search patient, test, sample ID…" />
        </div>
        <DataTable key={tab} columns={columns} rows={rows} loading={loading} error={error} emptyText={query ? 'No requests match your search.' : tab === 'NEW' ? 'No new test requests.' : 'Nothing here.'} />
      </div>
      {flow.modals}
    </>
  );
}

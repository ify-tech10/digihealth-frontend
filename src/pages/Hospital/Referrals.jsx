import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DataTable from '../../components/DataTable/DataTable';
import Toast from '../../components/Toast/Toast';
import { facilityApi } from '../../Api/facilityApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDate, matches, pick } from '../../utils/format';
import { SearchBox, Tabs } from '../Admin/components/Common';
import { useReferralFlow } from './components/useReferralFlow';
import { ReferralStatus, Urgency } from './components/ReferralParts';
import { byUrgency, fromOf, patientName, refOf, reqStatus } from '../Facility/facilityFields';
import s from '../Admin/admin.module.css';

const TABS = [
  ['NEW', 'New'],
  ['ACCEPTED', 'Awaiting arrival'],
  ['ADMITTED', 'Admitted'],
  ['DISCHARGED', 'Discharged'],
  ['DECLINED', 'Declined'],
  ['ALL', 'All'],
];

export default function Referrals() {
  usePageHeader('Referrals', 'Patients DiGi Health is sending to you');
  const { setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const [tab, setTab] = useState('NEW');
  const [query, setQuery] = useState('');
  const { data, loading, error, reload } = useApi(() => facilityApi.requests(), 'fac-requests-HOSPITAL');
  const all = asList(data);
  const flow = useReferralFlow({ showToast, onChanged: reload });

  const counts = Object.fromEntries(TABS.map(([k]) => [k, k === 'ALL' ? all.length : all.filter((r) => reqStatus(r) === k).length]));
  useEffect(() => {
    if (!loading && !error) setBadges({ newRequests: counts.NEW });
  }, [loading, error, counts.NEW, setBadges]);

  const rows = all
    .filter((r) => (tab === 'ALL' || reqStatus(r) === tab) && matches(query, refOf(r), patientName(r), fromOf(r), pick(r, 'reason', 'diagnosis')))
    .sort(['NEW', 'ACCEPTED'].includes(tab) ? byUrgency : (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  const columns = [
    { key: 'ref', header: 'Referral', render: (r) => <div className={s.tdName}>{refOf(r)}<small>{formatDate(r.createdAt)}</small></div> },
    { key: 'patient', header: 'Patient', render: (r) => {
      const p = r.patient || {};
      return <div className={s.tdName}>{patientName(r)} <Urgency referral={r} /><small>{[p.age != null ? `${p.age} yrs` : null, p.gender].filter(Boolean).join(' · ')}</small></div>;
    } },
    { key: 'reason', header: 'Reason', render: (r) => <span style={{ display: 'block', maxWidth: 260 }}>{String(pick(r, 'reason', 'diagnosis') || '—').slice(0, 90)}</span> },
    { key: 'from', header: 'Referred by', render: (r) => fromOf(r) || '—' },
    { key: 'status', header: 'Status', render: (r) => <ReferralStatus referral={r} /> },
    { key: 'actions', header: 'Actions', render: (r) => (
      <div className={s.actions} style={{ flexWrap: 'nowrap' }}>
        {flow.actionsFor(r)}
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => flow.view(r)}>View</button>
      </div>
    ) },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS.map(([k, l]) => [k, !loading && counts[k] && k !== 'ALL' ? `${l} (${counts[k]})` : l])} value={tab} onChange={setTab} />
          <SearchBox value={query} onChange={setQuery} placeholder="Search patient, reason, referral…" />
        </div>
        <DataTable key={tab} columns={columns} rows={rows} loading={loading} error={error} emptyText={query ? 'No referrals match your search.' : tab === 'NEW' ? 'No new referrals.' : 'Nothing here.'} />
      </div>
      {flow.modals}
    </>
  );
}

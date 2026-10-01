import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DataTable from '../../components/DataTable/DataTable';
import Toast from '../../components/Toast/Toast';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDate, formatDay, formatMoney, matches } from '../../utils/format';
import { SearchBox, Tabs } from '../Admin/components/Common';
import { useLab } from './useLab';
import { useRequestFlow } from './components/useRequestFlow';
import { Priority, RequestStatus } from './components/RequestBadges';
import {
  addressOf, byUrgency, dueOf, itemsOf, patientOf, reqNo, reqStatus, requesterOf, totalOf, unpriced, whenOf,
} from './labFields';
import s from '../Admin/admin.module.css';

export default function Requests() {
  const { kind, words, api } = useLab();
  usePageHeader('Service Requests', `${words.Items} ordered by the medical team for patients at home`);
  const { setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const TABS = [
    ['NEW', 'New'],
    ['ACCEPTED', 'Scheduled'],
    ['IN_PROGRESS', words.inProgress],
    ['COMPLETED', 'Completed'],
    ['DECLINED', 'Declined'],
    ['ALL', 'All'],
  ];

  const [tab, setTab] = useState('NEW');
  const [query, setQuery] = useState('');

  const { data, loading, error, reload } = useApi(() => api.requests(), `lab-requests-${kind}`);
  const all = asList(data);
  const flow = useRequestFlow({ api, kind, words, showToast, onChanged: reload });

  const counts = Object.fromEntries(TABS.map(([k]) => [k, k === 'ALL' ? all.length : all.filter((r) => reqStatus(r) === k).length]));
  useEffect(() => {
    if (!loading && !error) setBadges({ newRequests: counts.NEW });
  }, [loading, error, counts.NEW, setBadges]);

  const rows = all
    .filter((r) => (tab === 'ALL' || reqStatus(r) === tab) && matches(query, reqNo(r), patientOf(r), requesterOf(r), addressOf(r), ...itemsOf(r).map((i) => i.name)))
    .sort(tab === 'COMPLETED' || tab === 'DECLINED' || tab === 'ALL'
      ? (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
      : byUrgency);

  const columns = [
    { key: 'no', header: 'Request', render: (r) => <div className={s.tdName}>{reqNo(r)}<small>{formatDate(r.createdAt)}</small></div> },
    { key: 'patient', header: 'Patient', render: (r) => <div className={s.tdName}>{patientOf(r)} <Priority request={r} /><small>{addressOf(r) || ''}</small></div> },
    { key: 'items', header: words.Items, render: (r) => {
      const items = itemsOf(r);
      return items.length ? <span>{items.slice(0, 2).map((i) => i.name).join(', ')}{items.length > 2 ? ` +${items.length - 2}` : ''}</span> : '—';
    } },
    { key: 'from', header: 'Requested by', render: (r) => requesterOf(r) || '—' },
    { key: 'when', header: 'Due / booked', render: (r) => <span style={{ whiteSpace: 'nowrap' }}>{whenOf(r) ? formatDate(whenOf(r)) : formatDay(dueOf(r))}</span> },
    { key: 'total', header: 'Value', align: 'right', render: (r) => (unpriced(r) ? <span className={s.muted}>To price</span> : <span className={s.money}>{formatMoney(totalOf(r))}</span>) },
    { key: 'status', header: 'Status', render: (r) => <RequestStatus request={r} words={words} /> },
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
          <Tabs options={TABS.map(([k, label]) => [k, !loading && counts[k] && k !== 'ALL' ? `${label} (${counts[k]})` : label])} value={tab} onChange={setTab} />
          <SearchBox value={query} onChange={setQuery} placeholder={`Search patient, ${words.item}, request…`} />
        </div>
        <DataTable
          key={tab}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query ? 'No requests match your search.' : tab === 'NEW' ? 'No new requests — you’re all caught up.' : 'No requests here.'}
        />
      </div>
      <p className={s.hint} style={{ marginTop: 10 }}>Requests can’t be deleted. If you can’t fulfil one, use “Can’t fulfil” — it goes back to the medical team with your reason and stays on record.</p>
      {flow.modals}
    </>
  );
}

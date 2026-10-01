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
import { useOrderFlow } from './components/useOrderFlow';
import { OrderStatus, Urgency } from './components/OrderParts';
import { byUrgency, fromOf, itemsOf, orderTotal, patientAddress, patientName, refOf, reqStatus } from '../Facility/facilityFields';
import s from '../Admin/admin.module.css';

const TABS = [
  ['NEW', 'New'],
  ['ACCEPTED', 'Preparing'],
  ['DISPATCHED', 'Out for delivery'],
  ['DELIVERED', 'Delivered'],
  ['DECLINED', 'Declined'],
  ['ALL', 'All'],
];

export default function Orders() {
  usePageHeader('Drug Orders', 'Prescriptions DiGi Health needs delivered to patients');
  const { setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const [tab, setTab] = useState('NEW');
  const [query, setQuery] = useState('');
  const { data, loading, error, reload } = useApi(() => facilityApi.requests(), 'fac-requests-PHARMACY');
  const all = asList(data);
  const flow = useOrderFlow({ showToast, onChanged: reload });

  const counts = Object.fromEntries(TABS.map(([k]) => [k, k === 'ALL' ? all.length : all.filter((o) => reqStatus(o) === k).length]));
  useEffect(() => {
    if (!loading && !error) setBadges({ newRequests: counts.NEW });
  }, [loading, error, counts.NEW, setBadges]);

  const rows = all
    .filter((o) => (tab === 'ALL' || reqStatus(o) === tab) && matches(query, refOf(o), patientName(o), patientAddress(o), fromOf(o), ...itemsOf(o).map((i) => i.name)))
    .sort(['NEW', 'ACCEPTED'].includes(tab) ? byUrgency : (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  const columns = [
    { key: 'ref', header: 'Order', render: (o) => <div className={s.tdName}>{refOf(o)}<small>{formatDate(o.createdAt)}</small></div> },
    { key: 'patient', header: 'Patient', render: (o) => <div className={s.tdName}>{patientName(o)} <Urgency order={o} /><small>{patientAddress(o) || ''}</small></div> },
    { key: 'drugs', header: 'Drugs', render: (o) => {
      const items = itemsOf(o);
      return items.length ? `${items.slice(0, 2).map((i) => i.name).join(', ')}${items.length > 2 ? ` +${items.length - 2}` : ''}` : '—';
    } },
    { key: 'value', header: 'Value', align: 'right', render: (o) => (itemsOf(o).some((i) => i.unitPrice != null) ? <span className={s.money}>{formatMoney(orderTotal(o))}</span> : <span className={s.muted}>To price</span>) },
    { key: 'status', header: 'Status', render: (o) => <OrderStatus order={o} /> },
    { key: 'actions', header: 'Actions', render: (o) => (
      <div className={s.actions} style={{ flexWrap: 'nowrap' }}>
        {flow.actionsFor(o)}
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => flow.view(o)}>View</button>
      </div>
    ) },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS.map(([k, l]) => [k, !loading && counts[k] && k !== 'ALL' ? `${l} (${counts[k]})` : l])} value={tab} onChange={setTab} />
          <SearchBox value={query} onChange={setQuery} placeholder="Search patient, drug, address…" />
        </div>
        <DataTable key={tab} columns={columns} rows={rows} loading={loading} error={error} emptyText={query ? 'No orders match your search.' : tab === 'NEW' ? 'No new orders.' : 'Nothing here.'} />
      </div>
      {flow.modals}
    </>
  );
}

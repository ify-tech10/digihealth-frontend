import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, formatMoney, matches, pick } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { SearchBox, Tabs } from '../Admin/components/Common';
import { useFacility } from './useFacility';
import { InvoiceModal, NewInvoiceModal } from './components/InvoiceModals';
import { invNo, invStatus, invTotal, isDone, reqStatus } from './facilityFields';
import s from '../Admin/admin.module.css';

const TABS = [
  ['ALL', 'All'],
  ['PENDING', 'Awaiting approval'],
  ['APPROVED', 'Approved — to be paid'],
  ['PAID', 'Paid'],
  ['REJECTED', 'Rejected'],
];

/* Invoices this facility sent to DiGi Health — shared by the hospital and pharmacy portals. */
export default function Invoices() {
  const { kind, words, api } = useFacility();
  usePageHeader('Invoices', 'Bill DiGi Health for care and goods you’ve delivered');
  const { toast, showToast, clearToast } = useToast();

  const [tab, setTab] = useState('ALL');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data, loading, error, reload } = useApi(() => api.invoices(), `fac-invoices-${kind}`);
  const requests = useApi(() => api.requests(), `fac-requests-${kind}`);
  const all = asList(data).slice().sort((a, b) => new Date(pick(b, 'createdAt', 'submittedAt') || 0) - new Date(pick(a, 'createdAt', 'submittedAt') || 0));
  const rows = all.filter((i) => (tab === 'ALL' || invStatus(i) === tab) && matches(query, invNo(i), pick(i, 'requestReference', 'patientName'), i.notes));

  const sum = (st) => all.filter((i) => invStatus(i) === st).reduce((t, i) => t + invTotal(i), 0);
  const v = (x) => (loading ? '…' : error ? '—' : x);
  /* completed requests are the ones worth invoicing */
  const billable = asList(requests.data).filter((r) => isDone(r) && reqStatus(r) !== 'DECLINED');

  function exportCsv() {
    downloadCsv(`invoices-to-digi.csv`, ['Invoice', 'For', 'Sent', 'Amount', 'Status', 'Paid'],
      rows.map((i) => [invNo(i), pick(i, 'requestReference', 'patientName'), formatDay(pick(i, 'createdAt', 'submittedAt')), invTotal(i), invStatus(i), formatDay(i.paidAt)]));
  }

  const columns = [
    { key: 'no', header: 'Invoice', render: (i) => <span className={s.tdName}>{invNo(i)}</span> },
    { key: 'for', header: 'For', render: (i) => pick(i, 'requestReference', 'patientName') || '—' },
    { key: 'sent', header: 'Sent', render: (i) => <span className={s.muted}>{formatDay(pick(i, 'createdAt', 'submittedAt'))}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (i) => <span className={s.money}>{formatMoney(invTotal(i))}</span> },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={invStatus(i)} /> },
    { key: 'paid', header: 'Paid', render: (i) => (i.paidAt ? formatDay(i.paidAt) : '—') },
    { key: 'view', header: '', render: (i) => <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(i)}>View</button> },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      <div className={s.stats4}>
        <StatCard accent color="orange" icon="clock" label="Awaiting approval" value={v(formatMoney(sum('PENDING')))} />
        <StatCard accent color="blue" icon="check" label="Approved, not yet paid" value={v(formatMoney(sum('APPROVED')))} />
        <StatCard accent color="green" icon="dollar" label="Paid to you" value={v(formatMoney(sum('PAID')))} />
        <StatCard accent color="red" icon="alert" label="Rejected" value={v(all.filter((i) => invStatus(i) === 'REJECTED').length)} sub="Check DiGi’s note and resend" />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS} value={tab} onChange={setTab} />
          <div className={s.toolbarRight}>
            <SearchBox value={query} onChange={setQuery} placeholder="Search invoice, patient…" />
            <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={exportCsv} disabled={!rows.length}><Icon name="download" /> CSV</button>
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setCreating(true)}><Icon name="plus" /> New invoice</button>
          </div>
        </div>
        <DataTable key={tab} columns={columns} rows={rows} loading={loading} error={error} emptyText={query ? 'No invoices match your search.' : 'No invoices here.'} />
      </div>

      <InvoiceModal invoice={viewing} onClose={() => setViewing(null)} />
      <NewInvoiceModal
        open={creating}
        requests={billable}
        words={words}
        onClose={() => setCreating(false)}
        onCreated={(msg) => { setCreating(false); showToast('success', msg); reload(); }}
      />
    </>
  );
}

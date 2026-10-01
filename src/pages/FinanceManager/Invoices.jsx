import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import DataTable from '../../components/DataTable/DataTable';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { financeApi } from '../../Api/financeApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, formatMoney, matches } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { SearchBox, Tabs } from '../Admin/components/Common';
import { InvoiceModal, NewInvoiceModal, RecordPaymentModal } from './components/FinanceModals';
import {
  inMonth, invoiceAmount, invoiceBalance, invoiceClient, invoiceDue, invoiceIssued, invoiceNo,
  invoiceService, invoiceStatus, isOutstanding, monthKey, nairaShort, sumBy,
} from './financeFields';
import s from '../Admin/admin.module.css';
import f from './Finance.module.css';

const TABS = [
  ['ALL', 'All'],
  ['PENDING', 'Pending'],
  ['OVERDUE', 'Overdue'],
  ['PARTIAL', 'Part-paid'],
  ['PAID', 'Paid'],
];

export default function Invoices() {
  usePageHeader('Invoices', 'Every invoice issued and what’s still owed');
  const { setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();
  const [params] = useSearchParams();

  const [tab, setTab] = useState(params.get('status') || 'ALL');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(null);
  const [reminding, setReminding] = useState(null);

  const { data, loading, error, reload } = useApi(() => financeApi.invoices(), 'fin-invoices');
  const all = asList(data);

  const outstanding = all.filter(isOutstanding);
  const overdue = all.filter((i) => invoiceStatus(i) === 'OVERDUE');
  const paidThisMonth = all.filter((i) => invoiceStatus(i) === 'PAID' && inMonth(i.paidAt || i.updatedAt, monthKey()));

  useEffect(() => {
    if (!loading && !error) setBadges({ invoices: outstanding.length });
  }, [loading, error, outstanding.length, setBadges]);

  const rows = all
    .filter((i) => (tab === 'ALL' || invoiceStatus(i) === tab) && matches(query, invoiceNo(i), invoiceClient(i), invoiceService(i)))
    .sort((a, b) => new Date(invoiceIssued(b) || 0) - new Date(invoiceIssued(a) || 0));

  async function remind(inv) {
    setReminding(inv.id);
    try {
      await financeApi.sendReminder(inv.id);
      showToast('success', `Reminder sent to ${invoiceClient(inv) || 'the client'}.`);
    } catch (err) {
      showToast('error', `Reminder not sent: ${err.message}`);
    } finally {
      setReminding(null);
    }
  }

  function exportCsv() {
    downloadCsv(
      `invoices-${tab.toLowerCase()}-${monthKey()}.csv`,
      ['Invoice', 'Client', 'Service', 'Issued', 'Due', 'Amount', 'Balance', 'Status'],
      rows.map((i) => [invoiceNo(i), invoiceClient(i), invoiceService(i), formatDay(invoiceIssued(i)), formatDay(invoiceDue(i)), invoiceAmount(i), invoiceBalance(i), invoiceStatus(i)])
    );
  }

  const v = (x) => (loading ? '…' : error ? '—' : x);

  const columns = [
    { key: 'no', header: 'Invoice', render: (i) => <span className={f.mono}>{invoiceNo(i)}</span> },
    { key: 'client', header: 'Client', render: (i) => <span className={s.tdName}>{invoiceClient(i) || '—'}</span> },
    { key: 'service', header: 'Service', render: (i) => invoiceService(i) || '—' },
    { key: 'issued', header: 'Issued', render: (i) => <span className={s.muted}>{formatDay(invoiceIssued(i))}</span> },
    { key: 'due', header: 'Due', render: (i) => <span className={invoiceStatus(i) === 'OVERDUE' ? f.overdue : undefined}>{formatDay(invoiceDue(i))}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (i) => (
      <span className={invoiceStatus(i) === 'PAID' ? f.plus : invoiceStatus(i) === 'OVERDUE' ? f.minus : f.amount}>{formatMoney(invoiceAmount(i))}</span>
    ) },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={invoiceStatus(i)} /> },
    { key: 'actions', header: 'Actions', render: (i) => (
      <div className={s.actions} style={{ flexWrap: 'nowrap' }}>
        {isOutstanding(i) && <button type="button" className={`${s.btn} ${s.btnApprove}`} onClick={() => setPaying(i)}>Record payment</button>}
        {isOutstanding(i) && (
          <button type="button" className={`${s.btn} ${s.btnView}`} disabled={reminding === i.id} onClick={() => remind(i)}>
            {reminding === i.id ? 'Sending…' : 'Remind'}
          </button>
        )}
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(i)}>View</button>
      </div>
    ) },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.stats4}>
        <StatCard accent color="red" icon="alert" label="Outstanding" value={v(nairaShort(sumBy(outstanding, invoiceBalance)))} sub={loading || error ? '' : `${outstanding.length} invoice${outstanding.length === 1 ? '' : 's'}`} />
        <StatCard accent color="orange" icon="clock" label="Overdue" value={v(nairaShort(sumBy(overdue, invoiceBalance)))} sub={loading || error ? '' : `${overdue.length} past due date`} />
        <StatCard accent color="green" icon="check" label="Paid this month" value={v(nairaShort(sumBy(paidThisMonth, invoiceAmount)))} sub={loading || error ? '' : `${paidThisMonth.length} invoice${paidThisMonth.length === 1 ? '' : 's'}`} />
        <StatCard accent color="blue" icon="file" label="All invoices" value={v(all.length)} />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS} value={tab} onChange={setTab} />
          <div className={s.toolbarRight}>
            <SearchBox value={query} onChange={setQuery} placeholder="Search invoice, client…" />
            <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={exportCsv} disabled={!rows.length}><Icon name="download" /> CSV</button>
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setCreating(true)}><Icon name="plus" /> New invoice</button>
          </div>
        </div>
        <DataTable
          key={tab}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query ? 'No invoices match your search.' : tab === 'OVERDUE' ? 'Nothing overdue.' : 'No invoices here.'}
        />
      </div>

      <InvoiceModal
        invoice={viewing}
        reminding={reminding === viewing?.id}
        onClose={() => setViewing(null)}
        onRemind={remind}
        onRecordPayment={(i) => { setViewing(null); setPaying(i); }}
      />
      <NewInvoiceModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(msg) => { setCreating(false); showToast('success', msg); reload(); }}
      />
      <RecordPaymentModal
        open={!!paying}
        invoice={paying}
        onClose={() => setPaying(null)}
        onRecorded={(msg) => { setPaying(null); showToast('success', msg); reload(); }}
      />
    </>
  );
}

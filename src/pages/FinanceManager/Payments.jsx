import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import StatCard from '../../components/Statcard/Statcard';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { financeApi } from '../../Api/financeApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, formatMoney, humanize, matches, pick } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { SearchBox } from '../Admin/components/Common';
import { RecordPaymentModal } from './components/FinanceModals';
import { PAYMENT_METHODS, monthKey, monthLabel, nairaShort, paymentAmount, paymentDate, paymentFrom, shiftMonth, sumBy } from './financeFields';
import s from '../Admin/admin.module.css';
import f from './Finance.module.css';

const METHOD = Object.fromEntries(PAYMENT_METHODS);
const methodOf = (p) => METHOD[String(p.method || '').toUpperCase()] || humanize(p.method);

export default function Payments() {
  usePageHeader('Payments', 'Money received from patients, organisations and HMOs');
  const { toast, showToast, clearToast } = useToast();

  const [month, setMonth] = useState(monthKey());
  const [query, setQuery] = useState('');
  const [recording, setRecording] = useState(false);

  const { data, loading, error, reload } = useApi(() => financeApi.payments({ month }), `fin-payments-${month}`);
  const invoices = useApi(() => financeApi.invoices(), 'fin-invoices');
  const all = asList(data);

  const rows = all
    .filter((p) => matches(query, paymentFrom(p), p.reference, pick(p, 'invoiceNumber', 'invoiceRef'), methodOf(p)))
    .sort((a, b) => new Date(paymentDate(b) || 0) - new Date(paymentDate(a) || 0));

  const total = sumBy(all, paymentAmount);
  const byMethod = Object.entries(
    all.reduce((acc, p) => ({ ...acc, [methodOf(p)]: (acc[methodOf(p)] || 0) + paymentAmount(p) }), {})
  ).sort((a, b) => b[1] - a[1]);
  const largest = all.reduce((m, p) => Math.max(m, paymentAmount(p)), 0);
  const v = (x) => (loading ? '…' : error ? '—' : x);

  function exportCsv() {
    downloadCsv(
      `payments-${month}.csv`,
      ['Date', 'From', 'Invoice', 'Method', 'Reference', 'Amount', 'Recorded by'],
      rows.map((p) => [formatDay(paymentDate(p)), paymentFrom(p), pick(p, 'invoiceNumber', 'invoiceRef'), methodOf(p), p.reference, paymentAmount(p), pick(p, 'recordedByName', 'recordedBy')])
    );
  }

  const columns = [
    { key: 'date', header: 'Date', render: (p) => <span className={s.muted}>{formatDay(paymentDate(p))}</span> },
    { key: 'from', header: 'From', render: (p) => <span className={s.tdName}>{paymentFrom(p) || '—'}</span> },
    { key: 'inv', header: 'Invoice', render: (p) => <span className={f.mono}>{pick(p, 'invoiceNumber', 'invoiceRef') || '—'}</span> },
    { key: 'method', header: 'Method', render: methodOf },
    { key: 'ref', header: 'Reference', render: (p) => <span className={f.mono} style={{ color: '#8898c8' }}>{p.reference || '—'}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => <span className={f.plus}>{formatMoney(paymentAmount(p))}</span> },
    { key: 'by', header: 'Recorded by', render: (p) => pick(p, 'recordedByName', 'recordedBy') || (p.method === 'PAYSTACK' ? 'Online checkout' : '—') },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={`${s.card} ${s.spaced}`}>
        <div className={f.monthBar}>
          <button type="button" className={f.navBtn} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><Icon name="chevronLeft" /></button>
          <h3>{monthLabel(month)}</h3>
          <button type="button" className={f.navBtn} onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= monthKey()} aria-label="Next month"><Icon name="chevronRight" /></button>
        </div>
      </div>

      <div className={s.stats4}>
        <StatCard accent color="green" icon="card" label="Received" value={v(nairaShort(total))} sub={loading || error ? '' : `${all.length} payment${all.length === 1 ? '' : 's'}`} />
        <StatCard accent color="blue" icon="trendingUp" label="Average payment" value={v(all.length ? nairaShort(total / all.length) : '—')} />
        <StatCard accent color="purple" icon="dollar" label="Largest payment" value={v(largest ? nairaShort(largest) : '—')} />
        <StatCard accent color="teal" icon="layers" label="Top method" value={v(byMethod[0]?.[0] || '—')} sub={byMethod[0] && !loading ? nairaShort(byMethod[0][1]) : ''} />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <h3 className={s.toolbarTitle}>Payments received</h3>
          <div className={s.toolbarRight}>
            <SearchBox value={query} onChange={setQuery} placeholder="Search payer, reference…" />
            <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={exportCsv} disabled={!rows.length}><Icon name="download" /> CSV</button>
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setRecording(true)}><Icon name="plus" /> Record payment</button>
          </div>
        </div>
        <DataTable
          key={month}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query ? 'No payments match your search.' : `No payments recorded in ${monthLabel(month)}.`}
        />
      </div>

      <RecordPaymentModal
        open={recording}
        invoices={asList(invoices.data)}
        onClose={() => setRecording(false)}
        onRecorded={(msg) => { setRecording(false); showToast('success', msg); reload(); invoices.reload(); }}
      />
    </>
  );
}

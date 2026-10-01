import { useMemo, useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Icon from '../../components/Icon/Icon';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDate, formatMoney, humanize, matches, pick, toISODate } from '../../utils/format';
import { SearchBox, Tabs } from './components/Common';
import s from './admin.module.css';

const PAID = ['PAID', 'SUCCESS', 'SUCCESSFUL', 'COMPLETED'];
const PENDING = ['PENDING', 'PROCESSING', 'INITIATED'];
const FAILED = ['FAILED', 'CANCELLED', 'REFUNDED', 'REVERSED'];

const TABS = [
  ['ALL', 'All'],
  ['PAID', 'Paid'],
  ['PENDING', 'Pending'],
  ['FAILED', 'Failed'],
];

const statusOf = (p) => String(p.status || '').toUpperCase();
const amountOf = (p) => Number(pick(p, 'amount', 'amountPaid', 'total')) || 0;
const dateOf = (p) => pick(p, 'paidAt', 'createdAt', 'transactionDate', 'date');
const payerOf = (p) => pick(p, 'payerName', 'patientName', 'customerName', 'companyName', 'email');
const refOf = (p) => pick(p, 'reference', 'transactionRef', 'transactionReference', 'id');

function inGroup(p, tab) {
  const st = statusOf(p);
  if (tab === 'PAID') return PAID.includes(st);
  if (tab === 'PENDING') return PENDING.includes(st);
  if (tab === 'FAILED') return FAILED.includes(st);
  return true;
}

function downloadCsv(rows) {
  const header = ['Reference', 'Payer', 'Description', 'Method', 'Amount (NGN)', 'Status', 'Date'];
  const lines = rows.map((p) =>
    [refOf(p), payerOf(p), pick(p, 'description', 'service', 'purpose'), humanize(pick(p, 'method', 'paymentMethod', 'channel')),
      amountOf(p), statusOf(p), dateOf(p) || '']
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `digihealth-payments-${toISODate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Financials() {
  usePageHeader('Payments', 'Payments received and outstanding');

  const [tab, setTab] = useState('ALL');
  const [query, setQuery] = useState('');

  const { data, loading, error } = useApi(() => adminApi.payments(), 'payments');
  const all = asList(data);

  const totals = useMemo(() => {
    const now = new Date();
    let received = 0;
    let outstanding = 0;
    let month = 0;
    all.forEach((p) => {
      const st = statusOf(p);
      if (PAID.includes(st)) {
        received += amountOf(p);
        const d = new Date(dateOf(p));
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) month += amountOf(p);
      } else if (PENDING.includes(st)) {
        outstanding += amountOf(p);
      }
    });
    return { received, outstanding, month };
  }, [all]);

  const rows = all
    .filter((p) => inGroup(p, tab) && matches(query, refOf(p), payerOf(p), pick(p, 'description', 'service')))
    .sort((a, b) => new Date(dateOf(b) || 0) - new Date(dateOf(a) || 0));

  const columns = [
    { key: 'ref', header: 'Reference', render: (p) => <span className={s.muted}>{refOf(p) ?? '—'}</span> },
    { key: 'payer', header: 'Payer', render: (p) => <span className={s.tdName}>{payerOf(p) || '—'}</span> },
    { key: 'desc', header: 'Description', render: (p) => humanize(pick(p, 'description', 'service', 'purpose')) },
    { key: 'method', header: 'Method', render: (p) => humanize(pick(p, 'method', 'paymentMethod', 'channel')) },
    { key: 'date', header: 'Date', render: (p) => formatDate(dateOf(p)) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => <span className={s.money}>{formatMoney(amountOf(p))}</span> },
  ];

  const show = (v) => (loading ? '…' : formatMoney(v));

  return (
    <>
      <div className={s.stats4}>
        <StatCard label="Total received" value={show(totals.received)} icon="dollar" color="green" />
        <StatCard label="Received this month" value={show(totals.month)} icon="trendingUp" color="blue" />
        <StatCard label="Outstanding" value={show(totals.outstanding)} icon="clock" color="orange" />
        <StatCard label="Transactions" value={loading ? '…' : all.length} icon="file" color="purple" />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS} value={tab} onChange={setTab} />
          <div className={s.toolbarRight}>
            <SearchBox value={query} onChange={setQuery} placeholder="Search reference, payer…" />
            <button
              type="button"
              className={`${s.btn} ${s.btnView} ${s.btnLarge}`}
              onClick={() => downloadCsv(rows)}
              disabled={!rows.length}
            >
              <Icon name="download" /> Export CSV
            </button>
          </div>
        </div>
        <DataTable
          key={tab}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query ? 'No payments match your search.' : 'No payments here.'}
          pageSize={15}
        />
      </div>
    </>
  );
}

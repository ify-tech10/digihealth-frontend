import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { patientApi } from '../../Api/patientApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, formatMoney, humanize, pick } from '../../utils/format';
import { Detail, Tabs } from '../Admin/components/Common';
import { invBalance, invNo, invPaid, invStatus, invTotal, isHmo, isOverdueInv, num, serviceLabel } from './patientFields';
import s from '../Admin/admin.module.css';
import p from './Patient.module.css';

const TABS = [
  ['BILLS', 'Bills'],
  ['HISTORY', 'Payment history'],
];

export default function Payments() {
  usePageHeader('Bills & Payments', 'What you owe, what you’ve paid, and your receipts');
  const { setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('BILLS');
  const [viewing, setViewing] = useState(null);
  const [paying, setPaying] = useState(null);

  const invoices = useApi(() => patientApi.invoices(), 'pt-invoices');
  const payments = useApi(() => patientApi.payments(), 'pt-payments');
  const profile = useApi(() => patientApi.profile(), 'pt-profile');
  const all = asList(invoices.data).slice().sort((a, b) => (invBalance(b) > 0) - (invBalance(a) > 0) || new Date(pick(b, 'issuedAt', 'createdAt') || 0) - new Date(pick(a, 'issuedAt', 'createdAt') || 0));
  const paid = asList(payments.data).slice().sort((a, b) => new Date(pick(b, 'paidAt', 'createdAt') || 0) - new Date(pick(a, 'paidAt', 'createdAt') || 0));
  const owed = all.reduce((t, i) => t + invBalance(i), 0);
  const year = new Date().getFullYear();
  const paidYear = paid.filter((x) => new Date(pick(x, 'paidAt', 'createdAt') || 0).getFullYear() === year).reduce((t, x) => t + num(x.amount), 0);
  const nextDue = all.filter((i) => invBalance(i) > 0 && i.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
  const prof = profile.data || {};
  const hmo = isHmo(prof);
  /* back from the payment page: ?reference=… */
  const returned = params.get('reference') || params.get('trxref');

  const unpaidCount = all.filter((i) => invBalance(i) > 0).length;
  useEffect(() => {
    if (!invoices.loading && !invoices.error) setBadges({ unpaid: unpaidCount });
  }, [invoices.loading, invoices.error, unpaidCount, setBadges]);

  async function pay(i) {
    setPaying(i.id);
    try {
      const res = await patientApi.pay(i.id);
      const url = pick(res || {}, 'authorizationUrl', 'authorization_url', 'paymentUrl');
      if (!url) throw new Error('The payment page didn’t open. Please try again.');
      window.location.assign(url);
    } catch (err) {
      showToast('error', err.message);
      setPaying(null);
    }
  }

  const v = (x) => (invoices.loading ? '…' : invoices.error ? '—' : x);

  const billCols = [
    { key: 'no', header: 'Bill', render: (i) => <div className={s.tdName}>{invNo(i)}<small>{pick(i, 'description', 'title') || serviceLabel(i.serviceType)}</small></div> },
    { key: 'issued', header: 'Issued', render: (i) => <span className={s.muted}>{formatDay(pick(i, 'issuedAt', 'createdAt'))}</span> },
    { key: 'due', header: 'Due', render: (i) => <span className={isOverdueInv(i) ? p.due : s.muted}>{formatDay(i.dueDate)}{isOverdueInv(i) ? ' · overdue' : ''}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (i) => <span className={s.money}>{formatMoney(invTotal(i))}</span> },
    { key: 'balance', header: 'To pay', align: 'right', render: (i) => <span className={s.money}>{invBalance(i) ? formatMoney(invBalance(i)) : '—'}</span> },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={isOverdueInv(i) ? 'OVERDUE' : invStatus(i)} /> },
    { key: 'actions', header: '', render: (i) => (
      <div className={s.actions} style={{ flexWrap: 'nowrap' }}>
        {invBalance(i) > 0 && <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={paying != null} onClick={() => pay(i)}>{paying === i.id ? 'Opening…' : 'Pay'}</button>}
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(i)}>View</button>
      </div>
    ) },
  ];

  const payCols = [
    { key: 'date', header: 'Date', render: (x) => <span className={s.muted}>{formatDay(pick(x, 'paidAt', 'createdAt'))}</span> },
    { key: 'ref', header: 'Reference', render: (x) => <span className={s.tdName}>{pick(x, 'reference', 'transactionReference') || `#${x.id}`}</span> },
    { key: 'for', header: 'For', render: (x) => pick(x, 'invoiceNumber', 'description') || '—' },
    { key: 'method', header: 'Method', render: (x) => humanize(pick(x, 'method', 'channel')) },
    { key: 'amount', header: 'Amount', align: 'right', render: (x) => <span className={s.money}>{formatMoney(x.amount)}</span> },
    { key: 'receipt', header: '', render: (x) => (pick(x, 'receiptUrl') ? <a className={p.docOpen} href={x.receiptUrl} target="_blank" rel="noopener noreferrer"><Icon name="download" /> Receipt</a> : null) },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      {returned && (
        <div className={p.notice}>
          <Icon name="check" />
          <span style={{ flex: 1 }}>Thanks — we’re confirming your payment (ref. {returned}). It can take a minute to show here.</span>
          <button type="button" className={p.linkBtn} onClick={() => { setParams({}, { replace: true }); invoices.reload(); payments.reload(); }}>Refresh</button>
        </div>
      )}

      {hmo && (
        <div className={p.cover}>
          <Icon name="shield" />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className={p.coverTitle}>Covered by {pick(prof, 'hmoName', 'organisationName') || 'your HMO'}{prof.hmoPlan ? ` — ${prof.hmoPlan}` : ''}</div>
            <div className={p.coverText}>
              Care included in your plan is billed to your HMO, so you don’t pay for it here. You’ll only see a bill for anything your plan doesn’t cover.
              {pick(prof, 'hmoMemberId', 'memberId') && <> Member ID: <strong>{pick(prof, 'hmoMemberId', 'memberId')}</strong>.</>}
            </div>
          </div>
        </div>
      )}

      <div className={s.stats3}>
        <StatCard accent color={owed ? 'orange' : 'green'} icon="card" label="To pay" value={v(formatMoney(owed))} sub={owed ? `${unpaidCount} unpaid bill${unpaidCount === 1 ? '' : 's'}` : 'You’re all paid up'} />
        <StatCard accent color="blue" icon="clock" label="Next due" value={v(nextDue ? formatDay(nextDue.dueDate) : '—')} sub={nextDue ? formatMoney(invBalance(nextDue)) : 'Nothing due'} />
        <StatCard accent color="teal" icon="check" label={`Paid in ${year}`} value={payments.loading ? '…' : payments.error ? '—' : formatMoney(paidYear)} />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS} value={tab} onChange={setTab} />
          <span className={s.muted} style={{ fontSize: 12 }}>Pay securely by card, bank transfer or USSD</span>
        </div>
        {tab === 'BILLS'
          ? <DataTable columns={billCols} rows={all} loading={invoices.loading} error={invoices.error} emptyText="No bills yet." />
          : <DataTable columns={payCols} rows={paid} loading={payments.loading} error={payments.error} emptyText="No payments yet." />}
      </div>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? invNo(viewing) : ''}>
        {viewing && (
          <>
            <div className={s.details}>
              <Detail label="Issued">{formatDay(pick(viewing, 'issuedAt', 'createdAt'))}</Detail>
              <Detail label="Due">{formatDay(viewing.dueDate)}</Detail>
              <Detail label="Status"><StatusBadge status={isOverdueInv(viewing) ? 'OVERDUE' : invStatus(viewing)} /></Detail>
              <Detail label="Paid so far">{formatMoney(invPaid(viewing))}</Detail>
            </div>
            <table className={s.previewTable} style={{ marginBottom: 12 }}>
              <thead><tr><th>Item</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
              <tbody>
                {(Array.isArray(viewing.items) && viewing.items.length ? viewing.items : [{ description: pick(viewing, 'description', 'title') || serviceLabel(viewing.serviceType), quantity: 1, unitPrice: invTotal(viewing) }]).map((it, k) => (
                  <tr key={it.id ?? k}>
                    <td>{pick(it, 'description', 'name')}</td>
                    <td style={{ textAlign: 'right' }}>{num(it.quantity) || 1}</td>
                    <td className={s.money} style={{ textAlign: 'right' }}>{formatMoney(num(pick(it, 'amount', 'total') ?? num(it.unitPrice) * (num(it.quantity) || 1)))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' }}><span>Total</span><strong>{formatMoney(invTotal(viewing))}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' }}><span>To pay</span><strong>{formatMoney(invBalance(viewing))}</strong></div>
            <div className={s.modalActions}>
              {pick(viewing, 'pdfUrl', 'url') && <a className={`${s.btn} ${s.btnView} ${s.btnLarge}`} href={pick(viewing, 'pdfUrl', 'url')} target="_blank" rel="noopener noreferrer"><Icon name="download" /> PDF</a>}
              {invBalance(viewing) > 0 && <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={paying != null} onClick={() => pay(viewing)}>{paying === viewing.id ? 'Opening…' : `Pay ${formatMoney(invBalance(viewing))}`}</button>}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

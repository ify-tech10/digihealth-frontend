import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { financeApi } from '../../Api/financeApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatMoney, humanize, matches, pick } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { Detail, SearchBox } from '../Admin/components/Common';
import { SettleModal } from './components/FinanceModals';
import { monthKey, monthLabel, nairaShort, num, shiftMonth, sumBy } from './financeFields';
import s from '../Admin/admin.module.css';
import f from './Finance.module.css';

/* Providers set their own earning structure (per request, weekly or monthly); office staff are salaried. */
const PAY_BASIS = { SALARY: 'Monthly salary', MONTHLY: 'Monthly', WEEKLY: 'Weekly', PER_REQUEST: 'Per request' };

const nameOf = (p) => pick(p, 'staffName', 'fullName', 'name');
const basisOf = (p) => PAY_BASIS[String(pick(p, 'payBasis', 'earningStructure') || 'SALARY').toUpperCase()] || humanize(p.payBasis);
const grossOf = (p) => num(pick(p, 'grossPay', 'baseSalary', 'base', 'earnings'));
const allowOf = (p) => num(pick(p, 'allowances', 'reimbursements'));
const deductOf = (p) => num(pick(p, 'deductions', 'tax'));
const netOf = (p) => (pick(p, 'netPay', 'net') != null ? num(pick(p, 'netPay', 'net')) : grossOf(p) + allowOf(p) - deductOf(p));
const statusOf = (p) => String(p.status || 'PENDING').toUpperCase();
const lastFour = (acct) => (acct ? `•••• ${String(acct).slice(-4)}` : null);

export default function Payroll() {
  usePageHeader('Payroll', 'Salaries and provider earnings for the month');
  const { toast, showToast, clearToast } = useToast();

  const [month, setMonth] = useState(monthKey());
  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [paying, setPaying] = useState(null);

  const { data, loading, error, reload } = useApi(() => financeApi.payroll(month), `fin-payroll-${month}`);
  const lines = Array.isArray(data) ? data : asList(pick(data || {}, 'lines', 'items', 'content'));
  const runStatus = String(pick(data || {}, 'status', 'runStatus') || (lines.length && lines.every((p) => statusOf(p) === 'PAID') ? 'PAID' : 'DRAFT')).toUpperCase();
  const processed = ['PROCESSED', 'PAID'].includes(runStatus);

  const rows = lines.filter((p) => matches(query, nameOf(p), p.role, basisOf(p)));
  const unpaid = lines.filter((p) => statusOf(p) !== 'PAID');
  const totalNet = sumBy(lines, netOf);

  async function process() {
    setBusy(true);
    try {
      await financeApi.processPayroll(month);
      showToast('success', `${monthLabel(month)} payroll processed — ${formatMoney(totalNet)} for ${lines.length} staff.`);
      setConfirming(false);
      reload();
    } catch (err) {
      showToast('error', `Payroll not processed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(p, body) {
    await financeApi.markPayslipPaid(p.id, body.reference);
    setPaying(null);
    showToast('success', `${nameOf(p)} marked as paid.`);
    reload();
  }

  function exportCsv() {
    downloadCsv(
      `payroll-${month}.csv`,
      ['Name', 'Role', 'Pay basis', 'Gross', 'Allowances', 'Deductions', 'Net pay', 'Bank', 'Account number', 'Status'],
      lines.map((p) => [nameOf(p), humanize(p.role), basisOf(p), grossOf(p), allowOf(p), deductOf(p), netOf(p), p.bankName, p.accountNumber, statusOf(p)])
    );
  }

  const v = (x) => (loading ? '…' : error ? '—' : x);

  const columns = [
    { key: 'name', header: 'Staff', render: (p) => <div className={s.tdName}>{nameOf(p) || '—'}<small>{humanize(pick(p, 'role', 'serviceProviderType'))}</small></div> },
    { key: 'basis', header: 'Pay basis', render: (p) => (
      <span>{basisOf(p)}{pick(p, 'requestsCompleted', 'visitsCompleted') != null && <span className={s.muted}> · {pick(p, 'requestsCompleted', 'visitsCompleted')} done</span>}</span>
    ) },
    { key: 'gross', header: 'Gross', align: 'right', render: (p) => formatMoney(grossOf(p)) },
    { key: 'allow', header: 'Allowances', align: 'right', render: (p) => (allowOf(p) ? <span className={f.plus}>+{formatMoney(allowOf(p))}</span> : '—') },
    { key: 'deduct', header: 'Deductions', align: 'right', render: (p) => (deductOf(p) ? <span className={f.minus}>−{formatMoney(deductOf(p))}</span> : '—') },
    { key: 'net', header: 'Net pay', align: 'right', render: (p) => <span className={f.amount} style={{ fontSize: 14 }}>{formatMoney(netOf(p))}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={statusOf(p)} /> },
    { key: 'actions', header: '', render: (p) => (
      <div className={s.actions} style={{ flexWrap: 'nowrap' }}>
        {processed && statusOf(p) !== 'PAID' && <button type="button" className={`${s.btn} ${s.btnApprove}`} onClick={() => setPaying(p)}>Mark paid</button>}
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(p)}>Payslip</button>
      </div>
    ) },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={`${s.card} ${s.spaced}`}>
        <div className={f.monthBar}>
          <button type="button" className={f.navBtn} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><Icon name="chevronLeft" /></button>
          <h3>{monthLabel(month)} {!loading && !error && lines.length > 0 && <StatusBadge status={processed ? (runStatus === 'PAID' ? 'PAID' : 'PROCESSED') : 'PENDING'} />}</h3>
          <button type="button" className={f.navBtn} onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= monthKey()} aria-label="Next month"><Icon name="chevronRight" /></button>
        </div>
      </div>

      <div className={s.stats4}>
        <StatCard accent color="blue" icon="users" label="Total net pay" value={v(nairaShort(totalNet))} sub={loading || error ? '' : `${lines.length} staff`} />
        <StatCard accent color="green" icon="check" label="Paid" value={v(lines.length - unpaid.length)} sub={loading || error ? '' : nairaShort(totalNet - sumBy(unpaid, netOf))} />
        <StatCard accent color="orange" icon="clock" label="Still to pay" value={v(unpaid.length)} sub={loading || error ? '' : nairaShort(sumBy(unpaid, netOf))} />
        <StatCard accent color="purple" icon="dollar" label="Deductions" value={v(nairaShort(sumBy(lines, deductOf)))} sub="Tax, pension & others" />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <SearchBox value={query} onChange={setQuery} placeholder="Search staff, role…" />
          <div className={s.toolbarRight}>
            <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={exportCsv} disabled={!lines.length}><Icon name="download" /> Bank CSV</button>
            <button
              type="button"
              className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`}
              onClick={() => setConfirming(true)}
              disabled={loading || !!error || !lines.length || processed}
              title={processed ? 'Already processed for this month' : undefined}
            >
              <Icon name="check" /> {processed ? 'Processed' : 'Process payroll'}
            </button>
          </div>
        </div>
        <DataTable key={month} columns={columns} rows={rows} loading={loading} error={error} emptyText={query ? 'No one matches your search.' : `No payroll for ${monthLabel(month)} yet.`} />
      </div>

      <ConfirmDialog
        isOpen={confirming}
        title="Process payroll"
        message={`Process ${monthLabel(month)} payroll: ${formatMoney(totalNet)} net for ${lines.length} staff? Payslips go out and the lines lock — this can’t be undone here.`}
        confirmLabel="Process payroll"
        busy={busy}
        onClose={() => setConfirming(false)}
        onConfirm={process}
      />

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? `Payslip — ${nameOf(viewing)}` : ''}>
        {viewing && (
          <div className={s.details}>
            <Detail label="Month">{monthLabel(month)}</Detail>
            <Detail label="Role">{humanize(pick(viewing, 'role', 'serviceProviderType'))}</Detail>
            <Detail label="Pay basis">{basisOf(viewing)}</Detail>
            {pick(viewing, 'requestsCompleted', 'visitsCompleted') != null && <Detail label="Requests completed">{pick(viewing, 'requestsCompleted', 'visitsCompleted')}</Detail>}
            <Detail label="Gross">{formatMoney(grossOf(viewing))}</Detail>
            <Detail label="Allowances / reimbursements">{formatMoney(allowOf(viewing))}</Detail>
            <Detail label="Deductions">{formatMoney(deductOf(viewing))}</Detail>
            <Detail label="Net pay"><span className={f.big}>{formatMoney(netOf(viewing))}</span></Detail>
            <Detail label="Bank">{viewing.bankName}</Detail>
            <Detail label="Account">{lastFour(viewing.accountNumber)}</Detail>
            <Detail label="Status"><StatusBadge status={statusOf(viewing)} /></Detail>
            {viewing.paymentReference && <Detail label="Payment reference">{viewing.paymentReference}</Detail>}
          </div>
        )}
      </Modal>

      <SettleModal
        target={paying}
        title="Mark as paid"
        intro={paying ? `${nameOf(paying)} — ${paying.bankName || 'bank not set'} ${lastFour(paying.accountNumber) || ''}` : ''}
        defaultAmount={paying ? netOf(paying) : 0}
        allowPartial={false}
        onClose={() => setPaying(null)}
        onConfirm={markPaid}
      />
    </>
  );
}

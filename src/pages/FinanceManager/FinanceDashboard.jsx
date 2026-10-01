import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { financeApi } from '../../Api/financeApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/useAuth';
import { formatDay, formatMoney, humanize, pick, timeAgo, todayLabel } from '../../utils/format';
import { Donut, MonthlyChart } from './components/FinanceCharts';
import { InvoiceModal, NewInvoiceModal, RecordPaymentModal } from './components/FinanceModals';
import {
  PAYMENT_METHODS, claimAmount, expenseAmount, expenseStatus, invoiceBalance,
  invoiceClient, invoiceDue, invoiceNo, invoiceService, invoiceStatus, isClaimOpen, isOutstanding,
  monthKey, monthLabel, nairaShort, num, paymentAmount, paymentDate, paymentFrom, sumBy,
} from './financeFields';
import s from '../Admin/admin.module.css';
import f from './Finance.module.css';

const PREVIEW_ROWS = 5;
const METHOD = Object.fromEntries(PAYMENT_METHODS);
const ACTIVITY_COLORS = {
  PAYMENT: '#22c55e', PAYMENT_RECEIVED: '#22c55e', INVOICE_CREATED: '#22c55e',
  OVERDUE: '#ef4444', INVOICE_OVERDUE: '#ef4444',
  EXPENSE: '#3b82f6', EXPENSE_APPROVED: '#3b82f6',
  HMO: '#9333ea', HMO_CLAIM: '#9333ea',
  PAYROLL: '#0891b2',
};
const plain = (html) => String(html || '').replace(/<[^>]*>/g, '');

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function FinanceDashboard() {
  const { user } = useAuth();
  const { setHeader, setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const month = monthKey();
  const year = new Date().getFullYear();
  const summary = useApi(() => financeApi.summary(month), `fin-summary-${month}`);
  const invoices = useApi(() => financeApi.invoices(), 'fin-invoices');
  const claims = useApi(() => financeApi.hmoClaims(), 'fin-hmo');
  const expenses = useApi(() => financeApi.expenseClaims(), 'fin-expenses');
  const bills = useApi(() => financeApi.facilityBills('APPROVED'), 'fin-bills-approved');
  const payments = useApi(() => financeApi.payments({ month }), `fin-payments-${month}`);
  const monthly = useApi(() => financeApi.monthly(year), `fin-monthly-${year}`);
  const byService = useApi(() => financeApi.revenueByService(month), `fin-services-${month}`);
  const activity = useApi(() => financeApi.activity(6), 'fin-activity');

  const [viewing, setViewing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(null);
  const [recording, setRecording] = useState(false);
  const [reminding, setReminding] = useState(null);

  useEffect(() => {
    setHeader({ title: 'Finance Dashboard', subtitle: todayLabel() });
  }, [setHeader]);

  const invList = asList(invoices.data);
  const outstanding = invList.filter(isOutstanding).sort((a, b) =>
    (invoiceStatus(b) === 'OVERDUE') - (invoiceStatus(a) === 'OVERDUE') || new Date(invoiceDue(a) || 0) - new Date(invoiceDue(b) || 0));
  const openClaims = asList(claims.data).filter(isClaimOpen);
  const pendingExpenses = asList(expenses.data).filter((e) => expenseStatus(e) === 'PENDING');
  const billList = asList(bills.data);
  const payList = asList(payments.data).slice().sort((a, b) => new Date(paymentDate(b) || 0) - new Date(paymentDate(a) || 0));

  useEffect(() => {
    const next = {};
    if (!invoices.loading && !invoices.error) next.invoices = outstanding.length;
    if (!claims.loading && !claims.error) next.hmo = openClaims.length;
    if (!expenses.loading && !expenses.error) next.expenses = pendingExpenses.length;
    if (!bills.loading && !bills.error) next.bills = billList.length;
    setBadges(next);
  }, [invoices.loading, invoices.error, claims.loading, claims.error, expenses.loading, expenses.error, bills.loading, bills.error,
    outstanding.length, openClaims.length, pendingExpenses.length, billList.length, setBadges]);

  /* figures from the summary endpoint, or worked out from the lists we already have */
  const sm = summary.data || {};
  const ready = (st) => !st.loading && !st.error;
  const revenue = pick(sm, 'revenue', 'totalRevenue');
  const expenseTotal = pick(sm, 'expenses', 'totalExpenses');
  const netProfit = pick(sm, 'netProfit', 'profit') ?? (revenue != null && expenseTotal != null ? num(revenue) - num(expenseTotal) : null);
  const outstandingAmt = pick(sm, 'outstanding', 'outstandingAmount') ?? (ready(invoices) ? sumBy(outstanding, invoiceBalance) : null);
  const outstandingCount = pick(sm, 'outstandingCount') ?? (ready(invoices) ? outstanding.length : null);
  const hmoAmt = pick(sm, 'hmoPending', 'hmoClaimsPending') ?? (ready(claims) ? sumBy(openClaims, claimAmount) : null);
  const hmoCount = pick(sm, 'hmoPendingCount') ?? (ready(claims) ? openClaims.length : null);
  const expAmt = pick(sm, 'expenseClaimsPending') ?? (ready(expenses) ? sumBy(pendingExpenses, expenseAmount) : null);
  const expCount = pick(sm, 'expenseClaimsCount') ?? (ready(expenses) ? pendingExpenses.length : null);
  const payroll = pick(sm, 'payroll', 'payrollTotal');
  const received = pick(sm, 'paymentsReceived') ?? (ready(payments) ? sumBy(payList, paymentAmount) : null);
  const budgetUsed = pick(sm, 'budgetUsed', 'budgetUtilisation');

  const money = (v, st) => (v == null ? (st.loading ? '…' : '—') : nairaShort(v));
  const count = (v, noun) => (v == null ? '' : `${v} ${noun}${v === 1 ? '' : 's'}`);
  const first = String(pick(user || {}, 'name') || '').trim().split(/\s+/)[0];
  const mon = monthLabel(month, 'short').split(' ')[0];

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

  const months = Array.from({ length: new Date().getMonth() + 1 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    const row = asList(monthly.data).find((x) => String(pick(x, 'month', 'period') || '').slice(0, 7) === key) || {};
    return {
      label: new Date(year, i, 1).toLocaleDateString('en-GB', { month: 'short' }),
      full: new Date(year, i, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      values: { revenue: num(pick(row, 'revenue')), expenses: num(pick(row, 'expenses')) },
    };
  });

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      {/* ── HERO ── */}
      <section className={f.hero}>
        <div className={f.heroLeft}>
          <div className={f.heroTag}>Finance Portal</div>
          <div className={f.heroTitle}>{greeting()}{first && !first.includes('@') ? `, ${first}` : ''}</div>
          <div className={f.heroSub}>
            <strong>{count(outstandingCount, 'invoice') || '— invoices'}</strong> outstanding ·{' '}
            <strong>{count(expCount, 'expense claim') || '— expense claims'}</strong> awaiting approval ·{' '}
            <strong>{count(hmoCount, 'HMO claim') || '— HMO claims'}</strong> pending.
          </div>
        </div>
        <div className={f.heroRight}>
          <div className={f.heroStat}><div className={f.heroVal}>{money(revenue, summary)}</div><div className={f.heroLbl}>Revenue ({mon})</div></div>
          <div className={f.heroStat}><div className={f.heroVal}>{money(outstandingAmt, invoices)}</div><div className={f.heroLbl}>Outstanding</div></div>
          <div className={f.heroStat}><div className={f.heroVal}>{money(expenseTotal, summary)}</div><div className={f.heroLbl}>Expenses ({mon})</div></div>
          <div className={f.heroStat}><div className={f.heroVal}>{money(netProfit, summary)}</div><div className={f.heroLbl}>Net Profit</div></div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className={f.stats}>
        <StatCard accent color="green" icon="trendingUp" label={`Total Revenue (${mon})`} sub="Across all services" value={money(revenue, summary)} />
        <StatCard accent color="red" icon="alert" label="Outstanding Invoices" sub={count(outstandingCount, 'invoice') || 'Awaiting payment'} value={money(outstandingAmt, invoices)} />
        <StatCard accent color="blue" icon="shield" label="HMO Claims Pending" sub={count(hmoCount, 'claim') || 'Awaiting insurer payout'} value={money(hmoAmt, claims)} />
        <StatCard accent color="orange" icon="dollar" label="Expense Claims" sub={count(expCount, 'claim') ? `${count(expCount, 'claim')} to approve` : 'Awaiting approval'} value={money(expAmt, expenses)} />
        <StatCard accent color="purple" icon="users" label={`Payroll (${mon})`} sub={pick(sm, 'payrollStaff') != null ? `${pick(sm, 'payrollStaff')} staff` : 'Salaries & provider pay'} value={money(payroll, summary)} />
        <StatCard accent color="teal" icon="card" label="Payments Received" sub={ready(payments) ? count(payList.length, 'payment') + ' this month' : 'This month'} value={money(received, payments)} />
        <StatCard accent color="green" icon="activity" label="Budget Utilised" sub={`${monthLabel(month)} budget`} value={budgetUsed == null ? (summary.loading ? '…' : '—') : `${Math.round(num(budgetUsed))}%`} />
        <StatCard accent color="purple" icon="layers" label={`Net Profit (${mon})`} sub="Revenue minus expenses" value={money(netProfit, summary)} />
      </div>

      {/* ── OUTSTANDING INVOICES + QUICK ACTIONS ── */}
      <div className={f.grid31}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Outstanding Invoices</h3><span className={s.muted} style={{ fontSize: 12 }}>Overdue first</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.previewTable}>
              <thead><tr><th>Invoice</th><th>Client</th><th>Service</th><th>Balance</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {invoices.loading || !outstanding.length ? (
                  <tr><td colSpan={7} className={s.previewEmpty}>{invoices.loading ? 'Loading…' : invoices.error || 'Nothing outstanding — every invoice is paid.'}</td></tr>
                ) : (
                  outstanding.slice(0, PREVIEW_ROWS).map((i) => (
                    <tr key={i.id}>
                      <td><span className={f.mono}>{invoiceNo(i)}</span></td>
                      <td className={s.tdName}>{invoiceClient(i)}</td>
                      <td>{invoiceService(i)}</td>
                      <td><span className={invoiceStatus(i) === 'OVERDUE' ? f.minus : f.amount}>{formatMoney(invoiceBalance(i))}</span></td>
                      <td className={f.nowrap}><span className={invoiceStatus(i) === 'OVERDUE' ? f.overdue : undefined}>{formatDay(invoiceDue(i))}</span></td>
                      <td><StatusBadge status={invoiceStatus(i)} /></td>
                      <td>
                        <div className={s.actions}>
                          <button type="button" className={`${s.btn} ${s.btnView}`} disabled={reminding === i.id} onClick={() => remind(i)}>{reminding === i.id ? 'Sending…' : 'Remind'}</button>
                          <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(i)}>View</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Link to="/finance/invoices" className={f.viewAll}>View All Invoices <Icon name="chevronRight" /></Link>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>Quick Actions</h3></div>
          <div className={f.quick}>
            <button type="button" className={f.qa} onClick={() => setCreating(true)}>
              <div className={f.qaIcon}><Icon name="file" /></div>
              <div><div className={f.qaLabel}>New Invoice</div><div className={f.qaSub}>Create & send</div></div>
            </button>
            <button type="button" className={f.qa} onClick={() => setRecording(true)}>
              <div className={f.qaIcon}><Icon name="card" /></div>
              <div><div className={f.qaLabel}>Record Payment</div><div className={f.qaSub}>Money received</div></div>
            </button>
            <Link to="/finance/expenses" className={f.qa}>
              <div className={f.qaIcon}><Icon name="dollar" /></div>
              <div><div className={f.qaLabel}>Expense Claims</div><div className={f.qaSub}>Review pending</div></div>
            </Link>
            <Link to="/finance/reports" className={f.qa}>
              <div className={f.qaIcon}><Icon name="download" /></div>
              <div><div className={f.qaLabel}>Export Report</div><div className={f.qaSub}>P&L, cash flow…</div></div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── CHARTS ── */}
      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Revenue vs Expenses — {year}</h3><span className={s.muted} style={{ fontSize: 12 }}>Monthly comparison</span></div>
          <MonthlyChart
            months={months}
            loading={monthly.loading}
            error={monthly.error}
            series={[{ key: 'revenue', label: 'Revenue', color: '#1d4ed8' }, { key: 'expenses', label: 'Expenses', color: '#f87171' }]}
          />
        </div>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Revenue by Service</h3><span className={s.muted} style={{ fontSize: 12 }}>{monthLabel(month)}</span></div>
          <Donut
            loading={byService.loading}
            error={byService.error}
            centerLabel={mon}
            slices={asList(byService.data).map((x) => ({ label: humanize(pick(x, 'service', 'category', 'label')).replace(/\bHmo\b/g, 'HMO'), value: num(pick(x, 'amount', 'revenue', 'value')) }))}
          />
        </div>
      </div>

      {/* ── PAYMENTS + ACTIVITY ── */}
      <div className={f.grid31}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Recent Payments Received</h3><span className={s.muted} style={{ fontSize: 12 }}>{monthLabel(month)}</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.previewTable}>
              <thead><tr><th>Date</th><th>From</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead>
              <tbody>
                {payments.loading || !payList.length ? (
                  <tr><td colSpan={5} className={s.previewEmpty}>{payments.loading ? 'Loading…' : payments.error || 'No payments received this month yet.'}</td></tr>
                ) : (
                  payList.slice(0, PREVIEW_ROWS).map((p, i) => (
                    <tr key={p.id ?? i}>
                      <td className={s.muted}>{formatDay(paymentDate(p))}</td>
                      <td className={s.tdName}>{paymentFrom(p)}</td>
                      <td>{METHOD[String(p.method || '').toUpperCase()] || humanize(p.method)}</td>
                      <td><span className={f.mono} style={{ color: '#8898c8' }}>{p.reference || '—'}</span></td>
                      <td><span className={f.plus}>{formatMoney(paymentAmount(p))}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Link to="/finance/payments" className={f.viewAll}>All Payments <Icon name="chevronRight" /></Link>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>Finance Activity</h3><span className={s.muted} style={{ fontSize: 12 }}>Live feed</span></div>
          <div className={f.activity}>
            {activity.loading ? (
              <p className={s.muted} style={{ fontSize: 13 }}>Loading…</p>
            ) : !asList(activity.data).length ? (
              <p className={s.muted} style={{ fontSize: 13 }}>{activity.error ? 'Activity is unavailable right now.' : 'No recent activity.'}</p>
            ) : (
              asList(activity.data).map((a, i) => (
                <div key={a.id ?? i} className={f.actItem}>
                  <span className={f.actDot} style={{ background: a.color || ACTIVITY_COLORS[String(a.type).toUpperCase()] || '#8898c8' }} />
                  <div className={f.actText}>{plain(pick(a, 'text', 'description', 'message'))}</div>
                  <div className={f.actTime}>{a.time || timeAgo(pick(a, 'createdAt', 'timestamp'))}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <InvoiceModal
        invoice={viewing}
        reminding={reminding === viewing?.id}
        onClose={() => setViewing(null)}
        onRemind={remind}
        onRecordPayment={(i) => { setViewing(null); setPaying(i); }}
      />
      <NewInvoiceModal open={creating} onClose={() => setCreating(false)} onCreated={(msg) => { setCreating(false); showToast('success', msg); invoices.reload(); }} />
      <RecordPaymentModal
        open={!!paying || recording}
        invoice={paying}
        invoices={invList}
        onClose={() => { setPaying(null); setRecording(false); }}
        onRecorded={(msg) => { setPaying(null); setRecording(false); showToast('success', msg); invoices.reload(); payments.reload(); summary.reload(); }}
      />
    </>
  );
}


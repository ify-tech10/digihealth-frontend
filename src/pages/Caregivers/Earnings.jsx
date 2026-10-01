import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import { providerApi } from '../../Api/providerApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, formatMoney, pick } from '../../utils/format';
import s from '../Admin/admin.module.css';
import p from './Provider.module.css';

const STRUCTURES = [
  ['PER_REQUEST', 'Per request', 'Paid a fixed amount for each completed request.'],
  ['WEEKLY', 'Weekly', 'A set amount every week you are active.'],
  ['MONTHLY', 'Monthly', 'A set amount every month you are active.'],
];
const STRUCTURE_LABEL = Object.fromEntries(STRUCTURES.map(([v, l]) => [v, l]));

export default function Earnings() {
  usePageHeader('Earnings', 'How you are paid and what you have earned');
  const { toast, showToast, clearToast } = useToast();

  const summary = useApi(() => providerApi.earningsSummary(), 'p-earn');
  const structure = useApi(() => providerApi.earningStructure(), 'p-structure');
  const payouts = useApi(() => providerApi.payouts(), 'p-payouts');

  const e = summary.data || {};
  const paidList = asList(payouts.data);
  const totalPaid = paidList
    .filter((x) => ['PAID', 'SUCCESS', 'COMPLETED'].includes(String(x.status).toUpperCase()))
    .reduce((t, x) => t + (Number(pick(x, 'amount', 'total')) || 0), 0);
  const pending = paidList
    .filter((x) => String(x.status).toUpperCase() === 'PENDING')
    .reduce((t, x) => t + (Number(pick(x, 'amount', 'total')) || 0), 0);

  const val = (state, v, fmt = (x) => x) => (state.loading ? '…' : v == null ? '—' : fmt(v));

  const columns = [
    { key: 'period', header: 'Period', render: (x) => pick(x, 'period', 'periodLabel') || `${formatDay(pick(x, 'periodStart', 'from'))} – ${formatDay(pick(x, 'periodEnd', 'to'))}` },
    { key: 'visits', header: 'Visits / requests', render: (x) => pick(x, 'completedVisits', 'requestCount', 'visits') ?? '—' },
    { key: 'basis', header: 'Basis', render: (x) => STRUCTURE_LABEL[String(pick(x, 'structure', 'earningStructure') || '').toUpperCase()] || '—' },
    { key: 'status', header: 'Status', render: (x) => <StatusBadge status={x.status} /> },
    { key: 'paid', header: 'Paid on', render: (x) => formatDay(pick(x, 'paidAt', 'paymentDate')) },
    { key: 'amount', header: 'Amount', align: 'right', render: (x) => <span className={s.money}>{formatMoney(pick(x, 'amount', 'total'))}</span> },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={p.stats4}>
        <StatCard label="Earned this month" icon="dollar" color="green" value={val(summary, pick(e, 'total', 'thisMonthEarnings', 'monthEarnings'), formatMoney)} />
        <StatCard label="Completed visits this month" icon="check" color="blue" value={val(summary, pick(e, 'completedVisits', 'visitsThisMonth'))} />
        <StatCard label="Awaiting payout" icon="clock" color="orange" value={val(payouts, payouts.error ? null : pending, formatMoney)} />
        <StatCard label="Paid to date" icon="trendingUp" color="purple" value={val(payouts, payouts.error ? null : totalPaid, formatMoney)} />
      </div>

      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.cardHeader}><h3>Earning structure</h3></div>
        {structure.loading ? (
          <div className={s.emptyBlock}>Loading…</div>
        ) : (
          <StructureForm
            current={structure.data || {}}
            loadError={structure.error}
            onSaved={(msg) => { showToast('success', msg); structure.reload(); summary.reload(); }}
          />
        )}
      </div>

      <div className={s.card}>
        <div className={s.cardHeader}><h3>Payout history</h3></div>
        <DataTable
          columns={columns}
          rows={paidList}
          loading={payouts.loading}
          error={payouts.error}
          emptyText="No payouts yet."
        />
      </div>
    </>
  );
}

function StructureForm({ current, loadError, onSaved }) {
  const [type, setType] = useState(String(pick(current, 'structure', 'earningStructure', 'type') || 'PER_REQUEST').toUpperCase());
  const [rate, setRate] = useState(String(pick(current, 'rate', 'amount', 'ratePerVisit') ?? ''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const status = pick(current, 'status', 'approvalStatus');

  async function submit(e) {
    e.preventDefault();
    const amount = Number(rate);
    if (!(amount > 0)) {
      setError('Enter your rate in naira.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await providerApi.setEarningStructure({ structure: type, rate: amount });
      onSaved(`Earning structure set to ${STRUCTURE_LABEL[type].toLowerCase()} at ${formatMoney(amount)}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const unit = type === 'PER_REQUEST' ? 'per completed request' : type === 'WEEKLY' ? 'per week' : 'per month';

  return (
    <form className={s.cardBody} onSubmit={submit} noValidate>
      {loadError && <p className={s.muted} style={{ fontSize: 12.5, marginBottom: 12 }}>No structure saved yet — choose one below.</p>}
      {status && <p className={s.hint} style={{ marginBottom: 12 }}>Current setting: <StatusBadge status={status} /></p>}

      <div className={p.choices} role="radiogroup" aria-label="Earning structure">
        {STRUCTURES.map(([v, l, d]) => (
          <label key={v} className={`${p.choice} ${type === v ? p.choiceOn : ''}`} style={{ position: 'relative' }}>
            <input type="radio" name="structure" value={v} checked={type === v} onChange={() => setType(v)} />
            <strong>{l}</strong>
            <span>{d}</span>
          </label>
        ))}
      </div>

      <div className={s.field} style={{ marginTop: 16, maxWidth: 320 }}>
        <label htmlFor="rate">Rate (₦) <span className={s.muted} style={{ fontWeight: 500 }}>{unit}</span></label>
        <input id="rate" type="number" min="0" step="500" inputMode="numeric" value={rate} onChange={(ev) => setRate(ev.target.value)} />
        {error && <span className={s.fieldError}>{error}</span>}
      </div>

      <div className={s.modalActions} style={{ justifyContent: 'flex-start' }}>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Save structure'}</button>
        <span className={s.muted} style={{ fontSize: 12, alignSelf: 'center' }}>Changes apply from your next pay period.</span>
      </div>
    </form>
  );
}

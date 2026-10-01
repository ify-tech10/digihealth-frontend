import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, formatMoney, matches, pick, toISODate } from '../../utils/format';
import { Detail, Person, SearchBox, Tabs } from './components/Common';
import { isActiveRecord } from './components/status';
import s from './admin.module.css';
import h from './Hmo.module.css';

const DAY = 86400000;
const EXPIRING_DAYS = 30;

const TABS = [
  ['ALL', 'All'],
  ['ACTIVE', 'Active'],
  ['EXPIRING', 'Expiring soon'],
  ['EXPIRED', 'Expired'],
  ['PENDING_PAYMENT', 'Awaiting payment'],
];

/* ── field helpers (tolerant of backend naming) ── */
const nameOf = (x) => pick(x, 'subscriberName', 'companyName', 'organisationName', 'patientName', 'fullName');
const typeOf = (x) => String(pick(x, 'subscriberType', 'type') || (x.companyName || x.organisationName ? 'ORGANISATION' : 'INDIVIDUAL')).toUpperCase();
const planOf = (x) => pick(x, 'planName', 'plan') ?? '—';
const expiryOf = (x) => pick(x, 'expiryDate', 'endDate', 'expiresAt');
const limitOf = (x) => Number(pick(x, 'benefitLimit', 'planBenefitLimit')) || 0;
const usedOf = (x) => Number(pick(x, 'benefitUsed', 'amountUsed', 'utilisedAmount')) || 0;
const membersOf = (x) => Number(pick(x, 'memberCount', 'members', 'enrolledCount')) || 1;

function daysLeft(x) {
  const exp = expiryOf(x);
  if (!exp) return null;
  return Math.ceil((new Date(exp).setHours(23, 59, 59) - Date.now()) / DAY);
}

/* Expired by date wins over whatever status the backend stored. */
function statusOf(x) {
  const st = String(x.status || 'ACTIVE').toUpperCase();
  if (st === 'PENDING_PAYMENT') return st;
  const d = daysLeft(x);
  if (d !== null && d < 0) return 'EXPIRED';
  return st;
}

function inTab(x, tab) {
  const st = statusOf(x);
  if (tab === 'ALL') return true;
  if (tab === 'EXPIRING') {
    const d = daysLeft(x);
    return st === 'ACTIVE' && d !== null && d <= EXPIRING_DAYS;
  }
  return st === tab;
}

function oneYearFrom(iso) {
  const d = new Date(`${iso}T00:00:00`);
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

function Usage({ used, limit }) {
  if (!limit) return <span className={s.muted}>—</span>;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const cls = pct >= 100 ? h.fillOver : pct >= 80 ? h.fillWarn : '';
  return (
    <div className={h.usage} title={`${pct}% of benefit limit used`}>
      <div className={h.usageText}><strong>{formatMoney(used)}</strong> of {formatMoney(limit)}</div>
      <div className={h.track}><div className={`${h.fill} ${cls}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function Expiry({ sub }) {
  const d = daysLeft(sub);
  if (d === null) return <span className={s.muted}>—</span>;
  return (
    <div className={h.expiry}>
      {formatDay(expiryOf(sub))}
      <div className={d < 0 ? h.past : d <= EXPIRING_DAYS ? h.soon : s.muted}>
        {d < 0 ? `Expired ${-d} day${d === -1 ? '' : 's'} ago` : d === 0 ? 'Expires today' : `${d} day${d === 1 ? '' : 's'} left`}
      </div>
    </div>
  );
}

export default function HmoSubscriptions() {
  usePageHeader('HMO Subscriptions', 'Who is covered, until when, and how much benefit is left');
  const { toast, showToast, clearToast } = useToast();

  const [tab, setTab] = useState('ALL');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [renewing, setRenewing] = useState(null);

  const { data, loading, error, reload } = useApi(() => adminApi.hmoSubscriptions(), 'subs');
  const all = asList(data);

  const rows = all.filter((x) => inTab(x, tab) && matches(query, nameOf(x), planOf(x)));
  const count = (t) => all.filter((x) => inTab(x, t)).length;

  const columns = [
    { key: 'sub', header: 'Subscriber', render: (x) => (
      <Person name={nameOf(x)} sub={typeOf(x) === 'ORGANISATION' ? `Organisation · ${membersOf(x)} members` : 'Individual patient'} />
    ) },
    { key: 'plan', header: 'Plan', render: (x) => planOf(x) },
    { key: 'start', header: 'Start', render: (x) => formatDay(pick(x, 'startDate', 'startsAt')) },
    { key: 'expiry', header: 'Expires', render: (x) => <Expiry sub={x} /> },
    { key: 'usage', header: 'Benefit used', render: (x) => <Usage used={usedOf(x)} limit={limitOf(x)} /> },
    { key: 'status', header: 'Status', render: (x) => <StatusBadge status={statusOf(x)} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (x) => {
        const d = daysLeft(x);
        const renewable = statusOf(x) !== 'ACTIVE' || (d !== null && d <= EXPIRING_DAYS);
        return (
          <div className={s.actions}>
            {renewable && (
              <button type="button" className={`${s.btn} ${s.btnApprove}`} onClick={() => setRenewing(x)}>
                {statusOf(x) === 'PENDING_PAYMENT' ? 'Confirm payment' : 'Renew'}
              </button>
            )}
            <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(x)}>View</button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.stats4}>
        <StatCard label="Active subscriptions" value={loading ? '…' : count('ACTIVE')} icon="check" color="green" />
        <StatCard label={`Expiring in ${EXPIRING_DAYS} days`} value={loading ? '…' : count('EXPIRING')} icon="clock" color="orange" />
        <StatCard label="Expired (deactivated)" value={loading ? '…' : count('EXPIRED')} icon="lock" color="red" />
        <StatCard label="Awaiting payment" value={loading ? '…' : count('PENDING_PAYMENT')} icon="dollar" color="blue" />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS} value={tab} onChange={setTab} />
          <div className={s.toolbarRight}>
            <SearchBox value={query} onChange={setQuery} placeholder="Search subscriber or plan…" />
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setCreating(true)}>
              <Icon name="plus" /> New subscription
            </button>
          </div>
        </div>
        <DataTable
          key={tab}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query ? 'No subscriptions match your search.' : 'No subscriptions here.'}
        />
      </div>

      <Modal isOpen={creating} onClose={() => setCreating(false)} title="New HMO subscription" size="large">
        {creating && (
          <SubscriptionForm
            onCancel={() => setCreating(false)}
            onSaved={(msg) => { setCreating(false); showToast('success', msg); reload(); }}
          />
        )}
      </Modal>

      <Modal isOpen={!!renewing} onClose={() => setRenewing(null)} title={renewing && statusOf(renewing) === 'PENDING_PAYMENT' ? 'Confirm payment' : 'Renew subscription'}>
        {renewing && (
          <RenewForm
            key={renewing.id}
            sub={renewing}
            onCancel={() => setRenewing(null)}
            onSaved={(msg) => { setRenewing(null); showToast('success', msg); reload(); }}
          />
        )}
      </Modal>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? nameOf(viewing) : ''}>
        {viewing && (
          <div className={s.details}>
            <Detail label="Type">{typeOf(viewing) === 'ORGANISATION' ? 'Organisation' : 'Individual patient'}</Detail>
            <Detail label="Plan">{planOf(viewing)}</Detail>
            <Detail label="Members">{membersOf(viewing)}</Detail>
            <Detail label="Status"><StatusBadge status={statusOf(viewing)} /></Detail>
            <Detail label="Start">{formatDay(pick(viewing, 'startDate', 'startsAt'))}</Detail>
            <Detail label="Expires"><Expiry sub={viewing} /></Detail>
            <Detail label="Benefit used" full><Usage used={usedOf(viewing)} limit={limitOf(viewing)} /></Detail>
            <Detail label="Last payment ref">{pick(viewing, 'paymentReference', 'lastPaymentReference')}</Detail>
            <Detail label="Amount paid">{pick(viewing, 'amountPaid') != null ? formatMoney(viewing.amountPaid) : '—'}</Detail>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ── New subscription ── */
function SubscriptionForm({ onCancel, onSaved }) {
  const plans = useApi(() => adminApi.hmoPlans(), 'plans');
  const orgs = useApi(() => adminApi.hmoApplications('APPROVED'), 'orgs-approved');
  const patients = useApi(() => adminApi.patients(), 'patients');

  const activePlans = asList(plans.data).filter(isActiveRecord);

  const [form, setForm] = useState({
    subscriberType: 'ORGANISATION',
    organisationId: '',
    patientId: '',
    planId: '',
    memberCount: '1',
    startDate: toISODate(new Date()),
    paymentReference: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.value }));

  const isOrg = form.subscriberType === 'ORGANISATION';
  const plan = activePlans.find((p) => String(p.id) === String(form.planId));
  const members = isOrg ? Math.max(1, Number(form.memberCount) || 0) : 1;
  const price = Number(pick(plan || {}, 'annualPrice', 'price', 'premium')) || 0;

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (isOrg && !form.organisationId) errs.organisationId = 'Choose an approved organisation';
    if (!isOrg && !form.patientId) errs.patientId = 'Choose a patient';
    if (!form.planId) errs.planId = 'Choose a plan';
    if (isOrg && !(Number(form.memberCount) >= 1)) errs.memberCount = 'At least 1 member';
    if (!form.startDate) errs.startDate = 'Pick a start date';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const body = {
      subscriberType: form.subscriberType,
      ...(isOrg ? { organisationId: Number(form.organisationId), memberCount: members } : { patientId: Number(form.patientId) }),
      planId: Number(form.planId),
      startDate: form.startDate,
      expiryDate: oneYearFrom(form.startDate),
      paymentReference: form.paymentReference.trim() || null,
      amountPaid: form.paymentReference.trim() ? price * members : null,
    };

    setBusy(true);
    try {
      await adminApi.createHmoSubscription(body);
      onSaved(body.paymentReference ? 'Subscription activated.' : 'Subscription created — awaiting payment.');
    } catch (err) {
      const fieldErrors = err.data?.validationErrors || err.data?.errors;
      setErrors(fieldErrors && typeof fieldErrors === 'object' ? fieldErrors : { general: err.message });
      setBusy(false);
    }
  }

  const fieldErr = (f) => errors[f] && <span className={s.fieldError}>{errors[f]}</span>;
  const patientName = (p) => pick(p, 'fullName', 'name') || [p.firstName, p.lastName].filter(Boolean).join(' ');

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      {errors.general && <p className={s.fieldError} style={{ marginBottom: 12 }}>{errors.general}</p>}
      <div className={s.formGrid}>
        <div className={`${s.field} ${s.full}`}>
          <label>Subscriber</label>
          <Tabs
            options={[['ORGANISATION', 'Organisation'], ['INDIVIDUAL', 'Individual patient']]}
            value={form.subscriberType}
            onChange={(v) => setForm((f) => ({ ...f, subscriberType: v }))}
          />
        </div>

        {isOrg ? (
          <>
            <div className={s.field}>
              <label htmlFor="s-org">Organisation <span className={s.req}>*</span></label>
              <select id="s-org" value={form.organisationId} onChange={set('organisationId')} disabled={orgs.loading}>
                <option value="">{orgs.loading ? 'Loading…' : asList(orgs.data).length ? 'Select organisation' : 'No approved organisations'}</option>
                {asList(orgs.data).map((o) => <option key={o.id} value={o.id}>{o.companyName}</option>)}
              </select>
              {fieldErr('organisationId')}
            </div>
            <div className={s.field}>
              <label htmlFor="s-members">Members to cover <span className={s.req}>*</span></label>
              <input id="s-members" type="number" min="1" value={form.memberCount} onChange={set('memberCount')} />
              {fieldErr('memberCount')}
            </div>
          </>
        ) : (
          <div className={`${s.field} ${s.full}`}>
            <label htmlFor="s-patient">Patient <span className={s.req}>*</span></label>
            <select id="s-patient" value={form.patientId} onChange={set('patientId')} disabled={patients.loading}>
              <option value="">{patients.loading ? 'Loading…' : 'Select patient'}</option>
              {asList(patients.data).map((p) => <option key={p.id} value={p.id}>{patientName(p)} — {p.email}</option>)}
            </select>
            {fieldErr('patientId')}
          </div>
        )}

        <div className={s.field}>
          <label htmlFor="s-plan">Plan <span className={s.req}>*</span></label>
          <select id="s-plan" value={form.planId} onChange={set('planId')} disabled={plans.loading}>
            <option value="">{plans.loading ? 'Loading…' : activePlans.length ? 'Select plan' : 'Create a plan first'}</option>
            {activePlans.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {formatMoney(pick(p, 'benefitLimit', 'limit'))} limit</option>
            ))}
          </select>
          {fieldErr('planId')}
        </div>
        <div className={s.field}>
          <label htmlFor="s-start">Start date <span className={s.req}>*</span></label>
          <input id="s-start" type="date" value={form.startDate} onChange={set('startDate')} />
          {fieldErr('startDate')}
        </div>

        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="s-ref">Payment reference</label>
          <input id="s-ref" value={form.paymentReference} onChange={set('paymentReference')} placeholder="Bank / Paystack reference once payment is confirmed" />
          <span className={s.muted} style={{ fontSize: 12 }}>Leave empty to create it as “Awaiting payment”. It activates when payment is confirmed.</span>
        </div>

        {plan && (
          <div className={`${s.full} ${h.summary}`}>
            <div><span>Covers until</span><br /><strong>{formatDay(oneYearFrom(form.startDate))}</strong></div>
            <div><span>Benefit limit</span><br /><strong>{formatMoney(pick(plan, 'benefitLimit', 'limit'))}</strong></div>
            <div><span>Price</span><br /><strong>{formatMoney(price)} × {members}</strong></div>
            <div><span>Total due</span><br /><strong>{formatMoney(price * members)}</strong></div>
          </div>
        )}
      </div>
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>
          {busy ? 'Saving…' : 'Create subscription'}
        </button>
      </div>
    </form>
  );
}

/* ── Renew / confirm payment ── */
function RenewForm({ sub, onCancel, onSaved }) {
  const expired = statusOf(sub) === 'EXPIRED';
  const pendingPayment = statusOf(sub) === 'PENDING_PAYMENT';
  const nextStart = (() => {
    if (pendingPayment) return pick(sub, 'startDate') || toISODate(new Date());
    const exp = expiryOf(sub);
    if (!exp || expired) return toISODate(new Date());
    const d = new Date(exp);
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  })();

  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState(String(Number(pick(sub, 'annualPrice', 'planPrice') || 0) * membersOf(sub) || ''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!reference.trim()) { setError('Enter the payment reference'); return; }
    if (!(Number(amount) > 0)) { setError('Enter the amount paid'); return; }
    setBusy(true);
    setError('');
    try {
      await adminApi.renewHmoSubscription(sub.id, {
        paymentReference: reference.trim(),
        amountPaid: Number(amount),
        startDate: nextStart,
        expiryDate: oneYearFrom(nextStart),
      });
      onSaved(`${nameOf(sub)} is covered until ${formatDay(oneYearFrom(nextStart))}.`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={h.summary}>
        <div><span>Subscriber</span><br /><strong>{nameOf(sub)}</strong></div>
        <div><span>Plan</span><br /><strong>{planOf(sub)}</strong></div>
        <div><span>New period</span><br /><strong>{formatDay(nextStart)} – {formatDay(oneYearFrom(nextStart))}</strong></div>
        <div><span>Benefit</span><br /><strong>Resets to {formatMoney(limitOf(sub))}</strong></div>
      </div>
      <div className={s.field} style={{ marginTop: 14 }}>
        <label htmlFor="r-ref">Payment reference <span className={s.req}>*</span></label>
        <input id="r-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>
      <div className={s.field} style={{ marginTop: 14 }}>
        <label htmlFor="r-amt">Amount paid (₦) <span className={s.req}>*</span></label>
        <input id="r-amt" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} disabled={busy}>
          {busy ? 'Saving…' : pendingPayment ? 'Confirm & activate' : 'Confirm payment & renew'}
        </button>
      </div>
    </form>
  );
}

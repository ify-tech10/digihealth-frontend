import { useState } from 'react';
import Modal from '../../components/Modal/Modal';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { COVERED_SERVICES } from '../../config/userRoles';
import { formatMoney, humanize, pick } from '../../utils/format';
import { isActiveRecord } from './components/status';
import s from './admin.module.css';
import h from './Hmo.module.css';

const SERVICE_LABEL = Object.fromEntries(COVERED_SERVICES);
const servicesOf = (p) => {
  const v = pick(p, 'coveredServices', 'services');
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return v.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
};

export default function HmoPlans() {
  usePageHeader('HMO Plans', 'Plans companies and patients can subscribe to');
  const { toast, showToast, clearToast } = useToast();
  const [editing, setEditing] = useState(null);

  const { data, loading, error, reload } = useApi(() => adminApi.hmoPlans(), 'plans');
  const plans = asList(data);

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.toolbar}>
          <div>
            <h3 className={s.toolbarTitle}>{loading ? 'Loading plans…' : `${plans.length} plan${plans.length === 1 ? '' : 's'}`}</h3>
            <p className={s.muted} style={{ fontSize: 12.5 }}>Every plan runs for 12 months and has a benefit limit. Requests are approved automatically until the limit is used up.</p>
          </div>
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setEditing({})}>
            <Icon name="plus" /> New plan
          </button>
        </div>
      </div>

      {error && !plans.length ? (
        <div className={`${s.card} ${s.emptyBlock}`}>{error}</div>
      ) : !loading && !plans.length ? (
        <div className={`${s.card} ${s.emptyBlock}`}>
          <Icon name="briefcase" />
          <p>No plans yet. Create the first one.</p>
        </div>
      ) : (
        <div className={h.planGrid}>
          {plans.map((p) => (
            <article key={p.id} className={h.planCard}>
              <div className={h.planTop}>
                <h3>{p.name}</h3>
                <StatusBadge status={isActiveRecord(p) ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <div className={h.planPrice}>
                {formatMoney(pick(p, 'annualPrice', 'price', 'premium'))}
                <span>/ year per member</span>
              </div>
              <div className={h.planLimit}>
                <span>Benefit limit</span>
                <strong>{formatMoney(pick(p, 'benefitLimit', 'limit'))}</strong>
              </div>
              {p.description && <p className={h.planDesc}>{p.description}</p>}
              <div className={h.chips}>
                {servicesOf(p).length
                  ? servicesOf(p).map((sv) => <span key={sv} className={h.chip}>{SERVICE_LABEL[sv] || humanize(sv)}</span>)
                  : <span className={s.muted}>No services listed</span>}
              </div>
              <div className={h.planFoot}>
                <span className={s.muted}>
                  {pick(p, 'subscriberCount', 'subscriptionCount') ?? 0} subscriber{Number(pick(p, 'subscriberCount', 'subscriptionCount')) === 1 ? '' : 's'}
                </span>
                <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setEditing(p)}>
                  <Icon name="edit" /> Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit plan' : 'New HMO plan'} size="large">
        {editing && (
          <PlanForm
            key={editing.id ?? 'new'}
            plan={editing}
            onCancel={() => setEditing(null)}
            onSaved={(msg) => { setEditing(null); showToast('success', msg); reload(); }}
          />
        )}
      </Modal>
    </>
  );
}

function PlanForm({ plan, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: plan.name || '',
    annualPrice: pick(plan, 'annualPrice', 'price', 'premium') ?? '',
    benefitLimit: pick(plan, 'benefitLimit', 'limit') ?? '',
    description: plan.description || '',
    coveredServices: servicesOf(plan),
    active: plan.id ? isActiveRecord(plan) : true,
  }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const toggleService = (sv) =>
    setForm((v) => ({
      ...v,
      coveredServices: v.coveredServices.includes(sv)
        ? v.coveredServices.filter((x) => x !== sv)
        : [...v.coveredServices, sv],
    }));

  async function submit(e) {
    e.preventDefault();
    const price = Number(form.annualPrice);
    const limit = Number(form.benefitLimit);
    const errs = {};
    if (!form.name.trim()) errs.name = 'Plan name is required';
    if (!(price > 0)) errs.annualPrice = 'Enter the yearly price';
    if (!(limit > 0)) errs.benefitLimit = 'Every plan needs a benefit limit';
    if (!form.coveredServices.length) errs.coveredServices = 'Pick at least one covered service';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const body = {
      name: form.name.trim(),
      annualPrice: price,
      benefitLimit: limit,
      durationMonths: 12,
      description: form.description.trim() || null,
      coveredServices: form.coveredServices,
      active: form.active,
    };

    setBusy(true);
    try {
      if (plan.id) await adminApi.updateHmoPlan(plan.id, body);
      else await adminApi.createHmoPlan(body);
      onSaved(`${body.name} ${plan.id ? 'updated' : 'created'}.`);
    } catch (err) {
      const fieldErrors = err.data?.validationErrors || err.data?.errors;
      setErrors(fieldErrors && typeof fieldErrors === 'object' ? fieldErrors : { general: err.message });
      setBusy(false);
    }
  }

  const fieldErr = (f) => errors[f] && <span className={s.fieldError}>{errors[f]}</span>;

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      {errors.general && <p className={s.fieldError} style={{ marginBottom: 12 }}>{errors.general}</p>}
      <div className={s.formGrid}>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="p-name">Plan name <span className={s.req}>*</span></label>
          <input id="p-name" value={form.name} onChange={set('name')} placeholder="e.g. Gold Family" />
          {fieldErr('name')}
        </div>
        <div className={s.field}>
          <label htmlFor="p-price">Yearly price per member (₦) <span className={s.req}>*</span></label>
          <input id="p-price" type="number" min="0" step="1000" inputMode="numeric" value={form.annualPrice} onChange={set('annualPrice')} />
          {fieldErr('annualPrice')}
        </div>
        <div className={s.field}>
          <label htmlFor="p-limit">Benefit limit (₦) <span className={s.req}>*</span></label>
          <input id="p-limit" type="number" min="0" step="1000" inputMode="numeric" value={form.benefitLimit} onChange={set('benefitLimit')} />
          {fieldErr('benefitLimit')}
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label>Covered services <span className={s.req}>*</span></label>
          <div className={h.checkGrid}>
            {COVERED_SERVICES.map(([v, l]) => (
              <label key={v} className={s.checkRow}>
                <input type="checkbox" checked={form.coveredServices.includes(v)} onChange={() => toggleService(v)} />
                {l}
              </label>
            ))}
          </div>
          {fieldErr('coveredServices')}
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="p-desc">Description</label>
          <textarea id="p-desc" value={form.description} onChange={set('description')} placeholder="What's included, exclusions, visit caps…" />
        </div>
        <label className={`${s.full} ${s.checkRow}`}>
          <input type="checkbox" checked={form.active} onChange={set('active')} />
          Active — available for new subscriptions
        </label>
      </div>
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>
          {busy ? 'Saving…' : plan.id ? 'Save changes' : 'Create plan'}
        </button>
      </div>
    </form>
  );
}

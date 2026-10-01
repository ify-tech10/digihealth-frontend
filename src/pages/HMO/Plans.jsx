import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { hmoApi } from '../../Api/hmoApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { COVERED_SERVICES } from '../../config/userRoles';
import { formatMoney, humanize, pick } from '../../utils/format';
import { PlanSummary } from './components/HmoParts';
import s from '../Admin/admin.module.css';
import h from './Hmo.module.css';

const SERVICE = Object.fromEntries(COVERED_SERVICES);
const servicesOf = (p) => {
  const v = pick(p, 'coveredServices', 'services');
  return Array.isArray(v) ? v : typeof v === 'string' ? v.split(',').map((x) => x.trim()).filter(Boolean) : [];
};

export default function Plans() {
  usePageHeader('HMO Plans', 'Your current plan and what else is available');
  const { toast, showToast, clearToast } = useToast();

  const sub = useApi(() => hmoApi.subscription(), 'hmo-subscription');
  const plans = useApi(() => hmoApi.plans(), 'hmo-plans');
  const [asking, setAsking] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const currentId = pick(sub.data || {}, 'planId');
  const currentName = pick(sub.data || {}, 'planName', 'plan');
  const isCurrent = (p) => (currentId != null ? String(p.id) === String(currentId) : !!currentName && p.name === currentName);
  const list = asList(plans.data).filter((p) => p.active !== false).sort((a, b) => Number(pick(a, 'annualPrice', 'price') || 0) - Number(pick(b, 'annualPrice', 'price') || 0));

  async function request() {
    setBusy(true);
    try {
      await hmoApi.requestPlanChange(asking.id, note.trim() || undefined);
      showToast('success', `Request sent — your relationship manager will contact you about moving to ${asking.name}.`);
      setAsking(null);
    } catch (err) {
      showToast('error', `Request not sent: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.cardHeader}><h3>Current plan</h3></div>
        <PlanSummary state={sub} />
      </div>

      <div className={s.card}>
        <div className={s.cardHeader}><h3>Available plans</h3><span className={s.muted} style={{ fontSize: 12 }}>Prices are per member, per year</span></div>
        {plans.loading ? (
          <div className={s.emptyBlock}>Loading…</div>
        ) : !list.length ? (
          <div className={s.emptyBlock}><Icon name="shield" /><p>{plans.error ? 'Plans are unavailable right now.' : 'No plans published yet.'}</p></div>
        ) : (
          <div className={h.plans}>
            {list.map((p) => (
              <div key={p.id} className={`${h.planCard} ${isCurrent(p) ? h.current : ''}`}>
                <h4>{p.name}{isCurrent(p) && <span className={h.chip}>Current</span>}</h4>
                <div className={h.price}>{formatMoney(pick(p, 'annualPrice', 'price', 'premium'))} <small>/ year</small></div>
                <div className={s.muted} style={{ fontSize: 12.5 }}>Benefit limit <strong style={{ color: 'var(--navy)' }}>{formatMoney(pick(p, 'benefitLimit', 'limit'))}</strong></div>
                <ul>
                  {servicesOf(p).map((x) => <li key={x}><Icon name="check" />{SERVICE[x] || humanize(x)}</li>)}
                  {!servicesOf(p).length && p.description && <li>{p.description}</li>}
                </ul>
                {!isCurrent(p) && (
                  <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} style={{ justifyContent: 'center' }} onClick={() => { setNote(''); setAsking(p); }}>
                    Ask to switch
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!asking}
        title="Switch plan"
        message={asking ? `Ask DiGi Health to move your organisation to ${asking.name}? Nothing changes until your relationship manager confirms the new price and it’s paid.` : ''}
        confirmLabel="Send request"
        busy={busy}
        onClose={() => setAsking(null)}
        onConfirm={request}
      >
        <div className={s.field} style={{ marginTop: 14 }}>
          <label htmlFor="pcNote">Note (optional)</label>
          <textarea id="pcNote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. We’re adding 20 staff from January" />
        </div>
      </ConfirmDialog>
    </>
  );
}

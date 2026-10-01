import { useState } from 'react';
import { formatMoney, pick, toISODate } from '../../../utils/format';
import { addressOf, itemsOf, num, patientOf, totalOf, whenOf } from '../labFields';
import s from '../../Admin/admin.module.css';
import l from '../Lab.module.css';

/* Items with quantity × price, and the total. */
export function ItemsTable({ request, words, prices }) {
  const items = itemsOf(request);
  const price = (it) => (prices ? num(prices[it.key]) : it.unitPrice);
  const total = prices ? items.reduce((t, it) => t + num(prices[it.key]) * it.quantity, 0) : totalOf(request);
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #eef0f8', borderRadius: 9 }}>
      <table className={s.previewTable}>
        <thead><tr><th>{words.Item}</th><th>Qty</th><th>Unit price</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
        <tbody>
          {!items.length ? (
            <tr><td colSpan={4} className={s.previewEmpty}>No {words.items} listed.</td></tr>
          ) : items.map((it) => (
            <tr key={it.key}>
              <td>
                <div className={s.tdName}>{it.name}</div>
                {pick(it, 'instructions', 'dosage', 'sampleType') && <div className={s.muted} style={{ fontSize: 12 }}>{pick(it, 'instructions', 'dosage', 'sampleType')}</div>}
              </td>
              <td>{it.quantity}</td>
              <td>{price(it) == null ? <span className={s.muted}>Not priced</span> : formatMoney(price(it))}</td>
              <td style={{ textAlign: 'right' }} className={s.money}>{price(it) == null ? '—' : formatMoney(price(it) * it.quantity)}</td>
            </tr>
          ))}
          {items.length > 0 && (
            <tr><td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Total</td><td style={{ textAlign: 'right' }} className={s.money}>{formatMoney(total)}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ── Accept: book the visit and price every item ── */
function localNow() {
  const d = new Date(Date.now() + 60 * 60000);
  d.setMinutes(0, 0, 0);
  return `${toISODate(d)}T${String(d.getHours()).padStart(2, '0')}:00`;
}

export function AcceptForm({ request, words, onClose, onSubmit }) {
  const items = itemsOf(request);
  const [when, setWhen] = useState(() => (whenOf(request) ? String(whenOf(request)).slice(0, 16) : localNow()));
  const [prices, setPrices] = useState(() => Object.fromEntries(items.map((it) => [it.key, it.unitPrice == null ? '' : String(it.unitPrice)])));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!when) return setError(`Pick a ${words.visit} date and time.`);
    if (new Date(when) < new Date(Date.now() - 5 * 60000)) return setError(`The ${words.visit} time can’t be in the past.`);
    if (items.some((it) => !(num(prices[it.key]) > 0))) return setError(`Every ${words.item} needs a price — it’s recorded for inventory.`);
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        scheduledAt: new Date(when).toISOString(),
        items: items.map((it) => ({ id: it.id, unitPrice: num(prices[it.key]) })),
        note: note.trim() || undefined,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint} style={{ marginBottom: 14 }}>
        For {patientOf(request)}{addressOf(request) ? ` at ${addressOf(request)}` : ''}. Prices come from your catalogue — adjust if this order is different.
      </p>
      <div className={s.field} style={{ marginBottom: 14, maxWidth: 280 }}>
        <label htmlFor="acWhen">{words.Visit} date & time <span className={s.req}>*</span></label>
        <input id="acWhen" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {items.map((it) => (
          <div key={it.key} className={l.priceRow}>
            <span className={s.tdName}>{it.name} <span className={s.muted} style={{ fontWeight: 500 }}>× {it.quantity}</span></span>
            <div className={s.field}>
              <input
                aria-label={`Unit price for ${it.name}`}
                type="number"
                min="0"
                value={prices[it.key]}
                onChange={(e) => setPrices((p) => ({ ...p, [it.key]: e.target.value }))}
                placeholder="₦ per unit"
              />
            </div>
            <span className={s.money} style={{ textAlign: 'right' }}>{formatMoney(num(prices[it.key]) * it.quantity)}</span>
          </div>
        ))}
      </div>
      <div className={l.priceRow} style={{ borderTop: '1px solid #eef0f8', paddingTop: 10 }}>
        <strong>Total</strong>
        <span />
        <span className={s.money} style={{ textAlign: 'right', fontSize: 15 }}>{formatMoney(items.reduce((t, it) => t + num(prices[it.key]) * it.quantity, 0))}</span>
      </div>
      <div className={s.field} style={{ marginTop: 14 }}>
        <label htmlFor="acNote">Note to the medical team (optional)</label>
        <textarea id="acNote" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Accept request'}</button>
      </div>
    </form>
  );
}

/* ── Complete: lab uploads results, pharmacy confirms delivery ── */
const MAX_FILE = 10 * 1024 * 1024;

export function CompleteForm({ kind, request, onClose, onSubmit }) {
  const lab = kind === 'LAB';
  const [summary, setSummary] = useState('');
  const [abnormal, setAbnormal] = useState(false);
  const [receivedBy, setReceivedBy] = useState(patientOf(request) === '—' ? '' : patientOf(request));
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (lab && !file) return setError('Attach the results file (PDF or image).');
    if (lab && summary.trim().length < 10) return setError('Add a short summary the medical team can read at a glance.');
    if (!lab && !receivedBy.trim()) return setError('Who received the order?');
    if (file && file.size > MAX_FILE) return setError('The file must be 10 MB or smaller.');
    setError('');
    const fd = new FormData();
    if (lab) {
      fd.append('summary', summary.trim());
      fd.append('abnormal', String(abnormal));
      fd.append('file', file);
    } else {
      fd.append('receivedBy', receivedBy.trim());
      fd.append('deliveredAt', new Date().toISOString());
      if (summary.trim()) fd.append('note', summary.trim());
      if (file) fd.append('proof', file);
    }
    setBusy(true);
    try {
      await onSubmit(fd);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!lab && (
          <div className={s.field}>
            <label htmlFor="cfBy">Received by <span className={s.req}>*</span></label>
            <input id="cfBy" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
          </div>
        )}
        <div className={s.field}>
          <label htmlFor="cfSummary">{lab ? <>Result summary <span className={s.req}>*</span></> : 'Note (optional)'}</label>
          <textarea id="cfSummary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={lab ? 'e.g. FBC normal; fasting glucose 7.9 mmol/L (high)' : 'e.g. Left with daughter at the gate'} />
        </div>
        {lab && (
          <label className={s.checkRow}>
            <input type="checkbox" checked={abnormal} onChange={(e) => setAbnormal(e.target.checked)} />
            Some results are abnormal — flag for the doctor’s attention
          </label>
        )}
        <div className={s.field}>
          <label htmlFor="cfFile">{lab ? <>Results file <span className={s.req}>*</span></> : 'Proof of delivery (photo, optional)'}</label>
          <input id="cfFile" type="file" accept={lab ? '.pdf,image/*' : 'image/*,.pdf'} onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} disabled={busy}>
          {busy ? 'Sending…' : lab ? 'Send results' : 'Confirm delivery'}
        </button>
      </div>
    </form>
  );
}

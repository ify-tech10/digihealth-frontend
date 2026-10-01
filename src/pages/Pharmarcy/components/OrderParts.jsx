import { useState } from 'react';
import Badge from '../../../components/Badge/Badge';
import Icon from '../../../components/Icon/Icon';
import { formatDate, formatMoney, humanize, pick, toISODate } from '../../../utils/format';
import { DocumentLinks } from '../../Admin/components/Common';
import {
  fromOf, isUrgent, itemsOf, mapsUrl, num, orderTotal, patientAddress, patientName, patientPhone, reqStatus,
} from '../../Facility/facilityFields';
import s from '../../Admin/admin.module.css';
import f from '../../Facility/Facility.module.css';

const LABEL = { NEW: 'New', ACCEPTED: 'Preparing', DISPATCHED: 'Out for delivery', DELIVERED: 'Delivered', DECLINED: 'Declined' };
const VARIANT = { NEW: 'new', ACCEPTED: 'pending', DISPATCHED: 'active', DELIVERED: 'done', DECLINED: 'urgent' };

export function OrderStatus({ order }) {
  const st = reqStatus(order);
  return <Badge variant={VARIANT[st] || 'default'}>{LABEL[st] || humanize(st)}</Badge>;
}

export function Urgency({ order }) {
  return isUrgent(order) ? <Badge variant="urgent">Urgent</Badge> : null;
}

export function OrderDetails({ order: o }) {
  const items = itemsOf(o);
  const priced = items.some((it) => it.unitPrice != null);
  return (
    <>
      <div className={f.block}>
        <div className={f.blockTitle}><Icon name="mapPin" /> Deliver to</div>
        <div className={s.details} style={{ marginBottom: 0 }}>
          <div className={s.detail}><span>Patient</span><p>{patientName(o)}</p></div>
          <div className={s.detail}><span>Phone</span><p>{patientPhone(o) ? <a href={`tel:${patientPhone(o)}`} style={{ color: 'var(--logo-bg)', fontWeight: 600 }}>{patientPhone(o)}</a> : '—'}</p></div>
          <div className={`${s.detail} ${s.full}`}>
            <span>Address</span>
            <p>{patientAddress(o) || '—'}{patientAddress(o) && <> · <a href={mapsUrl(patientAddress(o))} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--logo-bg)', fontWeight: 600 }}>Open in Maps</a></>}</p>
          </div>
        </div>
      </div>

      <div className={f.block}>
        <div className={f.blockTitle}><Icon name="plusHouse" /> Drugs</div>
        {items.map((it) => (
          <div key={it.key} className={f.orderRow}>
            <span>
              <strong className={it.available === false ? f.unavailable : undefined}>{it.name}</strong>
              {pick(it, 'instructions', 'dosage') && <span className={s.muted} style={{ display: 'block', fontSize: 12 }}>{pick(it, 'instructions', 'dosage')}</span>}
              {it.available === false && <span className={s.muted} style={{ display: 'block', fontSize: 12 }}>Not available</span>}
            </span>
            <span>× {it.quantity}</span>
            <span>{it.unitPrice == null ? <span className={s.muted}>—</span> : formatMoney(it.unitPrice)}</span>
            <span className={s.money} style={{ textAlign: 'right' }}>{it.unitPrice == null ? '' : formatMoney(it.unitPrice * it.quantity)}</span>
          </div>
        ))}
        {priced && <div className={f.total}>Total <strong>{formatMoney(orderTotal(o))}</strong></div>}
      </div>

      <div className={s.details}>
        <div className={s.detail}><span>Prescribed by</span><p>{fromOf(o) || '—'}</p></div>
        <div className={s.detail}><span>Received</span><p>{formatDate(o.createdAt)}</p></div>
        {o.dispatchAt && <div className={s.detail}><span>Dispatch</span><p>{formatDate(o.dispatchAt)}</p></div>}
        {o.deliveredAt && <div className={s.detail}><span>Delivered</span><p>{formatDate(o.deliveredAt)}{o.receivedBy ? ` · to ${o.receivedBy}` : ''}</p></div>}
        {pick(o, 'notes', 'instructions') && <div className={`${s.detail} ${s.full}`}><span>Notes from DiGi</span><p>{pick(o, 'notes', 'instructions')}</p></div>}
        {o.declineReason && <div className={`${s.detail} ${s.full}`}><span>Declined because</span><p>{o.declineReason}</p></div>}
        <div className={`${s.detail} ${s.full}`}><span>Prescription</span><DocumentLinks record={o} /></div>
      </div>
    </>
  );
}

function soon() {
  const d = new Date(Date.now() + 2 * 60 * 60000);
  d.setMinutes(0, 0, 0);
  return `${toISODate(d)}T${String(d.getHours()).padStart(2, '0')}:00`;
}

/* ── Accept: price each drug, mark anything out of stock, set dispatch time ── */
export function AcceptOrderForm({ order, onClose, onSubmit }) {
  const items = itemsOf(order);
  const [lines, setLines] = useState(() => Object.fromEntries(items.map((it) => [it.key, { available: true, price: it.unitPrice == null ? '' : String(it.unitPrice) }])));
  const [when, setWhen] = useState(soon);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setLine = (k, patch) => setLines((ls) => ({ ...ls, [k]: { ...ls[k], ...patch } }));
  const total = items.reduce((t, it) => t + (lines[it.key].available ? num(lines[it.key].price) * it.quantity : 0), 0);
  const anyAvailable = items.some((it) => lines[it.key].available);

  async function submit(e) {
    e.preventDefault();
    if (!anyAvailable) return setError('Nothing is available — use “Decline” instead so DiGi can order elsewhere.');
    if (items.some((it) => lines[it.key].available && !(num(lines[it.key].price) > 0))) return setError('Price every drug you can supply.');
    if (!when) return setError('When will it leave the pharmacy?');
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        dispatchAt: new Date(when).toISOString(),
        items: items.map((it) => ({ id: it.id, available: lines[it.key].available, unitPrice: lines[it.key].available ? num(lines[it.key].price) : undefined })),
        note: note.trim() || undefined,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint} style={{ marginBottom: 12 }}>Untick anything you can’t supply — DiGi will source it elsewhere. Your prices go on the invoice.</p>
      <div className={`${f.orderRow} ${f.lineHead}`}><span>Drug</span><span>Qty</span><span>Unit price (₦)</span><span style={{ textAlign: 'right' }}>Amount</span></div>
      {items.map((it) => {
        const l = lines[it.key];
        return (
          <div key={it.key} className={f.orderRow}>
            <label className={s.checkRow} style={{ fontWeight: 600 }}>
              <input type="checkbox" checked={l.available} onChange={(e) => setLine(it.key, { available: e.target.checked })} aria-label={`${it.name} available`} />
              <span className={l.available ? undefined : f.unavailable}>{it.name}</span>
            </label>
            <span>× {it.quantity}</span>
            <div className={s.field}>
              <input aria-label={`Unit price for ${it.name}`} type="number" min="0" disabled={!l.available} value={l.price} onChange={(e) => setLine(it.key, { price: e.target.value })} />
            </div>
            <span className={s.money} style={{ textAlign: 'right' }}>{l.available ? formatMoney(num(l.price) * it.quantity) : '—'}</span>
          </div>
        );
      })}
      <div className={f.total}>Total <strong>{formatMoney(total)}</strong></div>

      <div className={s.formGrid} style={{ marginTop: 14 }}>
        <div className={s.field}>
          <label htmlFor="aoWhen">Dispatch time <span className={s.req}>*</span></label>
          <input id="aoWhen" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="aoNote">Note to DiGi (optional)</label>
          <textarea id="aoNote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Substituting brand X for Y — same strength" />
        </div>
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Accept order'}</button>
      </div>
    </form>
  );
}

/* ── Delivered: who received it, optional photo ── */
export function DeliverForm({ order, onClose, onSubmit }) {
  const [receivedBy, setReceivedBy] = useState(patientName(order) === '—' ? '' : patientName(order));
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!receivedBy.trim()) return setError('Who received the drugs?');
    if (file && file.size > 10 * 1024 * 1024) return setError('The photo must be 10 MB or smaller.');
    setError('');
    const fd = new FormData();
    fd.append('receivedBy', receivedBy.trim());
    fd.append('deliveredAt', new Date().toISOString());
    if (note.trim()) fd.append('note', note.trim());
    if (file) fd.append('proof', file);
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
        <div className={s.field}>
          <label htmlFor="dvBy">Received by <span className={s.req}>*</span></label>
          <input id="dvBy" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
        </div>
        <div className={s.field}>
          <label htmlFor="dvNote">Note (optional)</label>
          <textarea id="dvNote" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className={s.field}>
          <label htmlFor="dvFile">Proof of delivery (photo, optional)</label>
          <input id="dvFile" type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Confirm delivery'}</button>
      </div>
    </form>
  );
}

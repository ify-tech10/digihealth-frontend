import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import StatusBadge from '../../../components/StatusBadge/StatusBadge';
import Icon from '../../../components/Icon/Icon';
import { facilityApi } from '../../../Api/facilityApi';
import { formatDate, formatMoney, pick } from '../../../utils/format';
import { Detail, DocumentLinks } from '../../Admin/components/Common';
import { invNo, invStatus, invTotal, itemsOf, num, patientName, refOf, testsOf } from '../facilityFields';
import s from '../../Admin/admin.module.css';
import f from '../Facility.module.css';

const MAX_FILE = 10 * 1024 * 1024;
let lineId = 0;
const newLine = (description = '', quantity = '1', unitPrice = '') => ({ id: (lineId += 1), description, quantity, unitPrice });

/* Prefill invoice lines from a finished request (pharmacy orders and lab tests already carry prices). */
function linesFrom(request) {
  if (!request) return [newLine()];
  const items = [...itemsOf(request), ...testsOf(request)].filter((it) => it.available !== false);
  if (items.length) return items.map((it) => newLine(it.name, String(it.quantity), it.unitPrice == null ? '' : String(it.unitPrice)));
  return [newLine(`Care for ${patientName(request)} (${refOf(request)})`)];
}

/* ── Raise an invoice to DiGi Health ── */
export function NewInvoiceModal({ open, request, requests = [], words, onClose, onCreated }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="New invoice to DiGi Health" size="large">
      {open && <InvoiceForm key={request?.id ?? 'blank'} request={request} requests={requests} words={words} onClose={onClose} onCreated={onCreated} />}
    </Modal>
  );
}

function InvoiceForm({ request, requests, words, onClose, onCreated }) {
  const [requestId, setRequestId] = useState(request ? String(request.id) : '');
  const [lines, setLines] = useState(() => linesFrom(request));
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const total = lines.reduce((t, l) => t + num(l.unitPrice) * (num(l.quantity) || 0), 0);
  const update = (id, k) => (e) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, [k]: e.target.value } : l)));

  function pickRequest(e) {
    const id = e.target.value;
    setRequestId(id);
    const r = requests.find((x) => String(x.id) === id);
    if (r) setLines(linesFrom(r));
  }

  async function submit(e) {
    e.preventDefault();
    const clean = lines.filter((l) => l.description.trim() || num(l.unitPrice));
    if (!clean.length) return setError('Add at least one line.');
    if (clean.some((l) => !l.description.trim())) return setError('Every line needs a description.');
    if (clean.some((l) => !(num(l.quantity) > 0))) return setError('Quantities must be more than 0.');
    if (clean.some((l) => !(num(l.unitPrice) > 0))) return setError('Every line needs a price.');
    if (file && file.size > MAX_FILE) return setError('The attachment must be 10 MB or smaller.');
    setError('');

    const fd = new FormData();
    if (requestId) fd.append('requestId', requestId);
    fd.append('items', JSON.stringify(clean.map((l) => ({ description: l.description.trim(), quantity: num(l.quantity), unitPrice: num(l.unitPrice) }))));
    fd.append('totalAmount', String(total));
    if (notes.trim()) fd.append('notes', notes.trim());
    if (file) fd.append('attachment', file);

    setBusy(true);
    try {
      await facilityApi.createInvoice(fd);
      onCreated(`Invoice for ${formatMoney(total)} sent to DiGi Health.`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={f.flow}>
        <b>You send</b><Icon name="chevronRight" /> DiGi admin approves <Icon name="chevronRight" /> Finance pays into your bank account
      </div>

      <div className={s.field} style={{ marginBottom: 14 }}>
        <label htmlFor="invReq">For {words.request}</label>
        {request ? (
          <p style={{ fontSize: 13.5, padding: '6px 0' }}>{refOf(request)} — {patientName(request)}</p>
        ) : (
          <select id="invReq" value={requestId} onChange={pickRequest}>
            <option value="">Not linked to a {words.request}</option>
            {requests.map((r) => <option key={r.id} value={r.id}>{refOf(r)} — {patientName(r)}</option>)}
          </select>
        )}
      </div>

      <div className={`${f.lineRow} ${f.lineHead}`} style={{ marginBottom: 6 }}>
        <span>Description</span><span>Qty</span><span>Unit price (₦)</span><span style={{ textAlign: 'right' }}>Amount</span><span />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lines.map((l) => (
          <div key={l.id} className={f.lineRow}>
            <div className={s.field}><input aria-label="Description" value={l.description} onChange={update(l.id, 'description')} placeholder="e.g. Admission — 2 nights, ward B" /></div>
            <div className={s.field}><input aria-label="Quantity" type="number" min="1" value={l.quantity} onChange={update(l.id, 'quantity')} /></div>
            <div className={s.field}><input aria-label="Unit price" type="number" min="0" value={l.unitPrice} onChange={update(l.id, 'unitPrice')} /></div>
            <span className={s.money} style={{ textAlign: 'right' }}>{formatMoney(num(l.unitPrice) * (num(l.quantity) || 0))}</span>
            <button type="button" className={`${s.btn} ${s.btnDanger}`} style={{ padding: 8, justifyContent: 'center' }} disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} aria-label="Remove line"><Icon name="trash" /></button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 10 }}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={() => setLines((ls) => [...ls, newLine()])}><Icon name="plus" /> Add line</button>
        <span className={f.total} style={{ border: 'none', margin: 0, padding: 0 }}>Total <strong>{formatMoney(total)}</strong></span>
      </div>

      <div className={s.formGrid} style={{ marginTop: 16 }}>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="invNotes">Notes</label>
          <textarea id="invNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the DiGi team should know" />
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="invFile">Supporting document (optional)</label>
          <input id="invFile" type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
      </div>

      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Sending…' : 'Send invoice'}</button>
      </div>
    </form>
  );
}

/* ── One invoice ── */
export function InvoiceModal({ invoice, onClose }) {
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  return (
    <Modal isOpen={!!invoice} onClose={onClose} title={invoice ? invNo(invoice) : ''}>
      {invoice && (
        <>
          <div className={s.details}>
            <Detail label="Status"><StatusBadge status={invStatus(invoice)} /></Detail>
            <Detail label="Sent">{formatDate(pick(invoice, 'createdAt', 'submittedAt'))}</Detail>
            <Detail label="For">{pick(invoice, 'requestReference', 'patientName') || '—'}</Detail>
            <Detail label="Total"><strong>{formatMoney(invTotal(invoice))}</strong></Detail>
            {pick(invoice, 'approvedAt') && <Detail label="Approved">{formatDate(invoice.approvedAt)}</Detail>}
            {pick(invoice, 'paidAt') && <Detail label="Paid">{formatDate(invoice.paidAt)}{invoice.paymentReference ? ` · ref ${invoice.paymentReference}` : ''}</Detail>}
            {pick(invoice, 'rejectionReason', 'reviewNote') && <Detail label="DiGi’s note" full>{pick(invoice, 'rejectionReason', 'reviewNote')}</Detail>}
            {invoice.notes && <Detail label="Your notes" full>{invoice.notes}</Detail>}
          </div>
          {items.length > 0 && (
            <div style={{ border: '1px solid #eef0f8', borderRadius: 9, overflowX: 'auto' }}>
              <table className={s.previewTable}>
                <thead><tr><th>Description</th><th>Qty</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={it.id ?? i}>
                      <td>{it.description}</td>
                      <td>{it.quantity}</td>
                      <td style={{ textAlign: 'right' }} className={s.money}>{formatMoney(num(it.unitPrice) * (num(it.quantity) || 1))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className={`${s.detail} ${s.full}`} style={{ marginTop: 12 }}>
            <span>Attachment</span>
            <DocumentLinks record={invoice} />
          </div>
        </>
      )}
    </Modal>
  );
}


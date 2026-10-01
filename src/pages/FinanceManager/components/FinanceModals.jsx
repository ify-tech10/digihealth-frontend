import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import StatusBadge from '../../../components/StatusBadge/StatusBadge';
import { financeApi } from '../../../Api/financeApi';
import { formatDay, formatMoney, pick, toISODate } from '../../../utils/format';
import { Detail } from '../../Admin/components/Common';
import {
  PAYMENT_METHODS, invoiceAmount, invoiceBalance, invoiceClient, invoiceDue, invoiceIssued, invoiceNo,
  invoicePaid, invoiceService, invoiceStatus, isOutstanding, num,
} from '../financeFields';
import s from '../../Admin/admin.module.css';
import f from '../Finance.module.css';

const today = () => toISODate(new Date());

/* Shared form plumbing: values, errors, busy, failure message. */
function useForm(initial) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const set = (k) => (e) => setForm((v) => ({ ...v, [k]: e.target.value }));
  async function run(validate, action) {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setFailure('');
    try {
      await action(form);
    } catch (err) {
      setFailure(err.message);
      setBusy(false);
    }
  }
  const err = (k) => errors[k] && <span className={s.fieldError}>{errors[k]}</span>;
  return { form, setForm, set, busy, failure, run, err };
}

function Actions({ busy, label, busyLabel = 'Saving…', onCancel, failure, failurePrefix }) {
  return (
    <>
      {failure && <p className={s.fieldError} style={{ marginTop: 12 }}>{failurePrefix}: {failure}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onCancel}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? busyLabel : label}</button>
      </div>
    </>
  );
}

/* ── View an invoice ── */
export function InvoiceModal({ invoice, onClose, onRecordPayment, onRemind, reminding }) {
  const st = invoice ? invoiceStatus(invoice) : '';
  return (
    <Modal isOpen={!!invoice} onClose={onClose} title={invoice ? `${invoiceNo(invoice)} — ${invoiceClient(invoice) || 'Invoice'}` : ''}>
      {invoice && (
        <>
          <div className={s.details}>
            <Detail label="Client">{invoiceClient(invoice)}</Detail>
            <Detail label="Email">{pick(invoice, 'clientEmail', 'email')}</Detail>
            <Detail label="Service" full>{invoiceService(invoice)}</Detail>
            <Detail label="Issued">{formatDay(invoiceIssued(invoice))}</Detail>
            <Detail label="Due"><span className={st === 'OVERDUE' ? f.overdue : undefined}>{formatDay(invoiceDue(invoice))}</span></Detail>
            <Detail label="Amount"><span className={f.big}>{formatMoney(invoiceAmount(invoice))}</span></Detail>
            <Detail label="Status"><StatusBadge status={st} /></Detail>
            {invoicePaid(invoice) > 0 && <Detail label="Paid so far">{formatMoney(invoicePaid(invoice))}</Detail>}
            {isOutstanding(invoice) && <Detail label="Balance due"><span className={f.amount}>{formatMoney(invoiceBalance(invoice))}</span></Detail>}
            {pick(invoice, 'vatPercent', 'taxPercent') != null && <Detail label="VAT">{`${pick(invoice, 'vatPercent', 'taxPercent')}%`}</Detail>}
            {pick(invoice, 'careRequestId', 'requestId') != null && <Detail label="Care request">{`#${pick(invoice, 'careRequestId', 'requestId')}`}</Detail>}
            {invoice.notes && <Detail label="Notes" full>{invoice.notes}</Detail>}
          </div>
          {isOutstanding(invoice) && (
            <div className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={() => onRemind(invoice)} disabled={reminding}>
                {reminding ? 'Sending…' : 'Send reminder'}
              </button>
              <button type="button" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} onClick={() => onRecordPayment(invoice)}>Record payment</button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

/* ── Create an invoice ── */
const INVOICE_CATEGORIES = [
  ['HOME_NURSING', 'Home Nursing Care'],
  ['HMO_SUBSCRIPTION', 'HMO Subscription'],
  ['PHYSIOTHERAPY', 'Physiotherapy'],
  ['LAB_SERVICES', 'Lab Services'],
  ['TELEMEDICINE', 'Telemedicine'],
  ['POSTNATAL', 'Postnatal Care'],
  ['ELDERLY_CARE', 'Elderly Care'],
  ['PHARMACY', 'Pharmacy / Drugs'],
  ['OTHER', 'Other'],
];

export function NewInvoiceModal({ open, onClose, onCreated }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Create invoice" size="large">
      {open && <NewInvoiceForm onClose={onClose} onCreated={onCreated} />}
    </Modal>
  );
}

function NewInvoiceForm({ onClose, onCreated }) {
  const { form, set, busy, failure, run, err } = useForm({
    clientType: 'PATIENT', clientName: '', clientEmail: '', service: '', category: 'HOME_NURSING',
    amount: '', vatPercent: '7.5', dueDate: '', notes: '',
  });
  const amount = num(form.amount);
  const vat = Math.round(amount * num(form.vatPercent)) / 100;

  function submit(e) {
    e.preventDefault();
    run(
      (v) => {
        const x = {};
        if (!v.clientName.trim()) x.clientName = 'Who is this invoice for?';
        if (v.clientEmail && !/^\S+@\S+\.\S+$/.test(v.clientEmail.trim())) x.clientEmail = 'Enter a valid email';
        if (!v.service.trim()) x.service = 'Describe the service';
        if (!(num(v.amount) > 0)) x.amount = 'Enter the amount in naira';
        if (num(v.vatPercent) < 0 || num(v.vatPercent) > 100) x.vatPercent = 'VAT must be between 0 and 100';
        if (!v.dueDate) x.dueDate = 'Pick a due date';
        else if (v.dueDate < today()) x.dueDate = 'Due date can’t be in the past';
        return x;
      },
      async (v) => {
        const created = await financeApi.createInvoice({
          clientType: v.clientType,
          clientName: v.clientName.trim(),
          clientEmail: v.clientEmail.trim() || undefined,
          service: v.service.trim(),
          category: v.category,
          amount: num(v.amount),
          vatPercent: num(v.vatPercent),
          totalAmount: num(v.amount) + vat,
          dueDate: v.dueDate,
          notes: v.notes.trim() || undefined,
        });
        onCreated(`Invoice ${created?.invoiceNumber || ''} created for ${v.clientName.trim()}.`.replace('  ', ' '));
      }
    );
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint} style={{ marginBottom: 14 }}>
        Standard patients get an invoice per care request automatically. HMO patients aren’t invoiced while they’re within their benefit limit.
      </p>
      <div className={s.formGrid}>
        <div className={s.field}>
          <label htmlFor="niType">Bill to</label>
          <select id="niType" value={form.clientType} onChange={set('clientType')}>
            <option value="PATIENT">Patient</option>
            <option value="ORGANISATION">Organisation</option>
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="niClient">{form.clientType === 'PATIENT' ? 'Patient name' : 'Organisation'} <span className={s.req}>*</span></label>
          <input id="niClient" value={form.clientName} onChange={set('clientName')} />
          {err('clientName')}
        </div>
        <div className={s.field}>
          <label htmlFor="niEmail">Email to send it to</label>
          <input id="niEmail" type="email" value={form.clientEmail} onChange={set('clientEmail')} />
          {err('clientEmail')}
        </div>
        <div className={s.field}>
          <label htmlFor="niCat">Category</label>
          <select id="niCat" value={form.category} onChange={set('category')}>
            {INVOICE_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="niService">Service description <span className={s.req}>*</span></label>
          <input id="niService" value={form.service} onChange={set('service')} placeholder="e.g. Home Nursing Care — September 2026" />
          {err('service')}
        </div>
        <div className={s.field}>
          <label htmlFor="niAmount">Amount before VAT (₦) <span className={s.req}>*</span></label>
          <input id="niAmount" type="number" min="0" inputMode="numeric" value={form.amount} onChange={set('amount')} />
          {err('amount')}
        </div>
        <div className={s.field}>
          <label htmlFor="niVat">VAT (%)</label>
          <input id="niVat" type="number" min="0" max="100" step="0.5" value={form.vatPercent} onChange={set('vatPercent')} />
          {err('vatPercent')}
        </div>
        <div className={s.field}>
          <label htmlFor="niDue">Due date <span className={s.req}>*</span></label>
          <input id="niDue" type="date" min={today()} value={form.dueDate} onChange={set('dueDate')} />
          {err('dueDate')}
        </div>
        <div className={s.field}>
          <label>Total</label>
          <p className={f.big} style={{ padding: '8px 0' }}>{formatMoney(amount + vat)}{vat > 0 && <span className={s.muted} style={{ fontSize: 12, fontWeight: 500 }}> incl. {formatMoney(vat)} VAT</span>}</p>
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="niNotes">Notes</label>
          <textarea id="niNotes" value={form.notes} onChange={set('notes')} placeholder="Payment terms, bank details…" />
        </div>
      </div>
      <Actions busy={busy} label="Create invoice" onCancel={onClose} failure={failure} failurePrefix="Couldn’t create the invoice" />
    </form>
  );
}

/* ── Record a payment (optionally against an invoice) ── */
export function RecordPaymentModal({ open, invoice, invoices = [], onClose, onRecorded }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Record payment" size="large">
      {open && <PaymentForm key={invoice?.id ?? 'none'} invoice={invoice} invoices={invoices} onClose={onClose} onRecorded={onRecorded} />}
    </Modal>
  );
}

function PaymentForm({ invoice, invoices, onClose, onRecorded }) {
  const open = invoices.filter(isOutstanding);
  const { form, setForm, set, busy, failure, run, err } = useForm({
    invoiceId: invoice ? String(invoice.id) : '',
    payerName: invoice ? invoiceClient(invoice) || '' : '',
    amount: invoice ? String(invoiceBalance(invoice) || '') : '',
    paymentDate: today(),
    method: 'BANK_TRANSFER',
    reference: '',
    notes: '',
  });
  const linked = invoice || open.find((i) => String(i.id) === form.invoiceId);
  const balance = linked ? invoiceBalance(linked) : null;

  function pickInvoice(e) {
    const id = e.target.value;
    const inv = open.find((i) => String(i.id) === id);
    setForm((v) => ({
      ...v,
      invoiceId: id,
      payerName: inv ? invoiceClient(inv) || v.payerName : v.payerName,
      amount: inv ? String(invoiceBalance(inv) || '') : v.amount,
    }));
  }

  function submit(e) {
    e.preventDefault();
    run(
      (v) => {
        const x = {};
        if (!v.payerName.trim()) x.payerName = 'Who paid?';
        if (!(num(v.amount) > 0)) x.amount = 'Enter the amount received';
        else if (balance != null && num(v.amount) > balance) x.amount = `That’s more than the ${formatMoney(balance)} still owed`;
        if (!v.paymentDate) x.paymentDate = 'When was it paid?';
        else if (v.paymentDate > today()) x.paymentDate = 'Payment date can’t be in the future';
        if (v.method !== 'CASH' && !v.reference.trim()) x.reference = 'Add the bank / POS reference';
        return x;
      },
      async (v) => {
        await financeApi.recordPayment({
          invoiceId: v.invoiceId ? (Number.isNaN(Number(v.invoiceId)) ? v.invoiceId : Number(v.invoiceId)) : undefined,
          payerName: v.payerName.trim(),
          amount: num(v.amount),
          paymentDate: v.paymentDate,
          method: v.method,
          reference: v.reference.trim() || undefined,
          notes: v.notes.trim() || undefined,
        });
        onRecorded(`Payment of ${formatMoney(num(v.amount))} from ${v.payerName.trim()} recorded.`);
      }
    );
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={s.formGrid}>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="rpInv">Invoice</label>
          {invoice ? (
            <p style={{ fontSize: 13.5, padding: '6px 0' }}>{invoiceNo(invoice)} · {invoiceClient(invoice)} · balance {formatMoney(invoiceBalance(invoice))}</p>
          ) : (
            <select id="rpInv" value={form.invoiceId} onChange={pickInvoice}>
              <option value="">Not linked to an invoice</option>
              {open.map((i) => <option key={i.id} value={i.id}>{invoiceNo(i)} — {invoiceClient(i)} ({formatMoney(invoiceBalance(i))} due)</option>)}
            </select>
          )}
        </div>
        <div className={s.field}>
          <label htmlFor="rpPayer">Paid by <span className={s.req}>*</span></label>
          <input id="rpPayer" value={form.payerName} onChange={set('payerName')} />
          {err('payerName')}
        </div>
        <div className={s.field}>
          <label htmlFor="rpAmount">Amount received (₦) <span className={s.req}>*</span></label>
          <input id="rpAmount" type="number" min="0" inputMode="numeric" value={form.amount} onChange={set('amount')} />
          {err('amount')}
        </div>
        <div className={s.field}>
          <label htmlFor="rpDate">Payment date <span className={s.req}>*</span></label>
          <input id="rpDate" type="date" max={today()} value={form.paymentDate} onChange={set('paymentDate')} />
          {err('paymentDate')}
        </div>
        <div className={s.field}>
          <label htmlFor="rpMethod">Method <span className={s.req}>*</span></label>
          <select id="rpMethod" value={form.method} onChange={set('method')}>
            {PAYMENT_METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="rpRef">Reference no.{form.method !== 'CASH' && <span className={s.req}> *</span>}</label>
          <input id="rpRef" value={form.reference} onChange={set('reference')} placeholder="e.g. TRF/260928/001" />
          {err('reference')}
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="rpNotes">Notes</label>
          <textarea id="rpNotes" value={form.notes} onChange={set('notes')} />
        </div>
      </div>
      <Actions busy={busy} label="Record payment" onCancel={onClose} failure={failure} failurePrefix="Couldn’t record the payment" />
    </form>
  );
}

/* ── New HMO claim ── */
export function NewClaimModal({ open, onClose, onCreated }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="New HMO claim" size="large">
      {open && <ClaimForm onClose={onClose} onCreated={onCreated} />}
    </Modal>
  );
}

function ClaimForm({ onClose, onCreated }) {
  const { form, set, busy, failure, run, err } = useForm({
    organisationName: '', hmoProvider: '', servicePeriod: toISODate(new Date()).slice(0, 7), members: '',
    amountClaimed: '', submittedAt: today(), notes: '',
  });

  function submit(e) {
    e.preventDefault();
    run(
      (v) => {
        const x = {};
        if (!v.organisationName.trim()) x.organisationName = 'Which organisation?';
        if (!v.hmoProvider.trim()) x.hmoProvider = 'Which HMO is paying?';
        if (!v.servicePeriod) x.servicePeriod = 'Pick the month the care was given';
        if (v.members && !(Number.isInteger(num(v.members)) && num(v.members) >= 0)) x.members = 'Whole number of members';
        if (!(num(v.amountClaimed) > 0)) x.amountClaimed = 'Enter the amount claimed';
        return x;
      },
      async (v) => {
        await financeApi.createHmoClaim({
          organisationName: v.organisationName.trim(),
          hmoProvider: v.hmoProvider.trim(),
          servicePeriod: v.servicePeriod,
          members: v.members ? num(v.members) : undefined,
          amountClaimed: num(v.amountClaimed),
          submittedAt: v.submittedAt || undefined,
          notes: v.notes.trim() || undefined,
        });
        onCreated(`Claim of ${formatMoney(num(v.amountClaimed))} to ${v.hmoProvider.trim()} submitted.`);
      }
    );
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={s.formGrid}>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="ncOrg">Organisation <span className={s.req}>*</span></label>
          <input id="ncOrg" value={form.organisationName} onChange={set('organisationName')} placeholder="e.g. Acme Corp Ltd" />
          {err('organisationName')}
        </div>
        <div className={s.field}>
          <label htmlFor="ncHmo">HMO provider <span className={s.req}>*</span></label>
          <input id="ncHmo" value={form.hmoProvider} onChange={set('hmoProvider')} placeholder="e.g. Hygeia HMO" />
          {err('hmoProvider')}
        </div>
        <div className={s.field}>
          <label htmlFor="ncPeriod">Service month <span className={s.req}>*</span></label>
          <input id="ncPeriod" type="month" value={form.servicePeriod} onChange={set('servicePeriod')} />
          {err('servicePeriod')}
        </div>
        <div className={s.field}>
          <label htmlFor="ncMembers">Members covered</label>
          <input id="ncMembers" type="number" min="0" value={form.members} onChange={set('members')} />
          {err('members')}
        </div>
        <div className={s.field}>
          <label htmlFor="ncAmount">Amount claimed (₦) <span className={s.req}>*</span></label>
          <input id="ncAmount" type="number" min="0" value={form.amountClaimed} onChange={set('amountClaimed')} />
          {err('amountClaimed')}
        </div>
        <div className={s.field}>
          <label htmlFor="ncDate">Date submitted</label>
          <input id="ncDate" type="date" max={today()} value={form.submittedAt} onChange={set('submittedAt')} />
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="ncNotes">Notes</label>
          <textarea id="ncNotes" value={form.notes} onChange={set('notes')} placeholder="Claim reference, supporting documents…" />
        </div>
      </div>
      <Actions busy={busy} label="Submit claim" busyLabel="Submitting…" onCancel={onClose} failure={failure} failurePrefix="Couldn’t submit the claim" />
    </form>
  );
}

/* ── Money received from an HMO, or paid out for a facility bill ── */
export function SettleModal({ target, title, intro, defaultAmount, withMethod = false, allowPartial = true, onClose, onConfirm }) {
  return (
    <Modal isOpen={!!target} onClose={onClose} title={title}>
      {target && (
        <SettleForm
          key={target.id}
          intro={intro}
          defaultAmount={defaultAmount}
          withMethod={withMethod}
          allowPartial={allowPartial}
          onClose={onClose}
          onConfirm={(body) => onConfirm(target, body)}
        />
      )}
    </Modal>
  );
}

function SettleForm({ intro, defaultAmount, withMethod, allowPartial, onClose, onConfirm }) {
  const { form, set, busy, failure, run, err } = useForm({
    amount: String(defaultAmount || ''), date: today(), method: 'BANK_TRANSFER', reference: '',
  });

  function submit(e) {
    e.preventDefault();
    run(
      (v) => {
        const x = {};
        if (!(num(v.amount) > 0)) x.amount = 'Enter the amount';
        else if (!allowPartial && num(v.amount) !== num(defaultAmount)) x.amount = `Must be the full ${formatMoney(defaultAmount)}`;
        else if (num(v.amount) > num(defaultAmount)) x.amount = `More than the ${formatMoney(defaultAmount)} due`;
        if (!v.date) x.date = 'Pick the date';
        else if (v.date > today()) x.date = 'Can’t be in the future';
        if (!v.reference.trim()) x.reference = 'Add the transfer reference';
        return x;
      },
      (v) => onConfirm({
        amount: num(v.amount),
        date: v.date,
        method: withMethod ? v.method : undefined,
        reference: v.reference.trim(),
      })
    );
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      {intro && <p className={s.hint} style={{ marginBottom: 14 }}>{intro}</p>}
      <div className={s.formGrid}>
        <div className={s.field}>
          <label htmlFor="stAmount">Amount (₦)</label>
          <input id="stAmount" type="number" min="0" value={form.amount} onChange={set('amount')} readOnly={!allowPartial} />
          {err('amount')}
        </div>
        <div className={s.field}>
          <label htmlFor="stDate">Date</label>
          <input id="stDate" type="date" max={today()} value={form.date} onChange={set('date')} />
          {err('date')}
        </div>
        {withMethod && (
          <div className={s.field}>
            <label htmlFor="stMethod">Method</label>
            <select id="stMethod" value={form.method} onChange={set('method')}>
              {PAYMENT_METHODS.filter(([v]) => v !== 'PAYSTACK').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        )}
        <div className={s.field}>
          <label htmlFor="stRef">Reference <span className={s.req}>*</span></label>
          <input id="stRef" value={form.reference} onChange={set('reference')} />
          {err('reference')}
        </div>
      </div>
      <Actions busy={busy} label="Confirm" onCancel={onClose} failure={failure} failurePrefix="Couldn’t save" />
    </form>
  );
}

/* Small label/value helper for detail modals elsewhere in the portal. */
export function Money({ value, tone }) {
  return <span className={tone === 'plus' ? f.plus : tone === 'minus' ? f.minus : f.amount}>{formatMoney(value)}</span>;
}

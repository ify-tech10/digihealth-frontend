import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import Icon from '../../../components/Icon/Icon';
import { pick, toISODate } from '../../../utils/format';
import { DIGI_PHONE_LABEL, SERVICES, TIME_SLOTS, refOf, serviceLabel, whenLabel } from '../patientFields';
import s from '../../Admin/admin.module.css';
import p from '../Patient.module.css';

const tomorrow = () => toISODate(new Date(Date.now() + 86400000));
const inDays = (n) => toISODate(new Date(Date.now() + n * 86400000));

function SlotPicker({ value, onChange }) {
  return (
    <div className={p.slots} role="radiogroup" aria-label="Time of day">
      {TIME_SLOTS.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={`${p.slot} ${value === v ? p.slotOn : ''}`} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

/* ── Book care: pick a service, then when and where ── */
export function BookCareModal({ open, profile, service, onClose, onSubmit }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Book care" size="large">
      {open && <BookCareForm key={service || 'pick'} profile={profile || {}} initialService={service} onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

function BookCareForm({ profile, initialService, onClose, onSubmit }) {
  const valid = SERVICES.some(([k]) => k === initialService);
  const [step, setStep] = useState(valid ? 2 : 1);
  const [service, setService] = useState(valid ? initialService : '');
  const [date, setDate] = useState(tomorrow);
  const [slot, setSlot] = useState('MORNING');
  const [forOther, setForOther] = useState(false);
  const [other, setOther] = useState({ name: '', phone: '', relationship: '' });
  /* null until the patient types — until then follow the profile address (it may still be loading) */
  const [typedAddress, setAddress] = useState(null);
  const address = typedAddress ?? [profile.address, pick(profile, 'areaLga', 'lga', 'city')].filter(Boolean).join(', ');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const setO = (k) => (e) => setOther((o) => ({ ...o, [k]: e.target.value }));
  const telemed = service === 'TELEMEDICINE';

  async function submit(e) {
    e.preventDefault();
    if (!date || date < tomorrow()) return setError(`Choose a date from tomorrow. For care today, call us on ${DIGI_PHONE_LABEL}.`);
    if (date > inDays(60)) return setError('You can book up to 60 days ahead.');
    if (!telemed && address.trim().length < 8) return setError('Enter the full address where the nurse should come.');
    if (forOther && (!other.name.trim() || !/^\+?[0-9 ()-]{7,}$/.test(other.phone.trim()))) return setError('Enter the name and phone number of the person receiving care.');
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        serviceType: service,
        date,
        timeSlot: slot,
        address: telemed ? undefined : address.trim(),
        notes: notes.trim() || undefined,
        forSomeoneElse: forOther,
        careRecipient: forOther ? { name: other.name.trim(), phone: other.phone.trim(), relationship: other.relationship.trim() || undefined } : undefined,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (step === 1) {
    return (
      <div>
        <div className={p.steps}><b>1. Choose care</b><Icon name="chevronRight" /> 2. When &amp; where</div>
        <div className={p.services}>
          {SERVICES.map(([k, label, text, icon]) => (
            <button key={k} type="button" className={`${p.service} ${service === k ? p.serviceOn : ''}`} onClick={() => { setService(k); setStep(2); }}>
              <span className={p.svcIcon}><Icon name={icon} /></span>
              <span><span className={p.serviceName}>{label}</span><span className={p.serviceText}>{text}</span></span>
            </button>
          ))}
        </div>
        <p className={s.hint} style={{ marginTop: 14 }}>Not sure what you need? Choose the closest one — a care coordinator calls you before the first visit.</p>
      </div>
    );
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={p.steps}>
        <button type="button" className={p.linkBtn} onClick={() => setStep(1)}>1. {serviceLabel(service)}</button>
        <Icon name="chevronRight" /> <b>2. When &amp; where</b>
      </div>

      <div className={s.formGrid}>
        <div className={s.field}>
          <label htmlFor="bkDate">Date <span className={s.req}>*</span></label>
          <input id="bkDate" type="date" min={tomorrow()} max={inDays(60)} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label>Time of day</label>
          <SlotPicker value={slot} onChange={setSlot} />
        </div>

        <div className={`${s.field} ${s.full}`}>
          <label className={s.checkRow} style={{ fontWeight: 500 }}>
            <input type="checkbox" checked={forOther} onChange={(e) => setForOther(e.target.checked)} />
            I’m booking for someone else (a parent, child or relative)
          </label>
        </div>
        {forOther && (
          <>
            <div className={s.field}>
              <label htmlFor="bkOName">Their name <span className={s.req}>*</span></label>
              <input id="bkOName" value={other.name} onChange={setO('name')} />
            </div>
            <div className={s.field}>
              <label htmlFor="bkOPhone">Their phone <span className={s.req}>*</span></label>
              <input id="bkOPhone" type="tel" value={other.phone} onChange={setO('phone')} />
            </div>
            <div className={s.field}>
              <label htmlFor="bkORel">They are my…</label>
              <input id="bkORel" value={other.relationship} onChange={setO('relationship')} placeholder="e.g. Mother" />
            </div>
          </>
        )}

        {!telemed && (
          <div className={`${s.field} ${s.full}`}>
            <label htmlFor="bkAddr">Address for the visit <span className={s.req}>*</span></label>
            <textarea id="bkAddr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House number, street, area — and a landmark if it’s hard to find" style={{ minHeight: 64 }} />
          </div>
        )}
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="bkNotes">{telemed ? 'What would you like to discuss?' : 'What should the nurse know?'}</label>
          <textarea id="bkNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={telemed ? 'Symptoms, questions, medicines you take' : 'e.g. Discharged from hospital on Monday after hip surgery; uses a walker'} />
        </div>
      </div>
      <p className={s.hint} style={{ marginTop: 12 }}>We’ll confirm your booking and tell you which nurse is coming. {service === 'LAB_DIAGNOSTICS' && 'Some tests need fasting — we’ll tell you when we confirm.'}</p>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Sending…' : 'Request booking'}</button>
      </div>
    </form>
  );
}

/* ── Move a booking to another day ── */
export function RescheduleModal({ booking, onClose, onSubmit }) {
  return (
    <Modal isOpen={!!booking} onClose={onClose} title="Change date">
      {booking && <RescheduleForm key={booking.id} booking={booking} onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

function RescheduleForm({ booking, onClose, onSubmit }) {
  const [date, setDate] = useState(() => (booking.date && String(booking.date).slice(0, 10) >= tomorrow() ? String(booking.date).slice(0, 10) : tomorrow()));
  const [slot, setSlot] = useState(String(booking.timeSlot || 'MORNING').toUpperCase());
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!date || date < tomorrow() || date > inDays(60)) return setError('Choose a date between tomorrow and 60 days from now.');
    setError('');
    setBusy(true);
    try {
      await onSubmit({ date, timeSlot: slot, reason: reason.trim() || undefined });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint} style={{ marginBottom: 14 }}>{serviceLabel(booking.serviceType)} · {refOf(booking)} · now {whenLabel(booking)}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className={s.field}>
          <label htmlFor="rsDate">New date</label>
          <input id="rsDate" type="date" min={tomorrow()} max={inDays(60)} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className={s.field}>
          <label>Time of day</label>
          <SlotPicker value={slot} onChange={setSlot} />
        </div>
        <div className={s.field}>
          <label htmlFor="rsWhy">Reason (optional)</label>
          <input id="rsWhy" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Travelling that day" />
        </div>
      </div>
      <p className={s.hint} style={{ marginTop: 12 }}>Your nurse may change if they aren’t free on the new date.</p>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Keep current date</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Change date'}</button>
      </div>
    </form>
  );
}

/* ── Cancel a booking ── */
export function CancelBookingModal({ booking, onClose, onSubmit }) {
  return (
    <Modal isOpen={!!booking} onClose={onClose} title="Cancel booking" size="small">
      {booking && <CancelForm key={booking.id} booking={booking} onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

const CANCEL_REASONS = ['I no longer need this care', 'I’ve been admitted to hospital', 'I’ve made other arrangements', 'The date no longer works', 'Other'];

function CancelForm({ booking, onClose, onSubmit }) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (reason === 'Other' && !detail.trim()) return setError('Tell us briefly why.');
    setError('');
    setBusy(true);
    try {
      await onSubmit(reason === 'Other' ? detail.trim() : [reason, detail.trim()].filter(Boolean).join(' — '));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p style={{ fontSize: 13.5, color: '#3a4570', marginBottom: 14 }}>Cancel {serviceLabel(booking.serviceType).toLowerCase()} on {whenLabel(booking)}?</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className={s.field}>
          <label htmlFor="cbWhy">Reason</label>
          <select id="cbWhy" value={reason} onChange={(e) => setReason(e.target.value)}>
            {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="cbMore">Anything else? {reason === 'Other' && <span className={s.req}>*</span>}</label>
          <textarea id="cbMore" value={detail} onChange={(e) => setDetail(e.target.value)} style={{ minHeight: 60 }} />
        </div>
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Keep booking</button>
        <button type="submit" className={`${s.btn} ${s.btnDanger} ${s.btnLarge}`} disabled={busy}>{busy ? 'Cancelling…' : 'Cancel booking'}</button>
      </div>
    </form>
  );
}

import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import { ccsApi, ESCALATION_TEAMS } from '../../../Api/ccsApi';
import { useApi } from '../../../hooks/useApi';
import { locationLabel } from '../../../config/locations';
import { humanize, pick } from '../../../utils/format';
import {
  CHANNELS, TICKET_TYPES, patientId, patientName, patientNurse, patientPhone, patientPlan,
  patientOf, ticketSubject, ticketTime, ticketType,
} from '../ticketFields';
import { StatusTag } from './TicketBadge';
import s from '../../Admin/admin.module.css';
import c from '../Ccs.module.css';

/* ── Log a new ticket from a call, WhatsApp message, email or walk-in ── */
export function NewTicketModal({ open, patient, onClose, onCreated }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="New ticket">
      {open && <NewTicketForm key={patientId(patient) ?? 'blank'} patient={patient} onClose={onClose} onCreated={onCreated} />}
    </Modal>
  );
}

function NewTicketForm({ patient, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: patientName(patient) || '',
    phone: patientPhone(patient) || '',
    email: pick(patient || {}, 'email') || '',
    channel: 'PHONE',
    type: 'GENERAL',
    subject: '',
    message: '',
    urgent: false,
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Enter the caller’s name';
    if (!form.phone.trim() && !form.email.trim()) errs.phone = 'Enter a phone number or email so we can reply';
    if (!form.subject.trim()) errs.subject = 'Add a short subject';
    if (!form.message.trim()) errs.message = 'Describe what the caller needs';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setFailure('');
    try {
      const created = await ccsApi.createTicket({
        patientId: pick(patient || {}, 'id', 'patientId') ?? undefined,
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        channel: form.channel,
        type: form.type,
        priority: form.urgent ? 'URGENT' : 'NORMAL',
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      onCreated(created, form.name.trim());
    } catch (err) {
      setFailure(err.message);
    } finally {
      setBusy(false);
    }
  }

  const err = (k) => errors[k] && <span className={s.fieldError}>{errors[k]}</span>;

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={s.formGrid}>
        <div className={s.field}>
          <label htmlFor="ntName">Caller name <span className={s.req}>*</span></label>
          <input id="ntName" value={form.name} onChange={set('name')} />
          {err('name')}
        </div>
        <div className={s.field}>
          <label htmlFor="ntPhone">Phone</label>
          <input id="ntPhone" type="tel" value={form.phone} onChange={set('phone')} placeholder="+234…" />
          {err('phone')}
        </div>
        <div className={s.field}>
          <label htmlFor="ntEmail">Email</label>
          <input id="ntEmail" type="email" value={form.email} onChange={set('email')} />
        </div>
        <div className={s.field}>
          <label htmlFor="ntChannel">Came in by</label>
          <select id="ntChannel" value={form.channel} onChange={set('channel')}>
            {CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="ntType">Type</label>
          <select id="ntType" value={form.type} onChange={set('type')}>
            {TICKET_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className={s.field} style={{ justifyContent: 'flex-end' }}>
          <label className={s.checkRow} style={{ fontWeight: 600 }}>
            <input type="checkbox" checked={form.urgent} onChange={set('urgent')} /> Mark as urgent
          </label>
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="ntSubject">Subject <span className={s.req}>*</span></label>
          <input id="ntSubject" value={form.subject} onChange={set('subject')} placeholder="e.g. Visit not confirmed for Thursday" />
          {err('subject')}
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="ntMessage">What the caller said <span className={s.req}>*</span></label>
          <textarea id="ntMessage" value={form.message} onChange={set('message')} />
          {err('message')}
        </div>
      </div>
      {failure && <p className={s.fieldError} style={{ marginTop: 12 }}>Couldn’t create the ticket: {failure}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Creating…' : 'Create ticket'}</button>
      </div>
    </form>
  );
}

/* ── Escalate: choose the team and say why ── */
const DEFAULT_TEAM = { COMPLAINT: 'CNO', BILLING: 'FINANCE', HMO: 'RELATIONSHIP_MANAGER' };

export function EscalateModal({ ticket, busy, onClose, onConfirm }) {
  return (
    <Modal isOpen={!!ticket} onClose={onClose} title="Escalate ticket">
      {ticket && <EscalateForm key={ticket.id} ticket={ticket} busy={busy} onClose={onClose} onConfirm={onConfirm} />}
    </Modal>
  );
}

function EscalateForm({ ticket, busy, onClose, onConfirm }) {
  const [team, setTeam] = useState(DEFAULT_TEAM[ticketType(ticket)] || 'ADMIN');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    if (note.trim().length < 5) {
      setError('Tell the team what’s happened and what the patient needs.');
      return;
    }
    onConfirm(team, note.trim());
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint} style={{ marginBottom: 14 }}>“{ticketSubject(ticket)}”</p>
      <div className={s.field} style={{ marginBottom: 14 }}>
        <label htmlFor="escTeam">Escalate to</label>
        <select id="escTeam" value={team} onChange={(e) => setTeam(e.target.value)}>
          {ESCALATION_TEAMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className={s.field}>
        <label htmlFor="escNote">Note for the team <span className={s.req}>*</span></label>
        <textarea id="escNote" value={note} onChange={(e) => { setNote(e.target.value); setError(''); }} />
        {error && <span className={s.fieldError}>{error}</span>}
      </div>
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Escalating…' : 'Escalate'}</button>
      </div>
    </form>
  );
}

/* ── Patient profile, with their tickets ── */
export function PatientProfileModal({ patient, tickets = [], onClose, onOpenTicket, onNewTicket }) {
  return (
    <Modal
      isOpen={!!patient}
      onClose={onClose}
      title={patient ? `${patientName(patient) || 'Patient'} — Patient Profile` : ''}
    >
      {patient && (
        <PatientProfile
          key={pick(patient, 'id', 'patientId') ?? patientName(patient)}
          patient={patient}
          tickets={tickets}
          onClose={onClose}
          onOpenTicket={onOpenTicket}
          onNewTicket={onNewTicket}
        />
      )}
    </Modal>
  );
}

function PatientProfile({ patient, tickets, onClose, onOpenTicket, onNewTicket }) {
  const id = pick(patient, 'id', 'patientId');
  const full = useApi(() => (id != null ? ccsApi.patient(id) : Promise.resolve(null)), `ccs-patient-${id ?? 'none'}`);
  const p = { ...patient, ...(full.data || {}) };

  const same = (t) => {
    const tp = patientOf(t);
    const tid = pick(tp, 'id', 'patientId') ?? t.patientId;
    if (id != null && tid != null) return String(id) === String(tid);
    return !!patientName(p) && patientName(tp) === patientName(p);
  };
  const theirs = tickets.filter(same);

  const rows = [
    ['Patient ID', patientId(p)],
    ['Full name', patientName(p)],
    ['Phone', patientPhone(p)],
    ['Email', p.email],
    ['Care plan', humanize(patientPlan(p))],
    ['Assigned nurse', patientNurse(p) || 'Not yet assigned'],
    ['Location', p.locationArea ? locationLabel(p.locationArea) : pick(p, 'address')],
    ['Next of kin', pick(p, 'nextOfKinName', 'nextOfKin')],
    ['Account status', humanize(pick(p, 'status', 'accountStatus'))],
  ];

  return (
    <>
      <div className={c.section}>
        <div className={c.sectionLabel}>Patient details</div>
        {rows.map(([label, value]) => (
          <div key={label} className={c.row}>
            <span className={c.rowLabel}>{label}</span>
            <span className={c.rowValue}>{value || '—'}</span>
          </div>
        ))}
        {full.error && id != null && <p className={s.muted} style={{ fontSize: 12, marginTop: 6 }}>Showing what the ticket holds — the full profile couldn’t be loaded.</p>}
      </div>

      <div className={c.section}>
        <div className={c.sectionLabel}>Tickets ({theirs.length})</div>
        {!theirs.length ? (
          <p className={s.muted} style={{ fontSize: 12.5 }}>No tickets from this patient.</p>
        ) : (
          theirs.map((t) => (
            <button key={t.id} type="button" className={c.ticketLink} onClick={() => onOpenTicket?.(t)} disabled={!onOpenTicket}>
              <StatusTag ticket={t} />
              <span className={c.tlSubject}>{ticketSubject(t)}</span>
              <span className={c.time}>{ticketTime(t)}</span>
            </button>
          ))
        )}
      </div>

      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Close</button>
        {onNewTicket && (
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => onNewTicket(p)}>New ticket</button>
        )}
      </div>
    </>
  );
}

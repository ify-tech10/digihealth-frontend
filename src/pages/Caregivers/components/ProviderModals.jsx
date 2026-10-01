import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import StatusBadge from '../../../components/StatusBadge/StatusBadge';
import { providerApi } from '../../../Api/providerApi';
import { formatDay, humanize, pick, toISODate } from '../../../utils/format';
import { Detail } from '../../Admin/components/Common';
import { isClosable, locationOf, patientName, requestIdOf, serviceOf, statusOf } from '../fields';
import s from '../../Admin/admin.module.css';

/* ── Patient / assignment details ── */
export function PatientModal({ patient: p, onClose, onSchedule, onReport, onCloseRequest }) {
  return (
    <Modal isOpen={!!p} onClose={onClose} title={p ? patientName(p) : ''} size="large">
      {p && (
        <>
          <div className={s.details}>
            <Detail label="Service">{humanize(serviceOf(p))}</Detail>
            <Detail label="Status"><StatusBadge status={statusOf(p)} /></Detail>
            <Detail label="Phone">{p.phoneNumber ? <a href={`tel:${p.phoneNumber}`}>{p.phoneNumber}</a> : '—'}</Detail>
            <Detail label="Next visit">{pick(p, 'nextVisit', 'nextVisitAt') || '—'}</Detail>
            <Detail label="Address" full>{locationOf(p)}</Detail>
            <Detail label="Assigned on">{formatDay(pick(p, 'assignedAt', 'startDate'))}</Detail>
            <Detail label="Request ref">{requestIdOf(p) != null ? `#${requestIdOf(p)}` : '—'}</Detail>
            {pick(p, 'description', 'careNotes') && <Detail label="Care needs" full>{pick(p, 'description', 'careNotes')}</Detail>}
            {pick(p, 'adminNote', 'supervisorNote') && <Detail label="Note from supervisor" full>{pick(p, 'adminNote', 'supervisorNote')}</Detail>}
            {pick(p, 'nextOfKinName') && (
              <Detail label="Next of kin" full>
                {[p.nextOfKinName, p.nextOfKinRelationship, p.nextOfKinPhone].filter(Boolean).join(' · ')}
              </Detail>
            )}
            {pick(p, 'closureRejectionReason', 'reopenReason') && (
              <Detail label="Sent back by supervisor" full>{pick(p, 'closureRejectionReason', 'reopenReason')}</Detail>
            )}
          </div>
          <div className={s.modalActions}>
            {statusOf(p) === 'PENDING_CLOSURE' ? (
              <span className={s.muted} style={{ fontSize: 13, alignSelf: 'center' }}>Closure is waiting for your supervisor's approval.</span>
            ) : (
              <>
                {onCloseRequest && isClosable(p) && (
                  <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnLarge}`} onClick={() => onCloseRequest(p)}>Close request</button>
                )}
                {onReport && (
                  <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={() => onReport(p)}>Record activity</button>
                )}
                {onSchedule && (
                  <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => onSchedule(p)}>Schedule visit</button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

/* ── Schedule a visit (patient optional → pick from list) ── */
const DURATIONS = [[30, '30 min'], [60, '1 hour'], [90, '1.5 hours'], [120, '2 hours'], [180, '3 hours'], [240, '4 hours']];

export function ScheduleVisitModal({ open, patient, patients = [], onClose, onDone }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Schedule a visit">
      {open && <ScheduleVisitForm key={patient ? requestIdOf(patient) : 'any'} patient={patient} patients={patients} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}

function ScheduleVisitForm({ patient, patients, onClose, onDone }) {
  const [form, setForm] = useState({
    requestId: patient ? String(requestIdOf(patient)) : '',
    date: toISODate(new Date()),
    time: '09:00',
    durationMins: '60',
    title: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.value }));
  const options = patients.filter((p) => statusOf(p) !== 'COMPLETED' && statusOf(p) !== 'PENDING_CLOSURE');

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.requestId) errs.requestId = 'Choose a patient';
    if (!form.date) errs.date = 'Pick a date';
    else if (form.date < toISODate(new Date())) errs.date = 'Pick today or a future date';
    if (!form.time) errs.time = 'Pick a time';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const chosen = patients.find((p) => String(requestIdOf(p)) === form.requestId) || patient;
    setBusy(true);
    try {
      await providerApi.scheduleVisit({
        careRequestId: Number(form.requestId),
        visitDate: form.date,
        scheduledTime: form.time,
        durationMins: Number(form.durationMins),
        title: form.title.trim() || `${humanize(serviceOf(chosen || {}))} visit`,
        notes: form.notes.trim() || null,
      });
      onDone(`Visit with ${chosen ? patientName(chosen) : 'patient'} booked for ${formatDay(form.date)} at ${form.time}.`);
    } catch (err) {
      setErrors({ general: err.message });
      setBusy(false);
    }
  }

  const fieldErr = (f) => errors[f] && <span className={s.fieldError}>{errors[f]}</span>;

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      {errors.general && <p className={s.fieldError} style={{ marginBottom: 12 }}>{errors.general}</p>}
      <div className={s.formGrid}>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="v-patient">Patient <span className={s.req}>*</span></label>
          <select id="v-patient" value={form.requestId} onChange={set('requestId')} disabled={!!patient}>
            <option value="">{options.length || patient ? 'Select patient' : 'No active patients'}</option>
            {(patient ? [patient] : options).map((p) => (
              <option key={requestIdOf(p)} value={requestIdOf(p)}>{patientName(p)} — {humanize(serviceOf(p))}</option>
            ))}
          </select>
          {fieldErr('requestId')}
        </div>
        <div className={s.field}>
          <label htmlFor="v-date">Date <span className={s.req}>*</span></label>
          <input id="v-date" type="date" min={toISODate(new Date())} value={form.date} onChange={set('date')} />
          {fieldErr('date')}
        </div>
        <div className={s.field}>
          <label htmlFor="v-time">Time <span className={s.req}>*</span></label>
          <input id="v-time" type="time" value={form.time} onChange={set('time')} />
          {fieldErr('time')}
        </div>
        <div className={s.field}>
          <label htmlFor="v-dur">Duration</label>
          <select id="v-dur" value={form.durationMins} onChange={set('durationMins')}>
            {DURATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="v-title">Visit type</label>
          <input id="v-title" value={form.title} onChange={set('title')} placeholder="e.g. Wound dressing" />
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="v-notes">Notes for the patient</label>
          <textarea id="v-notes" value={form.notes} onChange={set('notes')} placeholder="Anything they should prepare…" />
        </div>
      </div>
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Booking…' : 'Book visit'}</button>
      </div>
    </form>
  );
}

/* ── Close a request → goes to the supervisor for approval ── */
export function CloseRequestModal({ patient, onClose, onDone }) {
  return (
    <Modal isOpen={!!patient} onClose={onClose} title="Close request">
      {patient && <CloseForm key={requestIdOf(patient)} patient={patient} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}

function CloseForm({ patient, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (note.trim().length < 20) {
      setError('Summarise the care given and the patient’s condition (at least 20 characters).');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await providerApi.closeRequest(requestIdOf(patient), note.trim());
      onDone(`Closure for ${patientName(patient)} sent to your supervisor for approval.`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint}>
        Your supervisor (medical director or nursing officer) reviews this before the request is fully closed.
        Until then it shows as “Pending closure”.
      </p>
      <div className={s.field} style={{ marginTop: 12 }}>
        <label htmlFor="c-note">Closing report <span className={s.req}>*</span></label>
        <textarea
          id="c-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={`Care provided to ${patientName(patient)}, outcome, and any follow-up needed…`}
          style={{ minHeight: 120 }}
        />
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 8 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Sending…' : 'Send for approval'}</button>
      </div>
    </form>
  );
}

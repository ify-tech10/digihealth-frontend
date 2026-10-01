import { useState } from 'react';
import Badge from '../../../components/Badge/Badge';
import Icon from '../../../components/Icon/Icon';
import { formatDate, humanize, pick, toISODate } from '../../../utils/format';
import { DocumentLinks } from '../../Admin/components/Common';
import { fromOf, isUrgent, patientAddress, patientName, patientPhone, reqStatus } from '../../Facility/facilityFields';
import s from '../../Admin/admin.module.css';
import f from '../../Facility/Facility.module.css';

const LABEL = { NEW: 'New', ACCEPTED: 'Awaiting arrival', ADMITTED: 'Admitted', DISCHARGED: 'Discharged', DECLINED: 'Declined' };
const VARIANT = { NEW: 'new', ACCEPTED: 'pending', ADMITTED: 'active', DISCHARGED: 'done', DECLINED: 'urgent' };

export function ReferralStatus({ referral }) {
  const st = reqStatus(referral);
  return <Badge variant={VARIANT[st] || 'default'}>{LABEL[st] || humanize(st)}</Badge>;
}

export function Urgency({ referral }) {
  return isUrgent(referral) ? <Badge variant="urgent">{humanize(pick(referral, 'urgency', 'priority'))}</Badge> : null;
}

const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',').map((x) => x.trim()).filter(Boolean) : []);
const VITALS = [
  ['bloodPressure', 'Blood pressure', ''],
  ['pulse', 'Pulse', 'bpm'],
  ['temperature', 'Temp', '°C'],
  ['spo2', 'SpO₂', '%'],
  ['respiratoryRate', 'Resp. rate', '/min'],
  ['bloodSugar', 'Blood sugar', 'mmol/L'],
];

/* Everything the hospital needs to receive the patient safely. */
export function ReferralDetails({ referral: r }) {
  const p = r.patient || {};
  const allergies = list(pick(r, 'allergies') ?? p.allergies);
  const meds = list(pick(r, 'medications', 'currentMedications'));
  const vitals = r.vitals || {};
  const nok = p.nextOfKin || {};
  return (
    <>
      <div className={f.block}>
        <div className={f.blockTitle}><Icon name="users" /> Patient</div>
        <div className={s.details} style={{ marginBottom: 0 }}>
          <div className={s.detail}><span>Name</span><p>{patientName(r)}</p></div>
          <div className={s.detail}><span>Age / sex</span><p>{[p.age != null ? `${p.age} yrs` : null, humanize(p.gender)].filter(Boolean).join(' · ') || '—'}</p></div>
          <div className={s.detail}><span>Phone</span><p>{patientPhone(r) ? <a href={`tel:${patientPhone(r)}`} style={{ color: 'var(--logo-bg)', fontWeight: 600 }}>{patientPhone(r)}</a> : '—'}</p></div>
          <div className={s.detail}><span>Patient type</span><p>{humanize(pick(r, 'patientType') || p.patientType).replace(/^Hmo$/, 'HMO') || '—'}</p></div>
          <div className={`${s.detail} ${s.full}`}><span>Address</span><p>{patientAddress(r) || '—'}</p></div>
          {(nok.name || typeof p.nextOfKin === 'string') && (
            <div className={`${s.detail} ${s.full}`}><span>Next of kin</span><p>{typeof p.nextOfKin === 'string' ? p.nextOfKin : [nok.name, nok.relationship, nok.phone].filter(Boolean).join(' · ')}</p></div>
          )}
        </div>
      </div>

      {allergies.length > 0 && (
        <div className={`${f.block} ${f.alert}`}>
          <div className={f.blockTitle}><Icon name="alert" /> Allergies</div>
          <div className={f.chips}>{allergies.map((a) => <span key={a} className={f.chip}>{a}</span>)}</div>
        </div>
      )}

      <div className={`${f.block} ${isUrgent(r) ? f.alert : ''}`}>
        <div className={f.blockTitle}><Icon name="heart" /> Reason for referral</div>
        <div className={f.blockText}>{pick(r, 'reason', 'illnessDetails', 'diagnosis') || '—'}</div>
        {pick(r, 'diagnosis') && pick(r, 'reason') && <p className={s.muted} style={{ fontSize: 12.5, marginTop: 6 }}>Working diagnosis: {r.diagnosis}</p>}
      </div>

      <div className={f.block}>
        <div className={f.blockTitle}><Icon name="file" /> Summary of care so far</div>
        <div className={f.blockText}>{pick(r, 'priorCareSummary', 'careSummary') || 'No prior care recorded.'}</div>
      </div>

      {VITALS.some(([k]) => vitals[k] != null && vitals[k] !== '') && (
        <div className={f.block}>
          <div className={f.blockTitle}><Icon name="activity" /> Latest vitals{vitals.recordedAt ? ` · ${formatDate(vitals.recordedAt)}` : ''}</div>
          <div className={f.vitals}>
            {VITALS.filter(([k]) => vitals[k] != null && vitals[k] !== '').map(([k, label, unit]) => (
              <div key={k} className={f.vital}><span>{label}</span><strong>{vitals[k]} {unit}</strong></div>
            ))}
          </div>
        </div>
      )}

      {meds.length > 0 && (
        <div className={f.block}>
          <div className={f.blockTitle}><Icon name="plusHouse" /> Current medications</div>
          <div className={f.chips}>{meds.map((m) => <span key={m} className={f.chip}>{m}</span>)}</div>
        </div>
      )}

      <div className={s.details}>
        <div className={s.detail}><span>Referred by</span><p>{fromOf(r) || '—'}</p></div>
        <div className={s.detail}><span>Received</span><p>{formatDate(r.createdAt)}</p></div>
        {r.expectedArrival && <div className={s.detail}><span>Expected arrival</span><p>{formatDate(r.expectedArrival)}</p></div>}
        {r.ward && <div className={s.detail}><span>Ward</span><p>{r.ward}</p></div>}
        {r.admittedAt && <div className={s.detail}><span>Admitted</span><p>{formatDate(r.admittedAt)}</p></div>}
        {r.dischargedAt && <div className={s.detail}><span>Discharged</span><p>{formatDate(r.dischargedAt)}</p></div>}
        {r.dischargeSummary && <div className={`${s.detail} ${s.full}`}><span>Discharge summary</span><p>{r.dischargeSummary}</p></div>}
        {r.declineReason && <div className={`${s.detail} ${s.full}`}><span>Declined because</span><p>{r.declineReason}</p></div>}
        <div className={`${s.detail} ${s.full}`}><span>Documents</span><DocumentLinks record={r} /></div>
      </div>
    </>
  );
}

function inAnHour() {
  const d = new Date(Date.now() + 60 * 60000);
  d.setMinutes(0, 0, 0);
  return `${toISODate(d)}T${String(d.getHours()).padStart(2, '0')}:00`;
}

/* ── Accept: when the patient should arrive and where they'll go ── */
export function AcceptReferralForm({ referral, onClose, onSubmit }) {
  const [when, setWhen] = useState(inAnHour);
  const [ward, setWard] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!when) return setError('When should the patient arrive?');
    setError('');
    setBusy(true);
    try {
      await onSubmit({ expectedArrival: new Date(when).toISOString(), ward: ward.trim() || undefined, note: note.trim() || undefined });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint} style={{ marginBottom: 14 }}>DiGi Health will arrange for {patientName(referral)} to arrive at this time.</p>
      <div className={s.formGrid}>
        <div className={s.field}>
          <label htmlFor="arWhen">Expected arrival <span className={s.req}>*</span></label>
          <input id="arWhen" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div className={s.field}>
          <label htmlFor="arWard">Ward / department</label>
          <input id="arWard" value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g. Emergency, Ward B" />
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="arNote">Instructions for DiGi / the patient</label>
          <textarea id="arNote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Come through the emergency entrance; bring current medications" />
        </div>
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Accept referral'}</button>
      </div>
    </form>
  );
}

/* ── Discharge: what happened, sent back to DiGi's care team ── */
const OUTCOMES = [
  ['RECOVERED', 'Recovered'],
  ['IMPROVED', 'Improved — continue home care'],
  ['REFERRED_ON', 'Referred to another facility'],
  ['LEFT_AGAINST_ADVICE', 'Left against medical advice'],
];

export function DischargeForm({ referral, onClose, onSubmit }) {
  const [outcome, setOutcome] = useState('IMPROVED');
  const [summary, setSummary] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (summary.trim().length < 20) return setError('Write a short discharge summary (at least 20 characters) — DiGi’s care team continues from it.');
    if (file && file.size > 10 * 1024 * 1024) return setError('The file must be 10 MB or smaller.');
    setError('');
    const fd = new FormData();
    fd.append('outcome', outcome);
    fd.append('summary', summary.trim());
    if (followUp.trim()) fd.append('followUp', followUp.trim());
    if (file) fd.append('file', file);
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
      <p className={s.hint} style={{ marginBottom: 14 }}>{patientName(referral)} goes back to DiGi Health’s home-care team with this summary.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className={s.field}>
          <label htmlFor="dcOutcome">Outcome</label>
          <select id="dcOutcome" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            {OUTCOMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="dcSummary">Discharge summary <span className={s.req}>*</span></label>
          <textarea id="dcSummary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Treatment given, key findings, condition at discharge" />
        </div>
        <div className={s.field}>
          <label htmlFor="dcFollow">Follow-up for home care</label>
          <textarea id="dcFollow" value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="e.g. Wound dressing every 2 days; review in clinic in 2 weeks" />
        </div>
        <div className={s.field}>
          <label htmlFor="dcFile">Discharge letter (optional)</label>
          <input id="dcFile" type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} disabled={busy}>{busy ? 'Sending…' : 'Discharge patient'}</button>
      </div>
    </form>
  );
}

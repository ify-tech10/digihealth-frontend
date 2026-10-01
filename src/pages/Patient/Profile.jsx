import { useState } from 'react';
import Toast from '../../components/Toast/Toast';
import { patientApi } from '../../Api/patientApi';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, pick, toISODate } from '../../utils/format';
import { Detail } from '../Admin/components/Common';
import { isHmo } from './patientFields';
import s from '../Admin/admin.module.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENOTYPES = ['AA', 'AS', 'AC', 'SS', 'SC'];
const list = (v) => (Array.isArray(v) ? v.join(', ') : v || '');
const split = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);

/* The patient's own details — what nurses see before a visit. */
export default function Profile() {
  usePageHeader('My Profile', 'Keep this up to date so your nurse can care for you safely');
  const { toast, showToast, clearToast } = useToast();
  const { data, loading, error, reload } = useApi(() => patientApi.profile(), 'pt-profile');

  if (loading) return <div className={s.card}><div className={s.emptyBlock}>Loading…</div></div>;
  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      <ProfileForm key={data ? 'loaded' : 'empty'} profile={data || {}} loadError={error} onSaved={() => { showToast('success', 'Profile saved.'); reload(); }} onError={(m) => showToast('error', m)} />
    </>
  );
}

function ProfileForm({ profile, loadError, onSaved, onError }) {
  const nok = profile.nextOfKin || {};
  const prefs = profile.notificationPreferences || {};
  const [form, setForm] = useState({
    phoneNumber: pick(profile, 'phoneNumber', 'phone') || '',
    email: profile.email || '',
    dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : '',
    gender: profile.gender || '',
    address: profile.address || '',
    area: pick(profile, 'areaLga', 'lga', 'city') || '',
    landmark: pick(profile, 'landmark', 'directions') || '',
    nokName: nok.name || '',
    nokRelationship: nok.relationship || '',
    nokPhone: nok.phone || '',
    bloodGroup: profile.bloodGroup || '',
    genotype: profile.genotype || '',
    allergies: list(profile.allergies),
    conditions: list(pick(profile, 'conditions', 'medicalConditions')),
    medications: list(pick(profile, 'currentMedications', 'medications')),
    doctor: pick(profile, 'primaryDoctor', 'regularHospital') || '',
    sms: prefs.sms !== false,
    whatsapp: prefs.whatsapp !== false,
    emailPref: prefs.email !== false,
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const phoneOk = (v) => /^\+?[0-9 ()-]{7,}$/.test(v.trim());

  async function submit(e) {
    e.preventDefault();
    const x = {};
    if (!phoneOk(form.phoneNumber)) x.phoneNumber = 'Enter a valid phone number';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) x.email = 'Enter a valid email';
    if (form.dateOfBirth && form.dateOfBirth > toISODate(new Date())) x.dateOfBirth = 'Can’t be in the future';
    if (form.address.trim().length < 8) x.address = 'Enter your full address so nurses can find you';
    if (form.nokPhone && !phoneOk(form.nokPhone)) x.nokPhone = 'Enter a valid phone number';
    if (form.nokPhone && !form.nokName.trim()) x.nokName = 'Enter their name';
    setErrors(x);
    if (Object.keys(x).length) return onError('Please fix the highlighted fields.');
    setBusy(true);
    try {
      await patientApi.updateProfile({
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        address: form.address.trim(),
        areaLga: form.area.trim() || undefined,
        landmark: form.landmark.trim() || undefined,
        nextOfKin: form.nokName.trim() ? { name: form.nokName.trim(), relationship: form.nokRelationship.trim() || undefined, phone: form.nokPhone.trim() || undefined } : undefined,
        bloodGroup: form.bloodGroup || undefined,
        genotype: form.genotype || undefined,
        allergies: split(form.allergies),
        conditions: split(form.conditions),
        currentMedications: split(form.medications),
        primaryDoctor: form.doctor.trim() || undefined,
        notificationPreferences: { sms: form.sms, whatsapp: form.whatsapp, email: form.emailPref },
      });
      onSaved();
    } catch (err) {
      onError(`Couldn’t save: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  const field = (k, label, props = {}) => (
    <div className={`${s.field} ${props.full ? s.full : ''}`}>
      <label htmlFor={`pp-${k}`}>{label}</label>
      {props.area
        ? <textarea id={`pp-${k}`} value={form[k]} onChange={set(k)} placeholder={props.placeholder} style={{ minHeight: 64 }} />
        : <input id={`pp-${k}`} value={form[k]} onChange={set(k)} type={props.type} placeholder={props.placeholder} max={props.max} />}
      {props.hint && <span className={s.hint}>{props.hint}</span>}
      {errors[k] && <span className={s.fieldError}>{errors[k]}</span>}
    </div>
  );
  const select = (k, label, options) => (
    <div className={s.field}>
      <label htmlFor={`pp-${k}`}>{label}</label>
      <select id={`pp-${k}`} value={form[k]} onChange={set(k)}>
        <option value="">Select…</option>
        {options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
      </select>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate>
      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.cardHeader}><h3>{pick(profile, 'fullName', 'name') || 'Your details'}</h3></div>
        <div className={s.cardBody}>
          {loadError && <p className={s.fieldError} style={{ marginBottom: 12 }}>Couldn’t load your profile: {loadError}</p>}
          <div className={s.details}>
            <Detail label="Patient ID">{pick(profile, 'patientNumber', 'reference') || (profile.id ? `#${profile.id}` : null)}</Detail>
            <Detail label="With DiGi since">{formatDay(profile.createdAt)}</Detail>
            <Detail label="Payment">{isHmo(profile) ? `HMO — ${pick(profile, 'hmoName', 'organisationName') || 'covered'}` : 'Pay per visit'}</Detail>
            {isHmo(profile) && <Detail label="HMO member ID">{pick(profile, 'hmoMemberId', 'memberId')}</Detail>}
          </div>
          <p className={s.hint}>To change your name or HMO details, send a message to Support.</p>
        </div>
      </div>

      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.cardHeader}><h3>Contact &amp; home address</h3></div>
        <div className={s.cardBody}>
          <div className={s.formGrid}>
            {field('phoneNumber', 'Phone *', { type: 'tel' })}
            {field('email', 'Email', { type: 'email' })}
            {field('dateOfBirth', 'Date of birth', { type: 'date', max: toISODate(new Date()) })}
            {select('gender', 'Sex', [['FEMALE', 'Female'], ['MALE', 'Male']])}
            {field('address', 'Home address *', { full: true, area: true, placeholder: 'House number, street, estate' })}
            {field('area', 'Area / LGA', { placeholder: 'e.g. Surulere' })}
            {field('landmark', 'Landmark or directions', { placeholder: 'e.g. Opposite the First Bank, blue gate' })}
          </div>
        </div>
      </div>

      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.cardHeader}><h3>Emergency contact</h3><span className={s.muted} style={{ fontSize: 12 }}>Who we call if we can’t reach you</span></div>
        <div className={s.cardBody}>
          <div className={s.formGrid}>
            {field('nokName', 'Name')}
            {field('nokRelationship', 'Relationship', { placeholder: 'e.g. Daughter' })}
            {field('nokPhone', 'Phone', { type: 'tel' })}
          </div>
        </div>
      </div>

      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.cardHeader}><h3>Health information</h3><span className={s.muted} style={{ fontSize: 12 }}>Shared only with your care team</span></div>
        <div className={s.cardBody}>
          <div className={s.formGrid}>
            {select('bloodGroup', 'Blood group', BLOOD_GROUPS)}
            {select('genotype', 'Genotype', GENOTYPES)}
            {field('allergies', 'Allergies', { full: true, placeholder: 'e.g. Penicillin, peanuts — separate with commas', hint: 'Include medicines you react to. Leave empty if none.' })}
            {field('conditions', 'Long-term conditions', { full: true, placeholder: 'e.g. Hypertension, Type 2 diabetes' })}
            {field('medications', 'Medicines you take regularly', { full: true, placeholder: 'e.g. Amlodipine 5mg daily' })}
            {field('doctor', 'Your usual doctor or hospital', { full: true })}
          </div>
        </div>
      </div>

      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.cardHeader}><h3>Reminders</h3></div>
        <div className={s.cardBody} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label className={s.checkRow}><input type="checkbox" checked={form.sms} onChange={set('sms')} /> Text message (SMS) reminders before visits</label>
          <label className={s.checkRow}><input type="checkbox" checked={form.whatsapp} onChange={set('whatsapp')} /> WhatsApp updates about bookings and results</label>
          <label className={s.checkRow}><input type="checkbox" checked={form.emailPref} onChange={set('emailPref')} /> Email copies of reports and receipts</label>
        </div>
      </div>

      <div className={s.modalActions} style={{ marginTop: 0 }}>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  );
}

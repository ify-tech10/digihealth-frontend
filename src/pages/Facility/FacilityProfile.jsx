import { useState } from 'react';
import Toast from '../../components/Toast/Toast';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { NIGERIAN_BANKS } from '../../config/banks';
import { formatDay, pick } from '../../utils/format';
import { Detail } from '../Admin/components/Common';
import { useFacility } from './useFacility';
import s from '../Admin/admin.module.css';

const splitAreas = (v) => v.split(',').map((a) => a.trim()).filter(Boolean);
const masked = (acct) => (acct ? `•••••• ${String(acct).slice(-4)}` : '');

/* Facility details, whether we're taking new work, and where DiGi pays invoices. */
export default function FacilityProfile() {
  const { kind, words, api } = useFacility();
  usePageHeader('Facility Profile', 'Your details, availability and payout account');
  const { toast, showToast, clearToast } = useToast();
  const { data, loading, error, reload } = useApi(() => api.profile(), `fac-profile-${kind}`);

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      {loading ? (
        <div className={s.card}><div className={s.emptyBlock}>Loading…</div></div>
      ) : (
        <ProfileForm key={data ? 'loaded' : 'empty'} profile={data || {}} loadError={error} kind={kind} words={words} api={api} onSaved={() => { showToast('success', 'Profile saved.'); reload(); }} onError={(m) => showToast('error', m)} />
      )}
    </>
  );
}

function ProfileForm({ profile, loadError, kind, words, api, onSaved, onError }) {
  const hospital = kind === 'HOSPITAL';
  const lab = kind === 'LAB';
  const noun = { HOSPITAL: 'hospital', PHARMACY: 'pharmacy', LAB: 'laboratory' }[kind];
  const [form, setForm] = useState({
    contactPerson: pick(profile, 'contactPerson', 'contactName') || '',
    phoneNumber: pick(profile, 'phoneNumber', 'phone') || '',
    email: profile.email || '',
    openingHours: profile.openingHours || '',
    accepting: profile.acceptingRequests !== false,
    bedsAvailable: profile.bedsAvailable != null ? String(profile.bedsAvailable) : '',
    deliveryAreas: Array.isArray(profile.deliveryAreas) ? profile.deliveryAreas.join(', ') : profile.deliveryAreas || '',
    homeCollection: profile.homeCollection !== false,
    collectionAreas: Array.isArray(profile.collectionAreas) ? profile.collectionAreas.join(', ') : profile.collectionAreas || '',
    bankName: profile.bankName || '',
    accountName: profile.accountName || '',
    accountNumber: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const x = {};
    if (!/^\+?[0-9 ()-]{7,}$/.test(form.phoneNumber.trim())) x.phoneNumber = 'Enter a valid phone number';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) x.email = 'Enter a valid email';
    if (form.bedsAvailable && (!Number.isInteger(Number(form.bedsAvailable)) || Number(form.bedsAvailable) < 0)) x.bedsAvailable = 'Whole number';
    if (form.accountNumber && !/^\d{10}$/.test(form.accountNumber)) x.accountNumber = 'NUBAN account numbers have 10 digits';
    if (form.accountNumber && !form.bankName) x.bankName = 'Choose the bank';
    if (form.accountNumber && !form.accountName.trim()) x.accountName = 'Enter the account name';
    setErrors(x);
    if (Object.keys(x).length) return;
    setBusy(true);
    try {
      await api.updateProfile({
        contactPerson: form.contactPerson.trim() || undefined,
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim() || undefined,
        openingHours: form.openingHours.trim() || undefined,
        acceptingRequests: form.accepting,
        ...(hospital && { bedsAvailable: form.bedsAvailable === '' ? undefined : Number(form.bedsAvailable) }),
        ...(kind === 'PHARMACY' && { deliveryAreas: splitAreas(form.deliveryAreas) }),
        ...(lab && { homeCollection: form.homeCollection, collectionAreas: form.homeCollection ? splitAreas(form.collectionAreas) : [] }),
        ...(form.accountNumber ? { bankName: form.bankName, accountName: form.accountName.trim(), accountNumber: form.accountNumber } : {}),
      });
      onSaved();
    } catch (err) {
      onError(`Couldn’t save: ${err.message}`);
      setBusy(false);
    }
  }

  const field = (k, label, props = {}) => (
    <div className={s.field}>
      <label htmlFor={`fp-${k}`}>{label}</label>
      <input id={`fp-${k}`} value={form[k]} onChange={set(k)} {...props} />
      {errors[k] && <span className={s.fieldError}>{errors[k]}</span>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate>
      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.cardHeader}><h3>{pick(profile, 'name', 'hospitalName', 'pharmacyName', 'laboratoryName') || `Your ${noun}`}</h3></div>
        <div className={s.cardBody}>
          {loadError && <p className={s.fieldError} style={{ marginBottom: 12 }}>Couldn’t load your profile: {loadError}</p>}
          <div className={s.details}>
            <Detail label="Address" full>{[profile.address, pick(profile, 'areaLga', 'locationArea')].filter(Boolean).join(', ') || '—'}</Detail>
            {hospital && <Detail label="Type">{profile.type}</Detail>}
            {hospital && <Detail label="Bed capacity">{profile.bedCapacity}</Detail>}
            {kind === 'PHARMACY' && <Detail label="NAFDAC / PCN reg.">{profile.nafdacRegNo}</Detail>}
            {lab && <Detail label="MLSCN reg.">{pick(profile, 'mlscnRegNo', 'registrationNumber')}</Detail>}
            {lab && <Detail label="Accreditation">{profile.accreditation}</Detail>}
            <Detail label="Partner since">{formatDay(profile.createdAt)}</Detail>
          </div>
          <p className={s.hint}>To change the name or address, contact your DiGi Health relationship manager.</p>
        </div>
      </div>

      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.cardHeader}><h3>Availability</h3></div>
        <div className={s.cardBody}>
          <label className={s.checkRow} style={{ marginBottom: 14 }}>
            <input type="checkbox" checked={form.accepting} onChange={set('accepting')} />
            Accepting new {words.requests} from DiGi Health
          </label>
          {lab && (
            <label className={s.checkRow} style={{ marginBottom: 14 }}>
              <input type="checkbox" checked={form.homeCollection} onChange={set('homeCollection')} />
              We send staff to collect samples at the patient’s home
            </label>
          )}
          <div className={s.formGrid}>
            {hospital && field('bedsAvailable', 'Beds available right now', { type: 'number', min: 0 })}
            {kind === 'PHARMACY' && field('deliveryAreas', 'Areas you deliver to', { placeholder: 'e.g. Lekki, Victoria Island, Ikoyi' })}
            {lab && form.homeCollection && field('collectionAreas', 'Areas you collect from', { placeholder: 'e.g. Yaba, Surulere, Ikeja' })}
            {field('openingHours', 'Opening hours', { placeholder: hospital ? 'e.g. 24 hours' : lab ? 'e.g. Mon–Sat 7AM – 6PM' : 'e.g. 8AM – 10PM' })}
          </div>
        </div>
      </div>

      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.cardHeader}><h3>Contact</h3></div>
        <div className={s.cardBody}>
          <div className={s.formGrid}>
            {field('contactPerson', 'Contact person')}
            {field('phoneNumber', 'Phone', { type: 'tel' })}
            {field('email', 'Email', { type: 'email' })}
          </div>
        </div>
      </div>

      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.cardHeader}><h3>Payout account</h3><span className={s.muted} style={{ fontSize: 12 }}>Where DiGi pays your invoices</span></div>
        <div className={s.cardBody}>
          {profile.bankName && <p className={s.hint} style={{ marginBottom: 12 }}>Current: {profile.bankName} {masked(pick(profile, 'accountNumber', 'maskedAccountNumber'))}{profile.accountName ? ` · ${profile.accountName}` : ''}. Fill in below only to change it.</p>}
          <div className={s.formGrid}>
            <div className={s.field}>
              <label htmlFor="fp-bank">Bank</label>
              <select id="fp-bank" value={form.bankName} onChange={set('bankName')}>
                <option value="">Select…</option>
                {NIGERIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {errors.bankName && <span className={s.fieldError}>{errors.bankName}</span>}
            </div>
            {field('accountNumber', 'Account number', { inputMode: 'numeric', maxLength: 10, placeholder: '10 digits' })}
            {field('accountName', 'Account name')}
          </div>
        </div>
      </div>

      <div className={s.modalActions} style={{ marginTop: 0 }}>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  );
}

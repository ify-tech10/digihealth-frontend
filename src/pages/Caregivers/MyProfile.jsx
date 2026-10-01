import { useState } from 'react';
import Toast from '../../components/Toast/Toast';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { providerApi } from '../../Api/providerApi';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useAuth } from '../../context/useAuth';
import { NIGERIAN_BANKS } from '../../config/banks';
import { LOCATION_GROUPS } from '../../config/locations';
import { humanize, pick } from '../../utils/format';
import { Detail } from '../Admin/components/Common';
import s from '../Admin/admin.module.css';
import p from './Provider.module.css';

/* Show only the last 4 digits of anything already on file. */
const masked = (v) => (v ? `•••••••${String(v).slice(-4)}` : null);

export default function MyProfile() {
  usePageHeader('My Profile', 'Contact details and where we pay you');
  const { toast, showToast, clearToast } = useToast();
  const { data, loading, error, reload } = useApi(() => providerApi.profile(), 'p-profile');

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      {loading ? (
        <div className={`${s.card} ${s.emptyBlock}`}>Loading…</div>
      ) : (
        <ProfileForm
          profile={data || {}}
          loadError={error}
          onSaved={() => { showToast('success', 'Profile updated.'); reload(); }}
        />
      )}
    </>
  );
}

function ProfileForm({ profile, loadError, onSaved }) {
  const { user } = useAuth();
  const [contact, setContact] = useState({
    phoneNumber: profile.phoneNumber || '',
    address: profile.address || '',
    locationArea: profile.locationArea || '',
  });
  /* Sensitive fields start empty; only sent if the provider types a new value. */
  const [bank, setBank] = useState({
    bankName: pick(profile, 'bankName') || '',
    accountName: pick(profile, 'accountName') || '',
    accountNumber: '',
    bvn: '',
    nin: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const setC = (f) => (e) => setContact((v) => ({ ...v, [f]: e.target.value }));
  const setB = (f, digitsOnly) => (e) =>
    setBank((v) => ({ ...v, [f]: digitsOnly ? e.target.value.replace(/\D/g, '') : e.target.value }));

  const onFile = {
    accountNumber: masked(pick(profile, 'accountNumber', 'maskedAccountNumber')),
    bvn: masked(pick(profile, 'bvn', 'maskedBvn')),
    nin: masked(pick(profile, 'nin', 'maskedNin')),
  };

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!contact.phoneNumber.trim()) errs.phoneNumber = 'Phone is required';
    if (bank.accountNumber && bank.accountNumber.length !== 10) errs.accountNumber = 'NUBAN account numbers have 10 digits';
    if (bank.bvn && bank.bvn.length !== 11) errs.bvn = 'BVN has 11 digits';
    if (bank.nin && bank.nin.length !== 11) errs.nin = 'NIN has 11 digits';
    if (bank.accountNumber && !bank.bankName) errs.bankName = 'Choose the bank for this account';
    if (bank.accountNumber && !bank.accountName.trim()) errs.accountName = 'Enter the account name';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const body = {
      phoneNumber: contact.phoneNumber.trim(),
      address: contact.address.trim() || null,
      locationArea: contact.locationArea || null,
      bankName: bank.bankName || null,
      accountName: bank.accountName.trim() || null,
      ...(bank.accountNumber ? { accountNumber: bank.accountNumber } : {}),
      ...(bank.bvn ? { bvn: bank.bvn } : {}),
      ...(bank.nin ? { nin: bank.nin } : {}),
    };

    setBusy(true);
    try {
      await providerApi.updateProfile(body);
      setBank((v) => ({ ...v, accountNumber: '', bvn: '', nin: '' }));
      onSaved();
    } catch (err) {
      const fieldErrors = err.data?.validationErrors || err.data?.errors;
      setErrors(fieldErrors && typeof fieldErrors === 'object' ? fieldErrors : { general: err.message });
    } finally {
      setBusy(false);
    }
  }

  const fieldErr = (f) => errors[f] && <span className={s.fieldError}>{errors[f]}</span>;
  const payoutReady = Boolean((onFile.accountNumber || bank.accountNumber) && (onFile.bvn || bank.bvn));

  return (
    <form onSubmit={submit} noValidate>
      {loadError && <p className={s.fieldError} style={{ marginBottom: 12 }}>Couldn't load your saved profile ({loadError}).</p>}
      {errors.general && <p className={s.fieldError} style={{ marginBottom: 12 }}>{errors.general}</p>}

      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Personal details</h3></div>
          <div className={s.cardBody}>
            <div className={s.details}>
              <Detail label="Name">{pick(profile, 'fullName', 'name') || user?.name}</Detail>
              <Detail label="Email">{profile.email || user?.email}</Detail>
              <Detail label="Role">{humanize(pick(profile, 'serviceProviderType', 'role') || user?.role)}</Detail>
              <Detail label="Status"><StatusBadge status={profile.status || 'ACTIVE'} /></Detail>
            </div>
            <p className={s.muted} style={{ fontSize: 12, marginBottom: 14 }}>To change your name or email, contact an admin.</p>

            <div className={s.formGrid}>
              <div className={s.field}>
                <label htmlFor="pf-phone">Phone <span className={s.req}>*</span></label>
                <input id="pf-phone" type="tel" value={contact.phoneNumber} onChange={setC('phoneNumber')} />
                {fieldErr('phoneNumber')}
              </div>
              <div className={s.field}>
                <label htmlFor="pf-area">Home area</label>
                <select id="pf-area" value={contact.locationArea} onChange={setC('locationArea')}>
                  <option value="">Not specified</option>
                  {LOCATION_GROUPS.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className={`${s.field} ${s.full}`}>
                <label htmlFor="pf-address">Address</label>
                <input id="pf-address" value={contact.address} onChange={setC('address')} />
              </div>
            </div>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3>Bank & identity</h3>
            <StatusBadge status={payoutReady ? 'ACTIVE' : 'PENDING'} />
          </div>
          <div className={s.cardBody}>
            <p className={s.hint} style={{ marginBottom: 14 }}>
              {payoutReady ? 'Payouts go to this account.' : 'Add your account number and BVN to receive payouts.'} Numbers already on file are hidden — type a new one only to change it.
            </p>
            <div className={s.formGrid}>
              <div className={s.field}>
                <label htmlFor="pf-bank">Bank</label>
                <select id="pf-bank" value={bank.bankName} onChange={setB('bankName')}>
                  <option value="">Select bank</option>
                  {NIGERIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                {fieldErr('bankName')}
              </div>
              <div className={s.field}>
                <label htmlFor="pf-acct">Account number</label>
                <input id="pf-acct" inputMode="numeric" maxLength={10} autoComplete="off" value={bank.accountNumber} onChange={setB('accountNumber', true)} placeholder={onFile.accountNumber ? 'Enter to change' : '10 digits'} />
                {onFile.accountNumber && <span className={p.onFile}>On file: <strong>{onFile.accountNumber}</strong></span>}
                {fieldErr('accountNumber')}
              </div>
              <div className={`${s.field} ${s.full}`}>
                <label htmlFor="pf-aname">Account name</label>
                <input id="pf-aname" value={bank.accountName} onChange={setB('accountName')} placeholder="As shown by your bank" />
                {fieldErr('accountName')}
              </div>
              <div className={s.field}>
                <label htmlFor="pf-bvn">BVN</label>
                <input id="pf-bvn" inputMode="numeric" maxLength={11} autoComplete="off" value={bank.bvn} onChange={setB('bvn', true)} placeholder={onFile.bvn ? 'Enter to change' : '11 digits'} />
                {onFile.bvn && <span className={p.onFile}>On file: <strong>{onFile.bvn}</strong></span>}
                {fieldErr('bvn')}
              </div>
              <div className={s.field}>
                <label htmlFor="pf-nin">NIN</label>
                <input id="pf-nin" inputMode="numeric" maxLength={11} autoComplete="off" value={bank.nin} onChange={setB('nin', true)} placeholder={onFile.nin ? 'Enter to change' : '11 digits'} />
                {onFile.nin && <span className={p.onFile}>On file: <strong>{onFile.nin}</strong></span>}
                {fieldErr('nin')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.modalActions} style={{ marginTop: 0 }}>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
      </div>
    </form>
  );
}

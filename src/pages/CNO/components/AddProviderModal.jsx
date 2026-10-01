import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import { cnoApi } from '../../../Api/cnoApi';
import { LOCATION_GROUPS } from '../../../config/locations';
import { PROVIDER_TYPES } from '../../../config/userRoles';
import s from '../../Admin/admin.module.css';

/* Supervisors can create doctors, nurses and caregivers directly. */
export default function AddProviderModal({ open, onClose, onCreated }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Add provider" size="large">
      {open && <AddProviderForm onClose={onClose} onCreated={onCreated} />}
    </Modal>
  );
}

const EMPTY = { fullName: '', email: '', phoneNumber: '', serviceProviderType: '', locationArea: '' };

function AddProviderForm({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email';
    if (!form.phoneNumber.trim()) errs.phoneNumber = 'Phone is required';
    if (!form.serviceProviderType) errs.serviceProviderType = 'Choose the provider type';
    if (!form.locationArea) errs.locationArea = 'Choose their main area';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const body = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phoneNumber: form.phoneNumber.trim(),
      serviceProviderType: form.serviceProviderType,
      locationArea: form.locationArea,
      role: 'SERVICE_PROVIDER',
    };
    setBusy(true);
    try {
      await cnoApi.createProvider(body);
      onCreated(`${body.fullName} added. Login details were sent to ${body.email}.`);
    } catch (err) {
      const fieldErrors = err.data?.validationErrors || err.data?.errors;
      setErrors(fieldErrors && typeof fieldErrors === 'object' ? fieldErrors : { general: err.message });
      setBusy(false);
    }
  }

  const fieldErr = (f) => errors[f] && <span className={s.fieldError}>{errors[f]}</span>;

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint} style={{ marginBottom: 12 }}>
        The provider is approved straight away and receives login details by email. Use this for staff you have already vetted.
      </p>
      {errors.general && <p className={s.fieldError} style={{ marginBottom: 12 }}>{errors.general}</p>}
      <div className={s.formGrid}>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="ap-name">Full name <span className={s.req}>*</span></label>
          <input id="ap-name" value={form.fullName} onChange={set('fullName')} />
          {fieldErr('fullName')}
        </div>
        <div className={s.field}>
          <label htmlFor="ap-email">Email <span className={s.req}>*</span></label>
          <input id="ap-email" type="email" value={form.email} onChange={set('email')} />
          {fieldErr('email')}
        </div>
        <div className={s.field}>
          <label htmlFor="ap-phone">Phone <span className={s.req}>*</span></label>
          <input id="ap-phone" type="tel" value={form.phoneNumber} onChange={set('phoneNumber')} placeholder="+234…" />
          {fieldErr('phoneNumber')}
        </div>
        <div className={s.field}>
          <label htmlFor="ap-type">Provider type <span className={s.req}>*</span></label>
          <select id="ap-type" value={form.serviceProviderType} onChange={set('serviceProviderType')}>
            <option value="">Select type</option>
            {PROVIDER_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {fieldErr('serviceProviderType')}
        </div>
        <div className={s.field}>
          <label htmlFor="ap-area">Main area <span className={s.req}>*</span></label>
          <select id="ap-area" value={form.locationArea} onChange={set('locationArea')}>
            <option value="">Select area</option>
            {LOCATION_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </optgroup>
            ))}
          </select>
          {fieldErr('locationArea')}
        </div>
      </div>
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Adding…' : 'Add provider'}</button>
      </div>
    </form>
  );
}

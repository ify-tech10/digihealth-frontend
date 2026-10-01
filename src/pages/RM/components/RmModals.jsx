import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import StatusBadge from '../../../components/StatusBadge/StatusBadge';
import Icon from '../../../components/Icon/Icon';
import { rmApi } from '../../../Api/rmApi';
import { LOCATION_GROUPS } from '../../../config/locations';
import { formatDay, humanize, pick } from '../../../utils/format';
import { Detail } from '../../Admin/components/Common';
import { FACILITY_FORMS } from '../facilityConfig';
import {
  COMPANY_SIZES, SIZE_LABEL, TYPE_LABEL, facilityStatus, hmoStatus, isConfirmed, listText, orgEmail, orgName, splitList,
} from '../rmFields';
import s from '../../Admin/admin.module.css';
import r from '../Rm.module.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ()-]{7,}$/;
const AREAS = LOCATION_GROUPS.flatMap((g) => g.options.map(([, label]) => label));

/* Field errors from Spring's validationErrors, whatever shape they come in. */
function serverErrors(err) {
  const v = err?.data?.validationErrors || err?.data?.errors;
  if (!v) return null;
  if (Array.isArray(v)) return Object.fromEntries(v.map((e) => [e.field || e.property, e.message || e.defaultMessage]));
  return typeof v === 'object' ? v : null;
}

/* ── Step 1: which kind of facility ── */
export function FacilityOnboarding({ open, onClose, onCreated }) {
  const [kind, setKind] = useState(null);
  const close = () => { setKind(null); onClose(); };
  return (
    <Modal isOpen={open} onClose={close} title={kind ? `Onboard ${FACILITY_FORMS[kind].title.toLowerCase()}` : 'Onboard a facility'} size={kind ? 'large' : 'medium'}>
      {open && !kind && (
        <div className={r.picker}>
          {[
            ['HOSPITAL', 'home', 'Hospital', 'Referrals and admissions'],
            ['PHARMACY', 'plusHouse', 'Pharmacy', 'Drug purchase and home delivery'],
            ['LAB', 'flask', 'Laboratory', 'Tests and diagnostics'],
          ].map(([k, icon, label, sub]) => (
            <button key={k} type="button" className={r.pick} onClick={() => setKind(k)}>
              <span className={r.pickIcon}><Icon name={icon} /></span>
              <span><strong>{label}</strong><small>{sub}</small></span>
              <Icon name="chevronRight" />
            </button>
          ))}
          <p className={s.hint}>The facility’s admin gets login details at the email you enter, so they can receive requests and send invoices.</p>
        </div>
      )}
      {open && kind && (
        <FacilityForm
          key={kind}
          kind={kind}
          onBack={() => setKind(null)}
          onCreated={(name) => { setKind(null); onCreated(name, kind); }}
        />
      )}
    </Modal>
  );
}

function FacilityForm({ kind, onBack, onCreated }) {
  const cfg = FACILITY_FORMS[kind];
  const [form, setForm] = useState(() => Object.fromEntries(cfg.fields.map((f) => [f.key, f.type === 'checks' ? [] : f.initial ?? ''])));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  const set = (k) => (e) => setForm((v) => ({ ...v, [k]: e.target.value }));
  const toggle = (k, opt) => setForm((v) => ({ ...v, [k]: v[k].includes(opt) ? v[k].filter((x) => x !== opt) : [...v[k], opt] }));

  async function submit(e) {
    e.preventDefault();
    const x = {};
    cfg.fields.forEach((f) => {
      const val = form[f.key];
      if (f.required && !String(val).trim()) x[f.key] = `${f.label} is required`;
    });
    if (form.email && !EMAIL.test(form.email.trim())) x.email = 'Enter a valid email';
    if (form.phoneNumber && !PHONE.test(form.phoneNumber.trim())) x.phoneNumber = 'Enter a valid phone number';
    if (form.bedCapacity && (Number(form.bedCapacity) < 0 || !Number.isInteger(Number(form.bedCapacity)))) x.bedCapacity = 'Whole number';
    setErrors(x);
    if (Object.keys(x).length) return;

    const body = Object.fromEntries(cfg.fields.map((f) => {
      const val = form[f.key];
      if (f.type === 'list') return [f.key, splitList(val)];
      if (f.type === 'checks') return [f.key, val];
      if (f.type === 'number') return [f.key, parseInt(val, 10) || 0];
      return [f.key, String(val).trim()];
    }));

    setBusy(true);
    setFailure('');
    try {
      await cfg.create(body);
      onCreated(body[cfg.nameKey]);
    } catch (err) {
      const fe = serverErrors(err);
      if (fe) setErrors(fe);
      setFailure(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <datalist id="rm-areas">{AREAS.map((a) => <option key={a} value={a} />)}</datalist>
      <div className={s.formGrid}>
        {cfg.fields.map((f) => {
          const id = `fac-${f.key}`;
          const label = <>{f.label}{f.required && <span className={s.req}> *</span>}</>;
          const err = errors[f.key] && <span className={s.fieldError}>{errors[f.key]}</span>;
          if (f.type === 'checks') {
            return (
              <fieldset key={f.key} className={`${s.field} ${s.full}`} style={{ border: 'none' }}>
                <legend style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>{f.label}</legend>
                <div className={r.checks}>
                  {f.options.map((opt) => (
                    <label key={opt} className={s.checkRow}>
                      <input type="checkbox" checked={form[f.key].includes(opt)} onChange={() => toggle(f.key, opt)} />
                      {f.optionLabels?.[opt] || opt}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          }
          return (
            <div key={f.key} className={`${s.field} ${f.full ? s.full : ''}`}>
              <label htmlFor={id}>{label}</label>
              {f.type === 'select' ? (
                <select id={id} value={form[f.key]} onChange={set(f.key)}>
                  {!f.initial && <option value="">Select…</option>}
                  {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea id={id} value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder} />
              ) : (
                <input
                  id={id}
                  type={f.type === 'list' ? 'text' : f.type || 'text'}
                  min={f.type === 'number' ? 0 : undefined}
                  list={f.area ? 'rm-areas' : undefined}
                  value={form[f.key]}
                  onChange={set(f.key)}
                  placeholder={f.placeholder}
                />
              )}
              {err}
            </div>
          );
        })}
      </div>
      {failure && <p className={s.fieldError} style={{ marginTop: 12 }}>Couldn’t onboard the {cfg.title.toLowerCase()}: {failure}</p>}
      <div className={s.modalActions} style={{ justifyContent: 'space-between' }}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onBack}><Icon name="chevronLeft" /> Back</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : `Onboard ${cfg.title.toLowerCase()}`}</button>
      </div>
    </form>
  );
}

/* ── One facility ── */
export function FacilityModal({ facility, onClose }) {
  const cfg = facility ? FACILITY_FORMS[facility.kind] : null;
  return (
    <Modal isOpen={!!facility} onClose={onClose} title={facility ? facility.displayName : ''} size="large">
      {facility && (
        <div className={s.details}>
          <Detail label="Type">{TYPE_LABEL[facility.kind]}{facility.type && facility.kind === 'HOSPITAL' ? ` · ${facility.type}` : ''}</Detail>
          <Detail label="Status"><StatusBadge status={facilityStatus(facility)} /></Detail>
          <Detail label="Onboarded">{formatDay(facility.createdAt)}</Detail>
          {cfg.fields
            .filter((f) => f.key !== cfg.nameKey && f.key !== 'status' && f.key !== 'type')
            .map((f) => {
              const v = facility[f.key];
              const text = Array.isArray(v) ? listText(v.map((x) => f.optionLabels?.[x] || x)) : f.key === 'emergencyUnit' && v === 'YES_24_7' ? 'Yes — 24/7' : v;
              return <Detail key={f.key} label={f.label} full={f.full}>{text === '' || text == null ? '—' : String(text)}</Detail>;
            })}
        </div>
      )}
    </Modal>
  );
}

/* ── Onboard an organisation into the HMO ── */
export function OrgOnboarding({ open, onClose, onCreated }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Onboard organisation" size="large">
      {open && <OrgForm onClose={onClose} onCreated={onCreated} />}
    </Modal>
  );
}

function OrgForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ companyName: '', industry: '', hrContactName: '', email: '', phoneNumber: '', companySize: '', startDate: '', companyAddress: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const set = (k) => (e) => setForm((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const x = {};
    if (!form.companyName.trim()) x.companyName = 'Organisation name is required';
    if (!form.hrContactName.trim()) x.hrContactName = 'Who is the HR contact?';
    if (!EMAIL.test(form.email.trim())) x.email = 'Enter a valid email — the HMO admin login goes here';
    if (!PHONE.test(form.phoneNumber.trim())) x.phoneNumber = 'Enter a valid phone number';
    if (!form.companySize) x.companySize = 'Pick a size';
    if (!form.companyAddress.trim()) x.companyAddress = 'Address is required';
    setErrors(x);
    if (Object.keys(x).length) return;
    setBusy(true);
    setFailure('');
    try {
      await rmApi.onboardOrganisation({
        companyName: form.companyName.trim(),
        companyAddress: form.companyAddress.trim(),
        phoneNumber: form.phoneNumber.trim(),
        companySize: form.companySize,
        industry: form.industry.trim() || 'Other',
        hrContactName: form.hrContactName.trim(),
        email: form.email.trim(),
        startDate: form.startDate || undefined,
      });
      onCreated(form.companyName.trim());
    } catch (err) {
      const fe = serverErrors(err);
      if (fe) setErrors(fe);
      setFailure(err.message);
      setBusy(false);
    }
  }

  const field = (k, label, props = {}, full = false) => (
    <div className={`${s.field} ${full ? s.full : ''}`}>
      <label htmlFor={`org-${k}`}>{label}</label>
      <input id={`org-${k}`} value={form[k]} onChange={set(k)} {...props} />
      {errors[k] && <span className={s.fieldError}>{errors[k]}</span>}
    </div>
  );

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint} style={{ marginBottom: 14 }}>The admin reviews the application; once approved, the HR contact gets an HMO admin login to upload employees.</p>
      <div className={s.formGrid}>
        {field('companyName', <>Organisation name <span className={s.req}>*</span></>, { placeholder: 'e.g. Acme Corp Ltd' }, true)}
        {field('industry', 'Industry', { placeholder: 'e.g. Finance, Tech, Education' })}
        <div className={s.field}>
          <label htmlFor="org-size">Company size <span className={s.req}>*</span></label>
          <select id="org-size" value={form.companySize} onChange={set('companySize')}>
            <option value="">Select…</option>
            {COMPANY_SIZES.map(([v, l]) => <option key={v} value={v}>{l} staff</option>)}
          </select>
          {errors.companySize && <span className={s.fieldError}>{errors.companySize}</span>}
        </div>
        {field('hrContactName', <>HR contact person <span className={s.req}>*</span></>, { placeholder: 'Full name' })}
        {field('email', <>Contact email <span className={s.req}>*</span></>, { type: 'email', placeholder: 'hr@company.com' })}
        {field('phoneNumber', <>Phone <span className={s.req}>*</span></>, { type: 'tel', placeholder: '+234 XXX XXX XXXX' })}
        {field('startDate', 'Preferred start date', { type: 'date' })}
        {field('companyAddress', <>Address <span className={s.req}>*</span></>, { placeholder: 'e.g. 12 Marina Street, Lagos Island' }, true)}
      </div>
      {failure && <p className={s.fieldError} style={{ marginTop: 12 }}>Couldn’t onboard the organisation: {failure}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Onboard organisation'}</button>
      </div>
    </form>
  );
}

/* ── An organisation's HMO details ── */
export function OrgHmoModal({ org, busy, onClose, onConfirm }) {
  return (
    <Modal isOpen={!!org} onClose={onClose} title={org ? `${orgName(org)} — HMO details` : ''}>
      {org && (
        <>
          <div className={s.details}>
            <Detail label="HMO status"><StatusBadge status={hmoStatus(org)} /></Detail>
            <Detail label="Plan">{pick(org, 'hmoPlan', 'planName')}</Detail>
            <Detail label="Members">{pick(org, 'memberCount', 'members')}</Detail>
            <Detail label="Expiry">{formatDay(pick(org, 'hmoExpiry', 'expiryDate'))}</Detail>
            <Detail label="Contact email">{orgEmail(org)}</Detail>
            <Detail label="HR contact">{pick(org, 'hrContactName', 'contactPerson')}</Detail>
            <Detail label="Phone">{pick(org, 'phoneNumber', 'phone')}</Detail>
            <Detail label="Industry">{humanize(org.industry)}</Detail>
            <Detail label="Size">{SIZE_LABEL[org.companySize] ? `${SIZE_LABEL[org.companySize]} staff` : humanize(org.companySize)}</Detail>
            <Detail label="Onboarded">{formatDay(org.createdAt)}</Detail>
            {pick(org, 'companyAddress', 'address') && <Detail label="Address" full>{pick(org, 'companyAddress', 'address')}</Detail>}
          </div>
          {!isConfirmed(org) && (
            <div className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} disabled={busy} onClick={() => onConfirm(org)}>
                {busy ? 'Confirming…' : 'Confirm HMO'}
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

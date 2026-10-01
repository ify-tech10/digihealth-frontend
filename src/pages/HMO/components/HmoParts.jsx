import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../../components/Modal/Modal';
import StatusBadge from '../../../components/StatusBadge/StatusBadge';
import Icon from '../../../components/Icon/Icon';
import { hmoApi } from '../../../Api/hmoApi';
import { COVERED_SERVICES } from '../../../config/userRoles';
import { formatDay, formatMoney, humanize, pick } from '../../../utils/format';
import { Detail } from '../../Admin/components/Common';
import {
  consentDone, daysLeft, employeeName, employeeStatus, employeeUsed, expiryOf, limitOf, nextOfKinDone, usedOf,
} from '../hmoFields';
import s from '../../Admin/admin.module.css';
import h from '../Hmo.module.css';

const SERVICE = Object.fromEntries(COVERED_SERVICES);
const servicesOf = (sub) => {
  const v = pick(sub, 'coveredServices', 'services');
  return Array.isArray(v) ? v : typeof v === 'string' ? v.split(',').map((x) => x.trim()).filter(Boolean) : [];
};

/* ── The organisation's plan: benefit used, expiry, what's covered ── */
export function PlanSummary({ state, compact = false }) {
  if (state.loading) return <div className={s.emptyBlock}>Loading…</div>;
  if (!state.data) {
    return (
      <div className={s.emptyBlock}>
        <Icon name="shield" />
        <p>{state.error ? 'Your plan details are unavailable right now.' : 'No active plan yet — your relationship manager will set one up.'}</p>
      </div>
    );
  }
  const sub = state.data;
  const limit = limitOf(sub);
  const used = usedOf(sub);
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const left = daysLeft(sub);
  const status = String(pick(sub, 'status') || (left != null && left < 0 ? 'EXPIRED' : 'ACTIVE')).toUpperCase();
  const members = pick(sub, 'memberCount', 'members', 'enrolledCount');
  const cap = pick(sub, 'memberLimit', 'maxMembers');

  return (
    <div className={h.plan}>
      <div>
        <div className={h.planName}>{pick(sub, 'planName', 'plan') || 'HMO plan'}</div>
        <div className={h.planOrg}>{pick(sub, 'organisationName', 'companyName')} <StatusBadge status={status} /></div>
      </div>

      {status === 'EXPIRED' || (left != null && left < 0) ? (
        <p className={`${h.notice} ${h.noticeBad}`}>Coverage has expired, so employees can’t book care on the plan. It’s reactivated once the renewal payment is confirmed.</p>
      ) : left != null && left <= 30 ? (
        <p className={`${h.notice} ${h.noticeWarn}`}>Coverage ends in {left} day{left === 1 ? '' : 's'} ({formatDay(expiryOf(sub))}). Renew before then to avoid interruptions.</p>
      ) : null}

      <div>
        <div className={h.usageTop}>
          <span>Benefit used</span>
          <span><strong>{formatMoney(used)}</strong> of {formatMoney(limit)}</span>
        </div>
        <div className={h.track} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Benefit used">
          <div className={h.fill} style={{ width: `${pct}%`, background: pct >= 90 ? '#ef4444' : pct >= 75 ? '#f97316' : '#7c3aed' }} />
        </div>
        {pct >= 90 && <p className={s.hint} style={{ marginTop: 6, color: '#b91c1c' }}>Nearly used up — care beyond the limit is invoiced to the patient.</p>}
      </div>

      <div className={h.facts}>
        <div className={h.fact}><span>Members</span><p>{members ?? '—'}{cap ? ` / ${cap}` : ''}</p></div>
        <div className={h.fact}><span>Remaining</span><p>{formatMoney(Math.max(0, limit - used))}</p></div>
        <div className={h.fact}><span>Started</span><p>{formatDay(pick(sub, 'startDate', 'startsAt'))}</p></div>
        <div className={h.fact}><span>Expires</span><p>{formatDay(expiryOf(sub))}</p></div>
      </div>

      {!compact && servicesOf(sub).length > 0 && (
        <div>
          <div className={h.fact}><span>Covered services</span></div>
          <div className={h.chips}>{servicesOf(sub).map((x) => <span key={x} className={h.chip}>{SERVICE[x] || humanize(x)}</span>)}</div>
        </div>
      )}
      {compact && <Link to="/hmo-dashboard/plans" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} style={{ justifyContent: 'center' }}>Plan details</Link>}
    </div>
  );
}

/* ── Next-of-kin + consent ticks ── */
export function RegistrationChecks({ employee }) {
  const item = (ok, label) => (
    <span className={`${h.check} ${ok ? h.done : h.todo}`}><Icon name={ok ? 'check' : 'clock'} />{label}</span>
  );
  return (
    <span style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap' }}>
      {item(nextOfKinDone(employee), 'Next of kin')}
      {item(consentDone(employee), 'Consent')}
    </span>
  );
}

/* ── One employee ── */
export function EmployeeModal({ employee, busy, onClose, onInvite, onDeactivate }) {
  const st = employee ? employeeStatus(employee) : '';
  return (
    <Modal isOpen={!!employee} onClose={onClose} title={employee ? employeeName(employee) : ''}>
      {employee && (
        <>
          <div className={s.details}>
            <Detail label="Email">{employee.email}</Detail>
            <Detail label="Phone">{pick(employee, 'phone', 'phoneNumber')}</Detail>
            <Detail label="Department">{employee.department}</Detail>
            <Detail label="Staff ID">{pick(employee, 'staffId', 'employeeId')}</Detail>
            <Detail label="Status"><StatusBadge status={st} /></Detail>
            <Detail label="Added">{formatDay(pick(employee, 'createdAt', 'addedAt'))}</Detail>
            <Detail label="Registration" full><RegistrationChecks employee={employee} /></Detail>
            <Detail label="Benefit used this year">{formatMoney(employeeUsed(employee))}</Detail>
            <Detail label="Care requests">{pick(employee, 'requestCount', 'requests') ?? 0}</Detail>
          </div>
          {st === 'PENDING' && (
            <p className={s.hint}>Only the employee can add their next of kin and sign the consent form. Re-send the invite if they haven’t received it.</p>
          )}
          {st !== 'INACTIVE' && (
            <div className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnLarge}`} onClick={() => onDeactivate(employee)}>Remove from plan</button>
              {st === 'PENDING' && (
                <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy} onClick={() => onInvite(employee)}>
                  {busy ? 'Sending…' : 'Re-send invite'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

/* ── Add one employee by hand ── */
export function AddEmployeeModal({ open, onClose, onAdded }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Add employee" size="large">
      {open && <AddEmployeeForm onClose={onClose} onAdded={onAdded} />}
    </Modal>
  );
}

function AddEmployeeForm({ onClose, onAdded }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', department: '', staffId: '', dateOfBirth: '', gender: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const set = (k) => (e) => setForm((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const x = {};
    if (!form.firstName.trim()) x.firstName = 'Required';
    if (!form.lastName.trim()) x.lastName = 'Required';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) x.email = 'Enter a valid email — the invite goes here';
    if (!/^\+?[0-9 ()-]{7,}$/.test(form.phone.trim())) x.phone = 'Enter a valid phone number';
    if (form.dateOfBirth && form.dateOfBirth > new Date().toISOString().slice(0, 10)) x.dateOfBirth = 'Can’t be in the future';
    setErrors(x);
    if (Object.keys(x).length) return;
    setBusy(true);
    setFailure('');
    try {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]));
      await hmoApi.addEmployee(body);
      onAdded(`${form.firstName.trim()} ${form.lastName.trim()} added — an invite is on its way to ${form.email.trim()}.`);
    } catch (err) {
      setFailure(err.message);
      setBusy(false);
    }
  }

  const field = (k, label, props = {}) => (
    <div className={s.field}>
      <label htmlFor={`ae-${k}`}>{label}</label>
      <input id={`ae-${k}`} value={form[k]} onChange={set(k)} {...props} />
      {errors[k] && <span className={s.fieldError}>{errors[k]}</span>}
    </div>
  );

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={s.formGrid}>
        {field('firstName', <>First name <span className={s.req}>*</span></>)}
        {field('lastName', <>Last name <span className={s.req}>*</span></>)}
        {field('email', <>Work email <span className={s.req}>*</span></>, { type: 'email' })}
        {field('phone', <>Phone <span className={s.req}>*</span></>, { type: 'tel', placeholder: '+234…' })}
        {field('department', 'Department')}
        {field('staffId', 'Staff ID')}
        {field('dateOfBirth', 'Date of birth', { type: 'date' })}
        <div className={s.field}>
          <label htmlFor="ae-gender">Gender</label>
          <select id="ae-gender" value={form.gender} onChange={set('gender')}>
            <option value="">—</option>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
          </select>
        </div>
      </div>
      {failure && <p className={s.fieldError} style={{ marginTop: 12 }}>Couldn’t add the employee: {failure}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Adding…' : 'Add employee'}</button>
      </div>
    </form>
  );
}


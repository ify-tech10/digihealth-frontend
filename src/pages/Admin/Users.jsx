import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useAuth } from '../../context/useAuth';
import { LOCATION_GROUPS, locationLabel } from '../../config/locations';
import {
  PATIENT_TYPES, PROVIDER_ROLES, PROVIDER_TYPES, USER_ROLE_GROUPS, roleLabel,
} from '../../config/userRoles';
import { formatDay, humanize, matches, pick } from '../../utils/format';
import { Detail, Person, SearchBox, Tabs } from './components/Common';
import { isActiveRecord } from './components/status';
import s from './admin.module.css';

const STATUS_TABS = [
  ['ACTIVE', 'Active'],
  ['INACTIVE', 'Deactivated'],
  ['ALL', 'All'],
];

const nameOf = (u) => pick(u, 'fullName', 'name') || [u.firstName, u.lastName].filter(Boolean).join(' ');

export default function Users() {
  usePageHeader('Users', 'Create and manage every account on DiGi Health');
  const { user: me } = useAuth();
  const { toast, showToast, clearToast } = useToast();

  const [role, setRole] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [toggleBusy, setToggleBusy] = useState(false);

  const { data, loading, error, reload } = useApi(() => adminApi.users(role || undefined), `users-${role}`);
  const all = asList(data);

  const isMe = (u) =>
    (me?.id != null && String(u.id) === String(me.id)) ||
    (me?.email && u.email && u.email.toLowerCase() === me.email.toLowerCase());

  const rows = all.filter(
    (u) =>
      (status === 'ALL' || (status === 'ACTIVE') === isActiveRecord(u)) &&
      matches(query, nameOf(u), u.email, u.phoneNumber, roleLabel(u.role))
  );

  const activeCount = all.filter(isActiveRecord).length;

  async function confirmToggle() {
    const u = toggling;
    const activate = !isActiveRecord(u);
    setToggleBusy(true);
    try {
      await (activate ? adminApi.activateUser(u.id) : adminApi.deactivateUser(u.id));
      showToast('success', `${nameOf(u)} ${activate ? 'reactivated' : 'deactivated'}.`);
      setToggling(null);
      reload();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setToggleBusy(false);
    }
  }

  const columns = [
    { key: 'name', header: 'Name', render: (u) => <Person name={nameOf(u)} sub={u.email} /> },
    { key: 'role', header: 'Role', render: (u) => (
      <div>{roleLabel(u.role)}{u.serviceProviderType && <div className={s.muted}>{humanize(u.serviceProviderType)}</div>}</div>
    ) },
    { key: 'phone', header: 'Phone', render: (u) => u.phoneNumber || '—' },
    { key: 'created', header: 'Created', render: (u) => formatDay(pick(u, 'createdAt', 'dateCreated')) },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge status={isActiveRecord(u) ? 'ACTIVE' : 'DEACTIVATED'} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (u) => (
        <div className={s.actions}>
          <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(u)}>View</button>
          {!isMe(u) && (
            isActiveRecord(u) ? (
              <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => setToggling(u)}>Deactivate</button>
            ) : (
              <button type="button" className={`${s.btn} ${s.btnApprove}`} onClick={() => setToggling(u)}>Reactivate</button>
            )
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.stats3}>
        <StatCard label={role ? `${roleLabel(role)} accounts` : 'All accounts'} value={loading ? '…' : all.length} icon="users" color="blue" />
        <StatCard label="Active" value={loading ? '…' : activeCount} icon="check" color="green" />
        <StatCard label="Deactivated" value={loading ? '…' : all.length - activeCount} icon="lock" color="red" />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <div className={s.toolbarRight}>
            <Tabs options={STATUS_TABS} value={status} onChange={setStatus} />
            <select className={s.select} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
              <option value="">All roles</option>
              {USER_ROLE_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className={s.toolbarRight}>
            <SearchBox value={query} onChange={setQuery} placeholder="Search name, email, phone…" />
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setCreating(true)}>
              <Icon name="plus" /> Create user
            </button>
          </div>
        </div>
        <DataTable
          key={`${role}-${status}`}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query ? 'No users match your search.' : 'No users here.'}
        />
      </div>

      <Modal isOpen={creating} onClose={() => setCreating(false)} title="Create user" size="large">
        {creating && (
          <CreateUserForm
            onCancel={() => setCreating(false)}
            onCreated={(u) => {
              setCreating(false);
              showToast('success', `${u.fullName} created. Login details were sent to ${u.email}.`);
              reload();
            }}
          />
        )}
      </Modal>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? nameOf(viewing) : ''}>
        {viewing && (
          <div className={s.details}>
            <Detail label="Email">{viewing.email}</Detail>
            <Detail label="Phone">{viewing.phoneNumber}</Detail>
            <Detail label="Role">{roleLabel(viewing.role)}</Detail>
            <Detail label="Provider type">{viewing.serviceProviderType ? humanize(viewing.serviceProviderType) : '—'}</Detail>
            <Detail label="Location">{locationLabel(viewing.locationArea)}</Detail>
            <Detail label="Status"><StatusBadge status={isActiveRecord(viewing) ? 'ACTIVE' : 'DEACTIVATED'} /></Detail>
            <Detail label="Created">{formatDay(pick(viewing, 'createdAt', 'dateCreated'))}</Detail>
            <Detail label="Created by">{pick(viewing, 'createdByName', 'createdBy')}</Detail>
            <Detail label="Last login">{formatDay(pick(viewing, 'lastLoginAt', 'lastLogin'))}</Detail>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!toggling}
        title={toggling && isActiveRecord(toggling) ? 'Deactivate user' : 'Reactivate user'}
        message={
          toggling && isActiveRecord(toggling)
            ? `${nameOf(toggling)} will be signed out and won't be able to log in until reactivated.`
            : `${toggling ? nameOf(toggling) : ''} will be able to log in again.`
        }
        confirmLabel={toggling && isActiveRecord(toggling) ? 'Deactivate' : 'Reactivate'}
        danger={!!toggling && isActiveRecord(toggling)}
        busy={toggleBusy}
        onClose={() => setToggling(null)}
        onConfirm={confirmToggle}
      />
    </>
  );
}

const EMPTY = {
  fullName: '', email: '', phoneNumber: '', role: '',
  serviceProviderType: '', patientType: 'STANDARD', locationArea: '',
};

function CreateUserForm({ onCancel, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.value }));
  const isProvider = PROVIDER_ROLES.includes(form.role);
  const isPatient = form.role === 'PATIENT';

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email';
    if (!form.phoneNumber.trim()) errs.phoneNumber = 'Phone is required';
    if (!form.role) errs.role = 'Choose a role';
    if (isProvider && !form.serviceProviderType) errs.serviceProviderType = 'Choose a provider type';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const body = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phoneNumber: form.phoneNumber.trim(),
      role: form.role,
      locationArea: form.locationArea || null,
      ...(isProvider ? { serviceProviderType: form.serviceProviderType } : {}),
      ...(isPatient ? { patientType: form.patientType } : {}),
    };

    setBusy(true);
    try {
      await adminApi.createUser(body);
      onCreated(body);
    } catch (err) {
      const fieldErrors = err.data?.validationErrors || err.data?.errors;
      setErrors(fieldErrors && typeof fieldErrors === 'object' ? fieldErrors : { general: err.message });
      setBusy(false);
    }
  }

  const fieldErr = (f) => errors[f] && <span className={s.fieldError}>{errors[f]}</span>;

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint}>The user gets an email with their login details and is asked to set a new password.</p>
      {errors.general && <p className={s.fieldError} style={{ margin: '8px 0' }}>{errors.general}</p>}

      <div className={s.formGrid} style={{ marginTop: 12 }}>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="u-role">Role <span className={s.req}>*</span></label>
          <select id="u-role" value={form.role} onChange={set('role')}>
            <option value="">Select role</option>
            {USER_ROLE_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </optgroup>
            ))}
          </select>
          {fieldErr('role')}
        </div>

        {isProvider && (
          <div className={`${s.field} ${s.full}`}>
            <label htmlFor="u-ptype">Provider type <span className={s.req}>*</span></label>
            <select id="u-ptype" value={form.serviceProviderType} onChange={set('serviceProviderType')}>
              <option value="">Select type</option>
              {PROVIDER_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {fieldErr('serviceProviderType')}
          </div>
        )}

        {isPatient && (
          <div className={`${s.field} ${s.full}`}>
            <label htmlFor="u-patient">Patient type</label>
            <select id="u-patient" value={form.patientType} onChange={set('patientType')}>
              {PATIENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {form.patientType === 'HMO' && (
              <span className={s.muted} style={{ fontSize: 12 }}>
                Link them to a plan under HMO Subscriptions. HMO patients expire yearly.
              </span>
            )}
          </div>
        )}

        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="u-name">Full name <span className={s.req}>*</span></label>
          <input id="u-name" value={form.fullName} onChange={set('fullName')} autoComplete="off" />
          {fieldErr('fullName')}
        </div>
        <div className={s.field}>
          <label htmlFor="u-email">Email <span className={s.req}>*</span></label>
          <input id="u-email" type="email" value={form.email} onChange={set('email')} autoComplete="off" />
          {fieldErr('email')}
        </div>
        <div className={s.field}>
          <label htmlFor="u-phone">Phone <span className={s.req}>*</span></label>
          <input id="u-phone" type="tel" value={form.phoneNumber} onChange={set('phoneNumber')} placeholder="+234…" />
          {fieldErr('phoneNumber')}
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="u-area">Location</label>
          <select id="u-area" value={form.locationArea} onChange={set('locationArea')}>
            <option value="">Not specified</option>
            {LOCATION_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>
          {busy ? 'Creating…' : 'Create user'}
        </button>
      </div>
    </form>
  );
}

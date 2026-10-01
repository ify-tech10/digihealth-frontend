import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { LOCATION_GROUPS, locationLabel } from '../../config/locations';
import { matches } from '../../utils/format';
import { SearchBox } from './components/Common';
import s from './admin.module.css';

/*
 * One page for hospitals, pharmacies and laboratories.
 *   <Facilities kind="hospitals" />
 */
const KINDS = {
  hospitals:    { title: 'Hospitals',    singular: 'hospital',   subtitle: 'Partner hospitals and clinics' },
  pharmacies:   { title: 'Pharmacies',   singular: 'pharmacy',   subtitle: 'Partner pharmacies for prescriptions' },
  laboratories: { title: 'Laboratories', singular: 'laboratory', subtitle: 'Partner labs for tests and diagnostics' },
};

const EMPTY = { name: '', email: '', phoneNumber: '', address: '', locationArea: '', contactPerson: '', active: true };

const isActive = (f) => (typeof f.active === 'boolean' ? f.active : String(f.status || 'ACTIVE').toUpperCase() === 'ACTIVE');

export default function Facilities({ kind }) {
  const cfg = KINDS[kind];
  usePageHeader(cfg.title, cfg.subtitle);
  const { toast, showToast, clearToast } = useToast();

  const [query, setQuery] = useState('');
  const [area, setArea] = useState('');
  const [editing, setEditing] = useState(null); // {} for new, record for edit
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { data, loading, error, reload } = useApi(() => adminApi.facilities(kind), kind);

  const rows = asList(data).filter(
    (f) =>
      (!area || f.locationArea === area) &&
      matches(query, f.name, f.email, f.address, f.contactPerson, locationLabel(f.locationArea))
  );

  async function confirmDelete() {
    setDeleteBusy(true);
    try {
      await adminApi.deleteFacility(kind, deleting.id);
      showToast('success', `${deleting.name} removed.`);
      setDeleting(null);
      reload();
    } catch (err) {
      showToast('error', `Could not delete: ${err.message}`);
    } finally {
      setDeleteBusy(false);
    }
  }

  const columns = [
    { key: 'name', header: 'Name', render: (f) => <div className={s.tdName}>{f.name}<small>{f.email}</small></div> },
    { key: 'address', header: 'Address', render: (f) => f.address || '—' },
    { key: 'area', header: 'Area', render: (f) => locationLabel(f.locationArea) },
    { key: 'contact', header: 'Facility admin', render: (f) => <div>{f.contactPerson || '—'}<div className={s.muted}>{f.phoneNumber}</div></div> },
    { key: 'status', header: 'Status', render: (f) => <StatusBadge status={isActive(f) ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (f) => (
        <div className={s.actions}>
          <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setEditing(f)}>
            <Icon name="edit" /> Edit
          </button>
          <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => setDeleting(f)} aria-label={`Delete ${f.name}`}>
            <Icon name="trash" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.card}>
        <div className={s.toolbar}>
          <div className={s.toolbarRight}>
            <SearchBox value={query} onChange={setQuery} placeholder={`Search ${cfg.title.toLowerCase()}…`} />
            <select className={s.select} value={area} onChange={(e) => setArea(e.target.value)} aria-label="Filter by area">
              <option value="">All areas</option>
              {LOCATION_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setEditing({})}>
            <Icon name="plus" /> Add {cfg.singular}
          </button>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query || area ? `No ${cfg.title.toLowerCase()} match your filters.` : `No ${cfg.title.toLowerCase()} added yet.`}
        />
      </div>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${cfg.singular}` : `Add ${cfg.singular}`}
      >
        {editing && (
          <FacilityForm
            key={editing.id ?? 'new'}
            kind={kind}
            record={editing}
            onCancel={() => setEditing(null)}
            onSaved={(msg) => { setEditing(null); showToast('success', msg); reload(); }}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleting}
        title={`Delete ${cfg.singular}`}
        message={`Remove ${deleting?.name}? This can't be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function FacilityForm({ kind, record, onCancel, onSaved }) {
  const [form, setForm] = useState(() => {
    const initial = { ...EMPTY };
    Object.keys(EMPTY).forEach((k) => {
      if (record[k] !== undefined && record[k] !== null) initial[k] = record[k];
    });
    initial.active = record.id ? isActive(record) : true;
    return initial;
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.phoneNumber.trim()) errs.phoneNumber = 'Phone is required';
    if (!form.address.trim()) errs.address = 'Address is required';
    if (!form.locationArea) errs.locationArea = 'Select an area';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((form.email || '').trim())) errs.email = 'Enter the facility admin’s email';
    if (!(form.contactPerson || '').trim()) errs.contactPerson = 'Enter the facility admin’s name';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const body = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phoneNumber: form.phoneNumber.trim(),
      address: form.address.trim(),
      locationArea: form.locationArea,
      contactPerson: form.contactPerson.trim(),
      active: form.active,
    };

    setBusy(true);
    try {
      if (record.id) {
        await adminApi.updateFacility(kind, record.id, body);
        onSaved(`${body.name} updated.`);
      } else {
        await adminApi.createFacility(kind, body);
        onSaved(`${body.name} added. Login details sent to ${body.email}.`);
      }
    } catch (err) {
      const fieldErrors = err.data?.validationErrors || err.data?.errors;
      setErrors(fieldErrors && typeof fieldErrors === 'object' ? fieldErrors : { general: err.message });
      setBusy(false);
    }
  }

  const fieldErr = (f) => errors[f] && <span className={s.fieldError}>{errors[f]}</span>;

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      {!record.id && (
        <p className={s.hint} style={{ marginBottom: 12 }}>
          The facility admin receives login details at the email below, then can view referrals and send invoices to DiGi Health.
        </p>
      )}
      {errors.general && <p className={s.fieldError} style={{ marginBottom: 12 }}>{errors.general}</p>}

      <div className={s.formGrid}>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="f-name">Name <span className={s.req}>*</span></label>
          <input id="f-name" value={form.name} onChange={set('name')} />
          {fieldErr('name')}
        </div>
        <div className={s.field}>
          <label htmlFor="f-phone">Phone <span className={s.req}>*</span></label>
          <input id="f-phone" type="tel" value={form.phoneNumber} onChange={set('phoneNumber')} placeholder="+234…" />
          {fieldErr('phoneNumber')}
        </div>
        <div className={s.field}>
          <label htmlFor="f-email">Facility admin email <span className={s.req}>*</span></label>
          <input id="f-email" type="email" value={form.email || ''} onChange={set('email')} />
          {fieldErr('email')}
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="f-address">Address <span className={s.req}>*</span></label>
          <input id="f-address" value={form.address} onChange={set('address')} />
          {fieldErr('address')}
        </div>
        <div className={s.field}>
          <label htmlFor="f-area">Area <span className={s.req}>*</span></label>
          <select id="f-area" value={form.locationArea || ''} onChange={set('locationArea')}>
            <option value="">Select area</option>
            {LOCATION_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </optgroup>
            ))}
          </select>
          {fieldErr('locationArea')}
        </div>
        <div className={s.field}>
          <label htmlFor="f-contact">Facility admin name <span className={s.req}>*</span></label>
          <input id="f-contact" value={form.contactPerson || ''} onChange={set('contactPerson')} />
          {fieldErr('contactPerson')}
        </div>
        <label className={`${s.full} ${s.checkRow}`}>
          <input type="checkbox" checked={form.active} onChange={set('active')} />
          Active — available for referrals
        </label>
      </div>

      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>
          {busy ? 'Saving…' : record.id ? 'Save changes' : 'Add'}
        </button>
      </div>
    </form>
  );
}

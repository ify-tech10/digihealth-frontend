import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { ccsApi } from '../../Api/ccsApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { LOCATION_GROUPS, locationLabel } from '../../config/locations';
import { formatDate, humanize, matches } from '../../utils/format';
import { SearchBox, Tabs } from '../Admin/components/Common';
import { CareRequestModal } from '../Admin/components/CareRequestModals';
import s from '../Admin/admin.module.css';

const TABS = [
  ['ALL', 'All'],
  ['PENDING', 'Pending'],
  ['ASSIGNED', 'Assigned'],
  ['COMPLETED', 'Completed'],
];

/* Same choices as the public booking form, so requests logged by phone look identical. */
const SERVICES = [
  'Post-Discharge Recovery',
  'Home Nursing Care',
  'Chronic Care Management',
  'Elderly Care Support',
  'Postnatal Mother and Baby Care',
  'Physiotherapy and Rehabilitation',
  'Lab and Diagnostic Services',
  'Telemedicine',
  'Not sure — need guidance',
];

const CONTACT_TIMES = [
  ['AS_SOON_AS_POSSIBLE', 'As soon as possible'],
  ['MORNING_6AM_TO_12PM', 'Morning (6:00 AM – 12:00 PM)'],
  ['AFTERNOON_12PM_TO_5PM', 'Afternoon (12:00 PM – 5:00 PM)'],
  ['EVENING_5PM_TO_8PM', 'Evening (5:00 PM – 8:00 PM)'],
];

export default function CareRequestsDesk() {
  usePageHeader('Care Requests', 'Bookings from the website and ones you log for callers');
  const { toast, showToast, clearToast } = useToast();

  const [tab, setTab] = useState('ALL');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [logging, setLogging] = useState(false);

  const { data, loading, error, reload } = useApi(
    () => ccsApi.careRequests(tab === 'ALL' ? undefined : tab),
    `ccs-care-${tab}`
  );

  const rows = asList(data)
    .filter((r) => matches(query, r.fullName, r.email, r.phoneNumber, r.serviceNeeded, locationLabel(r.locationArea)))
    .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));

  const columns = [
    { key: 'name', header: 'Name', render: (r) => <div className={s.tdName}>{r.fullName}<small>{r.email}</small></div> },
    { key: 'phone', header: 'Phone', render: (r) => r.phoneNumber || '—' },
    { key: 'service', header: 'Service', render: (r) => humanize(r.serviceNeeded) },
    { key: 'area', header: 'Location', render: (r) => locationLabel(r.locationArea) },
    { key: 'received', header: 'Received', render: (r) => <span className={s.muted}>{formatDate(r.submittedAt)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'view', header: '', render: (r) => <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(r)}>View</button> },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS} value={tab} onChange={setTab} />
          <div className={s.toolbarRight}>
            <SearchBox value={query} onChange={setQuery} placeholder="Search name, phone, service…" />
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setLogging(true)}>
              <Icon name="plus" /> Log care request
            </button>
          </div>
        </div>
        <DataTable
          key={tab}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query ? 'No requests match your search.' : 'No care requests here.'}
        />
      </div>

      <CareRequestModal request={viewing} onClose={() => setViewing(null)} />

      <Modal isOpen={logging} onClose={() => setLogging(false)} title="Log care request" size="large">
        {logging && (
          <LogRequestForm
            onClose={() => setLogging(false)}
            onDone={(name) => { setLogging(false); showToast('success', `Care request logged for ${name}. The clinical team will assign a provider.`); reload(); }}
          />
        )}
      </Modal>
    </>
  );
}

const BLANK = {
  fullName: '', email: '', phoneNumber: '', address: '', locationArea: '',
  serviceNeeded: '', description: '', preferredContactTime: '',
};

function LogRequestForm({ onClose, onDone }) {
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Enter a valid email';
    if (!form.phoneNumber.trim()) errs.phoneNumber = 'Phone number is required';
    if (!form.serviceNeeded) errs.serviceNeeded = 'Choose a service';
    if (!form.preferredContactTime) errs.preferredContactTime = 'Choose a contact time';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setFailure('');
    try {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]));
      await ccsApi.logCareRequest(body);
      onDone(body.fullName);
    } catch (err) {
      setFailure(err.message);
    } finally {
      setBusy(false);
    }
  }

  const err = (k) => errors[k] && <span className={s.fieldError}>{errors[k]}</span>;

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint} style={{ marginBottom: 14 }}>For patients who call or message instead of booking on the website.</p>
      <div className={s.formGrid}>
        <div className={s.field}>
          <label htmlFor="crName">Full name <span className={s.req}>*</span></label>
          <input id="crName" value={form.fullName} onChange={set('fullName')} />
          {err('fullName')}
        </div>
        <div className={s.field}>
          <label htmlFor="crPhone">Phone <span className={s.req}>*</span></label>
          <input id="crPhone" type="tel" value={form.phoneNumber} onChange={set('phoneNumber')} placeholder="+234…" />
          {err('phoneNumber')}
        </div>
        <div className={s.field}>
          <label htmlFor="crEmail">Email <span className={s.req}>*</span></label>
          <input id="crEmail" type="email" value={form.email} onChange={set('email')} />
          {err('email')}
        </div>
        <div className={s.field}>
          <label htmlFor="crArea">Location</label>
          <select id="crArea" value={form.locationArea} onChange={set('locationArea')}>
            <option value="">Select area</option>
            {LOCATION_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="crAddress">Address</label>
          <input id="crAddress" value={form.address} onChange={set('address')} />
        </div>
        <div className={s.field}>
          <label htmlFor="crService">Service needed <span className={s.req}>*</span></label>
          <select id="crService" value={form.serviceNeeded} onChange={set('serviceNeeded')}>
            <option value="">Select a service</option>
            {SERVICES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          {err('serviceNeeded')}
        </div>
        <div className={s.field}>
          <label htmlFor="crTime">Preferred contact time <span className={s.req}>*</span></label>
          <select id="crTime" value={form.preferredContactTime} onChange={set('preferredContactTime')}>
            <option value="">Select a time</option>
            {CONTACT_TIMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {err('preferredContactTime')}
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="crDesc">What the patient needs</label>
          <textarea id="crDesc" value={form.description} onChange={set('description')} />
        </div>
      </div>
      {failure && <p className={s.fieldError} style={{ marginTop: 12 }}>Couldn’t log the request: {failure}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Log request'}</button>
      </div>
    </form>
  );
}

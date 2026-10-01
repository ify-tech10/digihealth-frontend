import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { cnoApi } from '../../Api/cnoApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDate, formatDay, formatMoney, humanize, pick, toISODate } from '../../utils/format';
import { Detail, DocumentLinks } from '../Admin/components/Common';
import s from '../Admin/admin.module.css';

const CATEGORIES = [
  ['EQUIPMENT', 'Medical equipment'],
  ['SUPPLIES', 'Consumables & supplies'],
  ['MEDICATION', 'Medication stock'],
  ['TRANSPORT', 'Transport & logistics'],
  ['PAYROLL', 'Staff payments / stipends'],
  ['TRAINING', 'Training'],
  ['OPERATIONS', 'Operations'],
  ['OTHER', 'Other'],
];
const MAX_FILE = 5 * 1024 * 1024;

const amountOf = (r) => Number(pick(r, 'amount', 'totalAmount')) || 0;
const statusOf = (r) => String(r.status || 'PENDING').toUpperCase();

/* Supervisors use the CNO endpoints by default; other portals pass their own. */
const DEFAULT_API = { list: cnoApi.financialRequests, create: cnoApi.createFinancialRequest };

export default function MyFinancialRequests({ api = DEFAULT_API, cacheKey = 'cno-fin' }) {
  usePageHeader('Financial Requests', 'Request funds — the admin approves or rejects');
  const { toast, showToast, clearToast } = useToast();

  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const { data, loading, error, reload } = useApi(() => api.list(), cacheKey);
  const all = asList(data).slice().sort((x, y) => new Date(pick(y, 'createdAt', 'submittedAt') || 0) - new Date(pick(x, 'createdAt', 'submittedAt') || 0));

  const sum = (st) => all.filter((r) => statusOf(r) === st).reduce((t, r) => t + amountOf(r), 0);
  const count = (st) => all.filter((r) => statusOf(r) === st).length;
  const v = (x) => (loading ? '…' : error ? '—' : x);

  const columns = [
    { key: 'title', header: 'Request', render: (r) => <div className={s.tdName}>{pick(r, 'title', 'purpose')}<small>{humanize(r.category)}</small></div> },
    { key: 'date', header: 'Submitted', render: (r) => formatDate(pick(r, 'createdAt', 'submittedAt')) },
    { key: 'needed', header: 'Needed by', render: (r) => formatDay(r.neededBy) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={statusOf(r)} /> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className={s.money}>{formatMoney(amountOf(r))}</span> },
    { key: 'view', header: '', render: (r) => <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(r)}>View</button> },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.stats4}>
        <StatCard accent color="orange" icon="clock" label="Awaiting admin" value={v(count('PENDING'))} sub={loading || error ? '' : formatMoney(sum('PENDING'))} />
        <StatCard accent color="green" icon="check" label="Approved" value={v(count('APPROVED'))} sub={loading || error ? '' : formatMoney(sum('APPROVED'))} />
        <StatCard accent color="red" icon="lock" label="Rejected" value={v(count('REJECTED'))} />
        <StatCard accent color="teal" icon="file" label="All requests" value={v(all.length)} />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <h3 className={s.toolbarTitle}>My requests</h3>
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setCreating(true)}>
            <Icon name="plus" /> New request
          </button>
        </div>
        <DataTable columns={columns} rows={all} loading={loading} error={error} emptyText="You haven't raised any financial requests yet." />
      </div>

      <Modal isOpen={creating} onClose={() => setCreating(false)} title="New financial request" size="large">
        {creating && (
          <RequestForm
            create={api.create}
            onCancel={() => setCreating(false)}
            onSaved={(msg) => { setCreating(false); showToast('success', msg); reload(); }}
          />
        )}
      </Modal>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? pick(viewing, 'title', 'purpose') : ''}>
        {viewing && (
          <div className={s.details}>
            <Detail label="Amount"><span className={s.money}>{formatMoney(amountOf(viewing))}</span></Detail>
            <Detail label="Status"><StatusBadge status={statusOf(viewing)} /></Detail>
            <Detail label="Category">{humanize(viewing.category)}</Detail>
            <Detail label="Needed by">{formatDay(viewing.neededBy)}</Detail>
            <Detail label="Submitted">{formatDate(pick(viewing, 'createdAt', 'submittedAt'))}</Detail>
            <Detail label="Reviewed">{formatDate(pick(viewing, 'reviewedAt', 'approvedAt'))}</Detail>
            <Detail label="Details" full>{pick(viewing, 'description', 'purpose')}</Detail>
            {pick(viewing, 'reviewNote', 'rejectionReason') && <Detail label="Admin's note" full>{pick(viewing, 'reviewNote', 'rejectionReason')}</Detail>}
            <div className={`${s.detail} ${s.full}`}>
              <span>Attachments</span>
              <DocumentLinks record={viewing} />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function RequestForm({ create, onCancel, onSaved }) {
  const [form, setForm] = useState({ title: '', category: '', amount: '', neededBy: '', description: '' });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = 'Give the request a short title';
    if (!form.category) errs.category = 'Choose a category';
    if (!(Number(form.amount) > 0)) errs.amount = 'Enter the amount in naira';
    if (form.neededBy && form.neededBy < toISODate(new Date())) errs.neededBy = 'Pick today or a future date';
    if (form.description.trim().length < 20) errs.description = 'Explain what the money is for (at least 20 characters)';
    if (file && file.size > MAX_FILE) errs.file = 'Attachment must be 5 MB or smaller';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const fd = new FormData();
    fd.append('title', form.title.trim());
    fd.append('category', form.category);
    fd.append('amount', String(Number(form.amount)));
    if (form.neededBy) fd.append('neededBy', form.neededBy);
    fd.append('description', form.description.trim());
    if (file) fd.append('attachment', file);

    setBusy(true);
    try {
      await create(fd);
      onSaved(`Request for ${formatMoney(Number(form.amount))} sent to the admin for approval.`);
    } catch (err) {
      const fieldErrors = err.data?.validationErrors || err.data?.errors;
      setErrors(fieldErrors && typeof fieldErrors === 'object' ? fieldErrors : { general: err.message });
      setBusy(false);
    }
  }

  const fieldErr = (f) => errors[f] && <span className={s.fieldError}>{errors[f]}</span>;

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      {errors.general && <p className={s.fieldError} style={{ marginBottom: 12 }}>{errors.general}</p>}
      <div className={s.formGrid}>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="fr-title">Title <span className={s.req}>*</span></label>
          <input id="fr-title" value={form.title} onChange={set('title')} placeholder="e.g. Replace 4 blood-pressure monitors" />
          {fieldErr('title')}
        </div>
        <div className={s.field}>
          <label htmlFor="fr-cat">Category <span className={s.req}>*</span></label>
          <select id="fr-cat" value={form.category} onChange={set('category')}>
            <option value="">Select category</option>
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {fieldErr('category')}
        </div>
        <div className={s.field}>
          <label htmlFor="fr-amt">Amount (₦) <span className={s.req}>*</span></label>
          <input id="fr-amt" type="number" min="0" step="500" inputMode="numeric" value={form.amount} onChange={set('amount')} />
          {fieldErr('amount')}
        </div>
        <div className={s.field}>
          <label htmlFor="fr-date">Needed by</label>
          <input id="fr-date" type="date" min={toISODate(new Date())} value={form.neededBy} onChange={set('neededBy')} />
          {fieldErr('neededBy')}
        </div>
        <div className={s.field}>
          <label htmlFor="fr-file">Quote / invoice</label>
          <input id="fr-file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0] || null)} />
          <span className={s.muted} style={{ fontSize: 12 }}>PDF, JPG or PNG up to 5 MB</span>
          {fieldErr('file')}
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="fr-desc">What it's for <span className={s.req}>*</span></label>
          <textarea id="fr-desc" value={form.description} onChange={set('description')} placeholder="Why it's needed, who it's for, any supplier details…" />
          {fieldErr('description')}
        </div>
      </div>
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Sending…' : 'Send to admin'}</button>
      </div>
    </form>
  );
}

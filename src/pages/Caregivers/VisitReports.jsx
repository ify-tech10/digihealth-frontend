import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import Badge from '../../components/Badge/Badge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { providerApi } from '../../Api/providerApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDate, formatDay, humanize, matches, pick, toISODate } from '../../utils/format';
import { Detail, Person, SearchBox } from '../Admin/components/Common';
import { isClosable, patientName, requestIdOf, serviceOf } from './fields';
import { ACTIVITIES, ACTIVITY_LABEL, CONDITIONS, CONDITION_VARIANT, VITALS, activitiesOf } from '../../config/visitReport';
import s from '../Admin/admin.module.css';
import p from './Provider.module.css';

export default function VisitReports() {
  usePageHeader('Visit Reports', 'Document what you did at each visit');
  const location = useLocation();
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();

  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [creating, setCreating] = useState(() => location.state?.newReportFor || null);

  const reports = useApi(() => providerApi.visitReports(), 'p-reports');
  const patients = useApi(() => providerApi.patients(), 'p-patients');
  const all = asList(reports.data);

  const rows = all
    .filter((r) => matches(query, pick(r, 'patientName', 'patient'), pick(r, 'notes', 'observations')))
    .sort((a, b) => new Date(pick(b, 'visitDate', 'createdAt') || 0) - new Date(pick(a, 'visitDate', 'createdAt') || 0));

  function closeForm() {
    setCreating(null);
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }

  const columns = [
    { key: 'date', header: 'Visit date', render: (r) => formatDay(pick(r, 'visitDate', 'createdAt')) },
    { key: 'patient', header: 'Patient', render: (r) => <Person name={pick(r, 'patientName', 'patient')} sub={humanize(serviceOf(r))} /> },
    { key: 'acts', header: 'Activities', render: (r) => {
      const a = activitiesOf(r);
      return a.length ? `${ACTIVITY_LABEL[a[0]] || humanize(a[0])}${a.length > 1 ? ` +${a.length - 1}` : ''}` : '—';
    } },
    { key: 'cond', header: 'Condition', render: (r) => {
      const c = String(pick(r, 'patientCondition', 'condition') || '').toUpperCase();
      return c ? <Badge variant={CONDITION_VARIANT[c] || 'default'}>{humanize(c)}</Badge> : '—';
    } },
    { key: 'submitted', header: 'Submitted', render: (r) => <span className={s.muted}>{formatDate(r.createdAt)}</span> },
    { key: 'view', header: '', render: (r) => <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(r)}>View</button> },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.card}>
        <div className={s.toolbar}>
          <SearchBox value={query} onChange={setQuery} placeholder="Search patient or notes…" />
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setCreating({})}>
            <Icon name="plus" /> New report
          </button>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          loading={reports.loading}
          error={reports.error}
          emptyText={query ? 'No reports match your search.' : 'No visit reports yet. Complete a visit or tap “New report”.'}
        />
      </div>

      <Modal isOpen={!!creating} onClose={closeForm} title="New visit report" size="large">
        {creating && (
          <ReportForm
            preset={creating}
            patients={asList(patients.data)}
            onCancel={closeForm}
            onSaved={(name) => { closeForm(); showToast('success', `Report for ${name} saved.`); reports.reload(); }}
          />
        )}
      </Modal>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${pick(viewing, 'patientName', 'patient') || 'Visit'} — ${formatDay(pick(viewing, 'visitDate', 'createdAt'))}` : ''} size="large">
        {viewing && (
          <div className={s.details}>
            <Detail label="Service">{humanize(serviceOf(viewing))}</Detail>
            <Detail label="Condition">{humanize(pick(viewing, 'patientCondition', 'condition'))}</Detail>
            {VITALS.map(([k, l, , unit]) => (pick(viewing, k) != null ? <Detail key={k} label={l}>{`${viewing[k]} ${unit}`}</Detail> : null))}
            <Detail label="Activities" full>{activitiesOf(viewing).map((a) => ACTIVITY_LABEL[a] || humanize(a)).join(', ') || '—'}</Detail>
            <Detail label="Medication given" full>{pick(viewing, 'medicationGiven', 'medications')}</Detail>
            <Detail label="Observations" full>{pick(viewing, 'notes', 'observations')}</Detail>
            <Detail label="Next steps" full>{pick(viewing, 'nextSteps', 'plan')}</Detail>
          </div>
        )}
      </Modal>
    </>
  );
}

function ReportForm({ preset, patients, onCancel, onSaved }) {
  const active = patients.filter(isClosable);
  const [form, setForm] = useState({
    requestId: preset.requestId != null ? String(preset.requestId) : '',
    visitDate: toISODate(new Date()),
    activities: [],
    condition: 'STABLE',
    medicationGiven: '',
    notes: '',
    nextSteps: '',
    ...Object.fromEntries(VITALS.map(([k]) => [k, ''])),
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.value }));
  const toggle = (a) => setForm((v) => ({ ...v, activities: v.activities.includes(a) ? v.activities.filter((x) => x !== a) : [...v.activities, a] }));

  const presetOption = preset.requestId != null && !active.some((pt) => String(requestIdOf(pt)) === String(preset.requestId));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.requestId) errs.requestId = 'Choose the patient';
    if (!form.visitDate) errs.visitDate = 'Pick the visit date';
    else if (form.visitDate > toISODate(new Date())) errs.visitDate = 'Visit date can’t be in the future';
    if (!form.activities.length) errs.activities = 'Tick at least one activity';
    if (form.notes.trim().length < 10) errs.notes = 'Describe what you observed (at least 10 characters)';
    if (form.bloodPressure && !/^\d{2,3}\/\d{2,3}$/.test(form.bloodPressure.trim())) errs.bloodPressure = 'Use the format 120/80';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const vitals = Object.fromEntries(
      VITALS.map(([k]) => [k, form[k].trim() === '' ? null : k === 'bloodPressure' ? form[k].trim() : Number(form[k])])
    );
    const chosen = patients.find((pt) => String(requestIdOf(pt)) === form.requestId);

    setBusy(true);
    try {
      await providerApi.createVisitReport({
        careRequestId: Number(form.requestId),
        visitId: preset.visitId ?? null,
        visitDate: form.visitDate,
        activities: form.activities,
        patientCondition: form.condition,
        medicationGiven: form.medicationGiven.trim() || null,
        notes: form.notes.trim(),
        nextSteps: form.nextSteps.trim() || null,
        ...vitals,
      });
      onSaved(chosen ? patientName(chosen) : preset.patientName || 'patient');
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
        <div className={s.field}>
          <label htmlFor="r-patient">Patient <span className={s.req}>*</span></label>
          <select id="r-patient" value={form.requestId} onChange={set('requestId')}>
            <option value="">Select patient</option>
            {presetOption && <option value={preset.requestId}>{preset.patientName || `Request #${preset.requestId}`}</option>}
            {active.map((pt) => <option key={requestIdOf(pt)} value={requestIdOf(pt)}>{patientName(pt)} — {humanize(serviceOf(pt))}</option>)}
          </select>
          {fieldErr('requestId')}
        </div>
        <div className={s.field}>
          <label htmlFor="r-date">Visit date <span className={s.req}>*</span></label>
          <input id="r-date" type="date" max={toISODate(new Date())} value={form.visitDate} onChange={set('visitDate')} />
          {fieldErr('visitDate')}
        </div>
      </div>

      <p className={p.sectionTitle}>Vital signs <span className={s.muted} style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>(fill what you measured)</span></p>
      <div className={p.vitals}>
        {VITALS.map(([k, l, ph]) => (
          <div key={k} className={s.field}>
            <label htmlFor={`r-${k}`}>{l}</label>
            <input id={`r-${k}`} inputMode={k === 'bloodPressure' ? 'text' : 'decimal'} value={form[k]} onChange={set(k)} placeholder={ph} />
            {fieldErr(k)}
          </div>
        ))}
      </div>

      <p className={p.sectionTitle}>Activities done <span className={s.req}>*</span></p>
      <div className={p.checks}>
        {ACTIVITIES.map(([v, l]) => (
          <label key={v} className={s.checkRow}>
            <input type="checkbox" checked={form.activities.includes(v)} onChange={() => toggle(v)} />
            {l}
          </label>
        ))}
      </div>
      {fieldErr('activities')}

      <p className={p.sectionTitle}>Notes</p>
      <div className={s.formGrid}>
        <div className={`${s.field} ${s.full}`}>
          <label>Patient condition</label>
          <div className={s.tabs} style={{ alignSelf: 'flex-start' }}>
            {CONDITIONS.map(([v, l]) => (
              <button key={v} type="button" className={`${s.tab} ${form.condition === v ? s.tabActive : ''}`} onClick={() => setForm((f) => ({ ...f, condition: v }))}>{l}</button>
            ))}
          </div>
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="r-med">Medication given</label>
          <input id="r-med" value={form.medicationGiven} onChange={set('medicationGiven')} placeholder="Drug, dose, time" />
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="r-notes">Observations <span className={s.req}>*</span></label>
          <textarea id="r-notes" value={form.notes} onChange={set('notes')} placeholder="How the patient is doing, anything unusual…" />
          {fieldErr('notes')}
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="r-next">Next steps</label>
          <textarea id="r-next" value={form.nextSteps} onChange={set('nextSteps')} placeholder="Follow-up, referrals, what to watch for…" />
        </div>
      </div>

      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Save report'}</button>
      </div>
    </form>
  );
}

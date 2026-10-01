import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import Badge from '../../components/Badge/Badge';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import { cnoApi } from '../../Api/cnoApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { ACTIVITY_LABEL, CONDITION_VARIANT, VITALS, activitiesOf } from '../../config/visitReport';
import { formatDate, formatDay, humanize, matches, pick } from '../../utils/format';
import { Detail, Person, SearchBox, Tabs } from '../Admin/components/Common';
import { RejectDialog } from '../Admin/components/ApplicationModals';
import s from '../Admin/admin.module.css';

const TABS = [
  ['PENDING_REVIEW', 'Pending review'],
  ['APPROVED', 'Approved'],
  ['RETURNED', 'Returned'],
  ['ALL', 'All'],
];

const conditionOf = (r) => String(pick(r, 'patientCondition', 'condition') || '').toUpperCase();
const providerOf = (r) => pick(r, 'providerName', 'caregiverName', 'submittedByName');
const isPendingReview = (r) => ['PENDING_REVIEW', 'SUBMITTED', 'PENDING'].includes(String(r.status || 'PENDING_REVIEW').toUpperCase());

export default function VisitReportReview() {
  usePageHeader('Visit Reports', 'Review and approve what your team documented');
  const { toast, showToast, clearToast } = useToast();

  const [tab, setTab] = useState('PENDING_REVIEW');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [approving, setApproving] = useState(null);
  const [returning, setReturning] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useApi(
    () => cnoApi.visitReports({ status: tab === 'ALL' ? undefined : tab }),
    tab
  );

  const rows = asList(data)
    .filter((r) => matches(query, pick(r, 'patientName', 'patient'), providerOf(r), pick(r, 'notes', 'observations')))
    /* deteriorating patients first, then newest */
    .sort((a, b) =>
      (conditionOf(b) === 'DETERIORATING') - (conditionOf(a) === 'DETERIORATING') ||
      new Date(pick(b, 'visitDate', 'createdAt') || 0) - new Date(pick(a, 'visitDate', 'createdAt') || 0)
    );

  const flagged = rows.filter((r) => conditionOf(r) === 'DETERIORATING' && isPendingReview(r)).length;

  async function approve() {
    setBusy(true);
    try {
      await cnoApi.approveVisitReport(approving.id, note.trim() || undefined);
      showToast('success', `Report for ${pick(approving, 'patientName', 'patient')} approved.`);
      setApproving(null);
      setViewing(null);
      reload();
    } catch (err) {
      showToast('error', `Approval failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function sendBack(r, reason) {
    setBusy(true);
    try {
      await cnoApi.returnVisitReport(r.id, reason);
      showToast('success', `Report returned to ${providerOf(r) || 'the provider'}.`);
      setReturning(null);
      reload();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: 'date', header: 'Visit', render: (r) => formatDay(pick(r, 'visitDate', 'createdAt')) },
    { key: 'patient', header: 'Patient', render: (r) => <Person name={pick(r, 'patientName', 'patient')} sub={humanize(pick(r, 'serviceType', 'serviceNeeded'))} /> },
    { key: 'provider', header: 'Provider', render: (r) => providerOf(r) || '—' },
    { key: 'acts', header: 'Activities', render: (r) => {
      const a = activitiesOf(r);
      return a.length ? `${ACTIVITY_LABEL[a[0]] || humanize(a[0])}${a.length > 1 ? ` +${a.length - 1}` : ''}` : '—';
    } },
    { key: 'cond', header: 'Condition', render: (r) => (conditionOf(r) ? <Badge variant={CONDITION_VARIANT[conditionOf(r)] || 'default'}>{humanize(conditionOf(r))}</Badge> : '—') },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'PENDING_REVIEW'} /> },
    { key: 'actions', header: 'Actions', render: (r) => (
      <div className={s.actions}>
        {isPendingReview(r) && (
          <>
            <button type="button" className={`${s.btn} ${s.btnApprove}`} onClick={() => { setNote(''); setApproving(r); }}>Approve</button>
            <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => setReturning(r)}>Return</button>
          </>
        )}
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(r)}>View</button>
      </div>
    ) },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      {flagged > 0 && (
        <div className={s.card} style={{ marginBottom: 16, borderColor: '#fecaca', background: '#fef2f2' }}>
          <p style={{ padding: '12px 16px', fontSize: 13.5, color: '#b91c1c' }}>
            <strong>{flagged} report{flagged === 1 ? '' : 's'}</strong> {flagged === 1 ? 'says' : 'say'} the patient is deteriorating — listed first.
          </p>
        </div>
      )}

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS} value={tab} onChange={setTab} />
          <SearchBox value={query} onChange={setQuery} placeholder="Search patient, provider, notes…" />
        </div>
        <DataTable
          key={tab}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query ? 'No reports match your search.' : tab === 'PENDING_REVIEW' ? 'Nothing waiting for review.' : 'No reports here.'}
        />
      </div>

      <Modal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `${pick(viewing, 'patientName', 'patient') || 'Visit'} — ${formatDay(pick(viewing, 'visitDate', 'createdAt'))}` : ''}
        size="large"
      >
        {viewing && (
          <>
            <div className={s.details}>
              <Detail label="Provider">{providerOf(viewing)}</Detail>
              <Detail label="Submitted">{formatDate(viewing.createdAt)}</Detail>
              <Detail label="Condition">
                {conditionOf(viewing) ? <Badge variant={CONDITION_VARIANT[conditionOf(viewing)] || 'default'}>{humanize(conditionOf(viewing))}</Badge> : '—'}
              </Detail>
              <Detail label="Status"><StatusBadge status={viewing.status || 'PENDING_REVIEW'} /></Detail>
              {VITALS.map(([k, l, , unit]) => (viewing[k] != null && viewing[k] !== '' ? <Detail key={k} label={l}>{`${viewing[k]} ${unit}`}</Detail> : null))}
              <Detail label="Activities" full>{activitiesOf(viewing).map((a) => ACTIVITY_LABEL[a] || humanize(a)).join(', ') || '—'}</Detail>
              <Detail label="Medication given" full>{pick(viewing, 'medicationGiven', 'medications')}</Detail>
              <Detail label="Observations" full>{pick(viewing, 'notes', 'observations')}</Detail>
              <Detail label="Next steps" full>{pick(viewing, 'nextSteps', 'plan')}</Detail>
              {pick(viewing, 'reviewNote', 'returnReason') && <Detail label="Review note" full>{pick(viewing, 'reviewNote', 'returnReason')}</Detail>}
            </div>
            {isPendingReview(viewing) && (
              <div className={s.modalActions}>
                <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnLarge}`} onClick={() => { const r = viewing; setViewing(null); setReturning(r); }}>Return for changes</button>
                <button type="button" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} onClick={() => { setNote(''); setApproving(viewing); }}>Approve</button>
              </div>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!approving}
        title="Approve report"
        message={approving ? `Approve ${providerOf(approving) || 'the provider'}’s report for ${pick(approving, 'patientName', 'patient')}?` : ''}
        confirmLabel="Approve"
        busy={busy}
        onClose={() => setApproving(null)}
        onConfirm={approve}
      >
        <div className={s.field} style={{ marginTop: 14 }}>
          <label htmlFor="vrNote">Note to provider (optional)</label>
          <textarea id="vrNote" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </ConfirmDialog>

      <RejectDialog
        key={returning?.id ?? 'none'}
        target={returning}
        title="Return report"
        message={returning ? `Send this report back to ${providerOf(returning) || 'the provider'} to fix?` : ''}
        confirmLabel="Return"
        busy={busy}
        onClose={() => setReturning(null)}
        onConfirm={sendBack}
      />
    </>
  );
}

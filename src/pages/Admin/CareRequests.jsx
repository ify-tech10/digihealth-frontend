import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable from '../../components/DataTable/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { locationLabel } from '../../config/locations';
import { formatDate, humanize, matches, pick } from '../../utils/format';
import { SearchBox, Tabs } from './components/Common';
import { AssignProviderModal, CareRequestModal } from './components/CareRequestModals';
import { RejectDialog } from './components/ApplicationModals';
import { awaitingClosure, canAssign } from './components/status';
import s from './admin.module.css';

const STATUS_TABS = [
  ['PENDING', 'Pending'],
  ['ASSIGNED', 'Assigned'],
  ['PENDING_CLOSURE', 'Awaiting closure'],
  ['COMPLETED', 'Completed'],
  ['ALL', 'All'],
];
const VALID = STATUS_TABS.map(([v]) => v);

export default function CareRequests() {
  usePageHeader('Care Requests', 'Assign providers and approve completed requests');
  const { toast, showToast, clearToast } = useToast();

  /* ?status=PENDING_CLOSURE deep-links from the dashboard */
  const [params, setParams] = useSearchParams();
  const status = VALID.includes(params.get('status')) ? params.get('status') : 'PENDING';
  const setStatus = (v) => setParams(v === 'PENDING' ? {} : { status: v }, { replace: true });

  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [closing, setClosing] = useState(null);
  const [sendingBack, setSendingBack] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useApi(
    () => adminApi.careRequests(status === 'ALL' ? undefined : status),
    status
  );

  const rows = asList(data).filter((r) =>
    matches(query, r.fullName, r.email, r.phoneNumber, r.serviceNeeded, locationLabel(r.locationArea), pick(r, 'assignedProviderName', 'providerName'))
  );

  const openClose = (r) => { setViewing(null); setNote(''); setClosing(r); };
  const openSendBack = (r) => { setViewing(null); setSendingBack(r); };

  async function approveClosure() {
    setBusy(true);
    try {
      await adminApi.approveClosure(closing.id, note.trim() || undefined);
      showToast('success', `Request for ${closing.fullName} is now fully closed.`);
      setClosing(null);
      reload();
    } catch (err) {
      showToast('error', `Could not close: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function sendBack(r, reason) {
    setBusy(true);
    try {
      await adminApi.rejectClosure(r.id, reason);
      showToast('success', `Sent back to ${pick(r, 'assignedProviderName', 'providerName') || 'the provider'}.`);
      setSendingBack(null);
      reload();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: 'patient', header: 'Patient', render: (r) => <div className={s.tdName}>{r.fullName}<small>{r.email}</small></div> },
    { key: 'service', header: 'Service', render: (r) => humanize(r.serviceNeeded) },
    { key: 'location', header: 'Location', render: (r) => locationLabel(r.locationArea) },
    status === 'PENDING'
      ? { key: 'time', header: 'Pref. Time', render: (r) => humanize(r.preferredContactTime) }
      : { key: 'provider', header: 'Provider', render: (r) => pick(r, 'assignedProviderName', 'providerName') || '—' },
    { key: 'received', header: 'Received', render: (r) => formatDate(r.submittedAt) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className={s.actions}>
          {canAssign(r) && (
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setAssigning(r)}>Assign</button>
          )}
          {awaitingClosure(r) && (
            <>
              <button type="button" className={`${s.btn} ${s.btnApprove}`} onClick={() => openClose(r)}>Approve closure</button>
              <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => openSendBack(r)}>Send back</button>
            </>
          )}
          <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(r)}>View</button>
        </div>
      ),
    },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={STATUS_TABS} value={status} onChange={setStatus} />
          <SearchBox value={query} onChange={setQuery} placeholder="Search patient, provider, service…" />
        </div>
        {status === 'PENDING_CLOSURE' && (
          <p className={s.hint} style={{ padding: '12px 20px 0' }}>
            Providers have marked these as done. A request is only fully closed once you approve it.
          </p>
        )}
        <DataTable
          key={status}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query ? 'No requests match your search.' : 'No care requests here.'}
        />
      </div>

      <CareRequestModal
        request={viewing}
        onClose={() => setViewing(null)}
        onAssign={(r) => { setViewing(null); setAssigning(r); }}
        onApproveClosure={openClose}
        onRejectClosure={openSendBack}
      />
      <AssignProviderModal
        request={assigning}
        onClose={() => setAssigning(null)}
        onDone={(msg) => { setAssigning(null); showToast('success', msg); reload(); }}
      />

      <ConfirmDialog
        isOpen={!!closing}
        title="Approve closure"
        message={closing ? `Confirm the care for ${closing.fullName} is complete. The request will be fully closed.` : ''}
        confirmLabel="Approve closure"
        busy={busy}
        onClose={() => setClosing(null)}
        onConfirm={approveClosure}
      >
        {closing && pick(closing, 'closureNote', 'completionNote', 'visitSummary') && (
          <p className={s.hint} style={{ marginTop: 10 }}>
            <strong>Provider's report:</strong> {pick(closing, 'closureNote', 'completionNote', 'visitSummary')}
          </p>
        )}
        <div className={s.field} style={{ marginTop: 14 }}>
          <label htmlFor="closeNote">Note (optional)</label>
          <textarea id="closeNote" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </ConfirmDialog>

      <RejectDialog
        key={sendingBack?.id ?? 'none'}
        target={sendingBack}
        title="Send back to provider"
        confirmLabel="Send back"
        message={sendingBack ? `Reopen the request for ${sendingBack.fullName}? The provider will be asked to finish the outstanding work.` : ''}
        busy={busy}
        onClose={() => setSendingBack(null)}
        onConfirm={sendBack}
      />
    </>
  );
}

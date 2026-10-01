import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import StatusBadge from '../../../components/StatusBadge/StatusBadge';
import { adminApi } from '../../../Api/adminApi';
import { asList } from '../../../Api/apiFetch';
import { useApi } from '../../../hooks/useApi';
import { locationLabel } from '../../../config/locations';
import { formatDate, humanize, pick } from '../../../utils/format';
import { Detail } from './Common';
import { awaitingClosure, canAssign } from './status';
import s from '../admin.module.css';

/* ── View one care request ── */
export function CareRequestModal({ request, onClose, onAssign, onApproveClosure, onRejectClosure }) {
  return (
    <Modal isOpen={!!request} onClose={onClose} title={request?.fullName}>
      {request && (
        <>
          <div className={s.details}>
            <Detail label="Email">{request.email}</Detail>
            <Detail label="Phone">{request.phoneNumber}</Detail>
            <Detail label="Service">{humanize(request.serviceNeeded)}</Detail>
            <Detail label="Location">{locationLabel(request.locationArea)}</Detail>
            <Detail label="Address" full>{request.address}</Detail>
            <Detail label="Pref. contact time">{humanize(request.preferredContactTime)}</Detail>
            <Detail label="Status"><StatusBadge status={request.status} /></Detail>
            <Detail label="Received">{formatDate(request.submittedAt)}</Detail>
            {pick(request, 'assignedProviderName', 'providerName') && (
              <Detail label="Assigned to">{pick(request, 'assignedProviderName', 'providerName')}</Detail>
            )}
            {pick(request, 'closedAt', 'closureRequestedAt') && (
              <Detail label="Closed by provider">{formatDate(pick(request, 'closedAt', 'closureRequestedAt'))}</Detail>
            )}
            {request.description && <Detail label="Description" full>{request.description}</Detail>}
            {request.adminNote && <Detail label="Admin note" full>{request.adminNote}</Detail>}
            {pick(request, 'closureNote', 'completionNote', 'visitSummary') && (
              <Detail label="Provider's closing report" full>{pick(request, 'closureNote', 'completionNote', 'visitSummary')}</Detail>
            )}
          </div>
          {awaitingClosure(request) && (onApproveClosure || onRejectClosure) && (
            <div className={s.modalActions}>
              {onRejectClosure && (
                <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnLarge}`} onClick={() => onRejectClosure(request)}>
                  Send back
                </button>
              )}
              {onApproveClosure && (
                <button type="button" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} onClick={() => onApproveClosure(request)}>
                  Approve closure
                </button>
              )}
            </div>
          )}
          {onAssign && canAssign(request) && (
            <div className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => onAssign(request)}>
                Assign provider
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

/* ── Assign a provider (keyed by request id so it resets per request) ── */
export function AssignProviderModal({ request, onClose, onDone }) {
  return (
    <Modal isOpen={!!request} onClose={onClose} title="Assign Provider">
      {request && <AssignForm key={request.id} request={request} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}

function AssignForm({ request, onClose, onDone }) {
  const providers = useApi(
    () => adminApi.availableProviders(request.id, request.locationArea),
    `providers-${request.id}`
  );
  const list = asList(providers.data);

  const [providerId, setProviderId] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!providerId) return;
    setBusy(true);
    setError('');
    try {
      await adminApi.assignCareRequest(request.id, providerId, adminNote);
      onDone(`Request from ${request.fullName} assigned.`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  let placeholder = 'Select provider';
  if (providers.loading) placeholder = 'Loading providers…';
  else if (providers.error) placeholder = /404/.test(providers.error) ? 'No providers available in this area' : providers.error;
  else if (!list.length) placeholder = 'No providers available';

  return (
    <div className={s.form}>
      <p className={s.hint}>
        {request.fullName} · {humanize(request.serviceNeeded)} · {locationLabel(request.locationArea)}
      </p>

      <div className={s.field} style={{ marginTop: 10 }}>
        <label htmlFor="providerSelect">Select provider</label>
        <select
          id="providerSelect"
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
          disabled={providers.loading || !list.length}
        >
          <option value="">{placeholder}</option>
          {list.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName} ({p.serviceProviderType ? humanize(p.serviceProviderType) : 'General'})
            </option>
          ))}
        </select>
      </div>

      <div className={s.field} style={{ marginTop: 14 }}>
        <label htmlFor="adminNote">Admin note</label>
        <textarea
          id="adminNote"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Optional note…"
        />
      </div>

      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}

      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`}
          onClick={submit}
          disabled={busy || !providerId}
        >
          {busy ? 'Assigning…' : 'Confirm Assignment'}
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import StatusBadge from '../../../components/StatusBadge/StatusBadge';
import { locationLabel } from '../../../config/locations';
import { formatDate, humanize, pick } from '../../../utils/format';
import { Detail, DocumentLinks } from './Common';
import { isPending } from './status';
import s from '../admin.module.css';

/* ── View a service-provider application ── */
export function ApplicationModal({ application: app, busy, onClose, onApprove, onReject }) {
  return (
    <Modal isOpen={!!app} onClose={onClose} title={app?.fullName} size="large">
      {app && (
        <>
          <div className={s.details}>
            <Detail label="Email">{app.email}</Detail>
            <Detail label="Phone">{app.phoneNumber}</Detail>
            <Detail label="Role">{humanize(app.serviceProviderType)}</Detail>
            <Detail label="Experience">{pick(app, 'yearsOfExperience', 'experience')}</Detail>
            <Detail label="Qualification">{app.qualification}</Detail>
            <Detail label="Specialisations">{pick(app, 'specialisations', 'specialty')}</Detail>
            <Detail label="Availability">{humanize(app.availabilityType)}</Detail>
            <Detail label="Coverage area">{locationLabel(app.locationArea)}</Detail>
            <Detail label="Status"><StatusBadge status={app.status || 'PENDING'} /></Detail>
            <Detail label="Applied">{formatDate(app.appliedAt)}</Detail>
            <Detail label="Address" full>{app.address}</Detail>
            <Detail label="Professional summary" full>
              {pick(app, 'professionalSummary', 'professional_summary', 'bio') || 'No summary provided'}
            </Detail>
            <div className={`${s.detail} ${s.full}`}>
              <span>Documents</span>
              <DocumentLinks record={app} />
            </div>
          </div>

          {isPending(app) && (onApprove || onReject) && (
            <div className={s.modalActions}>
              {onReject && (
                <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnLarge}`} onClick={() => onReject(app)} disabled={busy}>
                  Reject
                </button>
              )}
              {onApprove && (
                <button type="button" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} onClick={() => onApprove(app)} disabled={busy}>
                  {busy ? 'Working…' : 'Approve application'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

/* ── Reject with an optional reason ──
 * Render with key={target?.id} so the reason resets per applicant. */
export function RejectDialog({ target, name, busy, onClose, onConfirm, title = 'Reject application', message, confirmLabel = 'Reject' }) {
  const [reason, setReason] = useState('');
  return (
    <ConfirmDialog
      isOpen={!!target}
      title={title}
      message={message || `Reject the application from ${name || 'this applicant'}?`}
      confirmLabel={confirmLabel}
      danger
      busy={busy}
      onClose={onClose}
      onConfirm={() => onConfirm(target, reason)}
    >
      <div className={s.field} style={{ marginTop: 14 }}>
        <label htmlFor="rejectReason">Reason (optional)</label>
        <textarea
          id="rejectReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this being rejected?"
        />
      </div>
    </ConfirmDialog>
  );
}

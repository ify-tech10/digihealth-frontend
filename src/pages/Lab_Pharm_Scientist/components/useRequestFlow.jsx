import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import { formatDate, formatDay, humanize, pick } from '../../../utils/format';
import { locationLabel } from '../../../config/locations';
import { roleLabel } from '../../../config/userRoles';
import { Detail, DocumentLinks } from '../../Admin/components/Common';
import { RejectDialog } from '../../Admin/components/ApplicationModals';
import {
  addressOf, dueOf, mapsUrl, patientOf, phoneOf, reqNo, reqStatus, requesterOf, whenOf,
} from '../labFields';
import { Priority, RequestStatus } from './RequestBadges';
import { AcceptForm, CompleteForm, ItemsTable } from './RequestForms';
import s from '../../Admin/admin.module.css';

/*
 * Everything you can do with a request, in one place:
 *   const flow = useRequestFlow({ api, words, showToast, onChanged });
 *   flow.view(r) / flow.accept(r) / flow.decline(r) / flow.start(r) / flow.complete(r)
 *   {flow.modals}
 */
export function useRequestFlow({ api, kind, words, showToast, onChanged }) {
  const [viewing, setViewing] = useState(null);
  const [accepting, setAccepting] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [starting, setStarting] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const done = (msg) => {
    showToast('success', msg);
    setViewing(null);
    onChanged?.();
  };

  async function decline(r, reason) {
    if (!reason?.trim()) {
      showToast('error', 'Say why you can’t fulfil it so the medical team can re-route it.');
      return;
    }
    setBusy(true);
    try {
      await api.decline(r.id, reason.trim());
      setDeclining(null);
      done(`${reqNo(r)} sent back to ${requesterOf(r) || 'the medical team'}.`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setBusy(true);
    try {
      await api.start(starting.id);
      setStarting(null);
      done(words.startDone);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  const actionsFor = (r, large = false) => {
    const st = reqStatus(r);
    const cls = large ? s.btnLarge : '';
    return (
      <>
        {st === 'NEW' && (
          <>
            <button type="button" className={`${s.btn} ${s.btnApprove} ${cls}`} onClick={() => { setViewing(null); setAccepting(r); }}>Accept</button>
            <button type="button" className={`${s.btn} ${s.btnDanger} ${cls}`} onClick={() => { setViewing(null); setDeclining(r); }}>Can’t fulfil</button>
          </>
        )}
        {st === 'ACCEPTED' && (
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${cls}`} onClick={() => { setViewing(null); setStarting(r); }}>{words.startLabel}</button>
        )}
        {st === 'IN_PROGRESS' && (
          <button type="button" className={`${s.btn} ${s.btnApprove} ${cls}`} onClick={() => { setViewing(null); setCompleting(r); }}>{words.completeLabel}</button>
        )}
      </>
    );
  };

  const modals = (
    <>
      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${reqNo(viewing)} — ${patientOf(viewing)}` : ''} size="large">
        {viewing && (
          <>
            <div className={s.details}>
              <Detail label="Status"><span style={{ display: 'inline-flex', gap: 6 }}><RequestStatus request={viewing} words={words} /><Priority request={viewing} /></span></Detail>
              <Detail label="Requested by">{[requesterOf(viewing), pick(viewing, 'requestedByRole') && roleLabel(viewing.requestedByRole)].filter(Boolean).join(' · ') || '—'}</Detail>
              <Detail label="Patient">{patientOf(viewing)}</Detail>
              <Detail label="Phone">{phoneOf(viewing) ? <a href={`tel:${phoneOf(viewing)}`} style={{ color: '#059669', fontWeight: 600 }}>{phoneOf(viewing)}</a> : '—'}</Detail>
              <Detail label={`${words.Visit} address`} full>
                {addressOf(viewing) ? (
                  <span>{addressOf(viewing)}{viewing.locationArea ? `, ${locationLabel(viewing.locationArea)}` : ''} · <a href={mapsUrl(addressOf(viewing))} target="_blank" rel="noopener noreferrer" style={{ color: '#059669', fontWeight: 600 }}>Open in Maps</a></span>
                ) : '—'}
              </Detail>
              <Detail label="Received">{formatDate(pick(viewing, 'createdAt', 'requestedAt'))}</Detail>
              <Detail label="Needed by">{formatDay(dueOf(viewing))}</Detail>
              {whenOf(viewing) && <Detail label={`${words.Visit} booked`}>{formatDate(whenOf(viewing))}</Detail>}
              {pick(viewing, 'patientType') && <Detail label="Patient type">{humanize(viewing.patientType)}</Detail>}
              {pick(viewing, 'notes', 'clinicalNotes') && <Detail label="Notes from the medical team" full>{pick(viewing, 'notes', 'clinicalNotes')}</Detail>}
              {pick(viewing, 'declineReason') && <Detail label="Declined because" full>{viewing.declineReason}</Detail>}
              {pick(viewing, 'resultSummary') && <Detail label="Result summary" full>{viewing.resultSummary}</Detail>}
              {pick(viewing, 'receivedBy') && <Detail label="Received by">{viewing.receivedBy}</Detail>}
              {pick(viewing, 'completedAt', 'deliveredAt') && <Detail label="Completed">{formatDate(pick(viewing, 'completedAt', 'deliveredAt'))}</Detail>}
            </div>
            <ItemsTable request={viewing} words={words} />
            {reqStatus(viewing) === 'COMPLETED' && (
              <div className={`${s.detail} ${s.full}`} style={{ marginTop: 12 }}>
                <span>{kind === 'LAB' ? 'Results' : 'Proof of delivery'}</span>
                <DocumentLinks record={viewing} />
              </div>
            )}
            <div className={s.modalActions}>{actionsFor(viewing, true)}</div>
          </>
        )}
      </Modal>

      <Modal isOpen={!!accepting} onClose={() => setAccepting(null)} title={accepting ? `Accept ${reqNo(accepting)}` : ''} size="large">
        {accepting && (
          <AcceptForm
            key={accepting.id}
            request={accepting}
            words={words}
            onClose={() => setAccepting(null)}
            onSubmit={async (body) => {
              await api.accept(accepting.id, body);
              const r = accepting;
              setAccepting(null);
              done(`${reqNo(r)} accepted — ${words.visit} booked for ${formatDate(body.scheduledAt)}.`);
            }}
          />
        )}
      </Modal>

      <RejectDialog
        key={declining?.id ?? 'none'}
        target={declining}
        title="Can’t fulfil this request"
        message={declining ? `Send ${reqNo(declining)} back to ${requesterOf(declining) || 'the medical team'}? It stays on record — requests are never deleted. Please give a reason.` : ''}
        confirmLabel="Send back"
        busy={busy}
        onClose={() => setDeclining(null)}
        onConfirm={decline}
      />

      <ConfirmDialog
        isOpen={!!starting}
        title={words.startLabel}
        message={starting ? (kind === 'LAB'
          ? `Confirm the sample for ${patientOf(starting)} has been collected?`
          : `Mark ${patientOf(starting)}’s order as out for delivery? The patient is notified.`) : ''}
        confirmLabel="Confirm"
        busy={busy}
        onClose={() => setStarting(null)}
        onConfirm={start}
      />

      <Modal isOpen={!!completing} onClose={() => setCompleting(null)} title={completing ? `${words.completeLabel} — ${reqNo(completing)}` : ''}>
        {completing && (
          <CompleteForm
            key={completing.id}
            kind={kind}
            request={completing}
            onClose={() => setCompleting(null)}
            onSubmit={async (fd) => {
              if (kind === 'LAB') await api.submitResults(completing.id, fd);
              else await api.confirmDelivery(completing.id, fd);
              const r = completing;
              setCompleting(null);
              done(kind === 'LAB' ? `Results for ${patientOf(r)} sent to ${requesterOf(r) || 'the medical team'}.` : `Delivery to ${patientOf(r)} confirmed.`);
            }}
          />
        )}
      </Modal>
    </>
  );

  return { view: setViewing, accept: setAccepting, decline: setDeclining, start: setStarting, complete: setCompleting, actionsFor, modals };
}

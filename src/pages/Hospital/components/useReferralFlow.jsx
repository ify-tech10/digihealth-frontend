import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import { facilityApi } from '../../../Api/facilityApi';
import { RejectDialog } from '../../Admin/components/ApplicationModals';
import { NewInvoiceModal } from '../../Facility/components/InvoiceModals';
import { WORDS, patientName, refOf, reqStatus } from '../../Facility/facilityFields';
import { AcceptReferralForm, DischargeForm, ReferralDetails, ReferralStatus, Urgency } from './ReferralParts';
import s from '../../Admin/admin.module.css';

/*
 * Referral workflow for hospital admins:
 *   NEW → accept (arrival time, ward) or decline (reason)
 *   ACCEPTED → admit when the patient arrives
 *   ADMITTED → discharge with a summary → invoice DiGi
 */
export function useReferralFlow({ showToast, onChanged }) {
  const [viewing, setViewing] = useState(null);
  const [accepting, setAccepting] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [admitting, setAdmitting] = useState(null);
  const [discharging, setDischarging] = useState(null);
  const [invoicing, setInvoicing] = useState(null);
  const [ward, setWard] = useState('');
  const [busy, setBusy] = useState(false);

  const changed = (msg) => {
    showToast('success', msg);
    setViewing(null);
    onChanged?.();
  };

  async function decline(r, reason) {
    if (!reason?.trim()) return showToast('error', 'Give a reason so DiGi can find another hospital quickly.');
    setBusy(true);
    try {
      await facilityApi.decline(r.id, reason.trim());
      setDeclining(null);
      changed(`${refOf(r)} declined — DiGi has been told.`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function admit() {
    setBusy(true);
    try {
      await facilityApi.admit(admitting.id, { ward: ward.trim() || admitting.ward || undefined, admittedAt: new Date().toISOString() });
      const r = admitting;
      setAdmitting(null);
      changed(`${patientName(r)} admitted.`);
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
            <button type="button" className={`${s.btn} ${s.btnDanger} ${cls}`} onClick={() => { setViewing(null); setDeclining(r); }}>Decline</button>
          </>
        )}
        {st === 'ACCEPTED' && (
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${cls}`} onClick={() => { setViewing(null); setWard(r.ward || ''); setAdmitting(r); }}>Patient arrived</button>
        )}
        {st === 'ADMITTED' && (
          <button type="button" className={`${s.btn} ${s.btnApprove} ${cls}`} onClick={() => { setViewing(null); setDischarging(r); }}>Discharge</button>
        )}
        {st === 'DISCHARGED' && !r.invoiced && (
          <button type="button" className={`${s.btn} ${s.btnView} ${cls}`} onClick={() => { setViewing(null); setInvoicing(r); }}>Invoice DiGi</button>
        )}
      </>
    );
  };

  const modals = (
    <>
      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${refOf(viewing)} — ${patientName(viewing)}` : ''} size="large">
        {viewing && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}><ReferralStatus referral={viewing} /><Urgency referral={viewing} /></div>
            <ReferralDetails referral={viewing} />
            <div className={s.modalActions}>{actionsFor(viewing, true)}</div>
          </>
        )}
      </Modal>

      <Modal isOpen={!!accepting} onClose={() => setAccepting(null)} title={accepting ? `Accept ${refOf(accepting)}` : ''}>
        {accepting && (
          <AcceptReferralForm
            key={accepting.id}
            referral={accepting}
            onClose={() => setAccepting(null)}
            onSubmit={async (body) => {
              await facilityApi.accept(accepting.id, body);
              const r = accepting;
              setAccepting(null);
              changed(`${refOf(r)} accepted — DiGi will bring ${patientName(r)} in.`);
            }}
          />
        )}
      </Modal>

      <RejectDialog
        key={declining?.id ?? 'none'}
        target={declining}
        title="Decline referral"
        message={declining ? `Decline ${patientName(declining)}’s referral? DiGi will send them elsewhere — please say why (e.g. no beds, no specialist).` : ''}
        confirmLabel="Decline"
        busy={busy}
        onClose={() => setDeclining(null)}
        onConfirm={decline}
      />

      <ConfirmDialog
        isOpen={!!admitting}
        title="Patient arrived"
        message={admitting ? `Mark ${patientName(admitting)} as admitted now?` : ''}
        confirmLabel="Admit"
        busy={busy}
        onClose={() => setAdmitting(null)}
        onConfirm={admit}
      >
        <div className={s.field} style={{ marginTop: 14 }}>
          <label htmlFor="admWard">Ward / bed</label>
          <input id="admWard" value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g. Ward B, bed 12" />
        </div>
      </ConfirmDialog>

      <Modal isOpen={!!discharging} onClose={() => setDischarging(null)} title={discharging ? `Discharge ${patientName(discharging)}` : ''}>
        {discharging && (
          <DischargeForm
            key={discharging.id}
            referral={discharging}
            onClose={() => setDischarging(null)}
            onSubmit={async (fd) => {
              await facilityApi.discharge(discharging.id, fd);
              const r = discharging;
              setDischarging(null);
              changed(`${patientName(r)} discharged — summary sent to DiGi.`);
              setInvoicing({ ...r, status: 'DISCHARGED' });
            }}
          />
        )}
      </Modal>

      <NewInvoiceModal
        open={!!invoicing}
        request={invoicing}
        words={WORDS.HOSPITAL}
        onClose={() => setInvoicing(null)}
        onCreated={(msg) => { setInvoicing(null); showToast('success', msg); onChanged?.(); }}
      />
    </>
  );

  return { view: setViewing, actionsFor, modals };
}

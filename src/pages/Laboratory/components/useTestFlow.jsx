import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import { facilityApi } from '../../../Api/facilityApi';
import { asList } from '../../../Api/apiFetch';
import { useApi } from '../../../hooks/useApi';
import { RejectDialog } from '../../Admin/components/ApplicationModals';
import { NewInvoiceModal } from '../../Facility/components/InvoiceModals';
import { WORDS, patientName, refOf, reqStatus } from '../../Facility/facilityFields';
import { menuTest } from '../labCentreFields';
import { AcceptTestForm, CollectForm, ResultsForm, TestRequestDetails, TestStatus, Urgency } from './TestParts';
import s from '../../Admin/admin.module.css';

/*
 * Test request workflow for lab centre admins:
 *   NEW → accept (confirm tests + prices, home or walk-in, collection time) or decline (reason)
 *   ACCEPTED → sample collected (sample ID, who, when)
 *   COLLECTED → results (value + flag per test, signed report) → invoice DiGi
 */
export function useTestFlow({ showToast, onChanged }) {
  const [viewing, setViewing] = useState(null);
  const [accepting, setAccepting] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [collecting, setCollecting] = useState(null);
  const [resulting, setResulting] = useState(null);
  const [invoicing, setInvoicing] = useState(null);
  const [busy, setBusy] = useState(false);

  const menu = useApi(() => facilityApi.tests(), 'fac-tests-LAB');
  const tests = asList(menu.data).map(menuTest);

  const changed = (msg, tone = 'success') => {
    showToast(tone, msg);
    setViewing(null);
    onChanged?.();
  };

  async function decline(r, reason) {
    if (!reason?.trim()) return showToast('error', 'Give a reason (e.g. reagent out of stock) so DiGi can send it elsewhere.');
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

  const open = (setter, r) => { setViewing(null); setter(r); };

  const actionsFor = (r, large = false) => {
    const st = reqStatus(r);
    const cls = large ? s.btnLarge : '';
    return (
      <>
        {st === 'NEW' && (
          <>
            <button type="button" className={`${s.btn} ${s.btnApprove} ${cls}`} onClick={() => open(setAccepting, r)}>Accept</button>
            <button type="button" className={`${s.btn} ${s.btnDanger} ${cls}`} onClick={() => open(setDeclining, r)}>Decline</button>
          </>
        )}
        {st === 'ACCEPTED' && (
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${cls}`} onClick={() => open(setCollecting, r)}>Sample collected</button>
        )}
        {st === 'COLLECTED' && (
          <button type="button" className={`${s.btn} ${s.btnApprove} ${cls}`} onClick={() => open(setResulting, r)}>Upload results</button>
        )}
        {st === 'RESULTED' && !r.invoiced && (
          <button type="button" className={`${s.btn} ${s.btnView} ${cls}`} onClick={() => open(setInvoicing, r)}>Invoice DiGi</button>
        )}
      </>
    );
  };

  const modals = (
    <>
      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${refOf(viewing)} — ${patientName(viewing)}` : ''} size="large">
        {viewing && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}><TestStatus request={viewing} /><Urgency request={viewing} /></div>
            <TestRequestDetails request={viewing} />
            <div className={s.modalActions}>{actionsFor(viewing, true)}</div>
          </>
        )}
      </Modal>

      <Modal isOpen={!!accepting} onClose={() => setAccepting(null)} title={accepting ? `Accept ${refOf(accepting)}` : ''} size="large">
        {accepting && (
          menu.loading ? <div className={s.emptyBlock}>Loading your test menu…</div> : (
            <AcceptTestForm
              key={accepting.id}
              request={accepting}
              menu={tests}
              onClose={() => setAccepting(null)}
              onSubmit={async (body) => {
                await facilityApi.accept(accepting.id, body);
                const r = accepting;
                setAccepting(null);
                changed(`${refOf(r)} accepted — ${body.collectionType === 'HOME' ? 'home collection' : 'walk-in'} booked.`);
              }}
            />
          )
        )}
      </Modal>

      <RejectDialog
        key={declining?.id ?? 'none'}
        target={declining}
        title="Decline test request"
        message={declining ? `Decline ${patientName(declining)}’s tests? Please say why so DiGi can send them to another lab.` : ''}
        confirmLabel="Decline"
        busy={busy}
        onClose={() => setDeclining(null)}
        onConfirm={decline}
      />

      <Modal isOpen={!!collecting} onClose={() => setCollecting(null)} title="Sample collected">
        {collecting && (
          <CollectForm
            key={collecting.id}
            request={collecting}
            onClose={() => setCollecting(null)}
            onSubmit={async (body) => {
              await facilityApi.collect(collecting.id, body);
              const r = collecting;
              setCollecting(null);
              changed(`Sample ${body.sampleId} logged for ${patientName(r)}.`);
            }}
          />
        )}
      </Modal>

      <Modal isOpen={!!resulting} onClose={() => setResulting(null)} title={resulting ? `Results — ${refOf(resulting)}` : ''} size="large">
        {resulting && (
          <ResultsForm
            key={resulting.id}
            request={resulting}
            onClose={() => setResulting(null)}
            onSubmit={async (fd, critical) => {
              await facilityApi.submitResults(resulting.id, fd);
              const r = resulting;
              setResulting(null);
              changed(critical
                ? `Critical results for ${patientName(r)} sent — DiGi’s clinical team has been alerted.`
                : `Results for ${patientName(r)} sent to DiGi Health.`, critical ? 'warning' : 'success');
              setInvoicing({ ...r, status: 'RESULTED' });
            }}
          />
        )}
      </Modal>

      <NewInvoiceModal
        open={!!invoicing}
        request={invoicing}
        words={WORDS.LAB}
        onClose={() => setInvoicing(null)}
        onCreated={(msg) => { setInvoicing(null); showToast('success', msg); onChanged?.(); }}
      />
    </>
  );

  return { view: setViewing, actionsFor, modals };
}

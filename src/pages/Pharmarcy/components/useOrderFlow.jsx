import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import { facilityApi } from '../../../Api/facilityApi';
import { RejectDialog } from '../../Admin/components/ApplicationModals';
import { NewInvoiceModal } from '../../Facility/components/InvoiceModals';
import { WORDS, patientName, refOf, reqStatus } from '../../Facility/facilityFields';
import { AcceptOrderForm, DeliverForm, OrderDetails, OrderStatus, Urgency } from './OrderParts';
import s from '../../Admin/admin.module.css';

/*
 * Drug order workflow for pharmacy admins:
 *   NEW → accept (prices, availability, dispatch time) or decline (reason)
 *   ACCEPTED → out for delivery
 *   DISPATCHED → delivered (who received it) → invoice DiGi
 */
export function useOrderFlow({ showToast, onChanged }) {
  const [viewing, setViewing] = useState(null);
  const [accepting, setAccepting] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [dispatching, setDispatching] = useState(null);
  const [delivering, setDelivering] = useState(null);
  const [invoicing, setInvoicing] = useState(null);
  const [rider, setRider] = useState('');
  const [busy, setBusy] = useState(false);

  const changed = (msg) => {
    showToast('success', msg);
    setViewing(null);
    onChanged?.();
  };

  async function decline(o, reason) {
    if (!reason?.trim()) return showToast('error', 'Give a reason (e.g. out of stock) so DiGi can order elsewhere.');
    setBusy(true);
    try {
      await facilityApi.decline(o.id, reason.trim());
      setDeclining(null);
      changed(`${refOf(o)} declined — DiGi has been told.`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function dispatch() {
    setBusy(true);
    try {
      await facilityApi.dispatch(dispatching.id, { rider: rider.trim() || undefined, dispatchedAt: new Date().toISOString() });
      const o = dispatching;
      setDispatching(null);
      changed(`${patientName(o)}’s order is out for delivery.`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  const actionsFor = (o, large = false) => {
    const st = reqStatus(o);
    const cls = large ? s.btnLarge : '';
    return (
      <>
        {st === 'NEW' && (
          <>
            <button type="button" className={`${s.btn} ${s.btnApprove} ${cls}`} onClick={() => { setViewing(null); setAccepting(o); }}>Accept</button>
            <button type="button" className={`${s.btn} ${s.btnDanger} ${cls}`} onClick={() => { setViewing(null); setDeclining(o); }}>Decline</button>
          </>
        )}
        {st === 'ACCEPTED' && (
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${cls}`} onClick={() => { setViewing(null); setRider(''); setDispatching(o); }}>Out for delivery</button>
        )}
        {st === 'DISPATCHED' && (
          <button type="button" className={`${s.btn} ${s.btnApprove} ${cls}`} onClick={() => { setViewing(null); setDelivering(o); }}>Delivered</button>
        )}
        {st === 'DELIVERED' && !o.invoiced && (
          <button type="button" className={`${s.btn} ${s.btnView} ${cls}`} onClick={() => { setViewing(null); setInvoicing(o); }}>Invoice DiGi</button>
        )}
      </>
    );
  };

  const modals = (
    <>
      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${refOf(viewing)} — ${patientName(viewing)}` : ''} size="large">
        {viewing && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}><OrderStatus order={viewing} /><Urgency order={viewing} /></div>
            <OrderDetails order={viewing} />
            <div className={s.modalActions}>{actionsFor(viewing, true)}</div>
          </>
        )}
      </Modal>

      <Modal isOpen={!!accepting} onClose={() => setAccepting(null)} title={accepting ? `Accept ${refOf(accepting)}` : ''} size="large">
        {accepting && (
          <AcceptOrderForm
            key={accepting.id}
            order={accepting}
            onClose={() => setAccepting(null)}
            onSubmit={async (body) => {
              await facilityApi.accept(accepting.id, body);
              const o = accepting;
              setAccepting(null);
              changed(`${refOf(o)} accepted.`);
            }}
          />
        )}
      </Modal>

      <RejectDialog
        key={declining?.id ?? 'none'}
        target={declining}
        title="Decline order"
        message={declining ? `Decline ${patientName(declining)}’s order? Please say why so DiGi can order elsewhere.` : ''}
        confirmLabel="Decline"
        busy={busy}
        onClose={() => setDeclining(null)}
        onConfirm={decline}
      />

      <ConfirmDialog
        isOpen={!!dispatching}
        title="Out for delivery"
        message={dispatching ? `Mark ${patientName(dispatching)}’s order as out for delivery? The patient is notified.` : ''}
        confirmLabel="Confirm"
        busy={busy}
        onClose={() => setDispatching(null)}
        onConfirm={dispatch}
      >
        <div className={s.field} style={{ marginTop: 14 }}>
          <label htmlFor="odRider">Rider name / phone (optional)</label>
          <input id="odRider" value={rider} onChange={(e) => setRider(e.target.value)} />
        </div>
      </ConfirmDialog>

      <Modal isOpen={!!delivering} onClose={() => setDelivering(null)} title={delivering ? `Delivered — ${refOf(delivering)}` : ''}>
        {delivering && (
          <DeliverForm
            key={delivering.id}
            order={delivering}
            onClose={() => setDelivering(null)}
            onSubmit={async (fd) => {
              await facilityApi.deliver(delivering.id, fd);
              const o = delivering;
              setDelivering(null);
              changed(`Delivery to ${patientName(o)} confirmed.`);
              setInvoicing({ ...o, status: 'DELIVERED' });
            }}
          />
        )}
      </Modal>

      <NewInvoiceModal
        open={!!invoicing}
        request={invoicing}
        words={WORDS.PHARMACY}
        onClose={() => setInvoicing(null)}
        onCreated={(msg) => { setInvoicing(null); showToast('success', msg); onChanged?.(); }}
      />
    </>
  );

  return { view: setViewing, actionsFor, modals };
}

import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { roleLabel } from '../../config/userRoles';
import { formatDate, formatMoney, humanize, matches, pick } from '../../utils/format';
import { Detail, DocumentLinks, Person, SearchBox, Tabs } from './components/Common';
import { RejectDialog } from './components/ApplicationModals';
import { isPending } from './components/status';
import s from './admin.module.css';

/*
 * Two approval queues on one page:
 *  - Staff requests: money requested by the medical director, CNO, finance manager…
 *  - Facility invoices: raised by hospitals, pharmacies and labs for work done
 */
const SOURCES = {
  staff: {
    label: 'Staff requests',
    list: adminApi.financialRequests,
    approve: adminApi.approveFinancialRequest,
    reject: adminApi.rejectFinancialRequest,
    who: (r) => pick(r, 'requestedByName', 'requesterName', 'requestedBy'),
    whoSub: (r) => roleLabel(pick(r, 'requestedByRole', 'requesterRole', 'role')),
    title: (r) => pick(r, 'title', 'purpose', 'description') || 'Financial request',
  },
  invoices: {
    label: 'Facility invoices',
    list: adminApi.invoices,
    approve: adminApi.approveInvoice,
    reject: adminApi.rejectInvoice,
    who: (r) => pick(r, 'facilityName', 'hospitalName', 'pharmacyName', 'laboratoryName'),
    whoSub: (r) => humanize(pick(r, 'facilityType', 'type')),
    title: (r) => pick(r, 'invoiceNumber', 'reference', 'description') || 'Invoice',
  },
};

const STATUS_TABS = [
  ['PENDING', 'Pending'],
  ['APPROVED', 'Approved'],
  ['REJECTED', 'Rejected'],
];

const amountOf = (r) => Number(pick(r, 'amount', 'totalAmount', 'total')) || 0;
const dateOf = (r) => pick(r, 'createdAt', 'submittedAt', 'requestedAt', 'invoiceDate');

export default function FinancialRequests() {
  usePageHeader('Financial Requests', 'Approve spending requests and facility invoices');
  const { toast, showToast, clearToast } = useToast();

  const [source, setSource] = useState('staff');
  const [status, setStatus] = useState('PENDING');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const cfg = SOURCES[source];
  const { data, loading, error, reload } = useApi(() => SOURCES[source].list(status), `${source}-${status}`);
  const pendingStaff = useApi(() => adminApi.financialRequests('PENDING'), 'fin-pending');
  const pendingInvoices = useApi(() => adminApi.invoices('PENDING'), 'inv-pending');

  const all = asList(data);
  const rows = all.filter((r) => matches(query, cfg.title(r), cfg.who(r), r.reference));

  const sum = (list) => list.reduce((t, r) => t + amountOf(r), 0);
  const staffPending = asList(pendingStaff.data);
  const invoicePending = asList(pendingInvoices.data);

  function refreshAll() {
    reload();
    pendingStaff.reload();
    pendingInvoices.reload();
  }

  async function doApprove() {
    setBusy(true);
    try {
      await cfg.approve(approving.id, note.trim() || undefined);
      showToast('success', `${cfg.title(approving)} approved — ${formatMoney(amountOf(approving))}.`);
      setApproving(null);
      setViewing(null);
      refreshAll();
    } catch (err) {
      showToast('error', `Approval failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function doReject(item, reason) {
    setBusy(true);
    try {
      await cfg.reject(item.id, reason);
      showToast('success', `${cfg.title(item)} rejected.`);
      setRejecting(null);
      refreshAll();
    } catch (err) {
      showToast('error', `Rejection failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  const openApprove = (r) => { setNote(''); setApproving(r); };

  const columns = [
    { key: 'title', header: source === 'staff' ? 'Request' : 'Invoice', render: (r) => (
      <div className={s.tdName}>{cfg.title(r)}<small>{humanize(pick(r, 'category', 'type')) !== '—' ? humanize(pick(r, 'category', 'type')) : r.reference}</small></div>
    ) },
    { key: 'who', header: source === 'staff' ? 'Requested by' : 'Facility', render: (r) => <Person name={cfg.who(r)} sub={cfg.whoSub(r) !== '—' ? cfg.whoSub(r) : undefined} /> },
    { key: 'date', header: 'Submitted', render: (r) => formatDate(dateOf(r)) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || status} /> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className={s.money}>{formatMoney(amountOf(r))}</span> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className={s.actions}>
          {status === 'PENDING' && isPending(r) && (
            <>
              <button type="button" className={`${s.btn} ${s.btnApprove}`} onClick={() => openApprove(r)}>Approve</button>
              <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => setRejecting(r)}>Reject</button>
            </>
          )}
          <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(r)}>View</button>
        </div>
      ),
    },
  ];

  const showCount = (state, list) => (state.loading ? '…' : list.length);
  const showSum = (state, list) => (state.loading ? '…' : formatMoney(sum(list)));

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.stats4}>
        <StatCard label="Staff requests pending" value={showCount(pendingStaff, staffPending)} icon="file" color="blue" />
        <StatCard label="Amount requested" value={showSum(pendingStaff, staffPending)} icon="dollar" color="orange" />
        <StatCard label="Invoices pending" value={showCount(pendingInvoices, invoicePending)} icon="briefcase" color="purple" />
        <StatCard label="Invoice total" value={showSum(pendingInvoices, invoicePending)} icon="dollar" color="red" />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <div className={s.toolbarRight}>
            <Tabs
              options={Object.entries(SOURCES).map(([k, v]) => [k, v.label])}
              value={source}
              onChange={(v) => { setSource(v); setQuery(''); }}
            />
            <Tabs options={STATUS_TABS} value={status} onChange={setStatus} />
          </div>
          <SearchBox value={query} onChange={setQuery} placeholder="Search title, requester, reference…" />
        </div>
        <DataTable
          key={`${source}-${status}`}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query ? 'Nothing matches your search.' : `No ${status.toLowerCase()} ${cfg.label.toLowerCase()}.`}
        />
      </div>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? cfg.title(viewing) : ''} size="large">
        {viewing && (
          <>
            <div className={s.details}>
              <Detail label={source === 'staff' ? 'Requested by' : 'Facility'}>{cfg.who(viewing)}</Detail>
              <Detail label={source === 'staff' ? 'Role' : 'Facility type'}>{cfg.whoSub(viewing)}</Detail>
              <Detail label="Amount"><span className={s.money}>{formatMoney(amountOf(viewing))}</span></Detail>
              <Detail label="Status"><StatusBadge status={viewing.status || status} /></Detail>
              <Detail label="Category">{humanize(pick(viewing, 'category', 'type'))}</Detail>
              <Detail label="Submitted">{formatDate(dateOf(viewing))}</Detail>
              {source === 'invoices' && <Detail label="Care request">{pick(viewing, 'careRequestId', 'requestReference')}</Detail>}
              {source === 'invoices' && <Detail label="Patient">{pick(viewing, 'patientName')}</Detail>}
              <Detail label="Details" full>{pick(viewing, 'description', 'purpose', 'notes')}</Detail>
              {Array.isArray(viewing.items) && viewing.items.length > 0 && (
                <div className={`${s.detail} ${s.full}`}>
                  <span>Line items</span>
                  <ul style={{ listStyle: 'none', fontSize: 13.5 }}>
                    {viewing.items.map((it, i) => (
                      <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f2fb' }}>
                        <span>{pick(it, 'name', 'description')} {it.quantity ? `× ${it.quantity}` : ''}</span>
                        <strong>{formatMoney(pick(it, 'amount', 'total', 'price'))}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(viewing.reviewNote || viewing.rejectionReason) && (
                <Detail label="Review note" full>{viewing.reviewNote || viewing.rejectionReason}</Detail>
              )}
              <div className={`${s.detail} ${s.full}`}>
                <span>Attachments</span>
                <DocumentLinks record={viewing} />
              </div>
            </div>
            {status === 'PENDING' && isPending(viewing) && (
              <div className={s.modalActions}>
                <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnLarge}`} onClick={() => { const r = viewing; setViewing(null); setRejecting(r); }}>Reject</button>
                <button type="button" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} onClick={() => openApprove(viewing)}>Approve</button>
              </div>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!approving}
        title="Approve payment"
        message={approving ? `Approve ${formatMoney(amountOf(approving))} for “${cfg.title(approving)}” from ${cfg.who(approving) || 'this requester'}?` : ''}
        confirmLabel="Approve"
        busy={busy}
        onClose={() => setApproving(null)}
        onConfirm={doApprove}
      >
        <div className={s.field} style={{ marginTop: 14 }}>
          <label htmlFor="approveNote">Note (optional)</label>
          <textarea id="approveNote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Pay from Q4 operations budget" />
        </div>
      </ConfirmDialog>

      <RejectDialog
        key={rejecting?.id ?? 'none'}
        target={rejecting}
        title={source === 'staff' ? 'Reject request' : 'Reject invoice'}
        message={rejecting ? `Reject “${cfg.title(rejecting)}” (${formatMoney(amountOf(rejecting))})?` : ''}
        busy={busy}
        onClose={() => setRejecting(null)}
        onConfirm={doReject}
      />
    </>
  );
}

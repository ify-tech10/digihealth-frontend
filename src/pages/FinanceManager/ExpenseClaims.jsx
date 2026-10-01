import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import { financeApi } from '../../Api/financeApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, formatMoney, humanize, matches, pick } from '../../utils/format';
import { Detail, DocumentLinks, SearchBox, Tabs } from '../Admin/components/Common';
import { RejectDialog } from '../Admin/components/ApplicationModals';
import { expenseAmount, expenseStaff, expenseStatus, inMonth, monthKey, nairaShort, sumBy } from './financeFields';
import s from '../Admin/admin.module.css';
import f from './Finance.module.css';

const TABS = [
  ['PENDING', 'Pending'],
  ['APPROVED', 'Approved'],
  ['REJECTED', 'Rejected'],
  ['ALL', 'All'],
];

const claimNo = (e) => pick(e, 'claimNumber', 'reference') || `EXP-${e.id}`;
const submittedOf = (e) => pick(e, 'submittedAt', 'createdAt');

export default function ExpenseClaims() {
  usePageHeader('Expense Claims', 'Staff spending waiting for your approval');
  const { setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const [tab, setTab] = useState('PENDING');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useApi(() => financeApi.expenseClaims(), 'fin-expenses');
  const all = asList(data);
  const pending = all.filter((e) => expenseStatus(e) === 'PENDING');
  const approvedMonth = all.filter((e) => expenseStatus(e) === 'APPROVED' && inMonth(pick(e, 'approvedAt', 'reviewedAt', 'updatedAt'), monthKey()));

  useEffect(() => {
    if (!loading && !error) setBadges({ expenses: pending.length });
  }, [loading, error, pending.length, setBadges]);

  const rows = all
    .filter((e) => (tab === 'ALL' || expenseStatus(e) === tab) && matches(query, claimNo(e), expenseStaff(e), e.category, e.description))
    .sort((a, b) => new Date(submittedOf(b) || 0) - new Date(submittedOf(a) || 0));

  async function approve() {
    setBusy(true);
    try {
      await financeApi.approveExpense(approving.id, note.trim() || undefined);
      showToast('success', `${formatMoney(expenseAmount(approving))} approved for ${expenseStaff(approving) || 'the claimant'}.`);
      setApproving(null);
      setViewing(null);
      reload();
    } catch (err) {
      showToast('error', `Approval failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function reject(e, reason) {
    setBusy(true);
    try {
      await financeApi.rejectExpense(e.id, reason);
      showToast('success', `Claim from ${expenseStaff(e) || 'the claimant'} rejected.`);
      setRejecting(null);
      reload();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  const v = (x) => (loading ? '…' : error ? '—' : x);

  const columns = [
    { key: 'id', header: 'Claim', render: (e) => <span className={f.mono}>{claimNo(e)}</span> },
    { key: 'staff', header: 'Staff', render: (e) => <span className={s.tdName}>{expenseStaff(e) || '—'}</span> },
    { key: 'cat', header: 'Category', render: (e) => humanize(e.category) },
    { key: 'desc', header: 'Description', render: (e) => <span style={{ display: 'block', maxWidth: 240 }}>{pick(e, 'description', 'purpose') || '—'}</span> },
    { key: 'date', header: 'Submitted', render: (e) => <span className={s.muted}>{formatDay(submittedOf(e))}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (e) => <span className={f.amount}>{formatMoney(expenseAmount(e))}</span> },
    { key: 'status', header: 'Status', render: (e) => <StatusBadge status={expenseStatus(e)} /> },
    { key: 'actions', header: 'Actions', render: (e) => (
      <div className={s.actions} style={{ flexWrap: 'nowrap' }}>
        {expenseStatus(e) === 'PENDING' && (
          <>
            <button type="button" className={`${s.btn} ${s.btnApprove}`} onClick={() => { setNote(''); setApproving(e); }}>Approve</button>
            <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => setRejecting(e)}>Reject</button>
          </>
        )}
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(e)}>View</button>
      </div>
    ) },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.stats4}>
        <StatCard accent color="orange" icon="clock" label="Awaiting approval" value={v(nairaShort(sumBy(pending, expenseAmount)))} sub={loading || error ? '' : `${pending.length} claim${pending.length === 1 ? '' : 's'}`} />
        <StatCard accent color="green" icon="check" label="Approved this month" value={v(nairaShort(sumBy(approvedMonth, expenseAmount)))} sub={loading || error ? '' : `${approvedMonth.length} claim${approvedMonth.length === 1 ? '' : 's'}`} />
        <StatCard accent color="red" icon="lock" label="Rejected" value={v(all.filter((e) => expenseStatus(e) === 'REJECTED').length)} />
        <StatCard accent color="blue" icon="file" label="All claims" value={v(all.length)} />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS} value={tab} onChange={setTab} />
          <SearchBox value={query} onChange={setQuery} placeholder="Search staff, category…" />
        </div>
        <DataTable key={tab} columns={columns} rows={rows} loading={loading} error={error} emptyText={query ? 'No claims match your search.' : tab === 'PENDING' ? 'Nothing waiting for approval.' : 'No claims here.'} />
      </div>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${claimNo(viewing)} — ${expenseStaff(viewing) || ''}` : ''}>
        {viewing && (
          <>
            <div className={s.details}>
              <Detail label="Staff">{expenseStaff(viewing)}</Detail>
              <Detail label="Role">{humanize(pick(viewing, 'staffRole', 'role'))}</Detail>
              <Detail label="Category">{humanize(viewing.category)}</Detail>
              <Detail label="Submitted">{formatDay(submittedOf(viewing))}</Detail>
              <Detail label="Amount"><span className={f.big}>{formatMoney(expenseAmount(viewing))}</span></Detail>
              <Detail label="Status"><StatusBadge status={expenseStatus(viewing)} /></Detail>
              <Detail label="Description" full>{pick(viewing, 'description', 'purpose')}</Detail>
              {pick(viewing, 'reviewNote', 'rejectionReason') && <Detail label="Review note" full>{pick(viewing, 'reviewNote', 'rejectionReason')}</Detail>}
              <div className={`${s.detail} ${s.full}`}>
                <span>Receipts</span>
                <DocumentLinks record={viewing} />
              </div>
            </div>
            {expenseStatus(viewing) === 'PENDING' && (
              <div className={s.modalActions}>
                <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnLarge}`} onClick={() => { const e = viewing; setViewing(null); setRejecting(e); }}>Reject</button>
                <button type="button" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} onClick={() => { setNote(''); setApproving(viewing); }}>Approve</button>
              </div>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!approving}
        title="Approve expense"
        message={approving ? `Approve ${formatMoney(expenseAmount(approving))} for ${expenseStaff(approving) || 'this claim'}? It will be reimbursed with the next payroll.` : ''}
        confirmLabel="Approve"
        busy={busy}
        onClose={() => setApproving(null)}
        onConfirm={approve}
      >
        <div className={s.field} style={{ marginTop: 14 }}>
          <label htmlFor="exNote">Note (optional)</label>
          <textarea id="exNote" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </ConfirmDialog>

      <RejectDialog
        key={rejecting?.id ?? 'none'}
        target={rejecting}
        title="Reject expense claim"
        message={rejecting ? `Reject ${expenseStaff(rejecting) || 'this'}’s claim for ${formatMoney(expenseAmount(rejecting))}?` : ''}
        confirmLabel="Reject"
        busy={busy}
        onClose={() => setRejecting(null)}
        onConfirm={reject}
      />
    </>
  );
}

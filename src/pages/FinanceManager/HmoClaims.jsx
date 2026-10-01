import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { financeApi } from '../../Api/financeApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, formatMoney, matches, pick } from '../../utils/format';
import { Detail, SearchBox, Tabs } from '../Admin/components/Common';
import { NewClaimModal, SettleModal } from './components/FinanceModals';
import { claimAmount, claimStatus, isClaimOpen, nairaShort, num, periodLabel, sumBy } from './financeFields';
import s from '../Admin/admin.module.css';
import f from './Finance.module.css';

const TABS = [
  ['ALL', 'All'],
  ['PENDING', 'Pending'],
  ['QUERIED', 'Queried'],
  ['PAID', 'Paid'],
];

const claimNo = (c) => pick(c, 'claimNumber', 'reference') || `HMO-${c.id}`;
const orgOf = (c) => pick(c, 'organisationName', 'organisation', 'org');
const hmoOf = (c) => pick(c, 'hmoProvider', 'hmoName', 'hmo');
const receivedOf = (c) => num(pick(c, 'amountReceived', 'amountPaid'));

export default function HmoClaims() {
  usePageHeader('HMO Billing', 'Claims to insurers and what they’ve paid');
  const { setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const [tab, setTab] = useState('ALL');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [following, setFollowing] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [settling, setSettling] = useState(null);

  const { data, loading, error, reload } = useApi(() => financeApi.hmoClaims(), 'fin-hmo');
  const all = asList(data);
  const open = all.filter(isClaimOpen);
  const paid = all.filter((c) => claimStatus(c) === 'PAID');
  const claimedTotal = sumBy(paid, claimAmount);
  const recovery = claimedTotal ? Math.round((sumBy(paid, receivedOf) / claimedTotal) * 100) : null;

  useEffect(() => {
    if (!loading && !error) setBadges({ hmo: open.length });
  }, [loading, error, open.length, setBadges]);

  const rows = all
    .filter((c) => (tab === 'ALL' || claimStatus(c) === tab) && matches(query, claimNo(c), orgOf(c), hmoOf(c)))
    .sort((a, b) => isClaimOpen(b) - isClaimOpen(a) || new Date(pick(b, 'submittedAt', 'createdAt') || 0) - new Date(pick(a, 'submittedAt', 'createdAt') || 0));

  async function followUp() {
    setBusy(true);
    try {
      await financeApi.followUpHmoClaim(following.id, note.trim() || undefined);
      showToast('success', `Follow-up logged for ${claimNo(following)} with ${hmoOf(following)}.`);
      setFollowing(null);
      reload();
    } catch (err) {
      showToast('error', `Couldn’t log the follow-up: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function settle(c, body) {
    await financeApi.markHmoClaimPaid(c.id, { amountReceived: body.amount, paidAt: body.date, reference: body.reference });
    setSettling(null);
    showToast('success', `${formatMoney(body.amount)} from ${hmoOf(c)} recorded.`);
    reload();
  }

  const v = (x) => (loading ? '…' : error ? '—' : x);

  const columns = [
    { key: 'id', header: 'Claim', render: (c) => <span className={f.mono}>{claimNo(c)}</span> },
    { key: 'org', header: 'Organisation', render: (c) => <span className={s.tdName}>{orgOf(c) || '—'}</span> },
    { key: 'hmo', header: 'HMO', render: (c) => hmoOf(c) || '—' },
    { key: 'period', header: 'Period', render: (c) => periodLabel(pick(c, 'servicePeriod', 'period')) },
    { key: 'members', header: 'Members', align: 'right', render: (c) => <strong>{pick(c, 'members', 'memberCount') ?? '—'}</strong> },
    { key: 'amount', header: 'Claimed', align: 'right', render: (c) => <span className={f.amount}>{formatMoney(claimAmount(c))}</span> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={claimStatus(c)} /> },
    { key: 'actions', header: 'Actions', render: (c) => (
      <div className={s.actions} style={{ flexWrap: 'nowrap' }}>
        {isClaimOpen(c) && <button type="button" className={`${s.btn} ${s.btnApprove}`} onClick={() => setSettling(c)}>Mark paid</button>}
        {isClaimOpen(c) && <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => { setNote(''); setFollowing(c); }}>Follow up</button>}
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(c)}>View</button>
      </div>
    ) },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.stats4}>
        <StatCard accent color="orange" icon="clock" label="Awaiting insurers" value={v(nairaShort(sumBy(open, claimAmount)))} sub={loading || error ? '' : `${open.length} claim${open.length === 1 ? '' : 's'}`} />
        <StatCard accent color="green" icon="check" label="Paid out" value={v(nairaShort(sumBy(paid, receivedOf) || claimedTotal))} sub={loading || error ? '' : `${paid.length} claim${paid.length === 1 ? '' : 's'}`} />
        <StatCard accent color="blue" icon="shield" label="Recovery rate" value={v(recovery != null ? `${recovery}%` : '—')} sub="Received vs claimed" />
        <StatCard accent color="red" icon="alert" label="Queried" value={v(all.filter((c) => claimStatus(c) === 'QUERIED').length)} sub="Insurer wants more info" />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS} value={tab} onChange={setTab} />
          <div className={s.toolbarRight}>
            <SearchBox value={query} onChange={setQuery} placeholder="Search claim, organisation, HMO…" />
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setCreating(true)}><Icon name="plus" /> New claim</button>
          </div>
        </div>
        <DataTable key={tab} columns={columns} rows={rows} loading={loading} error={error} emptyText={query ? 'No claims match your search.' : 'No claims here.'} />
      </div>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${claimNo(viewing)} — ${orgOf(viewing) || ''}` : ''}>
        {viewing && (
          <div className={s.details}>
            <Detail label="Organisation">{orgOf(viewing)}</Detail>
            <Detail label="HMO">{hmoOf(viewing)}</Detail>
            <Detail label="Service period">{periodLabel(pick(viewing, 'servicePeriod', 'period'))}</Detail>
            <Detail label="Members">{pick(viewing, 'members', 'memberCount')}</Detail>
            <Detail label="Claimed"><span className={f.big}>{formatMoney(claimAmount(viewing))}</span></Detail>
            <Detail label="Status"><StatusBadge status={claimStatus(viewing)} /></Detail>
            <Detail label="Submitted">{formatDay(pick(viewing, 'submittedAt', 'createdAt'))}</Detail>
            {receivedOf(viewing) > 0 && <Detail label="Received">{formatMoney(receivedOf(viewing))}</Detail>}
            {pick(viewing, 'paidAt') && <Detail label="Paid on">{formatDay(viewing.paidAt)}</Detail>}
            {pick(viewing, 'lastFollowUpAt') && <Detail label="Last follow-up">{formatDay(viewing.lastFollowUpAt)}</Detail>}
            {pick(viewing, 'queryNote', 'insurerNote') && <Detail label="Insurer’s query" full>{pick(viewing, 'queryNote', 'insurerNote')}</Detail>}
            {viewing.notes && <Detail label="Notes" full>{viewing.notes}</Detail>}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!following}
        title="Follow up claim"
        message={following ? `Log a follow-up on ${claimNo(following)} with ${hmoOf(following)}? The HMO’s contact will be emailed.` : ''}
        confirmLabel="Send follow-up"
        busy={busy}
        onClose={() => setFollowing(null)}
        onConfirm={followUp}
      >
        <div className={s.field} style={{ marginTop: 14 }}>
          <label htmlFor="fuNote">Note (optional)</label>
          <textarea id="fuNote" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </ConfirmDialog>

      <SettleModal
        target={settling}
        title="Record HMO payout"
        intro={settling ? `${hmoOf(settling)} paying for ${orgOf(settling)} — ${periodLabel(pick(settling, 'servicePeriod', 'period'))}. Enter what actually arrived; a short payment is fine.` : ''}
        defaultAmount={settling ? claimAmount(settling) : 0}
        onClose={() => setSettling(null)}
        onConfirm={settle}
      />
      <NewClaimModal open={creating} onClose={() => setCreating(false)} onCreated={(msg) => { setCreating(false); showToast('success', msg); reload(); }} />
    </>
  );
}

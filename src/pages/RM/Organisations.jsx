import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DataTable from '../../components/DataTable/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { rmApi } from '../../Api/rmApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, humanize, matches, pick } from '../../utils/format';
import { SearchBox, Tabs } from '../Admin/components/Common';
import { OrgHmoModal, OrgOnboarding } from './components/RmModals';
import { useConfirmHmo } from './useConfirmHmo';
import { hmoStatus, isConfirmed, orgEmail, orgName } from './rmFields';
import s from '../Admin/admin.module.css';

/*
 * Two views of the same list:
 *   mode="all" — every organisation this RM onboarded (Organisations page)
 *   mode="hmo" — plan, members and expiry, with confirm (HMO Status page)
 */
export default function Organisations({ mode = 'all' }) {
  const hmoView = mode === 'hmo';
  usePageHeader(hmoView ? 'HMO Status' : 'Organisations', hmoView ? 'Confirm and track each organisation’s HMO cover' : 'Companies you’ve onboarded into the HMO');
  const { setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const [tab, setTab] = useState('ALL');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [onboarding, setOnboarding] = useState(false);

  const { data, loading, error, reload } = useApi(() => rmApi.organisations(), 'rm-orgs');
  const all = asList(data).slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const pending = all.filter((o) => hmoStatus(o) === 'PENDING').length;
  const hmo = useConfirmHmo({ showToast, onChanged: () => { reload(); setViewing(null); } });

  useEffect(() => {
    if (!loading && !error) setBadges({ pendingHmo: pending });
  }, [loading, error, pending, setBadges]);

  const rows = all.filter((o) =>
    (tab === 'ALL' || (tab === 'CONFIRMED' ? isConfirmed(o) : hmoStatus(o) === tab)) &&
    matches(query, orgName(o), orgEmail(o), o.industry, pick(o, 'hmoPlan', 'planName'), pick(o, 'hrContactName')));

  const confirmBtn = (o) => !isConfirmed(o) && (
    <button type="button" className={`${s.btn} ${s.btnApprove}`} disabled={hmo.busyId === o.id} onClick={() => hmo.setAsking(o)}>
      {hmo.busyId === o.id ? 'Confirming…' : 'Confirm'}
    </button>
  );

  const columns = hmoView
    ? [
      { key: 'org', header: 'Organisation', render: (o) => <div className={s.tdName}>{orgName(o)}<small>{orgEmail(o) || ''}</small></div> },
      { key: 'plan', header: 'Plan', render: (o) => pick(o, 'hmoPlan', 'planName') || '—' },
      { key: 'members', header: 'Members', align: 'right', render: (o) => pick(o, 'memberCount', 'members') ?? '—' },
      { key: 'expiry', header: 'Expiry', render: (o) => {
        const exp = pick(o, 'hmoExpiry', 'expiryDate');
        const soon = exp && (new Date(exp) - new Date()) / 86400000 <= 30;
        return <span style={soon ? { color: '#dc2626', fontWeight: 600 } : undefined}>{formatDay(exp)}</span>;
      } },
      { key: 'status', header: 'HMO status', render: (o) => <StatusBadge status={hmoStatus(o)} /> },
      { key: 'actions', header: 'Actions', render: (o) => (
        <div className={s.actions} style={{ flexWrap: 'nowrap' }}>
          {confirmBtn(o)}
          <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(o)}>View</button>
        </div>
      ) },
    ]
    : [
      { key: 'org', header: 'Organisation', render: (o) => <div className={s.tdName}>{orgName(o)}<small>{orgEmail(o) || ''}</small></div> },
      { key: 'industry', header: 'Industry', render: (o) => humanize(o.industry) || '—' },
      { key: 'contact', header: 'HR contact', render: (o) => <div>{pick(o, 'hrContactName') || '—'}<div className={s.muted} style={{ fontSize: 12 }}>{pick(o, 'phoneNumber')}</div></div> },
      { key: 'date', header: 'Onboarded', render: (o) => <span className={s.muted}>{formatDay(o.createdAt)}</span> },
      { key: 'status', header: 'HMO status', render: (o) => <StatusBadge status={hmoStatus(o)} /> },
      { key: 'view', header: '', render: (o) => <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(o)}>View HMO</button> },
    ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      <div className={s.card}>
        <div className={s.toolbar}>
          {hmoView ? (
            <Tabs options={[['ALL', 'All'], ['CONFIRMED', 'Confirmed'], ['PENDING', `Pending${pending ? ` (${pending})` : ''}`]]} value={tab} onChange={setTab} />
          ) : (
            <h3 className={s.toolbarTitle}>All organisations</h3>
          )}
          <div className={s.toolbarRight}>
            <SearchBox value={query} onChange={setQuery} placeholder="Search organisation, plan, contact…" />
            {!hmoView && <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setOnboarding(true)}><Icon name="plus" /> Onboard organisation</button>}
          </div>
        </div>
        <DataTable key={tab} columns={columns} rows={rows} loading={loading} error={error} emptyText={query ? 'No organisations match your search.' : tab === 'PENDING' ? 'Nothing waiting for confirmation.' : 'No organisations onboarded yet.'} />
      </div>

      <OrgHmoModal org={viewing} busy={hmo.busyId === viewing?.id} onClose={() => setViewing(null)} onConfirm={hmo.confirm} />
      <ConfirmDialog
        isOpen={!!hmo.asking}
        title="Confirm HMO"
        message={hmo.asking ? `Confirm ${orgName(hmo.asking)}’s HMO cover? Their employees can then book covered care.` : ''}
        confirmLabel="Confirm HMO"
        busy={!!hmo.busyId}
        onClose={() => hmo.setAsking(null)}
        onConfirm={() => hmo.confirm(hmo.asking)}
      />
      <OrgOnboarding
        open={onboarding}
        onClose={() => setOnboarding(false)}
        onCreated={(name) => { setOnboarding(false); showToast('success', `${name} onboarded — waiting for admin approval.`); reload(); }}
      />
    </>
  );
}

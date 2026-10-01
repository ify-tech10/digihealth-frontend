import { useState } from 'react';
import Badge from '../../components/Badge/Badge';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import DataTable from '../../components/DataTable/DataTable';
import StatCard from '../../components/Statcard/Statcard';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { facilityApi } from '../../Api/facilityApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatMoney, matches } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { SearchBox, Tabs } from '../Admin/components/Common';
import { TestMenuModal } from './components/TestMenuForm';
import { menuTest, turnaroundLabel } from './labCentreFields';
import s from '../Admin/admin.module.css';
import l from './Laboratory.module.css';

const TABS = [
  ['ACTIVE', 'Offered'],
  ['PAUSED', 'Paused'],
  ['ALL', 'All'],
];

/* The tests this lab runs for DiGi Health, and what it charges. */
export default function TestMenu() {
  usePageHeader('Test Menu & Prices', 'What DiGi Health can order from you, and at what price');
  const { toast, showToast, clearToast } = useToast();
  const [tab, setTab] = useState('ACTIVE');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useApi(() => facilityApi.tests(), 'fac-tests-LAB');
  const all = asList(data).map(menuTest).sort((a, b) => a.name.localeCompare(b.name));
  const rows = all.filter((t) => (tab === 'ALL' || (tab === 'ACTIVE' ? t.active : !t.active)) && matches(query, t.name, t.code, t.category, t.sampleType));
  const active = all.filter((t) => t.active);
  const v = (x) => (loading ? '…' : error ? '—' : x);

  async function save(body) {
    if (editing?.id) await facilityApi.updateTest(editing.id, body);
    else await facilityApi.createTest(body);
    setEditing(null);
    showToast('success', `${body.name} ${editing?.id ? 'updated' : 'added to your menu'}.`);
    reload();
  }

  async function toggle(t) {
    try {
      await facilityApi.updateTest(t.id, { active: !t.active });
      showToast('success', t.active ? `${t.name} paused — DiGi won’t send new requests for it.` : `${t.name} is offered again.`);
      reload();
    } catch (err) {
      showToast('error', err.message);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await facilityApi.deleteTest(removing.id);
      showToast('success', `${removing.name} removed.`);
      setRemoving(null);
      reload();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    downloadCsv('test-menu.csv', ['Test', 'Code', 'Category', 'Sample', 'Fasting', 'Turnaround (hrs)', 'Price', 'Home collection', 'Offered'],
      rows.map((t) => [t.name, t.code, t.category, t.sampleType, t.fasting ? 'Yes' : 'No', t.turnaroundHours, t.price, t.homeCollection ? 'Yes' : 'No', t.active ? 'Yes' : 'No']));
  }

  const columns = [
    { key: 'name', header: 'Test', render: (t) => <div className={s.tdName}>{t.name}<small>{[t.code, t.category].filter(Boolean).join(' · ')}</small></div> },
    { key: 'sample', header: 'Sample', render: (t) => <span>{t.sampleType || '—'}{t.fasting && <span className={l.tag}>Fasting</span>}</span> },
    { key: 'tat', header: 'Turnaround', render: (t) => turnaroundLabel(t.turnaroundHours) },
    { key: 'home', header: 'Home collection', render: (t) => (t.homeCollection ? 'Yes' : <span className={s.muted}>Walk-in only</span>) },
    { key: 'price', header: 'Price', align: 'right', render: (t) => <span className={s.money}>{formatMoney(t.price)}</span> },
    { key: 'status', header: 'Status', render: (t) => <Badge variant={t.active ? 'active' : 'done'}>{t.active ? 'Offered' : 'Paused'}</Badge> },
    { key: 'actions', header: 'Actions', render: (t) => (
      <div className={s.actions} style={{ flexWrap: 'nowrap' }}>
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setEditing(t)}>Edit</button>
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => toggle(t)}>{t.active ? 'Pause' : 'Offer'}</button>
        <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => setRemoving(t)} aria-label={`Remove ${t.name}`}><Icon name="trash" /></button>
      </div>
    ) },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      <div className={s.stats3}>
        <StatCard accent color="blue" icon="flask" label="Tests offered" value={v(active.length)} sub={loading || error ? '' : `${all.length - active.length} paused`} />
        <StatCard accent color="green" icon="home" label="Home collection" value={v(active.filter((t) => t.homeCollection).length)} sub="Tests you can collect at home" />
        <StatCard accent color="orange" icon="clock" label="Same-day results" value={v(active.filter((t) => t.turnaroundHours && t.turnaroundHours <= 24).length)} sub="24 hours or less" />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS} value={tab} onChange={setTab} />
          <div className={s.toolbarRight}>
            <SearchBox value={query} onChange={setQuery} placeholder="Search test, code, category…" />
            <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={exportCsv} disabled={!rows.length}><Icon name="download" /> CSV</button>
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setEditing({})}><Icon name="plus" /> Add test</button>
          </div>
        </div>
        <DataTable key={tab} columns={columns} rows={rows} loading={loading} error={error} emptyText={query ? 'No tests match your search.' : tab === 'ACTIVE' ? 'No tests on your menu yet — add the tests you run so DiGi can order them.' : 'Nothing here.'} />
      </div>

      <TestMenuModal open={!!editing} test={editing} onClose={() => setEditing(null)} onSave={save} />
      <ConfirmDialog
        isOpen={!!removing}
        title="Remove test"
        message={removing ? `Remove ${removing.name} from your menu? Requests already sent to you aren’t affected. To stop it for a while, pause it instead.` : ''}
        confirmLabel="Remove"
        danger
        busy={busy}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
      />
    </>
  );
}

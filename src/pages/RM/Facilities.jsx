import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { rmApi } from '../../Api/rmApi';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, matches, pick } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { SearchBox, Tabs } from '../Admin/components/Common';
import { FacilityModal, FacilityOnboarding } from './components/RmModals';
import { FACILITY_TYPES, TYPE_LABEL, facilityStatus, flattenFacilities } from './rmFields';
import s from '../Admin/admin.module.css';

export default function Facilities() {
  usePageHeader('Facilities', 'Hospitals, pharmacies and laboratories on DiGi Health');
  const { toast, showToast, clearToast } = useToast();

  const [tab, setTab] = useState('ALL');
  const [query, setQuery] = useState('');
  const [onboarding, setOnboarding] = useState(false);
  const [viewing, setViewing] = useState(null);

  const { data, loading, error, reload } = useApi(() => rmApi.facilities(), 'rm-facilities');
  const all = flattenFacilities(data);
  const rows = all.filter((f) => (tab === 'ALL' || f.kind === tab) && matches(query, f.displayName, f.area, f.address, f.email, pick(f, 'contactPerson', 'contactLabManager')));

  const tabs = [['ALL', `All${loading ? '' : ` (${all.length})`}`], ...FACILITY_TYPES.map(([k, , plural]) => [k, `${plural}${loading ? '' : ` (${all.filter((f) => f.kind === k).length})`}`])];

  function exportCsv() {
    downloadCsv('facilities.csv', ['Name', 'Type', 'Area / LGA', 'Address', 'Phone', 'Email', 'Contact', 'Status', 'Onboarded'],
      rows.map((f) => [f.displayName, TYPE_LABEL[f.kind], f.area, f.address, f.phoneNumber, f.email, pick(f, 'contactPerson', 'contactLabManager'), facilityStatus(f), formatDay(f.createdAt)]));
  }

  const columns = [
    { key: 'name', header: 'Facility', render: (f) => <div className={s.tdName}>{f.displayName}<small>{f.email || ''}</small></div> },
    { key: 'type', header: 'Type', render: (f) => TYPE_LABEL[f.kind] },
    { key: 'area', header: 'Location', render: (f) => f.area || f.address || '—' },
    { key: 'contact', header: 'Contact', render: (f) => <div>{pick(f, 'contactPerson', 'contactLabManager') || '—'}<div className={s.muted} style={{ fontSize: 12 }}>{f.phoneNumber}</div></div> },
    { key: 'date', header: 'Onboarded', render: (f) => <span className={s.muted}>{formatDay(f.createdAt)}</span> },
    { key: 'status', header: 'Status', render: (f) => <StatusBadge status={facilityStatus(f)} /> },
    { key: 'view', header: '', render: (f) => <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(f)}>View</button> },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={tabs} value={tab} onChange={setTab} />
          <div className={s.toolbarRight}>
            <SearchBox value={query} onChange={setQuery} placeholder="Search name, area, contact…" />
            <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={exportCsv} disabled={!rows.length}><Icon name="download" /> CSV</button>
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setOnboarding(true)}><Icon name="plus" /> Onboard facility</button>
          </div>
        </div>
        <DataTable key={tab} columns={columns} rows={rows} rowKey="key" loading={loading} error={error} emptyText={query ? 'No facilities match your search.' : 'No facilities here yet.'} />
      </div>

      <FacilityOnboarding
        open={onboarding}
        onClose={() => setOnboarding(false)}
        onCreated={(name, kind) => { setOnboarding(false); showToast('success', `${name} onboarded.`); setTab(kind); reload(); }}
      />
      <FacilityModal facility={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

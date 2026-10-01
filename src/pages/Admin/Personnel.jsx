import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { usePageHeader } from '../../hooks/usePageHeader';
import { locationLabel } from '../../config/locations';
import { formatDay, humanize, matches, pick } from '../../utils/format';
import { Person, SearchBox } from './components/Common';
import { ApplicationModal } from './components/ApplicationModals';
import s from './admin.module.css';

export default function Personnel() {
  usePageHeader('Personnel', 'Approved nurses, caregivers and specialists');

  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [viewing, setViewing] = useState(null);

  const { data, loading, error } = useApi(() => adminApi.providers('APPROVED'), 'approved');
  const all = asList(data);

  const roles = [...new Set(all.map((p) => p.serviceProviderType).filter(Boolean))].sort();
  const areas = new Set(all.map((p) => p.locationArea).filter(Boolean));

  const rows = all.filter(
    (p) =>
      (!role || p.serviceProviderType === role) &&
      matches(query, p.fullName, p.email, p.phoneNumber, locationLabel(p.locationArea))
  );

  const columns = [
    { key: 'name', header: 'Name', render: (p) => <Person name={p.fullName} sub={p.email} /> },
    { key: 'role', header: 'Role', render: (p) => humanize(p.serviceProviderType) },
    { key: 'area', header: 'Coverage', render: (p) => locationLabel(p.locationArea) },
    { key: 'avail', header: 'Availability', render: (p) => humanize(p.availabilityType) },
    { key: 'phone', header: 'Phone', render: (p) => p.phoneNumber || '—' },
    { key: 'since', header: 'Joined', render: (p) => formatDay(pick(p, 'approvedAt', 'appliedAt')) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status || 'APPROVED'} /> },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(p)}>View</button>
      ),
    },
  ];

  return (
    <>
      <div className={s.stats3}>
        <StatCard label="Active personnel" value={loading ? '…' : all.length} icon="heart" color="purple" />
        <StatCard label="Roles" value={loading ? '…' : roles.length} icon="briefcase" color="blue" />
        <StatCard label="Areas covered" value={loading ? '…' : areas.size} icon="mapPin" color="green" />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <select className={s.select} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
            <option value="">All roles</option>
            {roles.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
          </select>
          <SearchBox value={query} onChange={setQuery} placeholder="Search name, phone, area…" />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query || role ? 'No personnel match your filters.' : 'No approved personnel yet.'}
        />
      </div>

      <ApplicationModal application={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

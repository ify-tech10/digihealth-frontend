import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import StatCard from '../../components/Statcard/Statcard';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { cnoApi } from '../../Api/cnoApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { locationLabel } from '../../config/locations';
import { humanize, matches } from '../../utils/format';
import { SearchBox } from '../Admin/components/Common';
import { ApplicationModal } from '../Admin/components/ApplicationModals';
import AddProviderModal from './components/AddProviderModal';
import { load, memberCapacity, memberColor, memberInitials, memberName, memberPatients, memberRating, memberRole } from './teamFields';
import s from '../Admin/admin.module.css';
import c from './Cno.module.css';

export default function Team() {
  usePageHeader('Nurses & Caregivers', 'Your team, their workload and capacity');
  const { toast, showToast, clearToast } = useToast();

  const [role, setRole] = useState('');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [adding, setAdding] = useState(false);

  const { data, loading, error, reload } = useApi(() => cnoApi.team(), 'cno-team');
  const all = asList(data);

  const roles = [...new Set(all.map((n) => n.serviceProviderType).filter(Boolean))].sort();
  const full = all.filter((n) => load(n).pct >= 100).length;
  const withCapacity = all.filter((n) => load(n).pct < 80).length;
  const rated = all.filter((n) => memberRating(n) > 0);
  const avgRating = rated.length ? (rated.reduce((t, n) => t + memberRating(n), 0) / rated.length).toFixed(1) : null;

  const rows = all
    .filter((n) => (!role || n.serviceProviderType === role) && matches(query, memberName(n), n.email, locationLabel(n.locationArea)))
    .sort((a, b) => load(b).pct - load(a).pct);

  const columns = [
    { key: 'name', header: 'Name', render: (n) => (
      <div className={s.person}>
        <div className={s.avatar} style={{ background: memberColor(n) }}>{memberInitials(n)}</div>
        <div className={s.tdName}>{memberName(n)}<small>{n.email}</small></div>
      </div>
    ) },
    { key: 'role', header: 'Role', render: (n) => memberRole(n) },
    { key: 'area', header: 'Area', render: (n) => locationLabel(n.locationArea) },
    { key: 'load', header: 'Workload', render: (n) => {
      const l = load(n);
      return (
        <div style={{ minWidth: 130 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy)' }}>{memberPatients(n)}/{memberCapacity(n)} patients <span className={s.muted} style={{ fontWeight: 500 }}>· {l.label}</span></div>
          <div className={c.bar}><div className={c.barFill} style={{ width: `${l.pct}%`, background: l.color }} /></div>
        </div>
      );
    } },
    { key: 'avail', header: 'Availability', render: (n) => humanize(n.availabilityType) },
    { key: 'rating', header: 'Rating', render: (n) => (memberRating(n) > 0 ? <span className={c.rating}>{memberRating(n).toFixed(1)}★</span> : '—') },
    { key: 'view', header: '', render: (n) => <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(n)}>View</button> },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.stats4}>
        <StatCard accent color="teal" icon="users" label="Active providers" value={loading ? '…' : all.length} />
        <StatCard accent color="green" icon="check" label="Can take new patients" value={loading ? '…' : withCapacity} />
        <StatCard accent color="red" icon="clock" label="At full capacity" value={loading ? '…' : full} />
        <StatCard accent color="orange" icon="heart" label="Average rating" value={loading ? '…' : avgRating ? `${avgRating}★` : '—'} />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <div className={s.toolbarRight}>
            <select className={s.select} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
              <option value="">All roles</option>
              {roles.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
            </select>
            <SearchBox value={query} onChange={setQuery} placeholder="Search name, email, area…" />
          </div>
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setAdding(true)}>
            <Icon name="plus" /> Add provider
          </button>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query || role ? 'No one matches your filters.' : 'No active providers yet.'}
        />
      </div>

      <ApplicationModal application={viewing} onClose={() => setViewing(null)} />
      <AddProviderModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(msg) => { setAdding(false); showToast('success', msg); reload(); }}
      />
    </>
  );
}

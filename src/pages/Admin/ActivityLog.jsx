import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import Icon from '../../components/Icon/Icon';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { usePageHeader } from '../../hooks/usePageHeader';
import { USER_ROLE_GROUPS, roleLabel } from '../../config/userRoles';
import { formatDate, humanize, matches, pick, toISODate } from '../../utils/format';
import { Person, SearchBox } from './components/Common';
import s from './admin.module.css';

const actorOf = (a) => pick(a, 'actorName', 'userName', 'performedByName', 'performedBy');
const roleOf = (a) => pick(a, 'actorRole', 'userRole', 'role');
const actionOf = (a) => pick(a, 'action', 'activityType', 'event');
const detailOf = (a) => pick(a, 'description', 'details', 'message');
const whenOf = (a) => pick(a, 'createdAt', 'timestamp', 'occurredAt');
const entityOf = (a) => {
  const type = pick(a, 'entityType', 'targetType');
  const id = pick(a, 'entityId', 'targetId');
  return type ? `${humanize(type)}${id != null ? ` #${id}` : ''}` : '—';
};

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

function downloadCsv(rows) {
  const header = ['Time', 'User', 'Role', 'Action', 'Details', 'Record'];
  const lines = rows.map((a) =>
    [whenOf(a), actorOf(a), roleLabel(roleOf(a)), humanize(actionOf(a)), detailOf(a), entityOf(a)]
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const url = URL.createObjectURL(new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `digihealth-activity-${toISODate(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ActivityLog() {
  usePageHeader('Activity Log', 'Everything every user has done on the platform');

  const [role, setRole] = useState('');
  const [from, setFrom] = useState(() => daysAgo(7));
  const [to, setTo] = useState(() => toISODate(new Date()));
  const [query, setQuery] = useState('');

  const key = `${role}|${from}|${to}`;
  const { data, loading, error } = useApi(
    () => adminApi.activity({ role: role || undefined, from, to }),
    key
  );

  const rows = asList(data)
    .filter((a) => matches(query, actorOf(a), actionOf(a), detailOf(a), entityOf(a)))
    .sort((a, b) => new Date(whenOf(b) || 0) - new Date(whenOf(a) || 0));

  const columns = [
    { key: 'when', header: 'Time', render: (a) => <span className={s.muted}>{formatDate(whenOf(a))}</span> },
    { key: 'who', header: 'User', render: (a) => <Person name={actorOf(a)} sub={roleLabel(roleOf(a))} /> },
    { key: 'action', header: 'Action', render: (a) => <strong className={s.tdName}>{humanize(actionOf(a))}</strong> },
    { key: 'detail', header: 'Details', render: (a) => <span style={{ whiteSpace: 'normal' }}>{detailOf(a) || '—'}</span> },
    { key: 'entity', header: 'Record', render: (a) => entityOf(a) },
  ];

  return (
    <div className={s.card}>
      <div className={s.toolbar}>
        <div className={s.toolbarRight}>
          <select className={s.select} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
            <option value="">All roles</option>
            {USER_ROLE_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </optgroup>
            ))}
          </select>
          <label className={s.muted} style={{ fontSize: 12.5 }}>
            From{' '}
            <input className={s.select} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className={s.muted} style={{ fontSize: 12.5 }}>
            To{' '}
            <input className={s.select} type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className={s.toolbarRight}>
          <SearchBox value={query} onChange={setQuery} placeholder="Search user, action, details…" />
          <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={() => downloadCsv(rows)} disabled={!rows.length}>
            <Icon name="download" /> Export CSV
          </button>
        </div>
      </div>
      <DataTable
        key={key}
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        pageSize={20}
        emptyText={query ? 'No activity matches your search.' : 'No activity in this period.'}
      />
    </div>
  );
}

import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import StatCard from '../../components/Statcard/Statcard';
import Icon from '../../components/Icon/Icon';
import { cnoApi } from '../../Api/cnoApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { usePageHeader } from '../../hooks/usePageHeader';
import { humanize, pick, toISODate } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { memberColor, memberInitials, memberName } from './teamFields';
import s from '../Admin/admin.module.css';
import c from './Cno.module.css';
import a from '../Caregivers/Availability.module.css';

const monthKey = (d) => toISODate(d).slice(0, 7);
function shiftMonth(key, n) {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
}

/* Tolerant readers for a performance row */
const scheduledOf = (r) => Number(pick(r, 'visitsScheduled', 'scheduledVisits') ?? 0);
const completedOf = (r) => Number(pick(r, 'visitsCompleted', 'completedVisits') ?? 0);
function rateOf(r) {
  const explicit = pick(r, 'completionRate');
  if (explicit != null) return Number(explicit);
  return scheduledOf(r) ? Math.round((completedOf(r) / scheduledOf(r)) * 100) : null;
}
const ratingOf = (r) => Number(pick(r, 'avgRating', 'rating') ?? 0);
const reportsOf = (r) => Number(pick(r, 'reportsSubmitted', 'visitReports') ?? 0);
const onTimeOf = (r) => pick(r, 'onTimeReportRate', 'reportsOnTimeRate');

const SORTS = [
  ['completion', 'Completion rate', (r) => rateOf(r) ?? -1],
  ['visits', 'Visits completed', completedOf],
  ['rating', 'Rating', ratingOf],
  ['reports', 'Reports submitted', reportsOf],
];

/* Completion ≥90% good, ≥75% watch, below that needs attention. */
const rateColor = (v) => (v == null ? '#c5cde8' : v >= 90 ? '#22c55e' : v >= 75 ? '#f97316' : '#ef4444');

export default function Performance() {
  usePageHeader('Performance', 'How each provider is doing this month');

  const [month, setMonth] = useState(monthKey(new Date()));
  const [sortBy, setSortBy] = useState('completion');
  const { data, loading, error } = useApi(() => cnoApi.performance(month), month);

  const all = asList(data);
  const sortFn = SORTS.find(([k]) => k === sortBy)[2];
  const rows = all.slice().sort((x, y) => sortFn(y) - sortFn(x));

  const totalSched = all.reduce((t, r) => t + scheduledOf(r), 0);
  const totalDone = all.reduce((t, r) => t + completedOf(r), 0);
  const rated = all.filter((r) => ratingOf(r) > 0);
  const avgRating = rated.length ? (rated.reduce((t, r) => t + ratingOf(r), 0) / rated.length).toFixed(1) : null;
  const needsAttention = all.filter((r) => (rateOf(r) ?? 100) < 75).length;

  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  function exportCsv() {
    downloadCsv(`team-performance-${month}.csv`,
      ['Provider', 'Role', 'Visits scheduled', 'Visits completed', 'Completion %', 'Avg rating', 'Reports submitted', 'Reports on time %'],
      rows.map((r) => [memberName(r), humanize(pick(r, 'serviceProviderType', 'role')), scheduledOf(r), completedOf(r), rateOf(r) ?? '', ratingOf(r) || '', reportsOf(r), onTimeOf(r) ?? '']));
  }

  const columns = [
    { key: 'name', header: 'Provider', render: (r) => (
      <div className={s.person}>
        <div className={s.avatar} style={{ background: memberColor(r) }}>{memberInitials(r)}</div>
        <div className={s.tdName}>{memberName(r)}<small>{humanize(pick(r, 'serviceProviderType', 'role'))}</small></div>
      </div>
    ) },
    { key: 'visits', header: 'Visits', render: (r) => `${completedOf(r)} / ${scheduledOf(r)}` },
    { key: 'rate', header: 'Completion', render: (r) => {
      const v = rateOf(r);
      return (
        <div style={{ minWidth: 120 }}>
          <strong style={{ fontSize: 12.5, color: 'var(--navy)' }}>{v == null ? '—' : `${v}%`}</strong>
          <div className={c.bar}><div className={c.barFill} style={{ width: `${v ?? 0}%`, background: rateColor(v) }} /></div>
        </div>
      );
    } },
    { key: 'rating', header: 'Rating', render: (r) => (ratingOf(r) > 0 ? <span className={c.rating}>{ratingOf(r).toFixed(1)}★</span> : '—') },
    { key: 'reports', header: 'Reports', render: (r) => reportsOf(r) },
    { key: 'ontime', header: 'On-time reports', render: (r) => (onTimeOf(r) != null ? `${onTimeOf(r)}%` : '—') },
    { key: 'patients', header: 'Active patients', render: (r) => pick(r, 'activePatients', 'patients') ?? '—' },
  ];

  return (
    <>
      <div className={`${s.card} ${s.spaced}`}>
        <div className={a.monthBar}>
          <button type="button" className={a.navBtn} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><Icon name="chevronLeft" /></button>
          <h3>{label}</h3>
          <button type="button" className={a.navBtn} onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= monthKey(new Date())} aria-label="Next month"><Icon name="chevronRight" /></button>
        </div>
      </div>

      <div className={s.stats4}>
        <StatCard accent color="teal" icon="check" label="Team completion rate" value={loading ? '…' : totalSched ? `${Math.round((totalDone / totalSched) * 100)}%` : '—'} sub={loading ? '' : `${totalDone} of ${totalSched} visits`} />
        <StatCard accent color="green" icon="activity" label="Visits completed" value={loading ? '…' : totalDone} />
        <StatCard accent color="orange" icon="heart" label="Average rating" value={loading ? '…' : avgRating ? `${avgRating}★` : '—'} />
        <StatCard accent color="red" icon="bell" label="Below 75% completion" value={loading ? '…' : needsAttention} sub="Worth a check-in" />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <label className={s.muted} style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8 }}>
            Sort by
            <select className={s.select} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={exportCsv} disabled={!rows.length}>
            <Icon name="download" /> Export CSV
          </button>
        </div>
        <DataTable key={month} columns={columns} rows={rows} loading={loading} error={error} emptyText="No activity recorded for this month." rowKey="providerId" />
      </div>
    </>
  );
}

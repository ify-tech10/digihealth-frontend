import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import StatCard from '../../components/Statcard/Statcard';
import Icon from '../../components/Icon/Icon';
import { hmoApi } from '../../Api/hmoApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { usePageHeader } from '../../hooks/usePageHeader';
import { COVERED_SERVICES } from '../../config/userRoles';
import { formatMoney, humanize, matches, pick } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { SearchBox } from '../Admin/components/Common';
import { limitOf, num } from './hmoFields';
import s from '../Admin/admin.module.css';
import h from './Hmo.module.css';

const SERVICE = Object.fromEntries(COVERED_SERVICES);
const short = (v) => (v >= 1e6 ? `₦${Math.round(v / 1e5) / 10}M` : v >= 1e4 ? `₦${Math.round(v / 1e3)}K` : formatMoney(v));

export default function Reports() {
  usePageHeader('Reports', 'How your employees are using the plan');

  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [query, setQuery] = useState('');

  const util = useApi(() => hmoApi.utilisation(year), `hmo-util-${year}`);
  const sub = useApi(() => hmoApi.subscription(), 'hmo-subscription');
  const d = util.data || {};

  const monthly = Array.from({ length: year === thisYear ? new Date().getMonth() + 1 : 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    const row = asList(d.monthly).find((x) => String(pick(x, 'month', 'period') || '').slice(0, 7) === key) || {};
    return { key, label: new Date(year, i, 1).toLocaleDateString('en-GB', { month: 'short' }), full: new Date(year, i, 1).toLocaleDateString('en-GB', { month: 'long' }), amount: num(pick(row, 'amount', 'cost')), requests: num(pick(row, 'requests', 'count')) };
  });
  const byService = asList(d.byService).map((x) => ({ name: SERVICE[pick(x, 'service', 'category')] || humanize(pick(x, 'service', 'category')), amount: num(pick(x, 'amount', 'cost')) })).sort((a, b) => b.amount - a.amount);
  const byEmployee = asList(d.byEmployee).map((x) => ({ ...x, amount: num(pick(x, 'amount', 'cost')), requests: num(pick(x, 'requests', 'count')) }));

  const spent = monthly.reduce((t, m) => t + m.amount, 0);
  const requests = monthly.reduce((t, m) => t + m.requests, 0);
  const users = byEmployee.filter((x) => x.requests > 0).length;
  const limit = sub.data ? limitOf(sub.data) : 0;
  const peak = Math.max(1, ...monthly.map((m) => m.amount));
  const svcMax = Math.max(1, ...byService.map((x) => x.amount));

  const rows = byEmployee
    .filter((x) => matches(query, pick(x, 'name', 'employeeName'), x.department))
    .sort((a, b) => b.amount - a.amount);

  const v = (x) => (util.loading ? '…' : util.error ? '—' : x);

  function exportCsv() {
    downloadCsv(`hmo-utilisation-${year}.csv`, ['Employee', 'Department', 'Care requests', 'Amount'], rows.map((x) => [pick(x, 'name', 'employeeName'), x.department, x.requests, x.amount]));
  }

  const columns = [
    { key: 'name', header: 'Employee', render: (x) => <span className={s.tdName}>{pick(x, 'name', 'employeeName') || '—'}</span> },
    { key: 'dept', header: 'Department', render: (x) => x.department || '—' },
    { key: 'req', header: 'Care requests', align: 'right', render: (x) => x.requests },
    { key: 'amount', header: 'Benefit used', align: 'right', render: (x) => <span className={s.money}>{formatMoney(x.amount)}</span> },
  ];

  return (
    <>
      <div className={s.card} style={{ marginBottom: 20 }}>
        <div className={s.toolbar}>
          <h3 className={s.toolbarTitle}>Utilisation</h3>
          <select className={s.select} value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className={s.stats4}>
        <StatCard color="purple" icon="dollar" label="Benefit used" value={v(short(spent))} sub={limit && !util.loading ? `${Math.round((spent / limit) * 100)}% of ${short(limit)} limit` : ''} />
        <StatCard color="blue" icon="file" label="Care requests" value={v(requests)} />
        <StatCard color="green" icon="users" label="Employees who used care" value={v(users)} />
        <StatCard color="orange" icon="activity" label="Average per request" value={v(requests ? short(spent / requests) : '—')} />
      </div>

      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Benefit used by month</h3><span className={s.muted} style={{ fontSize: 12 }}>{year}</span></div>
          {util.loading ? (
            <div className={s.emptyBlock}>Loading…</div>
          ) : !spent ? (
            <div className={s.emptyBlock}><Icon name="activity" /><p>{util.error ? 'Reports are unavailable right now.' : `No care used in ${year}.`}</p></div>
          ) : (
            <div className={h.months}>
              <div className={h.plot} role="list">
                {monthly.map((m) => (
                  <div key={m.key} className={h.mCol} role="listitem" tabIndex={0} aria-label={`${m.full}: ${formatMoney(m.amount)}, ${m.requests} requests`}>
                    <div className={h.mBar} style={{ height: `${(m.amount / peak) * 100}%` }} />
                    <span className={h.tip}><strong>{m.full}</strong><br />{formatMoney(m.amount)} · {m.requests} request{m.requests === 1 ? '' : 's'}</span>
                  </div>
                ))}
              </div>
              <div className={h.mLabels}>{monthly.map((m) => <span key={m.key}>{m.label}</span>)}</div>
            </div>
          )}
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>By service</h3></div>
          {util.loading ? (
            <div className={s.emptyBlock}>Loading…</div>
          ) : !byService.length ? (
            <div className={s.emptyBlock}><p>{util.error ? 'Reports are unavailable right now.' : 'Nothing to show yet.'}</p></div>
          ) : (
            <div className={h.bars}>
              {byService.map((x) => (
                <div key={x.name} className={h.barRow}>
                  <span>{x.name}</span>
                  <div className={h.barTrack}><div className={h.barFill} style={{ width: `${(x.amount / svcMax) * 100}%` }} /></div>
                  <span className={h.barVal}>{short(x.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <h3 className={s.toolbarTitle}>By employee</h3>
          <div className={s.toolbarRight}>
            <SearchBox value={query} onChange={setQuery} placeholder="Search employee, department…" />
            <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={exportCsv} disabled={!rows.length}><Icon name="download" /> CSV</button>
          </div>
        </div>
        <DataTable key={year} columns={columns} rows={rows} rowKey="employeeId" loading={util.loading} error={util.error} emptyText={query ? 'No one matches your search.' : 'No usage recorded yet.'} />
      </div>
    </>
  );
}

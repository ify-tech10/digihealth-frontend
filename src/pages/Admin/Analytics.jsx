import { useMemo } from 'react';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { usePageHeader } from '../../hooks/usePageHeader';
import { locationLabel } from '../../config/locations';
import { humanize, toISODate } from '../../utils/format';
import s from './admin.module.css';
import styles from './Analytics.module.css';

const WEEKS = 8;
const TOP_N = 6;

/* Count items by key, largest first; everything past TOP_N folds into "Other". */
function tally(items, keyFn, labelFn = (k) => k) {
  const counts = new Map();
  items.forEach((it) => {
    const k = keyFn(it) || 'UNKNOWN';
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, TOP_N).map(([k, v]) => ({ key: k, label: k === 'UNKNOWN' ? 'Not specified' : labelFn(k), value: v }));
  const rest = sorted.slice(TOP_N).reduce((sum, [, v]) => sum + v, 0);
  if (rest) top.push({ key: '__other', label: 'Other', value: rest });
  return top;
}

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/* Round the axis max up to a friendly number. */
function niceMax(n) {
  if (n <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  const steps = [1, 2, 2.5, 5, 10];
  return steps.map((st) => st * pow).find((v) => v >= n);
}

export default function Analytics() {
  usePageHeader('Analytics', 'Demand, coverage and team at a glance');

  const care = useApi(() => adminApi.careRequests(undefined), 'all-care');
  const approved = useApi(() => adminApi.providers('APPROVED'), 'approved');

  const requests = asList(care.data);
  const personnel = asList(approved.data);
  const loading = care.loading || approved.loading;

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = requests.filter((r) => {
      const d = new Date(r.submittedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = requests.filter((r) => {
      const d = new Date(r.submittedAt);
      return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
    }).length;
    const handled = requests.filter((r) => ['ASSIGNED', 'COMPLETED'].includes(String(r.status).toUpperCase())).length;
    return {
      thisMonth,
      delta: thisMonth - lastMonth,
      rate: requests.length ? Math.round((handled / requests.length) * 100) : 0,
    };
  }, [requests]);

  const weekly = useMemo(() => {
    const start = mondayOf(new Date());
    const weeks = Array.from({ length: WEEKS }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() - 7 * (WEEKS - 1 - i));
      return { key: toISODate(d), date: d, value: 0 };
    });
    requests.forEach((r) => {
      if (!r.submittedAt) return;
      const k = toISODate(mondayOf(r.submittedAt));
      const w = weeks.find((x) => x.key === k);
      if (w) w.value += 1;
    });
    return weeks;
  }, [requests]);

  const byService = useMemo(() => tally(requests, (r) => r.serviceNeeded, humanize), [requests]);
  const byArea = useMemo(() => tally(requests, (r) => r.locationArea, locationLabel), [requests]);
  const byStatus = useMemo(() => tally(requests, (r) => String(r.status || '').toUpperCase()), [requests]);
  const byRole = useMemo(() => tally(personnel, (p) => p.serviceProviderType, humanize), [personnel]);

  const error = care.error || approved.error;

  return (
    <>
      {error && !requests.length && <div className={styles.errorBanner}>{error}</div>}

      <div className={s.stats4}>
        <StatCard label="Total requests" value={loading ? '…' : requests.length} icon="file" color="blue" />
        <StatCard
          label="Requests this month"
          value={loading ? '…' : stats.thisMonth}
          icon="trendingUp"
          color="green"
          delta={loading ? undefined : `${stats.delta >= 0 ? '+' : ''}${stats.delta} vs last month`}
          deltaType={stats.delta >= 0 ? 'up' : 'down'}
        />
        <StatCard label="Assigned or completed" value={loading ? '…' : `${stats.rate}%`} icon="check" color="purple" />
        <StatCard label="Active personnel" value={loading ? '…' : personnel.length} icon="heart" color="orange" />
      </div>

      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.cardHeader}>
          <h3>Care requests per week</h3>
          <span className={styles.caption}>Last {WEEKS} weeks</span>
        </div>
        <ColumnChart data={weekly} loading={loading} />
      </div>

      <div className={s.grid2}>
        <BarCard title="Requests by service" rows={byService} loading={loading} />
        <BarCard title="Requests by location" rows={byArea} loading={loading} />
      </div>

      <div className={s.grid2}>
        <BarCard
          title="Requests by status"
          rows={byStatus}
          loading={loading}
          renderLabel={(r) => (r.key === '__other' || r.key === 'UNKNOWN' ? r.label : <StatusBadge status={r.key} />)}
        />
        <BarCard title="Personnel by role" rows={byRole} loading={loading} />
      </div>
    </>
  );
}

/* ── Vertical columns, one series ── */
function ColumnChart({ data, loading }) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [max, max / 2, 0];

  if (loading) return <div className={s.emptyBlock}>Loading…</div>;

  return (
    <div className={styles.columnChart}>
      <div className={styles.yAxis} aria-hidden="true">
        {ticks.map((t) => <span key={t}>{Number.isInteger(t) ? t : t.toFixed(1)}</span>)}
      </div>

      <div className={styles.plot}>
        <div className={styles.grid} aria-hidden="true">
          {ticks.map((t) => <span key={t} />)}
        </div>

        <div className={styles.columns} role="list">
          {data.map((w) => {
            const label = w.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            return (
              <div
                key={w.key}
                className={styles.col}
                role="listitem"
                tabIndex={0}
                aria-label={`Week of ${label}: ${w.value} request${w.value === 1 ? '' : 's'}`}
              >
                <div className={styles.colTrack}>
                  <div className={styles.colBar} style={{ height: `${(w.value / max) * 100}%` }} />
                </div>
                <span className={styles.tip}>
                  <strong>{w.value}</strong> request{w.value === 1 ? '' : 's'}
                  <br />week of {label}
                </span>
                <span className={styles.xLabel}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Horizontal ranked bars, one series ── */
function BarCard({ title, rows, loading, renderLabel }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((sum, r) => sum + r.value, 0);

  return (
    <div className={s.card}>
      <div className={s.cardHeader}>
        <h3>{title}</h3>
      </div>
      {loading ? (
        <div className={s.emptyBlock}>Loading…</div>
      ) : !rows.length ? (
        <div className={s.emptyBlock}>No data yet.</div>
      ) : (
        <ul className={styles.bars}>
          {rows.map((r) => {
            const pct = total ? Math.round((r.value / total) * 100) : 0;
            return (
              <li key={r.key} className={styles.barRow} title={`${r.label}: ${r.value} (${pct}%)`}>
                <div className={styles.barLabel}>{renderLabel ? renderLabel(r) : r.label}</div>
                <div className={styles.barTrack}>
                  <div className={styles.bar} style={{ width: `${(r.value / max) * 100}%` }} />
                </div>
                <div className={styles.barValue}>
                  {r.value}
                  <span>{pct}%</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

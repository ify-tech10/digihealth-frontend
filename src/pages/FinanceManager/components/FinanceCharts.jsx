import Icon from '../../../components/Icon/Icon';
import { formatMoney } from '../../../utils/format';
import { nairaShort, num } from '../financeFields';
import s from '../../Admin/admin.module.css';
import f from '../Finance.module.css';

/* A round axis maximum: 4.2M -> 5M, 860K -> 1M */
function niceMax(v) {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  const steps = [1, 2, 2.5, 5, 10];
  return steps.map((x) => x * mag).find((x) => x >= v);
}

/*
 * Grouped monthly bars.
 * months: [{ label, full, values: { key: number } }]
 * series: [{ key, label, color }]
 */
export function MonthlyChart({ months, series, loading, error, empty = 'No figures for this year yet.' }) {
  if (loading) return <div className={s.emptyBlock}>Loading…</div>;
  const hasData = months.some((m) => series.some((x) => num(m.values[x.key]) > 0));
  if (!hasData) return <div className={s.emptyBlock}><Icon name="trendingUp" /><p>{error ? 'Figures are unavailable right now.' : empty}</p></div>;

  const max = niceMax(Math.max(...months.flatMap((m) => series.map((x) => num(m.values[x.key])))));

  return (
    <div className={f.chart}>
      <div className={f.legend}>
        {series.map((x) => <span key={x.key}><i className={f.sw} style={{ background: x.color }} /> {x.label}</span>)}
      </div>
      <div className={f.plot}>
        <div className={f.yAxis} aria-hidden="true"><span>{nairaShort(max)}</span><span>{nairaShort(max / 2)}</span><span>₦0</span></div>
        <div className={f.area}>
          <div className={f.grid} aria-hidden="true"><span /><span /><span /></div>
          <div className={f.cols} role="list">
            {months.map((m) => (
              <div
                key={m.label}
                className={f.col}
                role="listitem"
                tabIndex={0}
                aria-label={`${m.full}: ${series.map((x) => `${x.label} ${formatMoney(num(m.values[x.key]))}`).join(', ')}`}
              >
                <div className={f.colTrack}>
                  {series.map((x) => (
                    <div key={x.key} className={f.bar} style={{ height: `${(num(m.values[x.key]) / max) * 100}%`, background: x.color }} />
                  ))}
                </div>
                <span className={f.tip}>
                  <strong>{m.full}</strong>
                  {series.map((x) => <span key={x.key} style={{ display: 'block' }}>{x.label}: {formatMoney(num(m.values[x.key]))}</span>)}
                </span>
                <span className={f.xLab}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const PALETTE = ['#1d4ed8', '#0891b2', '#9333ea', '#16a34a', '#f97316', '#dc2626', '#b45309', '#64748b'];

/* slices: [{ label, value }] */
export function Donut({ slices, loading, error, centerLabel = 'Total' }) {
  if (loading) return <div className={s.emptyBlock}>Loading…</div>;
  const items = slices.filter((x) => num(x.value) > 0).sort((a, b) => num(b.value) - num(a.value));
  if (!items.length) return <div className={s.emptyBlock}><Icon name="activity" /><p>{error ? 'Figures are unavailable right now.' : 'No revenue recorded this month.'}</p></div>;

  const total = items.reduce((t, x) => t + num(x.value), 0);
  const R = 15.9155; /* circumference 100 */
  /* each slice starts where the previous ones end */
  const arcs = items.map((x, i) => ({
    ...x,
    pct: (num(x.value) / total) * 100,
    start: items.slice(0, i).reduce((t, y) => t + (num(y.value) / total) * 100, 0),
  }));

  return (
    <div className={f.donutWrap}>
      <div className={f.donut}>
        <svg viewBox="0 0 42 42" role="img" aria-label={items.map((x) => `${x.label} ${Math.round((num(x.value) / total) * 100)}%`).join(', ')}>
          <circle cx="21" cy="21" r={R} fill="none" stroke="#eef0f8" strokeWidth="6" />
          {arcs.map((x, i) => {
            const len = Math.max(x.pct - 0.6, 0.2);
            return (
              <circle
                key={x.label}
                cx="21"
                cy="21"
                r={R}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth="6"
                strokeDasharray={`${len} ${100 - len}`}
                strokeDashoffset={-x.start}
              />
            );
          })}
        </svg>
        <div className={f.donutCenter}><strong>{nairaShort(total)}</strong><span>{centerLabel}</span></div>
      </div>
      <div className={f.dLegend}>
        {items.map((x, i) => (
          <div key={x.label} className={f.dItem}>
            <span className={f.dDot} style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className={f.dLabel}>{x.label}</span>
            <span className={f.dVal}>{nairaShort(x.value)}</span>
            <span className={f.dPct}>{Math.round((num(x.value) / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* lines: [{ category, budgeted, actual }] */
export function BudgetBars({ lines }) {
  const max = Math.max(1, ...lines.map((l) => Math.max(num(l.budgeted), num(l.actual))));
  return (
    <div className={f.budgetList}>
      <div className={f.legend} style={{ marginBottom: 0 }}>
        <span><i className={f.sw} style={{ background: '#dbeafe' }} /> Budgeted</span>
        <span><i className={f.sw} style={{ background: '#1d4ed8' }} /> Actual</span>
      </div>
      {lines.map((l) => {
        const pct = num(l.budgeted) ? Math.round((num(l.actual) / num(l.budgeted)) * 100) : null;
        return (
          <div key={l.category} className={f.bRow}>
            <div className={f.bTop}>
              <strong>{l.category}</strong>
              <span>{nairaShort(l.actual)} of {nairaShort(l.budgeted)}{pct != null ? ` · ${pct}%` : ''}</span>
            </div>
            <div className={f.bTrack} style={{ marginBottom: 3 }}>
              <div className={f.bFill} style={{ width: `${(num(l.budgeted) / max) * 100}%`, background: '#dbeafe' }} />
            </div>
            <div className={f.bTrack}>
              <div className={f.bFill} style={{ width: `${(num(l.actual) / max) * 100}%`, background: pct != null && pct > 100 ? '#ef4444' : '#1d4ed8' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

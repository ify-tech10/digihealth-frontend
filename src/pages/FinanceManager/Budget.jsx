import { useState } from 'react';
import Modal from '../../components/Modal/Modal';
import Badge from '../../components/Badge/Badge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { financeApi } from '../../Api/financeApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatMoney, pick } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { BudgetBars } from './components/FinanceCharts';
import { monthKey, monthLabel, num, shiftMonth, usageColor } from './financeFields';
import s from '../Admin/admin.module.css';
import f from './Finance.module.css';

const readLines = (data) =>
  (Array.isArray(data) ? data : asList(pick(data || {}, 'lines', 'items')))
    .map((l) => ({ category: pick(l, 'category', 'name', 'label'), budgeted: num(pick(l, 'budgeted', 'budget', 'planned')), actual: num(pick(l, 'actual', 'spent')) }))
    .filter((l) => l.category);

const pctOf = (l) => (l.budgeted ? Math.round((l.actual / l.budgeted) * 100) : null);

export default function Budget() {
  usePageHeader('Budget vs Actual', 'Spending against this month’s budget');
  const { toast, showToast, clearToast } = useToast();
  const [month, setMonth] = useState(monthKey());
  const [editing, setEditing] = useState(false);

  const budget = useApi(() => financeApi.budget(month), `fin-budget-${month}`);
  const summary = useApi(() => financeApi.summary(month), `fin-summary-${month}`);
  const lines = readLines(budget.data);
  const totals = lines.reduce((t, l) => ({ budgeted: t.budgeted + l.budgeted, actual: t.actual + l.actual }), { budgeted: 0, actual: 0 });
  const totalPct = totals.budgeted ? Math.round((totals.actual / totals.budgeted) * 100) : null;

  const sm = summary.data || {};
  const revenue = num(pick(sm, 'revenue', 'totalRevenue'));
  const expenses = num(pick(sm, 'expenses', 'totalExpenses'));
  const pct = (x) => (x == null || Number.isNaN(x) ? '—' : `${Math.round(x * 10) / 10}%`);
  const kpis = [
    { label: 'Collection rate', sub: 'Invoices paid on time', color: '#16a34a', icon: 'trendingUp', value: pick(sm, 'collectionRate') },
    { label: 'Expense ratio', sub: 'Expenses vs revenue', color: '#f97316', icon: 'dollar', value: pick(sm, 'expenseRatio') ?? (revenue ? (expenses / revenue) * 100 : null) },
    { label: 'HMO recovery rate', sub: 'Claims paid by insurers', color: '#1d4ed8', icon: 'shield', value: pick(sm, 'hmoRecoveryRate') },
    { label: 'Net profit margin', sub: 'Net profit / revenue', color: '#9333ea', icon: 'layers', value: pick(sm, 'netMargin') ?? (revenue ? ((revenue - expenses) / revenue) * 100 : null) },
  ];

  function exportCsv() {
    downloadCsv(
      `budget-${month}.csv`,
      ['Category', 'Budgeted', 'Actual', 'Variance', '% used'],
      [...lines.map((l) => [l.category, l.budgeted, l.actual, l.actual - l.budgeted, pctOf(l)]), ['Total', totals.budgeted, totals.actual, totals.actual - totals.budgeted, totalPct]]
    );
  }

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={`${s.card} ${s.spaced}`}>
        <div className={f.monthBar}>
          <button type="button" className={f.navBtn} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><Icon name="chevronLeft" /></button>
          <h3>{monthLabel(month)}</h3>
          <button type="button" className={f.navBtn} onClick={() => setMonth(shiftMonth(month, 1))} disabled={month > monthKey()} aria-label="Next month"><Icon name="chevronRight" /></button>
        </div>
      </div>

      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3>Budget by category</h3>
            <span className={s.muted} style={{ fontSize: 12 }}>{totalPct != null ? `${totalPct}% used overall` : ''}</span>
          </div>
          {budget.loading ? (
            <div className={s.emptyBlock}>Loading…</div>
          ) : !lines.length ? (
            <div className={s.emptyBlock}>
              <Icon name="activity" />
              <p>{budget.error ? 'The budget is unavailable right now.' : `No budget set for ${monthLabel(month)}.`}</p>
              {!budget.error && <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setEditing(true)}>Set budget</button>}
            </div>
          ) : (
            <BudgetBars lines={lines} />
          )}
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>KPI overview</h3><span className={s.muted} style={{ fontSize: 12 }}>{monthLabel(month)}</span></div>
          <div className={f.kpis}>
            {kpis.map((k) => (
              <div key={k.label} className={f.kpi}>
                <div className={f.kpiIcon} style={{ background: `${k.color}18`, color: k.color }}><Icon name={k.icon} /></div>
                <div className={f.kpiInfo}><h4>{k.label}</h4><p>{k.sub}</p></div>
                <div className={f.kpiVal} style={{ color: k.color }}>{summary.loading ? '…' : pct(k.value == null ? null : Number(k.value))}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <h3 className={s.toolbarTitle}>Line-by-line breakdown</h3>
          <div className={s.toolbarRight}>
            <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={exportCsv} disabled={!lines.length}><Icon name="download" /> CSV</button>
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setEditing(true)} disabled={budget.loading || !!budget.error}><Icon name="edit" /> Edit budget</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className={s.previewTable}>
            <thead><tr><th>Category</th><th>Budgeted</th><th>Actual</th><th>Variance</th><th>% used</th><th>Status</th></tr></thead>
            <tbody>
              {budget.loading || !lines.length ? (
                <tr><td colSpan={6} className={s.previewEmpty}>{budget.loading ? 'Loading…' : budget.error || 'No budget lines yet.'}</td></tr>
              ) : (
                <>
                  {lines.map((l) => {
                    const p = pctOf(l);
                    const variance = l.actual - l.budgeted;
                    return (
                      <tr key={l.category}>
                        <td className={s.tdName}>{l.category}</td>
                        <td>{formatMoney(l.budgeted)}</td>
                        <td>{formatMoney(l.actual)}</td>
                        <td><span className={variance > 0 ? f.minus : f.plus}>{variance > 0 ? '+' : ''}{formatMoney(variance)}</span></td>
                        <td>
                          <div className={f.progress}>
                            <div className={f.bTrack}><div className={f.bFill} style={{ width: `${Math.min(p ?? 0, 100)}%`, background: usageColor(p ?? 0) }} /></div>
                            <span>{p != null ? `${p}%` : '—'}</span>
                          </div>
                        </td>
                        <td>{p == null ? '—' : p > 100 ? <Badge variant="urgent">Over budget</Badge> : p > 85 ? <Badge variant="pending">Near limit</Badge> : <Badge variant="active">On track</Badge>}</td>
                      </tr>
                    );
                  })}
                  <tr className={f.totalRow}>
                    <td>Total</td>
                    <td>{formatMoney(totals.budgeted)}</td>
                    <td>{formatMoney(totals.actual)}</td>
                    <td>{totals.actual - totals.budgeted > 0 ? '+' : ''}{formatMoney(totals.actual - totals.budgeted)}</td>
                    <td>{totalPct != null ? `${totalPct}%` : '—'}</td>
                    <td />
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={editing} onClose={() => setEditing(false)} title={`Budget — ${monthLabel(month)}`} size="large">
        {editing && (
          <BudgetForm
            month={month}
            lines={lines}
            onClose={() => setEditing(false)}
            onSaved={() => { setEditing(false); showToast('success', `${monthLabel(month)} budget saved.`); budget.reload(); }}
          />
        )}
      </Modal>
    </>
  );
}

const DEFAULT_CATEGORIES = ['Staff salaries', 'Provider payouts', 'Medical supplies', 'Lab & diagnostics', 'Facility bills', 'Transport & logistics', 'IT & telecom', 'Training', 'Marketing', 'Admin & office'];

function BudgetForm({ month, lines, onClose, onSaved }) {
  const [rows, setRows] = useState(() =>
    (lines.length ? lines : DEFAULT_CATEGORIES.map((c) => ({ category: c, budgeted: 0 }))).map((l, i) => ({ key: i, category: l.category, budgeted: l.budgeted ? String(l.budgeted) : '' }))
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key, field) => (e) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: e.target.value } : r)));
  const total = rows.reduce((t, r) => t + num(r.budgeted), 0);

  async function submit(e) {
    e.preventDefault();
    const clean = rows.filter((r) => r.category.trim());
    const names = clean.map((r) => r.category.trim().toLowerCase());
    if (!clean.length) return setError('Add at least one category.');
    if (new Set(names).size !== names.length) return setError('Each category can only appear once.');
    if (clean.some((r) => num(r.budgeted) < 0)) return setError('Amounts can’t be negative.');
    setError('');
    setBusy(true);
    try {
      await financeApi.setBudget(month, clean.map((r) => ({ category: r.category.trim(), budgeted: num(r.budgeted) })));
      onSaved();
    } catch (err) {
      setError(`Couldn’t save: ${err.message}`);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => (
          <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 34px', gap: 8, alignItems: 'center' }}>
            <div className={s.field}><input aria-label="Category" value={r.category} onChange={update(r.key, 'category')} placeholder="Category" /></div>
            <div className={s.field}><input aria-label={`Budget for ${r.category || 'category'}`} type="number" min="0" value={r.budgeted} onChange={update(r.key, 'budgeted')} placeholder="₦" /></div>
            <button type="button" className={`${s.btn} ${s.btnDanger}`} style={{ padding: 8, justifyContent: 'center' }} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label={`Remove ${r.category || 'row'}`}><Icon name="trash" /></button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={() => setRows((rs) => [...rs, { key: Date.now(), category: '', budgeted: '' }])}><Icon name="plus" /> Add category</button>
        <span className={f.amount}>Total {formatMoney(total)}</span>
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 12 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Save budget'}</button>
      </div>
    </form>
  );
}

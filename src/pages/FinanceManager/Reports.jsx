import { useState } from 'react';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { financeApi } from '../../Api/financeApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, formatMoney, humanize, pick, toISODate } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { MonthlyChart } from './components/FinanceCharts';
import { num } from './financeFields';
import s from '../Admin/admin.module.css';
import f from './Finance.module.css';

const REPORTS = [
  ['PROFIT_AND_LOSS', 'Profit & Loss statement'],
  ['REVENUE_SUMMARY', 'Revenue summary'],
  ['EXPENSES', 'Expense report'],
  ['INVOICE_AGEING', 'Invoice ageing'],
  ['HMO_CLAIMS', 'HMO claims'],
  ['PAYROLL', 'Payroll summary'],
  ['BUDGET_VS_ACTUAL', 'Budget vs actual'],
  ['CASH_FLOW', 'Cash flow statement'],
];

/* Preset periods → [from, to] as YYYY-MM-DD */
function rangeFor(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const q = Math.floor(m / 3);
  const d = (yy, mm, dd) => toISODate(new Date(yy, mm, dd));
  switch (preset) {
    case 'LAST_MONTH': return [d(y, m - 1, 1), d(y, m, 0)];
    case 'THIS_QUARTER': return [d(y, q * 3, 1), d(y, q * 3 + 3, 0)];
    case 'LAST_QUARTER': return [d(y, q * 3 - 3, 1), d(y, q * 3, 0)];
    case 'THIS_YEAR': return [d(y, 0, 1), d(y, 11, 31)];
    case 'LAST_YEAR': return [d(y - 1, 0, 1), d(y - 1, 11, 31)];
    default: return [d(y, m, 1), d(y, m + 1, 0)];
  }
}

const PERIODS = [
  ['THIS_MONTH', 'This month'],
  ['LAST_MONTH', 'Last month'],
  ['THIS_QUARTER', 'This quarter'],
  ['LAST_QUARTER', 'Last quarter'],
  ['THIS_YEAR', 'This year'],
  ['LAST_YEAR', 'Last year'],
  ['CUSTOM', 'Custom range'],
];

/* Money-looking columns are formatted as naira in the preview and print view. */
const isMoneyKey = (k) => /amount|revenue|expense|profit|balance|total|budget|actual|variance|pay|cost|inflow|outflow/i.test(k);
const cell = (key, v) => {
  if (v == null || v === '') return '—';
  if (typeof v === 'number' && isMoneyKey(key)) return formatMoney(v);
  if (/date|At$/.test(key)) return formatDay(v);
  return String(v);
};

export default function Reports() {
  usePageHeader('Financial Reports', 'Generate statements and export them');
  const { toast, showToast, clearToast } = useToast();

  const [type, setType] = useState('PROFIT_AND_LOSS');
  const [preset, setPreset] = useState('THIS_MONTH');
  const [custom, setCustom] = useState(() => rangeFor('THIS_MONTH'));
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);

  const year = new Date().getFullYear();
  const monthly = useApi(() => financeApi.monthly(year), `fin-monthly-${year}`);

  const [from, to] = preset === 'CUSTOM' ? custom : rangeFor(preset);
  const label = REPORTS.find(([k]) => k === type)[1];
  const rangeError = preset === 'CUSTOM' && (!from || !to || from > to) ? 'Pick a start date before the end date.' : '';

  async function generate() {
    if (rangeError) return;
    setBusy(true);
    try {
      const data = await financeApi.report(type, from, to);
      const rows = Array.isArray(data) ? data : asList(pick(data || {}, 'rows', 'items', 'content'));
      const cols = asList(pick(data || {}, 'columns')).map((c) => (typeof c === 'string' ? { key: c, label: humanize(c) } : { key: c.key, label: c.label || humanize(c.key) }));
      const columns = cols.length ? cols : Object.keys(rows[0] || {}).map((k) => ({ key: k, label: humanize(k) }));
      setReport({ type, label, from, to, columns, rows });
      if (!rows.length) showToast('success', 'The report is empty for that period.');
    } catch (err) {
      showToast('error', `Report not generated: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  function csv() {
    downloadCsv(
      `${report.type.toLowerCase().replace(/_/g, '-')}-${report.from}-to-${report.to}.csv`,
      report.columns.map((c) => c.label),
      report.rows.map((r) => report.columns.map((c) => r[c.key]))
    );
  }

  /* Print view in a new window, built with DOM calls so no data is ever parsed as HTML. */
  function print() {
    const w = window.open('', '_blank');
    if (!w) return showToast('error', 'Allow pop-ups to print or save as PDF.');
    const doc = w.document;
    doc.title = `${report.label} — DiGi Health`;
    const style = doc.createElement('style');
    style.textContent = 'body{font-family:system-ui,sans-serif;color:#1a2550;margin:32px}h1{font-size:20px;margin:0 0 4px}p{color:#5a6690;margin:0 0 18px;font-size:13px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border-bottom:1px solid #e5e7f0;padding:7px 8px;text-align:left}th{background:#f5f6fc;text-transform:uppercase;font-size:10.5px;letter-spacing:.6px}';
    doc.head.appendChild(style);
    const h = doc.createElement('h1');
    h.textContent = `DiGi Health — ${report.label}`;
    const p = doc.createElement('p');
    p.textContent = `${formatDay(report.from)} to ${formatDay(report.to)} · generated ${new Date().toLocaleString('en-GB')}`;
    const table = doc.createElement('table');
    const head = table.createTHead().insertRow();
    report.columns.forEach((c) => { const th = doc.createElement('th'); th.textContent = c.label; head.appendChild(th); });
    const body = table.createTBody();
    report.rows.forEach((r) => {
      const tr = body.insertRow();
      report.columns.forEach((c) => { tr.insertCell().textContent = cell(c.key, r[c.key]); });
    });
    doc.body.append(h, p, table);
    w.focus();
    w.print();
  }

  const months = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    const row = asList(monthly.data).find((x) => String(pick(x, 'month', 'period') || '').slice(0, 7) === key) || {};
    const revenue = num(pick(row, 'revenue'));
    const expenses = num(pick(row, 'expenses'));
    return {
      label: new Date(year, i, 1).toLocaleDateString('en-GB', { month: 'short' }),
      full: new Date(year, i, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      values: { revenue, expenses, profit: Math.max(0, pick(row, 'profit', 'netProfit') != null ? num(pick(row, 'profit', 'netProfit')) : revenue - expenses) },
    };
  }).filter((_, i) => i <= new Date().getMonth());

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Generate report</h3></div>
          <div className={s.cardBody} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className={s.field}>
              <label htmlFor="rpType">Report</label>
              <select id="rpType" value={type} onChange={(e) => setType(e.target.value)}>
                {REPORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className={s.field}>
              <label htmlFor="rpPeriod">Period</label>
              <select id="rpPeriod" value={preset} onChange={(e) => setPreset(e.target.value)}>
                {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {preset === 'CUSTOM' ? (
              <div className={s.formGrid}>
                <div className={s.field}>
                  <label htmlFor="rpFrom">From</label>
                  <input id="rpFrom" type="date" value={custom[0]} onChange={(e) => setCustom(([, t]) => [e.target.value, t])} />
                </div>
                <div className={s.field}>
                  <label htmlFor="rpTo">To</label>
                  <input id="rpTo" type="date" value={custom[1]} onChange={(e) => setCustom(([fr]) => [fr, e.target.value])} />
                </div>
                {rangeError && <span className={`${s.fieldError} ${s.full}`}>{rangeError}</span>}
              </div>
            ) : (
              <p className={s.hint}>{formatDay(from)} – {formatDay(to)}</p>
            )}
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} style={{ justifyContent: 'center' }} onClick={generate} disabled={busy || !!rangeError}>
              <Icon name="file" /> {busy ? 'Generating…' : 'Generate report'}
            </button>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>Revenue trend — {year}</h3><span className={s.muted} style={{ fontSize: 12 }}>Monthly</span></div>
          <MonthlyChart
            months={months}
            loading={monthly.loading}
            error={monthly.error}
            series={[
              { key: 'revenue', label: 'Revenue', color: '#1d4ed8' },
              { key: 'expenses', label: 'Expenses', color: '#fca5a5' },
              { key: 'profit', label: 'Profit', color: '#86efac' },
            ]}
          />
        </div>
      </div>

      {report && (
        <div className={s.card}>
          <div className={s.toolbar}>
            <div>
              <h3 className={s.toolbarTitle}>{report.label}</h3>
              <p className={s.muted} style={{ fontSize: 12 }}>{formatDay(report.from)} – {formatDay(report.to)} · {report.rows.length} row{report.rows.length === 1 ? '' : 's'}</p>
            </div>
            <div className={s.toolbarRight}>
              <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={csv} disabled={!report.rows.length}><Icon name="download" /> CSV</button>
              <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={print} disabled={!report.rows.length}><Icon name="printer" /> Print / PDF</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.previewTable}>
              <thead><tr>{report.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
              <tbody>
                {!report.rows.length ? (
                  <tr><td colSpan={Math.max(1, report.columns.length)} className={s.previewEmpty}>Nothing to report for this period.</td></tr>
                ) : (
                  report.rows.slice(0, 200).map((r, i) => (
                    <tr key={r.id ?? i}>{report.columns.map((c) => <td key={c.key} className={typeof r[c.key] === 'number' && isMoneyKey(c.key) ? f.amount : undefined}>{cell(c.key, r[c.key])}</td>)}</tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {report.rows.length > 200 && <p className={s.hint} style={{ padding: '10px 16px' }}>Showing the first 200 rows — the CSV has all {report.rows.length}.</p>}
        </div>
      )}
    </>
  );
}

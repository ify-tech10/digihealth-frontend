import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import StatCard from '../../components/Statcard/Statcard';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, formatMoney, matches, pick, toISODate } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { SearchBox } from '../Admin/components/Common';
import { useLab } from './useLab';
import { useRequestFlow } from './components/useRequestFlow';
import { itemsOf, patientOf, reqNo, reqStatus, requesterOf, totalOf } from './labFields';
import s from '../Admin/admin.module.css';

const monthKey = (d = new Date()) => toISODate(d).slice(0, 7);
function shiftMonth(key, n) {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
}
const doneAt = (r) => pick(r, 'completedAt', 'deliveredAt', 'updatedAt');

/* Completed work for a month — the record of what was dispensed or tested and its value. */
export default function History() {
  const { kind, words, api } = useLab();
  usePageHeader('History', `Completed requests and what was ${kind === 'LAB' ? 'tested' : 'dispensed'}`);
  const { toast, showToast, clearToast } = useToast();

  const [month, setMonth] = useState(monthKey());
  const [query, setQuery] = useState('');
  const { data, loading, error, reload } = useApi(() => api.requests('COMPLETED'), `lab-history-${kind}`);
  const flow = useRequestFlow({ api, kind, words, showToast, onChanged: reload });

  const inMonth = asList(data).filter((r) => reqStatus(r) === 'COMPLETED' && String(doneAt(r) || '').slice(0, 7) === month);
  const rows = inMonth
    .filter((r) => matches(query, reqNo(r), patientOf(r), requesterOf(r), ...itemsOf(r).map((i) => i.name)))
    .sort((a, b) => new Date(doneAt(b) || 0) - new Date(doneAt(a) || 0));

  /* item tally: name → { qty, value } */
  const tally = Object.values(inMonth.flatMap(itemsOf).reduce((acc, it) => {
    const k = it.name;
    acc[k] = acc[k] || { name: k, quantity: 0, value: 0 };
    acc[k].quantity += it.quantity;
    acc[k].value += (it.unitPrice ?? 0) * it.quantity;
    return acc;
  }, {})).sort((a, b) => b.value - a.value);

  const total = inMonth.reduce((t, r) => t + totalOf(r), 0);
  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const v = (x) => (loading ? '…' : error ? '—' : x);

  function exportCsv() {
    downloadCsv(
      `${kind.toLowerCase()}-history-${month}.csv`,
      ['Completed', 'Request', 'Patient', 'Requested by', words.Item, 'Qty', 'Unit price', 'Amount'],
      rows.flatMap((r) => itemsOf(r).map((it) => [formatDay(doneAt(r)), reqNo(r), patientOf(r), requesterOf(r), it.name, it.quantity, it.unitPrice ?? '', (it.unitPrice ?? 0) * it.quantity]))
    );
  }

  const columns = [
    { key: 'date', header: 'Completed', render: (r) => <span className={s.muted}>{formatDay(doneAt(r))}</span> },
    { key: 'no', header: 'Request', render: (r) => <span className={s.tdName}>{reqNo(r)}</span> },
    { key: 'patient', header: 'Patient', render: (r) => patientOf(r) },
    { key: 'items', header: words.Items, render: (r) => itemsOf(r).map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ') || '—' },
    { key: 'from', header: 'Requested by', render: (r) => requesterOf(r) || '—' },
    { key: 'value', header: 'Value', align: 'right', render: (r) => <span className={s.money}>{formatMoney(totalOf(r))}</span> },
    { key: 'view', header: '', render: (r) => <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => flow.view(r)}>View</button> },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.toolbar}>
          <div className={s.toolbarRight}>
            <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><Icon name="chevronLeft" /></button>
            <h3 className={s.toolbarTitle} style={{ minWidth: 130, textAlign: 'center' }}>{label}</h3>
            <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= monthKey()} aria-label="Next month"><Icon name="chevronRight" /></button>
          </div>
          <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={exportCsv} disabled={!rows.length}><Icon name="download" /> CSV</button>
        </div>
      </div>

      <div className={s.stats3}>
        <StatCard accent color="green" icon="check" label="Requests completed" value={v(inMonth.length)} />
        <StatCard accent color="purple" icon="dollar" label="Total value" value={v(formatMoney(total))} />
        <StatCard accent color="blue" icon="file" label={`${words.Items} ${kind === 'LAB' ? 'run' : 'dispensed'}`} value={v(tally.reduce((t, x) => t + x.quantity, 0))} />
      </div>

      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.toolbar}>
            <h3 className={s.toolbarTitle}>Requests</h3>
            <SearchBox value={query} onChange={setQuery} placeholder="Search patient, request…" />
          </div>
          <DataTable key={month} columns={columns} rows={rows} loading={loading} error={error} emptyText={query ? 'Nothing matches.' : `Nothing completed in ${label}.`} />
        </div>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>By {words.item}</h3></div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.previewTable}>
              <thead><tr><th>{words.Item}</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Value</th></tr></thead>
              <tbody>
                {loading || !tally.length ? (
                  <tr><td colSpan={3} className={s.previewEmpty}>{loading ? 'Loading…' : 'Nothing yet.'}</td></tr>
                ) : tally.map((x) => (
                  <tr key={x.name}>
                    <td className={s.tdName}>{x.name}</td>
                    <td style={{ textAlign: 'right' }}>{x.quantity}</td>
                    <td style={{ textAlign: 'right' }} className={s.money}>{formatMoney(x.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {flow.modals}
    </>
  );
}

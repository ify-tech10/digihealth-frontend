import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatMoney, matches, pick } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { SearchBox } from '../Admin/components/Common';
import { useLab } from './useLab';
import { num } from './labFields';
import s from '../Admin/admin.module.css';
import l from './Lab.module.css';

const reorderOf = (i) => num(pick(i, 'reorderLevel', 'minStock') ?? 10);
const isLow = (i) => i.stock != null && num(i.stock) <= reorderOf(i);

/* Price list: tests (lab) or drugs with stock (pharmacy). Prices here pre-fill each request. */
export default function Catalogue() {
  const { kind, words, api } = useLab();
  const pharmacy = kind === 'PHARMACY';
  usePageHeader(words.catalogue, `Standard prices${pharmacy ? ' and stock' : ''} — they pre-fill every request you accept`);
  const { toast, showToast, clearToast } = useToast();

  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);

  const { data, loading, error, reload } = useApi(() => api.catalogue(), `lab-catalogue-${kind}`);
  const all = asList(data);
  const rows = all
    .filter((i) => (!lowOnly || isLow(i)) && matches(query, i.name, i.code, i.category, pick(i, 'sampleType', 'form', 'strength')))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  function exportCsv() {
    downloadCsv(
      `${pharmacy ? 'drug' : 'test'}-catalogue.csv`,
      pharmacy ? ['Drug', 'Strength / form', 'Unit price', 'In stock', 'Reorder at'] : ['Test', 'Sample', 'Turnaround (hrs)', 'Price'],
      rows.map((i) => (pharmacy
        ? [i.name, [i.strength, i.form].filter(Boolean).join(' '), num(pick(i, 'unitPrice', 'price')), i.stock, reorderOf(i)]
        : [i.name, i.sampleType, i.turnaroundHours, num(pick(i, 'unitPrice', 'price'))]))
    );
  }

  const columns = [
    { key: 'name', header: words.Item, render: (i) => <div className={s.tdName}>{i.name}<small>{pharmacy ? [i.strength, i.form].filter(Boolean).join(' ') : i.code || ''}</small></div> },
    ...(pharmacy
      ? [
        { key: 'stock', header: 'In stock', align: 'right', render: (i) => (i.stock == null ? '—' : <span className={isLow(i) ? l.low : l.okStock}>{num(i.stock)}</span>) },
        { key: 'reorder', header: 'Reorder at', align: 'right', render: (i) => <span className={s.muted}>{reorderOf(i)}</span> },
      ]
      : [
        { key: 'sample', header: 'Sample', render: (i) => i.sampleType || '—' },
        { key: 'tat', header: 'Turnaround', render: (i) => (i.turnaroundHours ? `${i.turnaroundHours} hrs` : '—') },
      ]),
    { key: 'price', header: pharmacy ? 'Unit price' : 'Price', align: 'right', render: (i) => <span className={s.money}>{formatMoney(pick(i, 'unitPrice', 'price'))}</span> },
    { key: 'actions', header: '', render: (i) => (
      <div className={s.actions} style={{ flexWrap: 'nowrap' }}>
        {pharmacy && <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setAdjusting(i)}>Stock</button>}
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setEditing(i)}><Icon name="edit" /> Edit</button>
      </div>
    ) },
  ];

  const lowCount = all.filter(isLow).length;

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      <div className={s.card}>
        <div className={s.toolbar}>
          <div className={s.toolbarRight}>
            <SearchBox value={query} onChange={setQuery} placeholder={`Search ${words.items}…`} />
            {pharmacy && (
              <label className={s.checkRow}>
                <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
                Low stock only{lowCount ? ` (${lowCount})` : ''}
              </label>
            )}
          </div>
          <div className={s.toolbarRight}>
            <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={exportCsv} disabled={!rows.length}><Icon name="download" /> CSV</button>
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setEditing({})}><Icon name="plus" /> Add {words.item}</button>
          </div>
        </div>
        <DataTable columns={columns} rows={rows} loading={loading} error={error} emptyText={query || lowOnly ? 'Nothing matches.' : `No ${words.items} in your catalogue yet.`} />
      </div>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${editing.name}` : `Add ${words.item}`}>
        {editing && (
          <ItemForm
            key={editing.id ?? 'new'}
            item={editing}
            pharmacy={pharmacy}
            words={words}
            onClose={() => setEditing(null)}
            onSave={async (body) => {
              if (editing.id) await api.updateItem(editing.id, body);
              else await api.createItem(body);
              setEditing(null);
              showToast('success', `${body.name} saved.`);
              reload();
            }}
          />
        )}
      </Modal>

      <Modal isOpen={!!adjusting} onClose={() => setAdjusting(null)} title={adjusting ? `Stock — ${adjusting.name}` : ''} size="small">
        {adjusting && (
          <StockForm
            key={adjusting.id}
            item={adjusting}
            onClose={() => setAdjusting(null)}
            onSave={async (change, reason) => {
              await api.adjustStock(adjusting.id, change, reason);
              setAdjusting(null);
              showToast('success', `${adjusting.name}: stock ${change > 0 ? 'increased' : 'reduced'} by ${Math.abs(change)}.`);
              reload();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function ItemForm({ item, pharmacy, words, onClose, onSave }) {
  const [form, setForm] = useState({
    name: item.name || '',
    code: item.code || '',
    unitPrice: pick(item, 'unitPrice', 'price') != null ? String(pick(item, 'unitPrice', 'price')) : '',
    sampleType: item.sampleType || '',
    turnaroundHours: item.turnaroundHours != null ? String(item.turnaroundHours) : '',
    strength: item.strength || '',
    form: item.form || '',
    stock: item.stock != null ? String(item.stock) : '',
    reorderLevel: pick(item, 'reorderLevel', 'minStock') != null ? String(pick(item, 'reorderLevel', 'minStock')) : '10',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError(`Give the ${words.item} a name.`);
    if (!(num(form.unitPrice) > 0)) return setError('Enter a price in naira.');
    if (pharmacy && !item.id && form.stock !== '' && (num(form.stock) < 0 || !Number.isInteger(num(form.stock)))) return setError('Opening stock must be a whole number.');
    setError('');
    setBusy(true);
    const body = pharmacy
      ? { name: form.name.trim(), code: form.code.trim() || undefined, unitPrice: num(form.unitPrice), strength: form.strength.trim() || undefined, form: form.form.trim() || undefined, reorderLevel: num(form.reorderLevel), ...(item.id ? {} : { stock: form.stock === '' ? 0 : num(form.stock) }) }
      : { name: form.name.trim(), code: form.code.trim() || undefined, unitPrice: num(form.unitPrice), sampleType: form.sampleType.trim() || undefined, turnaroundHours: form.turnaroundHours ? num(form.turnaroundHours) : undefined };
    try {
      await onSave(body);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const field = (k, label, props = {}) => (
    <div className={s.field}>
      <label htmlFor={`it-${k}`}>{label}</label>
      <input id={`it-${k}`} value={form[k]} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={s.formGrid}>
        {field('name', <>{words.Item} name <span className={s.req}>*</span></>)}
        {field('code', 'Code')}
        {field('unitPrice', <>{pharmacy ? 'Unit price' : 'Price'} (₦) <span className={s.req}>*</span></>, { type: 'number', min: 0 })}
        {pharmacy ? (
          <>
            {field('strength', 'Strength', { placeholder: 'e.g. 500 mg' })}
            {field('form', 'Form', { placeholder: 'e.g. Tablet, Syrup' })}
            {field('reorderLevel', 'Reorder when stock reaches', { type: 'number', min: 0 })}
            {!item.id && field('stock', 'Opening stock', { type: 'number', min: 0 })}
          </>
        ) : (
          <>
            {field('sampleType', 'Sample type', { placeholder: 'e.g. Blood, Urine' })}
            {field('turnaroundHours', 'Turnaround (hours)', { type: 'number', min: 0 })}
          </>
        )}
      </div>
      {item.id && pharmacy && <p className={s.hint} style={{ marginTop: 10 }}>Change stock with the “Stock” button so every change has a reason on record.</p>}
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

const REASONS = [
  ['RESTOCK', 'New stock received'],
  ['EXPIRED', 'Expired / disposed'],
  ['DAMAGED', 'Damaged'],
  ['COUNT', 'Stock count correction'],
];

function StockForm({ item, onClose, onSave }) {
  const [dir, setDir] = useState('IN');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('RESTOCK');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (dir === 'IN' ? 1 : -1) * num(qty);

  async function submit(e) {
    e.preventDefault();
    if (!(num(qty) > 0) || !Number.isInteger(num(qty))) return setError('Enter a whole number greater than 0.');
    if (num(item.stock) + change < 0) return setError(`Only ${num(item.stock)} in stock.`);
    setError('');
    setBusy(true);
    try {
      await onSave(change, reason);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint} style={{ marginBottom: 12 }}>In stock now: <strong>{num(item.stock)}</strong> → after: <strong>{Math.max(0, num(item.stock) + change)}</strong>. Dispensing on a request reduces stock automatically.</p>
      <div className={s.formGrid}>
        <div className={s.field}>
          <label htmlFor="stDir">Change</label>
          <select id="stDir" value={dir} onChange={(e) => { setDir(e.target.value); setReason(e.target.value === 'IN' ? 'RESTOCK' : 'EXPIRED'); }}>
            <option value="IN">Add stock</option>
            <option value="OUT">Remove stock</option>
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="stQty">Quantity</label>
          <input id="stQty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="stReason">Reason</label>
          <select id="stReason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.filter(([v]) => (dir === 'IN' ? ['RESTOCK', 'COUNT'] : ['EXPIRED', 'DAMAGED', 'COUNT']).includes(v)).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Update stock'}</button>
      </div>
    </form>
  );
}

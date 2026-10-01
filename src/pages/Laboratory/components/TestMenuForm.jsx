import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import { CATEGORIES, SAMPLE_TYPES } from '../labCentreFields';
import s from '../../Admin/admin.module.css';

/* Add or edit a test on the lab's menu. */
export function TestMenuModal({ open, test, onClose, onSave }) {
  return (
    <Modal isOpen={open} onClose={onClose} title={test?.id ? `Edit ${test.name}` : 'Add a test'}>
      {open && <TestForm key={test?.id ?? 'new'} test={test || {}} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function TestForm({ test, onClose, onSave }) {
  const [form, setForm] = useState({
    name: test.name && test.name !== '—' ? test.name : '',
    code: test.code || '',
    category: test.category || '',
    sampleType: test.sampleType || 'Blood',
    price: test.price ? String(test.price) : '',
    turnaroundHours: test.turnaroundHours ? String(test.turnaroundHours) : '24',
    fasting: !!test.fasting,
    homeCollection: test.id ? test.homeCollection : true,
    active: test.id ? test.active : true,
    preparation: test.preparation || '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const x = {};
    if (!form.name.trim()) x.name = 'Enter the test name';
    if (!(Number(form.price) > 0)) x.price = 'Enter a price';
    if (!(Number(form.turnaroundHours) > 0)) x.turnaroundHours = 'Hours until results';
    setErrors(x);
    if (Object.keys(x).length) return;
    setError('');
    setBusy(true);
    try {
      await onSave({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase() || undefined,
        category: form.category || undefined,
        sampleType: form.sampleType,
        price: Number(form.price),
        turnaroundHours: Number(form.turnaroundHours),
        fasting: form.fasting,
        homeCollection: form.homeCollection,
        active: form.active,
        preparation: form.preparation.trim() || undefined,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const err = (k) => errors[k] && <span className={s.fieldError}>{errors[k]}</span>;

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={s.formGrid}>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="tmName">Test name <span className={s.req}>*</span></label>
          <input id="tmName" value={form.name} onChange={set('name')} placeholder="e.g. Full Blood Count" />
          {err('name')}
        </div>
        <div className={s.field}>
          <label htmlFor="tmCode">Code</label>
          <input id="tmCode" value={form.code} onChange={set('code')} placeholder="e.g. FBC" />
        </div>
        <div className={s.field}>
          <label htmlFor="tmCat">Category</label>
          <select id="tmCat" value={form.category} onChange={set('category')}>
            <option value="">Select…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="tmSample">Sample type</label>
          <select id="tmSample" value={form.sampleType} onChange={set('sampleType')}>
            {SAMPLE_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="tmPrice">Price to DiGi (₦) <span className={s.req}>*</span></label>
          <input id="tmPrice" type="number" min="0" value={form.price} onChange={set('price')} />
          {err('price')}
        </div>
        <div className={s.field}>
          <label htmlFor="tmTat">Turnaround (hours) <span className={s.req}>*</span></label>
          <input id="tmTat" type="number" min="1" value={form.turnaroundHours} onChange={set('turnaroundHours')} />
          {err('turnaroundHours')}
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="tmPrep">Patient preparation</label>
          <textarea id="tmPrep" value={form.preparation} onChange={set('preparation')} placeholder="e.g. Fast 8–12 hours; water allowed" />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        <label className={s.checkRow}><input type="checkbox" checked={form.fasting} onChange={set('fasting')} /> Patient must fast</label>
        <label className={s.checkRow}><input type="checkbox" checked={form.homeCollection} onChange={set('homeCollection')} /> Sample can be collected at home</label>
        <label className={s.checkRow}><input type="checkbox" checked={form.active} onChange={set('active')} /> Offer this test to DiGi Health now</label>
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : test.id ? 'Save changes' : 'Add test'}</button>
      </div>
    </form>
  );
}

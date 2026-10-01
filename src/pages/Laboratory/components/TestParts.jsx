import { useState } from 'react';
import Badge from '../../../components/Badge/Badge';
import Icon from '../../../components/Icon/Icon';
import { formatDate, formatMoney, humanize, pick } from '../../../utils/format';
import { DocumentLinks } from '../../Admin/components/Common';
import {
  fromOf, isHomeCollection, isUrgent, mapsUrl, num, patientAddress, patientName, patientPhone, refOf, reqStatus, testsOf, testsTotal,
} from '../../Facility/facilityFields';
import { FLAGS, FLAG_VARIANT, findInMenu, hasCritical, localInput, resultsDue, turnaroundLabel } from '../labCentreFields';
import s from '../../Admin/admin.module.css';
import f from '../../Facility/Facility.module.css';
import l from '../Laboratory.module.css';

const LABEL = { NEW: 'New', ACCEPTED: 'To collect', COLLECTED: 'Processing', RESULTED: 'Results sent', DECLINED: 'Declined' };
const VARIANT = { NEW: 'new', ACCEPTED: 'pending', COLLECTED: 'active', RESULTED: 'done', DECLINED: 'urgent' };
const link = { color: 'var(--logo-bg)', fontWeight: 600 };

export function TestStatus({ request }) {
  const st = reqStatus(request);
  return <Badge variant={VARIANT[st] || 'default'}>{LABEL[st] || humanize(st)}</Badge>;
}

export function Urgency({ request }) {
  return isUrgent(request) ? <Badge variant="urgent">Urgent</Badge> : null;
}

export function Collection({ request }) {
  return isHomeCollection(request)
    ? <span className={l.tag}>Home</span>
    : <span className={`${l.tag} ${l.tagMuted}`}>Walk-in</span>;
}

/* Everything the lab needs to collect, run and report the tests. */
export function TestRequestDetails({ request: r }) {
  const p = r.patient || {};
  const tests = testsOf(r);
  const home = isHomeCollection(r);
  const fasting = tests.filter((t) => t.fasting);
  const priced = tests.some((t) => t.unitPrice != null);
  const due = resultsDue(r);
  return (
    <>
      {hasCritical(r) && (
        <div className={`${f.block} ${f.alert}`}>
          <div className={f.blockTitle}><Icon name="alert" /> Critical result reported</div>
          <div className={f.blockText}>DiGi Health’s clinical team was alerted when these results were sent.</div>
        </div>
      )}

      <div className={f.block}>
        <div className={f.blockTitle}><Icon name="users" /> Patient</div>
        <div className={s.details} style={{ marginBottom: 0 }}>
          <div className={s.detail}><span>Name</span><p>{patientName(r)}</p></div>
          <div className={s.detail}><span>Age / sex</span><p>{[p.age != null ? `${p.age} yrs` : null, humanize(p.gender)].filter(Boolean).join(' · ') || '—'}</p></div>
          <div className={s.detail}><span>Phone</span><p>{patientPhone(r) ? <a href={`tel:${patientPhone(r)}`} style={link}>{patientPhone(r)}</a> : '—'}</p></div>
          <div className={s.detail}><span>Sample collection</span><p>{home ? 'At the patient’s home' : 'Patient walks in'}</p></div>
          {home && (
            <div className={`${s.detail} ${s.full}`}>
              <span>Collect from</span>
              <p>{patientAddress(r) || '—'}{patientAddress(r) && <> · <a href={mapsUrl(patientAddress(r))} target="_blank" rel="noopener noreferrer" style={link}>Open in Maps</a></>}</p>
            </div>
          )}
        </div>
      </div>

      {fasting.length > 0 && reqStatus(r) !== 'RESULTED' && (
        <div className={`${f.block} ${l.warn}`}>
          <div className={f.blockTitle}><Icon name="clock" /> Fasting required</div>
          <div className={f.blockText}>{fasting.map((t) => t.name).join(', ')} — remind the patient to fast before collection.</div>
        </div>
      )}

      <div className={f.block}>
        <div className={f.blockTitle}><Icon name="flask" /> Tests</div>
        <div className={`${l.testRow} ${l.testHead}`}><span>Test</span><span>Sample</span><span>Result</span><span style={{ textAlign: 'right' }}>Price</span></div>
        {tests.map((t) => {
          const res = t.result || {};
          const flag = String(res.flag || '').toUpperCase();
          return (
            <div key={t.key} className={l.testRow}>
              <span>
                <strong className={t.available === false ? f.unavailable : undefined}>{t.name}</strong>
                {(t.code || t.available === false) && <small>{t.available === false ? 'Not done at this lab' : t.code}</small>}
              </span>
              <span>{t.sampleType || '—'}{t.fasting && <span className={l.tag}>Fasting</span>}</span>
              <span>
                {res.value != null && res.value !== '' ? (
                  <>
                    <strong>{res.value} {res.unit || ''}</strong>
                    {flag && flag !== 'NORMAL' && <> <Badge variant={FLAG_VARIANT[flag] || 'default'}>{humanize(flag)}</Badge></>}
                    {res.referenceRange && <small>Ref: {res.referenceRange}</small>}
                  </>
                ) : <span className={s.muted}>—</span>}
              </span>
              <span className={s.money} style={{ textAlign: 'right' }}>{t.unitPrice == null ? <span className={s.muted}>—</span> : formatMoney(t.unitPrice)}</span>
            </div>
          );
        })}
        {priced && <div className={f.total}>Total <strong>{formatMoney(testsTotal(r))}</strong></div>}
      </div>

      {pick(r, 'clinicalNotes', 'notes', 'indication') && (
        <div className={f.block}>
          <div className={f.blockTitle}><Icon name="file" /> Clinical notes</div>
          <div className={f.blockText}>{pick(r, 'clinicalNotes', 'notes', 'indication')}</div>
        </div>
      )}

      <div className={s.details}>
        <div className={s.detail}><span>Requested by</span><p>{fromOf(r) || '—'}</p></div>
        <div className={s.detail}><span>Received</span><p>{formatDate(r.createdAt)}</p></div>
        {r.scheduledAt && <div className={s.detail}><span>Collection booked</span><p>{formatDate(r.scheduledAt)}</p></div>}
        {r.collectedAt && <div className={s.detail}><span>Collected</span><p>{formatDate(r.collectedAt)}{r.collectedBy ? ` · by ${r.collectedBy}` : ''}</p></div>}
        {r.sampleId && <div className={s.detail}><span>Sample ID</span><p>{r.sampleId}</p></div>}
        {due && reqStatus(r) === 'COLLECTED' && <div className={s.detail}><span>Results due</span><p>{formatDate(due)}</p></div>}
        {r.resultedAt && <div className={s.detail}><span>Results sent</span><p>{formatDate(r.resultedAt)}</p></div>}
        {r.resultComment && <div className={`${s.detail} ${s.full}`}><span>Lab comment</span><p>{r.resultComment}</p></div>}
        {r.declineReason && <div className={`${s.detail} ${s.full}`}><span>Declined because</span><p>{r.declineReason}</p></div>}
        <div className={`${s.detail} ${s.full}`}><span>Documents</span><DocumentLinks record={r} /></div>
      </div>
    </>
  );
}

function nextSlot() {
  const d = new Date(Date.now() + 2 * 3600000);
  d.setMinutes(0, 0, 0);
  if (d.getHours() < 7) d.setHours(7);
  if (d.getHours() > 17) { d.setDate(d.getDate() + 1); d.setHours(7); }
  return localInput(d);
}

/* ── Accept: confirm each test and its price, book the collection ── */
export function AcceptTestForm({ request, menu, onClose, onSubmit }) {
  const tests = testsOf(request);
  const matched = Object.fromEntries(tests.map((t) => [t.key, findInMenu(menu, t)]));
  const [lines, setLines] = useState(() => Object.fromEntries(tests.map((t) => {
    const m = matched[t.key];
    const price = t.unitPrice ?? (m ? m.price : null);
    return [t.key, { available: m ? m.active : true, price: price ? String(price) : '' }];
  })));
  const [home, setHome] = useState(isHomeCollection(request));
  const [when, setWhen] = useState(nextSlot);
  const [tat, setTat] = useState(() => {
    const hours = tests.map((t) => matched[t.key]?.turnaroundHours || 0);
    return hours.length && Math.max(...hours) ? String(Math.max(...hours)) : '24';
  });
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setLine = (k, patch) => setLines((ls) => ({ ...ls, [k]: { ...ls[k], ...patch } }));
  const total = tests.reduce((t, x) => t + (lines[x.key].available ? num(lines[x.key].price) : 0), 0);

  async function submit(e) {
    e.preventDefault();
    if (!tests.some((t) => lines[t.key].available)) return setError('You can’t run any of these tests — use “Decline” so DiGi can send them elsewhere.');
    if (tests.some((t) => lines[t.key].available && !(num(lines[t.key].price) > 0))) return setError('Price every test you’ll run.');
    if (!when) return setError(home ? 'When will your staff collect the sample?' : 'When should the patient come in?');
    if (!(num(tat) > 0)) return setError('How many hours until results are ready?');
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        collectionType: home ? 'HOME' : 'WALK_IN',
        scheduledAt: new Date(when).toISOString(),
        turnaroundHours: num(tat),
        tests: tests.map((t) => ({ id: t.id, available: lines[t.key].available, price: lines[t.key].available ? num(lines[t.key].price) : undefined })),
        note: note.trim() || undefined,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint} style={{ marginBottom: 12 }}>Prices come from your test menu — change them for this request if needed. Untick any test you can’t run.</p>
      <div className={`${l.testRow} ${l.testHead}`}><span>Test</span><span>Sample</span><span>Price (₦)</span><span style={{ textAlign: 'right' }}>Turnaround</span></div>
      {tests.map((t) => {
        const ln = lines[t.key];
        const m = matched[t.key];
        return (
          <div key={t.key} className={l.testRow}>
            <label className={s.checkRow} style={{ fontWeight: 600, alignItems: 'flex-start' }}>
              <input type="checkbox" checked={ln.available} onChange={(e) => setLine(t.key, { available: e.target.checked })} aria-label={`${t.name} available`} />
              <span>
                <span className={ln.available ? undefined : f.unavailable}>{t.name}</span>
                {!m && <small style={{ fontWeight: 400 }}>Not on your test menu</small>}
                {m && !m.active && <small style={{ fontWeight: 400 }}>Paused on your menu</small>}
              </span>
            </label>
            <span>{t.sampleType || m?.sampleType || '—'}{(t.fasting || m?.fasting) && <span className={l.tag}>Fasting</span>}</span>
            <div className={s.field}>
              <input aria-label={`Price for ${t.name}`} type="number" min="0" disabled={!ln.available} value={ln.price} onChange={(e) => setLine(t.key, { price: e.target.value })} />
            </div>
            <span className={s.muted} style={{ textAlign: 'right' }}>{m ? turnaroundLabel(m.turnaroundHours) : '—'}</span>
          </div>
        );
      })}
      <div className={f.total}>Total <strong>{formatMoney(total)}</strong></div>

      <div style={{ marginTop: 16 }}>
        <span className={l.choiceLabel}>Sample collection</span>
        <div className={l.choice} role="radiogroup" aria-label="Sample collection">
          <label className={home ? l.chosen : undefined}>
            <input type="radio" name="collection" checked={home} onChange={() => setHome(true)} />
            <span><strong>Home collection</strong>Your staff go to {patientAddress(request) || 'the patient’s address'}</span>
          </label>
          <label className={!home ? l.chosen : undefined}>
            <input type="radio" name="collection" checked={!home} onChange={() => setHome(false)} />
            <span><strong>Walk-in</strong>The patient comes to your lab</span>
          </label>
        </div>
      </div>

      <div className={s.formGrid} style={{ marginTop: 14 }}>
        <div className={s.field}>
          <label htmlFor="atWhen">{home ? 'Collection time' : 'Appointment time'} <span className={s.req}>*</span></label>
          <input id="atWhen" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div className={s.field}>
          <label htmlFor="atTat">Results ready within (hours) <span className={s.req}>*</span></label>
          <input id="atTat" type="number" min="1" value={tat} onChange={(e) => setTat(e.target.value)} />
        </div>
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="atNote">Note to DiGi / the patient (optional)</label>
          <textarea id="atNote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Fast for 10 hours before; bring a morning urine sample" />
        </div>
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Accept request'}</button>
      </div>
    </form>
  );
}

/* ── Sample collected: label it so results can be traced back ── */
export function CollectForm({ request, onClose, onSubmit }) {
  const [sampleId, setSampleId] = useState('');
  const [by, setBy] = useState('');
  const [when, setWhen] = useState(() => localInput(new Date()));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fasting = testsOf(request).some((t) => t.fasting);
  const [fasted, setFasted] = useState(true);

  async function submit(e) {
    e.preventDefault();
    if (!sampleId.trim()) return setError('Enter the sample ID or barcode on the tube.');
    if (!by.trim()) return setError('Who collected the sample?');
    if (!when || new Date(when) > new Date(Date.now() + 5 * 60000)) return setError('Collection time can’t be in the future.');
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        sampleId: sampleId.trim(),
        collectedBy: by.trim(),
        collectedAt: new Date(when).toISOString(),
        ...(fasting && { patientFasted: fasted }),
        note: note.trim() || undefined,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint} style={{ marginBottom: 14 }}>{patientName(request)} · {refOf(request)}</p>
      <div className={s.formGrid}>
        <div className={s.field}>
          <label htmlFor="scId">Sample ID / barcode <span className={s.req}>*</span></label>
          <input id="scId" value={sampleId} onChange={(e) => setSampleId(e.target.value)} placeholder="As written on the tube" />
        </div>
        <div className={s.field}>
          <label htmlFor="scBy">Collected by <span className={s.req}>*</span></label>
          <input id="scBy" value={by} onChange={(e) => setBy(e.target.value)} placeholder="Phlebotomist’s name" />
        </div>
        <div className={s.field}>
          <label htmlFor="scWhen">Collected at</label>
          <input id="scWhen" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        {fasting && (
          <label className={s.checkRow} style={{ alignSelf: 'end', paddingBottom: 10 }}>
            <input type="checkbox" checked={fasted} onChange={(e) => setFasted(e.target.checked)} />
            Patient fasted as required
          </label>
        )}
        <div className={`${s.field} ${s.full}`}>
          <label htmlFor="scNote">Note (optional)</label>
          <textarea id="scNote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Difficult draw, second attempt" />
        </div>
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} disabled={busy}>{busy ? 'Saving…' : 'Sample collected'}</button>
      </div>
    </form>
  );
}

/* ── Results: a value and flag per test, plus the signed report ── */
export function ResultsForm({ request, onClose, onSubmit }) {
  const tests = testsOf(request).filter((t) => t.available !== false);
  const [rows, setRows] = useState(() => Object.fromEntries(tests.map((t) => [t.key, {
    value: '',
    unit: pick(t, 'unit') || pick(t.result || {}, 'unit') || '',
    referenceRange: pick(t, 'referenceRange') || '',
    flag: 'NORMAL',
  }])));
  const [comment, setComment] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setRow = (k, key) => (e) => setRows((rs) => ({ ...rs, [k]: { ...rs[k], [key]: e.target.value } }));
  const critical = tests.filter((t) => rows[t.key].flag === 'CRITICAL');

  async function submit(e) {
    e.preventDefault();
    if (tests.some((t) => !rows[t.key].value.trim())) return setError('Enter a result for every test.');
    if (!file) return setError('Attach the signed result report.');
    if (file.size > 10 * 1024 * 1024) return setError('The report must be 10 MB or smaller.');
    if (critical.length && !comment.trim()) return setError('Add a comment explaining the critical result.');
    setError('');
    const fd = new FormData();
    fd.append('results', JSON.stringify(tests.map((t) => ({
      testId: t.id,
      value: rows[t.key].value.trim(),
      unit: rows[t.key].unit.trim() || undefined,
      referenceRange: rows[t.key].referenceRange.trim() || undefined,
      flag: rows[t.key].flag,
    }))));
    fd.append('critical', String(critical.length > 0));
    if (comment.trim()) fd.append('comment', comment.trim());
    fd.append('report', file);
    setBusy(true);
    try {
      await onSubmit(fd, critical.length > 0);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <p className={s.hint} style={{ marginBottom: 12 }}>
        {patientName(request)} · {refOf(request)}{request.sampleId ? ` · sample ${request.sampleId}` : ''}. Results go straight to DiGi Health’s care team.
      </p>
      <div className={`${l.resultRow} ${l.resultHead} ${l.testHead}`}><span>Test</span><span>Result</span><span>Unit</span><span>Reference range</span><span>Flag</span></div>
      {tests.map((t) => {
        const r = rows[t.key];
        return (
          <div key={t.key} className={`${l.resultRow} ${r.flag === 'CRITICAL' ? l.criticalRow : ''}`}>
            <span className={l.resultName}>{t.name}{t.sampleType && <small>{t.sampleType}</small>}</span>
            <div className={s.field}><input aria-label={`${t.name} result`} value={r.value} onChange={setRow(t.key, 'value')} placeholder="Result" /></div>
            <div className={s.field}><input aria-label={`${t.name} unit`} value={r.unit} onChange={setRow(t.key, 'unit')} placeholder="Unit" /></div>
            <div className={s.field}><input aria-label={`${t.name} reference range`} value={r.referenceRange} onChange={setRow(t.key, 'referenceRange')} placeholder="e.g. 3.9–5.6" /></div>
            <div className={s.field}>
              <select aria-label={`${t.name} flag`} value={r.flag} onChange={setRow(t.key, 'flag')}>
                {FLAGS.map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
              </select>
            </div>
          </div>
        );
      })}

      {critical.length > 0 && (
        <div className={`${f.block} ${f.alert}`} style={{ marginTop: 12 }}>
          <div className={f.blockTitle}><Icon name="alert" /> Critical result</div>
          <div className={f.blockText}>DiGi Health’s clinical team is alerted as soon as you send this. Please also phone the care team for {critical.map((t) => t.name).join(', ')}.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
        <div className={s.field}>
          <label htmlFor="rsComment">Comment {critical.length > 0 && <span className={s.req}>*</span>}</label>
          <textarea id="rsComment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Interpretation, sample quality, recommended repeat…" />
        </div>
        <div className={s.field}>
          <label htmlFor="rsFile">Signed result report (PDF or image) <span className={s.req}>*</span></label>
          <input id="rsFile" type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
      </div>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${critical.length ? s.btnDanger : s.btnApprove} ${s.btnLarge}`} disabled={busy}>{busy ? 'Sending…' : critical.length ? 'Send critical results' : 'Send results'}</button>
      </div>
    </form>
  );
}

import { useRef, useState } from 'react';
import Icon from '../../../components/Icon/Icon';
import { hmoApi } from '../../../Api/hmoApi';
import { CSV_COLUMNS, CSV_LABEL as LABEL, REQUIRED_COLUMNS, downloadTemplate, readEmployeeCsv } from '../hmoFields';
import s from '../../Admin/admin.module.css';
import h from '../Hmo.module.css';

const MAX_SIZE = 5 * 1024 * 1024;
const PREVIEW = 8;

/* CSV of only the rows that passed checks, with our own headers, so the server gets clean input. */
function cleanCsvFile(rows, name) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = [CSV_COLUMNS, ...rows.map((r) => CSV_COLUMNS.map((c) => r.data[c]))].map((r) => r.map(esc).join(',')).join('\n');
  return new File([body], name.replace(/\.csv$/i, '') + '-checked.csv', { type: 'text/csv' });
}

/*
 * Pick a CSV/Excel file → check CSV rows in the browser → upload.
 * existingEmails lets us flag people already on the list.
 */
export default function UploadPanel({ existingEmails = [], onUploaded }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [check, setCheck] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const isCsv = file && /\.csv$/i.test(file.name);
  const good = check ? check.rows.filter((r) => !r.problems.length) : [];
  const bad = check ? check.rows.filter((r) => r.problems.length) : [];

  function reset() {
    setFile(null);
    setCheck(null);
    setError('');
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function choose(f) {
    reset();
    if (!f) return;
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) return setError('Upload a .csv or Excel (.xlsx) file.');
    if (f.size > MAX_SIZE) return setError('That file is over 5 MB — split it into smaller files.');
    setFile(f);
    if (/\.csv$/i.test(f.name)) {
      f.text().then(
        (text) => {
          const c = readEmployeeCsv(text, existingEmails);
          if (!c.rows.length) setError('No employee rows found in that file.');
          setCheck(c);
        },
        () => setError('Couldn’t read that file.')
      );
    }
  }

  async function upload() {
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', isCsv ? cleanCsvFile(good, file.name) : file);
      const res = await hmoApi.uploadEmployees(fd);
      const created = Number(res?.created ?? (isCsv ? good.length : 0));
      setResult({
        created,
        updated: Number(res?.updated ?? 0),
        skipped: Number(res?.skipped ?? 0) + (isCsv ? bad.length : 0),
        errors: Array.isArray(res?.errors) ? res.errors : [],
      });
      setFile(null);
      setCheck(null);
      if (inputRef.current) inputRef.current.value = '';
      onUploaded?.(created);
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  const blocked = check?.headersMissing?.length > 0;
  const canUpload = file && !busy && (!isCsv || (check && !blocked && good.length > 0));

  return (
    <div>
      <label
        className={`${h.drop} ${dragging ? h.dragging : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0]); }}
        style={{ position: 'relative' }}
      >
        <Icon name="download" />
        <strong>Drag & drop your file here, or click to choose</strong>
        <p>CSV or Excel · up to 5 MB · required columns: {REQUIRED_COLUMNS.map((c) => LABEL[c]).join(', ')}</p>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" onChange={(e) => choose(e.target.files?.[0])} aria-label="Employee file" />
      </label>
      <p className={s.hint} style={{ marginTop: 8 }}>
        Not sure of the format? <button type="button" onClick={downloadTemplate} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', padding: 0, font: 'inherit' }}>Download the template</button>.
      </p>

      {file && (
        <div className={h.fileRow}>
          <Icon name="file" />
          <span className={h.fileName}>{file.name}</span>
          <span className={s.muted} style={{ fontSize: 12 }}>{Math.max(1, Math.round(file.size / 1024))} KB</span>
          <button type="button" className={`${s.btn} ${s.btnView}`} onClick={reset}>Remove</button>
        </div>
      )}

      {file && !isCsv && <p className={s.hint} style={{ marginTop: 10 }}>Excel files are checked on the server after upload — you’ll see any rows it couldn’t use.</p>}

      {check && check.rows.length > 0 && (
        <>
          {blocked ? (
            <p className={`${h.notice} ${h.noticeBad}`} style={{ marginTop: 12 }}>
              The file is missing these columns: <strong>{check.headersMissing.map((c) => LABEL[c]).join(', ')}</strong>. Add them (or use the template) and choose the file again.
            </p>
          ) : (
            <div className={h.summaryLine}>
              <span className={h.ok}>{good.length} ready to upload</span>
              {bad.length > 0 && <span className={h.bad}>{bad.length} with problems — these will be left out</span>}
            </div>
          )}
          {!blocked && (
            <div style={{ overflowX: 'auto', border: '1px solid #eef0f8', borderRadius: 9 }}>
              <table className={s.previewTable}>
                <thead><tr><th>Row</th><th>Name</th><th>Email</th><th>Phone</th><th>Department</th><th>Check</th></tr></thead>
                <tbody>
                  {[...bad, ...good].slice(0, PREVIEW).map((r) => (
                    <tr key={r.line} className={r.problems.length ? h.problemRow : undefined}>
                      <td className={s.muted}>{r.line}</td>
                      <td className={s.tdName}>{[r.data.firstName, r.data.lastName].filter(Boolean).join(' ') || '—'}</td>
                      <td>{r.data.email || '—'}</td>
                      <td>{r.data.phone || '—'}</td>
                      <td>{r.data.department || '—'}</td>
                      <td>{r.problems.length ? <span className={h.problem}>{r.problems.join(', ')}</span> : <span className={h.ok}>OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {check.rows.length > PREVIEW && <p className={s.hint} style={{ padding: '8px 14px' }}>Showing {PREVIEW} of {check.rows.length} rows (problems first).</p>}
            </div>
          )}
        </>
      )}

      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}

      {file && (
        <div className={s.modalActions}>
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={!canUpload} onClick={upload}>
            {busy ? 'Uploading…' : isCsv ? `Upload ${good.length} employee${good.length === 1 ? '' : 's'}` : 'Upload file'}
          </button>
        </div>
      )}

      {result && (
        <div className={`${h.notice} ${h.noticeInfo}`} style={{ marginTop: 14 }}>
          <strong>{result.created} added</strong>
          {result.updated > 0 && ` · ${result.updated} updated`}
          {result.skipped > 0 && ` · ${result.skipped} skipped`}. New employees get an email asking them to add their next of kin and sign the consent form — they’re registered once both are done.
          {result.errors.length > 0 && (
            <ul style={{ marginTop: 6, paddingLeft: 18 }}>
              {result.errors.slice(0, 5).map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

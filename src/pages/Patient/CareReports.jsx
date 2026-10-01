import { useState } from 'react';
import { patientApi } from '../../Api/patientApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { usePageHeader } from '../../hooks/usePageHeader';
import { matches, pick } from '../../utils/format';
import { SearchBox } from '../Admin/components/Common';
import { DocRow } from './components/PatientParts';
import { DOC_TYPES, docType, docTypeLabel } from './patientFields';
import s from '../Admin/admin.module.css';
import p from './Patient.module.css';

/* Every document DiGi Health has shared with the patient. */
export default function CareReports() {
  usePageHeader('Care Reports', 'Visit reports, lab results, prescriptions and summaries');
  const [type, setType] = useState('ALL');
  const [query, setQuery] = useState('');
  const { data, loading, error } = useApi(() => patientApi.documents(), 'pt-docs');

  const all = asList(data).slice().sort((a, b) => new Date(pick(b, 'date', 'createdAt') || 0) - new Date(pick(a, 'date', 'createdAt') || 0));
  const count = (t) => all.filter((d) => docType(d) === t).length;
  const types = DOC_TYPES.filter(([k]) => count(k) > 0);
  const rows = all.filter((d) => (type === 'ALL' || docType(d) === type) && matches(query, pick(d, 'title', 'name'), docTypeLabel(docType(d)), pick(d, 'authorName', 'author', 'issuedBy')));

  return (
    <div className={s.card}>
      <div className={s.toolbar}>
        <div className={p.chips} role="group" aria-label="Filter by type">
          <button type="button" className={`${p.chipBtn} ${type === 'ALL' ? p.chipOn : ''}`} aria-pressed={type === 'ALL'} onClick={() => setType('ALL')}>All<span>{loading ? '' : all.length}</span></button>
          {types.map(([k, label]) => (
            <button key={k} type="button" className={`${p.chipBtn} ${type === k ? p.chipOn : ''}`} aria-pressed={type === k} onClick={() => setType(k)}>{label}<span>{count(k)}</span></button>
          ))}
        </div>
        <SearchBox value={query} onChange={setQuery} placeholder="Search reports…" />
      </div>
      {loading ? <div className={p.empty}>Loading your reports…</div>
        : error ? <div className={p.empty}><strong>Couldn’t load your reports</strong>{error}</div>
          : !rows.length ? <div className={p.empty}>{query || type !== 'ALL' ? 'No reports match.' : <><strong>No reports yet</strong>After each visit or test, your reports appear here to download or share with your doctor.</>}</div>
            : rows.map((d) => <DocRow key={d.id ?? pick(d, 'url', 'title')} doc={d} />)}
    </div>
  );
}

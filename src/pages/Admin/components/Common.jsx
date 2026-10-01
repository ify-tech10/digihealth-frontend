import Icon from '../../../components/Icon/Icon';
import { initials } from '../../../utils/format';
import s from '../admin.module.css';

/* Label + value pair used in the detail modals. */
export function Detail({ label, children, full = false }) {
  return (
    <div className={`${s.detail} ${full ? s.full : ''}`}>
      <span>{label}</span>
      <p>{children ?? '—'}</p>
    </div>
  );
}

/* Segmented filter: options = [['PENDING', 'Pending'], ...] */
export function Tabs({ options, value, onChange }) {
  return (
    <div className={s.tabs} role="tablist">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={value === v}
          className={`${s.tab} ${value === v ? s.tabActive : ''}`}
          onClick={() => onChange(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <label className={s.search}>
      <Icon name="search" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  );
}

/* Name + secondary line with an initials avatar. */
export function Person({ name, sub }) {
  return (
    <div className={s.person}>
      <div className={s.avatar}>{initials(name) || '?'}</div>
      <div className={s.tdName}>
        {name || '—'}
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}

const ACRONYMS = { cv: 'CV', id: 'ID', nin: 'NIN' };

function docLabel(key) {
  const words = key.replace(/url$/i, '').replace(/([A-Z])/g, ' $1').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'Document';
  return words
    .map((w) => ACRONYMS[w.toLowerCase()] || w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/* Links for any `...Url` fields on a record (CV, licence, ID…). */
export function DocumentLinks({ record }) {
  const docs = Object.entries(record || {}).filter(
    ([k, v]) => /url$/i.test(k) && typeof v === 'string' && /^https?:\/\//.test(v)
  );
  if (!docs.length) return <p className={s.muted}>No documents uploaded.</p>;
  return (
    <div className={s.docLinks}>
      {docs.map(([k, v]) => (
        <a key={k} href={v} target="_blank" rel="noreferrer" className={`${s.btn} ${s.btnView}`}>
          <Icon name="link" />
          {docLabel(k)}
        </a>
      ))}
    </div>
  );
}

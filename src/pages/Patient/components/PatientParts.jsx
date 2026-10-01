import Icon from '../../../components/Icon/Icon';
import { formatDay, humanize, initials, pick } from '../../../utils/format';
import {
  BOOKING_LABEL, VITALS, bookingStatus, caregiverName, caregiverOf, caregiverRole, docIcon, docType, docTypeLabel, docUrl,
} from '../patientFields';
import p from '../Patient.module.css';

const PILL = { REQUESTED: p.pillPending, CONFIRMED: p.pillUpcoming, IN_PROGRESS: p.pillActive, COMPLETED: p.pillCompleted, CANCELLED: p.pillCancelled };

/* Reference-style status pill (Completed / Upcoming / Cancelled…) */
export function BookingStatus({ booking }) {
  const st = bookingStatus(booking);
  return <span className={`${p.pill} ${PILL[st] || p.pillUpcoming}`}>{BOOKING_LABEL[st] || humanize(st)}</span>;
}

export function Pill({ tone = 'upcoming', children }) {
  const cls = { completed: p.pillCompleted, upcoming: p.pillUpcoming, pending: p.pillPending, cancelled: p.pillCancelled }[tone];
  return <span className={`${p.pill} ${cls || p.pillUpcoming}`}>{children}</span>;
}

export function Avatar({ name, photo }) {
  return <div className={p.avatar} aria-hidden="true">{photo ? <img src={photo} alt="" /> : initials(name || '?')}</div>;
}

/* The nurse / caregiver on a booking or visit (reference: .nurse-card). */
export function CaregiverCard({ of, call = true, role }) {
  const name = caregiverName(of);
  if (!name) return null;
  const c = caregiverOf(of) || {};
  const phone = pick(c, 'phone', 'phoneNumber');
  return (
    <div className={p.person}>
      <Avatar name={name} photo={pick(c, 'photoUrl', 'avatarUrl')} />
      <div style={{ minWidth: 0 }}>
        <div className={p.personName}>{name}</div>
        <div className={p.personSub}>{role || [caregiverRole(of), pick(c, 'specialty', 'specialisation')].filter(Boolean).join(' · ')}</div>
      </div>
      {call && phone && <a className={p.callBtn} href={`tel:${phone}`} aria-label={`Call ${name}`} title={`Call ${name}`}><Icon name="phone" /></a>}
    </div>
  );
}

export function VitalsGrid({ vitals }) {
  return (
    <div className={p.vitals}>
      {VITALS.filter(([k]) => vitals?.[k] != null && vitals[k] !== '').map(([k, label, unit]) => (
        <div key={k} className={p.vital}><span>{label}</span><strong>{vitals[k]}</strong>{unit && <small>{unit}</small>}</div>
      ))}
    </div>
  );
}

const DOC_TONE = { VISIT_REPORT: p.blue, LAB_REPORT: p.purple, DISCHARGE_SUMMARY: p.green, PRESCRIPTION: p.orange, CARE_PLAN: p.green, RECEIPT: p.blue };

export function DocRow({ doc }) {
  const t = docType(doc);
  const url = docUrl(doc);
  return (
    <div className={p.docRow}>
      <div className={`${p.docIcon} ${DOC_TONE[t] || p.blue}`}><Icon name={docIcon(t)} /></div>
      <div className={p.docBody}>
        <div className={p.docTitle} title={pick(doc, 'title', 'name')}>{pick(doc, 'title', 'name') || docTypeLabel(t)}</div>
        <div className={p.docMeta}>{[docTypeLabel(t), formatDay(pick(doc, 'date', 'createdAt')), pick(doc, 'authorName', 'author', 'issuedBy')].filter((x) => x && x !== '—').join(' · ')}</div>
      </div>
      {url
        ? <a className={p.docOpen} href={url} target="_blank" rel="noopener noreferrer"><Icon name="download" /> Open</a>
        : <span className={p.docMeta}>Not ready</span>}
    </div>
  );
}

export function Stars({ value }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return <span className={p.starsSmall} aria-label={`${n} out of 5`}>{'★'.repeat(n)}<span style={{ color: '#e0e4f0' }}>{'★'.repeat(5 - n)}</span></span>;
}

/* Date tile used in visit lists (reference: .visit-date). */
export function DateTile({ date }) {
  const d = date ? new Date(date) : null;
  if (!d || Number.isNaN(d.getTime())) return <div className={p.vDate}><div className={p.vDay}>—</div></div>;
  return (
    <div className={p.vDate}>
      <div className={p.vDay}>{d.getDate()}</div>
      <div className={p.vMon}>{d.toLocaleDateString('en-GB', { month: 'short' }).slice(0, 3)}</div>
    </div>
  );
}

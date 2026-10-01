import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import Icon from '../../../components/Icon/Icon';
import { formatDate, pick } from '../../../utils/format';
import { CaregiverCard, Stars, VitalsGrid } from './PatientParts';
import { durationLabel, hasVitals, minutesBetween, serviceLabel } from '../patientFields';
import s from '../../Admin/admin.module.css';
import p from '../Patient.module.css';
import f from '../../Facility/Facility.module.css';

/* One completed visit: readings, what was done, what happens next — and a rating. */
export function VisitModal({ visit, onClose, onRate }) {
  return (
    <Modal isOpen={!!visit} onClose={onClose} title={visit ? `${serviceLabel(visit.serviceType)} — ${formatDate(pick(visit, 'checkInAt', 'scheduledAt'))}` : ''} size="large">
      {visit && <VisitBody key={visit.id} visit={visit} onClose={onClose} onRate={onRate} />}
    </Modal>
  );
}

function VisitBody({ visit: v, onClose, onRate }) {
  const mins = minutesBetween(v.checkInAt, v.checkOutAt);
  const rated = pick(v, 'rating', 'patientRating');
  return (
    <>
      <div style={{ marginBottom: 14 }}><CaregiverCard of={v} call={false} /></div>
      <div className={s.details}>
        <div className={s.detail}><span>Arrived</span><p>{formatDate(v.checkInAt)}</p></div>
        <div className={s.detail}><span>Left</span><p>{formatDate(v.checkOutAt)}{durationLabel(mins) ? ` · ${durationLabel(mins)}` : ''}</p></div>
      </div>

      {hasVitals(v.vitals) && (
        <div className={f.block} style={{ padding: 0 }}>
          <div className={f.blockTitle} style={{ padding: '12px 16px 0' }}><Icon name="activity" /> Readings</div>
          <VitalsGrid vitals={v.vitals} />
        </div>
      )}
      <div className={f.block}>
        <div className={f.blockTitle}><Icon name="file" /> What was done</div>
        <div className={f.blockText}>{pick(v, 'summary', 'notes', 'patientSummary') || 'Your nurse hasn’t added a summary yet.'}</div>
      </div>
      {pick(v, 'nextSteps', 'instructions') && (
        <div className={f.block}>
          <div className={f.blockTitle}><Icon name="check" /> What to do next</div>
          <div className={f.blockText}>{pick(v, 'nextSteps', 'instructions')}</div>
        </div>
      )}
      {pick(v, 'reportUrl') && (
        <p style={{ marginBottom: 12 }}><a className={p.docOpen} href={v.reportUrl} target="_blank" rel="noopener noreferrer"><Icon name="download" /> Full visit report</a></p>
      )}

      {rated ? (
        <div className={f.block}>
          <div className={f.blockTitle}>Your rating</div>
          <Stars value={rated} /> {pick(v, 'feedback', 'ratingComment') && <span className={f.blockText}> — {pick(v, 'feedback', 'ratingComment')}</span>}
        </div>
      ) : (
        <RateForm onClose={onClose} onRate={onRate} name={pick(v.caregiver || {}, 'name')} />
      )}
    </>
  );
}

function RateForm({ name, onClose, onRate }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!rating) return setError('Tap a star to rate the visit.');
    if (rating <= 2 && !comment.trim()) return setError('Please tell us what went wrong so we can fix it.');
    setError('');
    setBusy(true);
    try {
      await onRate({ rating, comment: comment.trim() || undefined });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={f.block}>
        <div className={f.blockTitle}>How was this visit{name ? ` with ${name}` : ''}?</div>
        <div className={p.stars} role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} className={`${p.star} ${n <= rating ? p.starOn : ''}`} onClick={() => setRating(n)}>★</button>
          ))}
        </div>
        <div className={s.field} style={{ marginTop: 10 }}>
          <label htmlFor="rvComment">Comment {rating > 0 && rating <= 2 && <span className={s.req}>*</span>}</label>
          <textarea id="rvComment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Only DiGi Health’s care team sees this" style={{ minHeight: 60 }} />
        </div>
      </div>
      {error && <p className={s.fieldError}>{error}</p>}
      <div className={s.modalActions} style={{ marginTop: 6 }}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Close</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Sending…' : 'Send rating'}</button>
      </div>
    </form>
  );
}

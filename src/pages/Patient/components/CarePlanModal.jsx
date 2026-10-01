import Modal from '../../../components/Modal/Modal';
import Icon from '../../../components/Icon/Icon';
import { formatDay, pick } from '../../../utils/format';
import { CaregiverCard } from './PatientParts';
import { num, serviceLabel } from '../patientFields';
import p from '../Patient.module.css';

/* The patient's care plan: programme, progress and goals. */
export function CarePlanModal({ open, plan, loading, onClose }) {
  const done = num(pick(plan || {}, 'visitsCompleted', 'completedVisits'));
  const planned = num(pick(plan || {}, 'visitsPlanned', 'totalVisits'));
  const pct = planned ? Math.min(100, Math.round((done / planned) * 100)) : 0;
  return (
    <Modal isOpen={open} onClose={onClose} title="My care plan">
      {loading ? <div className={p.empty}>Loading…</div> : !plan ? (
        <div className={p.empty}>
          <strong>No care plan yet</strong>
          After your first assessment, your nurse sets out your plan and goals here.
        </div>
      ) : (
        <div className={p.plan}>
          <div className={p.planName}>{pick(plan, 'programName', 'name') || serviceLabel(plan.serviceType)}</div>
          <div className={p.planDates}>
            {[plan.startDate && `${formatDay(plan.startDate)} – ${plan.endDate ? formatDay(plan.endDate) : 'ongoing'}`, plan.frequency].filter(Boolean).join(' · ')}
          </div>
          {planned > 0 && (
            <>
              <div className={p.progress} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Visits completed"><div className={p.progressFill} style={{ width: `${pct}%` }} /></div>
              <div className={p.progressLbl}><span>{done} of {planned} visits done</span><span>{pct}%</span></div>
            </>
          )}
          {Array.isArray(plan.goals) && plan.goals.length > 0 && (
            <ul className={p.goals}>
              {plan.goals.map((g, i) => <li key={i}><Icon name="check" />{typeof g === 'string' ? g : pick(g, 'text', 'title', 'description')}</li>)}
            </ul>
          )}
          {plan.coordinator && <CaregiverCard of={{ caregiver: plan.coordinator }} role="Your care coordinator" />}
        </div>
      )}
    </Modal>
  );
}

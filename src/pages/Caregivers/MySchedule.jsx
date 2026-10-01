import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { providerApi } from '../../Api/providerApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { humanize, pick, toISODate } from '../../utils/format';
import { locationOf, serviceOf, visitDateOf, visitDuration, visitMinutes, visitStatus, visitTime } from './fields';
import { ScheduleVisitModal } from './components/ProviderModals';
import s from '../Admin/admin.module.css';
import p from './Provider.module.css';
import w from '../Admin/Schedule.module.css';

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}
const mondayOf = (iso) => addDays(iso, -((new Date(`${iso}T00:00:00`).getDay() + 6) % 7));

export default function MySchedule() {
  usePageHeader('My Schedule', 'Your visits week by week');
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();

  const todayIso = toISODate(new Date());
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayIso));
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const visits = useApi(() => providerApi.visits(weekStart, weekEnd), weekStart);
  const patients = useApi(() => providerApi.patients(), 'p-patients');
  const all = asList(visits.data);

  const byDay = days.map((d) => ({
    date: d,
    items: all
      .filter((v) => visitDateOf(v) === d)
      .sort((a, b) => visitMinutes(a) - visitMinutes(b)),
  }));

  const [scheduling, setScheduling] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(null);

  async function setStatus(v, status) {
    setBusy(v.id);
    try {
      await providerApi.updateVisitStatus(v.id, status);
      visits.reload();
      if (status === 'COMPLETED') {
        navigate('/caregiver/reports', { state: { newReportFor: { visitId: v.id, requestId: pick(v, 'careRequestId', 'requestId'), patientName: pick(v, 'patientName', 'patient') } } });
        return;
      }
      showToast('success', status === 'CANCELLED' ? 'Visit cancelled. Your patient will be notified.' : 'Visit started.');
      setCancelling(null);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(null);
    }
  }

  const label = `${new Date(`${weekStart}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(`${weekEnd}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={`${s.card} ${s.spaced}`}>
        <div className={w.weekBar}>
          <button type="button" className={w.navBtn} onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week"><Icon name="chevronLeft" /></button>
          <strong style={{ flex: 1, fontSize: 14, color: 'var(--navy)' }}>{label}</strong>
          <button type="button" className={w.navBtn} onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week"><Icon name="chevronRight" /></button>
          {weekStart !== mondayOf(todayIso) && (
            <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={() => setWeekStart(mondayOf(todayIso))}>This week</button>
          )}
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setScheduling(true)}>
            <Icon name="plus" /> Schedule visit
          </button>
        </div>
      </div>

      <div className={s.card}>
        {visits.loading ? (
          <div className={s.emptyBlock}>Loading…</div>
        ) : visits.error && !all.length ? (
          <div className={s.emptyBlock}><p className={s.fieldError}>{visits.error}</p></div>
        ) : !all.length ? (
          <div className={s.emptyBlock}>
            <Icon name="calendar" />
            <p>No visits this week.</p>
          </div>
        ) : (
          byDay.filter((d) => d.items.length).map((d) => (
            <section key={d.date} className={p.dayGroup}>
              <div className={`${p.dayHead} ${d.date === todayIso ? p.dayToday : ''}`}>
                <span>{new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}{d.date === todayIso ? ' · Today' : ''}</span>
                <span>{d.items.length} visit{d.items.length === 1 ? '' : 's'}</span>
              </div>
              <div className={p.body} style={{ paddingTop: 0, paddingBottom: 0 }}>
                {d.items.map((v) => {
                  const vs = visitStatus(v);
                  const past = d.date < todayIso;
                  return (
                    <div key={v.id} className={p.scheduleItem}>
                      <div className={p.sTime}>
                        <div className={p.timeVal}>{visitTime(v)}</div>
                        <div className={p.timeDur}>{visitDuration(v)}</div>
                      </div>
                      <div className={`${p.sLine} ${vs === 'IN_PROGRESS' ? p.sLineActive : ''}`} />
                      <div className={p.sInfo}>
                        <h4>{pick(v, 'title', 'visitType') || humanize(serviceOf(v))}</h4>
                        <div className={p.sPatient}>{pick(v, 'patientName', 'patient') || '—'} · {humanize(serviceOf(v))}</div>
                        <div className={p.sLocation}><Icon name="mapPin" />{locationOf(v)}</div>
                        {v.notes && <div className={p.sPatient} style={{ marginTop: 6 }}>Note: {v.notes}</div>}
                      </div>
                      <div className={p.sRight}>
                        <StatusBadge status={vs} />
                        <div className={s.actions}>
                          {(vs === 'UPCOMING' || vs === 'SCHEDULED') && d.date === todayIso && (
                            <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busy === v.id} onClick={() => setStatus(v, 'IN_PROGRESS')}>Start</button>
                          )}
                          {vs === 'IN_PROGRESS' && (
                            <button type="button" className={`${s.btn} ${s.btnApprove}`} disabled={busy === v.id} onClick={() => setStatus(v, 'COMPLETED')}>Complete & report</button>
                          )}
                          {(vs === 'UPCOMING' || vs === 'SCHEDULED') && !past && (
                            <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => setCancelling(v)}>Cancel</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      <ScheduleVisitModal
        open={scheduling}
        patients={asList(patients.data)}
        onClose={() => setScheduling(false)}
        onDone={(msg) => { setScheduling(false); showToast('success', msg); visits.reload(); }}
      />

      <ConfirmDialog
        isOpen={!!cancelling}
        title="Cancel visit"
        message={cancelling ? `Cancel the ${visitTime(cancelling)} visit with ${pick(cancelling, 'patientName', 'patient') || 'this patient'}?` : ''}
        confirmLabel="Cancel visit"
        danger
        busy={busy === cancelling?.id}
        onClose={() => setCancelling(null)}
        onConfirm={() => setStatus(cancelling, 'CANCELLED')}
      />
    </>
  );
}

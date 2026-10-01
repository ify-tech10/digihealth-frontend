import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { providerApi } from '../../Api/providerApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/useAuth';
import { formatMoney, humanize, initials, pick } from '../../utils/format';
import { locationLabel } from '../../config/locations';
import {
  isNewAssignment, locationOf, patientName, requestIdOf, serviceOf, statusOf,
  visitDuration, visitMinutes, visitStatus, visitTime,
} from './fields';
import { PatientModal, ScheduleVisitModal, CloseRequestModal } from './components/ProviderModals';
import s from '../Admin/admin.module.css';
import p from './Provider.module.css';

const REFRESH_MS = 60000;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function ProviderDashboard() {
  const { user } = useAuth();
  const { setHeader, setBadges } = useOutletContext();
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();

  const stats = useApi(() => providerApi.dashboard(), 'p-stats');
  const today = useApi(() => providerApi.scheduleToday(), 'p-today');
  const avail = useApi(() => providerApi.availabilityStatus(), 'p-avail');
  const earnings = useApi(() => providerApi.earningsSummary(), 'p-earn');
  const patients = useApi(() => providerApi.patients(), 'p-patients');

  /* refresh every minute, like the reference page */
  const r1 = stats.reload;
  const r2 = today.reload;
  const r3 = patients.reload;
  useEffect(() => {
    const t = setInterval(() => { r1(); r2(); r3(); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [r1, r2, r3]);

  const visits = asList(today.data).slice().sort((a, b) => visitMinutes(a) - visitMinutes(b));
  const myPatients = asList(patients.data);
  const newOnes = myPatients.filter(isNewAssignment);
  const st = stats.data || {};

  const visitsToday = pick(st, 'visitsToday', 'todayVisits') ?? (today.loading ? null : visits.length);
  const activePatients = pick(st, 'activePatients', 'patients') ?? (patients.loading ? null : myPatients.filter((x) => statusOf(x) === 'ACTIVE').length);
  const totalVisits = pick(st, 'totalVisits', 'visitsCompleted');
  const monthEarnings = pick(st, 'monthEarnings', 'thisMonthEarnings') ?? pick(earnings.data || {}, 'total', 'thisMonthEarnings');

  /* topbar: greeting + today's count */
  const first = String(user?.name || '').split(/[\s@]/)[0];
  useEffect(() => {
    setHeader({
      title: `${greeting()}${first ? `, ${first}` : ''} 👋`,
      subtitle: visitsToday == null ? 'Loading your day…' : `You have ${visitsToday} visit${visitsToday === 1 ? '' : 's'} scheduled today.`,
    });
  }, [setHeader, first, visitsToday]);

  useEffect(() => {
    setBadges({ newAssignments: newOnes.length });
  }, [newOnes.length, setBadges]);

  /* ── availability toggle (optimistic, reverts on failure) ── */
  const serverAvailable = pick(avail.data || {}, 'isAvailable', 'available') ?? true;
  const [availOverride, setAvailOverride] = useState(null);
  const isAvailable = availOverride ?? serverAvailable;
  const [savingAvail, setSavingAvail] = useState(false);

  async function toggleAvailability(next) {
    setAvailOverride(next);
    setSavingAvail(true);
    try {
      await providerApi.setAvailabilityStatus(next);
      showToast('success', next ? 'You are now available for assignments.' : 'You are now unavailable for new assignments.');
    } catch (err) {
      setAvailOverride(!next);
      showToast('error', `Couldn't update availability: ${err.message}`);
    } finally {
      setSavingAvail(false);
    }
  }

  /* ── visit status actions ── */
  const [busyVisit, setBusyVisit] = useState(null);
  async function setVisit(v, status) {
    setBusyVisit(v.id);
    try {
      await providerApi.updateVisitStatus(v.id, status);
      today.reload();
      if (status === 'COMPLETED') {
        navigate('/caregiver/reports', { state: { newReportFor: { visitId: v.id, requestId: pick(v, 'careRequestId', 'requestId'), patientName: pick(v, 'patientName', 'patient') } } });
      } else {
        showToast('success', 'Visit started.');
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusyVisit(null);
    }
  }

  const [viewing, setViewing] = useState(null);
  const [scheduling, setScheduling] = useState(null);
  const [closing, setClosing] = useState(null);

  const areas = pick(avail.data || {}, 'areas', 'coverageAreas');
  const areaText = Array.isArray(areas) ? areas.map(locationLabel).join(', ') : areas || 'Not set';
  const e = earnings.data || {};
  const show = (state, v, fmt = (x) => x) => (state.loading && v == null ? '…' : v == null ? '—' : fmt(v));

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      {newOnes.length > 0 && (
        <Link to="/caregiver/patients" className={p.banner}>
          <Icon name="bell" />
          <span><strong>{newOnes.length} new assignment{newOnes.length === 1 ? '' : 's'}</strong> from your supervisor — review and schedule the first visit.</span>
          <span className={p.bannerCta}>Open →</span>
        </Link>
      )}

      {/* ── STATS ── */}
      <div className={p.stats4}>
        <StatCard label="Visits Today" icon="calendar" color="green" value={show(today, visitsToday)} />
        <StatCard label="Active Patients" icon="users" color="blue" value={show(patients, activePatients)} />
        <StatCard label="Total Visits" icon="check" color="purple" value={show(stats, totalVisits)} />
        <StatCard label="This Month" icon="dollar" color="orange" value={show(earnings, monthEarnings, formatMoney)} />
      </div>

      <div className={p.grid31}>
        {/* ── TODAY'S SCHEDULE ── */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3>Today's Schedule — {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
            <Link to="/caregiver/schedule">Full calendar</Link>
          </div>
          <div className={p.body}>
            {today.loading ? (
              <p className={s.muted}>Loading…</p>
            ) : today.error && !visits.length ? (
              <p className={s.fieldError}>{today.error}</p>
            ) : !visits.length ? (
              <div className={s.emptyBlock}><Icon name="calendar" /><p>No visits today.</p></div>
            ) : (
              visits.map((v) => {
                const vs = visitStatus(v);
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
                    </div>
                    <div className={p.sRight}>
                      <StatusBadge status={vs} />
                      {(vs === 'UPCOMING' || vs === 'SCHEDULED') && (
                        <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busyVisit === v.id} onClick={() => setVisit(v, 'IN_PROGRESS')}>Start visit</button>
                      )}
                      {vs === 'IN_PROGRESS' && (
                        <button type="button" className={`${s.btn} ${s.btnApprove}`} disabled={busyVisit === v.id} onClick={() => setVisit(v, 'COMPLETED')}>Complete & report</button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={p.stack}>
          {/* ── AVAILABILITY ── */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <h3>Availability</h3>
              <Link to="/caregiver/availability">Calendar</Link>
            </div>
            <div className={p.body}>
              <div className={`${p.availToggle} ${isAvailable ? '' : p.availOff}`}>
                <span className={p.availLabel} id="availLabel">
                  {isAvailable ? 'Available for assignments' : 'Not taking assignments'}
                </span>
                <label className={p.switch}>
                  <input
                    type="checkbox"
                    aria-labelledby="availLabel"
                    checked={isAvailable}
                    disabled={savingAvail || avail.loading}
                    onChange={(ev) => toggleAvailability(ev.target.checked)}
                  />
                  <span className={p.slider} />
                </label>
              </div>
              <div className={p.availInfo}>
                <div><Icon name="calendar" />{pick(avail.data || {}, 'schedule', 'workingHours') || 'Working hours not set'}</div>
                <div><Icon name="mapPin" />{areaText}</div>
              </div>
            </div>
          </div>

          {/* ── EARNINGS ── */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <h3>Earnings — {new Date().toLocaleDateString('en-GB', { month: 'long' })}</h3>
              <Link to="/caregiver/earnings">Details</Link>
            </div>
            <div className={p.body}>
              {earnings.error && !earnings.data ? (
                <p className={s.muted} style={{ fontSize: 13 }}>Earnings are unavailable right now.</p>
              ) : (
                <>
                  <div className={p.earnRow}><span className={p.earnLabel}>Completed visits</span><span className={p.earnVal}>{show(earnings, pick(e, 'completedVisits', 'visitsThisMonth'))}</span></div>
                  <div className={p.earnRow}>
                    <span className={p.earnLabel}>{humanize(pick(e, 'structure', 'earningStructure')) !== '—' ? `Rate (${humanize(pick(e, 'structure', 'earningStructure')).toLowerCase()})` : 'Rate per visit'}</span>
                    <span className={p.earnVal}>{show(earnings, pick(e, 'ratePerVisit', 'earningPerVisit', 'rate'), formatMoney)}</span>
                  </div>
                  <div className={p.earnRow}><span className={p.earnLabel}>Bonuses</span><span className={`${p.earnVal} ${p.earnGreen}`}>+{show(earnings, pick(e, 'bonuses', 'bonusAmount') ?? 0, formatMoney)}</span></div>
                  <div className={`${p.earnRow} ${p.earnTotal}`}><span className={p.earnLabel}>Total earned</span><span className={`${p.earnVal} ${p.earnGreen}`}>{show(earnings, pick(e, 'total', 'thisMonthEarnings', 'monthEarnings'), formatMoney)}</span></div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTIVE PATIENTS ── */}
      <div className={s.card}>
        <div className={s.cardHeader}>
          <h3>My Active Patients</h3>
          <Link to="/caregiver/patients">View all</Link>
        </div>
        <div className={p.body}>
          {patients.loading ? (
            <p className={s.muted}>Loading…</p>
          ) : patients.error && !myPatients.length ? (
            <p className={s.fieldError}>{patients.error}</p>
          ) : !myPatients.length ? (
            <div className={s.emptyBlock}><Icon name="users" /><p>No patients assigned yet.</p></div>
          ) : (
            <div className={p.patientGrid}>
              {myPatients.slice(0, 8).map((pt) => (
                <button
                  key={requestIdOf(pt)}
                  type="button"
                  className={p.patientItem}
                  style={{ border: 'none', borderBottom: '1px solid #f5f6fc', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => setViewing(pt)}
                >
                  <div className={p.pAvatar}>{pt.initials || initials(patientName(pt))}</div>
                  <div className={p.pInfo}>
                    <h4>{patientName(pt)}{isNewAssignment(pt) && <span className={p.newTag}>NEW</span>}</h4>
                    <p>{humanize(serviceOf(pt))} · Next: {pick(pt, 'nextVisit', 'nextVisitAt') || '—'}</p>
                  </div>
                  <StatusBadge status={statusOf(pt)} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <PatientModal
        patient={viewing}
        onClose={() => setViewing(null)}
        onSchedule={(pt) => { setViewing(null); setScheduling(pt); }}
        onReport={(pt) => navigate('/caregiver/reports', { state: { newReportFor: { requestId: requestIdOf(pt), patientName: patientName(pt) } } })}
        onCloseRequest={(pt) => { setViewing(null); setClosing(pt); }}
      />
      <ScheduleVisitModal
        open={!!scheduling}
        patient={scheduling}
        onClose={() => setScheduling(null)}
        onDone={(msg) => { setScheduling(null); showToast('success', msg); today.reload(); patients.reload(); }}
      />
      <CloseRequestModal
        patient={closing}
        onClose={() => setClosing(null)}
        onDone={(msg) => { setClosing(null); showToast('success', msg); patients.reload(); }}
      />
    </>
  );
}

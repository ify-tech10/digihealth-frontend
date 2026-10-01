import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import StatCard from '../../components/Statcard/Statcard';
import Icon from '../../components/Icon/Icon';
import { patientApi } from '../../Api/patientApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/useAuth';
import { formatDate, formatMoney, pick } from '../../utils/format';
import { BookingStatus, CaregiverCard, DateTile } from './components/PatientParts';
import { CarePlanModal } from './components/CarePlanModal';
import {
  EMERGENCY, VITALS, bookingStatus, canChange, caregiverName, caregiverOf, firstName, greeting, hasNewReply, invBalance, isUpcoming,
  serviceLabel, slotLabel, ticketOpen, whenOf,
} from './patientFields';
import s from '../Admin/admin.module.css';
import p from './Patient.module.css';

const RECENT = 5;
const longDay = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const time = (d) => d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
const visitAt = (v) => new Date(pick(v, 'checkInAt', 'scheduledAt', 'date') || 0);
const isDoneVisit = (v) => ['COMPLETED', 'DONE', 'APPROVED', 'CLOSED'].includes(String(v.status || 'COMPLETED').toUpperCase());

/* When a booking happens, as the reference shows it: "9:00 AM – 10:30 AM" or the slot. */
function timeRange(b) {
  const start = pick(b, 'scheduledAt', 'startTime');
  if (start) {
    const end = pick(b, 'endTime', 'scheduledEnd');
    return end ? `${time(new Date(start))} – ${time(new Date(end))}` : time(new Date(start));
  }
  return b.timeSlot ? slotLabel(b.timeSlot) : 'Time to be confirmed';
}

/* "Latest care summary" lines: the visit's own items, or built from its notes and readings. */
function summaryItems(v) {
  if (Array.isArray(v.summaryItems) && v.summaryItems.length) {
    return v.summaryItems.map((x) => ({ tone: String(x.tone || x.type || 'blue').toLowerCase(), title: pick(x, 'title', 'heading'), text: pick(x, 'text', 'body', 'description') }));
  }
  const items = [];
  const vit = v.vitals || {};
  if (pick(v, 'summary', 'notes')) items.push({ tone: 'green', icon: 'check', title: 'What your nurse did', text: pick(v, 'summary', 'notes') });
  const readings = VITALS.filter(([k]) => vit[k] != null && vit[k] !== '');
  if (readings.length) {
    const [k0, l0, u0] = readings.find(([k]) => k === 'bloodPressure') || readings[0];
    items.push({
      tone: 'blue',
      icon: 'activity',
      title: `${l0}: ${vit[k0]}${k0 === 'bloodPressure' ? ' mmHg' : u0 ? ` ${u0}` : ''}`,
      text: readings.filter(([k]) => k !== k0).map(([k, l, u]) => `${l} ${vit[k]}${u ? ` ${u}` : ''}`).join(' · ') || 'Recorded during the visit.',
    });
  }
  if (pick(v, 'nextSteps', 'instructions')) items.push({ tone: 'orange', icon: 'alert', title: 'Next steps', text: pick(v, 'nextSteps', 'instructions') });
  return items;
}
const TONE_ICON = { green: 'check', blue: 'activity', orange: 'alert', red: 'alert', purple: 'heart' };

export default function PatientDashboard() {
  const { user } = useAuth();
  const { setHeader, setBadges } = useOutletContext();
  const [planOpen, setPlanOpen] = useState(false);

  const bookings = useApi(() => patientApi.bookings(), 'pt-bookings');
  const visits = useApi(() => patientApi.visits(), 'pt-visits');
  const docs = useApi(() => patientApi.documents(), 'pt-docs');
  const invoices = useApi(() => patientApi.invoices(), 'pt-invoices');
  const profile = useApi(() => patientApi.profile(), 'pt-profile');
  const tickets = useApi(() => patientApi.tickets(), 'pt-tickets');
  const plan = useApi(() => patientApi.carePlan(), 'pt-plan');

  const all = asList(bookings.data);
  const upcoming = all.filter(isUpcoming).sort((a, b) => (whenOf(a) || 0) - (whenOf(b) || 0));
  const next = upcoming[0];
  const completed = all.filter((b) => bookingStatus(b) === 'COMPLETED');
  const recent = all
    .filter((b) => ['COMPLETED', 'CANCELLED'].includes(bookingStatus(b)))
    .sort((a, b) => (whenOf(b) || 0) - (whenOf(a) || 0))
    .slice(0, RECENT);
  const doneVisits = asList(visits.data).filter(isDoneVisit).sort((a, b) => visitAt(b) - visitAt(a));
  const latest = doneVisits[0];
  const items = latest ? summaryItems(latest) : [];
  /* "My nurse": whoever is coming next, else whoever came last */
  const nurseOf = (next && caregiverName(next) && next) || (latest && caregiverName(latest) && latest) || completed.find((b) => caregiverName(b));
  const nurse = nurseOf ? caregiverOf(nurseOf) || {} : null;
  const owed = asList(invoices.data).reduce((t, i) => t + invBalance(i), 0);
  const unpaidCount = asList(invoices.data).filter((i) => invBalance(i) > 0).length;
  const replies = asList(tickets.data).filter((t) => ticketOpen(t) && hasNewReply(t)).length;
  const carePlan = plan.data && !Array.isArray(plan.data) && Object.keys(plan.data).length ? plan.data : null;

  const name = firstName(pick(profile.data || {}, 'firstName', 'fullName', 'name') || user?.name);
  useEffect(() => {
    setHeader({ title: `${greeting()}${name ? `, ${name}` : ''} 👋`, subtitle: 'Here’s your care overview for today.' });
  }, [setHeader, name]);
  useEffect(() => {
    if (!bookings.loading && !bookings.error) setBadges({ upcoming: upcoming.length });
  }, [bookings.loading, bookings.error, upcoming.length, setBadges]);
  useEffect(() => {
    if (!invoices.loading && !invoices.error) setBadges({ unpaid: unpaidCount });
  }, [invoices.loading, invoices.error, unpaidCount, setBadges]);
  useEffect(() => {
    if (!tickets.loading && !tickets.error) setBadges({ replies });
  }, [tickets.loading, tickets.error, replies, setBadges]);

  const v = (api, x) => (api.loading ? '…' : api.error ? '—' : x);
  const nextAt = next ? whenOf(next) : null;
  const waiting = next && bookingStatus(next) === 'REQUESTED';

  return (
    <>
      <div className={s.stats4}>
        <StatCard color="blue" icon="calendar" label="Total Visits" value={v(bookings, all.filter((b) => bookingStatus(b) !== 'CANCELLED').length)} />
        <StatCard color="green" icon="check" label="Completed" value={v(bookings, completed.length)} />
        <StatCard color="purple" icon="clock" label="Upcoming" value={v(bookings, upcoming.length)} />
        <StatCard color="orange" icon="file" label="Care Reports" value={v(docs, asList(docs.data).length)} />
      </div>

      {!invoices.loading && owed > 0 && (
        <div className={p.billAlert}>
          <Icon name="card" />
          <span>You have <strong>{formatMoney(owed)}</strong> to pay.</span>
          <Link to="/patient/payments" className={p.btnNavy}>Pay now</Link>
        </div>
      )}

      {/* ── Next scheduled visit ── */}
      <section className={p.next} aria-label="Next scheduled visit">
        {bookings.loading ? (
          <div className={p.nextInner}><div className={p.nvLabel}>Next Scheduled Visit</div><div className={p.nvSub}>Loading…</div></div>
        ) : !next ? (
          <div className={p.nextInner}>
            <div className={p.nvLabel}>Next Scheduled Visit</div>
            <h2 className={p.nvTitle}>No visit booked</h2>
            <div className={p.nvSub}>Book a nurse, physiotherapist or lab test at home whenever you need one.</div>
            <div className={p.nvActions}><Link to="/patient/bookings?new=1" className={`${p.nvBtn} ${p.nvBtnGreen}`}><Icon name="plus" /> Book a visit</Link></div>
          </div>
        ) : (
          <div className={p.nextInner}>
            <div className={`${p.nvBadge} ${waiting ? p.nvBadgeWait : ''}`}>{waiting ? 'Awaiting confirmation' : bookingStatus(next) === 'IN_PROGRESS' ? 'In progress' : 'Upcoming'}</div>
            <div className={p.nvLabel}>Next Scheduled Visit</div>
            <h2 className={p.nvTitle}>{pick(next, 'title') || serviceLabel(next.serviceType)}</h2>
            <div className={p.nvSub}>{caregiverName(next) ? `with ${caregiverName(next)}` : 'We’ll confirm the time and tell you which nurse is coming.'}</div>
            <div className={p.nvDetails}>
              <div className={p.nvDetail}><Icon name="calendar" /><span>{nextAt ? longDay(nextAt) : 'Date to be confirmed'}</span></div>
              <div className={p.nvDetail}><Icon name="clock" /><span>{timeRange(next)}</span></div>
              {(pick(next, 'area', 'areaLga') || next.address) && <div className={p.nvDetail}><Icon name="mapPin" /><span>{pick(next, 'area', 'areaLga') || next.address}</span></div>}
            </div>
            {(canChange(next) || pick(caregiverOf(next) || {}, 'phone', 'phoneNumber')) && (
              <div className={p.nvActions}>
                {pick(caregiverOf(next) || {}, 'phone', 'phoneNumber') && <a className={p.nvBtn} href={`tel:${pick(caregiverOf(next), 'phone', 'phoneNumber')}`}><Icon name="phone" /> Call nurse</a>}
                {canChange(next) && <Link className={p.nvBtn} to="/patient/bookings">Change or cancel</Link>}
                {upcoming.length > 1 && <Link className={p.nvBtn} to="/patient/bookings">+{upcoming.length - 1} more upcoming</Link>}
              </div>
            )}
          </div>
        )}
      </section>

      <div className={p.grid31}>
        {/* ── Recent visits ── */}
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Recent Visits</h3><Link to="/patient/care-history">View all</Link></div>
          <div className={p.body}>
            {bookings.loading ? <div className={p.empty}>Loading…</div>
              : bookings.error ? <div className={p.empty}>{bookings.error}</div>
                : !recent.length ? <div className={p.empty}>Your past visits will appear here.</div>
                  : recent.map((b) => {
                    const at = whenOf(b);
                    return (
                      <div key={b.id} className={p.visitItem}>
                        <DateTile date={at} />
                        <div className={p.vInfo}>
                          <h4>{pick(b, 'title') || serviceLabel(b.serviceType)}</h4>
                          <p>{[caregiverName(b), pick(b, 'scheduledAt', 'startTime') ? time(at) : b.timeSlot ? slotLabel(b.timeSlot).replace(/ \(.*\)$/, '') : null].filter(Boolean).join(' · ') || '—'}</p>
                        </div>
                        <BookingStatus booking={b} />
                      </div>
                    );
                  })}
          </div>
        </div>

        <div className={p.stack}>
          {/* ── My nurse ── */}
          <div className={s.card}>
            <div className={s.cardHeader}><h3>My Nurse</h3></div>
            <div className={p.body}>
              {bookings.loading ? <div className={p.empty}>Loading…</div> : !nurse ? (
                <div className={p.nurseMeta} style={{ marginTop: 0 }}>A nurse is assigned as soon as your booking is confirmed.</div>
              ) : (
                <>
                  <CaregiverCard of={nurseOf} />
                  <p className={p.nurseMeta}>
                    {[
                      nurse.yearsExperience != null && `${nurse.yearsExperience} years experience`,
                      pick(nurse, 'availability', 'availableDays') && `Available ${pick(nurse, 'availability', 'availableDays')}`,
                      nurse.rating != null && `Rated ${Number(nurse.rating).toFixed(1)}★`,
                    ].filter(Boolean).join(' · ') || (next && caregiverName(next) ? `Coming ${nextAt ? nextAt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) : 'soon'}` : 'Your most recent nurse')}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ── Quick actions ── */}
          <div className={s.card}>
            <div className={s.cardHeader}><h3>Quick Actions</h3></div>
            <div className={p.body}>
              <div className={p.qa}>
                <Link className={p.qaBtn} to="/patient/bookings?new=1"><Icon name="calendar" /><span>Book Visit</span></Link>
                <Link className={p.qaBtn} to="/patient/care-reports"><Icon name="file" /><span>View Reports</span></Link>
                <Link className={p.qaBtn} to="/patient/support"><Icon name="message" /><span>Contact Us</span></Link>
                <button type="button" className={p.qaBtn} onClick={() => setPlanOpen(true)}><Icon name="activity" /><span>Care Plan</span></button>
              </div>
              <p className={p.sosLine}>Medical emergency? Call <a href={`tel:${EMERGENCY}`}>{EMERGENCY}</a> immediately.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Latest care summary ── */}
      <div className={s.card}>
        <div className={s.cardHeader}>
          <h3>Latest Care Summary{latest ? ` — ${visitAt(latest).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}</h3>
          {latest && pick(latest, 'reportUrl') ? <a href={latest.reportUrl} target="_blank" rel="noopener noreferrer">Download PDF</a> : <Link to="/patient/care-history">Care history</Link>}
        </div>
        <div className={p.body}>
          {visits.loading ? <div className={p.empty}>Loading…</div>
            : !latest ? <div className={p.empty}>After your first visit, your nurse’s summary appears here.</div>
              : !items.length ? <div className={p.empty}>Your nurse hasn’t added a summary for the visit on {formatDate(visitAt(latest))} yet.</div>
                : items.map((it, i) => (
                  <div key={i} className={p.sumItem}>
                    <div className={`${p.sumIcon} ${p[it.tone] || p.blue}`}><Icon name={it.icon || TONE_ICON[it.tone] || 'check'} /></div>
                    <div className={p.sumText}><h4>{it.title}</h4>{it.text && <p>{it.text}</p>}</div>
                  </div>
                ))}
        </div>
      </div>

      <CarePlanModal open={planOpen} plan={carePlan} loading={plan.loading} onClose={() => setPlanOpen(false)} />
    </>
  );
}

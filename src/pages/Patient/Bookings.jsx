import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { patientApi } from '../../Api/patientApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDate, pick } from '../../utils/format';
import { Tabs } from '../Admin/components/Common';
import { BookingStatus, CaregiverCard } from './components/PatientParts';
import { BookCareModal, CancelBookingModal, RescheduleModal } from './components/BookingForms';
import { DIGI_PHONE, DIGI_PHONE_LABEL, bookingStatus, canChange, isUpcoming, refOf, serviceIcon, serviceLabel, whenLabel, whenOf } from './patientFields';
import s from '../Admin/admin.module.css';
import p from './Patient.module.css';

const TABS = [
  ['UPCOMING', 'Upcoming'],
  ['PAST', 'Past'],
  ['CANCELLED', 'Cancelled'],
];

export default function Bookings() {
  usePageHeader('My Bookings', 'Book care at home and manage your visits');
  const { setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();
  const [params, setParams] = useSearchParams();

  const [tab, setTab] = useState('UPCOMING');
  const [moving, setMoving] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const booking = params.get('new') != null || params.get('service') != null;

  const { data, loading, error, reload } = useApi(() => patientApi.bookings(), 'pt-bookings');
  const profile = useApi(() => patientApi.profile(), 'pt-profile');
  const all = asList(data);
  const upcoming = all.filter(isUpcoming).sort((a, b) => (whenOf(a) || 0) - (whenOf(b) || 0));
  const past = all.filter((b) => bookingStatus(b) === 'COMPLETED').sort((a, b) => (whenOf(b) || 0) - (whenOf(a) || 0));
  const cancelled = all.filter((b) => bookingStatus(b) === 'CANCELLED').sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  const rows = { UPCOMING: upcoming, PAST: past, CANCELLED: cancelled }[tab];

  useEffect(() => {
    if (!loading && !error) setBadges({ upcoming: upcoming.length });
  }, [loading, error, upcoming.length, setBadges]);

  const closeBooking = () => setParams({}, { replace: true });

  async function book(body) {
    await patientApi.book(body);
    closeBooking();
    setTab('UPCOMING');
    showToast('success', `${serviceLabel(body.serviceType)} requested. We’ll confirm and let you know which nurse is coming.`);
    reload();
  }

  const labels = TABS.map(([k, l]) => {
    const n = { UPCOMING: upcoming.length, PAST: past.length, CANCELLED: cancelled.length }[k];
    return [k, !loading && n ? `${l} (${n})` : l];
  });

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={labels} value={tab} onChange={setTab} />
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => setParams({ new: '1' })}><Icon name="plus" /> Book care</button>
        </div>

        {loading ? (
          <div className={p.empty}>Loading your bookings…</div>
        ) : error ? (
          <div className={p.empty}><strong>Couldn’t load your bookings</strong>{error}</div>
        ) : !rows.length ? (
          <div className={p.empty}>
            {tab === 'UPCOMING' ? (
              <>
                <strong>No upcoming visits</strong>
                Book a nurse, physiotherapist or lab test at home.
                <br />
                <button type="button" className={p.heroBtn} onClick={() => setParams({ new: '1' })}><Icon name="plus" /> Book care</button>
              </>
            ) : tab === 'PAST' ? 'Completed visits will appear here.' : 'No cancelled bookings.'}
          </div>
        ) : (
          <div className={p.bookings}>
            {rows.map((b) => {
              const st = bookingStatus(b);
              return (
                <div key={b.id} className={p.booking}>
                  <div className={p.svcIcon}><Icon name={serviceIcon(b.serviceType)} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className={p.bookingHead}>
                      <span className={p.bookingSvc}>{serviceLabel(b.serviceType)}</span>
                      <BookingStatus booking={b} />
                    </div>
                    <div className={p.bookingWhen}>{whenLabel(b)}</div>
                    <div className={p.bookingMeta}>
                      {refOf(b)}
                      {pick(b, 'careRecipient') && ` · for ${b.careRecipient.name || b.careRecipient}`}
                      {b.address && ` · ${b.address}`}
                    </div>
                    {st === 'REQUESTED' && <div className={p.bookingMeta}>Requested {formatDate(b.createdAt)} — a care coordinator will confirm and assign your nurse.</div>}
                    {st === 'CANCELLED' && b.cancelReason && <div className={p.bookingMeta}>Reason: {b.cancelReason}</div>}
                    {['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(st) && <div style={{ marginTop: 10, maxWidth: 420 }}><CaregiverCard of={b} call={st !== 'COMPLETED'} /></div>}
                  </div>
                  <div className={p.bookingSide}>
                    {canChange(b) && (
                      <>
                        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setMoving(b)}>Change date</button>
                        <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => setCancelling(b)}>Cancel</button>
                      </>
                    )}
                    {isUpcoming(b) && !canChange(b) && st !== 'IN_PROGRESS' && (
                      <span className={p.bookingMeta} style={{ maxWidth: 190, textAlign: 'right' }}>Less than 12 hours away — call <a href={`tel:${DIGI_PHONE}`} style={{ color: 'var(--logo-bg)', fontWeight: 600 }}>{DIGI_PHONE_LABEL}</a> to change it.</span>
                    )}
                    {st === 'COMPLETED' && pick(b, 'reportUrl') && <a className={p.docOpen} href={b.reportUrl} target="_blank" rel="noopener noreferrer"><Icon name="file" /> Visit report</a>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BookCareModal open={booking} profile={profile.data} service={params.get('service')} onClose={closeBooking} onSubmit={book} />
      <RescheduleModal
        booking={moving}
        onClose={() => setMoving(null)}
        onSubmit={async (body) => {
          await patientApi.reschedule(moving.id, body);
          setMoving(null);
          showToast('success', 'Date change requested — we’ll confirm the new time.');
          reload();
        }}
      />
      <CancelBookingModal
        booking={cancelling}
        onClose={() => setCancelling(null)}
        onSubmit={async (reason) => {
          await patientApi.cancel(cancelling.id, reason);
          setCancelling(null);
          showToast('success', 'Booking cancelled.');
          reload();
        }}
      />
    </>
  );
}

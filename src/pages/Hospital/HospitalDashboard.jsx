import { useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { facilityApi } from '../../Api/facilityApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/useAuth';
import { formatDate, formatDay, formatMoney, pick, timeAgo, todayLabel } from '../../utils/format';
import { useReferralFlow } from './components/useReferralFlow';
import { ReferralStatus, Urgency } from './components/ReferralParts';
import { byUrgency, fromOf, invNo, invStatus, invTotal, patientName, reqStatus } from '../Facility/facilityFields';
import s from '../Admin/admin.module.css';
import f from '../Facility/Facility.module.css';

const PREVIEW = 5;

export default function HospitalDashboard() {
  const { user } = useAuth();
  const { setHeader, setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const requests = useApi(() => facilityApi.requests(), 'fac-requests-HOSPITAL');
  const invoices = useApi(() => facilityApi.invoices(), 'fac-invoices-HOSPITAL');
  const profile = useApi(() => facilityApi.profile(), 'fac-profile-HOSPITAL');
  const flow = useReferralFlow({ showToast, onChanged: () => { requests.reload(); invoices.reload(); } });

  const all = asList(requests.data);
  const ready = !requests.loading && !requests.error;
  const fresh = all.filter((r) => reqStatus(r) === 'NEW').sort(byUrgency);
  const arriving = all.filter((r) => reqStatus(r) === 'ACCEPTED').sort((a, b) => new Date(a.expectedArrival || 0) - new Date(b.expectedArrival || 0));
  const admitted = all.filter((r) => reqStatus(r) === 'ADMITTED');
  const inv = asList(invoices.data);
  const owed = inv.filter((i) => invStatus(i) === 'APPROVED').reduce((t, i) => t + invTotal(i), 0);

  useEffect(() => {
    setHeader({ title: 'Hospital Dashboard', subtitle: todayLabel() });
  }, [setHeader]);
  useEffect(() => {
    if (ready) setBadges({ newRequests: fresh.length });
  }, [ready, fresh.length, setBadges]);

  const v = (x) => (requests.loading ? '…' : requests.error ? '—' : x);
  const name = pick(profile.data || {}, 'name', 'hospitalName');
  const first = String(pick(user || {}, 'name') || '').trim().split(/\s+/)[0];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <section className={f.hero}>
        <div className={f.heroLeft}>
          <div className={f.heroTag}>{name || 'Hospital Portal'}</div>
          <div className={f.heroTitle}>Welcome{first && !first.includes('@') ? `, ${first}` : ''}</div>
          <div className={f.heroSub}>
            {requests.loading ? 'Loading referrals…' : <><strong>{fresh.length} new referral{fresh.length === 1 ? '' : 's'}</strong> from DiGi Health and <strong>{arriving.length} patient{arriving.length === 1 ? '' : 's'}</strong> on the way.</>}
          </div>
        </div>
        <div className={f.heroRight}>
          <div className={f.heroStat}><div className={f.heroVal}>{v(fresh.length)}</div><div className={f.heroLbl}>New</div></div>
          <div className={f.heroStat}><div className={f.heroVal}>{v(arriving.length)}</div><div className={f.heroLbl}>Arriving</div></div>
          <div className={f.heroStat}><div className={f.heroVal}>{v(admitted.length)}</div><div className={f.heroLbl}>Admitted</div></div>
        </div>
      </section>

      <div className={s.stats4}>
        <StatCard accent color="blue" icon="file" label="New referrals" sub="Accept or decline" value={v(fresh.length)} />
        <StatCard accent color="orange" icon="clock" label="Awaiting arrival" sub="Accepted, not yet here" value={v(arriving.length)} />
        <StatCard accent color="green" icon="home" label="Currently admitted" sub="DiGi patients in your care" value={v(admitted.length)} />
        <StatCard accent color="purple" icon="dollar" label="Owed to you" sub="Approved invoices, not yet paid" value={invoices.loading ? '…' : invoices.error ? '—' : formatMoney(owed)} />
      </div>

      <div className={f.grid31}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>New referrals</h3><span className={s.muted} style={{ fontSize: 12 }}>Urgent first</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.previewTable}>
              <thead><tr><th>Patient</th><th>Reason</th><th>Referred by</th><th>Received</th><th>Actions</th></tr></thead>
              <tbody>
                {requests.loading || !fresh.length ? (
                  <tr><td colSpan={5} className={s.previewEmpty}>{requests.loading ? 'Loading…' : requests.error || 'No new referrals.'}</td></tr>
                ) : fresh.slice(0, PREVIEW).map((r) => (
                  <tr key={r.id}>
                    <td><div className={s.tdName}>{patientName(r)} <Urgency referral={r} /></div></td>
                    <td style={{ minWidth: 220, maxWidth: 280 }} title={pick(r, 'reason', 'diagnosis') || ''}>{(() => { const t = String(pick(r, 'reason', 'diagnosis') || '—'); return t.length > 70 ? `${t.slice(0, 70)}…` : t; })()}</td>
                    <td>{fromOf(r) || '—'}</td>
                    <td className={s.muted} style={{ whiteSpace: 'nowrap' }}>{timeAgo(r.createdAt)}</td>
                    <td>
                      <div className={s.actions}>
                        {flow.actionsFor(r)}
                        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => flow.view(r)}>View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link to="/hospital/referrals" className={f.viewAll}>All referrals <Icon name="chevronRight" /></Link>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>Arriving & admitted</h3></div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.previewTable}>
              <tbody>
                {requests.loading || !(arriving.length + admitted.length) ? (
                  <tr><td className={s.previewEmpty}>{requests.loading ? 'Loading…' : 'No DiGi patients expected or admitted.'}</td></tr>
                ) : [...arriving, ...admitted].slice(0, 6).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className={s.tdName}>{patientName(r)}<small>{reqStatus(r) === 'ACCEPTED' ? `Expected ${formatDate(r.expectedArrival)}` : `${r.ward || 'Admitted'} · since ${formatDay(r.admittedAt)}`}</small></div>
                    </td>
                    <td><ReferralStatus referral={r} /></td>
                    <td><div className={s.actions}>{flow.actionsFor(r)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardHeader}><h3>Recent invoices</h3><Link to="/hospital/invoices">All invoices</Link></div>
        <div style={{ overflowX: 'auto' }}>
          <table className={s.previewTable}>
            <thead><tr><th>Invoice</th><th>For</th><th>Sent</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.loading || !inv.length ? (
                <tr><td colSpan={5} className={s.previewEmpty}>{invoices.loading ? 'Loading…' : invoices.error || 'No invoices yet — discharge a patient to bill DiGi.'}</td></tr>
              ) : inv.slice(0, PREVIEW).map((i) => (
                <tr key={i.id}>
                  <td className={s.tdName}>{invNo(i)}</td>
                  <td>{pick(i, 'requestReference', 'patientName') || '—'}</td>
                  <td className={s.muted}>{formatDay(pick(i, 'createdAt', 'submittedAt'))}</td>
                  <td className={s.money}>{formatMoney(invTotal(i))}</td>
                  <td><StatusBadge status={invStatus(i)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {flow.modals}
    </>
  );
}

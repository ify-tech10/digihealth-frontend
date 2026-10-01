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
import { formatDate, formatDay, formatMoney, formatTime, pick, timeAgo, todayLabel } from '../../utils/format';
import { useTestFlow } from './components/useTestFlow';
import { Collection, TestStatus, Urgency } from './components/TestParts';
import { byUrgency, invNo, invStatus, invTotal, isHomeCollection, patientName, reqStatus, testsOf } from '../Facility/facilityFields';
import { isOverdue, isToday, resultsDue, testsSummary } from './labCentreFields';
import s from '../Admin/admin.module.css';
import f from '../Facility/Facility.module.css';
import l from './Laboratory.module.css';

const PREVIEW = 5;

export default function LabCentreDashboard() {
  const { user } = useAuth();
  const { setHeader, setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const requests = useApi(() => facilityApi.requests(), 'fac-requests-LAB');
  const invoices = useApi(() => facilityApi.invoices(), 'fac-invoices-LAB');
  const profile = useApi(() => facilityApi.profile(), 'fac-profile-LAB');
  const flow = useTestFlow({ showToast, onChanged: () => { requests.reload(); invoices.reload(); } });

  const all = asList(requests.data);
  const ready = !requests.loading && !requests.error;
  const fresh = all.filter((r) => reqStatus(r) === 'NEW').sort(byUrgency);
  const toCollect = all.filter((r) => reqStatus(r) === 'ACCEPTED').sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0));
  const today = toCollect.filter((r) => isToday(r.scheduledAt) || (r.scheduledAt && new Date(r.scheduledAt) < new Date()));
  const processing = all.filter((r) => reqStatus(r) === 'COLLECTED').sort((a, b) => (resultsDue(a) || Infinity) - (resultsDue(b) || Infinity));
  const late = processing.filter(isOverdue);
  const inv = asList(invoices.data);
  const owed = inv.filter((i) => invStatus(i) === 'APPROVED').reduce((t, i) => t + invTotal(i), 0);

  useEffect(() => {
    setHeader({ title: 'Laboratory Dashboard', subtitle: todayLabel() });
  }, [setHeader]);
  useEffect(() => {
    if (ready) setBadges({ newRequests: fresh.length });
  }, [ready, fresh.length, setBadges]);

  const v = (x) => (requests.loading ? '…' : requests.error ? '—' : x);
  const name = pick(profile.data || {}, 'name', 'laboratoryName');
  const first = String(pick(user || {}, 'name') || '').trim().split(/\s+/)[0];
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const upNext = [...today, ...processing].slice(0, 6);

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <section className={f.hero}>
        <div className={f.heroLeft}>
          <div className={f.heroTag}>{name || 'Laboratory Portal'}</div>
          <div className={f.heroTitle}>Welcome{first && !first.includes('@') ? `, ${first}` : ''}</div>
          <div className={f.heroSub}>
            {requests.loading ? 'Loading test requests…' : (
              <><strong>{plural(fresh.length, 'new request')}</strong> from DiGi Health, <strong>{plural(today.length, 'collection')}</strong> due today and <strong>{processing.length}</strong> awaiting results{late.length ? <> — <strong style={{ color: '#fca5a5' }}>{late.length} late</strong></> : ''}.</>
            )}
          </div>
        </div>
        <div className={f.heroRight}>
          <div className={f.heroStat}><div className={f.heroVal}>{v(fresh.length)}</div><div className={f.heroLbl}>New</div></div>
          <div className={f.heroStat}><div className={f.heroVal}>{v(today.length)}</div><div className={f.heroLbl}>Collect today</div></div>
          <div className={f.heroStat}><div className={f.heroVal}>{v(processing.length)}</div><div className={f.heroLbl}>Processing</div></div>
        </div>
      </section>

      <div className={s.stats4}>
        <StatCard accent color="blue" icon="flask" label="New requests" sub="Accept or decline" value={v(fresh.length)} />
        <StatCard accent color="orange" icon="mapPin" label="Collections due today" sub={ready ? `${toCollect.filter(isHomeCollection).length} home · ${toCollect.filter((r) => !isHomeCollection(r)).length} walk-in booked` : ''} value={v(today.length)} />
        <StatCard accent color={late.length ? 'red' : 'green'} icon="clock" label="Awaiting results" sub={ready ? (late.length ? `${late.length} past the promised time` : 'All on time') : ''} value={v(processing.length)} />
        <StatCard accent color="purple" icon="dollar" label="Owed to you" sub="Approved invoices, not yet paid" value={invoices.loading ? '…' : invoices.error ? '—' : formatMoney(owed)} />
      </div>

      <div className={f.grid31}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>New test requests</h3><span className={s.muted} style={{ fontSize: 12 }}>Urgent first</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.previewTable}>
              <thead><tr><th>Patient</th><th>Tests</th><th>Received</th><th>Actions</th></tr></thead>
              <tbody>
                {requests.loading || !fresh.length ? (
                  <tr><td colSpan={4} className={s.previewEmpty}>{requests.loading ? 'Loading…' : requests.error || 'No new test requests.'}</td></tr>
                ) : fresh.slice(0, PREVIEW).map((r) => (
                  <tr key={r.id}>
                    <td><div className={s.tdName}><span>{patientName(r)} <Urgency request={r} /></span><small><Collection request={r} /></small></div></td>
                    <td style={{ minWidth: 160 }}>{testsSummary(testsOf(r))}</td>
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
          <Link to="/laboratory/requests" className={f.viewAll}>All test requests <Icon name="chevronRight" /></Link>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>Up next</h3><span className={s.muted} style={{ fontSize: 12 }}>Collections, then results</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.previewTable}>
              <tbody>
                {requests.loading || !upNext.length ? (
                  <tr><td className={s.previewEmpty}>{requests.loading ? 'Loading…' : 'Nothing to collect or report right now.'}</td></tr>
                ) : upNext.map((r) => {
                  const collecting = reqStatus(r) === 'ACCEPTED';
                  const due = resultsDue(r);
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className={s.tdName}>
                          <span>{patientName(r)} {collecting && <Collection request={r} />}</span>
                          <small className={!collecting && isOverdue(r) ? l.overdue : undefined}>
                            {collecting
                              ? (isToday(r.scheduledAt) ? `Today ${formatTime(r.scheduledAt)}` : `Was due ${formatDate(r.scheduledAt)}`)
                              : due ? `${isOverdue(r) ? 'Overdue — was due' : 'Results due'} ${formatDate(due)}` : `Collected ${formatDate(r.collectedAt)}`}
                          </small>
                        </div>
                      </td>
                      <td><TestStatus request={r} /></td>
                      <td><div className={s.actions}>{flow.actionsFor(r)}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardHeader}><h3>Recent invoices</h3><Link to="/laboratory/invoices">All invoices</Link></div>
        <div style={{ overflowX: 'auto' }}>
          <table className={s.previewTable}>
            <thead><tr><th>Invoice</th><th>For</th><th>Sent</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.loading || !inv.length ? (
                <tr><td colSpan={5} className={s.previewEmpty}>{invoices.loading ? 'Loading…' : invoices.error || 'No invoices yet — send results to bill DiGi.'}</td></tr>
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

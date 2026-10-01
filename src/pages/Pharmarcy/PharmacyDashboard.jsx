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
import { formatDate, formatDay, formatMoney, pick, timeAgo, todayLabel, toISODate } from '../../utils/format';
import { useOrderFlow } from './components/useOrderFlow';
import { OrderStatus, Urgency } from './components/OrderParts';
import { byUrgency, invNo, invStatus, invTotal, itemsOf, orderTotal, patientAddress, patientName, reqStatus } from '../Facility/facilityFields';
import s from '../Admin/admin.module.css';
import f from '../Facility/Facility.module.css';

const PREVIEW = 5;
const summary = (o) => {
  const items = itemsOf(o);
  return items.length ? `${items[0].name}${items.length > 1 ? ` +${items.length - 1} more` : ''}` : '—';
};

export default function PharmacyDashboard() {
  const { user } = useAuth();
  const { setHeader, setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const requests = useApi(() => facilityApi.requests(), 'fac-requests-PHARMACY');
  const invoices = useApi(() => facilityApi.invoices(), 'fac-invoices-PHARMACY');
  const profile = useApi(() => facilityApi.profile(), 'fac-profile-PHARMACY');
  const flow = useOrderFlow({ showToast, onChanged: () => { requests.reload(); invoices.reload(); } });

  const all = asList(requests.data);
  const ready = !requests.loading && !requests.error;
  const fresh = all.filter((o) => reqStatus(o) === 'NEW').sort(byUrgency);
  const inFlight = all.filter((o) => ['ACCEPTED', 'DISPATCHED'].includes(reqStatus(o))).sort((a, b) => new Date(a.dispatchAt || 0) - new Date(b.dispatchAt || 0));
  const month = toISODate(new Date()).slice(0, 7);
  const deliveredMonth = all.filter((o) => reqStatus(o) === 'DELIVERED' && String(o.deliveredAt || '').slice(0, 7) === month);
  const inv = asList(invoices.data);
  const owed = inv.filter((i) => invStatus(i) === 'APPROVED').reduce((t, i) => t + invTotal(i), 0);

  useEffect(() => {
    setHeader({ title: 'Pharmacy Dashboard', subtitle: todayLabel() });
  }, [setHeader]);
  useEffect(() => {
    if (ready) setBadges({ newRequests: fresh.length });
  }, [ready, fresh.length, setBadges]);

  const v = (x) => (requests.loading ? '…' : requests.error ? '—' : x);
  const name = pick(profile.data || {}, 'name', 'pharmacyName');
  const first = String(pick(user || {}, 'name') || '').trim().split(/\s+/)[0];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <section className={f.hero}>
        <div className={f.heroLeft}>
          <div className={f.heroTag}>{name || 'Pharmacy Portal'}</div>
          <div className={f.heroTitle}>Welcome{first && !first.includes('@') ? `, ${first}` : ''}</div>
          <div className={f.heroSub}>
            {requests.loading ? 'Loading orders…' : <><strong>{fresh.length} new order{fresh.length === 1 ? '' : 's'}</strong> from DiGi Health and <strong>{inFlight.length}</strong> being prepared or delivered.</>}
          </div>
        </div>
        <div className={f.heroRight}>
          <div className={f.heroStat}><div className={f.heroVal}>{v(fresh.length)}</div><div className={f.heroLbl}>New</div></div>
          <div className={f.heroStat}><div className={f.heroVal}>{v(inFlight.length)}</div><div className={f.heroLbl}>In progress</div></div>
          <div className={f.heroStat}><div className={f.heroVal}>{v(deliveredMonth.length)}</div><div className={f.heroLbl}>Delivered this month</div></div>
        </div>
      </section>

      <div className={s.stats4}>
        <StatCard accent color="blue" icon="file" label="New orders" sub="Accept or decline" value={v(fresh.length)} />
        <StatCard accent color="orange" icon="clock" label="To deliver" sub="Preparing or on the road" value={v(inFlight.length)} />
        <StatCard accent color="green" icon="check" label="Delivered this month" sub={ready ? formatMoney(deliveredMonth.reduce((t, o) => t + orderTotal(o), 0)) : ''} value={v(deliveredMonth.length)} />
        <StatCard accent color="purple" icon="dollar" label="Owed to you" sub="Approved invoices, not yet paid" value={invoices.loading ? '…' : invoices.error ? '—' : formatMoney(owed)} />
      </div>

      <div className={f.grid31}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>New orders</h3><span className={s.muted} style={{ fontSize: 12 }}>Urgent first</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.previewTable}>
              <thead><tr><th>Patient</th><th>Drugs</th><th>Deliver to</th><th>Received</th><th>Actions</th></tr></thead>
              <tbody>
                {requests.loading || !fresh.length ? (
                  <tr><td colSpan={5} className={s.previewEmpty}>{requests.loading ? 'Loading…' : requests.error || 'No new orders.'}</td></tr>
                ) : fresh.slice(0, PREVIEW).map((o) => (
                  <tr key={o.id}>
                    <td><div className={s.tdName}>{patientName(o)} <Urgency order={o} /></div></td>
                    <td>{summary(o)}</td>
                    <td style={{ maxWidth: 200 }}>{patientAddress(o) || '—'}</td>
                    <td className={s.muted} style={{ whiteSpace: 'nowrap' }}>{timeAgo(o.createdAt)}</td>
                    <td>
                      <div className={s.actions}>
                        {flow.actionsFor(o)}
                        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => flow.view(o)}>View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link to="/pharmacy/orders" className={f.viewAll}>All orders <Icon name="chevronRight" /></Link>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>To deliver</h3></div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.previewTable}>
              <tbody>
                {requests.loading || !inFlight.length ? (
                  <tr><td className={s.previewEmpty}>{requests.loading ? 'Loading…' : 'Nothing waiting to go out.'}</td></tr>
                ) : inFlight.slice(0, 6).map((o) => (
                  <tr key={o.id}>
                    <td><div className={s.tdName}>{patientName(o)}<small>{o.dispatchAt ? `Leaves ${formatDate(o.dispatchAt)}` : patientAddress(o)}</small></div></td>
                    <td><OrderStatus order={o} /></td>
                    <td><div className={s.actions}>{flow.actionsFor(o)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardHeader}><h3>Recent invoices</h3><Link to="/pharmacy/invoices">All invoices</Link></div>
        <div style={{ overflowX: 'auto' }}>
          <table className={s.previewTable}>
            <thead><tr><th>Invoice</th><th>For</th><th>Sent</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.loading || !inv.length ? (
                <tr><td colSpan={5} className={s.previewEmpty}>{invoices.loading ? 'Loading…' : invoices.error || 'No invoices yet — deliver an order to bill DiGi.'}</td></tr>
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

import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import { financeApi } from '../../Api/financeApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, formatMoney, humanize, matches, pick } from '../../utils/format';
import { Detail, DocumentLinks, SearchBox, Tabs } from '../Admin/components/Common';
import { SettleModal } from './components/FinanceModals';
import { inMonth, monthKey, nairaShort, num, sumBy } from './financeFields';
import s from '../Admin/admin.module.css';
import f from './Finance.module.css';

const TABS = [
  ['APPROVED', 'To pay'],
  ['PENDING', 'Awaiting admin'],
  ['PAID', 'Paid'],
  ['ALL', 'All'],
];

const statusOf = (b) => String(b.status || 'PENDING').toUpperCase();
const amountOf = (b) => num(pick(b, 'totalAmount', 'amount'));
const billNo = (b) => pick(b, 'invoiceNumber', 'reference') || `BILL-${b.id}`;
const facilityOf = (b) => pick(b, 'facilityName', 'hospitalName', 'pharmacyName', 'laboratoryName');
const kindOf = (b) => humanize(pick(b, 'facilityType', 'facilityKind'));
const issuedOf = (b) => pick(b, 'issuedAt', 'createdAt', 'submittedAt');

/*
 * Hospitals, pharmacies and labs invoice DiGi Care for what they delivered.
 * The admin approves each bill first; the Finance Manager then pays it.
 */
export default function FacilityBills() {
  usePageHeader('Facility Bills', 'Invoices from hospitals, pharmacies and labs');
  const { setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const [tab, setTab] = useState('APPROVED');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);
  const [paying, setPaying] = useState(null);

  const { data, loading, error, reload } = useApi(() => financeApi.facilityBills(), 'fin-bills');
  const all = asList(data);
  const toPay = all.filter((b) => statusOf(b) === 'APPROVED');
  const paidMonth = all.filter((b) => statusOf(b) === 'PAID' && inMonth(b.paidAt, monthKey()));

  useEffect(() => {
    if (!loading && !error) setBadges({ bills: toPay.length });
  }, [loading, error, toPay.length, setBadges]);

  const rows = all
    .filter((b) => (tab === 'ALL' || statusOf(b) === tab) && matches(query, billNo(b), facilityOf(b), pick(b, 'patientName'), b.description))
    .sort((a, b) => new Date(issuedOf(b) || 0) - new Date(issuedOf(a) || 0));

  async function pay(b, body) {
    await financeApi.payFacilityBill(b.id, { amount: body.amount, paidAt: body.date, method: body.method, reference: body.reference });
    setPaying(null);
    showToast('success', `${formatMoney(body.amount)} paid to ${facilityOf(b) || 'the facility'}.`);
    reload();
  }

  const v = (x) => (loading ? '…' : error ? '—' : x);

  const columns = [
    { key: 'no', header: 'Bill', render: (b) => <span className={f.mono}>{billNo(b)}</span> },
    { key: 'facility', header: 'Facility', render: (b) => <div className={s.tdName}>{facilityOf(b) || '—'}<small>{kindOf(b)}</small></div> },
    { key: 'for', header: 'For', render: (b) => pick(b, 'patientName', 'description') || '—' },
    { key: 'issued', header: 'Received', render: (b) => <span className={s.muted}>{formatDay(issuedOf(b))}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (b) => <span className={f.amount}>{formatMoney(amountOf(b))}</span> },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge status={statusOf(b)} /> },
    { key: 'actions', header: 'Actions', render: (b) => (
      <div className={s.actions} style={{ flexWrap: 'nowrap' }}>
        {statusOf(b) === 'APPROVED' && <button type="button" className={`${s.btn} ${s.btnApprove}`} onClick={() => setPaying(b)}>Pay</button>}
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(b)}>View</button>
      </div>
    ) },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.stats4}>
        <StatCard accent color="red" icon="dollar" label="Approved, to pay" value={v(nairaShort(sumBy(toPay, amountOf)))} sub={loading || error ? '' : `${toPay.length} bill${toPay.length === 1 ? '' : 's'}`} />
        <StatCard accent color="orange" icon="clock" label="Awaiting admin" value={v(all.filter((b) => statusOf(b) === 'PENDING').length)} sub="Not payable yet" />
        <StatCard accent color="green" icon="check" label="Paid this month" value={v(nairaShort(sumBy(paidMonth, amountOf)))} />
        <StatCard accent color="blue" icon="plusHouse" label="Facilities billing" value={v(new Set(all.map(facilityOf).filter(Boolean)).size)} />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS} value={tab} onChange={setTab} />
          <SearchBox value={query} onChange={setQuery} placeholder="Search facility, patient…" />
        </div>
        <DataTable key={tab} columns={columns} rows={rows} loading={loading} error={error} emptyText={query ? 'No bills match your search.' : tab === 'APPROVED' ? 'No approved bills waiting for payment.' : 'No bills here.'} />
      </div>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${billNo(viewing)} — ${facilityOf(viewing) || ''}` : ''}>
        {viewing && (
          <>
            <div className={s.details}>
              <Detail label="Facility">{facilityOf(viewing)}</Detail>
              <Detail label="Type">{kindOf(viewing)}</Detail>
              <Detail label="Patient">{pick(viewing, 'patientName')}</Detail>
              <Detail label="Request">{pick(viewing, 'requestId', 'serviceRequestId') != null ? `#${pick(viewing, 'requestId', 'serviceRequestId')}` : '—'}</Detail>
              <Detail label="Amount"><span className={f.big}>{formatMoney(amountOf(viewing))}</span></Detail>
              <Detail label="Status"><StatusBadge status={statusOf(viewing)} /></Detail>
              <Detail label="Received">{formatDay(issuedOf(viewing))}</Detail>
              {viewing.paidAt && <Detail label="Paid">{formatDay(viewing.paidAt)}</Detail>}
              <Detail label="Description" full>{pick(viewing, 'description', 'items')}</Detail>
              {pick(viewing, 'adminNote', 'reviewNote') && <Detail label="Admin’s note" full>{pick(viewing, 'adminNote', 'reviewNote')}</Detail>}
              <div className={`${s.detail} ${s.full}`}>
                <span>Attachments</span>
                <DocumentLinks record={viewing} />
              </div>
            </div>
            {statusOf(viewing) === 'APPROVED' && (
              <div className={s.modalActions}>
                <button type="button" className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`} onClick={() => { const b = viewing; setViewing(null); setPaying(b); }}>Pay this bill</button>
              </div>
            )}
          </>
        )}
      </Modal>

      <SettleModal
        target={paying}
        title="Pay facility bill"
        intro={paying ? `${facilityOf(paying) || 'Facility'} — ${billNo(paying)}. The admin approved the full amount.` : ''}
        defaultAmount={paying ? amountOf(paying) : 0}
        withMethod
        allowPartial={false}
        onClose={() => setPaying(null)}
        onConfirm={pay}
      />
    </>
  );
}

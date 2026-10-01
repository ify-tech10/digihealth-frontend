import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Badge from '../../components/Badge/Badge';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { usePageHeader } from '../../hooks/usePageHeader';
import { locationLabel } from '../../config/locations';
import { formatDay, formatMoney, humanize, matches, pick } from '../../utils/format';
import { Detail, Person, SearchBox, Tabs } from './components/Common';
import { isActiveRecord } from './components/status';
import s from './admin.module.css';

const TYPE_TABS = [
  ['ALL', 'All'],
  ['HMO', 'HMO'],
  ['STANDARD', 'Standard'],
];

const nameOf = (p) => pick(p, 'fullName', 'name') || [p.firstName, p.lastName].filter(Boolean).join(' ');

/* HMO patients are covered by a plan; standard patients are invoiced per request. */
const typeOf = (p) => {
  const t = String(pick(p, 'patientType', 'type') || '').toUpperCase();
  if (t === 'HMO' || t === 'STANDARD') return t;
  return pick(p, 'hmoName', 'hmoPlanName', 'hmoSubscriptionId') ? 'HMO' : 'STANDARD';
};
const hmoExpiry = (p) => pick(p, 'hmoExpiryDate', 'subscriptionExpiryDate', 'coverageEndDate');
const benefitLeft = (p) => pick(p, 'benefitRemaining', 'remainingBenefit');
const nextOfKinDone = (p) => Boolean(pick(p, 'nextOfKinName', 'nextOfKin') || p.nextOfKinCompleted);
const consentSigned = (p) => Boolean(p.consentSigned || p.healthcareConsentSigned || pick(p, 'consentSignedAt'));

function statusOf(p) {
  if (typeOf(p) === 'HMO') {
    const exp = hmoExpiry(p);
    if (exp && new Date(exp) < new Date()) return 'EXPIRED';
  }
  return p.status || (isActiveRecord(p) ? 'ACTIVE' : 'INACTIVE');
}

export default function Patients() {
  usePageHeader('Patients', 'HMO and standard patients receiving care');

  const [type, setType] = useState('ALL');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);

  const { data, loading, error } = useApi(() => adminApi.patients(), 'patients');
  const all = asList(data);

  const hmoCount = all.filter((p) => typeOf(p) === 'HMO').length;
  const incomplete = all.filter((p) => !nextOfKinDone(p) || !consentSigned(p)).length;

  const rows = all.filter(
    (p) =>
      (type === 'ALL' || typeOf(p) === type) &&
      matches(query, nameOf(p), p.email, p.phoneNumber, locationLabel(p.locationArea), pick(p, 'hmoName'))
  );

  const columns = [
    { key: 'name', header: 'Patient', render: (p) => <Person name={nameOf(p)} sub={p.email} /> },
    { key: 'type', header: 'Type', render: (p) => (
      typeOf(p) === 'HMO'
        ? <div><Badge variant="new">HMO</Badge><div className={s.muted} style={{ fontSize: 12, marginTop: 2 }}>{pick(p, 'hmoName', 'hmoPlanName') || ''}</div></div>
        : <Badge variant="default">Standard</Badge>
    ) },
    { key: 'phone', header: 'Phone', render: (p) => p.phoneNumber || '—' },
    { key: 'area', header: 'Location', render: (p) => locationLabel(p.locationArea) },
    { key: 'cover', header: 'Cover / benefit left', render: (p) => (
      typeOf(p) !== 'HMO'
        ? <span className={s.muted}>Invoiced per request</span>
        : benefitLeft(p) == null && !hmoExpiry(p)
          ? <span className={s.muted}>—</span>
          : <div>{benefitLeft(p) != null ? formatMoney(benefitLeft(p)) : '—'}{hmoExpiry(p) && <div className={s.muted} style={{ fontSize: 12 }}>until {formatDay(hmoExpiry(p))}</div>}</div>
    ) },
    { key: 'profile', header: 'Profile', render: (p) => (
      nextOfKinDone(p) && consentSigned(p)
        ? <Badge variant="active">Complete</Badge>
        : <Badge variant="pending">Incomplete</Badge>
    ) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={statusOf(p)} /> },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(p)}>View</button>
      ),
    },
  ];

  return (
    <>
      <div className={s.stats4}>
        <StatCard label="Total patients" value={loading ? '…' : all.length} icon="users" color="blue" />
        <StatCard label="HMO patients" value={loading ? '…' : hmoCount} icon="briefcase" color="purple" />
        <StatCard label="Standard patients" value={loading ? '…' : all.length - hmoCount} icon="file" color="green" />
        <StatCard label="Profile incomplete" value={loading ? '…' : incomplete} icon="clock" color="orange" />
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TYPE_TABS} value={type} onChange={setType} />
          <SearchBox value={query} onChange={setQuery} placeholder="Search name, phone, HMO…" />
        </div>
        <DataTable
          key={type}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query ? 'No patients match your search.' : 'No patients here.'}
        />
      </div>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing ? nameOf(viewing) : ''} size="large">
        {viewing && (
          <div className={s.details}>
            <Detail label="Type">{typeOf(viewing) === 'HMO' ? 'HMO patient' : 'Standard patient'}</Detail>
            <Detail label="Status"><StatusBadge status={statusOf(viewing)} /></Detail>
            <Detail label="Email">{viewing.email}</Detail>
            <Detail label="Phone">{viewing.phoneNumber}</Detail>
            <Detail label="Gender">{humanize(viewing.gender)}</Detail>
            <Detail label="Date of birth">{formatDay(viewing.dateOfBirth)}</Detail>
            <Detail label="Location">{locationLabel(viewing.locationArea)}</Detail>
            <Detail label="Registered">{formatDay(pick(viewing, 'createdAt', 'registeredAt'))}</Detail>
            <Detail label="Address" full>{viewing.address}</Detail>

            {typeOf(viewing) === 'HMO' && (
              <>
                <Detail label="HMO / plan">{pick(viewing, 'hmoName', 'hmoPlanName')}</Detail>
                <Detail label="Cover expires">{formatDay(hmoExpiry(viewing))}</Detail>
                <Detail label="Benefit remaining">{benefitLeft(viewing) != null ? formatMoney(benefitLeft(viewing)) : '—'}</Detail>
                <Detail label="Benefit used">{pick(viewing, 'benefitUsed') != null ? formatMoney(viewing.benefitUsed) : '—'}</Detail>
              </>
            )}

            <Detail label="Next of kin">
              {nextOfKinDone(viewing)
                ? [pick(viewing, 'nextOfKinName', 'nextOfKin'), pick(viewing, 'nextOfKinRelationship'), pick(viewing, 'nextOfKinPhone')].filter(Boolean).join(' · ')
                : <Badge variant="pending">Not completed</Badge>}
            </Detail>
            <Detail label="Healthcare consent">
              {consentSigned(viewing)
                ? `Signed${pick(viewing, 'consentSignedAt') ? ` on ${formatDay(viewing.consentSignedAt)}` : ''}`
                : <Badge variant="pending">Not signed</Badge>}
            </Detail>
          </div>
        )}
      </Modal>
    </>
  );
}

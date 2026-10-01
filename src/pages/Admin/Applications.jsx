import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { locationLabel } from '../../config/locations';
import { formatDate, humanize, matches, pick } from '../../utils/format';
import { Person, SearchBox, Tabs } from './components/Common';
import { ApplicationModal, RejectDialog } from './components/ApplicationModals';
import { isPending } from './components/status';
import { useReviewActions } from './components/useReviewActions';
import s from './admin.module.css';

const STATUS_TABS = [
  ['PENDING', 'Pending'],
  ['APPROVED', 'Approved'],
  ['REJECTED', 'Rejected'],
];

export default function Applications() {
  usePageHeader('Applications', 'Service providers who applied to join');
  const { toast, showToast, clearToast } = useToast();

  const [status, setStatus] = useState('PENDING');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);

  const { data, loading, error, reload } = useApi(() => adminApi.providers(status), status);

  const review = useReviewActions({
    approveFn: adminApi.approveProvider,
    rejectFn: adminApi.rejectProvider,
    nameOf: (a) => a.fullName,
    onChanged: reload,
    showToast,
  });

  const rows = asList(data).filter((a) =>
    matches(query, a.fullName, a.email, a.serviceProviderType, locationLabel(a.locationArea))
  );

  const columns = [
    { key: 'applicant', header: 'Applicant', render: (a) => <Person name={a.fullName} sub={a.email} /> },
    { key: 'role', header: 'Role', render: (a) => humanize(a.serviceProviderType) },
    { key: 'exp', header: 'Experience', render: (a) => pick(a, 'yearsOfExperience', 'experience') || '—' },
    { key: 'area', header: 'Coverage', render: (a) => locationLabel(a.locationArea) },
    { key: 'applied', header: 'Submitted', render: (a) => formatDate(a.appliedAt) },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status || status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (a) => (
        <div className={s.actions}>
          {isPending(a) && status === 'PENDING' && (
            <>
              <button
                type="button"
                className={`${s.btn} ${s.btnApprove}`}
                onClick={() => review.approve(a)}
                disabled={review.busyId === a.id}
              >
                {review.busyId === a.id ? 'Working…' : 'Approve'}
              </button>
              <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => review.setRejecting(a)} disabled={review.busyId === a.id}>
                Reject
              </button>
            </>
          )}
          <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(a)}>View</button>
        </div>
      ),
    },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={STATUS_TABS} value={status} onChange={setStatus} />
          <SearchBox value={query} onChange={setQuery} placeholder="Search name, role, area…" />
        </div>
        <DataTable
          key={status}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query ? 'No applications match your search.' : `No ${status.toLowerCase()} applications.`}
        />
      </div>

      <ApplicationModal
        application={viewing}
        busy={review.busyId === viewing?.id}
        onClose={() => setViewing(null)}
        onApprove={status === 'PENDING' ? async (a) => { if (await review.approve(a)) setViewing(null); } : undefined}
        onReject={status === 'PENDING' ? (a) => { setViewing(null); review.setRejecting(a); } : undefined}
      />
      <RejectDialog
        key={review.rejecting?.id ?? 'none'}
        target={review.rejecting}
        name={review.rejecting?.fullName}
        busy={review.busyId === review.rejecting?.id}
        onClose={() => review.setRejecting(null)}
        onConfirm={(a, reason) => review.reject(a, reason)}
      />
    </>
  );
}

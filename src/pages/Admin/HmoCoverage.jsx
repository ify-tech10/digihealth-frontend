import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import Modal from '../../components/Modal/Modal';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDate, formatDay, humanize, matches, pick } from '../../utils/format';
import { Detail, Person, SearchBox, Tabs } from './components/Common';
import { RejectDialog } from './components/ApplicationModals';
import { isPending } from './components/status';
import { useReviewActions } from './components/useReviewActions';
import s from './admin.module.css';

const STATUS_TABS = [
  ['PENDING', 'Pending'],
  ['APPROVED', 'Approved'],
  ['REJECTED', 'Rejected'],
];

/* The public HMO form stores status as `applicationStatus`. */
const statusOf = (c) => pick(c, 'applicationStatus', 'status') || 'PENDING';

export default function HmoCoverage() {
  usePageHeader('HMO Coverage', 'Companies enrolling employees for home care');
  const { toast, showToast, clearToast } = useToast();

  const [status, setStatus] = useState('PENDING');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);

  const { data, loading, error, reload } = useApi(() => adminApi.hmoApplications(status), status);

  const review = useReviewActions({
    approveFn: adminApi.approveHmo,
    rejectFn: adminApi.rejectHmo,
    nameOf: (c) => c.companyName,
    onChanged: reload,
    showToast,
  });

  const rows = asList(data).filter((c) =>
    matches(query, c.companyName, c.email, c.industry, c.hrContactName)
  );

  const pending = (c) => status === 'PENDING' && isPending({ status: statusOf(c) });

  const columns = [
    { key: 'company', header: 'Company', render: (c) => <Person name={c.companyName} sub={c.email} /> },
    { key: 'industry', header: 'Industry', render: (c) => humanize(c.industry) },
    { key: 'size', header: 'Size', render: (c) => humanize(c.companySize) },
    { key: 'hr', header: 'HR contact', render: (c) => <div>{c.hrContactName || '—'}<div className={s.muted}>{c.phoneNumber}</div></div> },
    { key: 'start', header: 'Start date', render: (c) => formatDay(c.startDate) },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={statusOf(c)} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => (
        <div className={s.actions}>
          {pending(c) && (
            <>
              <button type="button" className={`${s.btn} ${s.btnApprove}`} onClick={() => review.approve(c)} disabled={review.busyId === c.id}>
                {review.busyId === c.id ? 'Working…' : 'Approve'}
              </button>
              <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => review.setRejecting(c)} disabled={review.busyId === c.id}>
                Reject
              </button>
            </>
          )}
          <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(c)}>View</button>
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
          <SearchBox value={query} onChange={setQuery} placeholder="Search company, industry, contact…" />
        </div>
        <DataTable
          key={status}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyText={query ? 'No companies match your search.' : `No ${status.toLowerCase()} HMO applications.`}
        />
      </div>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing?.companyName}>
        {viewing && (
          <>
            <div className={s.details}>
              <Detail label="Email">{viewing.email}</Detail>
              <Detail label="Phone">{viewing.phoneNumber}</Detail>
              <Detail label="Industry">{humanize(viewing.industry)}</Detail>
              <Detail label="Company size">{humanize(viewing.companySize)}</Detail>
              <Detail label="HR contact">{viewing.hrContactName}</Detail>
              <Detail label="Preferred start">{formatDay(viewing.startDate)}</Detail>
              <Detail label="Status"><StatusBadge status={statusOf(viewing)} /></Detail>
              <Detail label="Submitted">{formatDate(pick(viewing, 'createdAt', 'appliedAt', 'submittedAt'))}</Detail>
              <Detail label="Address" full>{viewing.companyAddress}</Detail>
            </div>
            {pending(viewing) && (
              <div className={s.modalActions}>
                <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnLarge}`} onClick={() => { const c = viewing; setViewing(null); review.setRejecting(c); }}>
                  Reject
                </button>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnApprove} ${s.btnLarge}`}
                  onClick={async () => { if (await review.approve(viewing)) setViewing(null); }}
                  disabled={review.busyId === viewing.id}
                >
                  {review.busyId === viewing.id ? 'Working…' : 'Approve company'}
                </button>
              </div>
            )}
          </>
        )}
      </Modal>

      <RejectDialog
        key={review.rejecting?.id ?? 'none'}
        target={review.rejecting}
        name={review.rejecting?.companyName}
        busy={review.busyId === review.rejecting?.id}
        onClose={() => review.setRejecting(null)}
        onConfirm={(c, reason) => review.reject(c, reason)}
      />
    </>
  );
}

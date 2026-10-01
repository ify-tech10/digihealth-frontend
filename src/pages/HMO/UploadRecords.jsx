import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { hmoApi } from '../../Api/hmoApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDate, pick } from '../../utils/format';
import UploadPanel from './components/UploadPanel';
import s from '../Admin/admin.module.css';

export default function UploadRecords() {
  usePageHeader('Upload Records', 'Add employees in bulk and see past uploads');

  const history = useApi(() => hmoApi.uploads(), 'hmo-uploads');
  const employees = useApi(() => hmoApi.employees(), 'hmo-employees');

  const rows = asList(history.data).slice().sort((a, b) => new Date(pick(b, 'uploadedAt', 'createdAt') || 0) - new Date(pick(a, 'uploadedAt', 'createdAt') || 0));

  const columns = [
    { key: 'file', header: 'File', render: (u) => <span className={s.tdName}>{pick(u, 'fileName', 'filename', 'name') || '—'}</span> },
    { key: 'when', header: 'Uploaded', render: (u) => formatDate(pick(u, 'uploadedAt', 'createdAt')) },
    { key: 'by', header: 'By', render: (u) => pick(u, 'uploadedByName', 'uploadedBy') || '—' },
    { key: 'rows', header: 'Rows', align: 'right', render: (u) => pick(u, 'totalRows', 'rows') ?? '—' },
    { key: 'added', header: 'Added', align: 'right', render: (u) => <strong style={{ color: '#16a34a' }}>{pick(u, 'created', 'added') ?? 0}</strong> },
    { key: 'skipped', header: 'Skipped', align: 'right', render: (u) => (Number(pick(u, 'skipped', 'failed') ?? 0) ? <strong style={{ color: '#dc2626' }}>{pick(u, 'skipped', 'failed')}</strong> : 0) },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status || 'COMPLETED'} /> },
  ];

  return (
    <>
      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.cardHeader}><h3>Upload employee list</h3></div>
        <div className={s.cardBody}>
          <p className={s.hint} style={{ marginBottom: 12 }}>
            CSV files are checked here before anything is sent — rows with a missing name, bad email or phone, or a duplicate are left out.
          </p>
          <UploadPanel
            existingEmails={asList(employees.data).map((e) => e.email).filter(Boolean)}
            onUploaded={() => { history.reload(); employees.reload(); }}
          />
        </div>
      </div>

      <div className={s.card}>
        <div className={s.toolbar}><h3 className={s.toolbarTitle}>Upload history</h3></div>
        <DataTable columns={columns} rows={rows} loading={history.loading} error={history.error} emptyText="No uploads yet." />
      </div>
    </>
  );
}

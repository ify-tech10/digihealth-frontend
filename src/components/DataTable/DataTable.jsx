import { useState } from 'react';
import Pagination from '../Pagination/Pagination';
import { paginate } from '../../utils/paginate';
import styles from './DataTable.module.css';

/*
 * <DataTable
 *   columns={[{ key: 'name', header: 'Name', render: (row) => row.name }]}
 *   rows={rows} loading={loading} error={error}
 *   emptyText="Nothing here yet." pageSize={10}
 * />
 * A column without `render` shows row[key].
 */
export default function DataTable({
  columns,
  rows = [],
  loading = false,
  error = '',
  emptyText = 'No records found.',
  pageSize = 10,
  rowKey = 'id',
}) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = paginate(rows, safePage, pageSize);

  let message = '';
  if (loading) message = 'Loading…';
  else if (error && !rows.length) message = error;
  else if (!rows.length) message = emptyText;

  return (
    <>
      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.align === 'right' ? styles.right : undefined}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {message ? (
              <tr>
                <td colSpan={columns.length} className={`${styles.empty} ${error && !loading ? styles.error : ''}`}>
                  {message}
                </td>
              </tr>
            ) : (
              visible.map((row, i) => (
                <tr key={row[rowKey] ?? i}>
                  {columns.map((c) => (
                    <td key={c.key} className={c.align === 'right' ? styles.right : undefined}>
                      {c.render ? c.render(row) : (row[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={safePage} totalItems={rows.length} pageSize={pageSize} onChange={setPage} />
    </>
  );
}

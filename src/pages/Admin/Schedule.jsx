import { useState } from 'react';
import DataTable from '../../components/DataTable/DataTable';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Icon from '../../components/Icon/Icon';
import { adminApi } from '../../Api/adminApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { usePageHeader } from '../../hooks/usePageHeader';
import { locationLabel } from '../../config/locations';
import { formatTime, humanize, pick, toISODate } from '../../utils/format';
import { Person } from './components/Common';
import s from './admin.module.css';
import styles from './Schedule.module.css';

const timeOf = (v) => pick(v, 'scheduledTime', 'startTime', 'visitTime', 'scheduledAt', 'visitDate');

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

function weekOf(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const mondayOffset = (d.getDay() + 6) % 7;
  const monday = addDays(iso, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export default function Schedule() {
  usePageHeader('Schedule', 'Visits planned for each day');

  const today = toISODate(new Date());
  const [date, setDate] = useState(today);

  const { data, loading, error } = useApi(() => adminApi.visits(date), date);

  const visits = asList(data)
    .slice()
    .sort((a, b) => String(timeOf(a) || '').localeCompare(String(timeOf(b) || '')));

  const count = (st) => visits.filter((v) => String(v.status || '').toUpperCase() === st).length;

  const heading = new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const columns = [
    { key: 'time', header: 'Time', render: (v) => <strong className={styles.time}>{formatTime(timeOf(v))}</strong> },
    { key: 'patient', header: 'Patient', render: (v) => <Person name={pick(v, 'patientName', 'patient')} sub={locationLabel(v.locationArea)} /> },
    { key: 'provider', header: 'Provider', render: (v) => pick(v, 'providerName', 'assignedProviderName', 'caregiverName') || '—' },
    { key: 'service', header: 'Service', render: (v) => humanize(pick(v, 'serviceType', 'serviceNeeded', 'service')) },
    { key: 'status', header: 'Status', render: (v) => <StatusBadge status={v.status || 'SCHEDULED'} /> },
  ];

  return (
    <>
      <div className={`${s.card} ${s.spaced}`}>
        <div className={styles.weekBar}>
          <button type="button" className={styles.navBtn} onClick={() => setDate(addDays(date, -7))} aria-label="Previous week">
            <Icon name="chevronLeft" />
          </button>

          <div className={styles.days}>
            {weekOf(date).map((d) => {
              const dt = new Date(`${d}T00:00:00`);
              return (
                <button
                  key={d}
                  type="button"
                  className={`${styles.day} ${d === date ? styles.dayActive : ''} ${d === today ? styles.today : ''}`}
                  onClick={() => setDate(d)}
                >
                  <span>{dt.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                  <strong>{dt.getDate()}</strong>
                </button>
              );
            })}
          </div>

          <button type="button" className={styles.navBtn} onClick={() => setDate(addDays(date, 7))} aria-label="Next week">
            <Icon name="chevronRight" />
          </button>

          {date !== today && (
            <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={() => setDate(today)}>
              Today
            </button>
          )}
        </div>
      </div>

      <div className={s.stats3}>
        <StatCard label="Visits" value={loading ? '…' : visits.length} icon="calendar" color="blue" />
        <StatCard label="Completed" value={loading ? '…' : count('COMPLETED')} icon="check" color="green" />
        <StatCard label="Missed / cancelled" value={loading ? '…' : count('MISSED') + count('CANCELLED')} icon="clock" color="red" />
      </div>

      <div className={s.card}>
        <div className={s.cardHeader}>
          <h3>{heading}</h3>
        </div>
        <DataTable
          key={date}
          columns={columns}
          rows={visits}
          loading={loading}
          error={error}
          emptyText="No visits scheduled for this day."
          pageSize={15}
        />
      </div>
    </>
  );
}

import { useState } from 'react';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { adminApi } from '../../Api/adminApi';
import { cnoApi } from '../../Api/cnoApi';
import { asList } from '../../Api/apiFetch';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { locationLabel } from '../../config/locations';
import { ACTIVITY_LABEL, VITALS, activitiesOf } from '../../config/visitReport';
import { humanize, pick, toISODate } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import s from '../Admin/admin.module.css';
import e from './Exports.module.css';

const inRange = (value, from, to) => {
  const d = String(value || '').slice(0, 10);
  return d && d >= from && d <= to;
};

/* Each report: how to fetch it and how to flatten it into CSV rows. */
const REPORTS = [
  {
    key: 'visits',
    title: 'Visits',
    icon: 'calendar',
    desc: 'Every scheduled visit with provider, patient, time and outcome.',
    async build(from, to) {
      const rows = asList(await cnoApi.visits(from, to));
      return [
        ['Date', 'Time', 'Patient', 'Provider', 'Service', 'Location', 'Status'],
        rows.map((v) => [
          String(pick(v, 'visitDate', 'date', 'scheduledAt') || '').slice(0, 10),
          pick(v, 'scheduledTime', 'time') || '',
          pick(v, 'patientName', 'patient'),
          pick(v, 'providerName', 'caregiverName'),
          humanize(pick(v, 'serviceType', 'serviceNeeded')),
          pick(v, 'location') || locationLabel(v.locationArea),
          humanize(v.status),
        ]),
      ];
    },
  },
  {
    key: 'requests',
    title: 'Care requests',
    icon: 'file',
    desc: 'Requests received in the period, who they were assigned to and their status.',
    async build(from, to) {
      const rows = asList(await adminApi.careRequests(undefined)).filter((r) => inRange(r.submittedAt, from, to));
      return [
        ['Received', 'Patient', 'Phone', 'Service', 'Location', 'Assigned to', 'Status'],
        rows.map((r) => [
          String(r.submittedAt || '').slice(0, 16).replace('T', ' '),
          r.fullName, r.phoneNumber, humanize(r.serviceNeeded), locationLabel(r.locationArea),
          pick(r, 'assignedProviderName', 'providerName') || '', humanize(r.status),
        ]),
      ];
    },
  },
  {
    key: 'reports',
    title: 'Visit reports',
    icon: 'activity',
    desc: 'What providers documented: vitals, activities, condition and notes.',
    async build(from, to) {
      const rows = asList(await cnoApi.visitReports({ from, to }));
      return [
        ['Visit date', 'Patient', 'Provider', 'Condition', ...VITALS.map(([, l]) => l), 'Activities', 'Observations', 'Review status'],
        rows.map((r) => [
          String(pick(r, 'visitDate', 'createdAt') || '').slice(0, 10),
          pick(r, 'patientName', 'patient'), pick(r, 'providerName', 'caregiverName'),
          humanize(pick(r, 'patientCondition', 'condition')),
          ...VITALS.map(([k]) => r[k] ?? ''),
          activitiesOf(r).map((a) => ACTIVITY_LABEL[a] || humanize(a)).join('; '),
          pick(r, 'notes', 'observations'), humanize(r.status),
        ]),
      ];
    },
  },
  {
    key: 'performance',
    title: 'Team performance',
    icon: 'trendingUp',
    desc: 'Per-provider visits, completion rate and ratings for the start month.',
    async build(from) {
      const rows = asList(await cnoApi.performance(from.slice(0, 7)));
      return [
        ['Provider', 'Role', 'Visits scheduled', 'Visits completed', 'Completion %', 'Avg rating', 'Reports submitted'],
        rows.map((r) => [
          pick(r, 'fullName', 'name'), humanize(pick(r, 'serviceProviderType', 'role')),
          pick(r, 'visitsScheduled', 'scheduledVisits') ?? '', pick(r, 'visitsCompleted', 'completedVisits') ?? '',
          pick(r, 'completionRate') ?? '', pick(r, 'avgRating', 'rating') ?? '', pick(r, 'reportsSubmitted') ?? '',
        ]),
      ];
    },
  },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

export default function ExportReports() {
  usePageHeader('Export Reports', 'Download CSV files for audits, payroll and review meetings');
  const { toast, showToast, clearToast } = useToast();

  const [from, setFrom] = useState(() => toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(() => toISODate(new Date()));
  const [busy, setBusy] = useState(null);

  const presets = [
    ['Last 7 days', daysAgo(6), toISODate(new Date())],
    ['Last 30 days', daysAgo(29), toISODate(new Date())],
    ['This month', toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), toISODate(new Date())],
  ];

  async function run(report) {
    if (from > to) {
      showToast('warning', 'The start date must be before the end date.');
      return;
    }
    setBusy(report.key);
    try {
      const [headers, rows] = await report.build(from, to);
      if (!rows.length) {
        showToast('info', `No ${report.title.toLowerCase()} between those dates.`);
        return;
      }
      downloadCsv(`digihealth-${report.key}-${from}_to_${to}.csv`, headers, rows);
      showToast('success', `${report.title}: ${rows.length} row${rows.length === 1 ? '' : 's'} downloaded.`);
    } catch (err) {
      showToast('error', `Couldn't build ${report.title.toLowerCase()}: ${err.message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={`${s.card} ${s.spaced}`}>
        <div className={s.toolbar}>
          <div className={s.toolbarRight}>
            <label className={e.range}>From <input className={s.select} type="date" value={from} max={to} onChange={(ev) => setFrom(ev.target.value)} /></label>
            <label className={e.range}>To <input className={s.select} type="date" value={to} min={from} max={toISODate(new Date())} onChange={(ev) => setTo(ev.target.value)} /></label>
          </div>
          <div className={s.toolbarRight}>
            {presets.map(([l, f, t]) => (
              <button key={l} type="button" className={`${e.preset} ${from === f && to === t ? e.presetOn : ''}`} onClick={() => { setFrom(f); setTo(t); }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className={e.grid}>
        {REPORTS.map((r) => (
          <article key={r.key} className={e.card}>
            <div className={e.icon}><Icon name={r.icon} /></div>
            <h3>{r.title}</h3>
            <p>{r.desc}</p>
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} onClick={() => run(r)} disabled={busy !== null}>
              <Icon name="download" /> {busy === r.key ? 'Preparing…' : 'Download CSV'}
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

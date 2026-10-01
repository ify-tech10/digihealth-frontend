import { useState } from 'react';
import Badge from '../../components/Badge/Badge';
import DataTable from '../../components/DataTable/DataTable';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { patientApi } from '../../Api/patientApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDay, humanize, pick } from '../../utils/format';
import { Tabs } from '../Admin/components/Common';
import { DateTile, Stars } from './components/PatientParts';
import { VisitModal } from './components/VisitModal';
import { VITALS, caregiverName, caregiverRole, durationLabel, minutesBetween, serviceLabel } from './patientFields';
import s from '../Admin/admin.module.css';
import p from './Patient.module.css';

const TABS = [
  ['VISITS', 'Visits'],
  ['LABS', 'Lab results'],
  ['MEDS', 'Medications'],
];
const FLAG_VARIANT = { NORMAL: 'active', HIGH: 'pending', LOW: 'pending', ABNORMAL: 'pending', CRITICAL: 'urgent' };
const FLAG_LABEL = { NORMAL: 'Normal', HIGH: 'High', LOW: 'Low', ABNORMAL: 'Outside range', CRITICAL: 'Needs attention' };

const visitDate = (v) => new Date(pick(v, 'checkInAt', 'scheduledAt', 'date') || 0);
const isDoneVisit = (v) => ['COMPLETED', 'DONE', 'APPROVED', 'CLOSED'].includes(String(v.status || 'COMPLETED').toUpperCase());

export default function CareHistory() {
  usePageHeader('Care History', 'Every visit, test and medicine in one place');
  const { toast, showToast, clearToast } = useToast();
  const [tab, setTab] = useState('VISITS');
  const [open, setOpen] = useState(null);

  const visits = useApi(() => patientApi.visits(), 'pt-visits');
  const labs = useApi(() => (tab === 'LABS' ? patientApi.labResults() : Promise.resolve(null)), tab === 'LABS' ? 'pt-labs' : 'pt-labs-idle');
  const meds = useApi(() => (tab === 'MEDS' ? patientApi.medications() : Promise.resolve(null)), tab === 'MEDS' ? 'pt-meds' : 'pt-meds-idle');

  const done = asList(visits.data).filter(isDoneVisit).sort((a, b) => visitDate(b) - visitDate(a));
  /* group by month for the timeline */
  const months = [];
  done.forEach((v) => {
    const key = visitDate(v).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const last = months[months.length - 1];
    if (last && last.key === key) last.items.push(v);
    else months.push({ key, items: [v] });
  });

  const labCols = [
    { key: 'date', header: 'Date', render: (r) => <span className={s.muted}>{formatDay(pick(r, 'resultedAt', 'date', 'createdAt'))}</span> },
    { key: 'test', header: 'Test', render: (r) => <div className={s.tdName}>{pick(r, 'testName', 'name')}<small>{pick(r, 'labName', 'laboratoryName') || ''}</small></div> },
    { key: 'result', header: 'Result', render: (r) => <strong>{pick(r, 'value', 'result') ?? '—'} {r.unit || ''}</strong> },
    { key: 'range', header: 'Normal range', render: (r) => <span className={s.muted}>{r.referenceRange || '—'}</span> },
    { key: 'flag', header: '', render: (r) => {
      const fl = String(r.flag || '').toUpperCase();
      return fl ? <Badge variant={FLAG_VARIANT[fl] || 'default'}>{FLAG_LABEL[fl] || humanize(fl)}</Badge> : null;
    } },
    { key: 'report', header: '', render: (r) => (pick(r, 'reportUrl', 'url') ? <a className={p.docOpen} href={pick(r, 'reportUrl', 'url')} target="_blank" rel="noopener noreferrer"><Icon name="download" /> Report</a> : null) },
  ];

  const medCols = [
    { key: 'name', header: 'Medicine', render: (m) => <div className={s.tdName}>{[pick(m, 'name', 'drugName'), m.strength].filter(Boolean).join(' ')}<small>{pick(m, 'instructions', 'dosage') || ''}</small></div> },
    { key: 'dates', header: 'Taking since', render: (m) => <span className={s.muted}>{formatDay(pick(m, 'startDate', 'prescribedAt'))}{m.endDate ? ` → ${formatDay(m.endDate)}` : ''}</span> },
    { key: 'by', header: 'Prescribed by', render: (m) => pick(m, 'prescribedByName', 'prescribedBy') || '—' },
    { key: 'delivered', header: 'Last delivered', render: (m) => <span className={s.muted}>{formatDay(m.lastDeliveredAt)}</span> },
    { key: 'status', header: 'Status', render: (m) => {
      const active = String(m.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
      return <Badge variant={active ? 'active' : 'done'}>{active ? 'Taking now' : 'Finished'}</Badge>;
    } },
  ];
  const medRows = asList(meds.data).slice().sort((a, b) => (String(b.status || 'ACTIVE').toUpperCase() === 'ACTIVE') - (String(a.status || 'ACTIVE').toUpperCase() === 'ACTIVE'));

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      <div className={s.card}>
        <div className={s.toolbar}>
          <Tabs options={TABS} value={tab} onChange={setTab} />
        </div>

        {tab === 'VISITS' && (
          visits.loading ? <div className={p.empty}>Loading your visits…</div>
            : visits.error ? <div className={p.empty}><strong>Couldn’t load your visits</strong>{visits.error}</div>
              : !done.length ? <div className={p.empty}><strong>No visits yet</strong>After each home visit, what your nurse did and your readings appear here.</div>
                : months.map((m) => (
                  <div key={m.key}>
                    <div className={p.month}>{m.key}</div>
                    {m.items.map((v) => {
                      const d = visitDate(v);
                      const mins = minutesBetween(v.checkInAt, v.checkOutAt);
                      const chips = VITALS.filter(([k]) => v.vitals?.[k] != null && v.vitals[k] !== '').slice(0, 4);
                      return (
                        <div key={v.id} className={p.visitRow}>
                          <DateTile date={d} />
                          <div style={{ minWidth: 0 }}>
                            <div className={p.visitTitle}>{serviceLabel(v.serviceType)}</div>
                            <div className={p.visitMeta}>
                              {[caregiverName(v) && `${caregiverName(v)} (${caregiverRole(v)})`, durationLabel(mins)].filter(Boolean).join(' · ')}
                              {pick(v, 'rating') && <> · <Stars value={v.rating} /></>}
                            </div>
                            {pick(v, 'summary', 'notes') && <div className={p.visitSummary}>{pick(v, 'summary', 'notes')}</div>}
                            {chips.length > 0 && (
                              <div className={p.vChips}>
                                {chips.map(([k, label, unit]) => <span key={k} className={p.vChip}>{label}: {v.vitals[k]}{unit ? ` ${unit}` : ''}</span>)}
                              </div>
                            )}
                          </div>
                          <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setOpen(v)}>{pick(v, 'rating') ? 'Details' : 'Details & rate'}</button>
                        </div>
                      );
                    })}
                  </div>
                ))
        )}

        {tab === 'LABS' && (
          <DataTable columns={labCols} rows={asList(labs.data).slice().sort((a, b) => new Date(pick(b, 'resultedAt', 'date', 'createdAt') || 0) - new Date(pick(a, 'resultedAt', 'date', 'createdAt') || 0))} loading={labs.loading} error={labs.error} emptyText="No lab results yet. Results from home sample collection appear here." />
        )}
        {tab === 'MEDS' && (
          <DataTable columns={medCols} rows={medRows} loading={meds.loading} error={meds.error} emptyText="No medicines recorded. Prescriptions from your care team appear here." />
        )}
      </div>
      {tab === 'LABS' && !labs.loading && asList(labs.data).length > 0 && (
        <p className={s.hint} style={{ marginTop: 12 }}>A result outside the normal range isn’t always a problem — your nurse or doctor will explain what it means for you.</p>
      )}

      <VisitModal
        visit={open}
        onClose={() => setOpen(null)}
        onRate={async (body) => {
          await patientApi.rateVisit(open.id, body);
          setOpen(null);
          showToast('success', body.rating <= 2 ? 'Thank you — a care coordinator will follow up with you.' : 'Thank you for your feedback.');
          visits.reload();
        }}
      />
    </>
  );
}

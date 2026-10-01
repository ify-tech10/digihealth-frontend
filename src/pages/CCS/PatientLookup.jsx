import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/DataTable/DataTable';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { ccsApi } from '../../Api/ccsApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { humanize, pick } from '../../utils/format';
import { useTickets } from './useTickets';
import { NewTicketModal, PatientProfileModal } from './components/TicketModals';
import {
  isResolved, patientId, patientName, patientNurse, patientOf, patientPhone, patientPlan,
} from './ticketFields';
import s from '../Admin/admin.module.css';

/* Patients who contacted us recently, taken from the agent's own tickets. */
function recentCallers(list) {
  const seen = new Map();
  list.forEach((t) => {
    const p = { name: pick(t, 'name', 'patientName'), ...patientOf(t) };
    const key = pick(p, 'id', 'patientId') ?? patientName(p);
    if (key && !seen.has(key)) seen.set(key, { ...p, openTickets: 0 });
    if (key && !isResolved(t)) seen.get(key).openTickets += 1;
  });
  return [...seen.values()];
}

export default function PatientLookup() {
  usePageHeader('Patient Lookup', 'Find a patient by name, phone, email or patient ID');
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();
  const tickets = useTickets();

  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [viewing, setViewing] = useState(null);
  const [creatingFor, setCreatingFor] = useState(null);

  const results = useApi(
    () => (submitted ? ccsApi.searchPatients(submitted) : Promise.resolve(null)),
    `ccs-lookup-${submitted}`
  );

  const searching = !!submitted;
  const rows = searching ? asList(results.data) : recentCallers(tickets.list);

  function search(e) {
    e.preventDefault();
    setSubmitted(query.trim());
  }

  const columns = [
    { key: 'name', header: 'Patient', render: (p) => (
      <div className={s.tdName}>{patientName(p) || '—'}<small>{patientId(p) || p.email || ''}</small></div>
    ) },
    { key: 'phone', header: 'Phone', render: (p) => patientPhone(p) || '—' },
    { key: 'plan', header: 'Care plan', render: (p) => humanize(patientPlan(p)) || '—' },
    { key: 'nurse', header: 'Assigned nurse', render: (p) => patientNurse(p) || <span className={s.muted}>Not assigned</span> },
    searching
      ? { key: 'status', header: 'Status', render: (p) => humanize(pick(p, 'status', 'accountStatus')) || '—' }
      : { key: 'open', header: 'Open tickets', render: (p) => p.openTickets || '—' },
    { key: 'actions', header: 'Actions', render: (p) => (
      <div className={s.actions}>
        <button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewing(p)}>View</button>
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setCreatingFor(p)}>New ticket</button>
      </div>
    ) },
  ];

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.card}>
        <form className={s.toolbar} onSubmit={search}>
          <div className={s.toolbarRight} style={{ flex: 1 }}>
            <label className={s.search} style={{ flex: 1, maxWidth: 460 }}>
              <Icon name="search" />
              <input
                type="search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); if (!e.target.value) setSubmitted(''); }}
                placeholder="Name, phone, email or patient ID…"
                aria-label="Search patients"
              />
            </label>
            <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={!query.trim()}>Search</button>
          </div>
          <span className={s.toolbarTitle} style={{ fontSize: 12.5, fontWeight: 600, color: '#8898c8' }}>
            {searching ? `Results for “${submitted}”` : 'Recent callers'}
          </span>
        </form>
        <DataTable
          key={submitted || 'recent'}
          columns={columns}
          rows={rows}
          loading={searching ? results.loading : tickets.loading}
          error={searching ? results.error : tickets.error}
          emptyText={searching ? 'No patients match that search.' : 'Search above to find a patient.'}
        />
      </div>

      <PatientProfileModal
        patient={viewing}
        tickets={tickets.list}
        onClose={() => setViewing(null)}
        onOpenTicket={(t) => navigate(`/ccs/tickets?ticket=${encodeURIComponent(t.id)}`)}
        onNewTicket={(p) => { setViewing(null); setCreatingFor(p); }}
      />
      <NewTicketModal
        open={!!creatingFor}
        patient={creatingFor}
        onClose={() => setCreatingFor(null)}
        onCreated={(created, name) => {
          setCreatingFor(null);
          tickets.reload();
          if (created?.id != null) navigate(`/ccs/tickets?ticket=${encodeURIComponent(created.id)}`);
          else showToast('success', `Ticket created for ${name}.`);
        }}
      />
    </>
  );
}

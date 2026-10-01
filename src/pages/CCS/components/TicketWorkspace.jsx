import { useEffect, useRef, useState } from 'react';
import Icon from '../../../components/Icon/Icon';
import { ccsApi } from '../../../Api/ccsApi';
import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../context/useAuth';
import { humanize, matches } from '../../../utils/format';
import {
  TICKET_STATUSES, TICKET_TYPES, isResolved, isUrgent, messagesOf, patientOf, patientName,
  patientPhone, patientPlan, ticketColor, ticketInitials, ticketName, ticketPreview,
  ticketStatus, ticketSubject, ticketTime, ticketType,
} from '../ticketFields';
import { StatusTag, TypeTag } from './TicketBadge';
import { EscalateModal, NewTicketModal, PatientProfileModal } from './TicketModals';
import s from '../../Admin/admin.module.css';
import c from '../Ccs.module.css';

const TEAM_NAME = { CNO: 'the clinical team', FINANCE: 'Finance', RELATIONSHIP_MANAGER: 'the Relationship Manager', ADMIN: 'Admin' };

/* Which tickets each view shows. */
const SCOPES = {
  URGENT: (t) => !isResolved(t) && isUrgent(t),
  ESCALATED: (t) => ticketStatus(t) === 'ESCALATED',
  RESOLVED: isResolved,
};

const EMPTY = {
  URGENT: 'No urgent tickets right now.',
  ESCALATED: 'Nothing escalated.',
  RESOLVED: 'No resolved tickets yet.',
};

/*
 * Ticket inbox + conversation pane.
 *   tickets    -> the result of useTickets()
 *   scope      -> URGENT | ESCALATED | RESOLVED, or nothing for every ticket
 *   selectedId / onSelect -> controlled by the page so other widgets can open a ticket
 */
export default function TicketWorkspace({ tickets, scope, selectedId, onSelect, showToast, wide = false, title = 'Ticket Inbox' }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [creating, setCreating] = useState(null);
  const paneRef = useRef(null);

  const inScope = scope ? tickets.list.filter(SCOPES[scope]) : tickets.list;
  const rows = inScope.filter(
    (t) =>
      (!status || ticketStatus(t) === status) &&
      (!type || ticketType(t) === type) &&
      matches(query, ticketName(t), ticketSubject(t), ticketPreview(t), patientPhone(patientOf(t)))
  );

  const selected = tickets.list.find((t) => String(t.id) === String(selectedId)) || null;

  function open(t) {
    if (t.unread) tickets.patch(t.id, { unread: false });
    onSelect(t.id);
    /* stacked layout: bring the conversation into view */
    if (window.matchMedia('(max-width: 1200px)').matches) {
      requestAnimationFrame(() => paneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  let listMsg = '';
  if (tickets.loading) listMsg = 'Loading tickets…';
  else if (tickets.error && !tickets.list.length) listMsg = `Couldn’t load tickets: ${tickets.error}`;
  else if (!rows.length) listMsg = query || status || type ? 'No tickets match your filters.' : EMPTY[scope] || 'No tickets yet.';

  return (
    <div className={`${c.workspace} ${wide ? c.workspaceWide : ''}`}>
      {/* ── INBOX ── */}
      <div className={`${s.card} ${c.inbox}`}>
        <div className={s.cardHeader}>
          <h3>{title}</h3>
          <div className={c.headerRight}>
            <span className={c.count}>{tickets.loading ? '' : `${rows.length} ticket${rows.length === 1 ? '' : 's'}`}</span>
            <button type="button" className={c.newBtn} onClick={() => setCreating({})}><Icon name="plus" /> New</button>
          </div>
        </div>
        <div className={c.toolbar}>
          <label className={c.search}>
            <Icon name="search" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tickets…" aria-label="Search tickets" />
          </label>
          {!scope && (
            <select className={c.filter} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
              <option value="">All</option>
              {TICKET_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}
          <select className={c.filter} value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
            <option value="">All types</option>
            {TICKET_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className={c.list}>
          {listMsg ? (
            <div className={c.listEmpty}>{listMsg}</div>
          ) : (
            rows.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${c.item} ${String(t.id) === String(selectedId) ? c.selected : ''} ${t.unread ? c.unread : ''}`}
                onClick={() => open(t)}
                aria-current={String(t.id) === String(selectedId) ? 'true' : undefined}
              >
                <span className={c.av} style={{ background: ticketColor(t) }}>{ticketInitials(t)}</span>
                <span className={c.body}>
                  <span className={c.top}><span className={c.name}>{ticketName(t)}</span><span className={c.time}>{ticketTime(t)}</span></span>
                  <span className={c.subject} style={{ display: 'block' }}>{ticketSubject(t)}</span>
                  <span className={c.preview} style={{ display: 'block' }}>{ticketPreview(t)}</span>
                  <span className={c.badges}><StatusTag ticket={t} /><TypeTag ticket={t} /></span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── CONVERSATION ── */}
      <div ref={paneRef} className={`${s.card} ${c.pane}`}>
        {selected ? (
          <TicketDetail
            key={selected.id}
            base={selected}
            tickets={tickets}
            showToast={showToast}
            onOpenTicket={(t) => open(t)}
            onNewTicket={(p) => setCreating({ patient: p })}
          />
        ) : (
          <div className={c.paneEmpty}>
            <Icon name="message" />
            <h4>No ticket selected</h4>
            <p>Pick a ticket from the inbox to see the conversation.</p>
          </div>
        )}
      </div>

      <NewTicketModal
        open={!!creating}
        patient={creating?.patient}
        onClose={() => setCreating(null)}
        onCreated={(created, name) => {
          setCreating(null);
          showToast('success', `Ticket created for ${name}.`);
          tickets.reload();
          if (created?.id != null) onSelect(created.id);
        }}
      />
    </div>
  );
}

function TicketDetail({ base, tickets, showToast, onOpenTicket, onNewTicket }) {
  const { user } = useAuth();
  const detail = useApi(() => ccsApi.ticket(base.id), `ccs-ticket-${base.id}`);
  /* list row < full ticket < changes made in this session */
  const t = { ...base, ...(detail.data || {}), ...(tickets.patchOf(base.id) || {}) };
  const msgs = messagesOf(t);
  const p = { name: ticketName(t), ...patientOf(t) };

  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [profile, setProfile] = useState(false);

  const msgRef = useRef(null);
  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight;
  }, [msgs.length]);

  function refresh() {
    tickets.reload();
    detail.reload();
  }

  async function send() {
    const text = reply.trim();
    if (!text || busy) return;
    setBusy('reply');
    try {
      await ccsApi.reply(t.id, text);
      const now = new Date().toISOString();
      const st = ticketStatus(t);
      tickets.patch(t.id, {
        messages: [...(t.messages || []), { from: 'agent', name: user?.name || 'Customer Care', text, createdAt: now }],
        preview: text,
        updatedAt: now,
        time: undefined,
        ...(st === 'OPEN' || st === 'URGENT' ? { status: 'PENDING' } : {}),
      });
      setReply('');
      showToast('success', `Reply sent to ${ticketName(t)}.`);
      refresh();
    } catch (err) {
      showToast('error', `Reply not sent: ${err.message}`);
    } finally {
      setBusy('');
    }
  }

  async function resolve() {
    setBusy('resolve');
    try {
      await ccsApi.resolve(t.id);
      tickets.patch(t.id, { status: 'RESOLVED' });
      showToast('success', 'Ticket resolved.');
      refresh();
    } catch (err) {
      showToast('error', `Couldn’t resolve: ${err.message}`);
    } finally {
      setBusy('');
    }
  }

  async function reopen() {
    setBusy('reopen');
    try {
      await ccsApi.reopen(t.id);
      tickets.patch(t.id, { status: 'OPEN' });
      showToast('success', 'Ticket reopened.');
      refresh();
    } catch (err) {
      showToast('error', `Couldn’t reopen: ${err.message}`);
    } finally {
      setBusy('');
    }
  }

  async function escalate(team, note) {
    setBusy('escalate');
    try {
      await ccsApi.escalate(t.id, team, note);
      tickets.patch(t.id, { status: 'ESCALATED' });
      setEscalating(false);
      showToast('success', `Escalated to ${TEAM_NAME[team] || humanize(team)}.`);
      refresh();
    } catch (err) {
      showToast('error', `Couldn’t escalate: ${err.message}`);
    } finally {
      setBusy('');
    }
  }

  const closed = isResolved(t);

  return (
    <>
      <div className={c.dpHeader}>
        <h3>{ticketSubject(t)}</h3>
        <div className={c.badges}><StatusTag ticket={t} /><TypeTag ticket={t} /></div>
        <div className={c.meta}>
          <span className={c.metaItem}><Icon name="users" />{patientName(p) || ticketName(t)}</span>
          {patientPhone(p) && <span className={c.metaItem}><Icon name="phone" />{patientPhone(p)}</span>}
          {patientPlan(p) && <span className={c.metaItem}><Icon name="card" />{humanize(patientPlan(p))}</span>}
          <button type="button" className={c.metaLink} onClick={() => setProfile(true)}><Icon name="eye" />View full profile</button>
        </div>
      </div>

      <div ref={msgRef} className={c.messages}>
        {detail.loading && !msgs.length ? (
          <p className={c.note}>Loading conversation…</p>
        ) : !msgs.length ? (
          <p className={c.note}>{detail.error ? 'Couldn’t load the conversation.' : 'No messages yet.'}</p>
        ) : (
          msgs.map((m) => (
            <div key={m.key} className={`${c.msg} ${m.agent ? c.msgAgent : c.msgPatient}`}>
              <div className={c.msgName}>{m.name}</div>
              <div className={c.bubble}>{m.text}</div>
              {m.time && <div className={c.msgTime}>{m.time}</div>}
            </div>
          ))
        )}
      </div>

      {closed ? (
        <div className={c.closedBar}>
          <span>This ticket is resolved.</span>
          <button type="button" className={c.btnEscalate} onClick={reopen} disabled={!!busy}>
            <Icon name="refresh" /> {busy === 'reopen' ? 'Reopening…' : 'Reopen'}
          </button>
        </div>
      ) : (
        <>
          <div className={c.reply}>
            <textarea
              className={c.replyInput}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } }}
              placeholder={`Reply to ${ticketName(t)}…`}
              aria-label="Reply"
            />
            <div className={c.replyActions}>
              <button type="button" className={c.btnSend} onClick={send} disabled={!reply.trim() || !!busy}>
                <Icon name="send" /> {busy === 'reply' ? 'Sending…' : 'Send'}
              </button>
              <button type="button" className={c.btnResolve} onClick={resolve} disabled={!!busy}>
                <Icon name="check" /> {busy === 'resolve' ? 'Resolving…' : 'Resolve'}
              </button>
              {ticketStatus(t) !== 'ESCALATED' && (
                <button type="button" className={c.btnEscalate} onClick={() => setEscalating(true)} disabled={!!busy}>
                  <Icon name="arrowUp" /> Escalate
                </button>
              )}
            </div>
          </div>
          <p className={c.hint}>Ctrl + Enter to send</p>
        </>
      )}

      <EscalateModal ticket={escalating ? t : null} busy={busy === 'escalate'} onClose={() => setEscalating(false)} onConfirm={escalate} />
      <PatientProfileModal
        patient={profile ? p : null}
        tickets={tickets.list}
        onClose={() => setProfile(false)}
        onOpenTicket={(x) => { setProfile(false); onOpenTicket(x); }}
        onNewTicket={(pp) => { setProfile(false); onNewTicket(pp); }}
      />
    </>
  );
}

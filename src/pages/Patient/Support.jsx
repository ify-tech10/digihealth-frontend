import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Modal from '../../components/Modal/Modal';
import Badge from '../../components/Badge/Badge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { patientApi } from '../../Api/patientApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { formatDate, humanize, pick, timeAgo } from '../../utils/format';
import { DIGI_PHONE, DIGI_PHONE_LABEL, DIGI_WHATSAPP, EMERGENCY, TICKET_CATEGORIES, hasNewReply, ticketOpen } from './patientFields';
import s from '../Admin/admin.module.css';
import p from './Patient.module.css';

const catLabel = (c) => TICKET_CATEGORIES.find(([k]) => k === String(c || '').toUpperCase())?.[1] || humanize(c);
const fromMe = (m) => ['PATIENT', 'CUSTOMER', 'USER'].includes(String(pick(m, 'from', 'senderType', 'authorRole') || '').toUpperCase()) || m.fromPatient === true || m.mine === true;
const lastAt = (t) => new Date(pick(t, 'updatedAt', 'lastMessageAt', 'createdAt') || 0);

/* Help from DiGi Health's Customer Care team. */
export default function Support() {
  usePageHeader('Contact Support', 'Questions about your care, visits or bills');
  const { setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);

  const tickets = useApi(() => patientApi.tickets(), 'pt-tickets');
  const all = asList(tickets.data).slice().sort((a, b) => ticketOpen(b) - ticketOpen(a) || lastAt(b) - lastAt(a));
  const replies = all.filter((t) => ticketOpen(t) && hasNewReply(t)).length;
  useEffect(() => {
    if (!tickets.loading && !tickets.error) setBadges({ replies });
  }, [tickets.loading, tickets.error, replies, setBadges]);

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={p.contactRow}>
        <a className={p.contact} href={`tel:${DIGI_PHONE}`}>
          <span className={p.svcIcon}><Icon name="phone" /></span>
          <span><strong>Call us</strong><span>{DIGI_PHONE_LABEL}</span></span>
        </a>
        <a className={p.contact} href={DIGI_WHATSAPP} target="_blank" rel="noopener noreferrer">
          <span className={p.svcIcon}><Icon name="message" /></span>
          <span><strong>WhatsApp</strong><span>Chat with Customer Care</span></span>
        </a>
        <a className={`${p.contact} ${p.contactSos}`} href={`tel:${EMERGENCY}`}>
          <span className={p.svcIcon}><Icon name="alert" /></span>
          <span><strong>Emergency: {EMERGENCY}</strong><span>For urgent medical help, call now</span></span>
        </a>
      </div>

      <div className={s.card}>
        <div className={s.cardHeader}>
          <h3>My messages</h3>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setCreating(true)}><Icon name="plus" /> New message</button>
        </div>
        {tickets.loading ? <div className={p.empty}>Loading…</div>
          : tickets.error ? <div className={p.empty}><strong>Couldn’t load your messages</strong>{tickets.error}</div>
            : !all.length ? (
              <div className={p.empty}>
                <strong>No messages yet</strong>
                Send us a message about a visit, your nurse, results or a bill — Customer Care replies here.
                <br />
                <button type="button" className={p.heroBtn} onClick={() => setCreating(true)}><Icon name="plus" /> New message</button>
              </div>
            ) : (
              <div className={`${p.desk} ${openId ? p.showing : ''}`}>
                <div className={p.threads}>
                  {all.map((t) => (
                    <button key={t.id} type="button" className={`${p.thread} ${openId === t.id ? p.threadOn : ''}`} onClick={() => setOpenId(t.id)}>
                      <div className={p.threadTop}>
                        <span className={p.threadSubject}>{t.subject || catLabel(t.category)}</span>
                        {ticketOpen(t) && hasNewReply(t) && <span className={p.threadNew} aria-label="New reply" />}
                      </div>
                      <div className={p.threadMeta}>{[pick(t, 'reference') || `#${t.id}`, ticketOpen(t) ? 'Open' : 'Resolved', timeAgo(lastAt(t))].join(' · ')}</div>
                    </button>
                  ))}
                </div>
                <div className={p.pane}>
                  {openId
                    ? <Thread key={openId} id={openId} summary={all.find((t) => t.id === openId)} onBack={() => setOpenId(null)} onError={(m) => showToast('error', m)} onReplied={tickets.reload} />
                    : <div className={p.empty} style={{ margin: 'auto' }}>Choose a conversation to read it.</div>}
                </div>
              </div>
            )}
      </div>

      <Modal isOpen={creating} onClose={() => setCreating(false)} title="New message to Customer Care">
        {creating && (
          <NewTicketForm
            onClose={() => setCreating(false)}
            onSubmit={async (body) => {
              const created = await patientApi.createTicket(body);
              setCreating(false);
              showToast('success', 'Message sent. Customer Care will reply here — we’ll notify you.');
              await tickets.reload();
              if (created?.id) setOpenId(created.id);
            }}
          />
        )}
      </Modal>
    </>
  );
}

function Thread({ id, summary, onBack, onError, onReplied }) {
  const { data, loading, error, reload } = useApi(() => patientApi.ticket(id), `pt-ticket-${id}`);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const t = { ...(summary || {}), ...(data || {}) };
  const messages = (Array.isArray(t.messages) ? t.messages : []).slice().sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const open = ticketOpen(t);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await patientApi.reply(id, text.trim());
      setText('');
      reload();
      onReplied();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={p.paneHead}>
        <button type="button" className={`${s.btn} ${s.btnView} ${p.back}`} onClick={onBack} aria-label="Back to messages"><Icon name="chevronLeft" /></button>
        <h3>{t.subject || catLabel(t.category)}</h3>
        <Badge variant={open ? 'new' : 'done'}>{open ? 'Open' : 'Resolved'}</Badge>
      </div>
      <div className={p.messages}>
        {loading ? <div className={p.empty}>Loading…</div> : error ? <div className={p.empty}>{error}</div> : !messages.length ? <div className={p.empty}>No messages yet.</div> : messages.map((m, k) => {
          const mine = fromMe(m);
          return (
            <div key={m.id ?? k} className={`${p.msg} ${mine ? p.msgMine : p.msgTheirs}`}>
              <div className={p.msgName}>{mine ? 'You' : pick(m, 'authorName', 'senderName') || 'DiGi Customer Care'}</div>
              <div className={p.bubble}>{pick(m, 'body', 'message', 'text')}</div>
              <div className={p.msgTime}>{formatDate(m.createdAt)}</div>
            </div>
          );
        })}
      </div>
      {open ? (
        <form className={p.reply} onSubmit={send}>
          <textarea aria-label="Your reply" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply…" />
          <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy || !text.trim()}>{busy ? 'Sending…' : 'Send'}</button>
        </form>
      ) : (
        <div className={p.closed}>This conversation is resolved. Need more help? Start a new message.</div>
      )}
    </>
  );
}

function NewTicketForm({ onClose, onSubmit }) {
  const [category, setCategory] = useState('BOOKING');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (message.trim().length < 10) return setError('Tell us a little more so we can help.');
    setError('');
    setBusy(true);
    try {
      await onSubmit({ category, subject: subject.trim() || catLabel(category), message: message.trim() });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className={s.field}>
          <label htmlFor="ntCat">It’s about</label>
          <select id="ntCat" value={category} onChange={(e) => setCategory(e.target.value)}>
            {TICKET_CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="ntSubject">Subject</label>
          <input id="ntSubject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Nurse arrived late on Monday" />
        </div>
        <div className={s.field}>
          <label htmlFor="ntMsg">Message <span className={s.req}>*</span></label>
          <textarea id="ntMsg" value={message} onChange={(e) => setMessage(e.target.value)} style={{ minHeight: 110 }} />
        </div>
      </div>
      <p className={s.hint} style={{ marginTop: 10 }}>For anything urgent about your health, call {EMERGENCY} or {DIGI_PHONE_LABEL} instead.</p>
      {error && <p className={s.fieldError} style={{ marginTop: 10 }}>{error}</p>}
      <div className={s.modalActions}>
        <button type="button" className={`${s.btn} ${s.btnView} ${s.btnLarge}`} onClick={onClose}>Cancel</button>
        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
      </div>
    </form>
  );
}

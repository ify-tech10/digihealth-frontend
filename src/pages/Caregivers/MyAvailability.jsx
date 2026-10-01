import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { providerApi } from '../../Api/providerApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { LOCATION_GROUPS } from '../../config/locations';
import { pick, toISODate } from '../../utils/format';
import s from '../Admin/admin.module.css';
import c from './Availability.module.css';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const monthKey = (d) => toISODate(d).slice(0, 7);
function shiftMonth(key, n) {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
}
function daysIn(key) {
  const [y, m] = key.split('-').map(Number);
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => toISODate(new Date(y, m - 1, i + 1)));
}
const weekdayIdx = (iso) => (new Date(`${iso}T00:00:00`).getDay() + 6) % 7; // Mon = 0

export default function MyAvailability() {
  usePageHeader('My Availability', 'Tell your supervisor which days you can take visits');
  const { toast, showToast, clearToast } = useToast();

  const current = monthKey(new Date());
  const [month, setMonth] = useState(current);
  const [dirty, setDirty] = useState(false);
  const [pendingMonth, setPendingMonth] = useState(null);

  const { data, loading, error, reload } = useApi(() => providerApi.availabilityMonth(month), month);

  function go(n) {
    const next = shiftMonth(month, n);
    if (dirty) setPendingMonth(next);
    else setMonth(next);
  }

  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.card}>
        <div className={c.monthBar}>
          <button type="button" className={c.navBtn} onClick={() => go(-1)} disabled={month <= current} aria-label="Previous month"><Icon name="chevronLeft" /></button>
          <h3>{label}</h3>
          <button type="button" className={c.navBtn} onClick={() => go(1)} aria-label="Next month"><Icon name="chevronRight" /></button>
        </div>

        {loading ? (
          <div className={s.emptyBlock}>Loading…</div>
        ) : (
          <MonthEditor
            key={month}
            month={month}
            data={data}
            loadError={error}
            onDirty={setDirty}
            onSaved={() => { setDirty(false); showToast('success', `Availability for ${label} saved.`); reload(); }}
            onError={(msg) => showToast('error', msg)}
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={!!pendingMonth}
        title="Discard changes?"
        message="You have unsaved changes for this month."
        confirmLabel="Discard"
        danger
        onClose={() => setPendingMonth(null)}
        onConfirm={() => { setDirty(false); setMonth(pendingMonth); setPendingMonth(null); }}
      />
    </>
  );
}

/* Holds the editable copy of one month; re-mounted per month. */
function MonthEditor({ month, data, loadError, onDirty, onSaved, onError }) {
  const todayIso = toISODate(new Date());
  const dates = daysIn(month);

  const [available, setAvailable] = useState(() => {
    const list = Array.isArray(data) ? data : asList(pick(data || {}, 'days', 'availability') || []);
    const set = new Set();
    list.forEach((d) => {
      if (typeof d === 'string') set.add(d.slice(0, 10));
      else if (d && (d.available ?? d.isAvailable ?? true)) set.add(String(d.date).slice(0, 10));
    });
    return set;
  });
  const [hours, setHours] = useState(() => ({
    start: String(pick(data || {}, 'defaultStartTime', 'startTime') || '08:00').slice(0, 5),
    end: String(pick(data || {}, 'defaultEndTime', 'endTime') || '18:00').slice(0, 5),
  }));
  const [areas, setAreas] = useState(() => new Set(asList(pick(data || {}, 'areas', 'coverageAreas') || [])));
  const [busy, setBusy] = useState(false);
  const [hoursError, setHoursError] = useState('');

  const editable = (iso) => iso >= todayIso;

  function change(fn) {
    fn();
    onDirty(true);
  }

  const toggleDay = (iso) =>
    change(() => setAvailable((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    }));

  const applyPattern = (test) =>
    change(() => setAvailable((prev) => {
      const next = new Set(prev);
      dates.filter(editable).forEach((iso) => (test(weekdayIdx(iso)) ? next.add(iso) : next.delete(iso)));
      return next;
    }));

  const toggleArea = (v) =>
    change(() => setAreas((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    }));

  async function save() {
    if (hours.start >= hours.end) {
      setHoursError('End time must be after start time.');
      return;
    }
    setHoursError('');
    setBusy(true);
    try {
      await providerApi.saveAvailability({
        month,
        defaultStartTime: hours.start,
        defaultEndTime: hours.end,
        areas: [...areas],
        days: dates.map((date) => ({
          date,
          available: available.has(date),
          startTime: available.has(date) ? hours.start : null,
          endTime: available.has(date) ? hours.end : null,
        })),
      });
      onSaved();
    } catch (err) {
      onError(`Couldn't save: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  const count = dates.filter((d) => available.has(d)).length;
  const blanks = weekdayIdx(dates[0]);

  return (
    <div className={c.layout}>
      <div className={c.calendarCol}>
        {loadError && (
          <p className={c.notice}>Couldn't load saved availability ({loadError}). You can still set it and save.</p>
        )}

        <div className={c.quick}>
          <span>Quick fill:</span>
          <button type="button" onClick={() => applyPattern((d) => d < 5)}>Weekdays</button>
          <button type="button" onClick={() => applyPattern((d) => d < 6)}>Mon – Sat</button>
          <button type="button" onClick={() => applyPattern(() => true)}>Every day</button>
          <button type="button" onClick={() => applyPattern(() => false)}>Clear</button>
        </div>

        <div className={c.grid} role="grid" aria-label="Availability calendar">
          {WEEKDAYS.map((d) => <div key={d} className={c.wd}>{d}</div>)}
          {Array.from({ length: blanks }, (_, i) => <div key={`b${i}`} />)}
          {dates.map((iso) => {
            const on = available.has(iso);
            const past = !editable(iso);
            return (
              <button
                key={iso}
                type="button"
                role="gridcell"
                aria-pressed={on}
                aria-label={`${new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}: ${on ? 'available' : 'unavailable'}`}
                disabled={past}
                className={`${c.day} ${on ? c.on : ''} ${past ? c.past : ''} ${iso === todayIso ? c.today : ''}`}
                onClick={() => toggleDay(iso)}
              >
                <span className={c.num}>{Number(iso.slice(8))}</span>
                <span className={c.state}>{on ? `${hours.start}–${hours.end}` : past ? '' : 'Off'}</span>
              </button>
            );
          })}
        </div>

        <div className={c.legend}>
          <span><i className={c.swOn} /> Available</span>
          <span><i className={c.swOff} /> Off</span>
          <span>Tap a day to switch it.</span>
        </div>
      </div>

      <aside className={c.side}>
        <div className={c.summary}>
          <strong>{count}</strong>
          <span>day{count === 1 ? '' : 's'} available this month</span>
        </div>

        <div className={s.field}>
          <label>Working hours</label>
          <div className={c.hours}>
            <input type="time" aria-label="Start time" value={hours.start} onChange={(e) => change(() => setHours((h) => ({ ...h, start: e.target.value })))} />
            <span>to</span>
            <input type="time" aria-label="End time" value={hours.end} onChange={(e) => change(() => setHours((h) => ({ ...h, end: e.target.value })))} />
          </div>
          {hoursError && <span className={s.fieldError}>{hoursError}</span>}
        </div>

        <div className={s.field} style={{ marginTop: 16 }}>
          <label>Areas you can cover <span className={s.muted} style={{ fontWeight: 500 }}>({areas.size})</span></label>
          <div className={c.areas}>
            {LOCATION_GROUPS.map((g) => (
              <div key={g.group}>
                <p className={c.areaGroup}>{g.group}</p>
                <div className={c.chips}>
                  {g.options.map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={areas.has(v)}
                      className={`${c.chip} ${areas.has(v) ? c.chipOn : ''}`}
                      onClick={() => toggleArea(v)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnLarge}`} style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save availability'}
        </button>
      </aside>
    </div>
  );
}

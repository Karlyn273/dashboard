'use client';

import { useEffect, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────

interface GCalEvent {
  id:       string;
  summary?: string;
  start:    { dateTime?: string; date?: string };
  end:      { dateTime?: string; date?: string };
}

interface Props {
  timeMin:     string; // ISO datetime
  timeMax:     string; // ISO datetime
  groupByDay?: boolean; // true = show day headers (week view); false = flat (today)
}

type State =
  | { phase: 'loading'      }
  | { phase: 'disconnected' }
  | { phase: 'error'        }
  | { phase: 'ready'; events: GCalEvent[] };

// ── Helpers ──────────────────────────────────────────────────────

function fmtTime(dt: string | undefined): string {
  if (!dt) return 'All day';
  return new Date(dt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function fmtDayHd(dateStr: string): string {
  // Parse as local noon to avoid midnight DST edge cases
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function dayKey(ev: GCalEvent): string {
  return (ev.start.dateTime ?? ev.start.date ?? '').slice(0, 10);
}

// ── Component ────────────────────────────────────────────────────

export default function CalendarEvents({ timeMin, timeMax, groupByDay = true }: Props) {
  const [state,         setState]         = useState<State>({ phase: 'loading' });
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    setState({ phase: 'loading' });
    const params = new URLSearchParams({ timeMin, timeMax });
    fetch(`/api/calendar/events?${params}`)
      .then(r => r.json())
      .then((json: { connected: boolean; events?: GCalEvent[] }) => {
        if (!json.connected) { setState({ phase: 'disconnected' }); return; }
        setState({ phase: 'ready', events: json.events ?? [] });
      })
      .catch(() => setState({ phase: 'error' }));
  }, [timeMin, timeMax]);

  async function disconnect() {
    setDisconnecting(true);
    try {
      await fetch('/api/auth/google/disconnect', { method: 'DELETE' });
    } finally {
      setState({ phase: 'disconnected' });
      setDisconnecting(false);
    }
  }

  if (state.phase === 'loading') {
    return <p className="cal-status">Loading events…</p>;
  }

  if (state.phase === 'error') {
    return <p className="cal-status cal-status--err">Could not load calendar events.</p>;
  }

  if (state.phase === 'disconnected') {
    return (
      <div className="cal-connect">
        <p className="cal-connect-hint">
          Connect Google Calendar to see your schedule here.
        </p>
        <a href="/api/auth/google" className="cal-connect-btn">
          Connect Google Calendar
        </a>
      </div>
    );
  }

  const { events } = state;

  const Disconnect = () => (
    <button
      className="cal-disconnect-btn"
      onClick={disconnect}
      disabled={disconnecting}
    >
      {disconnecting ? 'Disconnecting…' : 'Disconnect calendar'}
    </button>
  );

  if (events.length === 0) {
    return (
      <div className="cal-empty">
        <p className="cal-status">No events this period.</p>
        <Disconnect />
      </div>
    );
  }

  if (!groupByDay) {
    return (
      <div className="cal-events">
        <ul className="cal-list">
          {events.map(ev => (
            <li key={ev.id} className="cal-item">
              <span className="cal-dot" />
              <span className="cal-time">{fmtTime(ev.start.dateTime)}</span>
              <span className="cal-title">{ev.summary ?? '(No title)'}</span>
            </li>
          ))}
        </ul>
        <Disconnect />
      </div>
    );
  }

  // Group events by calendar day
  const days = new Map<string, GCalEvent[]>();
  for (const ev of events) {
    const k = dayKey(ev);
    if (!days.has(k)) days.set(k, []);
    days.get(k)!.push(ev);
  }

  return (
    <div className="cal-events">
      {[...days.entries()].map(([day, dayEvents]) => (
        <div key={day} className="cal-day-group">
          <h3 className="cal-day-hd">{fmtDayHd(day)}</h3>
          <ul className="cal-list">
            {dayEvents.map(ev => {
              const allDay = !ev.start.dateTime;
              const time   = allDay
                ? 'All day'
                : `${fmtTime(ev.start.dateTime)} – ${fmtTime(ev.end.dateTime)}`;
              return (
                <li key={ev.id} className="cal-item">
                  <span className="cal-dot" />
                  <span className="cal-time">{time}</span>
                  <span className="cal-title">{ev.summary ?? '(No title)'}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <Disconnect />
    </div>
  );
}

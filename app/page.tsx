'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MorningBriefing from './components/MorningBriefing';
import WeekView        from './components/WeekView';

type SaveStatus = 'saved' | 'pending' | 'saving' | 'error';
type Tab        = 'morning' | 'week';

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved:   'Saved',
  pending: 'Unsaved changes',
  saving:  'Saving…',
  error:   'Error saving',
};

export default function DashboardPage() {
  const [data,   setData]   = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [tab,    setTab]    = useState<Tab>('morning');
  const saveTimer           = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(({ data }) => setData(data as Record<string, unknown>))
      .catch(() => setStatus('error'));
  }, []);

  const persist = useCallback(async (value: unknown) => {
    setStatus('saving');
    try {
      const res = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: value }),
      });
      if (!res.ok) throw new Error();
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, []);

  const scheduleSave = useCallback(
    (value: unknown) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setStatus('pending');
      saveTimer.current = setTimeout(() => persist(value), 1500);
    },
    [persist],
  );

  const updateData = useCallback(
    (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => {
      setData(prev => {
        if (!prev) return prev;
        const next = updater(prev);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  if (data === null) {
    return <div className="loading">Loading…</div>;
  }

  return (
    <div className="dashboard">
      <header className="header">
        <h1>Dashboard</h1>
        <nav className="tabs" aria-label="Dashboard sections">
          <button
            className={`tab${tab === 'morning' ? ' tab--active' : ''}`}
            onClick={() => setTab('morning')}
          >
            Morning
          </button>
          <button
            className={`tab${tab === 'week' ? ' tab--active' : ''}`}
            onClick={() => setTab('week')}
          >
            Week
          </button>
        </nav>
        <span className={`status status--${status}`}>{STATUS_LABEL[status]}</span>
      </header>
      <main className="main">
        {tab === 'morning' && <MorningBriefing data={data} onChange={updateData} />}
        {tab === 'week'    && <WeekView        data={data} onChange={updateData} />}
      </main>
    </div>
  );
}

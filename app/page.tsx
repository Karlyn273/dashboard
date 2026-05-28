'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MorningBriefing from './components/MorningBriefing';
import WeekView        from './components/WeekView';
import QuarterView     from './components/QuarterView';
import HabitTracker    from './components/HabitTracker';
import BucketList      from './components/BucketList';
import YearView        from './components/YearView';

type SaveStatus = 'saved' | 'pending' | 'saving' | 'error';
type Tab        = 'morning' | 'week' | 'quarter' | 'habits' | 'bucket' | 'year';

const TABS: { id: Tab; label: string }[] = [
  { id: 'morning', label: 'Daily'       },
  { id: 'week',    label: 'Week'        },
  { id: 'quarter', label: 'Quarter'     },
  { id: 'habits',  label: 'Habits'      },
  { id: 'year',    label: 'Year'        },
  { id: 'bucket',  label: 'Bucket List' },
];

function getDayAndDate() {
  const now = new Date();
  const day  = now.toLocaleDateString('en-US', { weekday: 'long' });
  const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return { day, date };
}

export default function DashboardPage() {
  const [data,   setData]   = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [tab,    setTab]    = useState<Tab>('morning');
  const saveTimer           = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { day, date }       = getDayAndDate();

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
        <div className="header-left">
          <h1 className="header-name">Hey Karlyn <span className="header-diamond">✦</span></h1>
          <p className="header-date">{day}, {date}</p>
        </div>
        <nav className="tabs" aria-label="Dashboard sections">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab${tab === t.id ? ' tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <span className={`status status--${status}`}>
          {{ saved: '✓ Saved', pending: '…', saving: 'Saving', error: 'Error' }[status]}
        </span>
      </header>

      <main className="main">
        {tab === 'morning' && <MorningBriefing data={data} onChange={updateData} />}
        {tab === 'week'    && <WeekView        data={data} onChange={updateData} />}
        {tab === 'quarter' && <QuarterView     data={data} onChange={updateData} />}
        {tab === 'habits'  && <HabitTracker    data={data} onChange={updateData} />}
        {tab === 'bucket'  && <BucketList      data={data} onChange={updateData} />}
        {tab === 'year'    && <YearView        data={data} onChange={updateData} />}
      </main>
    </div>
  );
}

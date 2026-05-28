'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SaveStatus = 'saved' | 'pending' | 'saving' | 'error';

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved:   'Saved',
  pending: 'Unsaved changes',
  saving:  'Saving…',
  error:   'Error saving',
};

export default function DashboardPage() {
  const [data, setData]           = useState<unknown>(null);
  const [raw, setRaw]             = useState('');
  const [status, setStatus]       = useState<SaveStatus>('saved');
  const [parseError, setParseError] = useState('');
  const saveTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(({ data }) => {
        setData(data);
        setRaw(JSON.stringify(data, null, 2));
      })
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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRaw(text);
    try {
      const parsed = JSON.parse(text);
      setParseError('');
      setData(parsed);
      scheduleSave(parsed);
    } catch (err) {
      setParseError((err as Error).message);
    }
  };

  if (data === null) {
    return <div className="loading">Loading…</div>;
  }

  return (
    <div className="dashboard">
      <header className="header">
        <h1>Dashboard</h1>
        <span className={`status status--${status}`}>{STATUS_LABEL[status]}</span>
      </header>
      <main className="main">
        <textarea
          className="editor"
          value={raw}
          onChange={handleChange}
          spellCheck={false}
          aria-label="Dashboard data (JSON)"
        />
        {parseError && <p className="parse-error">{parseError}</p>}
      </main>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Scripture {
  text: string;
  reference: string;
}

interface Priority {
  id: string;
  text: string;
  completed: boolean;
}

interface TodayBriefing {
  scripture?: Scripture;
  reflection?: string;
  generatedAt?: string;
  priorities?: Priority[];
  intention?: string;
  dismissedCarryovers?: string[];
}

type BriefingStore = Record<string, TodayBriefing>;

interface Props {
  data: Record<string, unknown>;
  onChange: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
}

function localDateKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

function prevDayKey(key: string): string {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const makeEmptyPriority = (): Priority => ({
  id: crypto.randomUUID(),
  text: '',
  completed: false,
});

function Tick() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M2 6.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MorningBriefing({ data, onChange }: Props) {
  const today     = localDateKey();
  const yesterday = prevDayKey(today);

  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState('');

  const defaultPriorities = useRef<Priority[]>([
    makeEmptyPriority(), makeEmptyPriority(), makeEmptyPriority(),
  ]);

  const store: BriefingStore       = ((data.briefing ?? {}) as BriefingStore);
  const briefing: TodayBriefing    = store[today]     ?? {};
  const yesterday_b: TodayBriefing = store[yesterday] ?? {};

  const dismissed  = briefing.dismissedCarryovers ?? [];
  const carryovers = (yesterday_b.priorities ?? [])
    .filter(p => p.text.trim() && !p.completed && !dismissed.includes(p.id));
  const priorities = briefing.priorities ?? defaultPriorities.current;

  const updateBriefing = useCallback(
    (updates: Partial<TodayBriefing>) => {
      onChange(prev => {
        const s = ((prev.briefing ?? {}) as BriefingStore);
        return { ...prev, briefing: { ...s, [today]: { ...s[today], ...updates } } };
      });
    },
    [onChange, today],
  );

  const generate = useCallback(() => {
    setGenerating(true);
    setGenError('');
    fetch('/api/briefing/generate', { method: 'POST' })
      .then(r => r.json())
      .then((res: { scripture?: Scripture; reflection?: string; error?: string }) => {
        if (res.error) throw new Error(res.error);
        onChange(prev => {
          const s = ((prev.briefing ?? {}) as BriefingStore);
          return {
            ...prev,
            briefing: {
              ...s,
              [today]: {
                ...s[today],
                scripture:   res.scripture,
                reflection:  res.reflection,
                generatedAt: today,
              },
            },
          };
        });
      })
      .catch((err: Error) =>
        setGenError(err.message || 'Could not load today\'s scripture.'),
      )
      .finally(() => setGenerating(false));
  }, [today, onChange]);

  useEffect(() => {
    if (briefing.generatedAt === today) return;
    generate();
  }, [today, generate]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPriorityText = (i: number, text: string) =>
    updateBriefing({ priorities: priorities.map((p, idx) => idx === i ? { ...p, text } : p) });

  const togglePriority = (i: number) =>
    updateBriefing({ priorities: priorities.map((p, idx) => idx === i ? { ...p, completed: !p.completed } : p) });

  const includeCarryover = (task: Priority) => {
    const emptyIdx = priorities.findIndex(p => !p.text.trim());
    const next     = emptyIdx >= 0
      ? priorities.map((p, i) => i === emptyIdx ? { ...task, completed: false } : p)
      : [...priorities, { ...task, completed: false }];
    updateBriefing({ priorities: next, dismissedCarryovers: [...dismissed, task.id] });
  };

  const dismissCarryover = (id: string) =>
    updateBriefing({ dismissedCarryovers: [...dismissed, id] });

  const donePriorities  = priorities.filter(p => p.completed && p.text.trim()).length;
  const totalPriorities = priorities.filter(p => p.text.trim()).length;

  return (
    <section className="mb">
      <div className="mb-layout">

        {/* ── LEFT COLUMN ── */}
        <div className="mb-col-left">

          {/* Devotional / Scripture */}
          <div className="mb-card mb-card--devotional">
            <div className="mb-section-label">✦ Daily Devotional</div>
            {generating && <p className="mb-shimmer">Loading today's scripture…</p>}
            {genError && (
              <p className="mb-gen-error">
                {genError}{' '}
                <button className="mb-retry" onClick={generate}>Retry</button>
              </p>
            )}
            {briefing.scripture && (
              <>
                <blockquote className="mb-verse">
                  &ldquo;{briefing.scripture.text}&rdquo;
                </blockquote>
                <p className="mb-reference">{briefing.scripture.reference}</p>
                {briefing.reflection && (
                  <p className="mb-reflection">{briefing.reflection}</p>
                )}
              </>
            )}
            <button className="mb-regen" onClick={generate} disabled={generating}>
              {generating ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {/* Today's Intention */}
          <div className="mb-card">
            <div className="mb-section-label">Today&rsquo;s Intention</div>
            <textarea
              className="mb-intention"
              placeholder="What do you want to hold onto today?"
              value={briefing.intention ?? ''}
              onChange={e => updateBriefing({ intention: e.target.value })}
            />
          </div>

          {/* Carryovers */}
          {carryovers.length > 0 && (
            <div className="mb-card">
              <div className="mb-section-label">From Yesterday</div>
              <ul className="mb-carryover-list">
                {carryovers.map(task => (
                  <li key={task.id} className="mb-carryover-item">
                    <span className="mb-carryover-badge">carried over</span>
                    <span className="mb-carryover-text">{task.text}</span>
                    <div className="mb-carryover-actions">
                      <button className="mb-btn mb-btn--include" onClick={() => includeCarryover(task)}>Include</button>
                      <button className="mb-btn mb-btn--dismiss" onClick={() => dismissCarryover(task.id)}>Dismiss</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="mb-col-right">

          {/* Top 3 Priorities */}
          <div className="mb-card">
            <div className="mb-task-header">
              <div className="mb-section-label" style={{ marginBottom: 0 }}>Top 3 Priorities</div>
              {totalPriorities > 0 && (
                <span className="mb-task-count">{donePriorities}/{totalPriorities} done</span>
              )}
            </div>
            {totalPriorities > 0 && (
              <div className="mb-progress-track">
                <div
                  className="mb-progress-fill"
                  style={{ width: `${Math.round((donePriorities / totalPriorities) * 100)}%` }}
                />
              </div>
            )}
            <ol className="mb-priority-list">
              {priorities.slice(0, 3).map((p, i) => (
                <li key={p.id} className="mb-priority-item">
                  <button
                    className={`mb-check${p.completed ? ' mb-check--done' : ''}`}
                    onClick={() => togglePriority(i)}
                    aria-label={p.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {p.completed && <Tick />}
                  </button>
                  <input
                    type="text"
                    className={`mb-priority-input${p.completed ? ' mb-priority-input--done' : ''}`}
                    placeholder={`Priority ${i + 1}`}
                    value={p.text}
                    onChange={e => setPriorityText(i, e.target.value)}
                  />
                </li>
              ))}
            </ol>
          </div>


        </div>
      </div>
    </section>
  );
}

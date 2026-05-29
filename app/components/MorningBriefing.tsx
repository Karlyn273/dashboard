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
  carriedOver?: boolean;
}

interface TodayBriefing {
  scripture?: Scripture;
  reflection?: string;
  generatedAt?: string;
  priorities?: Priority[];
  intention?: string;
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

export default function MorningBriefing({ data, onChange }: Props) {
  const today     = localDateKey();
  const yesterday = prevDayKey(today);

  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState('');

  const store: BriefingStore       = ((data.briefing ?? {}) as BriefingStore);
  const briefing: TodayBriefing    = store[today]     ?? {};
  const yesterday_b: TodayBriefing = store[yesterday] ?? {};

  const priorities = briefing.priorities ?? [];

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

  // Generate once per calendar day on first load
  useEffect(() => {
    if (briefing.generatedAt === today) return;
    generate();
  }, [today, generate]); // eslint-disable-line react-hooks/exhaustive-deps

  const confettiRef = useRef<HTMLCanvasElement | null>(null);
  const confettiAnimRef = useRef<number | null>(null);

  const launchCelebration = useCallback(() => {
    // Chime sound via Web Audio API
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    } catch { /* audio not available */ }

    // Confetti burst
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    confettiRef.current = canvas;

    const colors = ['#b07272', '#e8a87c', '#f9d56e', '#c98880', '#7a816c', '#ddc8c4', '#ecddd9'];
    interface Particle { x: number; y: number; vx: number; vy: number; color: string; size: number; angle: number; spin: number; }
    const particles: Particle[] = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 7 + 4,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
    }));

    const c2d = canvas.getContext('2d')!;
    let frame = 0;

    const animate = () => {
      c2d.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.angle += p.spin;
        c2d.save();
        c2d.translate(p.x, p.y);
        c2d.rotate(p.angle);
        c2d.fillStyle = p.color;
        c2d.globalAlpha = Math.max(0, 1 - frame / 90);
        c2d.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        c2d.restore();
      });
      frame++;
      if (frame < 100) {
        confettiAnimRef.current = requestAnimationFrame(animate);
      } else {
        canvas.remove();
        confettiRef.current = null;
      }
    };
    confettiAnimRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => () => {
    if (confettiAnimRef.current) cancelAnimationFrame(confettiAnimRef.current);
    if (confettiRef.current) confettiRef.current.remove();
  }, []);

  // Auto-seed today's tasks with yesterday's incomplete ones on first open
  useEffect(() => {
    if (briefing.priorities !== undefined) return;
    const incomplete = (yesterday_b.priorities ?? [])
      .filter(p => p.text.trim() && !p.completed)
      .map(p => ({ ...p, id: crypto.randomUUID(), completed: false, carriedOver: true }));
    updateBriefing({ priorities: incomplete.length > 0 ? incomplete : [makeEmptyPriority()] });
  }, [today]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPriorityText = (i: number, text: string) =>
    updateBriefing({ priorities: priorities.map((p, idx) => idx === i ? { ...p, text } : p) });

  const togglePriority = (i: number) => {
    const wasCompleted = priorities[i]?.completed;
    updateBriefing({ priorities: priorities.map((p, idx) => idx === i ? { ...p, completed: !p.completed } : p) });
    if (!wasCompleted && priorities[i]?.text.trim()) launchCelebration();
  };

  const deleteTask = (i: number) =>
    updateBriefing({ priorities: priorities.filter((_, idx) => idx !== i) });

  const addTask = () =>
    updateBriefing({ priorities: [...priorities, makeEmptyPriority()] });

  const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  const fullDate  = new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date());

  return (
    <section className="mb">
      {/* Header: date */}
      <div className="mb-date-row">
        <span className="mb-day">{dayOfWeek}</span>
        <span className="mb-full-date">{fullDate}</span>
      </div>

      <div className="mb-cards">
        {/* Top row: Scripture + Priorities side by side */}
        <div className="mb-top-row">
          {/* Scripture + Reflection */}
          <div className="mb-card mb-card--scripture">
            <h2 className="mb-label">Scripture</h2>
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
          </div>

          {/* Daily Tasks */}
          <div className="mb-card">
            <div className="mb-task-header">
              <h2 className="mb-label" style={{ marginBottom: 0 }}>Daily Tasks</h2>
              {priorities.some(p => p.text.trim()) && (
                <span className="mb-task-count">
                  {priorities.filter(p => p.completed && p.text.trim()).length}/{priorities.filter(p => p.text.trim()).length} done
                </span>
              )}
            </div>
            {priorities.some(p => p.text.trim()) && (
              <div className="wv-progress-track" style={{ margin: '0.5rem 0 0.875rem' }}>
                <div
                  className="wv-progress-fill"
                  style={{
                    width: `${Math.round(
                      (priorities.filter(p => p.completed && p.text.trim()).length /
                       priorities.filter(p => p.text.trim()).length) * 100
                    )}%`,
                  }}
                />
              </div>
            )}
            <ol className="mb-task-list">
              {priorities.map((p, i) => (
                <li key={p.id} className={`mb-task-card${p.completed ? ' mb-task-card--done' : ''}`}>
                  <span className="mb-task-num">{i + 1}</span>
                  <button
                    className={`mb-check${p.completed ? ' mb-check--done' : ''}`}
                    onClick={() => togglePriority(i)}
                    aria-label={p.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {p.completed && (
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M2 6.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <input
                    type="text"
                    className={`mb-priority-input${p.completed ? ' mb-priority-input--done' : ''}`}
                    placeholder={`Task ${i + 1}`}
                    value={p.text}
                    onChange={e => setPriorityText(i, e.target.value)}
                  />
                  {p.carriedOver && !p.completed && (
                    <span className="mb-carried-badge">yesterday</span>
                  )}
                  <button className="mb-task-del" onClick={() => deleteTask(i)} aria-label="Remove task">×</button>
                </li>
              ))}
            </ol>
            <button className="mb-add-task" onClick={addTask}>+ Add task</button>
          </div>
        </div>

        {/* Today's Intention */}
        <div className="mb-card">
          <h2 className="mb-label">Today&rsquo;s Intention</h2>
          <textarea
            className="mb-intention"
            placeholder="What do you want to hold onto today?"
            value={briefing.intention ?? ''}
            onChange={e => updateBriefing({ intention: e.target.value })}
          />
        </div>

      </div>
    </section>
  );
}

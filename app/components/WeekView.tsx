'use client';

import { useState } from 'react';
import BookSearch, { BookResult } from './BookSearch';
import CalendarEvents             from './CalendarEvents';

// ── Types ────────────────────────────────────────────────────────

interface Task { id: string; text: string; completed: boolean; }
interface Goal { id: string; text: string; completed: boolean; }

type GymDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type GymMap  = Partial<Record<GymDay, boolean>>;

interface WeekData {
  tasks?:       Task[];
  gym?:         GymMap;
  focus?:       string;
  goals?:       Goal[];
  reflections?: string;
}

interface Book {
  id:               string;
  olKey:            string;
  title:            string;
  author:           string;
  coverId?:         number;
  status:           'reading' | 'finished';
  finishedQuarter?: string;
  finishedDate?:    string;
}

interface Props {
  data:     Record<string, unknown>;
  onChange: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
}

// ── Date helpers ─────────────────────────────────────────────────

const GYM_DAYS: GymDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const GYM_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const COVER_URL = (id: number) => `https://covers.openlibrary.org/b/id/${id}-M.jpg`;

function currentQuarterKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
}

function getMonday(offset: number): Date {
  const d   = new Date();
  const dow = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - ((dow + 6) % 7) + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(monday: Date): string {
  return monday.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

function formatRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const startStr = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr   = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

// ── Audio / confetti ─────────────────────────────────────────────

function playPop() {
  try {
    type W = typeof window & { webkitAudioContext?: typeof AudioContext };
    const Ctx = (window as W).AudioContext ?? (window as W).webkitAudioContext!;
    const ctx  = new Ctx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.13);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.13);
    osc.onended = () => ctx.close();
  } catch { /* unsupported */ }
}

function burstConfetti(el: HTMLElement) {
  const SIZE   = 150;
  const rect   = el.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width  = SIZE;
  canvas.height = SIZE;
  Object.assign(canvas.style, {
    position:      'fixed',
    top:           `${rect.top  + rect.height / 2 - SIZE / 2}px`,
    left:          `${rect.left + rect.width  / 2 - SIZE / 2}px`,
    pointerEvents: 'none',
    zIndex:        '9999',
  });
  document.body.appendChild(canvas);

  const cx      = SIZE / 2;
  const cy      = SIZE / 2;
  const palette = ['#d97706','#f59e0b','#fcd34d','#6366f1','#a78bfa','#4ade80','#f472b6','#f0e4cc'];
  const pieces  = Array.from({ length: 26 }, () => ({
    x: cx, y: cy,
    vx: (Math.random() - 0.5) * 9,
    vy: (Math.random() - 0.5) * 9 - 2,
    color: palette[Math.floor(Math.random() * palette.length)],
    w: Math.random() * 7 + 2,
    h: Math.random() * 4 + 2,
    alpha: 1,
    rot:  Math.random() * Math.PI * 2,
    drot: (Math.random() - 0.5) * 0.28,
  }));

  const ctx2d = canvas.getContext('2d')!;
  let frame = 0;

  (function tick() {
    ctx2d.clearRect(0, 0, SIZE, SIZE);
    for (const p of pieces) {
      p.x += p.vx;  p.y += p.vy;
      p.vy += 0.22; p.vx *= 0.97;
      p.alpha -= 0.021; p.rot += p.drot;
      if (p.alpha <= 0) continue;
      ctx2d.save();
      ctx2d.globalAlpha = Math.max(0, p.alpha);
      ctx2d.translate(p.x, p.y);
      ctx2d.rotate(p.rot);
      ctx2d.fillStyle = p.color;
      ctx2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx2d.restore();
    }
    if (++frame < 58) requestAnimationFrame(tick);
    else canvas.remove();
  })();
}

// ── Shared sub-components ────────────────────────────────────────

function Tick() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M2 6.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

// ── Main component ───────────────────────────────────────────────

export default function WeekView({ data, onChange }: Props) {
  const [offset,     setOffset]     = useState(0);
  const [showSearch, setShowSearch] = useState(false);

  const monday = getMonday(offset);
  const key    = weekKey(monday);
  const range  = formatRange(monday);

  type WStore  = Record<string, WeekData>;
  const store  = ((data.weeks ?? {}) as WStore);
  const week   = store[key] ?? {} as WeekData;
  const tasks  = week.tasks  ?? [];
  const goals  = week.goals  ?? [];
  const gym    = week.gym    ?? {} as GymMap;

  const setWeek = (updates: Partial<WeekData>) =>
    onChange(prev => {
      const s = ((prev.weeks ?? {}) as WStore);
      return { ...prev, weeks: { ...s, [key]: { ...s[key], ...updates } } };
    });

  // ── Task handlers
  const addTask  = () =>
    setWeek({ tasks: [...tasks, { id: crypto.randomUUID(), text: '', completed: false }] });
  const delTask  = (id: string) =>
    setWeek({ tasks: tasks.filter(t => t.id !== id) });
  const taskText = (id: string, text: string) =>
    setWeek({ tasks: tasks.map(t => t.id === id ? { ...t, text } : t) });
  const checkTask = (id: string, el: HTMLElement) => {
    const willDone = !tasks.find(t => t.id === id)?.completed;
    setWeek({ tasks: tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) });
    if (willDone) { playPop(); burstConfetti(el); }
  };

  // ── Goal handlers
  const addGoal  = () =>
    setWeek({ goals: [...goals, { id: crypto.randomUUID(), text: '', completed: false }] });
  const delGoal  = (id: string) =>
    setWeek({ goals: goals.filter(g => g.id !== id) });
  const goalText = (id: string, text: string) =>
    setWeek({ goals: goals.map(g => g.id === id ? { ...g, text } : g) });
  const checkGoal = (id: string, el: HTMLElement) => {
    const willDone = !goals.find(g => g.id === id)?.completed;
    setWeek({ goals: goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g) });
    if (willDone) { playPop(); burstConfetti(el); }
  };

  // ── Gym handler
  const toggleGym = (day: GymDay) =>
    setWeek({ gym: { ...gym, [day]: !gym[day] } });

  // ── Book handlers
  type BookStore   = Book[];
  const books        = (data.books ?? []) as BookStore;
  const readingBooks = books.filter(b => b.status === 'reading');

  const addBook = (r: BookResult) =>
    onChange(prev => ({
      ...prev,
      books: [...((prev.books ?? []) as BookStore), {
        id:      crypto.randomUUID(),
        olKey:   r.olKey,
        title:   r.title,
        author:  r.author,
        coverId: r.coverId,
        status:  'reading' as const,
      }],
    }));

  const finishBook = (id: string) =>
    onChange(prev => ({
      ...prev,
      books: ((prev.books ?? []) as BookStore).map(b =>
        b.id === id
          ? {
              ...b,
              status:          'finished' as const,
              finishedQuarter: currentQuarterKey(),
              finishedDate:    new Date().toLocaleDateString('en-CA'),
            }
          : b,
      ),
    }));

  return (
    <section className="wv">

      {/* ── Week navigation ── */}
      <div className="wv-nav">
        <button className="wv-nav-btn" onClick={() => setOffset(o => o - 1)} aria-label="Previous week">
          ←
        </button>
        <span className="wv-nav-range">{range}</span>
        <button className="wv-nav-btn" onClick={() => setOffset(o => o + 1)} aria-label="Next week">
          →
        </button>
      </div>

      <div className="wv-grid">

        {/* ── Tasks ── */}
        <div className="wv-card">
          <div className="wv-task-header">
            <h2 className="wv-label" style={{ marginBottom: 0 }}>Weekly Tasks</h2>
            {tasks.length > 0 && (
              <span className="wv-task-count">
                {tasks.filter(t => t.completed).length}/{tasks.length} complete
              </span>
            )}
          </div>
          {tasks.length > 0 && (
            <div className="wv-progress-track">
              <div
                className="wv-progress-fill"
                style={{ width: `${Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)}%` }}
              />
            </div>
          )}
          <ul className="wv-list" style={{ marginTop: '0.75rem' }}>
            {tasks.map(t => (
              <li key={t.id} className="wv-item">
                <button
                  className={`wv-check${t.completed ? ' wv-check--on' : ''}`}
                  onClick={e => checkTask(t.id, e.currentTarget)}
                  aria-label={t.completed ? 'Uncheck' : 'Check'}
                >
                  {t.completed && <Tick />}
                </button>
                <input
                  className={`wv-item-input${t.completed ? ' wv-item-input--done' : ''}`}
                  value={t.text}
                  placeholder="Task"
                  onChange={e => taskText(t.id, e.target.value)}
                />
                <button className="wv-del" onClick={() => delTask(t.id)} aria-label="Remove task">×</button>
              </li>
            ))}
          </ul>
          <button className="wv-add" onClick={addTask}>+ Add task</button>
        </div>

        {/* ── Gym sessions ── */}
        <div className="wv-card">
          <h2 className="wv-label">Gym Sessions</h2>
          <div className="wv-gym-row">
            {GYM_DAYS.map((day, i) => (
              <button
                key={day}
                className={`wv-gym-day${gym[day] ? ' wv-gym-day--on' : ''}`}
                onClick={() => toggleGym(day)}
                aria-label={GYM_ABBR[i]}
                aria-pressed={!!gym[day]}
              >
                <span className="wv-gym-circle">
                  {gym[day] && <Tick />}
                </span>
                <span className="wv-gym-abbr">{GYM_ABBR[i]}</span>
              </button>
            ))}
          </div>
          <p className="wv-gym-tally">
            {GYM_DAYS.filter(d => gym[d]).length} / 7 sessions
          </p>
        </div>

        {/* ── Weekly focus + goals ── */}
        <div className="wv-card">
          <h2 className="wv-label">Weekly Focus</h2>
          <textarea
            className="wv-textarea wv-focus-ta"
            placeholder="What matters most this week?"
            value={week.focus ?? ''}
            onChange={e => setWeek({ focus: e.target.value })}
          />
          <h3 className="wv-sublabel">Goals</h3>
          <ul className="wv-list">
            {goals.map(g => (
              <li key={g.id} className="wv-item">
                <button
                  className={`wv-check${g.completed ? ' wv-check--on' : ''}`}
                  onClick={e => checkGoal(g.id, e.currentTarget)}
                  aria-label={g.completed ? 'Uncheck' : 'Check'}
                >
                  {g.completed && <Tick />}
                </button>
                <input
                  className={`wv-item-input${g.completed ? ' wv-item-input--done' : ''}`}
                  value={g.text}
                  placeholder="Goal"
                  onChange={e => goalText(g.id, e.target.value)}
                />
                <button className="wv-del" onClick={() => delGoal(g.id)} aria-label="Remove goal">×</button>
              </li>
            ))}
          </ul>
          <button className="wv-add" onClick={addGoal}>+ Add goal</button>
        </div>

        {/* ── Reflections ── */}
        <div className="wv-card">
          <h2 className="wv-label">Reflections</h2>
          <textarea
            className="wv-textarea wv-reflections-ta"
            placeholder="How did this week go? What did you notice, learn, or want to carry forward?"
            value={week.reflections ?? ''}
            onChange={e => setWeek({ reflections: e.target.value })}
          />
        </div>

        {/* ── Currently reading ── */}
        <div className="wv-card">
          <h2 className="wv-label">Currently Reading</h2>
          {readingBooks.length === 0 ? (
            <p className="bk-empty">No book in progress</p>
          ) : (
            <ul className="bk-reading-list">
              {readingBooks.map(b => (
                <li key={b.id} className="bk-reading-item">
                  <div className="bk-cover-sm">
                    {b.coverId
                      ? <img src={COVER_URL(b.coverId)} alt="" className="bk-cover-img-sm" loading="lazy" />
                      : <span className="bk-no-cover-sm">📖</span>
                    }
                  </div>
                  <div className="bk-info">
                    <span className="bk-title">{b.title}</span>
                    {b.author && <span className="bk-author">{b.author}</span>}
                  </div>
                  <button className="bk-finish-btn" onClick={() => finishBook(b.id)}>
                    Finished
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button className="wv-add" onClick={() => setShowSearch(true)}>
            {readingBooks.length > 0 ? '+ Add another book' : '+ Find a book'}
          </button>
          {showSearch && (
            <BookSearch onSelect={addBook} onClose={() => setShowSearch(false)} />
          )}
        </div>

        {/* ── Week's Schedule ── */}
        <div className="wv-card">
          <h2 className="wv-label">Week&rsquo;s Schedule</h2>
          <CalendarEvents
            timeMin={monday.toISOString()}
            timeMax={(() => { const d = new Date(monday); d.setDate(monday.getDate() + 7); return d; })().toISOString()}
            groupByDay
          />
        </div>

      </div>
    </section>
  );
}

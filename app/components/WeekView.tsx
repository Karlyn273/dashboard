'use client';

import { useState } from 'react';
import BookSearch, { BookResult } from './BookSearch';
import CalendarEvents             from './CalendarEvents';

interface Task { id: string; text: string; completed: boolean; }
interface Goal { id: string; text: string; completed: boolean; }

type GymDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type GymMap  = Partial<Record<GymDay, boolean>>;

interface WeekData {
  tasks?:       Task[];
  gym?:         GymMap;
  gymGoal?:     number;
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

const GYM_DAYS: GymDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const GYM_ABBR           = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const COVER_URL = (id: number) => `https://covers.openlibrary.org/b/id/${id}-M.jpg`;

function currentQuarterKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
}

function getMonday(offset: number): Date {
  const d   = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - ((dow + 6) % 7) + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(monday: Date): string {
  return monday.toLocaleDateString('en-CA');
}

function weekLabel(monday: Date): string {
  return `Week of ${monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
}

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
    position: 'fixed',
    top:      `${rect.top  + rect.height / 2 - SIZE / 2}px`,
    left:     `${rect.left + rect.width  / 2 - SIZE / 2}px`,
    pointerEvents: 'none',
    zIndex:   '9999',
  });
  document.body.appendChild(canvas);
  const cx = SIZE / 2, cy = SIZE / 2;
  const palette = ['#d97706','#f59e0b','#fcd34d','#6366f1','#a78bfa','#4ade80','#f472b6','#f0e4cc'];
  const pieces  = Array.from({ length: 26 }, () => ({
    x: cx, y: cy,
    vx: (Math.random() - 0.5) * 9,
    vy: (Math.random() - 0.5) * 9 - 2,
    color: palette[Math.floor(Math.random() * palette.length)],
    w: Math.random() * 7 + 2,
    h: Math.random() * 4 + 2,
    alpha: 1, rot: Math.random() * Math.PI * 2,
    drot: (Math.random() - 0.5) * 0.28,
  }));
  const ctx2d = canvas.getContext('2d')!;
  let frame = 0;
  (function tick() {
    ctx2d.clearRect(0, 0, SIZE, SIZE);
    for (const p of pieces) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.vx *= 0.97;
      p.alpha -= 0.021; p.rot += p.drot;
      if (p.alpha <= 0) continue;
      ctx2d.save();
      ctx2d.globalAlpha = Math.max(0, p.alpha);
      ctx2d.translate(p.x, p.y); ctx2d.rotate(p.rot);
      ctx2d.fillStyle = p.color;
      ctx2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx2d.restore();
    }
    if (++frame < 58) requestAnimationFrame(tick);
    else canvas.remove();
  })();
}

function Tick() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M2 6.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function WeekView({ data, onChange }: Props) {
  const [offset,     setOffset]     = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [bookStatus, setBookStatus] = useState<Record<string, 'reading' | 'paused' | 'completed'>>({});

  const monday = getMonday(offset);
  const key    = weekKey(monday);
  const label  = weekLabel(monday);

  type WStore = Record<string, WeekData>;
  const store = ((data.weeks ?? {}) as WStore);
  const week  = store[key] ?? {} as WeekData;
  const tasks = week.tasks  ?? [];
  const goals = week.goals  ?? [];
  const gym   = week.gym    ?? {} as GymMap;
  const gymGoal = week.gymGoal ?? 5;

  const gymCount = GYM_DAYS.filter(d => gym[d]).length;

  const setWeek = (updates: Partial<WeekData>) =>
    onChange(prev => {
      const s = ((prev.weeks ?? {}) as WStore);
      return { ...prev, weeks: { ...s, [key]: { ...s[key], ...updates } } };
    });

  // Task handlers
  const addTask   = () => setWeek({ tasks: [...tasks, { id: crypto.randomUUID(), text: '', completed: false }] });
  const delTask   = (id: string) => setWeek({ tasks: tasks.filter(t => t.id !== id) });
  const taskText  = (id: string, text: string) => setWeek({ tasks: tasks.map(t => t.id === id ? { ...t, text } : t) });
  const checkTask = (id: string, el: HTMLElement) => {
    const willDone = !tasks.find(t => t.id === id)?.completed;
    setWeek({ tasks: tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) });
    if (willDone) { playPop(); burstConfetti(el); }
  };

  // Goal handlers
  const addGoal   = () => setWeek({ goals: [...goals, { id: crypto.randomUUID(), text: '', completed: false }] });
  const delGoal   = (id: string) => setWeek({ goals: goals.filter(g => g.id !== id) });
  const goalText  = (id: string, text: string) => setWeek({ goals: goals.map(g => g.id === id ? { ...g, text } : g) });
  const checkGoal = (id: string, el: HTMLElement) => {
    const willDone = !goals.find(g => g.id === id)?.completed;
    setWeek({ goals: goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g) });
    if (willDone) { playPop(); burstConfetti(el); }
  };

  const toggleGym = (day: GymDay) => setWeek({ gym: { ...gym, [day]: !gym[day] } });

  // Book handlers
  type BookStore = Book[];
  const books        = (data.books ?? []) as BookStore;
  const readingBooks = books.filter(b => b.status === 'reading');

  const addBook = (r: BookResult) =>
    onChange(prev => ({
      ...prev,
      books: [...((prev.books ?? []) as BookStore), {
        id: crypto.randomUUID(), olKey: r.olKey,
        title: r.title, author: r.author, coverId: r.coverId,
        status: 'reading' as const,
      }],
    }));

  const finishBook = (id: string) =>
    onChange(prev => ({
      ...prev,
      books: ((prev.books ?? []) as BookStore).map(b =>
        b.id === id ? {
          ...b, status: 'finished' as const,
          finishedQuarter: currentQuarterKey(),
          finishedDate:    new Date().toLocaleDateString('en-CA'),
        } : b,
      ),
    }));

  const completedTasks = tasks.filter(t => t.completed).length;

  return (
    <section className="wv">

      {/* ── Week nav header ── */}
      <div className="wv-weeknav">
        <button className="wv-weeknav-btn" onClick={() => setOffset(o => o - 1)} aria-label="Previous week">‹</button>
        <span className="wv-weeknav-label">{label}</span>
        <button className="wv-weeknav-btn" onClick={() => setOffset(o => o + 1)} aria-label="Next week">›</button>
      </div>

      <div className="wv-layout">

        {/* ── LEFT COLUMN ── */}
        <div className="wv-col-left">

          {/* Weekly Focus */}
          <div className="wv-card">
            <div className="wv-section-label">WEEKLY FOCUS</div>
            <div className="wv-focus-week">{label}</div>
            <textarea
              className="wv-focus-ta"
              placeholder="Click to set this week's focus…"
              value={week.focus ?? ''}
              onChange={e => setWeek({ focus: e.target.value })}
            />
            <div className="wv-goals-label">GOALS</div>
            <ul className="wv-goals-list">
              {goals.map(g => (
                <li key={g.id} className="wv-goal-item">
                  <button
                    className={`wv-check${g.completed ? ' wv-check--on' : ''}`}
                    onClick={e => checkGoal(g.id, e.currentTarget)}
                  >
                    {g.completed && <Tick />}
                  </button>
                  <input
                    className={`wv-item-input${g.completed ? ' wv-item-input--done' : ''}`}
                    value={g.text}
                    placeholder="Add a goal…"
                    onChange={e => goalText(g.id, e.target.value)}
                  />
                  <button className="wv-del" onClick={() => delGoal(g.id)}>×</button>
                </li>
              ))}
              <li>
                <button className="wv-ghost-add" onClick={addGoal}>Add a goal…</button>
              </li>
            </ul>
          </div>

          {/* This Week's Tasks */}
          <div className="wv-card">
            <div className="wv-task-header">
              <div className="wv-section-label" style={{ marginBottom: 0 }}>THIS WEEK&rsquo;S TASKS</div>
              {tasks.length > 0 && (
                <span className="wv-task-count">{completedTasks}/{tasks.length} complete</span>
              )}
            </div>
            {tasks.length > 0 && (
              <div className="wv-progress-track">
                <div
                  className="wv-progress-fill"
                  style={{ width: `${Math.round((completedTasks / tasks.length) * 100)}%` }}
                />
              </div>
            )}
            <ul className="wv-task-list">
              {tasks.map(t => (
                <li key={t.id} className="wv-task-item">
                  <button
                    className={`wv-check${t.completed ? ' wv-check--on' : ''}`}
                    onClick={e => checkTask(t.id, e.currentTarget)}
                  >
                    {t.completed && <Tick />}
                  </button>
                  <input
                    className={`wv-item-input${t.completed ? ' wv-item-input--done' : ''}`}
                    value={t.text}
                    placeholder="Add a task…"
                    onChange={e => taskText(t.id, e.target.value)}
                  />
                  <button className="wv-del" onClick={() => delTask(t.id)}>×</button>
                </li>
              ))}
              <li>
                <button className="wv-ghost-add" onClick={addTask}>+ Add a task</button>
              </li>
            </ul>
          </div>

          {/* Events / Schedule */}
          <div className="wv-card">
            <div className="wv-section-label">EVENTS</div>
            <div className="wv-events-sub">This Week</div>
            <CalendarEvents
              timeMin={monday.toISOString()}
              timeMax={(() => { const d = new Date(monday); d.setDate(monday.getDate() + 7); return d; })().toISOString()}
              groupByDay
            />
          </div>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="wv-col-right">

          {/* Gym tracker */}
          <div className="wv-card">
            <div className="wv-gym-header">
              <div>
                <div className="wv-section-label">GYM THIS WEEK</div>
                <div className="wv-gym-tally">{gymCount} / {gymGoal} sessions</div>
              </div>
            </div>
            <div className="wv-gym-row">
              {GYM_DAYS.map((day, i) => (
                <button
                  key={day}
                  className={`wv-gym-day${gym[day] ? ' wv-gym-day--on' : ''}`}
                  onClick={() => toggleGym(day)}
                  aria-pressed={!!gym[day]}
                >
                  <span className="wv-gym-abbr">{GYM_ABBR[i]}</span>
                </button>
              ))}
            </div>
            <div className="wv-gym-goal-row">
              <span className="wv-gym-goal-label">Goal:</span>
              <input
                type="number"
                className="wv-gym-goal-input"
                min={1} max={7}
                value={gymGoal}
                onChange={e => setWeek({ gymGoal: Number(e.target.value) })}
              />
              <span className="wv-gym-goal-label">sessions/week</span>
            </div>
          </div>

          {/* Currently Reading */}
          <div className="wv-card">
            <div className="wv-section-label">Currently Reading</div>
            {readingBooks.length === 0 ? (
              <p className="wv-empty-text">No book in progress</p>
            ) : (
              readingBooks.map(b => {
                const uiStatus = bookStatus[b.id] ?? 'reading';
                return (
                  <div key={b.id} className="bk-reading-item">
                    <div className="bk-cover-sm">
                      {b.coverId
                        ? <img src={COVER_URL(b.coverId)} alt="" className="bk-cover-img-sm" loading="lazy" />
                        : <span className="bk-no-cover-sm">📖</span>
                      }
                    </div>
                    <div className="bk-info">
                      <span className="bk-title">{b.title}</span>
                      {b.author && <span className="bk-author">{b.author}</span>}
                      <div className="bk-status-pills">
                        {(['reading', 'paused', 'completed'] as const).map(s => (
                          <button
                            key={s}
                            className={`bk-pill${uiStatus === s ? ' bk-pill--active' : ''}`}
                            onClick={() => {
                              setBookStatus(prev => ({ ...prev, [b.id]: s }));
                              if (s === 'completed') finishBook(b.id);
                            }}
                          >
                            {s === 'reading' ? '⊞ Reading' : s === 'paused' ? '◎ Paused' : '✓ Completed'}
                          </button>
                        ))}
                      </div>
                      <p className="bk-finish-hint">Marking complete will log it to your quarter</p>
                    </div>
                  </div>
                );
              })
            )}
            <button className="wv-ghost-add" onClick={() => setShowSearch(true)}>
              + {readingBooks.length > 0 ? 'Change book' : 'Add a book'}
            </button>
            {showSearch && (
              <BookSearch onSelect={r => { addBook(r); setShowSearch(false); }} onClose={() => setShowSearch(false)} />
            )}
          </div>

          {/* Reflection */}
          <div className="wv-card">
            <div className="wv-section-label">REFLECTION</div>
            <div className="wv-reflection-sub">This week</div>
            <textarea
              className="wv-reflection-ta"
              placeholder="Gratitude, wins, thoughts…"
              value={week.reflections ?? ''}
              onChange={e => setWeek({ reflections: e.target.value })}
            />
          </div>

        </div>
      </div>
    </section>
  );
}

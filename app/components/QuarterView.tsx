'use client';

import { useState } from 'react';

// ── Types ────────────────────────────────────────────────────────

type Category = 'Finance' | 'Health' | 'Business' | 'Personal';

interface QuarterlyGoal {
  id: string;
  text: string;
  category: Category;
  completed: boolean;
  weeklyBreakdown: Record<string, string>;
}

interface MonthPlan {
  goal: string;
  weekNotes: Record<string, string>; // 'YYYY-MM-DD' → note
}

interface ParkingItem {
  id: string;
  text: string;
  addedDate: string;
}

interface Achievement {
  id: string;
  text: string;
  date: string;
  quarter: string;
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

interface QuarterData  { goals?: QuarterlyGoal[]; monthPlans?: Record<string, MonthPlan>; }

interface Props {
  data:     Record<string, unknown>;
  onChange: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
}

// ── Quarter helpers ──────────────────────────────────────────────

const CATEGORIES: Category[] = ['Finance', 'Health', 'Business', 'Personal'];

const CAT_COLOR: Record<Category, string> = {
  Finance:  '#22c55e',
  Health:   '#3b82f6',
  Business: '#6366f1',
  Personal: '#f43f5e',
};

function currentQuarterKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
}

function shiftQuarter(key: string, delta: number): string {
  const [yearStr, qStr] = key.split('-Q');
  let year = parseInt(yearStr);
  let q    = parseInt(qStr) + delta;
  while (q > 4) { q -= 4; year++; }
  while (q < 1) { q += 4; year--; }
  return `${year}-Q${q}`;
}

function quarterLabel(key: string): string {
  const [year, q]  = key.split('-Q');
  const ranges     = [['Jan','Mar'],['Apr','Jun'],['Jul','Sep'],['Oct','Dec']];
  const [s, e]     = ranges[parseInt(q) - 1];
  return `${s} – ${e} ${year}`;
}

interface WeekEntry { key: string; label: string; }

interface MonthEntry { name: string; idx: number; weeks: WeekEntry[]; }

function getQuarterMonths(quarterKey: string): MonthEntry[] {
  const [yearStr, qStr] = quarterKey.split('-Q');
  const year       = parseInt(yearStr);
  const q          = parseInt(qStr);
  const startMonth = (q - 1) * 3;
  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];

  return [0, 1, 2].map(offset => {
    const mIdx     = startMonth + offset;
    const mStart   = new Date(year, mIdx, 1);
    const mEnd     = new Date(year, mIdx + 1, 0);

    // First Monday on or after month start
    const first = new Date(mStart);
    const skip  = (8 - first.getDay()) % 7;
    if (skip) first.setDate(first.getDate() + skip);

    const weeks: WeekEntry[] = [];
    let cur = new Date(first);
    let n   = 1;
    while (cur <= mEnd) {
      weeks.push({
        key:   cur.toLocaleDateString('en-CA'),
        label: `Wk ${n} · ${cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      });
      cur = new Date(cur);
      cur.setDate(cur.getDate() + 7);
      n++;
    }
    return { name: MONTH_NAMES[mIdx], idx: offset, weeks };
  });
}

const COVER_URL = (id: number) => `https://covers.openlibrary.org/b/id/${id}-M.jpg`;

// ── Icons ────────────────────────────────────────────────────────

function Tick() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M2 6.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────

export default function QuarterView({ data, onChange }: Props) {
  const [qKey, setQKey] = useState(currentQuarterKey);

  const qMonths = getQuarterMonths(qKey);

  type QStore = Record<string, QuarterData>;
  const qStore   = ((data.quarters   ?? {}) as QStore);
  const quarter  = qStore[qKey] ?? {} as QuarterData;
  const goals    = quarter.goals ?? [];
  const monthPlans = quarter.monthPlans ?? {} as Record<string, MonthPlan>;

  const parking  = ((data.parkingLot  ?? []) as ParkingItem[]);
  const achieves = ((data.achievements ?? []) as Achievement[]);

  const qAchieves = achieves.filter(a => a.quarter === qKey);

  const books   = ((data.books ?? []) as Book[]);
  const qBooks  = books.filter(b => b.status === 'finished' && b.finishedQuarter === qKey);

  // ── Quarter goals ─────────────────────────────────────────────

  const setQData = (updates: Partial<QuarterData>) =>
    onChange(prev => {
      const s = ((prev.quarters ?? {}) as QStore);
      return { ...prev, quarters: { ...s, [qKey]: { ...s[qKey], ...updates } } };
    });

  const setQGoals = (next: QuarterlyGoal[]) => setQData({ goals: next });

  const addGoal = (cat: Category) =>
    setQGoals([...goals, {
      id: crypto.randomUUID(), text: '', category: cat,
      completed: false, weeklyBreakdown: {},
    }]);

  const goalField = (id: string, text: string) =>
    setQGoals(goals.map(g => g.id === id ? { ...g, text } : g));

  const toggleGoal = (id: string) =>
    setQGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));

  const delGoal = (id: string) =>
    setQGoals(goals.filter(g => g.id !== id));

  // ── Monthly execution plan ─────────────────────────────────────

  const setMonthPlan = (mIdx: number, updates: Partial<MonthPlan>) =>
    setQData({
      monthPlans: {
        ...monthPlans,
        [mIdx]: { ...{ goal: '', weekNotes: {} }, ...monthPlans[mIdx], ...updates },
      },
    });

  const setMonthGoal = (mIdx: number, goal: string) => setMonthPlan(mIdx, { goal });

  const setMonthWeekNote = (mIdx: number, weekKey: string, text: string) =>
    setMonthPlan(mIdx, {
      weekNotes: { ...(monthPlans[mIdx]?.weekNotes ?? {}), [weekKey]: text },
    });

  // ── Parking lot ───────────────────────────────────────────────

  const addParking = () =>
    onChange(prev => ({
      ...prev,
      parkingLot: [...parking, { id: crypto.randomUUID(), text: '', addedDate: new Date().toLocaleDateString('en-CA') }],
    }));

  const parkingField = (id: string, text: string) =>
    onChange(prev => ({
      ...prev,
      parkingLot: parking.map(p => p.id === id ? { ...p, text } : p),
    }));

  const delParking = (id: string) =>
    onChange(prev => ({ ...prev, parkingLot: parking.filter(p => p.id !== id) }));

  // ── Achievements ──────────────────────────────────────────────

  const addAchieve = () =>
    onChange(prev => ({
      ...prev,
      achievements: [...achieves, {
        id: crypto.randomUUID(), text: '',
        date: new Date().toLocaleDateString('en-CA'),
        quarter: qKey,
      }],
    }));

  const achieveField = (id: string, text: string) =>
    onChange(prev => ({
      ...prev,
      achievements: achieves.map(a => a.id === id ? { ...a, text } : a),
    }));

  const delAchieve = (id: string) =>
    onChange(prev => ({ ...prev, achievements: achieves.filter(a => a.id !== id) }));

  // ── Render ────────────────────────────────────────────────────

  return (
    <section className="qv">

      {/* Quarter navigation */}
      <div className="qv-nav">
        <button className="wv-nav-btn" onClick={() => setQKey(k => shiftQuarter(k, -1))} aria-label="Previous quarter">←</button>
        <div className="qv-nav-center">
          <span className="qv-nav-key">{qKey}</span>
          <span className="qv-nav-range">{quarterLabel(qKey)}</span>
        </div>
        <button className="wv-nav-btn" onClick={() => setQKey(k => shiftQuarter(k, 1))} aria-label="Next quarter">→</button>
      </div>

      {/* ── Goals 2×2 grid ── */}
      <div className="qv-goals-grid">
        {CATEGORIES.map(cat => {
          const catGoals = goals.filter(g => g.category === cat);
          return (
            <div
              key={cat}
              className="qv-card qv-cat-card"
              style={{ borderLeftColor: CAT_COLOR[cat] }}
            >
              <h2 className="qv-cat-header">
                <span className="qv-cat-dot" style={{ background: CAT_COLOR[cat] }} />
                {cat}
              </h2>
              <ul className="qv-goal-list">
                {catGoals.map(goal => (
                  <li key={goal.id}>
                    <div className="qv-goal-row">
                      <button
                        className={`wv-check${goal.completed ? ' wv-check--on' : ''}`}
                        onClick={() => toggleGoal(goal.id)}
                        aria-label={goal.completed ? 'Uncheck' : 'Check'}
                      >
                        {goal.completed && <Tick />}
                      </button>
                      <input
                        className={`qv-goal-input${goal.completed ? ' qv-goal-input--done' : ''}`}
                        value={goal.text}
                        placeholder="Goal…"
                        onChange={e => goalField(goal.id, e.target.value)}
                      />
                      <button className="wv-del" onClick={() => delGoal(goal.id)} aria-label="Remove">×</button>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="wv-add" onClick={() => addGoal(cat)}>+ Add goal</button>
            </div>
          );
        })}
      </div>

      {/* ── Monthly Execution Plan ── */}
      <div className="qv-months-grid">
        {qMonths.map(month => {
          const plan = monthPlans[month.idx] ?? { goal: '', weekNotes: {} };
          return (
            <div key={month.idx} className="qv-month-card">
              <h2 className="qv-month-heading">{month.name}</h2>

              <div>
                <p className="qv-month-goal-label">Monthly Goal / Focus</p>
                <textarea
                  className="qv-month-goal-ta"
                  placeholder="What do you want to accomplish this month?"
                  value={plan.goal}
                  onChange={e => setMonthGoal(month.idx, e.target.value)}
                />
              </div>

              <div>
                <p className="qv-month-weeks-label">Weekly Breakdown</p>
                {month.weeks.map(({ key, label }) => (
                  <div key={key} className="qv-month-week-row">
                    <span className="qv-month-week-lbl">{label}</span>
                    <input
                      className="qv-month-week-input"
                      placeholder="Action or milestone…"
                      value={plan.weekNotes?.[key] ?? ''}
                      onChange={e => setMonthWeekNote(month.idx, key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Parking lot + Achievements ── */}
      <div className="qv-bottom-row">

        <div className="qv-card">
          <h2 className="qv-section-hd">Parking Lot</h2>
          <p className="qv-section-desc">Ideas to return to later</p>
          <ul className="wv-list">
            {parking.map(item => (
              <li key={item.id} className="wv-item">
                <input
                  className="wv-item-input"
                  value={item.text}
                  placeholder="Idea or item…"
                  onChange={e => parkingField(item.id, e.target.value)}
                />
                <span className="qv-item-date">{item.addedDate}</span>
                <button className="wv-del" onClick={() => delParking(item.id)} aria-label="Remove">×</button>
              </li>
            ))}
          </ul>
          <button className="wv-add" onClick={addParking}>+ Add item</button>
        </div>

        <div className="qv-card">
          <h2 className="qv-section-hd">Achievements</h2>
          <p className="qv-section-desc">{qKey} wins</p>
          <ul className="wv-list">
            {qAchieves.map(a => (
              <li key={a.id} className="wv-item">
                <span className="qv-star" aria-hidden="true">★</span>
                <input
                  className="wv-item-input"
                  value={a.text}
                  placeholder="Win or milestone…"
                  onChange={e => achieveField(a.id, e.target.value)}
                />
                <span className="qv-item-date">{a.date}</span>
                <button className="wv-del" onClick={() => delAchieve(a.id)} aria-label="Remove">×</button>
              </li>
            ))}
          </ul>
          <button className="wv-add" onClick={addAchieve}>+ Add achievement</button>
        </div>

      </div>

      {/* ── Books Read This Quarter ── */}
      <div className="qv-card">
        <h2 className="qv-section-hd">Books Read This Quarter</h2>
        {qBooks.length === 0 ? (
          <p className="qv-empty">No books finished this quarter yet.</p>
        ) : (
          <ul className="bk-finished-list">
            {qBooks.map(b => (
              <li key={b.id} className="bk-finished-item">
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
                {b.finishedDate && (
                  <span className="bk-finished-date">{b.finishedDate}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

    </section>
  );
}

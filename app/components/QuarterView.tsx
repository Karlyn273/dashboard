'use client';

import { useState } from 'react';

type Category = 'Finance' | 'Health' | 'Business' | 'Personal';

interface QuarterlyGoal {
  id: string;
  text: string;
  category: Category;
  completed: boolean;
  weeklyBreakdown: Record<string, string>;
}

interface FinanceData {
  debtPaid?:    number;
  debtTotal?:   number;
  savedAmount?: number;
  savingsGoal?: number;
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

interface HabitLog { habitId: string; date: string; }

interface Props {
  data:     Record<string, unknown>;
  onChange: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
}

const CATEGORIES: Category[] = ['Finance', 'Health', 'Business', 'Personal'];

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
  const [year, q] = key.split('-Q');
  const ranges    = [['Jan','Mar'],['Apr','Jun'],['Jul','Sep'],['Oct','Dec']];
  const [s, e]    = ranges[parseInt(q) - 1];
  return `${s} – ${e} ${year}`;
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

function $$(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n || 0);
}

function numVal(s: string): number { return parseFloat(s) || 0; }

const COVER_URL = (id: number) => `https://covers.openlibrary.org/b/id/${id}-M.jpg`;

function Tick() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M2 6.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Build last-13-weeks gym data from habitLogs
function getGymWeeks(habitLogs: HabitLog[]): number[] {
  const logDates = new Set(habitLogs.map(l => l.date));
  const weeks: number[] = [];
  const today = new Date();
  for (let w = 12; w >= 0; w--) {
    let count = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(today);
      day.setDate(today.getDate() - w * 7 - d);
      if (logDates.has(day.toLocaleDateString('en-CA'))) count++;
    }
    weeks.push(count);
  }
  return weeks;
}

export default function QuarterView({ data, onChange }: Props) {
  const [qKey, setQKey] = useState(currentQuarterKey);

  type QStore = Record<string, { goals?: QuarterlyGoal[] }>;
  const qStore  = ((data.quarters ?? {}) as QStore);
  const quarter = qStore[qKey] ?? {};
  const goals   = quarter.goals ?? [];

  const finance  = ((data.finance     ?? {}) as FinanceData);
  const parking  = ((data.parkingLot  ?? []) as ParkingItem[]);
  const achieves = ((data.achievements ?? []) as Achievement[]);
  const books    = ((data.books        ?? []) as Book[]);
  const habitLogs = ((data.habitLogs   ?? []) as HabitLog[]);

  const qAchieves = achieves.filter(a => a.quarter === qKey);
  const qBooks    = books.filter(b => b.status === 'finished' && b.finishedQuarter === qKey);
  const gymWeeks  = getGymWeeks(habitLogs);
  const maxGym    = Math.max(...gymWeeks, 1);

  const debtPct    = pct(finance.debtPaid ?? 0,    finance.debtTotal   ?? 0);
  const savingsPct = pct(finance.savedAmount ?? 0, finance.savingsGoal ?? 0);
  const netWorth   = (finance.savedAmount ?? 0) - ((finance.debtTotal ?? 0) - (finance.debtPaid ?? 0));

  // ── Goals
  const setGoals = (g: QuarterlyGoal[]) =>
    onChange(prev => {
      const s = ((prev.quarters ?? {}) as QStore);
      return { ...prev, quarters: { ...s, [qKey]: { ...s[qKey], goals: g } } };
    });

  const addGoal    = (cat: Category) => setGoals([...goals, { id: crypto.randomUUID(), text: '', category: cat, completed: false, weeklyBreakdown: {} }]);
  const goalField  = (id: string, text: string) => setGoals(goals.map(g => g.id === id ? { ...g, text } : g));
  const toggleGoal = (id: string) => setGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  const delGoal    = (id: string) => setGoals(goals.filter(g => g.id !== id));

  // ── Finance
  const setFinance = (updates: Partial<FinanceData>) =>
    onChange(prev => ({ ...prev, finance: { ...((prev.finance ?? {}) as FinanceData), ...updates } }));

  // ── Parking lot
  const addParking    = () => onChange(prev => ({ ...prev, parkingLot: [...parking, { id: crypto.randomUUID(), text: '', addedDate: new Date().toLocaleDateString('en-CA') }] }));
  const parkingField  = (id: string, text: string) => onChange(prev => ({ ...prev, parkingLot: parking.map(p => p.id === id ? { ...p, text } : p) }));
  const delParking    = (id: string) => onChange(prev => ({ ...prev, parkingLot: parking.filter(p => p.id !== id) }));

  // ── Achievements
  const addAchieve   = () => onChange(prev => ({ ...prev, achievements: [...achieves, { id: crypto.randomUUID(), text: '', date: new Date().toLocaleDateString('en-CA'), quarter: qKey }] }));
  const achieveField = (id: string, text: string) => onChange(prev => ({ ...prev, achievements: achieves.map(a => a.id === id ? { ...a, text } : a) }));
  const delAchieve   = (id: string) => onChange(prev => ({ ...prev, achievements: achieves.filter(a => a.id !== id) }));

  return (
    <section className="qv">

      {/* Quarter nav */}
      <div className="qv-topnav">
        <button className="wv-weeknav-btn" onClick={() => setQKey(k => shiftQuarter(k, -1))}>‹</button>
        <div className="qv-topnav-center">
          <span className="qv-topnav-key">{qKey}</span>
          <span className="qv-topnav-range">{quarterLabel(qKey)}</span>
        </div>
        <button className="wv-weeknav-btn" onClick={() => setQKey(k => shiftQuarter(k, 1))}>›</button>
      </div>

      {/* Top row: Gym chart + Finance */}
      <div className="qv-top-row">

        {/* Gym consistency chart */}
        <div className="qv-card">
          <div className="qv-section-label">GYM CONSISTENCY</div>
          <div className="qv-gym-sub">Last 13 weeks</div>
          <div className="qv-gym-chart">
            {gymWeeks.map((count, i) => (
              <div key={i} className="qv-gym-col">
                <div
                  className="qv-gym-bar"
                  style={{ height: `${Math.max(4, (count / maxGym) * 100)}%`, opacity: i === 12 ? 1 : 0.6 + (i / 12) * 0.4 }}
                />
              </div>
            ))}
          </div>
          <div className="qv-gym-axis">
            <span>13 weeks ago</span>
            <span>This week</span>
          </div>
        </div>

        {/* Finance tracker */}
        <div className="qv-card">
          <div className="qv-section-label">FINANCES — {qKey}</div>
          <div className="qv-finance-sub">Debt paydown &amp; savings progress</div>

          <div className="qv-finance-row">
            <span className="qv-finance-label">Debt Paid Off</span>
            <div className="qv-finance-nums">
              <span className="qv-finance-pct">{Math.round(debtPct)}% paid</span>
              <span className="qv-finance-rem">{$$(( finance.debtTotal ?? 0) - (finance.debtPaid ?? 0))} remaining</span>
            </div>
            <div className="qv-bar-track"><div className="qv-bar-fill qv-bar--green" style={{ width: `${debtPct}%` }} /></div>
          </div>

          <div className="qv-finance-inputs">
            <label className="qv-fi-field">
              <span>Paid off</span>
              <input type="number" min="0" className="qv-num-input" value={finance.debtPaid || ''} placeholder="0" onChange={e => setFinance({ debtPaid: numVal(e.target.value) })} />
            </label>
            <label className="qv-fi-field">
              <span>Total debt</span>
              <input type="number" min="0" className="qv-num-input" value={finance.debtTotal || ''} placeholder="0" onChange={e => setFinance({ debtTotal: numVal(e.target.value) })} />
            </label>
          </div>

          <div className="qv-finance-row" style={{ marginTop: '0.875rem' }}>
            <span className="qv-finance-label">Savings Progress</span>
            <div className="qv-finance-nums">
              <span className="qv-finance-pct">{Math.round(savingsPct)}% of goal</span>
              <span className="qv-finance-rem">{$$(finance.savingsGoal ?? 0)} goal</span>
            </div>
            <div className="qv-bar-track"><div className="qv-bar-fill qv-bar--accent" style={{ width: `${savingsPct}%` }} /></div>
          </div>

          <div className="qv-finance-inputs">
            <label className="qv-fi-field">
              <span>Saved</span>
              <input type="number" min="0" className="qv-num-input" value={finance.savedAmount || ''} placeholder="0" onChange={e => setFinance({ savedAmount: numVal(e.target.value) })} />
            </label>
            <label className="qv-fi-field">
              <span>Goal</span>
              <input type="number" min="0" className="qv-num-input" value={finance.savingsGoal || ''} placeholder="0" onChange={e => setFinance({ savingsGoal: numVal(e.target.value) })} />
            </label>
          </div>

          <div className="qv-networth">
            <span className="qv-networth-label">Net Worth (savings – debt)</span>
            <span className={`qv-networth-val${netWorth >= 0 ? ' qv-networth-val--pos' : ' qv-networth-val--neg'}`}>
              {$$(netWorth)}
            </span>
          </div>
        </div>
      </div>

      {/* Quarterly Goals — 4 columns */}
      <div className="qv-goals-4col">
        {CATEGORIES.map(cat => {
          const catGoals = goals.filter(g => g.category === cat);
          const done     = catGoals.filter(g => g.completed).length;
          return (
            <div key={cat} className="qv-card qv-goals-col">
              <div className="qv-goals-col-hd">
                <span className="qv-goals-col-title">{cat}</span>
                {catGoals.length > 0 && (
                  <span className="qv-goals-col-count">{done}/{catGoals.length}</span>
                )}
              </div>
              {catGoals.length === 0 && (
                <p className="qv-no-goals">No goals yet</p>
              )}
              <ul className="qv-col-list">
                {catGoals.map(goal => (
                  <li key={goal.id} className="qv-col-item">
                    <button
                      className={`wv-check${goal.completed ? ' wv-check--on' : ''}`}
                      onClick={() => toggleGoal(goal.id)}
                    >
                      {goal.completed && <Tick />}
                    </button>
                    <input
                      className={`qv-goal-input${goal.completed ? ' qv-goal-input--done' : ''}`}
                      value={goal.text}
                      placeholder="Add goal…"
                      onChange={e => goalField(goal.id, e.target.value)}
                    />
                    <button className="wv-del" onClick={() => delGoal(goal.id)}>×</button>
                  </li>
                ))}
              </ul>
              <button className="wv-ghost-add" onClick={() => addGoal(cat)}>+ Add goal</button>
            </div>
          );
        })}
      </div>

      {/* Bottom row: Wins | Books | Parking Lot */}
      <div className="qv-bottom-3">

        <div className="qv-card">
          <div className="qv-section-label">QUARTERLY WINS</div>
          <div className="qv-bottom-sub">{qKey} achievements</div>
          {qAchieves.length === 0 && (
            <p className="qv-no-goals">No wins logged yet — start celebrating your progress!</p>
          )}
          <ul className="qv-wins-list">
            {qAchieves.map(a => (
              <li key={a.id} className="qv-win-item">
                <span className="qv-win-star">★</span>
                <input
                  className="wv-item-input"
                  value={a.text}
                  placeholder="Log a win…"
                  onChange={e => achieveField(a.id, e.target.value)}
                />
                <button className="wv-del" onClick={() => delAchieve(a.id)}>×</button>
              </li>
            ))}
          </ul>
          <button className="wv-ghost-add" onClick={addAchieve}>+ Log a win</button>
        </div>

        <div className="qv-card">
          <div className="qv-section-label">BOOKS READ</div>
          <div className="qv-bottom-sub">{qKey} · {qBooks.length} {qBooks.length === 1 ? 'book' : 'books'}</div>
          {qBooks.length === 0 && (
            <p className="qv-no-goals">No books finished yet — mark one complete to see it here.</p>
          )}
          <ul className="qv-books-list">
            {qBooks.map(b => (
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
                  {b.finishedDate && <span className="bk-author">{b.finishedDate}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="qv-card">
          <div className="qv-section-label">IDEA PARKING LOT</div>
          <div className="qv-bottom-sub">Capture it now, act on it later</div>
          <input
            className="qv-parking-ghost"
            placeholder="Drop an idea…"
            onKeyDown={e => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                onChange(prev => ({
                  ...prev,
                  parkingLot: [...parking, { id: crypto.randomUUID(), text: e.currentTarget.value.trim(), addedDate: new Date().toLocaleDateString('en-CA') }],
                }));
                e.currentTarget.value = '';
              }
            }}
          />
          <ul className="qv-parking-list">
            {parking.map(item => (
              <li key={item.id} className="qv-parking-item">
                <span className="qv-parking-bullet">◦</span>
                <input
                  className="wv-item-input"
                  value={item.text}
                  placeholder="Idea…"
                  onChange={e => parkingField(item.id, e.target.value)}
                />
                <button className="wv-del" onClick={() => delParking(item.id)}>×</button>
              </li>
            ))}
          </ul>
          <p className="qv-parking-hint">Your idea parking lot</p>
        </div>

      </div>
    </section>
  );
}

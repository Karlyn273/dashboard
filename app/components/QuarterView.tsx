'use client';

import { useState } from 'react';

// ── Types ────────────────────────────────────────────────────────

type Category = 'Finance' | 'Health' | 'Business' | 'Personal';

interface QuarterlyGoal {
  id: string;
  text: string;
  category: Category;
  completed: boolean;
  weeklyBreakdown: Record<string, string>; // Monday YYYY-MM-DD → note text
}

interface CreditCard {
  id: string;
  name: string;
  currentBalance: number;
  originalBalance: number;
  creditLimit: number;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
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

interface QuarterData  { goals?: QuarterlyGoal[]; }
interface FinanceData  { cards?: CreditCard[]; savingsGoals?: SavingsGoal[]; }

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

function getQuarterWeeks(quarterKey: string): WeekEntry[] {
  const [yearStr, qStr] = quarterKey.split('-Q');
  const year       = parseInt(yearStr);
  const q          = parseInt(qStr);
  const startMonth = (q - 1) * 3;

  const qStart = new Date(year, startMonth, 1);
  const qEnd   = new Date(year, startMonth + 3, 0); // last day of quarter

  // First Monday on or after qStart
  const first = new Date(qStart);
  const skip  = (8 - first.getDay()) % 7; // 0 if already Monday
  if (skip) first.setDate(first.getDate() + skip);

  const entries: WeekEntry[] = [];
  let cur = new Date(first);
  let n   = 1;
  while (cur <= qEnd) {
    entries.push({
      key:   cur.toLocaleDateString('en-CA'),
      label: `Wk ${n} · ${cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    });
    cur = new Date(cur);
    cur.setDate(cur.getDate() + 7);
    n++;
  }
  return entries;
}

// ── Utility ──────────────────────────────────────────────────────

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

function $$(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

function numVal(s: string): number { return parseFloat(s) || 0; }

// ── Icons ────────────────────────────────────────────────────────

function Tick() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M2 6.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────

export default function QuarterView({ data, onChange }: Props) {
  const [qKey,    setQKey]    = useState(currentQuarterKey);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const qWeeks = getQuarterWeeks(qKey);

  type QStore = Record<string, QuarterData>;
  const qStore   = ((data.quarters   ?? {}) as QStore);
  const quarter  = qStore[qKey] ?? {} as QuarterData;
  const goals    = quarter.goals ?? [];

  const finance  = ((data.finance    ?? {}) as FinanceData);
  const cards    = finance.cards        ?? [];
  const savings  = finance.savingsGoals ?? [];
  const parking  = ((data.parkingLot  ?? []) as ParkingItem[]);
  const achieves = ((data.achievements ?? []) as Achievement[]);

  const qAchieves = achieves.filter(a => a.quarter === qKey);

  // ── Quarter goals ─────────────────────────────────────────────

  const setQGoals = (goals: QuarterlyGoal[]) =>
    onChange(prev => {
      const s = ((prev.quarters ?? {}) as QStore);
      return { ...prev, quarters: { ...s, [qKey]: { ...s[qKey], goals } } };
    });

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

  const setWeekNote = (goalId: string, weekKey: string, text: string) =>
    setQGoals(goals.map(g =>
      g.id === goalId
        ? { ...g, weeklyBreakdown: { ...g.weeklyBreakdown, [weekKey]: text } }
        : g,
    ));

  const toggleExpand = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // ── Finance ───────────────────────────────────────────────────

  const setFinance = (updates: Partial<FinanceData>) =>
    onChange(prev => ({
      ...prev,
      finance: { ...((prev.finance ?? {}) as FinanceData), ...updates },
    }));

  const addCard = () =>
    setFinance({ cards: [...cards, { id: crypto.randomUUID(), name: '', currentBalance: 0, originalBalance: 0, creditLimit: 0 }] });

  const cardField = (id: string, field: keyof CreditCard, val: string | number) =>
    setFinance({ cards: cards.map(c => c.id === id ? { ...c, [field]: val } : c) });

  const delCard = (id: string) =>
    setFinance({ cards: cards.filter(c => c.id !== id) });

  const addSavings = () =>
    setFinance({ savingsGoals: [...savings, { id: crypto.randomUUID(), name: '', targetAmount: 0, currentAmount: 0 }] });

  const savingsField = (id: string, field: keyof SavingsGoal, val: string | number) =>
    setFinance({ savingsGoals: savings.map(s => s.id === id ? { ...s, [field]: val } : s) });

  const delSavings = (id: string) =>
    setFinance({ savingsGoals: savings.filter(s => s.id !== id) });

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
                      <button
                        className={`qv-expand-btn${expanded[goal.id] ? ' qv-expand-btn--open' : ''}`}
                        onClick={() => toggleExpand(goal.id)}
                        aria-label="Toggle weekly breakdown"
                      >
                        <ChevronDown />
                      </button>
                      <button className="wv-del" onClick={() => delGoal(goal.id)} aria-label="Remove">×</button>
                    </div>

                    {/* Weekly breakdown panel */}
                    {expanded[goal.id] && (
                      <div className="qv-breakdown">
                        <p className="qv-breakdown-hd">Week-by-week breakdown</p>
                        <ul className="qv-week-list">
                          {qWeeks.map(({ key, label }) => (
                            <li key={key} className="qv-week-row">
                              <span className="qv-week-lbl">{label}</span>
                              <input
                                className="qv-week-input"
                                value={goal.weeklyBreakdown?.[key] ?? ''}
                                placeholder="Action or milestone…"
                                onChange={e => setWeekNote(goal.id, key, e.target.value)}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <button className="wv-add" onClick={() => addGoal(cat)}>+ Add goal</button>
            </div>
          );
        })}
      </div>

      {/* ── Finance tracker ── */}
      <div className="qv-card">
        <h2 className="qv-section-hd">Finance Tracker</h2>

        {/* Credit cards */}
        <h3 className="qv-sub-hd">Credit Cards</h3>
        {cards.length === 0 && <p className="qv-empty">No cards added yet.</p>}
        <ul className="qv-finance-list">
          {cards.map(card => {
            const payoffPct = pct(card.originalBalance - card.currentBalance, card.originalBalance);
            const utilPct   = pct(card.currentBalance, card.creditLimit);
            return (
              <li key={card.id} className="qv-cc-item">
                <div className="qv-cc-header">
                  <input
                    className="qv-cc-name"
                    value={card.name}
                    placeholder="Card name"
                    onChange={e => cardField(card.id, 'name', e.target.value)}
                  />
                  <button className="wv-del" onClick={() => delCard(card.id)} aria-label="Remove card">×</button>
                </div>
                <div className="qv-num-grid">
                  <label className="qv-num-field">
                    <span>Current balance</span>
                    <input
                      type="number" min="0" step="1"
                      className="qv-num-input"
                      value={card.currentBalance  || ''}
                      placeholder="0"
                      onChange={e => cardField(card.id, 'currentBalance',  numVal(e.target.value))}
                    />
                  </label>
                  <label className="qv-num-field">
                    <span>Original balance</span>
                    <input
                      type="number" min="0" step="1"
                      className="qv-num-input"
                      value={card.originalBalance || ''}
                      placeholder="0"
                      onChange={e => cardField(card.id, 'originalBalance', numVal(e.target.value))}
                    />
                  </label>
                  <label className="qv-num-field">
                    <span>Credit limit</span>
                    <input
                      type="number" min="0" step="1"
                      className="qv-num-input"
                      value={card.creditLimit     || ''}
                      placeholder="0"
                      onChange={e => cardField(card.id, 'creditLimit',     numVal(e.target.value))}
                    />
                  </label>
                </div>
                <div className="qv-bars">
                  <div className="qv-bar-row">
                    <span className="qv-bar-lbl">Payoff progress</span>
                    <span className="qv-bar-pct">{Math.round(payoffPct)}%</span>
                  </div>
                  <div className="qv-bar-track">
                    <div className="qv-bar-fill qv-bar--green" style={{ width: `${payoffPct}%` }} />
                  </div>
                  <p className="qv-bar-note">
                    {$$(card.originalBalance - card.currentBalance)} paid · {$$(card.currentBalance)} remaining
                  </p>

                  <div className="qv-bar-row" style={{ marginTop: '0.625rem' }}>
                    <span className="qv-bar-lbl">Utilization</span>
                    <span className="qv-bar-pct">{Math.round(utilPct)}%</span>
                  </div>
                  <div className="qv-bar-track">
                    <div
                      className={`qv-bar-fill ${utilPct > 30 ? 'qv-bar--amber' : 'qv-bar--green'}`}
                      style={{ width: `${utilPct}%` }}
                    />
                  </div>
                  <p className="qv-bar-note">{$$(card.currentBalance)} of {$$(card.creditLimit)} limit</p>
                </div>
              </li>
            );
          })}
        </ul>
        <button className="wv-add" onClick={addCard}>+ Add card</button>

        {/* Savings goals */}
        <h3 className="qv-sub-hd qv-sub-hd--spaced">Savings Goals</h3>
        {savings.length === 0 && <p className="qv-empty">No savings goals added yet.</p>}
        <ul className="qv-finance-list">
          {savings.map(sg => {
            const savePct = pct(sg.currentAmount, sg.targetAmount);
            return (
              <li key={sg.id} className="qv-cc-item">
                <div className="qv-cc-header">
                  <input
                    className="qv-cc-name"
                    value={sg.name}
                    placeholder="Goal name"
                    onChange={e => savingsField(sg.id, 'name', e.target.value)}
                  />
                  <button className="wv-del" onClick={() => delSavings(sg.id)} aria-label="Remove">×</button>
                </div>
                <div className="qv-num-grid">
                  <label className="qv-num-field">
                    <span>Saved so far</span>
                    <input
                      type="number" min="0" step="1"
                      className="qv-num-input"
                      value={sg.currentAmount || ''}
                      placeholder="0"
                      onChange={e => savingsField(sg.id, 'currentAmount', numVal(e.target.value))}
                    />
                  </label>
                  <label className="qv-num-field">
                    <span>Target amount</span>
                    <input
                      type="number" min="0" step="1"
                      className="qv-num-input"
                      value={sg.targetAmount || ''}
                      placeholder="0"
                      onChange={e => savingsField(sg.id, 'targetAmount', numVal(e.target.value))}
                    />
                  </label>
                </div>
                <div className="qv-bar-row">
                  <span className="qv-bar-lbl">Progress</span>
                  <span className="qv-bar-pct">{Math.round(savePct)}%</span>
                </div>
                <div className="qv-bar-track">
                  <div className="qv-bar-fill qv-bar--accent" style={{ width: `${savePct}%` }} />
                </div>
                <p className="qv-bar-note">{$$(sg.currentAmount)} of {$$(sg.targetAmount)}</p>
              </li>
            );
          })}
        </ul>
        <button className="wv-add" onClick={addSavings}>+ Add savings goal</button>
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
    </section>
  );
}

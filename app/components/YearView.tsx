'use client';

import { useState } from 'react';

// ── Types ────────────────────────────────────────────────────────

type Category = 'Finance' | 'Health' | 'Business' | 'Personal';

interface IntentionBucket {
  id:      string;
  label:   string;
  content: string;
}

interface YearlyGoal {
  id:        string;
  text:      string;
  category:  Category;
  completed: boolean;
}

interface YearData {
  vision?:          string;
  nonNegotiables?:  string;
  mainFocus?:       string;
  doDifferently?:   string;
  buckets?:         IntentionBucket[];
  goals?:           YearlyGoal[];
}

interface Props {
  data:     Record<string, unknown>;
  onChange: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
}

// ── Constants ────────────────────────────────────────────────────

const CATEGORIES: Category[] = ['Finance', 'Health', 'Business', 'Personal'];

const CAT_COLOR: Record<Category, string> = {
  Finance:  '#22c55e',
  Health:   '#3b82f6',
  Business: '#6366f1',
  Personal: '#f43f5e',
};

const PROMPTS: Array<{
  key:         'vision' | 'nonNegotiables' | 'mainFocus' | 'doDifferently';
  label:       string;
  placeholder: string;
}> = [
  {
    key:         'vision',
    label:       'My Vision for This Year',
    placeholder: 'What does your best year look like? Who are you becoming?',
  },
  {
    key:         'nonNegotiables',
    label:       'My Non-Negotiables',
    placeholder: 'What will you protect no matter what?',
  },
  {
    key:         'mainFocus',
    label:       'My Main Focus',
    placeholder: 'If only one thing mattered this year, what would it be?',
  },
  {
    key:         'doDifferently',
    label:       'What I Want to Do Differently',
    placeholder: 'What patterns are you ready to leave behind?',
  },
];

// ── Icons ────────────────────────────────────────────────────────

function Tick() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M2 6.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────

export default function YearView({ data, onChange }: Props) {
  const [year,     setYear]     = useState(() => new Date().getFullYear());
  const [expanded, setExpanded] = useState<Record<Category, boolean>>({
    Finance: true, Health: true, Business: true, Personal: true,
  });

  const yearKey  = String(year);
  type YStore    = Record<string, YearData>;
  const store    = (data.years ?? {}) as YStore;
  const yearData = store[yearKey] ?? {} as YearData;
  const buckets  = yearData.buckets ?? [];
  const goals    = yearData.goals   ?? [];

  const setYearData = (updates: Partial<YearData>) =>
    onChange(prev => {
      const s = (prev.years ?? {}) as YStore;
      return { ...prev, years: { ...s, [yearKey]: { ...s[yearKey], ...updates } } };
    });

  // ── Reflection fields ─────────────────────────────────────────

  const setField = (key: keyof YearData, value: string) =>
    setYearData({ [key]: value });

  // ── Bucket handlers ───────────────────────────────────────────

  const addBucket = () =>
    setYearData({ buckets: [...buckets, { id: crypto.randomUUID(), label: '', content: '' }] });

  const bucketLabel = (id: string, label: string) =>
    setYearData({ buckets: buckets.map(b => b.id === id ? { ...b, label } : b) });

  const bucketContent = (id: string, content: string) =>
    setYearData({ buckets: buckets.map(b => b.id === id ? { ...b, content } : b) });

  const delBucket = (id: string) =>
    setYearData({ buckets: buckets.filter(b => b.id !== id) });

  // ── Goal handlers ─────────────────────────────────────────────

  const addGoal = (cat: Category) =>
    setYearData({ goals: [...goals, { id: crypto.randomUUID(), text: '', category: cat, completed: false }] });

  const goalText = (id: string, text: string) =>
    setYearData({ goals: goals.map(g => g.id === id ? { ...g, text } : g) });

  const toggleGoal = (id: string) =>
    setYearData({ goals: goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g) });

  const delGoal = (id: string) =>
    setYearData({ goals: goals.filter(g => g.id !== id) });

  const toggleExpand = (cat: Category) =>
    setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));

  // ── Render ────────────────────────────────────────────────────

  return (
    <section className="yv">

      {/* ── Year navigation ── */}
      <div className="yv-nav">
        <button className="wv-nav-btn" onClick={() => setYear(y => y - 1)} aria-label="Previous year">←</button>
        <span className="yv-year">{year}</span>
        <button className="wv-nav-btn" onClick={() => setYear(y => y + 1)} aria-label="Next year">→</button>
      </div>

      {/* ── Manifesto ── */}
      <div className="yv-manifesto">
        <h2 className="yv-manifesto-hd">
          <span className="yv-hd-mark" aria-hidden="true">✦</span>
          My {year} Manifesto
        </h2>
        <div className="yv-prompts-grid">
          {PROMPTS.map(p => (
            <div key={p.key} className="yv-prompt-card">
              <span className="yv-prompt-label">{p.label}</span>
              <textarea
                className="yv-prompt-ta"
                placeholder={p.placeholder}
                value={(yearData[p.key] as string | undefined) ?? ''}
                onChange={e => setField(p.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Intention Buckets ── */}
      <div className="yv-buckets-section">
        <div className="yv-section-toprow">
          <h2 className="yv-section-hd">
            <span className="yv-hd-mark" aria-hidden="true">◈</span>
            Intention Buckets
          </h2>
          <button className="yv-outline-btn" onClick={addBucket}>+ Add bucket</button>
        </div>
        {buckets.length === 0 ? (
          <p className="yv-section-empty">
            Intention buckets help you name the areas you're tending this year — relationships, growth, joy, creativity, spirit. Add one to begin.
          </p>
        ) : (
          <div className="yv-buckets-grid">
            {buckets.map(b => (
              <div key={b.id} className="yv-bucket-card">
                <div className="yv-bucket-hd">
                  <input
                    className="yv-bucket-title"
                    value={b.label}
                    placeholder="Name this bucket…"
                    onChange={e => bucketLabel(b.id, e.target.value)}
                  />
                  <button className="yv-del" onClick={() => delBucket(b.id)} aria-label="Delete bucket">×</button>
                </div>
                <textarea
                  className="yv-bucket-ta"
                  placeholder="What does this area mean to you? What intentions do you hold here?"
                  value={b.content}
                  onChange={e => bucketContent(b.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Yearly Goals ── */}
      <div className="yv-goals-section">
        <h2 className="yv-section-hd">
          <span className="yv-hd-mark" aria-hidden="true">◎</span>
          Yearly Goals
        </h2>
        <div className="yv-goals-list">
          {CATEGORIES.map(cat => {
            const catGoals  = goals.filter(g => g.category === cat);
            const doneCount = catGoals.filter(g => g.completed).length;
            const open      = expanded[cat];
            return (
              <div
                key={cat}
                className="yv-cat-card"
                style={{ borderLeftColor: CAT_COLOR[cat] }}
              >
                <button
                  className="yv-cat-toggle"
                  onClick={() => toggleExpand(cat)}
                  aria-expanded={open}
                >
                  <span className="yv-cat-dot" style={{ background: CAT_COLOR[cat] }} />
                  <span className="yv-cat-name">{cat}</span>
                  <span className="yv-cat-tally">{doneCount} / {catGoals.length}</span>
                  <span className={`yv-chevron${open ? ' yv-chevron--open' : ''}`}>
                    <Chevron />
                  </span>
                </button>

                {open && (
                  <div className="yv-cat-body">
                    {catGoals.length === 0 && (
                      <p className="yv-goal-empty">No {cat.toLowerCase()} goals yet.</p>
                    )}
                    <ul className="yv-goal-list">
                      {catGoals.map(g => (
                        <li key={g.id} className="yv-goal-row">
                          <button
                            className={`yv-check${g.completed ? ' yv-check--on' : ''}`}
                            style={g.completed
                              ? { background: CAT_COLOR[cat], borderColor: CAT_COLOR[cat] }
                              : {}}
                            onClick={() => toggleGoal(g.id)}
                            aria-label={g.completed ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {g.completed && <Tick />}
                          </button>
                          <input
                            className={`yv-goal-input${g.completed ? ' yv-goal-input--done' : ''}`}
                            value={g.text}
                            placeholder="Goal for the year…"
                            onChange={e => goalText(g.id, e.target.value)}
                          />
                          <button className="yv-del" onClick={() => delGoal(g.id)} aria-label="Remove goal">×</button>
                        </li>
                      ))}
                    </ul>
                    <button className="yv-add" onClick={() => addGoal(cat)}>+ Add goal</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}

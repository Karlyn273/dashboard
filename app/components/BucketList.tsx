'use client';

import { useState } from 'react';

// ── Types ────────────────────────────────────────────────────────

type Category = 'Travel' | 'Experience' | 'Career' | 'Personal' | 'Health' | 'Creative' | 'Financial';

interface BucketItem {
  id:             string;
  text:           string;
  category:       Category;
  completed:      boolean;
  completedDate?: string;
  createdDate:    string;
}

interface Props {
  data:     Record<string, unknown>;
  onChange: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
}

// ── Constants ────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  'Travel', 'Experience', 'Career', 'Personal', 'Health', 'Creative', 'Financial',
];

const CAT_COLOR: Record<Category, string> = {
  Travel:     '#06b6d4',
  Experience: '#f59e0b',
  Career:     '#6366f1',
  Personal:   '#ec4899',
  Health:     '#22c55e',
  Creative:   '#f97316',
  Financial:  '#10b981',
};

// ── Icons ────────────────────────────────────────────────────────

function Tick() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M2 6.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────

export default function BucketList({ data, onChange }: Props) {
  const [filter,  setFilter]  = useState<Category | 'All'>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [addText, setAddText] = useState('');
  const [addCat,  setAddCat]  = useState<Category>('Travel');

  const items = (data.bucketList ?? []) as BucketItem[];

  const total     = items.length;
  const doneCount = items.filter(i => i.completed).length;
  const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const filtered = filter === 'All' ? items : items.filter(i => i.category === filter);
  const sorted   = [
    ...filtered.filter(i => !i.completed),
    ...filtered.filter(i =>  i.completed),
  ];

  // ── Handlers ──────────────────────────────────────────────────

  const setItems = (updater: (prev: BucketItem[]) => BucketItem[]) =>
    onChange(prev => ({
      ...prev,
      bucketList: updater((prev.bucketList ?? []) as BucketItem[]),
    }));

  const toggleItem = (id: string) =>
    setItems(prev => prev.map(item =>
      item.id === id
        ? {
            ...item,
            completed:     !item.completed,
            completedDate: !item.completed
              ? new Date().toLocaleDateString('en-CA')
              : undefined,
          }
        : item,
    ));

  const updateText = (id: string, text: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, text } : i));

  const deleteItem = (id: string) =>
    setItems(prev => prev.filter(i => i.id !== id));

  const addItem = () => {
    const t = addText.trim();
    if (!t) return;
    setItems(prev => [
      ...prev,
      {
        id:          crypto.randomUUID(),
        text:        t,
        category:    addCat,
        completed:   false,
        createdDate: new Date().toLocaleDateString('en-CA'),
      },
    ]);
    setAddText('');
    setShowAdd(false);
  };

  const openAdd = () => {
    if (filter !== 'All') setAddCat(filter);
    setShowAdd(true);
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <section className="bl">

      {/* ── Progress header ── */}
      <div className="bl-header">
        <div className="bl-stat">
          <span className="bl-stat-num">{doneCount}</span>
          <span className="bl-stat-sep"> / </span>
          <span className="bl-stat-total">{total}</span>
          <span className="bl-stat-label">completed</span>
        </div>
        <div className="bl-progress-wrap">
          <div className="bl-progress-track">
            <div className="bl-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="bl-pct">{pct}%</span>
        </div>
      </div>

      {/* ── Category filter chips ── */}
      <div className="bl-filters" role="group" aria-label="Filter by category">
        <button
          className={`bl-chip${filter === 'All' ? ' bl-chip--on' : ''}`}
          onClick={() => setFilter('All')}
        >
          All
          <span className="bl-chip-count">{total}</span>
        </button>
        {CATEGORIES.map(cat => {
          const count = items.filter(i => i.category === cat).length;
          const on    = filter === cat;
          return (
            <button
              key={cat}
              className={`bl-chip${on ? ' bl-chip--on' : ''}`}
              style={on ? {
                background:  `color-mix(in srgb, ${CAT_COLOR[cat]} 14%, transparent)`,
                borderColor:  CAT_COLOR[cat],
                color:        CAT_COLOR[cat],
              } : {}}
              onClick={() => setFilter(cat)}
            >
              <span className="bl-chip-dot" style={{ background: CAT_COLOR[cat] }} />
              {cat}
              <span className="bl-chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Item list ── */}
      {sorted.length === 0 ? (
        <div className="bl-empty">
          {filter === 'All'
            ? 'No bucket list items yet — add your first below.'
            : `No ${filter.toLowerCase()} items yet.`}
        </div>
      ) : (
        <ul className="bl-list">
          {sorted.map(item => (
            <li
              key={item.id}
              className={`bl-item${item.completed ? ' bl-item--done' : ''}`}
            >
              <button
                className={`bl-check${item.completed ? ' bl-check--on' : ''}`}
                style={item.completed
                  ? { background: CAT_COLOR[item.category], borderColor: CAT_COLOR[item.category] }
                  : {}}
                onClick={() => toggleItem(item.id)}
                aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {item.completed && <Tick />}
              </button>

              <div className="bl-item-body">
                <input
                  className={`bl-item-input${item.completed ? ' bl-item-input--done' : ''}`}
                  value={item.text}
                  placeholder="Bucket list item…"
                  onChange={e => updateText(item.id, e.target.value)}
                />
                <div className="bl-item-meta">
                  <span
                    className="bl-badge"
                    style={{
                      background:  `color-mix(in srgb, ${CAT_COLOR[item.category]} 12%, transparent)`,
                      color:        CAT_COLOR[item.category],
                      borderColor: `color-mix(in srgb, ${CAT_COLOR[item.category]} 30%, transparent)`,
                    }}
                  >
                    {item.category}
                  </span>
                  {item.completed && item.completedDate && (
                    <span className="bl-done-date">✓ {item.completedDate}</span>
                  )}
                </div>
              </div>

              <button
                className="wv-del"
                onClick={() => deleteItem(item.id)}
                aria-label="Delete item"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Add form ── */}
      {showAdd ? (
        <div className="bl-form">
          <input
            className="bl-form-input"
            autoFocus
            placeholder="What do you want to do before you die?"
            value={addText}
            onChange={e => setAddText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  addItem();
              if (e.key === 'Escape') { setShowAdd(false); setAddText(''); }
            }}
          />
          <div className="bl-form-cats">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`bl-cat-btn${addCat === cat ? ' bl-cat-btn--on' : ''}`}
                style={addCat === cat ? {
                  background:  `color-mix(in srgb, ${CAT_COLOR[cat]} 15%, transparent)`,
                  borderColor:  CAT_COLOR[cat],
                  color:        CAT_COLOR[cat],
                } : {}}
                onClick={() => setAddCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="bl-form-actions">
            <button
              className="bl-btn-cancel"
              onClick={() => { setShowAdd(false); setAddText(''); }}
            >
              Cancel
            </button>
            <button className="bl-btn-add" onClick={addItem}>Add to List</button>
          </div>
        </div>
      ) : (
        <button className="wv-add" onClick={openAdd}>+ Add item</button>
      )}

    </section>
  );
}

'use client';

import { useState } from 'react';

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

const CAT_EMOJI: Record<Category, string> = {
  Travel:     '✈️',
  Experience: '🌟',
  Career:     '💼',
  Personal:   '💫',
  Health:     '🫀',
  Creative:   '🎨',
  Financial:  '💰',
};

function Tick() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M2 6.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BucketList({ data, onChange }: Props) {
  const [filter,  setFilter]  = useState<Category | 'All'>('All');
  const [addText, setAddText] = useState('');
  const [addCat,  setAddCat]  = useState<Category>('Travel');
  const [adding,  setAdding]  = useState(false);

  const items = (data.bucketList ?? []) as BucketItem[];

  const doneCount = items.filter(i => i.completed).length;
  const pct       = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  const filtered = filter === 'All' ? items : items.filter(i => i.category === filter);
  const sorted   = [
    ...filtered.filter(i => !i.completed),
    ...filtered.filter(i =>  i.completed),
  ];

  const setItems = (updater: (prev: BucketItem[]) => BucketItem[]) =>
    onChange(prev => ({ ...prev, bucketList: updater((prev.bucketList ?? []) as BucketItem[]) }));

  const toggleItem = (id: string) =>
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, completed: !item.completed, completedDate: !item.completed ? new Date().toLocaleDateString('en-CA') : undefined }
        : item,
    ));

  const updateText = (id: string, text: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, text } : i));

  const deleteItem = (id: string) =>
    setItems(prev => prev.filter(i => i.id !== id));

  const addItem = () => {
    const t = addText.trim();
    if (!t) return;
    setItems(prev => [...prev, {
      id: crypto.randomUUID(), text: t, category: addCat,
      completed: false, createdDate: new Date().toLocaleDateString('en-CA'),
    }]);
    setAddText('');
    setAdding(false);
  };

  return (
    <section className="bl">

      {/* Header */}
      <div className="bl-header-card">
        <div className="bl-header-left">
          <h2 className="bl-title">Bucket List</h2>
          <p className="bl-subtitle">Things to do, see, and become before you die</p>
          {items.length > 0 && (
            <>
              <div className="bl-progress-track">
                <div className="bl-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <p className="bl-progress-text">{doneCount} of {items.length} complete · {pct}%</p>
            </>
          )}
        </div>
        <button className="bl-add-btn" onClick={() => setAdding(true)}>+ Add Item</button>
      </div>

      {/* Category filter chips */}
      <div className="bl-filters">
        <button
          className={`bl-chip${filter === 'All' ? ' bl-chip--on' : ''}`}
          onClick={() => setFilter('All')}
        >
          All <span className="bl-chip-count">{items.length}</span>
        </button>
        {CATEGORIES.map(cat => {
          const count = items.filter(i => i.category === cat).length;
          const on    = filter === cat;
          return (
            <button
              key={cat}
              className={`bl-chip${on ? ' bl-chip--on' : ''}`}
              style={on ? { background: `color-mix(in srgb, ${CAT_COLOR[cat]} 14%, transparent)`, borderColor: CAT_COLOR[cat], color: CAT_COLOR[cat] } : {}}
              onClick={() => setFilter(cat)}
            >
              {CAT_EMOJI[cat]} {cat}
              <span className="bl-chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Add form */}
      {adding && (
        <div className="bl-form">
          <input
            className="bl-form-input"
            autoFocus
            placeholder="What do you want to do, see, or experience?"
            value={addText}
            onChange={e => setAddText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  addItem();
              if (e.key === 'Escape') { setAdding(false); setAddText(''); }
            }}
          />
          <div className="bl-form-cats">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`bl-cat-btn${addCat === cat ? ' bl-cat-btn--on' : ''}`}
                style={addCat === cat ? { background: `color-mix(in srgb, ${CAT_COLOR[cat]} 15%, transparent)`, borderColor: CAT_COLOR[cat], color: CAT_COLOR[cat] } : {}}
                onClick={() => setAddCat(cat)}
              >
                {CAT_EMOJI[cat]} {cat}
              </button>
            ))}
          </div>
          <div className="bl-form-actions">
            <button className="bl-btn-cancel" onClick={() => { setAdding(false); setAddText(''); }}>Cancel</button>
            <button className="bl-btn-add" onClick={addItem} disabled={!addText.trim()}>Add to List</button>
          </div>
        </div>
      )}

      {/* Items */}
      {sorted.length === 0 ? (
        <div className="bl-empty">
          {filter === 'All'
            ? 'No bucket list items yet — add your first above!'
            : `No ${filter.toLowerCase()} items yet.`}
        </div>
      ) : (
        <div className="bl-grid">
          {sorted.map(item => (
            <div
              key={item.id}
              className={`bl-item-card${item.completed ? ' bl-item-card--done' : ''}`}
              style={{ borderTopColor: CAT_COLOR[item.category] }}
            >
              <div className="bl-item-top">
                <button
                  className={`bl-check${item.completed ? ' bl-check--on' : ''}`}
                  style={item.completed ? { background: CAT_COLOR[item.category], borderColor: CAT_COLOR[item.category] } : {}}
                  onClick={() => toggleItem(item.id)}
                >
                  {item.completed && <Tick />}
                </button>
                <button className="bl-del" onClick={() => deleteItem(item.id)}>×</button>
              </div>
              <input
                className={`bl-item-input${item.completed ? ' bl-item-input--done' : ''}`}
                value={item.text}
                placeholder="Bucket list item…"
                onChange={e => updateText(item.id, e.target.value)}
              />
              <div className="bl-item-foot">
                <span
                  className="bl-badge"
                  style={{ background: `color-mix(in srgb, ${CAT_COLOR[item.category]} 12%, transparent)`, color: CAT_COLOR[item.category], borderColor: `color-mix(in srgb, ${CAT_COLOR[item.category]} 30%, transparent)` }}
                >
                  {CAT_EMOJI[item.category]} {item.category}
                </span>
                {item.completed && item.completedDate && (
                  <span className="bl-done-date">✓ {item.completedDate}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </section>
  );
}

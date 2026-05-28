'use client';

import { useState } from 'react';

interface IntentionBucket {
  id:      string;
  label:   string;
  items:   string[];
}

interface YearData {
  vision?:         string;
  nonNegotiables?: string;
  focus?:          string;
  change?:         string;
  buckets?:        IntentionBucket[];
}

interface Props {
  data:     Record<string, unknown>;
  onChange: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
}

const QUESTIONS: Array<{
  key:     keyof Pick<YearData, 'vision' | 'nonNegotiables' | 'focus' | 'change'>;
  icon:    string;
  title:   string;
  guide:   string;
  placeholder: string;
}> = [
  {
    key:         'vision',
    icon:        '+',
    title:       'What is my life vision?',
    guide:       'Imagine your life 5–10 years from now at its best. What do you see? Who are you? What matters most?',
    placeholder: 'Write your answer…',
  },
  {
    key:         'nonNegotiables',
    icon:        '•',
    title:       'What are my non-negotiables?',
    guide:       'These are the values, boundaries, and commitments you will protect no matter what this year.',
    placeholder: 'Write your answer…',
  },
  {
    key:         'focus',
    icon:        '○',
    title:       'What do I want to focus on?',
    guide:       'If you could only pour energy into one or two areas this year, what would produce the most meaning and growth?',
    placeholder: 'Write your answer…',
  },
  {
    key:         'change',
    icon:        '→',
    title:       'What do I want to change?',
    guide:       'What patterns, habits, or beliefs are you ready to leave behind? What does the next version of you look like?',
    placeholder: 'Write your answer…',
  },
];

export default function YearView({ data, onChange }: Props) {
  const [year,         setYear]         = useState(() => new Date().getFullYear());
  const [openGuides,   setOpenGuides]   = useState<Record<string, boolean>>({});

  const yearKey  = String(year);
  type YStore    = Record<string, YearData>;
  const store    = (data.years ?? {}) as YStore;
  const yearData = store[yearKey] ?? {} as YearData;
  const buckets  = yearData.buckets ?? [];

  const setYearData = (updates: Partial<YearData>) =>
    onChange(prev => {
      const s = (prev.years ?? {}) as YStore;
      return { ...prev, years: { ...s, [yearKey]: { ...s[yearKey], ...updates } } };
    });

  const setField = (key: keyof YearData, value: string) => setYearData({ [key]: value });

  const toggleGuide = (key: string) =>
    setOpenGuides(prev => ({ ...prev, [key]: !prev[key] }));

  // Bucket handlers
  const addBucket = () =>
    setYearData({ buckets: [...buckets, { id: crypto.randomUUID(), label: '', items: [''] }] });

  const bucketLabel = (id: string, label: string) =>
    setYearData({ buckets: buckets.map(b => b.id === id ? { ...b, label } : b) });

  const bucketItem = (id: string, idx: number, text: string) =>
    setYearData({
      buckets: buckets.map(b =>
        b.id === id ? { ...b, items: b.items.map((it, i) => i === idx ? text : it) } : b,
      ),
    });

  const addBucketItem = (id: string) =>
    setYearData({ buckets: buckets.map(b => b.id === id ? { ...b, items: [...b.items, ''] } : b) });

  const delBucket = (id: string) =>
    setYearData({ buckets: buckets.filter(b => b.id !== id) });

  return (
    <section className="yv">

      {/* Year nav + heading */}
      <div className="yv-heading-row">
        <div>
          <div className="yv-nav">
            <button className="wv-weeknav-btn" onClick={() => setYear(y => y - 1)}>‹</button>
            <span className="yv-year-title">{year} — Your Year</span>
            <button className="wv-weeknav-btn" onClick={() => setYear(y => y + 1)}>›</button>
          </div>
          <p className="yv-subtitle">Answer these four questions to set the foundation for your year.</p>
        </div>
      </div>

      {/* Four question cards — 2×2 grid */}
      <div className="yv-questions-grid">
        {QUESTIONS.map(q => (
          <div key={q.key} className="yv-q-card">
            <div className="yv-q-type-row">
              <span className="yv-q-icon">{q.icon}</span>
              <span className="yv-q-type">{q.key === 'vision' ? 'LIFE VISION' : q.key === 'nonNegotiables' ? 'NON-NEGOTIABLES' : q.key === 'focus' ? 'FOCUS' : 'CHANGE'}</span>
            </div>
            <p className="yv-q-title">{q.title}</p>
            <button className="yv-guide-toggle" onClick={() => toggleGuide(q.key)}>
              {openGuides[q.key] ? '↑ Hide guide' : '↓ Show guide'}
            </button>
            {openGuides[q.key] && (
              <p className="yv-guide-text">{q.guide}</p>
            )}
            <textarea
              className="yv-q-ta"
              placeholder={q.placeholder}
              value={(yearData[q.key] as string | undefined) ?? ''}
              onChange={e => setField(q.key, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Focus Buckets */}
      <div className="yv-buckets-section">
        <div className="yv-buckets-header">
          <div>
            <h2 className="yv-buckets-title">Focus Buckets</h2>
            <p className="yv-buckets-sub">Group your intentions, life themes — areas of life you&rsquo;re actively investing in this year</p>
          </div>
          <button className="yv-new-bucket-btn" onClick={addBucket}>+ New Bucket</button>
        </div>

        {buckets.length === 0 ? (
          <p className="yv-empty">Add a bucket to start grouping your intentions for the year.</p>
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
                  <button className="yv-del" onClick={() => delBucket(b.id)}>×</button>
                </div>
                <ul className="yv-bucket-items">
                  {b.items.map((item, idx) => (
                    <li key={idx} className="yv-bucket-item">
                      <span className="yv-bucket-bullet">·</span>
                      <input
                        className="yv-bucket-item-input"
                        value={item}
                        placeholder="Add item…"
                        onChange={e => bucketItem(b.id, idx, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); addBucketItem(b.id); }
                        }}
                      />
                    </li>
                  ))}
                </ul>
                <button className="yv-ghost-add" onClick={() => addBucketItem(b.id)}>+ Add item</button>
              </div>
            ))}
          </div>
        )}
      </div>

    </section>
  );
}

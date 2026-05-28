'use client';

import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────

interface Habit {
  id: string;
  section: 'Daily' | 'Devotional';
  icon: string;
  color: string;
  label: string;
  sublabel?: string;
  weeklyGoal: number;
}

interface HabitLog {
  habitId: string;
  date: string; // YYYY-MM-DD
}

interface EditForm {
  id: string | null; // null = new habit
  section: 'Daily' | 'Devotional';
  icon: string;
  color: string;
  label: string;
  sublabel: string;
  weeklyGoal: number;
}

interface Props {
  data:     Record<string, unknown>;
  onChange: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
}

// ── Constants ─────────────────────────────────────────────────────

const ICONS = [
  '🏃','💧','🏋️','🧘','🚶','🍎','💊','😴',
  '📖','🙏','✝️','🕊️','⭐','🌟','💫','🌸',
  '✍️','📝','💻','📚','🎯','🫀','🧠','💪',
  '🏊','🚴','🥗','☀️','🌿','🌅','💆','🤸',
];

const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
  '#f59e0b','#22c55e','#10b981','#06b6d4','#3b82f6',
  '#a855f7','#f43f5e',
];

// ── Date helpers ──────────────────────────────────────────────────

function getMonday(offset: number): Date {
  const d   = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - ((dow + 6) % 7) + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(offset: number): string[] {
  const monday = getMonday(offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toLocaleDateString('en-CA');
  });
}

function dayHeader(dateStr: string): { short: string; num: string } {
  const d = new Date(dateStr + 'T12:00:00');
  return {
    short: d.toLocaleDateString('en-US', { weekday: 'short' }),
    num:   String(d.getDate()),
  };
}

function weekRange(offset: number): string {
  const monday = getMonday(offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const s = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const e = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${s} – ${e}`;
}

// ── Component ─────────────────────────────────────────────────────

export default function HabitTracker({ data, onChange }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showModal,  setShowModal]  = useState(false);
  const [editForm,   setEditForm]   = useState<EditForm | null>(null);

  const habits    = ((data.habits    ?? []) as Habit[]);
  const habitLogs = ((data.habitLogs ?? []) as HabitLog[]);
  const weekDates = getWeekDates(weekOffset);
  const today     = new Date().toLocaleDateString('en-CA');

  // O(1) lookup for any habitId:date pair
  const logSet   = new Set(habitLogs.map(l => `${l.habitId}:${l.date}`));
  const isLogged = (habitId: string, date: string) => logSet.has(`${habitId}:${date}`);

  const daily       = habits.filter(h => h.section === 'Daily');
  const devotional  = habits.filter(h => h.section === 'Devotional');

  // Per-habit weekly counts (capped at weeklyGoal for the stats)
  const counts = habits.map(h => ({
    ...h,
    count: weekDates.filter(d => isLogged(h.id, d)).length,
  }));
  const totalGoal = habits.reduce((s, h) => s + h.weeklyGoal, 0);
  const totalDone = counts.reduce((s, h) => s + Math.min(h.count, h.weeklyGoal), 0);
  const overallPct = totalGoal > 0 ? Math.round((totalDone / totalGoal) * 100) : 0;

  // ── Data updaters ────────────────────────────────────────────────

  const setHabits = (h: Habit[]) =>
    onChange(prev => ({ ...prev, habits: h }));

  const toggleLog = (habitId: string, date: string) => {
    if (logSet.has(`${habitId}:${date}`)) {
      onChange(prev => ({
        ...prev,
        habitLogs: ((prev.habitLogs ?? []) as HabitLog[])
          .filter(l => !(l.habitId === habitId && l.date === date)),
      }));
    } else {
      onChange(prev => ({
        ...prev,
        habitLogs: [...((prev.habitLogs ?? []) as HabitLog[]), { habitId, date }],
      }));
    }
  };

  // ── Modal helpers ────────────────────────────────────────────────

  const openAdd  = (section: 'Daily' | 'Devotional') =>
    setEditForm({ id: null, section, icon: '⭐', color: COLORS[0], label: '', sublabel: '', weeklyGoal: 7 });

  const openEdit = (h: Habit) =>
    setEditForm({ id: h.id, section: h.section, icon: h.icon, color: h.color, label: h.label, sublabel: h.sublabel ?? '', weeklyGoal: h.weeklyGoal });

  const saveEdit = () => {
    if (!editForm?.label.trim()) return;
    if (editForm.id) {
      setHabits(habits.map(h =>
        h.id === editForm.id
          ? { ...h, section: editForm.section, icon: editForm.icon, color: editForm.color, label: editForm.label.trim(), sublabel: editForm.sublabel.trim() || undefined, weeklyGoal: editForm.weeklyGoal }
          : h,
      ));
    } else {
      setHabits([...habits, {
        id: crypto.randomUUID(), section: editForm.section, icon: editForm.icon,
        color: editForm.color, label: editForm.label.trim(),
        sublabel: editForm.sublabel.trim() || undefined, weeklyGoal: editForm.weeklyGoal,
      }]);
    }
    setEditForm(null);
  };

  const deleteHabit = (id: string) => {
    if (editForm?.id === id) setEditForm(null);
    onChange(prev => ({
      ...prev,
      habits:    ((prev.habits    ?? []) as Habit[]).filter(h => h.id !== id),
      habitLogs: ((prev.habitLogs ?? []) as HabitLog[]).filter(l => l.habitId !== id),
    }));
  };

  const reorder = (id: string, dir: 'up' | 'down') => {
    const h   = habits.find(x => x.id === id);
    if (!h) return;
    const sec = habits.filter(x => x.section === h.section);
    const i   = sec.findIndex(x => x.id === id);
    const j   = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= sec.length) return;
    const a    = habits.findIndex(x => x.id === id);
    const b    = habits.findIndex(x => x.id === sec[j].id);
    const next = [...habits];
    [next[a], next[b]] = [next[b], next[a]];
    setHabits(next);
  };

  const ef = (f: EditForm, updates: Partial<EditForm>) =>
    setEditForm({ ...f, ...updates });

  // ── Row renderer ─────────────────────────────────────────────────

  const HabitRow = ({ h }: { h: Habit }) => {
    const count    = counts.find(c => c.id === h.id)?.count ?? 0;
    const onTrack  = count >= h.weeklyGoal;
    return (
      <tr className="ht-row">
        <td className="ht-habit-cell">
          <div className="ht-habit-inner">
            <span className="ht-habit-icon" style={{ color: h.color }}>{h.icon}</span>
            <div className="ht-habit-labels">
              <span className="ht-habit-label">{h.label}</span>
              {h.sublabel && <span className="ht-habit-sublabel">{h.sublabel}</span>}
            </div>
          </div>
        </td>
        {weekDates.map(date => {
          const done = isLogged(h.id, date);
          return (
            <td key={date} className="ht-day-cell">
              <button
                className={`ht-toggle${done ? ' ht-toggle--on' : ''}`}
                style={done ? { background: h.color, borderColor: h.color } : {}}
                onClick={() => toggleLog(h.id, date)}
                aria-label={`${h.label} ${date}`}
                aria-pressed={done}
              />
            </td>
          );
        })}
        <td className="ht-goal-cell">
          <span
            className="ht-goal-badge"
            style={{ color: onTrack ? h.color : 'var(--text-muted)', borderColor: onTrack ? h.color : 'var(--border)' }}
          >
            {count}/{h.weeklyGoal}
          </span>
        </td>
      </tr>
    );
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <section className="ht">

      {/* Overall completion header */}
      <div className="ht-header">
        <div className="ht-pct-block">
          <span className="ht-pct-num">{habits.length > 0 ? `${overallPct}%` : '—'}</span>
          <span className="ht-pct-label">
            {habits.length > 0
              ? `${totalDone} / ${totalGoal} goal days this week`
              : 'Add habits to start tracking'}
          </span>
          {habits.length > 0 && (
            <div className="ht-pct-track">
              <div className="ht-pct-fill" style={{ width: `${overallPct}%` }} />
            </div>
          )}
        </div>
        <div className="ht-header-right">
          <div className="ht-week-nav">
            <button className="wv-nav-btn" onClick={() => setWeekOffset(o => o - 1)} aria-label="Previous week">←</button>
            <span className="ht-week-range">{weekRange(weekOffset)}</span>
            <button className="wv-nav-btn" onClick={() => setWeekOffset(o => o + 1)} aria-label="Next week">→</button>
          </div>
          <button className="ht-manage-btn" onClick={() => setShowModal(true)}>Manage Habits</button>
        </div>
      </div>

      {/* Grid */}
      {habits.length === 0 ? (
        <div className="ht-empty">
          <p>No habits yet.</p>
          <button className="ht-manage-btn" onClick={() => setShowModal(true)}>Add your first habit →</button>
        </div>
      ) : (
        <div className="ht-grid-wrap">
          <table className="ht-table">
            <thead>
              <tr>
                <th className="ht-th-habit">Habit</th>
                {weekDates.map(date => {
                  const { short, num } = dayHeader(date);
                  const isToday = date === today;
                  return (
                    <th key={date} className={`ht-th-day${isToday ? ' ht-th-day--today' : ''}`}>
                      <span className="ht-day-short">{short}</span>
                      <span className={`ht-day-num${isToday ? ' ht-day-num--today' : ''}`}>{num}</span>
                    </th>
                  );
                })}
                <th className="ht-th-goal">Goal</th>
              </tr>
            </thead>
            <tbody>
              {daily.length > 0 && (
                <>
                  <tr><td colSpan={9} className="ht-section-hd">Daily</td></tr>
                  {daily.map(h => <HabitRow key={h.id} h={h} />)}
                </>
              )}
              {devotional.length > 0 && (
                <>
                  <tr><td colSpan={9} className="ht-section-hd">Devotional</td></tr>
                  {devotional.map(h => <HabitRow key={h.id} h={h} />)}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary cards */}
      {habits.length > 0 && (
        <div className="ht-summary">
          {counts.map(h => {
            const pct = h.weeklyGoal > 0 ? Math.min(100, Math.round((h.count / h.weeklyGoal) * 100)) : 0;
            return (
              <div
                key={h.id}
                className="ht-sc"
                style={{
                  background:   `color-mix(in srgb, ${h.color} 10%, var(--surface))`,
                  borderColor:  `color-mix(in srgb, ${h.color} 35%, var(--border))`,
                }}
              >
                <div className="ht-sc-top">
                  <span className="ht-sc-icon">{h.icon}</span>
                  <div className="ht-sc-labels">
                    <span className="ht-sc-label">{h.label}</span>
                    {h.sublabel && <span className="ht-sc-sublabel">{h.sublabel}</span>}
                  </div>
                </div>
                <div className="ht-sc-track">
                  <div className="ht-sc-fill" style={{ width: `${pct}%`, background: h.color }} />
                </div>
                <div className="ht-sc-foot">
                  <span className="ht-sc-count">{h.count}/{h.weeklyGoal} days</span>
                  <span className="ht-sc-pct" style={{ color: h.color }}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Manage Habits Modal ── */}
      {showModal && (
        <div
          className="ht-overlay"
          onClick={e => { if (e.target === e.currentTarget && !editForm) setShowModal(false); }}
        >
          <div className="ht-modal">
            <div className="ht-modal-hd">
              <h2 className="ht-modal-title">Manage Habits</h2>
              <button className="ht-modal-close" onClick={() => { setShowModal(false); setEditForm(null); }}>×</button>
            </div>

            {/* Habit lists */}
            {(['Daily', 'Devotional'] as const).map(section => {
              const sHabits = habits.filter(h => h.section === section);
              return (
                <div key={section} className="ht-msec">
                  <h3 className="ht-msec-hd">{section}</h3>
                  {sHabits.length === 0 && (
                    <p className="ht-msec-empty">No {section.toLowerCase()} habits yet.</p>
                  )}
                  <ul className="ht-mlist">
                    {sHabits.map(h => (
                      <li
                        key={h.id}
                        className={`ht-mitem${editForm?.id === h.id ? ' ht-mitem--active' : ''}`}
                      >
                        <span className="ht-mitem-icon" style={{ color: h.color }}>{h.icon}</span>
                        <span className="ht-mitem-label">{h.label}</span>
                        <span className="ht-mitem-goal">{h.weeklyGoal}/7</span>
                        <div className="ht-mitem-actions">
                          <button className="ht-maction" onClick={() => openEdit(h)}>Edit</button>
                          <button className="ht-maction" onClick={() => reorder(h.id, 'up')} aria-label="Move up">↑</button>
                          <button className="ht-maction" onClick={() => reorder(h.id, 'down')} aria-label="Move down">↓</button>
                          <button className="ht-maction ht-maction--del" onClick={() => deleteHabit(h.id)} aria-label="Delete">×</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {!editForm && (
                    <button className="wv-add" onClick={() => openAdd(section)}>
                      + Add {section.toLowerCase()} habit
                    </button>
                  )}
                </div>
              );
            })}

            {/* Edit / Add form */}
            {editForm && (
              <div className="ht-form">
                <h3 className="ht-form-title">
                  {editForm.id ? 'Edit Habit' : `New ${editForm.section} Habit`}
                </h3>

                {/* Icon */}
                <div className="ht-frow">
                  <label className="ht-flabel">Icon</label>
                  <div className="ht-icon-preview">{editForm.icon}</div>
                  <div className="ht-emoji-grid">
                    {ICONS.map(emoji => (
                      <button
                        key={emoji}
                        className={`ht-emoji${editForm.icon === emoji ? ' ht-emoji--on' : ''}`}
                        onClick={() => ef(editForm, { icon: emoji })}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div className="ht-frow">
                  <label className="ht-flabel">Color</label>
                  <div className="ht-colors">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        className={`ht-swatch${editForm.color === c ? ' ht-swatch--on' : ''}`}
                        style={{ background: c }}
                        onClick={() => ef(editForm, { color: c })}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </div>

                {/* Label */}
                <div className="ht-frow">
                  <label className="ht-flabel" htmlFor="ht-input-label">Label</label>
                  <input
                    id="ht-input-label"
                    className="ht-finput"
                    value={editForm.label}
                    placeholder="e.g. Morning Run"
                    onChange={e => ef(editForm, { label: e.target.value })}
                  />
                </div>

                {/* Sublabel */}
                <div className="ht-frow">
                  <label className="ht-flabel" htmlFor="ht-input-sub">Sublabel</label>
                  <input
                    id="ht-input-sub"
                    className="ht-finput"
                    value={editForm.sublabel}
                    placeholder="Optional — e.g. 30 min, 64 oz"
                    onChange={e => ef(editForm, { sublabel: e.target.value })}
                  />
                </div>

                {/* Weekly goal */}
                <div className="ht-frow">
                  <label className="ht-flabel">Weekly goal</label>
                  <div className="ht-goal-row">
                    {[1,2,3,4,5,6,7].map(n => (
                      <button
                        key={n}
                        className={`ht-gnum${editForm.weeklyGoal === n ? ' ht-gnum--on' : ''}`}
                        onClick={() => ef(editForm, { weeklyGoal: n })}
                      >
                        {n}
                      </button>
                    ))}
                    <span className="ht-goal-suffix">/ 7 days</span>
                  </div>
                </div>

                {/* Section */}
                <div className="ht-frow">
                  <label className="ht-flabel">Section</label>
                  <div className="ht-section-row">
                    {(['Daily', 'Devotional'] as const).map(s => (
                      <button
                        key={s}
                        className={`ht-secbtn${editForm.section === s ? ' ht-secbtn--on' : ''}`}
                        onClick={() => ef(editForm, { section: s })}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ht-form-actions">
                  <button className="ht-btn-cancel" onClick={() => setEditForm(null)}>Cancel</button>
                  <button
                    className="ht-btn-save"
                    onClick={saveEdit}
                    disabled={!editForm.label.trim()}
                  >
                    {editForm.id ? 'Save changes' : 'Add habit'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

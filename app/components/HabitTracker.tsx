'use client';

import { useState } from 'react';

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
  date: string;
}

interface EditForm {
  id: string | null;
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

function weekLabel(offset: number): string {
  const monday = getMonday(offset);
  return `Week of ${monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
}

export default function HabitTracker({ data, onChange }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showModal,  setShowModal]  = useState(false);
  const [editForm,   setEditForm]   = useState<EditForm | null>(null);

  const habits    = ((data.habits    ?? []) as Habit[]);
  const habitLogs = ((data.habitLogs ?? []) as HabitLog[]);
  const weekDates = getWeekDates(weekOffset);
  const today     = new Date().toLocaleDateString('en-CA');

  const logSet   = new Set(habitLogs.map(l => `${l.habitId}:${l.date}`));
  const isLogged = (habitId: string, date: string) => logSet.has(`${habitId}:${date}`);

  const daily      = habits.filter(h => h.section === 'Daily');
  const devotional = habits.filter(h => h.section === 'Devotional');

  const totalGoal = habits.reduce((s, h) => s + h.weeklyGoal, 0);
  const totalDone = habits.reduce((s, h) => {
    const count = weekDates.filter(d => isLogged(h.id, d)).length;
    return s + Math.min(count, h.weeklyGoal);
  }, 0);
  const overallPct = totalGoal > 0 ? Math.round((totalDone / totalGoal) * 100) : 0;

  // Data updaters
  const setHabits = (h: Habit[]) => onChange(prev => ({ ...prev, habits: h }));

  const toggleLog = (habitId: string, date: string) => {
    if (logSet.has(`${habitId}:${date}`)) {
      onChange(prev => ({ ...prev, habitLogs: ((prev.habitLogs ?? []) as HabitLog[]).filter(l => !(l.habitId === habitId && l.date === date)) }));
    } else {
      onChange(prev => ({ ...prev, habitLogs: [...((prev.habitLogs ?? []) as HabitLog[]), { habitId, date }] }));
    }
  };

  // Modal helpers
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
    const h = habits.find(x => x.id === id);
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

  const ef = (f: EditForm, updates: Partial<EditForm>) => setEditForm({ ...f, ...updates });

  // Render a section of habits
  const HabitSection = ({ label, sectionHabits }: { label: string; sectionHabits: Habit[] }) => (
    <>
      <div className="ht-section-hd">{label.toUpperCase()} HABITS</div>
      {sectionHabits.map(h => {
        const count = weekDates.filter(d => isLogged(h.id, d)).length;
        const p     = h.weeklyGoal > 0 ? Math.min(100, Math.round((count / h.weeklyGoal) * 100)) : 0;
        return (
          <div key={h.id} className="ht-habit-row">
            <div className="ht-habit-info">
              <span className="ht-habit-icon" style={{ color: h.color }}>{h.icon}</span>
              <div className="ht-habit-labels">
                <span className="ht-habit-label">{h.label}</span>
                {h.sublabel && <span className="ht-habit-sublabel">{h.sublabel}</span>}
              </div>
              <div className="ht-habit-progress">
                <div className="ht-habit-track">
                  <div className="ht-habit-fill" style={{ width: `${p}%`, background: h.color }} />
                </div>
                <span className="ht-habit-count">{count}/{h.weeklyGoal}</span>
              </div>
            </div>
            <div className="ht-day-cells">
              {weekDates.map(date => {
                const done    = isLogged(h.id, date);
                const isFut  = date > today;
                return (
                  <button
                    key={date}
                    className={`ht-toggle${done ? ' ht-toggle--on' : ''}${isFut ? ' ht-toggle--future' : ''}`}
                    style={done ? { background: h.color, borderColor: h.color } : {}}
                    onClick={() => !isFut && toggleLog(h.id, date)}
                    aria-pressed={done}
                    aria-label={`${h.label} ${date}`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <section className="ht">

      {/* Header */}
      <div className="ht-header-card">
        <div className="ht-header-left">
          <h2 className="ht-title">Habit Tracker</h2>
          <div className="ht-week-label">{weekLabel(weekOffset)}</div>
          {habits.length > 0 && (
            <>
              <div className="ht-pct-track">
                <div className="ht-pct-fill" style={{ width: `${overallPct}%` }} />
              </div>
              <div className="ht-pct-text">{totalDone} / {totalGoal} commitments this week</div>
            </>
          )}
        </div>
        <div className="ht-header-right">
          <div className="ht-week-nav">
            <button className="wv-weeknav-btn" onClick={() => setWeekOffset(o => o - 1)}>‹</button>
            <button className="wv-weeknav-btn" onClick={() => setWeekOffset(o => o + 1)}>›</button>
          </div>
          <button className="ht-manage-btn" onClick={() => setShowModal(true)}>Manage Habits</button>
        </div>
      </div>

      {/* Grid */}
      {habits.length === 0 ? (
        <div className="ht-empty">
          <p style={{ marginBottom: '0.75rem' }}>No habits yet.</p>
          <button className="ht-manage-btn" onClick={() => setShowModal(true)}>Add your first habit →</button>
        </div>
      ) : (
        <div className="ht-grid-wrap">
          {/* Day column headers */}
          <div className="ht-day-header-row">
            <div className="ht-habit-info-ph" />
            <div className="ht-day-headers">
              {weekDates.map(date => {
                const d       = new Date(date + 'T12:00:00');
                const short   = d.toLocaleDateString('en-US', { weekday: 'narrow' });
                const num     = d.getDate();
                const isToday = date === today;
                return (
                  <div key={date} className={`ht-day-col-hd${isToday ? ' ht-day-col-hd--today' : ''}`}>
                    <span className="ht-day-short">{short}</span>
                    <span className={`ht-day-num${isToday ? ' ht-day-num--today' : ''}`}>{num}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {daily.length > 0 && <HabitSection label="Daily" sectionHabits={daily} />}
          {devotional.length > 0 && <HabitSection label="Devotional" sectionHabits={devotional} />}
        </div>
      )}

      {/* Manage Habits Modal */}
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

            {(['Daily', 'Devotional'] as const).map(section => {
              const sHabits = habits.filter(h => h.section === section);
              return (
                <div key={section} className="ht-msec">
                  <h3 className="ht-msec-hd">{section}</h3>
                  {sHabits.length === 0 && <p className="ht-msec-empty">No {section.toLowerCase()} habits yet.</p>}
                  <ul className="ht-mlist">
                    {sHabits.map(h => (
                      <li key={h.id} className={`ht-mitem${editForm?.id === h.id ? ' ht-mitem--active' : ''}`}>
                        <span className="ht-mitem-icon" style={{ color: h.color }}>{h.icon}</span>
                        <span className="ht-mitem-label">{h.label}</span>
                        <span className="ht-mitem-goal">{h.weeklyGoal}/7</span>
                        <div className="ht-mitem-actions">
                          <button className="ht-maction" onClick={() => openEdit(h)}>Edit</button>
                          <button className="ht-maction" onClick={() => reorder(h.id, 'up')}>↑</button>
                          <button className="ht-maction" onClick={() => reorder(h.id, 'down')}>↓</button>
                          <button className="ht-maction ht-maction--del" onClick={() => deleteHabit(h.id)}>×</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {!editForm && (
                    <button className="wv-ghost-add" onClick={() => openAdd(section)}>+ Add {section.toLowerCase()} habit</button>
                  )}
                </div>
              );
            })}

            {editForm && (
              <div className="ht-form">
                <h3 className="ht-form-title">{editForm.id ? 'Edit Habit' : `New ${editForm.section} Habit`}</h3>

                <div className="ht-frow">
                  <label className="ht-flabel">Icon</label>
                  <div className="ht-icon-preview">{editForm.icon}</div>
                  <div className="ht-emoji-grid">
                    {ICONS.map(emoji => (
                      <button key={emoji} className={`ht-emoji${editForm.icon === emoji ? ' ht-emoji--on' : ''}`} onClick={() => ef(editForm, { icon: emoji })}>{emoji}</button>
                    ))}
                  </div>
                </div>

                <div className="ht-frow">
                  <label className="ht-flabel">Color</label>
                  <div className="ht-colors">
                    {COLORS.map(c => (
                      <button key={c} className={`ht-swatch${editForm.color === c ? ' ht-swatch--on' : ''}`} style={{ background: c }} onClick={() => ef(editForm, { color: c })} aria-label={c} />
                    ))}
                  </div>
                </div>

                <div className="ht-frow">
                  <label className="ht-flabel" htmlFor="ht-input-label">Label</label>
                  <input id="ht-input-label" className="ht-finput" value={editForm.label} placeholder="e.g. Morning Run" onChange={e => ef(editForm, { label: e.target.value })} />
                </div>

                <div className="ht-frow">
                  <label className="ht-flabel" htmlFor="ht-input-sub">Sublabel</label>
                  <input id="ht-input-sub" className="ht-finput" value={editForm.sublabel} placeholder="Optional — e.g. 30 min" onChange={e => ef(editForm, { sublabel: e.target.value })} />
                </div>

                <div className="ht-frow">
                  <label className="ht-flabel">Weekly goal</label>
                  <div className="ht-goal-row">
                    {[1,2,3,4,5,6,7].map(n => (
                      <button key={n} className={`ht-gnum${editForm.weeklyGoal === n ? ' ht-gnum--on' : ''}`} onClick={() => ef(editForm, { weeklyGoal: n })}>{n}</button>
                    ))}
                    <span className="ht-goal-suffix">/ 7 days</span>
                  </div>
                </div>

                <div className="ht-frow">
                  <label className="ht-flabel">Section</label>
                  <div className="ht-section-row">
                    {(['Daily', 'Devotional'] as const).map(s => (
                      <button key={s} className={`ht-secbtn${editForm.section === s ? ' ht-secbtn--on' : ''}`} onClick={() => ef(editForm, { section: s })}>{s}</button>
                    ))}
                  </div>
                </div>

                <div className="ht-form-actions">
                  <button className="ht-btn-cancel" onClick={() => setEditForm(null)}>Cancel</button>
                  <button className="ht-btn-save" onClick={saveEdit} disabled={!editForm.label.trim()}>
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

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, X, Edit3, Save, Check } from 'lucide-react';

interface TimetableBuilderProps {
  onBack: () => void;
}

interface Subject {
  code: string;
  name: string;
  is_lab: boolean;
}

interface Slot {
  id?: string;
  day_of_week: number;
  start_hour: number;
  end_hour: number;
  subject_code: string;
  subject_name: string;
  is_lab: boolean;
  is_active?: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16];
const LUNCH_START = 13;
const LUNCH_END = 14;

const formatHour = (h: number): string => {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
};

const getSubjectsForCycle = (cycle: string): Subject[] => {
  if (cycle === 'physics') {
    return [
      { code: 'PHY', name: 'Physics', is_lab: false },
      { code: 'MTH-1', name: 'Mathematics 1', is_lab: false },
      { code: 'PCD', name: 'Programming in C & DS', is_lab: false },
      { code: 'BEE', name: 'Basic Electrical Engineering', is_lab: false },
      { code: 'BCE', name: 'Basic Civil Engineering', is_lab: false },
      { code: 'UHV', name: 'Universal Human Values', is_lab: false },
      { code: 'PHY-LAB', name: 'Physics Laboratory', is_lab: true },
      { code: 'YOGA', name: 'Yoga', is_lab: true },
      { code: 'PCDS-LAB', name: 'Programming Lab (PCDS)', is_lab: true },
      { code: 'BEE-LAB', name: 'Basic Electrical Engineering Lab', is_lab: true },
      { code: 'EGD', name: 'Engineering Graphics & Design Lab', is_lab: true },
    ];
  } else {
    return [
      { code: 'CHE', name: 'Chemistry', is_lab: false },
      { code: 'MTH-1', name: 'Mathematics 1', is_lab: false },
      { code: 'BE', name: 'Basic Electronics Engineering', is_lab: false },
      { code: 'BME', name: 'Basic Mechanical Engineering', is_lab: false },
      { code: 'EME', name: 'Engineering Mechanics', is_lab: false },
      { code: 'ETW', name: 'English for Technical Writing', is_lab: false },
      { code: 'CHE-LAB', name: 'Chemistry Laboratory', is_lab: true },
      { code: 'BE-LAB', name: 'Basic Electronics Lab', is_lab: true },
      { code: 'CREW', name: 'Communicative English & Report Writing Lab', is_lab: true },
      { code: 'WDM', name: 'Workshop & Digital Manufacturing Lab', is_lab: true },
      { code: 'NSS', name: 'NSS', is_lab: true },
    ];
  }
};

export const TimetableBuilder: React.FC<TimetableBuilderProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [dragSubject, setDragSubject] = useState<Subject | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const cycle = user.academic_cycle || 'physics';
    setSubjects(getSubjectsForCycle(cycle));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadSlots = async () => {
      const { data, error } = await supabase
        .from('timetable_slots')
        .select('*')
        .eq('user_roll', user.roll_number)
        .eq('is_active', true);
      if (!error && data) {
        const converted = data.map((slot: any) => ({
          ...slot,
          start_hour: parseInt(slot.start_time.split(':')[0]),
          end_hour: parseInt(slot.end_time.split(':')[0]),
        }));
        setSlots(converted);
      }
      setLoading(false);
    };
    loadSlots();
  }, [user]);

  const saveSlots = async (newSlots: Slot[]) => {
    if (!user) return;
    await supabase
      .from('timetable_slots')
      .update({ is_active: false })
      .eq('user_roll', user.roll_number);
    if (newSlots.length > 0) {
      const inserts = newSlots.map(slot => ({
        user_roll: user.roll_number,
        day_of_week: slot.day_of_week,
        start_time: `${String(slot.start_hour).padStart(2, '0')}:00`,
        end_time: `${String(slot.end_hour).padStart(2, '0')}:00`,
        subject_code: slot.subject_code,
        subject_name: slot.subject_name,
        is_lab: slot.is_lab,
        is_active: true,
      }));
      await supabase.from('timetable_slots').insert(inserts);
    }
    const { data } = await supabase
      .from('timetable_slots')
      .select('*')
      .eq('user_roll', user.roll_number)
      .eq('is_active', true);
    if (data) {
      const converted = data.map((slot: any) => ({
        ...slot,
        start_hour: parseInt(slot.start_time.split(':')[0]),
        end_hour: parseInt(slot.end_time.split(':')[0]),
      }));
      setSlots(converted);
    }
  };

  const validateDrop = (day: number, startHour: number, subject: Subject): string | null => {
    const duration = subject.is_lab ? 3 : 1;
    const endHour = startHour + duration;
    if (startHour < 9 || endHour > 17) return '⏰ Outside college hours (9am - 5pm)';
    if (startHour < LUNCH_END && endHour > LUNCH_START) return '🍽️ Conflicts with lunch break (1pm - 2pm)';
    const daySlots = slots.filter(s => s.day_of_week === day);
    for (const s of daySlots) {
      if (startHour < s.end_hour && endHour > s.start_hour) return '⚠️ Overlaps with existing class';
    }
    return null;
  };

  const handleDrop = (e: React.DragEvent, day: number, hour: number) => {
    e.preventDefault();
    if (!isEditing || !dragSubject) return;
    const error = validateDrop(day, hour, dragSubject);
    if (error) {
      setDropError(error);
      setTimeout(() => setDropError(null), 3000);
      return;
    }
    const duration = dragSubject.is_lab ? 3 : 1;
    const newSlot: Slot = {
      day_of_week: day,
      start_hour: hour,
      end_hour: hour + duration,
      subject_code: dragSubject.code,
      subject_name: dragSubject.name,
      is_lab: dragSubject.is_lab,
    };
    setSlots([...slots, newSlot]);
    setDragSubject(null);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const removeSlot = (slotToRemove: Slot) => {
    if (!isEditing) return;
    setSlots(slots.filter(s => s !== slotToRemove));
  };

  const handleSave = async () => {
    await saveSlots(slots);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setDragSubject(null);
  };

  const handleClear = () => {
    if (!isEditing) return;
    if (window.confirm('Clear all timetable slots?')) setSlots([]);
  };

  const getSlotsAtHour = (day: number, hour: number): Slot | null => {
    return slots.find(s => s.day_of_week === day && s.start_hour <= hour && s.end_hour > hour) || null;
  };

  const theorySubjects = subjects.filter(s => !s.is_lab);
  const labSubjects = subjects.filter(s => s.is_lab);

  if (loading) {
    return <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>Loading timetable...</div>;
  }

  return (
    <div className="p-4 max-w-7xl mx-auto pb-24" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded hover:bg-opacity-10" style={{ color: 'var(--text-primary)' }}>
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>📅 Timetable Builder</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: isEditing ? 'var(--warning)' : 'var(--success)', color: '#fff' }}>
            {isEditing ? '✏️ Editing' : '🔒 Saved'}
          </span>
          {isEditing ? (
            <>
              <button onClick={handleClear} className="px-3 py-1 rounded text-sm" style={{ backgroundColor: 'var(--danger)', color: '#fff' }}>Clear</button>
              <button onClick={handleSave} className="px-3 py-1 rounded text-sm flex items-center gap-1" style={{ backgroundColor: 'var(--success)', color: '#fff' }}><Save size={16} /> Save</button>
            </>
          ) : (
            <button onClick={handleEdit} className="px-3 py-1 rounded text-sm flex items-center gap-1" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}><Edit3 size={16} /> Edit</button>
          )}
        </div>
      </div>

      {dropError && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'var(--danger)', color: '#fff' }}>
          <span>{dropError}</span>
        </div>
      )}

      <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            📚 Subjects: {!isEditing && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(read-only)</span>}
          </span>
          {theorySubjects.map((subj) => (
            <div
              key={subj.code}
              draggable={isEditing}
              onDragStart={() => { if (isEditing) setDragSubject(subj); }}
              className={`px-3 py-1.5 rounded flex items-center gap-2 text-sm transition ${isEditing ? 'cursor-grab hover:scale-105' : 'cursor-default opacity-60'}`}
              style={{
                backgroundColor: dragSubject?.code === subj.code ? 'var(--accent)' : 'var(--accent-light)',
                color: dragSubject?.code === subj.code ? '#fff' : 'var(--text-primary)',
                border: dragSubject?.code === subj.code ? 'none' : '1px solid var(--border)',
              }}
            >
              <span className="font-medium">{subj.code}</span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>1h</span>
              {dragSubject?.code === subj.code && <Check size={14} />}
            </div>
          ))}
          {labSubjects.map((subj) => (
            <div
              key={subj.code}
              draggable={isEditing}
              onDragStart={() => { if (isEditing) setDragSubject(subj); }}
              className={`px-3 py-1.5 rounded flex items-center gap-2 text-sm transition ${isEditing ? 'cursor-grab hover:scale-105' : 'cursor-default opacity-60'}`}
              style={{
                backgroundColor: dragSubject?.code === subj.code ? 'var(--accent)' : 'var(--surface)',
                color: dragSubject?.code === subj.code ? '#fff' : 'var(--text-primary)',
                border: dragSubject?.code === subj.code ? 'none' : '2px dashed var(--accent)',
              }}
            >
              <span className="font-medium">{subj.code}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>🧪 3h</span>
              {dragSubject?.code === subj.code && <Check size={14} />}
            </div>
          ))}
        </div>
        {isEditing && (
          <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            💡 Drag a subject onto the grid {dragSubject ? `· Selected: ${dragSubject.code}` : ''}
          </div>
        )}
        {!isEditing && (
          <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>🔒 Locked. Click Edit to modify.</div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full border-collapse text-sm" style={{ backgroundColor: 'var(--bg)', minWidth: '700px' }}>
          <thead>
            <tr>
              <th className="p-2 font-semibold text-center" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', minWidth: '80px' }}>Day / Time</th>
              {HOURS.map((hour) => (
                <th key={hour} className="p-2 text-center font-medium" style={{ color: hour >= LUNCH_START && hour < LUNCH_END ? 'var(--warning)' : 'var(--text-primary)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', minWidth: '60px' }}>
                  {formatHour(hour)}
                  {hour >= LUNCH_START && hour < LUNCH_END && ' 🍽️'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, dayIdx) => {
              const dayNum = dayIdx + 1;
              return (
                <tr key={day}>
                  <td className="p-2 font-medium text-center" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>{day}</td>
                  {HOURS.map((hour) => {
                    const slot = getSlotsAtHour(dayNum, hour);
                    const isLunch = hour >= LUNCH_START && hour < LUNCH_END;
                    const isStartOfSlot = slot && slot.start_hour === hour;
                    const isInsideSlot = slot && slot.start_hour < hour && slot.end_hour > hour;
                    const isDragTarget = dragSubject && !slot && !isLunch && isEditing;

                    if (isInsideSlot) return null;

                    if (isStartOfSlot) {
                      const duration = slot.end_hour - slot.start_hour;
                      return (
                        <td key={`${day}-${hour}`} colSpan={duration} className="p-0" style={{ border: '1px solid var(--border)' }}>
                          <div className="h-full w-full rounded p-1.5 flex flex-col justify-between animate-slide-in" style={{
                            backgroundColor: slot.is_lab ? 'var(--surface)' : 'var(--accent-light)',
                            borderLeft: `4px solid ${slot.is_lab ? 'var(--accent)' : 'var(--accent)'}`,
                            minHeight: '60px',
                            height: '100%',
                            color: 'var(--text-primary)',
                          }}>
                            <div className="font-medium text-xs flex items-center gap-1">
                              {slot.subject_code}
                              {slot.is_lab && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>🧪</span>}
                            </div>
                            {isEditing && <button onClick={() => removeSlot(slot)} className="self-end p-0.5 rounded hover:bg-opacity-20" style={{ color: 'var(--danger)' }}><X size={12} /></button>}
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={`${day}-${hour}`}
                        onDrop={(e) => handleDrop(e, dayNum, hour)}
                        onDragOver={handleDragOver}
                        className={`p-0 text-center transition ${isDragTarget ? 'cursor-pointer' : ''}`}
                        style={{
                          border: '1px solid var(--border)',
                          backgroundColor: isLunch ? 'rgba(212, 167, 74, 0.12)' : (isDragTarget ? 'rgba(76, 175, 80, 0.15)' : 'var(--card)'),
                          height: '60px',
                          outline: isDragTarget ? '2px dashed var(--accent)' : 'none',
                        }}
                      >
                        {isLunch ? <span className="text-sm" style={{ color: 'var(--text-muted)' }}>🍽️</span> : isEditing && dragSubject ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+</span> : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs flex flex-wrap gap-3" style={{ color: 'var(--text-secondary)' }}>
        <span style={{ color: 'var(--text-primary)' }}>🟦 Theory (1h)</span>
        <span style={{ color: 'var(--text-primary)' }}>🟩 Labs (3h)</span>
        <span>🍽️ Lunch (1-2pm)</span>
        <span>⏰ 9am–5pm</span>
        {isEditing && <span className="text-xs" style={{ color: 'var(--warning)' }}>✏️ Drag to add, X to remove</span>}
        {!isEditing && <span className="text-xs" style={{ color: 'var(--success)' }}>🔒 Saved – attendance preserved</span>}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-slide-in { animation: slideIn 0.15s ease-out; }
      `}</style>
    </div>
  );
};

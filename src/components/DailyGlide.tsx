import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Clock } from 'lucide-react';

interface TimetableSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_code: string;
  subject_name: string;
  is_lab: boolean;
}

interface AttendanceLog {
  slot_id: string;
  log_date: string;
  status: string;
}

// Helper to get day of week (1=Mon, 5=Fri)
function getDayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d; // Sun=7, Mon=1, ... Sat=6
}

function calculateDangerZone(attended: number, total: number, target: number) {
  if (total === 0) return { status: 'unknown', message: 'No classes conducted yet' };
  const percentage = (attended / total) * 100;
  if (percentage >= target) {
    const safe = Math.floor((attended - (target / 100) * total) / (target / 100));
    return { status: 'safe', message: `✅ Safe: Can skip ${safe} classes` };
  } else {
    const required = Math.ceil(((target / 100) * total - attended) / (1 - target / 100));
    return { status: 'warning', message: `⚠️ WARNING: Must attend ${required} consecutive classes` };
  }
}

export const DailyGlide: React.FC = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [logs, setLogs] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToday = async () => {
      if (!user) return;
      
      const today = getDayOfWeek();
      // Only show Mon-Fri
      if (today < 1 || today > 5) {
        setSlots([]);
        setLoading(false);
        return;
      }

      // ✅ FIX: Only fetch active slots
      const { data: slotsData, error: slotsError } = await supabase
        .from('timetable_slots')
        .select('*')
        .eq('user_roll', user.roll_number)
        .eq('day_of_week', today)
        .eq('is_active', true)        // ✅ ADD THIS
        .order('start_time');

      if (slotsError) {
        console.error('Error fetching timetable:', slotsError);
        setLoading(false);
        return;
      }

      // Deduplicate by slot ID (just in case)
      const uniqueSlots = slotsData ? Array.from(
        new Map(slotsData.map(s => [s.id, s])).values()
      ) : [];
      setSlots(uniqueSlots);

      // Fetch attendance logs for today
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: logsData, error: logsError } = await supabase
        .from('attendance_logs')
        .select('slot_id, status')
        .eq('user_roll', user.roll_number)
        .eq('log_date', todayStr);

      if (!logsError && logsData) {
        const logMap = new Map<string, string>();
        logsData.forEach(log => logMap.set(log.slot_id, log.status));
        setLogs(logMap);
      }

      setLoading(false);
    };

    fetchToday();
  }, [user]);

  // Compute attendance stats
  const getAttendanceStats = (slotId: string): { attended: number; total: number; percentage: number } => {
    // For demo, we'll use dummy data – in production, fetch from attendance_logs per subject
    // Since we don't have per-subject tracking, we'll use overall attendance
    const total = 6; // dummy
    const attended = 5; // dummy
    return { attended, total, percentage: Math.round((attended / total) * 100) };
  };

  if (loading) {
    return <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Loading today's classes...</div>;
  }

  if (slots.length === 0) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
        🎉 No classes today! Enjoy your day off.
      </div>
    );
  }

  const target = user?.attendance_target || 75;

  return (
    <div className="space-y-3 p-4">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>📅 Today's Classes</h2>
      {slots.map((slot) => {
        const status = logs.get(slot.id) || 'present';
        const isHoliday = status === 'holiday';
        const { attended, total, percentage } = getAttendanceStats(slot.id);
        const danger = calculateDangerZone(attended, total, target);

        return (
          <div
            key={slot.id}
            className={`rounded-lg border p-4 transition-all`}
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {slot.subject_name} {slot.is_lab && '🧪'}
                  </span>
                  {isHoliday && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#4caf50', color: '#fff' }}>
                      Holiday
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Clock size={14} className="inline mr-1" />
                  {slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Attendance: {attended}/{total} ({percentage}%)
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Target: {target}%
                  </span>
                </div>
                {!isHoliday && (
                  <div className="mt-1 text-sm font-medium" style={{ color: danger.status === 'safe' ? 'var(--success)' : 'var(--danger)' }}>
                    {danger.message}
                  </div>
                )}
              </div>
              <button
                className="text-sm px-3 py-1 rounded border hover:bg-opacity-10 transition"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                onClick={() => alert('Quick action drawer coming soon!')}
              >
                ⋯
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

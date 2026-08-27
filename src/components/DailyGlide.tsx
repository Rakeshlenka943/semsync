import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Clock, MoreVertical, X } from 'lucide-react';

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
  user_roll: string;
  subject_code: string;
  log_date: string;
  status: 'present' | 'absent' | 'teacher_absent' | 'proxy' | 'holiday';
}

function getDayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
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
  const [todayLogs, setTodayLogs] = useState<Map<string, string>>(new Map());
  const [subjectStats, setSubjectStats] = useState<Map<string, { total: number; attended: number }>>(new Map());
  const [subjectTargets, setSubjectTargets] = useState<Map<string, number>>(new Map());
  const [globalTarget, setGlobalTarget] = useState<number>(75);
  const [loading, setLoading] = useState(true);
  const [showActions, setShowActions] = useState<string | null>(null);

  useEffect(() => {
    const fetchToday = async () => {
      if (!user) return;

      const today = getDayOfWeek();
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Fetch global target
      const { data: profile } = await supabase
        .from('users')
        .select('attendance_target')
        .eq('roll_number', user.roll_number)
        .single();
      if (profile?.attendance_target) setGlobalTarget(profile.attendance_target);

      // 2. Fetch subject targets
      const { data: targets } = await supabase
        .from('subject_attendance_targets')
        .select('subject_code, target_percentage')
        .eq('user_roll', user.roll_number);
      const targetMap = new Map<string, number>();
      targets?.forEach(t => targetMap.set(t.subject_code, t.target_percentage));
      setSubjectTargets(targetMap);

      // 3. Fetch active slots
      const { data: slotsData, error: slotsError } = await supabase
        .from('timetable_slots')
        .select('*')
        .eq('user_roll', user.roll_number)
        .eq('day_of_week', today)
        .eq('is_active', true)
        .order('start_time');

      if (slotsError) {
        console.error('Error fetching timetable:', slotsError);
        setLoading(false);
        return;
      }

      // Deduplicate by subject_code
      const uniqueSlots = slotsData
        ? Array.from(new Map(slotsData.map(s => [s.subject_code, s])).values())
        : [];
      setSlots(uniqueSlots);

      // 4. Fetch logs
      const { data: allLogs, error: logsError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_roll', user.roll_number);

      if (logsError) {
        console.error('Error fetching logs:', logsError);
        setLoading(false);
        return;
      }

      // 5. Compute stats per subject
      const statsMap = new Map<string, { total: number; attended: number }>();
      const todayMap = new Map<string, string>();

      if (allLogs) {
        allLogs.forEach((log: AttendanceLog) => {
          const { subject_code, log_date, status } = log;
          if (log_date === todayStr) {
            todayMap.set(subject_code, status);
          }
          if (status === 'holiday' || status === 'teacher_absent') return;
          const isAttended = status === 'present' || status === 'proxy';
          const entry = statsMap.get(subject_code) || { total: 0, attended: 0 };
          entry.total += 1;
          if (isAttended) entry.attended += 1;
          statsMap.set(subject_code, entry);
        });
      }

      setSubjectStats(statsMap);
      setTodayLogs(todayMap);
      setLoading(false);
    };

    fetchToday();
  }, [user]);

  const markClass = async (subjectCode: string, status: string) => {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (status === 'clear') {
      // Delete today's log for this subject
      const { error } = await supabase
        .from('attendance_logs')
        .delete()
        .eq('user_roll', user.roll_number)
        .eq('subject_code', subjectCode)
        .eq('log_date', todayStr);
      if (!error) {
        const newMap = new Map(todayLogs);
        newMap.delete(subjectCode);
        setTodayLogs(newMap);
        setShowActions(null);
        refreshStats();
      }
      return;
    }

    // Upsert
    const { error } = await supabase
      .from('attendance_logs')
      .upsert({
        user_roll: user.roll_number,
        subject_code: subjectCode,
        log_date: todayStr,
        status,
      }, { onConflict: 'user_roll, subject_code, log_date' });
    if (!error) {
      const newMap = new Map(todayLogs);
      newMap.set(subjectCode, status);
      setTodayLogs(newMap);
      setShowActions(null);
      refreshStats();
    }
  };

  const refreshStats = async () => {
    if (!user) return;
    const { data: allLogs } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_roll', user.roll_number);
    const statsMap = new Map<string, { total: number; attended: number }>();
    if (allLogs) {
      allLogs.forEach((log: any) => {
        if (log.status === 'holiday' || log.status === 'teacher_absent') return;
        const isAttended = log.status === 'present' || log.status === 'proxy';
        const entry = statsMap.get(log.subject_code) || { total: 0, attended: 0 };
        entry.total += 1;
        if (isAttended) entry.attended += 1;
        statsMap.set(log.subject_code, entry);
      });
      setSubjectStats(statsMap);
    }
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

  return (
    <div className="space-y-3 p-4">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>📅 Today's Classes</h2>
      {slots.map((slot) => {
        const status = todayLogs.get(slot.subject_code) || 'present';
        const isHoliday = status === 'holiday';
        const stats = subjectStats.get(slot.subject_code) || { total: 0, attended: 0 };
        const { total, attended } = stats;
        const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
        const target = subjectTargets.get(slot.subject_code) || globalTarget;
        const danger = calculateDangerZone(attended, total, target);
        const isCustomTarget = subjectTargets.has(slot.subject_code);

        return (
          <div
            key={slot.id}
            className="rounded-lg border p-4 transition-all relative"
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
                  {isCustomTarget && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                      Target: {target}%
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
                {!isHoliday && total > 0 && (
                  <div className="mt-1 text-sm font-medium" style={{ color: danger.status === 'safe' ? 'var(--success)' : 'var(--danger)' }}>
                    {danger.message}
                  </div>
                )}
                {total === 0 && (
                  <div className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    No attendance data yet.
                  </div>
                )}
              </div>
              <button
                className="text-sm px-3 py-1 rounded border hover:bg-opacity-10 transition"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                onClick={() => setShowActions(showActions === slot.subject_code ? null : slot.subject_code)}
              >
                <MoreVertical size={18} />
              </button>
            </div>

            {/* Quick Actions Dropdown */}
            {showActions === slot.subject_code && (
              <div
                className="absolute right-0 top-full mt-1 z-10 w-48 rounded-lg shadow-lg border p-2"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <div className="space-y-1">
                  {['present', 'absent', 'teacher_absent', 'proxy', 'holiday', 'clear'].map((action) => {
                    const isActive = status === action;
                    const label = action === 'present' ? '✅ Present'
                                 : action === 'absent' ? '❌ Absent'
                                 : action === 'teacher_absent' ? '👨‍🏫 Cancelled'
                                 : action === 'proxy' ? '🔄 Proxy'
                                 : action === 'holiday' ? '🏖️ Holiday'
                                 : '🗑️ Clear';
                    return (
                      <button
                        key={action}
                        onClick={() => {
                          if (action === 'clear') {
                            markClass(slot.subject_code, 'clear');
                          } else {
                            markClass(slot.subject_code, action);
                          }
                        }}
                        className="w-full text-left px-3 py-1.5 rounded text-sm hover:bg-opacity-10 flex items-center gap-2"
                        style={{
                          backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                          color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

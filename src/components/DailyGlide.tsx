import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Users, AlertCircle, CheckCircle } from 'lucide-react';

interface ClassSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_code: string;
  subject_name: string;
  is_lab: boolean;
}

interface ExamDate {
  id: string;
  subject: string;
  date: string;
  type: 'mid' | 'end' | 'lab';
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

// Check if a date is during exam period (within 2 days of an exam)
function isExamPeriod(dateStr: string, exams: ExamDate[]): boolean {
  const date = new Date(dateStr);
  for (const exam of exams) {
    const examDate = new Date(exam.date);
    // If today is an exam or 1 day before/after, mark as holiday
    const diffDays = Math.ceil((examDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= -1 && diffDays <= 1) {
      return true;
    }
  }
  return false;
}

// Check if date is "last day of semester" (user-defined)
async function isLastDay(userRoll: string, dateStr: string): Promise<boolean> {
  // Check if there's a record for last semester day
  const { data, error } = await supabase
    .from('semester_dates')
    .select('last_day')
    .eq('user_roll', userRoll)
    .single();
  
  if (data && data.last_day) {
    const lastDay = new Date(data.last_day);
    const today = new Date(dateStr);
    // If today is on or after last day, it's holiday period
    return today >= lastDay;
  }
  return false;
}

export const DailyGlide: React.FC = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<ClassSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamDate[]>([]);
  const [isHolidayPeriod, setIsHolidayPeriod] = useState(false);

  useEffect(() => {
    const fetchToday = async () => {
      if (!user) return;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const dayOfWeek = today.getDay(); // 1=Mon, 5=Fri

      // Fetch exams
      const { data: examData } = await supabase
        .from('exam_dates')
        .select('*')
        .eq('user_roll', user.roll_number);
      setExams(examData || []);

      // Check if today is in exam period
      const isExamPeriodToday = isExamPeriod(todayStr, examData || []);
      
      // Check if we're in semester break (after last day)
      // We'll check if there's a semester_dates record
      const { data: semesterData } = await supabase
        .from('semester_dates')
        .select('last_day')
        .eq('user_roll', user.roll_number)
        .single();
      
      let isAfterLastDay = false;
      if (semesterData && semesterData.last_day) {
        const lastDay = new Date(semesterData.last_day);
        isAfterLastDay = today >= lastDay;
      }

      if (isExamPeriodToday || isAfterLastDay) {
        setIsHolidayPeriod(true);
        setSlots([]);
        setLoading(false);
        return;
      }

      // Only show classes on weekdays (Mon-Fri)
      if (dayOfWeek < 1 || dayOfWeek > 5) {
        setSlots([]);
        setLoading(false);
        return;
      }

      // Fetch today's timetable
      const { data: slotsData, error } = await supabase
        .from('timetable_slots')
        .select('*')
        .eq('user_roll', user.roll_number)
        .eq('day_of_week', dayOfWeek)
        .order('start_time');

      if (error) {
        console.error('Error fetching timetable:', error);
        setLoading(false);
        return;
      }

      setSlots(slotsData || []);
      setLoading(false);
    };

    fetchToday();
  }, [user]);

  // Find current and next class
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  let currentIndex = -1;
  let nextIndex = -1;

  slots.forEach((slot, idx) => {
    const [h, m] = slot.start_time.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const [eh, em] = slot.end_time.split(':').map(Number);
    const endMinutes = eh * 60 + em;
    if (startMinutes <= currentTime && endMinutes > currentTime) {
      currentIndex = idx;
    } else if (startMinutes > currentTime && nextIndex === -1) {
      nextIndex = idx;
    }
  });

  if (loading) {
    return <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Loading today's classes...</div>;
  }

  // Show holiday message if in exam period or after last day
  if (isHolidayPeriod) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
        🏖️ No classes today! Enjoy your exam break.
        <br />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          (You can manage exam dates in Settings)
        </span>
      </div>
    );
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
      {slots.map((slot, idx) => {
        const isCurrent = idx === currentIndex;
        const isNext = idx === nextIndex;

        // For demo, dummy data – replace with real attendance counts
        const attended = 5;
        const total = 6;
        const target = user?.attendance_target || 75;
        const danger = calculateDangerZone(attended, total, target);

        return (
          <div
            key={slot.id}
            className={`rounded-lg border p-4 transition-all ${
              isCurrent ? 'ring-2 ring-offset-2' : ''
            }`}
            style={{
              backgroundColor: isCurrent ? 'var(--accent-light)' : 'var(--card)',
              borderColor: isCurrent ? 'var(--accent)' : 'var(--border)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {slot.subject_name} {slot.is_lab && '🧪'}
                  </span>
                  {isCurrent && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                      🔵 Current
                    </span>
                  )}
                  {isNext && !isCurrent && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--text-muted)', color: '#fff' }}>
                      Next
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Clock size={14} className="inline mr-1" />
                  {slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Attendance: {attended}/{total} ({Math.round((attended/total)*100)}%)
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Target: {target}%
                  </span>
                </div>
                <div className="mt-1 text-sm font-medium" style={{ color: danger.status === 'safe' ? 'var(--success)' : 'var(--danger)' }}>
                  {danger.message}
                </div>
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

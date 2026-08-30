import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp, 
  Plus, Check, XCircle, Trash2, Loader2
} from 'lucide-react';

interface MonthlyHeatmapProps {
  onBack: () => void;
}

interface TimetableSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_code: string;
  subject_name: string;
  is_lab: boolean;
  specific_date?: string;
  is_extra_class?: boolean;
}

interface AttendanceLog {
  user_roll: string;
  slot_id: string;
  subject_code: string;
  log_date: string;
  status: 'present' | 'absent' | 'teacher_absent' | 'proxy' | 'holiday';
  context_note?: string;
}

interface SubjectAttendanceStats {
  subject_code: string;
  subject_name: string;
  is_lab: boolean;
  total: number;
  present: number;
  absent: number;
  teacher_absent: number;
  proxy: number;
  holiday: number;
  offs: number;
  percentage: number;
}

// Helper: get local date string YYYY-MM-DD
function getLocalDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

const optionTooltips: Record<string, string> = {
  present: 'You attended this class',
  absent: 'You missed this class (counts against attendance)',
  teacher_absent: 'Class was cancelled / teacher absent (does NOT count)',
  proxy: 'Proxy was marked for you (counts as present)',
  holiday: 'College declared holiday (removes class)',
  clear: 'Remove the current status (reset to not marked)',
};

function getStatusText(status: string): string {
  switch (status) {
    case 'present': return '✅ Present';
    case 'absent': return '❌ Absent';
    case 'teacher_absent': return '⛔ Cancelled';
    case 'proxy': return '🔄 Proxy';
    case 'holiday': return '🏖️ Holiday';
    default: return '⚪ Not marked';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'present': return 'var(--success)';
    case 'absent': return 'var(--danger)';
    case 'teacher_absent': return 'var(--warning)';
    case 'proxy': return '#e6b800';
    case 'holiday': return '#4caf50';
    default: return 'var(--text-muted)';
  }
}

function getSubjectStatsUpToDate(
  subjectCode: string,
  allLogs: AttendanceLog[],
  upToDate: Date,
  subjectName: string,
  isLab: boolean,
  target: number
): SubjectAttendanceStats {
  const upToDateStr = getLocalDateStr(upToDate);
  const relevantLogs = allLogs.filter(log => {
    return log.subject_code === subjectCode && log.log_date <= upToDateStr;
  });

  const stats = { present: 0, absent: 0, teacher_absent: 0, proxy: 0, holiday: 0 };
  relevantLogs.forEach(log => {
    if (log.status === 'present') stats.present++;
    else if (log.status === 'absent') stats.absent++;
    else if (log.status === 'teacher_absent') stats.teacher_absent++;
    else if (log.status === 'proxy') stats.proxy++;
    else if (log.status === 'holiday') stats.holiday++;
  });

  const total = stats.present + stats.absent + stats.teacher_absent + stats.proxy + stats.holiday;
  const offs = stats.teacher_absent + stats.holiday;
  const effectiveTotal = total - offs;
  const attended = stats.present + stats.proxy;
  const percentage = effectiveTotal > 0 ? (attended / effectiveTotal) * 100 : 0;

  return {
    subject_code: subjectCode,
    subject_name: subjectName,
    is_lab: isLab,
    total,
    present: stats.present,
    absent: stats.absent,
    teacher_absent: stats.teacher_absent,
    proxy: stats.proxy,
    holiday: stats.holiday,
    offs,
    percentage,
  };
}

// Tooltip Button
const TooltipButton: React.FC<{
  children: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  style?: React.CSSProperties;
  className?: string;
  active?: boolean;
}> = ({ children, tooltip, onClick, style, className, active }) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, above: true });
  const ref = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const tooltipHeight = 40;
    const above = spaceAbove > tooltipHeight + 10;
    setPosition({
      top: above ? rect.top - 10 : rect.bottom + 10,
      left: rect.left + rect.width / 2,
      above,
    });
    setShow(true);
  };

  const handleMouseLeave = () => setShow(false);

  return (
    <>
      <button
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={style}
        className={className}
      >
        {children}
      </button>
      {show && (
        <div
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '12px',
            lineHeight: '1.4',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 99999,
            maxWidth: '260px',
            wordWrap: 'break-word',
            whiteSpace: 'normal',
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          {tooltip}
          <div
            style={{
              position: 'absolute',
              bottom: position.above ? '-8px' : 'auto',
              top: position.above ? 'auto' : '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: position.above ? `8px solid var(--border)` : 'none',
              borderBottom: position.above ? 'none' : `8px solid var(--border)`,
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
            }}
          />
        </div>
      )}
    </>
  );
};

export const MonthlyHeatmap: React.FC<MonthlyHeatmapProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [allLogs, setAllLogs] = useState<AttendanceLog[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [semesterStartDate, setSemesterStartDate] = useState<Date | null>(null);
  const [semesterEndDate, setSemesterEndDate] = useState<Date | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [showExtraClassModal, setShowExtraClassModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    action: 'delete_extra';
    message: string;
    payload?: any;
  } | null>(null);
  const [globalTarget, setGlobalTarget] = useState<number>(75);
  const [subjectTargets, setSubjectTargets] = useState<Map<string, number>>(new Map());

  // Data fetching
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);
      const startStr = getLocalDateStr(startDate);
      const endStr = getLocalDateStr(endDate);

      // Fetch global target
      const { data: profile } = await supabase
        .from('users')
        .select('attendance_target')
        .eq('roll_number', user.roll_number)
        .single();
      if (profile?.attendance_target) setGlobalTarget(profile.attendance_target);

      // Fetch subject targets
      const { data: targets } = await supabase
        .from('subject_attendance_targets')
        .select('subject_code, target_percentage')
        .eq('user_roll', user.roll_number);
      const targetMap = new Map<string, number>();
      targets?.forEach(t => targetMap.set(t.subject_code, t.target_percentage));
      setSubjectTargets(targetMap);

      // Fetch semester dates
      const { data: semData } = await supabase
        .from('semester_dates')
        .select('semester_start, semester_end')
        .eq('user_roll', user.roll_number)
        .single();
      if (semData?.semester_start) setSemesterStartDate(new Date(semData.semester_start));
      if (semData?.semester_end) setSemesterEndDate(new Date(semData.semester_end));

      // Fetch active slots (including extra classes)
      const { data: slotsData } = await supabase
        .from('timetable_slots')
        .select('*')
        .eq('user_roll', user.roll_number)
        .eq('is_active', true);
      if (slotsData) setSlots(slotsData);

      // Fetch logs for the month (now includes slot_id)
      const { data: logsData } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_roll', user.roll_number)
        .gte('log_date', startStr)
        .lte('log_date', endStr);
      if (logsData) setAllLogs(logsData);

      setLoading(false);
    };
    fetchData();
  }, [user, currentYear, currentMonth]);

  // Refresh helpers
  const refreshLogs = async () => {
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);
    const startStr = getLocalDateStr(startDate);
    const endStr = getLocalDateStr(endDate);
    const { data: logsData } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_roll', user?.roll_number)
      .gte('log_date', startStr)
      .lte('log_date', endStr);
    if (logsData) setAllLogs(logsData);
  };

  const refreshSlots = async () => {
    const { data: slotsData } = await supabase
      .from('timetable_slots')
      .select('*')
      .eq('user_roll', user?.roll_number)
      .eq('is_active', true);
    if (slotsData) setSlots(slotsData);
  };

  // Action functions (now using slot_id)
  const markSlot = async (slotId: string, subjectCode: string, date: Date, status: string) => {
    if (!user) return;
    const dateStr = getLocalDateStr(date);
    await supabase
      .from('attendance_logs')
      .upsert({
        user_roll: user.roll_number,
        slot_id: slotId,
        subject_code: subjectCode,
        log_date: dateStr,
        status,
      }, { onConflict: 'user_roll, slot_id, log_date' });
    refreshLogs();
    setSelectedDay(date);
  };

  const markDayHoliday = async (date: Date, daySlots: any[]) => {
    if (!user) return;
    const dateStr = getLocalDateStr(date);
    for (const cls of daySlots) {
      await supabase
        .from('attendance_logs')
        .upsert({
          user_roll: user.roll_number,
          slot_id: cls.slot.id,
          subject_code: cls.slot.subject_code,
          log_date: dateStr,
          status: 'holiday',
        }, { onConflict: 'user_roll, slot_id, log_date' });
    }
    refreshLogs();
    setSelectedDay(date);
  };

  // Bulk mark all slots for a day
  const markAll = async (date: Date, status: string) => {
    if (!user) return;
    const dateStr = getLocalDateStr(date);
    const dayOfWeek = date.getDay();
    const daySlots = slots.filter(s => 
      (s.day_of_week === dayOfWeek && !s.specific_date) || 
      s.specific_date === dateStr
    );
    if (daySlots.length === 0) {
      alert('No classes found for this day.');
      return;
    }
    const entries = daySlots.map(slot => ({
      user_roll: user.roll_number,
      slot_id: slot.id,
      subject_code: slot.subject_code,
      log_date: dateStr,
      status,
    }));
    const { error } = await supabase
      .from('attendance_logs')
      .upsert(entries, { onConflict: 'user_roll, slot_id, log_date' });
    if (error) {
      console.error('Bulk upsert error:', error);
      alert('Failed to update attendance. Please try again.');
      return;
    }
    refreshLogs();
    setSelectedDay(date);
  };

  // Bulk clear all slots for a day
  const clearAll = async (date: Date) => {
    if (!user) return;
    const dateStr = getLocalDateStr(date);
    const dayOfWeek = date.getDay();
    const daySlots = slots.filter(s => 
      (s.day_of_week === dayOfWeek && !s.specific_date) || 
      s.specific_date === dateStr
    );
    if (daySlots.length === 0) {
      alert('No classes found for this day.');
      return;
    }
    const slotIds = daySlots.map(s => s.id);
    const { error } = await supabase
      .from('attendance_logs')
      .delete()
      .eq('user_roll', user.roll_number)
      .in('slot_id', slotIds)
      .eq('log_date', dateStr);
    if (error) {
      console.error('Bulk delete error:', error);
      alert('Failed to clear attendance. Please try again.');
      return;
    }
    refreshLogs();
    setSelectedDay(date);
  };

  // ✅ Holiday for the day – marks all slots as holiday
  const markDayAsHoliday = async (date: Date) => {
    if (!user) return;
    const dateStr = getLocalDateStr(date);
    const dayOfWeek = date.getDay();
    const daySlots = slots.filter(s => 
      (s.day_of_week === dayOfWeek && !s.specific_date) || 
      s.specific_date === dateStr
    );
    if (daySlots.length === 0) {
      alert('No classes found for this day.');
      return;
    }
    const entries = daySlots.map(slot => ({
      user_roll: user.roll_number,
      slot_id: slot.id,
      subject_code: slot.subject_code,
      log_date: dateStr,
      status: 'holiday',
    }));
    const { error } = await supabase
      .from('attendance_logs')
      .upsert(entries, { onConflict: 'user_roll, slot_id, log_date' });
    if (error) {
      console.error('Holiday upsert error:', error);
      alert('Failed to mark holiday. Please try again.');
      return;
    }
    refreshLogs();
    setSelectedDay(date);
  };

  const deleteExtraClass = async (slotId: string, date: Date) => {
    if (!user) return;
    const dateStr = getLocalDateStr(date);
    const slot = slots.find(s => s.id === slotId);
    if (slot) {
      await supabase
        .from('attendance_logs')
        .delete()
        .eq('user_roll', user.roll_number)
        .eq('slot_id', slotId)
        .eq('log_date', dateStr);
    }
    await supabase.from('timetable_slots').delete().eq('id', slotId);
    await refreshSlots();
    refreshLogs();
    setSelectedDay(date);
  };

  const addExtraClass = async (subjectCode: string, date: Date) => {
    if (!user) return;
    const dateStr = getLocalDateStr(date);
    const dayOfWeek = date.getDay();
    const existingSlot = slots.find(s => 
      s.subject_code === subjectCode && s.specific_date === dateStr
    );
    if (existingSlot) {
      // If already exists, just mark present for that slot
      await supabase
        .from('attendance_logs')
        .upsert({
          user_roll: user.roll_number,
          slot_id: existingSlot.id,
          subject_code: subjectCode,
          log_date: dateStr,
          status: 'present',
        }, { onConflict: 'user_roll, slot_id, log_date' });
      refreshLogs();
      setSelectedDay(date);
      setShowExtraClassModal(false);
      return;
    }
    const sourceSlot = slots.find(s => s.subject_code === subjectCode);
    if (!sourceSlot) {
      alert('Subject not found in your timetable. Please add it in Timetable Builder first.');
      return;
    }
    const { data: newSlot, error } = await supabase
      .from('timetable_slots')
      .insert({
        user_roll: user.roll_number,
        day_of_week: dayOfWeek,
        start_time: '09:00:00',
        end_time: '10:00:00',
        subject_code: sourceSlot.subject_code,
        subject_name: sourceSlot.subject_name,
        is_lab: sourceSlot.is_lab,
        specific_date: dateStr,
        is_extra_class: true,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding extra class:', error);
      alert('Failed to add extra class. Please try again.');
      return;
    }
    // Immediately mark as present for the new slot
    await supabase
      .from('attendance_logs')
      .upsert({
        user_roll: user.roll_number,
        slot_id: newSlot.id,
        subject_code: subjectCode,
        log_date: dateStr,
        status: 'present',
      }, { onConflict: 'user_roll, slot_id, log_date' });
    await refreshSlots();
    refreshLogs();
    setSelectedDay(date);
    setShowExtraClassModal(false);
  };

  const clearSlot = async (slotId: string, subjectCode: string, date: Date) => {
    if (!user) return;
    const dateStr = getLocalDateStr(date);
    await supabase
      .from('attendance_logs')
      .delete()
      .eq('user_roll', user.roll_number)
      .eq('slot_id', slotId)
      .eq('log_date', dateStr);
    refreshLogs();
    setSelectedDay(date);
  };

  // Build calendar using UTC to avoid timezone shift
  const buildCalendar = (): any[][] => {
    const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
    const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0));
    const startDay = firstDayOfMonth.getUTCDay(); // 0=Sun, 6=Sat
    const daysInMonth = lastDayOfMonth.getUTCDate();
    const weeks: any[][] = [];
    let currentWeek: any[] = [];
    const today = new Date();
    const todayStr = getLocalDateStr(today);

    for (let d = 1; d <= daysInMonth; d++) {
      // Use UTC to create date at midnight UTC, then convert to local string for display
      const date = new Date(Date.UTC(currentYear, currentMonth, d));
      const dayOfWeek = date.getUTCDay();
      const dateStr = getLocalDateStr(date);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let isBeforeSemesterStart = false;
      let isAfterSemesterEnd = false;
      if (semesterStartDate) {
        const semStart = new Date(semesterStartDate);
        semStart.setHours(0, 0, 0, 0);
        const dateCopy = new Date(date);
        dateCopy.setHours(0, 0, 0, 0);
        isBeforeSemesterStart = dateCopy < semStart;
      }
      if (semesterEndDate) {
        const semEnd = new Date(semesterEndDate);
        semEnd.setHours(0, 0, 0, 0);
        const dateCopy = new Date(date);
        dateCopy.setHours(0, 0, 0, 0);
        isAfterSemesterEnd = dateCopy > semEnd;
      }
      const isOutsideSemester = isBeforeSemesterStart || isAfterSemesterEnd;
      const isFuture = date > today;

      let dayClasses: any[] = [];
      let hasAnyClasses = false;
      let hasData = false;

      if (!isOutsideSemester && !isWeekend && !isFuture) {
        const daySlots = slots.filter(s => 
          (s.day_of_week === dayOfWeek && !s.specific_date) || 
          s.specific_date === dateStr
        );
        daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
        daySlots.forEach(slot => {
          const log = allLogs.find(l => 
            l.slot_id === slot.id && 
            l.log_date === dateStr
          );
          dayClasses.push({
            slot,
            status: log ? log.status : 'no_data',
            hasLog: !!log,
            isExtraClass: slot.is_extra_class || !!slot.specific_date,
          });
          hasAnyClasses = true;
          if (log) hasData = true;
        });
      }

      let dayStatus = 'NO_DATA';
      let dayEmoji = '·';
      let dayColor = 'var(--text-muted)';
      let percentage = 0;

      if (isOutsideSemester) {
        dayStatus = 'NO_DATA';
        dayEmoji = '·';
        dayColor = 'var(--text-muted)';
      } else if (isWeekend) {
        dayStatus = 'OFF';
        dayEmoji = '✕';
        dayColor = 'var(--text-muted)';
      } else if (isFuture) {
        dayStatus = 'NO_DATA';
        dayEmoji = '?';
        dayColor = 'var(--text-muted)';
      } else if (!hasAnyClasses) {
        dayStatus = 'OFF';
        dayEmoji = '✕';
        dayColor = 'var(--text-muted)';
      } else if (hasData) {
        const allMarked = dayClasses.filter(c => c.hasLog);
        const totalClasses = allMarked.length;
        const absentCount = allMarked.filter(c => c.status === 'absent').length;
        const attendedCount = allMarked.filter(c => c.status === 'present' || c.status === 'proxy').length;
        const offCount = allMarked.filter(c => c.status === 'teacher_absent' || c.status === 'holiday').length;
        const effectiveTotal = totalClasses - offCount;
        percentage = effectiveTotal > 0 ? (attendedCount / effectiveTotal) * 100 : 0;

        if (effectiveTotal === 0) {
          dayStatus = 'OFF';
          dayEmoji = '✕';
          dayColor = 'var(--text-muted)';
        } else if (absentCount === 0) {
          dayStatus = 'FULL';
          dayEmoji = '✓';
          dayColor = 'var(--success)';
        } else {
          dayStatus = 'MIXED';
          dayEmoji = '~';
          dayColor = 'var(--warning)';
        }
      } else {
        dayStatus = 'NO_DATA';
        dayEmoji = '·';
        dayColor = 'var(--text-muted)';
      }

      currentWeek.push({
        date,
        dayOfWeek,
        isToday: dateStr === todayStr,
        isFuture,
        isWeekend,
        isOutsideSemester,
        classes: dayClasses,
        hasClasses: hasAnyClasses,
        hasData,
        dayStatus,
        dayEmoji,
        dayColor,
        percentage,
      });

      if (dayOfWeek === 6 || d === daysInMonth) {
        while (currentWeek.length < 7) {
          currentWeek.push({
            date: new Date(0),
            dayOfWeek: -1,
            isToday: false,
            isFuture: false,
            isWeekend: false,
            isOutsideSemester: true,
            classes: [],
            hasClasses: false,
            hasData: false,
            dayStatus: 'OFF',
            dayEmoji: '·',
            dayColor: 'var(--text-muted)',
            percentage: 0,
          });
        }
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    return weeks;
  };

  const weeks = buildCalendar();

  const canGoPrev = () => {
    if (!semesterStartDate) return true;
    const prevMonth = new Date(currentYear, currentMonth - 1, 1);
    const semStart = new Date(semesterStartDate);
    semStart.setDate(1);
    semStart.setHours(0, 0, 0, 0);
    return prevMonth >= semStart;
  };

  const canGoNext = () => {
    if (!semesterEndDate) return true;
    const nextMonth = new Date(currentYear, currentMonth + 1, 1);
    const semEnd = new Date(semesterEndDate);
    semEnd.setDate(1);
    semEnd.setHours(0, 0, 0, 0);
    return nextMonth <= semEnd;
  };

  const changeMonth = (delta: number) => {
    if (delta < 0 && !canGoPrev()) return;
    if (delta > 0 && !canGoNext()) return;
    const newMonth = currentMonth + delta;
    if (newMonth < 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else if (newMonth > 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else { setCurrentMonth(newMonth); }
    setSelectedDay(null);
    setExpandedSubject(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(null);
    setExpandedSubject(null);
  };

  const handleDayClick = (day: any) => {
    if (day.isOutsideSemester || day.isFuture || day.isWeekend) return;
    if (day.hasClasses) {
      setSelectedDay(day.date);
      setExpandedSubject(null);
    }
  };

  const getTheorySubjects = () => {
    const unique = new Map();
    slots.forEach(s => {
      if (!s.is_lab && !unique.has(s.subject_code)) {
        unique.set(s.subject_code, s);
      }
    });
    return Array.from(unique.values());
  };

  if (loading) {
    return <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>Loading heatmap...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded hover:bg-opacity-10" style={{ color: 'var(--text-primary)' }}>
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>📊 Monthly Heatmap</h1>
        </div>
        <button onClick={goToToday} className="px-3 py-1 rounded text-sm" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
          Today
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => changeMonth(-1)}
          disabled={!canGoPrev()}
          className="p-2 rounded hover:bg-opacity-10 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'var(--text-primary)' }}
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        <button
          onClick={() => changeMonth(1)}
          disabled={!canGoNext()}
          className="p-2 rounded hover:bg-opacity-10 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'var(--text-primary)' }}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Semester Range Info */}
      <div className="mb-3 text-xs flex flex-wrap gap-3" style={{ color: 'var(--text-muted)' }}>
        {semesterStartDate && (
          <span>📅 Start: {semesterStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        )}
        {semesterEndDate && (
          <span>📅 End: {semesterEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        )}
        {!semesterStartDate && <span>⚠️ Semester start date not set</span>}
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                <th key={idx} className="p-2 text-sm font-medium text-center" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, weekIdx) => (
              <tr key={weekIdx}>
                {week.map((day, dayIdx) => {
                  const isToday = day.isToday;
                  const canClick = day.hasClasses && !day.isOutsideSemester && !day.isFuture && !day.isWeekend;
                  let bgColor = 'transparent';
                  if (day.isOutsideSemester) bgColor = 'rgba(0,0,0,0.03)';
                  else if (isToday) bgColor = 'var(--accent-light)';
                  else if (day.dayStatus === 'FULL') bgColor = 'rgba(124, 165, 140, 0.2)';
                  else if (day.dayStatus === 'MIXED') bgColor = 'rgba(212, 167, 74, 0.2)';
                  else if (day.dayStatus === 'OFF') bgColor = 'rgba(0,0,0,0.03)';
                  const borderStyle = isToday ? '2px solid #3b82f6' : '1px solid var(--border)';
                  const opacity = day.isOutsideSemester ? 0.4 : 1;
                  const cursor = canClick ? 'pointer' : 'default';
                  return (
                    <td
                      key={dayIdx}
                      className="p-1 text-center transition"
                      style={{ border: borderStyle, backgroundColor: bgColor, opacity, cursor }}
                      onClick={() => handleDayClick(day)}
                    >
                      {day.date.getTime() > 0 ? (
                        <div className="flex flex-col items-center p-1">
                          <span className="text-sm font-medium" style={{ color: isToday ? 'var(--accent)' : 'var(--text-primary)', fontWeight: isToday ? 'bold' : 'normal' }}>
                            {day.date.getDate()}
                          </span>
                          <span className="text-lg" style={{ color: day.dayColor }}>{day.dayEmoji}</span>
                          {day.dayStatus !== 'NO_DATA' && day.dayStatus !== 'OFF' && day.hasData && !day.isOutsideSemester && (
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{Math.round(day.percentage)}%</span>
                          )}
                        </div>
                      ) : <div className="p-1">·</div>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span style={{ color: 'var(--success)' }}>✓ Full</span>
        <span style={{ color: 'var(--warning)' }}>~ Mixed</span>
        <span style={{ color: 'var(--text-muted)' }}>✕ Off</span>
        <span>· No data</span>
        <span style={{ color: 'var(--text-muted)' }}>⛔ Outside Semester</span>
        <span style={{ color: 'var(--accent)' }}>🔵 Today</span>
        <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>Tap a day to see details</span>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(44, 37, 32, 0.5)' }}
          onClick={() => { setSelectedDay(null); setExpandedSubject(null); setShowExtraClassModal(false); }}
        >
          <div
            className="max-w-md w-full rounded-lg shadow-xl p-6"
            style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-bold">
                {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExtraClassModal(true)}
                  className="p-1.5 rounded hover:bg-opacity-10 text-xs flex items-center gap-1"
                  style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                >
                  <Plus size={16} /> Extra
                </button>
                <button onClick={() => { setSelectedDay(null); setExpandedSubject(null); }} className="p-1 rounded hover:bg-opacity-10" style={{ color: 'var(--text-muted)' }}>
                  <X size={24} />
                </button>
              </div>
            </div>

            {(() => {
              const dateStr = getLocalDateStr(selectedDay);
              const dayData = weeks.flat().find((d: any) => getLocalDateStr(d.date) === dateStr);
              if (!dayData || !dayData.hasClasses) {
                return <div style={{ color: 'var(--text-secondary)' }}>No classes on this day.</div>;
              }

              // Group by subject_code but keep slots separate for extra classes
              const subjectMap = new Map<string, any>();
              dayData.classes.forEach((cls: any) => {
                const code = cls.slot.subject_code;
                // Create a unique key for each slot, but we want to show them separately if they are extra classes
                const isExtra = cls.isExtraClass;
                const key = isExtra ? `${code}-extra-${cls.slot.id}` : code;
                if (!subjectMap.has(key)) {
                  subjectMap.set(key, {
                    code,
                    slot: cls.slot,
                    hasLog: false,
                    status: 'no_data',
                    startTime: cls.slot.start_time,
                    isExtraClass: isExtra,
                    subjectName: cls.slot.subject_name,
                    isLab: cls.slot.is_lab,
                  });
                }
                const entry = subjectMap.get(key);
                entry.hasLog = entry.hasLog || cls.hasLog;
                if (cls.status !== 'no_data') entry.status = cls.status;
              });

              const subjects = Array.from(subjectMap.values())
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              return (
                <div className="space-y-3">
                  {/* Status Banner */}
                  <div className="p-3 rounded-lg text-center" style={{
                    backgroundColor: dayData.dayStatus === 'FULL' ? 'rgba(124, 165, 140, 0.15)' :
                                   dayData.dayStatus === 'MIXED' ? 'rgba(212, 167, 74, 0.15)' :
                                   'rgba(0,0,0,0.05)',
                    border: `1px solid ${dayData.dayColor}`
                  }}>
                    <span className="text-lg">{dayData.dayEmoji}</span>
                    <p className="font-medium" style={{ color: dayData.dayColor }}>
                      {dayData.dayStatus === 'FULL' && '✓ Full Attendance – All classes attended'}
                      {dayData.dayStatus === 'MIXED' && '~ Mixed – Some classes missed'}
                      {dayData.dayStatus === 'OFF' && '✕ No Classes Today'}
                      {dayData.dayStatus === 'NO_DATA' && '· No data marked yet'}
                    </p>
                    {dayData.hasData && dayData.dayStatus !== 'OFF' && dayData.dayStatus !== 'NO_DATA' && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {Math.round(dayData.percentage)}% attendance
                      </p>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs font-medium mr-1" style={{ color: 'var(--text-secondary)' }}>⚡ Quick:</span>
                      <button
                        onClick={() => markAll(selectedDay, 'present')}
                        className="px-3 py-1 rounded text-xs font-medium hover:scale-105 transition flex items-center gap-1"
                        style={{ backgroundColor: 'var(--success)', color: '#fff' }}
                      >
                        <Check size={12} /> All Present
                      </button>
                      <button
                        onClick={() => markAll(selectedDay, 'absent')}
                        className="px-3 py-1 rounded text-xs font-medium hover:scale-105 transition flex items-center gap-1"
                        style={{ backgroundColor: 'var(--danger)', color: '#fff' }}
                      >
                        <XCircle size={12} /> All Absent
                      </button>
                      <button
                        onClick={() => markDayAsHoliday(selectedDay)}
                        className="px-3 py-1 rounded text-xs font-medium hover:scale-105 transition flex items-center gap-1"
                        style={{ backgroundColor: '#4caf50', color: '#fff' }}
                      >
                        <Trash2 size={12} /> Holiday
                      </button>
                      <button
                        onClick={() => clearAll(selectedDay)}
                        className="px-3 py-1 rounded text-xs font-medium hover:scale-105 transition flex items-center gap-1"
                        style={{ backgroundColor: 'var(--text-muted)', color: '#fff' }}
                      >
                        <Trash2 size={12} /> Clear All
                      </button>
                    </div>
                  </div>

                  {/* Subjects – each slot separately */}
                  {subjects.map((subject: any) => {
                    const isExpanded = expandedSubject === `${subject.code}-${subject.slot.id}`;
                    const target = subjectTargets.get(subject.code) || globalTarget;
                    const stats = getSubjectStatsUpToDate(
                      subject.code,
                      allLogs,
                      selectedDay,
                      subject.subjectName,
                      subject.isLab,
                      target
                    );
                    const currentStatus = subject.status;

                    return (
                      <div
                        key={subject.slot.id}
                        className="rounded-lg overflow-hidden"
                        style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
                      >
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-opacity-5"
                          onClick={() => setExpandedSubject(isExpanded ? null : `${subject.code}-${subject.slot.id}`)}
                          style={{ backgroundColor: 'var(--card)' }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{subject.code}</span>
                            {subject.isLab && <span className="text-xs">🧪</span>}
                            {subject.isExtraClass && (
                              <span className="text-xs" style={{ color: 'var(--accent)' }}>➕ Extra</span>
                            )}
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {subject.slot.start_time.slice(0,5)}
                            </span>
                            {currentStatus !== 'no_data' && (
                              <span className="text-xs" style={{ color: getStatusColor(currentStatus) }}>
                                {getStatusText(currentStatus)}
                              </span>
                            )}
                            {currentStatus === 'no_data' && (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Not marked</span>
                            )}
                            {subjectTargets.has(subject.code) && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                                Target: {target}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {Math.round(stats.percentage)}%
                            </span>
                            {subject.isExtraClass && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowConfirmModal({
                                    action: 'delete_extra',
                                    message: `Are you sure you want to delete the extra class "${subject.code}" on ${selectedDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}?`,
                                    payload: { slotId: subject.slot.id, date: selectedDay }
                                  });
                                }}
                                className="p-1 rounded hover:bg-opacity-20"
                                style={{ color: 'var(--danger)' }}
                              >
                                <X size={14} />
                              </button>
                            )}
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-3 space-y-3" style={{ backgroundColor: 'var(--bg)' }}>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--card)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Total:</span>
                                <span>{stats.total}</span>
                              </div>
                              <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--card)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Present:</span>
                                <span style={{ color: 'var(--success)' }}>{stats.present}</span>
                              </div>
                              <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--card)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Absent:</span>
                                <span style={{ color: 'var(--danger)' }}>{stats.absent}</span>
                              </div>
                              <div className="flex justify-between p-2 rounded" style={{ backgroundColor: 'var(--card)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Offs:</span>
                                <span style={{ color: 'var(--warning)' }}>{stats.teacher_absent + stats.holiday}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {['present', 'absent', 'teacher_absent', 'proxy', 'holiday', 'clear'].map((option) => {
                                const isActive = currentStatus === option && option !== 'clear';
                                const isClear = option === 'clear';
                                const bgColor = isClear ? 'var(--surface)' : getStatusColor(option);
                                const textColor = isClear ? 'var(--text-secondary)' : '#fff';
                                const label = option === 'present' ? 'Present'
                                            : option === 'absent' ? 'Absent'
                                            : option === 'teacher_absent' ? 'Cancelled'
                                            : option === 'proxy' ? 'Proxy'
                                            : option === 'holiday' ? 'Holiday'
                                            : 'Clear';

                                return (
                                  <TooltipButton
                                    key={option}
                                    tooltip={optionTooltips[option] || ''}
                                    onClick={() => {
                                      if (isClear) {
                                        clearSlot(subject.slot.id, subject.code, selectedDay);
                                        return;
                                      }
                                      if (option === 'holiday') {
                                        markDayHoliday(selectedDay, dayData.classes);
                                      } else {
                                        markSlot(subject.slot.id, subject.code, selectedDay, option);
                                      }
                                    }}
                                    style={{
                                      backgroundColor: isActive ? bgColor : 'var(--card)',
                                      color: isActive ? '#fff' : 'var(--text-secondary)',
                                      border: isActive ? 'none' : '1px solid var(--border)',
                                      padding: '4px 12px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '500',
                                      transition: 'transform 0.15s, background-color 0.15s',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                    className="hover:scale-105"
                                    active={isActive}
                                  >
                                    {label}
                                  </TooltipButton>
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
            })()}
          </div>
        </div>
      )}

      {/* Extra Class Modal */}
      {showExtraClassModal && selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(44, 37, 32, 0.5)' }}
          onClick={() => setShowExtraClassModal(false)}
        >
          <div
            className="max-w-sm w-full rounded-lg shadow-xl p-6"
            style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">➕ Add Extra Class</h3>
              <button onClick={() => setShowExtraClassModal(false)} className="p-1 rounded hover:bg-opacity-10" style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              Select a theory subject to add on {selectedDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {getTheorySubjects().map(subj => (
                <button
                  key={subj.subject_code}
                  onClick={() => addExtraClass(subj.subject_code, selectedDay)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-opacity-10 flex items-center justify-between"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <span className="font-medium">{subj.subject_code}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{subj.subject_name}</span>
                </button>
              ))}
              {getTheorySubjects().length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No theory subjects found. Add subjects in Timetable Builder first.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal – only for delete extra class */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(44, 37, 32, 0.6)' }}
          onClick={() => setShowConfirmModal(null)}
        >
          <div
            className="max-w-sm w-full rounded-lg shadow-xl p-6"
            style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">⚠️ Confirm Action</h3>
              <button onClick={() => setShowConfirmModal(null)} className="p-1 rounded hover:bg-opacity-10" style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {showConfirmModal.message}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="flex-1 px-4 py-2 rounded text-sm font-medium"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedDay) return;
                  const { slotId, date } = showConfirmModal.payload;
                  await deleteExtraClass(slotId, date);
                  setShowConfirmModal(null);
                }}
                className="flex-1 px-4 py-2 rounded text-sm font-medium"
                style={{ backgroundColor: 'var(--danger)', color: '#fff' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

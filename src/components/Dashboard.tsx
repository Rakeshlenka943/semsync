import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Header } from './Header';
import { AlertBanner } from './AlertBanner';
import { DailyGlide } from './DailyGlide';
import { Deadlines } from './Deadlines';
import { StickyNote } from './StickyNote';

interface DashboardProps {
  onNavigate: (page: 'timetable' | 'heatmap' | 'syllabus' | 'deadlines' | 'exams' | 'semester' | 'whisper' | 'theme' | 'settings' | 'dashboard') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [alerts, setAlerts] = useState<Array<{type: 'exam' | 'deadline' | 'attendance', message: string, urgency: 'info' | 'warning' | 'danger', id: string}>>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const fetchAlerts = async () => {
      const newAlerts: any[] = [];
      const { data: exams } = await supabase
        .from('exam_dates')
        .select('*')
        .eq('user_roll', user.roll_number)
        .order('date', { ascending: true });
      if (exams) {
        const today = new Date();
        exams.forEach((exam: any) => {
          const examDate = new Date(exam.date);
          const daysDiff = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 14 && daysDiff >= 0) {
            let urgency: 'info' | 'warning' | 'danger' = 'info';
            if (daysDiff <= 3) urgency = 'danger';
            else if (daysDiff <= 7) urgency = 'warning';
            newAlerts.push({
              type: 'exam', id: `exam-${exam.id}`,
              message: `📚 ${exam.subject} ${exam.type} exam in ${daysDiff} day${daysDiff > 1 ? 's' : ''}. Start preparing!`,
              urgency
            });
          }
        });
      }
      const { data: deadlines } = await supabase
        .from('deadlines')
        .select('*')
        .eq('user_roll', user.roll_number)
        .eq('is_completed', false)
        .order('due_date', { ascending: true });
      if (deadlines) {
        const today = new Date();
        deadlines.forEach((dl: any) => {
          const dueDate = new Date(dl.due_date);
          const hoursDiff = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60);
          if (hoursDiff <= 24 && hoursDiff >= 0) {
            newAlerts.push({
              type: 'deadline', id: `deadline-${dl.id}`,
              message: `⏰ ${dl.subject_name} ${dl.bounty_type} due in ${Math.ceil(hoursDiff)} hours!`,
              urgency: 'danger'
            });
          }
        });
      }
      setAlerts(newAlerts);
    };
    fetchAlerts();
  }, [user]);

  useEffect(() => {
    const saved = localStorage.getItem('semsync-dismissed-alerts');
    if (saved) {
      try { setDismissedAlerts(new Set(JSON.parse(saved))); } catch {}
    }
  }, []);

  const dismissAlert = (id: string) => {
    const newSet = new Set(dismissedAlerts);
    newSet.add(id);
    setDismissedAlerts(newSet);
    localStorage.setItem('semsync-dismissed-alerts', JSON.stringify([...newSet]));
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));

  const menuItems = [
    { icon: '📅', label: 'Timetable Builder', page: 'timetable' },
    { icon: '📊', label: 'Monthly Heatmap', page: 'heatmap' },
    { icon: '📚', label: 'Syllabus Tracker', page: 'syllabus' },
    { icon: '📝', label: 'Deadlines Manager', page: 'deadlines' },
    { icon: '📅', label: 'Exam Management', page: 'exams' },
    { icon: '📅', label: 'Semester Dates', page: 'semester' },
    { icon: '🗣️', label: 'Whisper Network', page: 'whisper' },
    { icon: '🎨', label: 'Theme Forge', page: 'theme' },
    { icon: '⚙️', label: 'Settings & Account', page: 'settings' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <Header onMenuClick={() => setMenuOpen(true)} />
      {visibleAlerts.map((alert) => (
        <AlertBanner key={alert.id} type={alert.type} urgency={alert.urgency} message={alert.message} onDismiss={() => dismissAlert(alert.id)} />
      ))}
      <div className="max-w-2xl mx-auto pb-20 px-2 sm:px-4">
        <DailyGlide />
        <Deadlines />
        <StickyNote />
      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(44, 37, 32, 0.3)' }} onClick={() => setMenuOpen(false)}>
          <div className="w-80 h-full p-6 overflow-y-auto shadow-xl" style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)', borderRight: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.username}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.batch_badge}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>🎯 Target: {user?.attendance_target || 75}%</p>
                </div>
              </div>
            </div>
            <ul className="space-y-1">
              {menuItems.map((item, idx) => (
                <li key={idx}>
                  <button className="w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-3 hover:bg-opacity-10" style={{ color: 'var(--text-primary)' }} onClick={() => { setMenuOpen(false); onNavigate(item.page as any); }}>
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => { setMenuOpen(false); logout(); }} className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-opacity-10 transition" style={{ color: 'var(--danger)' }}>
                <span className="text-lg">🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

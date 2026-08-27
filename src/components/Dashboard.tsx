import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AlertBanner } from './AlertBanner';
import { DailyGlide } from './DailyGlide';
import { Deadlines } from './Deadlines';
import { StickyNote } from './StickyNote';

interface DashboardProps {
  onNavigate: (page: 'timetable' | 'heatmap' | 'syllabus' | 'deadlines' | 'exams' | 'semester' | 'whisper' | 'theme' | 'settings' | 'dashboard') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {visibleAlerts.map((alert) => (
        <AlertBanner key={alert.id} type={alert.type} urgency={alert.urgency} message={alert.message} onDismiss={() => dismissAlert(alert.id)} />
      ))}
      <div className="max-w-2xl mx-auto pb-20 px-2 sm:px-4">
        <DailyGlide />
        <Deadlines />
        <StickyNote />
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle, Circle, Plus, Calendar, AlertTriangle } from 'lucide-react';

interface Deadline {
  id: string;
  subject_name: string;
  bounty_type: 'assignment' | 'quiz' | 'project' | 'custom';
  due_date: string;
  description: string | null;
  is_completed: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  assignment: '📝',
  quiz: '📝',
  project: '📁',
  custom: '⚡',
};

export const Deadlines: React.FC = () => {
  const { user } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    subject_name: '',
    bounty_type: 'assignment' as 'assignment' | 'quiz' | 'project' | 'custom',
    due_date: '',
    description: '',
  });

  useEffect(() => {
    if (!user) return;
    fetchDeadlines();
    fetchSubjects();
  }, [user]);

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('timetable_slots')
      .select('subject_name')
      .eq('user_roll', user?.roll_number)
      .eq('is_active', true);

    if (!error && data) {
      const unique = Array.from(new Set(data.map(s => s.subject_name)));
      setSubjects(unique);
    }
  };

  const fetchDeadlines = async () => {
    if (!user) return;
    
    // Auto-remove deadlines older than 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Delete old deadlines
    await supabase
      .from('deadlines')
      .delete()
      .eq('user_roll', user.roll_number)
      .lt('due_date', sevenDaysAgo.toISOString())
      .eq('is_completed', false);

    // Fetch deadlines due within 7 days
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data, error } = await supabase
      .from('deadlines')
      .select('*')
      .eq('user_roll', user.roll_number)
      .eq('is_completed', false)
      .gte('due_date', now.toISOString())
      .lte('due_date', sevenDaysFromNow.toISOString())
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching deadlines:', error);
      setLoading(false);
      return;
    }

    setDeadlines(data || []);
    setLoading(false);
  };

  const toggleComplete = async (id: string) => {
    const { error } = await supabase
      .from('deadlines')
      .update({ is_completed: true })
      .eq('id', id);

    if (!error) {
      setDeadlines(prev => prev.filter(d => d.id !== id));
    }
  };

  const addDeadline = async () => {
    if (!user || !formData.subject_name || !formData.due_date) {
      alert('Please fill in all required fields.');
      return;
    }

    const payload = {
      user_roll: user.roll_number,
      subject_name: formData.subject_name,
      bounty_type: formData.bounty_type,
      due_date: formData.due_date,
      description: formData.description || null,
      is_completed: false,
    };

    const { error } = await supabase
      .from('deadlines')
      .insert(payload);

    if (error) {
      console.error('Error adding deadline:', error);
      alert('Failed to add deadline. Please try again.');
      return;
    }

    setFormData({ subject_name: '', bounty_type: 'assignment', due_date: '', description: '' });
    setShowAddModal(false);
    fetchDeadlines();
  };

  const getTimeDisplay = (dueDate: string): string => {
    const now = new Date();
    const due = new Date(dueDate);
    const hoursDiff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursDiff < 0) return '⏰ Overdue!';
    if (hoursDiff < 1) return '⏰ Due in < 1 hour!';
    if (hoursDiff < 24) return `⏰ Due in ${hoursDiff} hours`;
    const days = Math.floor(hoursDiff / 24);
    return `${days} day${days > 1 ? 's' : ''} left`;
  };

  const isUrgent = (dueDate: string): boolean => {
    const hoursDiff = (new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return hoursDiff < 72 && hoursDiff > 0;
  };

  if (loading) {
    return <div className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading deadlines...</div>;
  }

  return (
    <div className="p-4 space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>📋 Pending Deadlines</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-1 rounded-full hover:bg-opacity-10 transition"
          style={{ color: 'var(--accent)' }}
        >
          <Plus size={20} />
        </button>
      </div>

      {deadlines.length === 0 ? (
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          ✅ No pending deadlines! Stay ahead.
        </div>
      ) : (
        deadlines.map((d) => {
          const urgent = isUrgent(d.due_date);
          return (
            <div
              key={d.id}
              className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-opacity-5 transition"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: urgent ? 'var(--danger)' : 'var(--border)',
                boxShadow: urgent ? '0 0 0 1px var(--danger)' : 'none',
              }}
              onClick={() => toggleComplete(d.id)}
            >
              <Circle size={18} style={{ color: urgent ? 'var(--danger)' : 'var(--text-muted)' }} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {TYPE_ICONS[d.bounty_type] || '📝'} {d.subject_name}
                  </span>
                  {urgent && <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />}
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: urgent ? 'var(--danger)' : 'var(--text-secondary)' }}>
                  <Calendar size={12} className="inline" />
                  {new Date(d.due_date).toLocaleDateString()} • {getTimeDisplay(d.due_date)}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Quick Add Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(44, 37, 32, 0.6)' }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="max-w-sm w-full rounded-lg shadow-xl p-6"
            style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">➕ Add Deadline</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-opacity-10" style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.subject_name}
                  onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  required
                >
                  <option value="">Select subject...</option>
                  {subjects.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Type <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['assignment', 'quiz', 'project', 'custom'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, bounty_type: type as any })}
                      className="px-3 py-1 rounded text-xs transition"
                      style={{
                        backgroundColor: formData.bounty_type === type ? 'var(--accent)' : 'var(--surface)',
                        color: formData.bounty_type === type ? '#fff' : 'var(--text-secondary)',
                        border: formData.bounty_type === type ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Due Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
              </div>

              <button
                onClick={addDeadline}
                className="w-full py-2 rounded font-medium"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                Add Deadline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

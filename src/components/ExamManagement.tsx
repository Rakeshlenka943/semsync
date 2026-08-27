import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus, X, Calendar, Trash2, AlertCircle } from 'lucide-react';

interface ExamManagementProps {
  onBack: () => void;
}

interface Exam {
  id: string;
  subject: string;
  date: string;
  type: 'mid' | 'end' | 'lab';
}

interface TimetableSlot {
  subject_name: string;
  subject_code: string;
}

const EXAM_TYPES: Record<string, { label: string; color: string }> = {
  mid: { label: 'Mid-Sem', color: '#ffc107' },
  end: { label: 'End-Sem', color: '#f44336' },
  lab: { label: 'Lab Test', color: '#4caf50' },
};

export const ExamManagement: React.FC<ExamManagementProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    subject: '',
    type: 'mid' as 'mid' | 'end' | 'lab',
    date: '',
  });

  useEffect(() => {
    if (!user) return;
    fetchExams();
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

  const fetchExams = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('exam_dates')
      .select('*')
      .eq('user_roll', user.roll_number)
      .order('date', { ascending: true });
    if (error) {
      console.error('Error fetching exams:', error);
      setLoading(false);
      return;
    }
    setExams(data || []);
    setLoading(false);
  };

  const addExam = async () => {
    if (!user || !formData.subject || !formData.date) {
      alert('Please fill in all fields.');
      return;
    }
    const payload = {
      user_roll: user.roll_number,
      subject: formData.subject,
      type: formData.type,
      date: formData.date,
    };
    const { error } = await supabase
      .from('exam_dates')
      .insert(payload);
    if (error) {
      console.error('Error adding exam:', error);
      alert('Failed to add exam. Please try again.');
      return;
    }
    setFormData({ subject: '', type: 'mid', date: '' });
    setShowAddModal(false);
    fetchExams();
  };

  const deleteExam = async (id: string) => {
    if (!window.confirm('Delete this exam?')) return;
    const { error } = await supabase
      .from('exam_dates')
      .delete()
      .eq('id', id);
    if (!error) {
      fetchExams();
    }
  };

  const getDaysUntil = (dateStr: string): number => {
    const now = new Date();
    const examDate = new Date(dateStr);
    const diff = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>Loading exams...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded hover:bg-opacity-10" style={{ color: 'var(--text-primary)' }}>
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>📅 Exam Management</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded text-sm flex items-center gap-1"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={18} /> Add Exam
        </button>
      </div>

      {/* Exams List */}
      <div className="space-y-3">
        {exams.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            No exams added yet. Click "Add Exam" to schedule one.
          </div>
        ) : (
          exams.map((exam) => {
            const daysUntil = getDaysUntil(exam.date);
            const isUrgent = daysUntil <= 7 && daysUntil >= 0;
            const isOverdue = daysUntil < 0;
            return (
              <div
                key={exam.id}
                className="rounded-lg p-4 flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--card)',
                  border: `1px solid ${isUrgent ? 'var(--danger)' : isOverdue ? 'var(--danger)' : 'var(--border)'}`,
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{exam.subject}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: EXAM_TYPES[exam.type].color,
                        color: '#fff',
                      }}
                    >
                      {EXAM_TYPES[exam.type].label}
                    </span>
                    {isUrgent && !isOverdue && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(196, 90, 90, 0.15)', color: 'var(--danger)' }}>
                        ⚠️ In {daysUntil} day{daysUntil > 1 ? 's' : ''}
                      </span>
                    )}
                    {isOverdue && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(196, 90, 90, 0.15)', color: 'var(--danger)' }}>
                        Overdue
                      </span>
                    )}
                  </div>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    <Calendar size={14} className="inline mr-1" />
                    {new Date(exam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <button
                  onClick={() => deleteExam(exam.id)}
                  className="p-1 rounded hover:bg-opacity-10"
                  style={{ color: 'var(--danger)' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add Exam Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(44, 37, 32, 0.6)' }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="max-w-md w-full rounded-lg shadow-xl p-6"
            style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">➕ Add Exam</h3>
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
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  required
                >
                  <option value="">Select subject...</option>
                  {subjects.map((subj) => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Exam Type <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(EXAM_TYPES).map(([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => setFormData({ ...formData, type: key as any })}
                      className="px-3 py-1 rounded text-sm transition"
                      style={{
                        backgroundColor: formData.type === key ? 'var(--accent)' : 'var(--surface)',
                        color: formData.type === key ? '#fff' : 'var(--text-secondary)',
                        border: formData.type === key ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  The day before and after will be automatically treated as holidays.
                </p>
              </div>

              <button
                onClick={addExam}
                className="w-full py-2 rounded font-medium"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                Add Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

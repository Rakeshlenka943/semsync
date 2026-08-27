import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, Plus, X, CheckCircle, Circle, Calendar, 
  Filter, Edit2, Trash2, Clock, AlertTriangle 
} from 'lucide-react';

interface DeadlinesManagerProps {
  onBack: () => void;
}

interface Deadline {
  id: string;
  subject_name: string;
  bounty_type: 'assignment' | 'quiz' | 'project' | 'custom';
  due_date: string;
  description: string | null;
  is_completed: boolean;
  created_at: string;
}

interface TimetableSlot {
  subject_code: string;
  subject_name: string;
  is_lab: boolean;
}

const DEADLINE_TYPES = ['assignment', 'quiz', 'project', 'custom'];
const TYPE_LABELS: Record<string, string> = {
  assignment: '📝 Assignment',
  quiz: '📝 Quiz',
  project: '📁 Project',
  custom: '⚡ Custom',
};

function getUrgencyColor(dueDate: string): string {
  const now = new Date();
  const due = new Date(dueDate);
  const hoursDiff = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursDiff < 0) return 'var(--danger)';
  if (hoursDiff < 24) return 'var(--danger)';
  if (hoursDiff < 72) return 'var(--warning)';
  return 'var(--text-secondary)';
}

export const DeadlinesManager: React.FC<DeadlinesManagerProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [filteredDeadlines, setFilteredDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [subjects, setSubjects] = useState<TimetableSlot[]>([]);

  // Add/Edit form state
  const [formData, setFormData] = useState({
    id: '',
    subject_name: '',
    bounty_type: 'assignment' as 'assignment' | 'quiz' | 'project' | 'custom',
    due_date: '',
    description: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchDeadlines();
    fetchSubjects();
  }, [user]);

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('timetable_slots')
      .select('subject_code, subject_name, is_lab')
      .eq('user_roll', user?.roll_number)
      .eq('is_active', true);

    if (!error && data) {
      // Deduplicate subjects
      const unique = Array.from(
        new Map(data.map(s => [s.subject_name, s])).values()
      );
      setSubjects(unique);
    }
  };

  const fetchDeadlines = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('deadlines')
      .select('*')
      .eq('user_roll', user.roll_number)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching deadlines:', error);
      setLoading(false);
      return;
    }

    // Auto-remove deadlines older than 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeDeadlines = data?.filter(d => {
      const dueDate = new Date(d.due_date);
      return dueDate >= sevenDaysAgo && !d.is_completed;
    }) || [];

    setDeadlines(activeDeadlines);
    setFilteredDeadlines(activeDeadlines);
    setLoading(false);
  };

  const handleAddDeadline = async () => {
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

    let error;
    if (isEditing && formData.id) {
      const { error: updateError } = await supabase
        .from('deadlines')
        .update(payload)
        .eq('id', formData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('deadlines')
        .insert(payload);
      error = insertError;
    }

    if (error) {
      console.error('Error saving deadline:', error);
      alert('Failed to save deadline. Please try again.');
      return;
    }

    resetForm();
    fetchDeadlines();
  };

  const toggleComplete = async (id: string) => {
    const { error } = await supabase
      .from('deadlines')
      .update({ is_completed: true })
      .eq('id', id);

    if (!error) {
      fetchDeadlines();
    }
  };

  const deleteDeadline = async (id: string) => {
    if (!window.confirm('Delete this deadline?')) return;
    const { error } = await supabase
      .from('deadlines')
      .delete()
      .eq('id', id);

    if (!error) {
      fetchDeadlines();
    }
  };

  const startEdit = (deadline: Deadline) => {
    setFormData({
      id: deadline.id,
      subject_name: deadline.subject_name,
      bounty_type: deadline.bounty_type,
      due_date: deadline.due_date.slice(0, 16),
      description: deadline.description || '',
    });
    setIsEditing(true);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      id: '',
      subject_name: '',
      bounty_type: 'assignment',
      due_date: '',
      description: '',
    });
    setIsEditing(false);
    setShowAddModal(false);
  };

  const getTypeLabel = (type: string) => TYPE_LABELS[type] || type;

  const typeOptions = [
    { value: 'all', label: 'All' },
    { value: 'assignment', label: '📝 Assignment' },
    { value: 'quiz', label: '📝 Quiz' },
    { value: 'project', label: '📁 Project' },
    { value: 'custom', label: '⚡ Custom' },
  ];

  if (loading) {
    return <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>Loading deadlines...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded hover:bg-opacity-10" style={{ color: 'var(--text-primary)' }}>
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>📝 Deadlines Manager</h1>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="px-4 py-2 rounded text-sm flex items-center gap-1"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={18} /> Add
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {typeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterType(opt.value)}
            className="px-3 py-1 rounded text-xs transition"
            style={{
              backgroundColor: filterType === opt.value ? 'var(--accent)' : 'var(--surface)',
              color: filterType === opt.value ? '#fff' : 'var(--text-secondary)',
              border: filterType === opt.value ? 'none' : '1px solid var(--border)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Deadlines List */}
      <div className="space-y-2">
        {deadlines
          .filter(d => filterType === 'all' || d.bounty_type === filterType)
          .map((deadline) => {
            const isUrgent = new Date(deadline.due_date) < new Date(Date.now() + 72 * 60 * 60 * 1000);
            return (
              <div
                key={deadline.id}
                className="rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-opacity-5 transition"
                style={{
                  backgroundColor: 'var(--card)',
                  border: `1px solid ${isUrgent ? 'var(--danger)' : 'var(--border)'}`,
                }}
                onClick={() => toggleComplete(deadline.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {deadline.subject_name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                      {getTypeLabel(deadline.bounty_type)}
                    </span>
                    {isUrgent && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(196, 90, 90, 0.15)', color: 'var(--danger)' }}>
                        ⚠️ Urgent
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm mt-1">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <Calendar size={14} className="inline mr-1" />
                      {new Date(deadline.due_date).toLocaleDateString()} {new Date(deadline.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {deadline.description && (
                      <span style={{ color: 'var(--text-muted)' }}>• {deadline.description}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => startEdit(deadline)}
                    className="p-1 rounded hover:bg-opacity-10"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => deleteDeadline(deadline.id)}
                    className="p-1 rounded hover:bg-opacity-10"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}

        {deadlines.filter(d => filterType === 'all' || d.bounty_type === filterType).length === 0 && (
          <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            {filterType === 'all' ? 'No deadlines yet. Add one!' : `No ${filterType} deadlines.`}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(44, 37, 32, 0.6)' }}
          onClick={resetForm}
        >
          <div
            className="max-w-md w-full rounded-lg shadow-xl p-6"
            style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                {isEditing ? '✏️ Edit Deadline' : '➕ Add Deadline'}
              </h3>
              <button onClick={resetForm} className="p-1 rounded hover:bg-opacity-10" style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Subject / Lab <span className="text-red-500">*</span>
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
                  <option value="">Select a subject...</option>
                  {subjects.map((subj) => (
                    <option key={subj.subject_name} value={subj.subject_name}>
                      {subj.subject_name} {subj.is_lab ? '🧪' : ''} ({subj.subject_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Type <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEADLINE_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, bounty_type: type as any })}
                      className="px-3 py-1 rounded text-sm transition"
                      style={{
                        backgroundColor: formData.bounty_type === type ? 'var(--accent)' : 'var(--surface)',
                        color: formData.bounty_type === type ? '#fff' : 'var(--text-secondary)',
                        border: formData.bounty_type === type ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      {TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
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

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Description <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="e.g., Submit via Google Classroom"
                />
              </div>

              <button
                onClick={handleAddDeadline}
                className="w-full py-2 rounded font-medium"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                {isEditing ? 'Update' : 'Add'} Deadline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

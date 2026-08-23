import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, Circle, Plus } from 'lucide-react';

interface Deadline {
  id: string;
  subject_name: string;
  bounty_type: 'assignment' | 'quiz';
  due_date: string;
  description: string | null;
  is_completed: boolean;
}

export const Deadlines: React.FC = () => {
  const { user } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeadlines = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('deadlines')
        .select('*')
        .eq('user_roll', user.roll_number)
        .eq('is_completed', false)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching deadlines:', error);
      } else {
        setDeadlines(data || []);
      }
      setLoading(false);
    };
    fetchDeadlines();
  }, [user]);

  const toggleComplete = async (id: string) => {
    const { error } = await supabase
      .from('deadlines')
      .update({ is_completed: true })
      .eq('id', id);
    if (!error) {
      setDeadlines(prev => prev.filter(d => d.id !== id));
    }
  };

  if (loading) return <div className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading deadlines...</div>;

  if (deadlines.length === 0) {
    return (
      <div className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
        ✅ No pending deadlines! Stay ahead.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>📋 Pending Deadlines</h3>
        <button className="p-1 rounded-full hover:bg-opacity-10 hover:bg-black transition">
          <Plus size={20} style={{ color: 'var(--accent)' }} />
        </button>
      </div>
      {deadlines.map((d) => (
        <div
          key={d.id}
          className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-opacity-5 hover:bg-black transition"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
          onClick={() => toggleComplete(d.id)}
        >
          <Circle size={20} style={{ color: 'var(--text-muted)' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {d.subject_name} – {d.bounty_type === 'assignment' ? '📝' : '📝 Quiz'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Due: {new Date(d.due_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

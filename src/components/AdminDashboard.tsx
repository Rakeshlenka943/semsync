import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Users, UserPlus, BookOpen, Plus, X, Trash2 } from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
}

interface Teacher {
  id: string;
  name: string;
  department: string;
}

interface Department {
  id: string;
  name: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [totalUsers, setTotalUsers] = useState(0);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ name: '', department: '' });
  const [newDepartment, setNewDepartment] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    
    // Count total users
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    setTotalUsers(count || 0);

    // Fetch teachers
    const { data: teachersData } = await supabase
      .from('faculty_profiles')
      .select('*')
      .order('name');
    setTeachers(teachersData || []);

    // Fetch departments from departments table
    const { data: deptData } = await supabase
      .from('departments')
      .select('*')
      .order('name');
    setDepartments(deptData || []);

    setLoading(false);
  };

  const addTeacher = async () => {
    if (!newTeacher.name || !newTeacher.department) {
      alert('Please fill in all fields.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('faculty_profiles')
        .insert({ name: newTeacher.name, department: newTeacher.department })
        .select();
      if (error) {
        console.error('Error adding teacher:', error);
        alert(`Failed to add teacher: ${error.message}`);
        return;
      }
      console.log('Teacher added:', data);
      setNewTeacher({ name: '', department: '' });
      setShowAddTeacher(false);
      fetchData();
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred. Check console for details.');
    }
  };

  const deleteTeacher = async (id: string) => {
    if (!window.confirm('Delete this teacher? This will also delete all ratings.')) return;
    const { error } = await supabase
      .from('faculty_profiles')
      .delete()
      .eq('id', id);
    if (!error) fetchData();
  };

  const addDepartment = async () => {
    if (!newDepartment) {
      alert('Please enter a department name.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert({ name: newDepartment.trim() })
        .select();
      if (error) {
        console.error('Error adding department:', error);
        alert(`Failed to add department: ${error.message}`);
        return;
      }
      console.log('Department added:', data);
      setNewDepartment('');
      setShowAddDepartment(false);
      fetchData();
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred. Check console for details.');
    }
  };

  const deleteDepartment = async (id: string) => {
    // Check if any teachers use this department
    const hasTeachers = teachers.some(t => t.department === departments.find(d => d.id === id)?.name);
    if (hasTeachers) {
      alert('Cannot delete department with assigned teachers. Reassign teachers first.');
      return;
    }
    if (!window.confirm('Delete this department?')) return;
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);
    if (!error) fetchData();
  };

  if (loading) {
    return <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>Loading admin dashboard...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 rounded hover:bg-opacity-10" style={{ color: 'var(--text-primary)' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>🛡️ Admin Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <Users size={32} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalUsers}</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Users</div>
        </div>
        <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <UserPlus size={32} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{teachers.length}</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Teachers</div>
        </div>
        <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <BookOpen size={32} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{departments.length}</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Departments</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowAddTeacher(true)}
          className="px-4 py-2 rounded text-sm flex items-center gap-1"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={18} /> Add Teacher
        </button>
        <button
          onClick={() => setShowAddDepartment(true)}
          className="px-4 py-2 rounded text-sm flex items-center gap-1"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          <Plus size={18} /> Add Department
        </button>
      </div>

      {/* Departments List */}
      <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
        <div className="p-3 font-semibold flex justify-between" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}>
          <span>Departments ({departments.length})</span>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {departments.length === 0 ? (
            <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>No departments added yet.</div>
          ) : (
            departments.map((d) => {
              const hasTeachers = teachers.some(t => t.department === d.name);
              return (
                <div key={d.id} className="flex items-center justify-between p-3" style={{ backgroundColor: 'var(--card)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{d.name}</span>
                  <div className="flex items-center gap-2">
                    {hasTeachers && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({teachers.filter(t => t.department === d.name).length} teachers)</span>
                    )}
                    <button
                      onClick={() => deleteDepartment(d.id)}
                      disabled={hasTeachers}
                      className="p-1 rounded hover:bg-opacity-10 disabled:opacity-30"
                      style={{ color: 'var(--danger)' }}
                      title={hasTeachers ? 'Cannot delete: department has teachers' : 'Delete department'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Teachers List */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="p-3 font-semibold" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}>
          Teachers ({teachers.length})
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {teachers.length === 0 ? (
            <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>No teachers added yet.</div>
          ) : (
            teachers.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3" style={{ backgroundColor: 'var(--card)' }}>
                <div>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                  <span className="text-sm ml-2" style={{ color: 'var(--text-secondary)' }}>{t.department}</span>
                </div>
                <button
                  onClick={() => deleteTeacher(t.id)}
                  className="p-1 rounded hover:bg-opacity-10"
                  style={{ color: 'var(--danger)' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Teacher Modal */}
      {showAddTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(44, 37, 32, 0.6)' }} onClick={() => setShowAddTeacher(false)}>
          <div className="max-w-md w-full rounded-lg shadow-xl p-6" style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">➕ Add Teacher</h3>
              <button onClick={() => setShowAddTeacher(false)} className="p-1 rounded hover:bg-opacity-10" style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Teacher Name *</label>
                <input
                  type="text"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  placeholder="Dr. A. Sharma"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Department *</label>
                <select
                  value={newTeacher.department}
                  onChange={(e) => setNewTeacher({ ...newTeacher, department: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                  {departments.length === 0 && <option value="">No departments available. Add one first.</option>}
                </select>
              </div>
              <button onClick={addTeacher} className="w-full py-2 rounded font-medium" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Add Teacher</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showAddDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(44, 37, 32, 0.6)' }} onClick={() => setShowAddDepartment(false)}>
          <div className="max-w-md w-full rounded-lg shadow-xl p-6" style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">🏫 Add Department</h3>
              <button onClick={() => setShowAddDepartment(false)} className="p-1 rounded hover:bg-opacity-10" style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Department Name *</label>
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  placeholder="Computer Science"
                />
              </div>
              <button onClick={addDepartment} className="w-full py-2 rounded font-medium" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Add Department</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

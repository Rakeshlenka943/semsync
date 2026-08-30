import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, User, Calendar, Database, Shield, 
  CheckCircle, AlertTriangle, Download, Upload, 
  X, Loader2, Lock, Target, ChevronRight, BookOpen,
  Edit2, Save, Image, Link, Github, Bot, FileText, FlaskConical, Calculator
} from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

interface UserProfile {
  username: string;
  email: string;
  batch_badge: string;
  academic_cycle: 'physics' | 'chemistry' | null;
  attendance_target: number;
  semester_transitioned: boolean;
  avatar_id: number;
}

interface SemesterDates {
  semester_start: string | null;
  semester_end: string | null;
}

interface SubjectTarget {
  subject_code: string;
  subject_name: string;
  target_percentage: number;
}

const AVATAR_COUNT = 8;
const getAvatarPath = (id: number): string => `/avatars/avatar-${id}.svg`;

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [semesterDates, setSemesterDates] = useState<SemesterDates | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'semester' | 'data' | 'links'>('general');
  const [subjects, setSubjects] = useState<SubjectTarget[]>([]);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [tempTarget, setTempTarget] = useState<number>(75);
  
  // General settings state
  const [target, setTarget] = useState<number>(75);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<number>(1);
  const [avatarSaving, setAvatarSaving] = useState(false);

  // Semester transition state
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [newStartDate, setNewStartDate] = useState<string>('');
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [transitionStep, setTransitionStep] = useState<'confirm' | 'processing' | 'done'>('confirm');

  // Export/Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchSemesterDates();
    fetchSubjectTargets();
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('username, email, batch_badge, academic_cycle, attendance_target, semester_transitioned, avatar_id')
      .eq('roll_number', user?.roll_number)
      .single();
    if (!error && data) {
      setProfile(data);
      setTarget(data.attendance_target || 75);
      setSelectedAvatar(data.avatar_id || 1);
    }
  };

  const fetchSemesterDates = async () => {
    const { data, error } = await supabase
      .from('semester_dates')
      .select('semester_start, semester_end')
      .eq('user_roll', user?.roll_number)
      .single();
    if (!error && data) {
      setSemesterDates(data);
    }
    setLoading(false);
  };

  const fetchSubjectTargets = async () => {
    if (!user) return;
    const { data: targets, error } = await supabase
      .from('subject_attendance_targets')
      .select('*')
      .eq('user_roll', user.roll_number);

    const { data: slots } = await supabase
      .from('timetable_slots')
      .select('subject_code, subject_name')
      .eq('user_roll', user.roll_number)
      .eq('is_active', true);

    if (!slots) return;

    const uniqueSubjects = Array.from(
      new Map(slots.map(s => [s.subject_code, s])).values()
    );

    const subjectTargets = uniqueSubjects.map(s => {
      const existing = targets?.find(t => t.subject_code === s.subject_code);
      return {
        subject_code: s.subject_code,
        subject_name: s.subject_name,
        target_percentage: existing?.target_percentage || target,
      };
    });

    setSubjects(subjectTargets);
  };

  // === GENERAL SETTINGS ===
  const updateTarget = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('users')
      .update({ attendance_target: target })
      .eq('roll_number', user.roll_number);
    if (!error) {
      alert('✅ Global attendance target updated!');
      fetchSubjectTargets();
    } else {
      alert('❌ Failed to update target.');
    }
  };

  const updateSubjectTarget = async (subjectCode: string, newTarget: number) => {
    if (!user) return;
    const { error } = await supabase
      .from('subject_attendance_targets')
      .upsert({
        user_roll: user.roll_number,
        subject_code: subjectCode,
        target_percentage: newTarget,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_roll, subject_code' });

    if (!error) {
      setSubjects(prev => prev.map(s => 
        s.subject_code === subjectCode ? { ...s, target_percentage: newTarget } : s
      ));
      setEditingSubject(null);
    } else {
      alert('❌ Failed to update subject target.');
    }
  };

  const updatePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    }
  };

  // === AVATAR (Optimistic Update) ===
  const updateAvatar = async (avatarId: number) => {
    if (!user) return;
    
    // Optimistic: update UI immediately
    setSelectedAvatar(avatarId);
    if (profile) setProfile({ ...profile, avatar_id: avatarId });
    setAvatarSaving(true);

    // Send to server
    const { error } = await supabase
      .from('users')
      .update({ avatar_id: avatarId })
      .eq('roll_number', user.roll_number);

    if (error) {
      console.error('Avatar update error:', error);
      alert('Failed to update avatar. Please try again.');
      // Revert
      const oldAvatar = profile?.avatar_id || 1;
      setSelectedAvatar(oldAvatar);
      if (profile) setProfile({ ...profile, avatar_id: oldAvatar });
      setAvatarSaving(false);
      return;
    }

    // Refresh the user context to keep everything in sync
    await refreshUser();
    setAvatarSaving(false);
  };

  // === SEMESTER TRANSITION ===
  const handleStartTransition = async () => {
    if (!user || !newStartDate) return;
    setTransitionLoading(true);
    setTransitionStep('processing');

    try {
      await supabase.from('timetable_slots').delete().eq('user_roll', user.roll_number);
      await supabase.from('attendance_logs').delete().eq('user_roll', user.roll_number);
      await supabase.from('syllabus_progress').delete().eq('user_roll', user.roll_number);
      await supabase.from('deadlines').delete().eq('user_roll', user.roll_number);
      await supabase.from('exam_dates').delete().eq('user_roll', user.roll_number);
      await supabase.from('subject_attendance_targets').delete().eq('user_roll', user.roll_number);

      const newCycle = profile?.academic_cycle === 'physics' ? 'chemistry' : 'physics';
      await supabase
        .from('users')
        .update({ 
          academic_cycle: newCycle,
          semester_transitioned: true 
        })
        .eq('roll_number', user.roll_number);

      await supabase
        .from('semester_dates')
        .update({ 
          semester_start: newStartDate,
          semester_end: null
        })
        .eq('user_roll', user.roll_number);

      setTransitionStep('done');
      setTimeout(() => {
        setShowTransitionModal(false);
        setTransitionStep('confirm');
        setTransitionLoading(false);
        fetchProfile();
        fetchSemesterDates();
        fetchSubjectTargets();
        alert('🎉 Semester transition complete!');
      }, 1500);

    } catch (error) {
      console.error('Transition error:', error);
      alert('❌ Failed to transition semester.');
      setTransitionLoading(false);
      setTransitionStep('confirm');
    }
  };

  // === EXPORT DATA ===
  const exportData = async () => {
    if (!user) return;
    const tables = ['timetable_slots', 'attendance_logs', 'deadlines', 'syllabus_progress', 'exam_dates', 'subject_attendance_targets'];
    const data: any = { user_roll: user.roll_number, exported_at: new Date().toISOString() };
    
    for (const table of tables) {
      const { data: rows } = await supabase
        .from(table)
        .select('*')
        .eq('user_roll', user.roll_number);
      data[table] = rows || [];
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `semsync-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // === IMPORT DATA ===
  const importData = async () => {
    if (!importFile || !user) return;
    setImportLoading(true);
    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      
      if (data.user_roll !== user.roll_number) {
        alert('❌ This backup belongs to a different user.');
        setImportLoading(false);
        return;
      }

      const tables = ['timetable_slots', 'attendance_logs', 'deadlines', 'syllabus_progress', 'exam_dates', 'subject_attendance_targets'];
      for (const table of tables) {
        if (data[table] && data[table].length > 0) {
          await supabase.from(table).delete().eq('user_roll', user.roll_number);
          const { error } = await supabase.from(table).insert(data[table]);
          if (error) console.error(`Error importing ${table}:`, error);
        }
      }

      alert('✅ Data imported successfully! Refreshing...');
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      alert('❌ Failed to import data.');
    }
    setImportLoading(false);
    setImportFile(null);
  };

  if (loading) {
    return <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>Loading settings...</div>;
  }

  const isSemesterEnded = semesterDates?.semester_end && new Date(semesterDates.semester_end) < new Date();

  // Helper: open link in new tab
  const openLink = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 rounded hover:bg-opacity-10" style={{ color: 'var(--text-primary)' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>⚙️ Settings & Account</h1>
      </div>

      <div className="flex gap-2 mb-6 border-b overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
        {[
          { id: 'general', label: 'General', icon: User },
          { id: 'semester', label: 'Semester', icon: Calendar },
          { id: 'data', label: 'Data', icon: Database },
          { id: 'links', label: 'Links', icon: Link },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="px-4 py-2 flex items-center gap-2 text-sm font-medium border-b-2 transition whitespace-nowrap"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                borderColor: isActive ? 'var(--accent)' : 'transparent',
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Profile Info */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>👤 Profile</h3>
            <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <p><strong>Username:</strong> {profile?.username}</p>
              <p><strong>Email:</strong> {profile?.email}</p>
              <p><strong>Batch:</strong> {profile?.batch_badge}</p>
              <p><strong>Cycle:</strong> {profile?.academic_cycle}</p>
            </div>
          </div>

          {/* Profile Picture */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
              <Image size={18} /> Profile Picture
            </h3>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2" style={{ borderColor: 'var(--accent)' }}>
                <img
                  src={getAvatarPath(selectedAvatar)}
                  alt="avatar"
                  className="w-full h-full object-cover"
                  key={selectedAvatar}
                />
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Choose a style:</p>
                {avatarSaving && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Saving...</span>}
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((id) => (
                <button
                  key={id}
                  onClick={() => updateAvatar(id)}
                  className={`w-full aspect-square rounded-full overflow-hidden border-2 transition ${
                    selectedAvatar === id ? 'border-accent ring-2 ring-accent ring-offset-2' : 'border-transparent'
                  }`}
                  style={{ borderColor: selectedAvatar === id ? 'var(--accent)' : 'var(--border)' }}
                >
                  <img
                    src={getAvatarPath(id)}
                    alt={`Avatar ${id}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Global Attendance Target */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
              <Target size={18} /> Global Attendance Target
            </h3>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              This is the default target for all subjects. You can override individual subjects below.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="60"
                max="95"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span className="font-bold text-lg" style={{ color: 'var(--accent)' }}>{target}%</span>
              <button
                onClick={updateTarget}
                className="px-3 py-1 rounded text-sm"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                Update
              </button>
            </div>
          </div>

          {/* Per-Subject Targets */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
              <BookOpen size={18} /> Subject-Specific Targets
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Set custom targets for individual subjects. Leave as default to use the global target.
            </p>
            <div className="space-y-2">
              {subjects.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No subjects found. Add a timetable first.</p>
              ) : (
                subjects.map((subj) => {
                  const isEditing = editingSubject === subj.subject_code;
                  const isCustom = subj.target_percentage !== target;
                  return (
                    <div
                      key={subj.subject_code}
                      className="flex items-center justify-between p-2 rounded"
                      style={{ backgroundColor: isCustom ? 'rgba(124, 165, 140, 0.1)' : 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{subj.subject_name}</span>
                        {isCustom && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                            Custom: {subj.target_percentage}%
                          </span>
                        )}
                        {!isCustom && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(Global: {target}%)</span>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="50"
                            max="100"
                            value={tempTarget}
                            onChange={(e) => setTempTarget(Number(e.target.value))}
                            className="w-16 px-2 py-1 border rounded text-center text-sm"
                            style={{
                              backgroundColor: 'var(--bg)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-primary)',
                            }}
                          />
                          <button
                            onClick={() => updateSubjectTarget(subj.subject_code, tempTarget)}
                            className="p-1 rounded hover:bg-opacity-10"
                            style={{ color: 'var(--success)' }}
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => setEditingSubject(null)}
                            className="p-1 rounded hover:bg-opacity-10"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingSubject(subj.subject_code);
                            setTempTarget(subj.target_percentage);
                          }}
                          className="p-1 rounded hover:bg-opacity-10"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Change Password */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
              <Lock size={18} /> Change Password
            </h3>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="New Password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
              {passwordError && <div className="text-sm" style={{ color: 'var(--danger)' }}>{passwordError}</div>}
              {passwordSuccess && <div className="text-sm" style={{ color: 'var(--success)' }}>✅ Password updated!</div>}
              <button
                onClick={updatePassword}
                className="px-4 py-2 rounded text-sm"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'semester' && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>📅 Semester Status</h3>
            <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <p><strong>Start:</strong> {semesterDates?.semester_start ? new Date(semesterDates.semester_start).toLocaleDateString() : 'Not set'}</p>
              <p><strong>End:</strong> {semesterDates?.semester_end ? new Date(semesterDates.semester_end).toLocaleDateString() : 'Not set'}</p>
              <p><strong>Cycle:</strong> {profile?.academic_cycle}</p>
              <p><strong>Transitioned:</strong> {profile?.semester_transitioned ? '✅ Yes' : '❌ No'}</p>
            </div>
          </div>

          {isSemesterEnded && !profile?.semester_transitioned && (
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4caf50' }}>
              <h3 className="font-semibold flex items-center gap-2" style={{ color: '#4caf50' }}>
                <AlertTriangle size={18} /> Semester Ended!
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Your semester has ended. Click below to start the next semester.
              </p>
              <button
                onClick={() => setShowTransitionModal(true)}
                className="mt-3 px-4 py-2 rounded text-sm font-medium"
                style={{ backgroundColor: '#4caf50', color: '#fff' }}
              >
                🚀 Start Next Semester
              </button>
            </div>
          )}

          {profile?.semester_transitioned && (
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(33, 150, 243, 0.1)', border: '1px solid #2196f3' }}>
              <p className="text-sm" style={{ color: '#2196f3' }}>
                ✅ You have already transitioned to the new semester. Enjoy!
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
              <Download size={18} /> Export Data
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Download all your data as a JSON file.
            </p>
            <button
              onClick={exportData}
              className="mt-2 px-4 py-2 rounded text-sm flex items-center gap-2"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              <Download size={16} /> Export Backup
            </button>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
              <Upload size={18} /> Import Data
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Restore from a previously exported JSON file.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="text-sm" style={{ color: 'var(--text-secondary)' }}
              />
              <button
                onClick={importData}
                disabled={!importFile || importLoading}
                className="px-4 py-2 rounded text-sm disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: 'var(--success)', color: '#fff' }}
              >
                {importLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Import
              </button>
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(196, 90, 90, 0.1)', border: '1px solid var(--danger)' }}>
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--danger)' }}>
              <Shield size={18} /> Danger Zone
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              This will permanently delete your account and all associated data. This cannot be undone.
            </p>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete your account? This is permanent.')) {
                  alert('Account deletion is not implemented in this demo.');
                }
              }}
              className="mt-2 px-4 py-2 rounded text-sm"
              style={{ backgroundColor: 'var(--danger)', color: '#fff' }}
            >
              🗑️ Delete Account
            </button>
          </div>
        </div>
      )}

      {activeTab === 'links' && (
        <div className="space-y-6">
          {/* About / Version */}
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              SemSync v<span className="font-bold" style={{ color: 'var(--accent)' }}>3.14.159</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Built with ❤️ by Rakesh & Omm
            </p>
          </div>

          {/* GitHub Profiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => openLink('https://github.com/Rakeshlenka943/')}
              className="p-4 rounded-lg border hover:bg-opacity-5 transition flex items-center gap-3 text-left"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
                <Github size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Rakesh Lenka</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@Rakeshlenka943</p>
              </div>
              <ChevronRight size={18} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
            </button>

            <button
              onClick={() => openLink('https://github.com/OmmPradhan-debug')}
              className="p-4 rounded-lg border hover:bg-opacity-5 transition flex items-center gap-3 text-left"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
                <Github size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Omm Pradhan</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@OmmPradhan-debug</p>
              </div>
              <ChevronRight size={18} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          {/* Useful Links */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Link size={18} /> Useful Links
            </h3>
            <div className="space-y-2">
              {/* Notes Bot */}
              <button
                onClick={() => openLink('https://t.me/WizofNotes_bot')}
                className="w-full p-3 rounded-lg border hover:bg-opacity-5 transition flex items-center gap-3 text-left"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 136, 204, 0.15)' }}>
                  <Bot size={16} style={{ color: '#0088cc' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>@WizofNotes_bot</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Telegram bot for notes</p>
                </div>
                <ChevronRight size={16} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
              </button>

              {/* Cover Page Editor */}
              <button
                onClick={() => openLink('https://hiteshpanigrahi.github.io/LabRecord_CoverPageEditor_App/')}
                className="w-full p-3 rounded-lg border hover:bg-opacity-5 transition flex items-center gap-3 text-left"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(124, 165, 140, 0.15)' }}>
                  <FileText size={16} style={{ color: 'var(--success)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Cover Page Editor</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Lab Records & Assignments</p>
                </div>
                <ChevronRight size={16} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
              </button>

              {/* Physics Lab Assistant */}
              <button
                onClick={() => openLink('https://ommpradhan-debug.github.io/Virtual-Physics-Lab-Experiment/')}
                className="w-full p-3 rounded-lg border hover:bg-opacity-5 transition flex items-center gap-3 text-left"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 123, 90, 0.15)' }}>
                  <FlaskConical size={16} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Physics Lab Assistant</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Virtual Physics Lab Experiments</p>
                </div>
                <ChevronRight size={16} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
              </button>

              {/* SGPA Calculator */}
              <button
                onClick={() => openLink('https://sgpacalculatoroutr.tiiny.site/index.html')}
                className="w-full p-3 rounded-lg border hover:bg-opacity-5 transition flex items-center gap-3 text-left"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(212, 167, 74, 0.15)' }}>
                  <Calculator size={16} style={{ color: 'var(--warning)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>SGPA Calculator</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>OUTR SGPA Calculator</p>
                </div>
                <ChevronRight size={16} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transition Modal */}
      {showTransitionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(44, 37, 32, 0.6)' }}
          onClick={() => !transitionLoading && setShowTransitionModal(false)}
        >
          <div
            className="max-w-md w-full rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {transitionStep === 'confirm' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold" style={{ color: 'var(--danger)' }}>⚠️ Start Next Semester</h3>
                  <button onClick={() => setShowTransitionModal(false)} className="p-1 rounded hover:bg-opacity-10" style={{ color: 'var(--text-muted)' }}>
                    <X size={24} />
                  </button>
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  This will permanently delete the following data from your current semester:
                </p>
                <ul className="space-y-2 mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li className="flex items-center gap-2">🗑️ <span>Timetable (all subjects)</span></li>
                  <li className="flex items-center gap-2">🗑️ <span>Attendance logs</span></li>
                  <li className="flex items-center gap-2">🗑️ <span>Syllabus progress</span></li>
                  <li className="flex items-center gap-2">🗑️ <span>Deadlines</span></li>
                  <li className="flex items-center gap-2">🗑️ <span>Exam dates</span></li>
                  <li className="flex items-center gap-2">🗑️ <span>Subject targets</span></li>
                </ul>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    New Semester Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
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
                  onClick={handleStartTransition}
                  disabled={!newStartDate}
                  className="w-full py-2 rounded font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--danger)', color: '#fff' }}
                >
                  🔄 Start Semester 2
                </button>
              </>
            )}

            {transitionStep === 'processing' && (
              <div className="text-center py-8">
                <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: 'var(--accent)' }} />
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Processing...</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Clearing old data and setting up your new semester.</p>
              </div>
            )}

            {transitionStep === 'done' && (
              <div className="text-center py-8">
                <CheckCircle size={48} className="mx-auto mb-4" style={{ color: 'var(--success)' }} />
                <h3 className="text-lg font-semibold" style={{ color: 'var(--success)' }}>✅ Done!</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Your new semester is ready. You can now build your timetable.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Menu, Home, Calendar, Grid, BookOpen, Clipboard, Star, Palette, Settings, LogOut, Shield } from 'lucide-react';

interface GlobalNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isAdmin?: boolean;
}

function getSemesterInfo(startDate: Date | null): string {
  if (!startDate) return '1st Year, Sem 1';
  const now = new Date();
  const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
  const semester = Math.floor(monthsDiff / 6) + 1;
  const year = Math.ceil(semester / 2);
  const suffix = year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th';
  return `${year}${suffix} Year, Sem ${semester}`;
}

// Map avatar_id to image path
const getAvatarPath = (id: number): string => {
  if (id >= 1 && id <= 8) {
    return `/avatars/avatar-${id}.svg`;
  }
  return `/avatars/avatar-1.svg`;
};

export const GlobalNav: React.FC<GlobalNavProps> = ({ currentPage, onNavigate, isAdmin }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [semesterInfo, setSemesterInfo] = useState('');

  useEffect(() => {
    const fetchSemester = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('semester_dates')
        .select('semester_start')
        .eq('user_roll', user.roll_number)
        .single();
      if (data?.semester_start) {
        setSemesterInfo(getSemesterInfo(new Date(data.semester_start)));
      } else {
        setSemesterInfo('1st Year, Sem 1');
      }
    };
    fetchSemester();
  }, [user]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'timetable', label: 'Timetable', icon: Grid },
    { id: 'heatmap', label: 'Heatmap', icon: Calendar },
    { id: 'syllabus', label: 'Syllabus', icon: BookOpen },
    { id: 'deadlines', label: 'Deadlines', icon: Clipboard },
    { id: 'exams', label: 'Exams', icon: Calendar },
    { id: 'semester', label: 'Semester', icon: Calendar },
    { id: 'whisper', label: 'Whisper', icon: Star },
    { id: 'theme', label: 'Theme', icon: Palette },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  const avatarId = user?.avatar_id || 1;
  const avatarSrc = getAvatarPath(avatarId);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
        <button onClick={() => setMenuOpen(true)} className="p-1 rounded hover:bg-opacity-10" style={{ color: 'var(--text-primary)' }}>
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>SemSync</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>{user?.username}</span>
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border" style={{ borderColor: 'var(--border)' }}>
            <img
              src={avatarSrc}
              alt="avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to initial if image fails
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  parent.style.backgroundColor = 'var(--accent)';
                  parent.style.color = '#fff';
                  parent.style.fontWeight = 'bold';
                  parent.textContent = user?.username?.charAt(0).toUpperCase() || '?';
                }
              }}
            />
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(44, 37, 32, 0.3)' }} onClick={() => setMenuOpen(false)}>
          <div className="w-80 h-full p-4 overflow-y-auto shadow-xl" style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)', borderRight: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border" style={{ borderColor: 'var(--border)' }}>
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        parent.style.backgroundColor = 'var(--accent)';
                        parent.style.color = '#fff';
                        parent.style.fontWeight = 'bold';
                        parent.textContent = user?.username?.charAt(0).toUpperCase() || '?';
                      }
                    }}
                  />
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.username}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.batch_badge}</p>
                </div>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>📚 {semesterInfo}</p>
            </div>
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <li key={item.id}>
                    <button
                      className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition hover:bg-opacity-10"
                      style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)', backgroundColor: isActive ? 'var(--accent-light)' : 'transparent' }}
                      onClick={() => { setMenuOpen(false); onNavigate(item.id); }}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-opacity-10 transition"
                style={{ color: 'var(--danger)' }}
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Menu, User } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user } = useAuth();
  const badge = user?.batch_badge ? `${user.username} {${user.batch_badge}}` : 'SemSync';

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
      <button onClick={onMenuClick} className="p-2 rounded hover:bg-opacity-10 hover:bg-black transition">
        <Menu size={24} />
      </button>
      <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
        SemSync
      </h1>
      <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
        <User size={16} />
        <span>{badge}</span>
      </div>
    </header>
  );
};

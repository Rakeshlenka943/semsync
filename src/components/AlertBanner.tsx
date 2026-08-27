import React from 'react';
import { AlertTriangle, Clock, Calendar } from 'lucide-react';

interface AlertBannerProps {
  type: 'exam' | 'deadline' | 'attendance';
  message: string;
  urgency: 'info' | 'warning' | 'danger';
  onDismiss?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ type, message, urgency, onDismiss }) => {
  const colors = {
    info: { bg: 'rgba(33, 150, 243, 0.15)', text: '#2196f3', border: '#2196f3' },
    warning: { bg: 'rgba(212, 167, 74, 0.15)', text: 'var(--warning)', border: 'var(--warning)' },
    danger: { bg: 'rgba(196, 90, 90, 0.15)', text: 'var(--danger)', border: 'var(--danger)' },
  };

  const icons = {
    exam: <Calendar size={20} />,
    deadline: <Clock size={20} />,
    attendance: <AlertTriangle size={20} />,
  };

  return (
    <div
      className="mx-4 my-2 p-3 rounded-lg border flex items-start gap-3"
      style={{
        backgroundColor: colors[urgency].bg,
        borderColor: colors[urgency].border,
        color: colors[urgency].text,
      }}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <p className="flex-1 text-sm">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-sm font-medium hover:underline" style={{ color: colors[urgency].text }}>
          Dismiss
        </button>
      )}
    </div>
  );
};

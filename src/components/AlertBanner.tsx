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
    info: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    warning: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
    danger: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  };

  const icons = {
    exam: <Calendar size={20} />,
    deadline: <Clock size={20} />,
    attendance: <AlertTriangle size={20} />,
  };

  return (
    <div className={`mx-4 my-2 p-3 rounded-lg border flex items-start gap-3 ${colors[urgency].bg} ${colors[urgency].border} ${colors[urgency].text}`}>
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <p className="flex-1 text-sm">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-sm font-medium hover:underline">Dismiss</button>
      )}
    </div>
  );
};

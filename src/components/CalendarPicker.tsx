import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  onClose?: () => void;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
  onClose,
}) => {
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(value);

  useEffect(() => {
    if (value) setSelectedDate(new Date(value));
  }, [value]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const goPrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };
  const goNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const isDateDisabled = (date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const handleSelect = (date: Date) => {
    if (isDateDisabled(date)) return;
    setSelectedDate(date);
    onChange(date);
    if (onClose) onClose();
  };

  const renderDays = () => {
    const days = [];
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    // Fill empty cells
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-1" />);
    }
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      const isToday = date.toDateString() === today.toDateString();
      const disabled = isDateDisabled(date);
      days.push(
        <button
          key={d}
          onClick={() => handleSelect(date)}
          disabled={disabled}
          className={`p-1 text-sm rounded-full w-8 h-8 flex items-center justify-center transition ${
            isSelected
              ? 'text-white'
              : isToday
              ? 'border border-accent'
              : ''
          } ${
            disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-opacity-20'
          }`}
          style={{
            backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
            color: isSelected ? '#fff' : 'var(--text-primary)',
            borderColor: isToday ? 'var(--accent)' : 'transparent',
          }}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={goPrevMonth}
          className="p-1 rounded hover:bg-opacity-10"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={goNextMonth}
          className="p-1 rounded hover:bg-opacity-10"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0 text-center text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="p-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {renderDays()}
      </div>
    </div>
  );
};

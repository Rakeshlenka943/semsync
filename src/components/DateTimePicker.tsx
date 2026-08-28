import React, { useState } from 'react';
import { CalendarPicker } from './CalendarPicker';

interface DateTimePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  onClose?: () => void;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, onClose }) => {
  const [dateValue, setDateValue] = useState<Date | null>(value);
  const [hour, setHour] = useState<string>(value ? String(value.getHours() % 12 || 12).padStart(2, '0') : '12');
  const [minute, setMinute] = useState<string>(value ? String(value.getMinutes()).padStart(2, '0') : '00');
  const [ampm, setAmpm] = useState<string>(value ? (value.getHours() >= 12 ? 'PM' : 'AM') : 'AM');

  const handleDateChange = (date: Date) => {
    setDateValue(date);
    updateDateTime(date);
  };

  const updateDateTime = (date: Date) => {
    if (!date) return;
    const newDate = new Date(date);
    let hours = parseInt(hour);
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    newDate.setHours(hours, parseInt(minute), 0, 0);
    onChange(newDate);
    if (onClose) onClose();
  };

  const handleTimeChange = () => {
    if (dateValue) {
      const newDate = new Date(dateValue);
      let hours = parseInt(hour);
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      newDate.setHours(hours, parseInt(minute), 0, 0);
      onChange(newDate);
    }
  };

  // Re‑trigger when time changes
  React.useEffect(() => {
    handleTimeChange();
  }, [hour, minute, ampm]);

  return (
    <div className="space-y-3">
      <CalendarPicker
        value={dateValue}
        onChange={handleDateChange}
        onClose={onClose}
      />
      <div className="flex items-center justify-center gap-2 text-sm">
        <div className="flex items-center gap-1">
          <select
            value={hour}
            onChange={(e) => setHour(e.target.value)}
            className="px-2 py-1 border rounded focus:outline-none"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <span style={{ color: 'var(--text-secondary)' }}>:</span>
          <select
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            className="px-2 py-1 border rounded focus:outline-none"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={ampm}
            onChange={(e) => setAmpm(e.target.value)}
            className="px-2 py-1 border rounded focus:outline-none"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
    </div>
  );
};

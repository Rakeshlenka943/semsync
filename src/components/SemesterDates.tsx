import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Calendar, AlertTriangle, CheckCircle, X, Lock, Unlock } from 'lucide-react';

interface SemesterDatesProps {
  onBack: () => void;
}

export const SemesterDates: React.FC<SemesterDatesProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showStartDateChangeModal, setShowStartDateChangeModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [originalStartDate, setOriginalStartDate] = useState<string>('');

  // Load existing dates
  useEffect(() => {
    if (!user) return;
    const loadDates = async () => {
      const { data, error } = await supabase
        .from('semester_dates')
        .select('semester_start, semester_end')
        .eq('user_roll', user.roll_number)
        .single();

      if (!error && data) {
        if (data.semester_start) {
          setStartDate(data.semester_start);
          setOriginalStartDate(data.semester_start);
          setHasExisting(true);
        }
        if (data.semester_end) {
          setEndDate(data.semester_end);
        }
      }
      setLoading(false);
    };
    loadDates();
  }, [user]);

  // Save only end date (or start if first time)
  const handleSave = async () => {
    // If start date is already set, we only update end date
    if (hasExisting) {
      // Only update end date
      await updateEndDate();
      return;
    }

    // First time: save both
    if (!startDate) {
      setError('Please select a semester start date.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: any = {
      user_roll: user?.roll_number,
      semester_start: startDate,
    };
    if (endDate) payload.semester_end = endDate;

    const { error: upsertError } = await supabase
      .from('semester_dates')
      .upsert(payload, { onConflict: 'user_roll' });

    if (upsertError) {
      setError(upsertError.message);
    } else {
      setSuccess(true);
      setHasExisting(true);
      setOriginalStartDate(startDate);
      setShowConfirm(false);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  // Update only end date
  const updateEndDate = async () => {
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('semester_dates')
      .update({ semester_end: endDate || null })
      .eq('user_roll', user?.roll_number);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setShowConfirm(false);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  // Open change start date modal
  const requestStartDateChange = () => {
    setShowStartDateChangeModal(true);
    setConfirmText('');
  };

  // Handle start date change with confirmation
  const confirmStartDateChange = async () => {
    if (confirmText !== 'CONFIRM') {
      setError('Type "CONFIRM" to proceed.');
      return;
    }
    if (!startDate) {
      setError('Please select a new date.');
      return;
    }

    setSaving(true);
    setError(null);

    // Update start date (this is the permanent change)
    const { error: updateError } = await supabase
      .from('semester_dates')
      .update({ semester_start: startDate })
      .eq('user_roll', user?.roll_number);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setOriginalStartDate(startDate);
      setShowStartDateChangeModal(false);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>Loading...</div>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 rounded hover:bg-opacity-10" style={{ color: 'var(--text-primary)' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>📅 Semester Dates</h1>
      </div>

      {success && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'var(--success)', color: '#fff' }}>
          <CheckCircle size={20} />
          <span>Dates saved successfully!</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'var(--danger)', color: '#fff' }}>
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Warning Banner */}
      {!hasExisting ? (
        <div className="mb-6 p-4 rounded-lg flex items-start gap-3" style={{ backgroundColor: 'rgba(212, 167, 74, 0.15)', border: '1px solid var(--warning)' }}>
          <AlertTriangle size={24} style={{ color: 'var(--warning)' }} />
          <div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>⚠️ Important: One-Time Setup</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              The semester start date determines when attendance tracking begins. 
              <strong> This date is PERMANENT and cannot be changed later.</strong>
              Please double-check before saving.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-lg flex items-start gap-3" style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', border: '1px solid var(--success)' }}>
          <CheckCircle size={24} style={{ color: 'var(--success)' }} />
          <div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>✅ Semester Start Date is set</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              The start date is <strong>permanent</strong>. You can only change the end date.
            </p>
          </div>
        </div>
      )}

      {/* Dates Form */}
      <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          {hasExisting ? 'Manage Semester Dates' : 'Set Semester Dates'}
        </h3>
        
        {/* Start Date - Permanently locked after first set */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Semester Start Date <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={hasExisting}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 disabled:opacity-60"
              style={{
                backgroundColor: hasExisting ? 'var(--bg)' : 'var(--bg)',
                borderColor: hasExisting ? 'var(--text-muted)' : 'var(--border)',
                color: hasExisting ? 'var(--text-muted)' : 'var(--text-primary)',
              }}
              required={!hasExisting}
            />
            {hasExisting && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <Lock size={16} style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Permanent</span>
              </div>
            )}
          </div>
          {hasExisting && (
            <div className="mt-1 flex items-center gap-2">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                This date is permanent and cannot be changed.
              </p>
              <button
                onClick={requestStartDateChange}
                className="text-xs underline hover:opacity-70"
                style={{ color: 'var(--danger)' }}
              >
                Request Change
              </button>
            </div>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {hasExisting 
              ? 'This date is locked.' 
              : 'Attendance tracking starts on this date. This is permanent once saved.'
            }
          </p>
        </div>

        {/* End Date - Always editable */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Semester End Date <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(optional)</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            After this date, all classes will be hidden automatically (exam prep period).
            You can change this anytime.
          </p>
        </div>

        {!hasExisting ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!startDate}
            className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            Preview & Set Permanently
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {saving ? 'Saving...' : 'Update End Date'}
          </button>
        )}
      </div>

      {/* Confirmation Modal - First time setup */}
      {showConfirm && !hasExisting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(44, 37, 32, 0.6)' }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="max-w-md w-full rounded-lg shadow-xl p-6"
            style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">⚠️ Confirm Permanent Date</h3>
              <button onClick={() => setShowConfirm(false)} className="p-1 rounded hover:bg-opacity-10" style={{ color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>

            <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="space-y-2 text-sm">
                <p>📅 <strong>Semester Start:</strong> {startDate ? new Date(startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'}</p>
                {endDate && <p>📅 <strong>Semester End:</strong> {new Date(endDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>}
              </div>
            </div>

            <div className="p-3 rounded-lg mb-4 flex items-start gap-2" style={{ backgroundColor: 'rgba(212, 167, 74, 0.15)', border: '1px solid var(--warning)' }}>
              <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>This action is <strong>IRREVERSIBLE</strong>!</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  The semester start date will be permanently saved and cannot be changed later.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded text-sm font-medium"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--danger)', color: '#fff' }}
              >
                {saving ? 'Saving...' : '🔒 Set Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Start Date Modal - With extra confirmation */}
      {showStartDateChangeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(44, 37, 32, 0.6)' }}
          onClick={() => setShowStartDateChangeModal(false)}
        >
          <div
            className="max-w-md w-full rounded-lg shadow-xl p-6"
            style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">⚠️ Change Permanent Start Date</h3>
              <button onClick={() => setShowStartDateChangeModal(false)} className="p-1 rounded hover:bg-opacity-10" style={{ color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>

            <div className="p-3 rounded-lg mb-4 flex items-start gap-2" style={{ backgroundColor: 'rgba(212, 167, 74, 0.15)', border: '1px solid var(--warning)' }}>
              <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>This is a permanent date!</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Changing the start date will affect all attendance data. 
                  Please type <strong>"CONFIRM"</strong> below to proceed.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                New Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Type "CONFIRM" to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type CONFIRM"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {error && <div className="text-sm mb-2" style={{ color: 'var(--danger)' }}>{error}</div>}

            <div className="flex gap-2">
              <button
                onClick={() => setShowStartDateChangeModal(false)}
                className="flex-1 px-4 py-2 rounded text-sm font-medium"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmStartDateChange}
                disabled={saving || confirmText !== 'CONFIRM'}
                className="flex-1 px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--danger)', color: '#fff' }}
              >
                {saving ? 'Saving...' : 'Change Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface ResetPasswordProps {
  onSuccess: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        // Try to recover from the hash
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          // Wait for the session to be set by Supabase
          setTimeout(async () => {
            const { data: retryData, error: retryError } = await supabase.auth.getSession();
            if (retryError || !retryData.session) {
              setError('Invalid or expired reset link. Please request a new one.');
              setIsValidSession(false);
            } else {
              setIsValidSession(true);
            }
          }, 500);
        } else {
          setError('Invalid or expired reset link. Please request a new one.');
          setIsValidSession(false);
        }
      } else {
        setIsValidSession(true);
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setError(error.message);
    } else {
      // Password updated successfully
      alert('Password updated successfully! You can now login with your new password.');
      // Sign out after reset
      await supabase.auth.signOut();
      onSuccess();
    }
    setIsLoading(false);
  };

  if (isValidSession === null) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
        <p style={{ color: 'var(--text-secondary)' }}>Verifying your reset link...</p>
      </div>
    );
  }

  if (isValidSession === false) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.href = '/'}
          className="mt-4 text-blue-600 hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        Enter your new password below.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
            required
            minLength={6}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
            required
          />
        </div>
        {error && <div className="text-sm mb-2" style={{ color: 'var(--danger)' }}>{error}</div>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full font-semibold py-2 px-4 rounded-md transition disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {isLoading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
};

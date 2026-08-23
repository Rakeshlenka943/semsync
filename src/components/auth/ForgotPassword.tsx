import React, { useState } from 'react';
import { resetPassword } from '../../services/auth.service';

interface ForgotPasswordProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email');
      setIsLoading(false);
      return;
    }

    const result = await resetPassword(email);
    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(true);
      setTimeout(() => onSuccess(), 3000);
    }
    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="p-6 rounded-lg shadow-md text-center" style={{ backgroundColor: 'var(--card)' }}>
        <div className="text-xl mb-2" style={{ color: 'var(--success)' }}>✅ Email Sent!</div>
        <p style={{ color: 'var(--text-secondary)' }}>
          If an account exists with this email, you'll receive a password reset link shortly.
        </p>
        <button
          onClick={onBack}
          className="mt-4 hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--card)' }}>
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Forgot Password</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        Enter your email address and we'll send you a link to reset your password.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
            required
            placeholder="your.email@example.com"
          />
        </div>
        {error && <div className="text-sm mb-2" style={{ color: 'var(--danger)' }}>{error}</div>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full font-semibold py-2 px-4 rounded-md transition disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full mt-2 text-sm hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          Back to Login
        </button>
      </form>
    </div>
  );
};

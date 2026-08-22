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
      <div className="text-center p-4">
        <div className="text-green-600 text-xl mb-2">✅ Email Sent!</div>
        <p className="text-gray-600 dark:text-gray-400">
          If an account exists with this email, you'll receive a password reset link shortly.
        </p>
        <button
          onClick={onBack}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Forgot Password</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Enter your email address and we'll send you a link to reset your password.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700"
            required
            placeholder="your.email@example.com"
          />
        </div>
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50"
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full mt-2 text-sm text-gray-600 dark:text-gray-400 hover:underline"
        >
          Back to Login
        </button>
      </form>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginProps {
  onForgotPassword: () => void;
}

export const Login: React.FC<LoginProps> = ({ onForgotPassword }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const credentials: any = { password };
    if (/^\d{8}$/.test(identifier)) {
      credentials.rollNumber = identifier;
    } else {
      credentials.username = identifier;
    }

    const result = await login(credentials);
    if (result.error) {
      setError(result.error.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--card)' }}>
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Username, Email, or Roll Number
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
              '--tw-ring-color': 'var(--accent)',
            }}
            required
            placeholder="username, email, or roll number"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            You can login with your username, email, or roll number.
          </p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
              '--tw-ring-color': 'var(--accent)',
            }}
            required
          />
        </div>
        <div className="text-right mb-4">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            Forgot Password?
          </button>
        </div>
        {error && <div className="text-sm mb-2" style={{ color: 'var(--danger)' }}>{error}</div>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full font-semibold py-2 px-4 rounded-md transition disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

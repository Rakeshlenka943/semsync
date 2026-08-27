import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onForgotPassword: () => void;
}

export const Login: React.FC<LoginProps> = ({ onForgotPassword }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Optional: visual gibberish for password display
  const [gibberishMode, setGibberishMode] = useState(false);

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

  // Toggle between plain text and gibberish
  const toggleShow = () => setShowPassword(!showPassword);

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
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 pr-10"
              style={{
                backgroundColor: 'var(--bg)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                '--tw-ring-color': 'var(--accent)',
              }}
              required
              placeholder={showPassword ? (gibberishMode ? '• • • • • •' : 'Enter password') : 'Enter password'}
            />
            <button
              type="button"
              onClick={toggleShow}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
              style={{ color: 'var(--text-muted)' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {showPassword ? 'Password visible' : 'Password hidden'}
            </span>
            <button
              type="button"
              onClick={() => setGibberishMode(!gibberishMode)}
              className="text-xs underline hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              {gibberishMode ? 'Show real chars' : 'Show gibberish'}
            </button>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Click the eye to toggle visibility.
          </p>
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

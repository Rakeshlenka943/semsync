import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { parseRollNumber } from '../../utils/rollNumberParser';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [academicCycle, setAcademicCycle] = useState<'physics' | 'chemistry'>('physics');
  const [error, setError] = useState<string | null>(null);
  const [batchBadge, setBatchBadge] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRollNumberChange = (value: string) => {
    setRollNumber(value);
    if (/^\d{8}$/.test(value)) {
      try {
        setBatchBadge(parseRollNumber(value).batchBadge);
      } catch {
        setBatchBadge(null);
      }
    } else {
      setBatchBadge(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!/^\d{8}$/.test(rollNumber)) {
      setError('Roll number must be 8 digits');
      setIsLoading(false);
      return;
    }

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    const result = await register({ username, rollNumber, password, academicCycle, email });
    
    if (result.error) {
      setError(result.error.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700"
            required
          />
        </div>

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
          <p className="text-xs text-gray-500 mt-1">We'll send you a welcome email and password reset links here.</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Roll Number (8 digits)</label>
          <input
            type="text"
            value={rollNumber}
            onChange={(e) => handleRollNumberChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700"
            required
            pattern="\d{8}"
          />
          {batchBadge && (
            <div className="text-sm text-green-600 mt-1">Batch Badge: {batchBadge}</div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Academic Cycle</label>
          <select
            value={academicCycle}
            onChange={(e) => setAcademicCycle(e.target.value as 'physics' | 'chemistry')}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700"
          >
            <option value="physics">Physics Cycle</option>
            <option value="chemistry">Chemistry Cycle</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700"
            required
            minLength={6}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700"
            required
          />
        </div>

        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50"
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
};

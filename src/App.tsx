import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';

function AppContent() {
  const { user, isLoading, logout } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Check if we're on the reset password page
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      setShowResetPassword(true);
      // Clean the URL to remove the token (optional)
      // window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // 🔑 If user is on reset password page, show ResetPassword component
  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <ResetPassword onSuccess={() => {
          setShowResetPassword(false);
          // Log out after reset to force user to login with new password
          logout();
        }} />
      </div>
    );
  }

  if (!user) {
    if (showForgotPassword) {
      return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
          <ForgotPassword 
            onBack={() => setShowForgotPassword(false)}
            onSuccess={() => setShowForgotPassword(false)}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-6 text-blue-600">SemSync</h1>
          {showRegister ? (
            <div>
              <Register />
              <p className="text-center mt-4 text-sm">
                Already have an account?{' '}
                <button onClick={() => setShowRegister(false)} className="text-blue-600 underline">
                  Login
                </button>
              </p>
            </div>
          ) : (
            <div>
              <Login onForgotPassword={() => setShowForgotPassword(true)} />
              <p className="text-center mt-4 text-sm">
                Don't have an account?{' '}
                <button onClick={() => setShowRegister(true)} className="text-blue-600 underline">
                  Sign up
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ✅ LOGGED IN DASHBOARD
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Welcome back, {user.username}!</h2>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-md transition"
          >
            Logout
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-400">Your batch: {user.batch_badge}</p>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Email: {user.email || 'Not set'}</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

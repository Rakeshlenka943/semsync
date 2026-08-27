import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';
import { Dashboard } from './components/Dashboard';
import { TimetableBuilder } from './components/TimetableBuilder';
import { MonthlyHeatmap } from './components/MonthlyHeatmap';
import { SemesterDates } from './components/SemesterDates';
import { SyllabusTracker } from './components/SyllabusTracker';
import { DeadlinesManager } from './components/DeadlinesManager';
import { ExamManagement } from './components/ExamManagement';
import { ThemeForge } from './components/ThemeForge';
import { Settings } from './components/Settings';
import { GlobalNav } from './components/GlobalNav';

type Page = 'dashboard' | 'timetable' | 'heatmap' | 'syllabus' | 'deadlines' | 'exams' | 'semester' | 'whisper' | 'theme' | 'settings';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      setShowResetPassword(true);
    }
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
        <ResetPassword onSuccess={() => setShowResetPassword(false)} />
      </div>
    );
  }

  if (!user) {
    if (showForgotPassword) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
          <ForgotPassword onBack={() => setShowForgotPassword(false)} onSuccess={() => setShowForgotPassword(false)} />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-6" style={{ color: 'var(--accent)' }}>SemSync</h1>
          {showRegister ? (
            <div>
              <Register />
              <p className="text-center mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <button onClick={() => setShowRegister(false)} className="underline" style={{ color: 'var(--accent)' }}>
                  Login
                </button>
              </p>
            </div>
          ) : (
            <div>
              <Login onForgotPassword={() => setShowForgotPassword(true)} />
              <p className="text-center mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Don't have an account?{' '}
                <button onClick={() => setShowRegister(true)} className="underline" style={{ color: 'var(--accent)' }}>
                  Sign up
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'timetable':
        return <TimetableBuilder onBack={() => setCurrentPage('dashboard')} />;
      case 'heatmap':
        return <MonthlyHeatmap onBack={() => setCurrentPage('dashboard')} />;
      case 'semester':
        return <SemesterDates onBack={() => setCurrentPage('dashboard')} />;
      case 'syllabus':
        return <SyllabusTracker onBack={() => setCurrentPage('dashboard')} />;
      case 'deadlines':
        return <DeadlinesManager onBack={() => setCurrentPage('dashboard')} />;
      case 'exams':
        return <ExamManagement onBack={() => setCurrentPage('dashboard')} />;
      case 'theme':
        return <ThemeForge onBack={() => setCurrentPage('dashboard')} />;
      case 'settings':
        return <Settings onBack={() => setCurrentPage('dashboard')} />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <GlobalNav currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="pt-2">{renderPage()}</div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

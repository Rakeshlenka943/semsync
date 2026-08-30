import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useInactivityLogout(timeoutMinutes: number = 6 * 60) {
  const { logout } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      logout();
    }, timeoutMinutes * 60 * 1000);
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => resetTimer();
    events.forEach(event => window.addEventListener(event, handleActivity));
    resetTimer();
    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}

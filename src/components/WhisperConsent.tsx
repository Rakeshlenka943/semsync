import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface WhisperConsentProps {
  onAgree: () => void;
}

const LEGAL_TEXT = `
CONFIDENTIALITY & PURPOSE NOTICE:
The aggregated metrics within this module are crowdsourced strictly for peer‑to‑peer academic navigation. 
This tool is designed exclusively to help students optimise classroom interactions and maintain compliance. 
It is not an official faculty evaluation platform.

By using this system, you agree that:
1. All ratings are anonymous and cannot be traced back to any individual student.
2. The data is for personal academic guidance only and must not be used for any other purpose.
3. The creators of this platform assume no liability for any misuse of the information provided.
4. You will not attempt to identify, harass, or defame any faculty member based on these ratings.
5. You understand that ratings are based on subjective student experiences and may not reflect objective truth.

Violation of these terms may result in permanent suspension of your access to this feature.
`;

const PLAIN_ENGLISH = `
📢 Plain English Summary (for the impatient)
Don't be a jerk. Don't sue us. We're just students trying to help each other.
Your ratings are anonymous. Use them wisely.
🤝 Thanks for being cool.
`;

export const WhisperConsent: React.FC<WhisperConsentProps> = ({ onAgree }) => {
  const { user } = useAuth();
  const [timer, setTimer] = useState(15);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAgree = async () => {
    if (!user || timer > 0 || !hasScrolledToBottom) return;
    setLoading(true);
    const { error } = await supabase
      .from('users')
      .update({
        agreed_to_whisper: true,
        whisper_agreed_at: new Date().toISOString(),
      })
      .eq('roll_number', user.roll_number);
    if (error) {
      console.error('Error saving consent:', error);
      alert('Failed to save consent. Please try again.');
    } else {
      setIsAgreed(true);
      onAgree();
    }
    setLoading(false);
  };

  const isButtonEnabled = timer === 0 && hasScrolledToBottom && !isAgreed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="max-w-2xl w-full rounded-lg shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)' }}>
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>⚖️ Confidentiality & Consent Agreement</h2>
          </div>
        </div>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="p-6 max-h-[60vh] overflow-y-auto space-y-4 text-sm leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          <pre className="whitespace-pre-wrap font-sans" style={{ color: 'var(--text-secondary)' }}>{LEGAL_TEXT}</pre>

          {/* Plain English Summary */}
          <div className="p-4 rounded-lg mt-4" style={{ backgroundColor: 'var(--accent-light)', border: '2px dashed var(--accent)' }}>
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{PLAIN_ENGLISH}</p>
          </div>
        </div>

        <div className="p-6 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Clock size={18} style={{ color: timer > 0 ? 'var(--warning)' : 'var(--success)' }} />
            <span className="text-sm" style={{ color: timer > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
              {timer > 0 ? `Please wait ${timer}s` : hasScrolledToBottom ? '✅ Ready' : '⬇️ Scroll to bottom'}
            </span>
          </div>
          <button
            onClick={handleAgree}
            disabled={!isButtonEnabled || loading}
            className="px-6 py-2 rounded font-semibold transition disabled:opacity-50 flex items-center gap-2"
            style={{
              backgroundColor: isButtonEnabled ? 'var(--accent)' : 'var(--text-muted)',
              color: isButtonEnabled ? '#fff' : 'var(--text-secondary)',
              cursor: isButtonEnabled ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Saving...' : isAgreed ? '✅ Agreed' : 'I Agree'}
          </button>
        </div>
      </div>
    </div>
  );
};

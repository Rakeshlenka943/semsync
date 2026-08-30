import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Search, Info, ChevronRight, X } from 'lucide-react';
import { WhisperConsent } from './WhisperConsent';

interface WhisperNetworkProps {
  onBack: () => void;
}

interface Faculty {
  id: string;
  name: string;
  department: string;
  theory_friendliness_score: number;
  theory_friendliness_votes: number;
  theory_notes_score: number;
  theory_notes_votes: number;
  theory_teaching_score: number;
  theory_teaching_votes: number;
  lab_strictness_score: number;
  lab_strictness_votes: number;
  lab_record_checking_score: number;
  lab_record_checking_votes: number;
  lab_marks_leniency_score: number;
  lab_marks_leniency_votes: number;
}

const CRITERIA = {
  theory: [
    { key: 'theory_friendliness', label: 'Friendliness/Leniency', tooltip: 'How approachable and lenient is the teacher?' },
    { key: 'theory_notes', label: 'Notes Quality', tooltip: 'Are notes/PPTs well-organized and helpful?' },
    { key: 'theory_teaching', label: 'Teaching Clarity', tooltip: 'Is the teaching clear and easy to understand?' },
  ],
  lab: [
    { key: 'lab_strictness', label: 'Strictness', tooltip: 'How strict is the teacher in lab sessions?' },
    { key: 'lab_record_checking', label: 'Record Checking Rigor', tooltip: 'How thoroughly are lab records checked?' },
    { key: 'lab_marks_leniency', label: 'Marks Leniency', tooltip: 'Is the teacher generous with marks?' },
  ],
};

export const WhisperNetwork: React.FC<WhisperNetworkProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map());
  const [showConsent, setShowConsent] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    checkConsent();
    fetchFaculty();
    fetchUserRatings();
  }, [user]);

  const checkConsent = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('agreed_to_whisper, whisper_agreed_at')
      .eq('roll_number', user?.roll_number)
      .single();
    if (!error && data) {
      if (data.agreed_to_whisper) {
        const agreedAt = new Date(data.whisper_agreed_at);
        const now = new Date();
        const daysDiff = (now.getTime() - agreedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff < 180) {
          setHasAgreed(true);
          setShowConsent(false);
        } else {
          setShowConsent(true);
        }
      } else {
        setShowConsent(true);
      }
    } else {
      setShowConsent(true);
    }
  };

  const fetchFaculty = async () => {
    const { data, error } = await supabase
      .from('faculty_profiles')
      .select('*')
      .order('name');
    if (!error && data) {
      setFaculty(data);
      const depts = Array.from(new Set(data.map(f => f.department).filter(Boolean)));
      setAvailableDepartments(depts);
    }
    setLoading(false);
  };

  const fetchUserRatings = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('users')
      .select('faculty_vote_ledger')
      .eq('roll_number', user.roll_number)
      .single();
    if (!error && data?.faculty_vote_ledger) {
      const ledger = data.faculty_vote_ledger;
      const map = new Map<string, number>();
      Object.keys(ledger).forEach(key => {
        map.set(key, ledger[key]);
      });
      setUserRatings(map);
    }
  };

  const handleAgreeConsent = () => {
    setHasAgreed(true);
    setShowConsent(false);
  };

  const getAverage = (score: number, votes: number): number => {
    return votes === 0 ? 0 : Math.round((score / votes) * 10) / 10;
  };

  const getStarDisplay = (rating: number): string => {
    if (rating === 0) return '☆☆☆☆☆';
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
  };

  const handleRate = async (facultyId: string, category: string, value: number) => {
    if (!user) return;
    setRatingLoading(true);

    const ledgerKey = `${facultyId}_${category}`;
    const { data, error } = await supabase.rpc('rate_faculty', {
      p_faculty_id: facultyId,
      p_category: category,
      p_new_rating: value,
    });

    if (!error) {
      const newMap = new Map(userRatings);
      newMap.set(ledgerKey, value);
      setUserRatings(newMap);
      fetchFaculty();
    } else {
      console.error('Rating error:', error);
      alert('Failed to save rating. Please try again.');
    }
    setRatingLoading(false);
  };

  // Filter faculty
  const filteredFaculty = faculty.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
                          f.department.toLowerCase().includes(search.toLowerCase());
    const matchesDept = departmentFilter === 'all' || f.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  if (showConsent) {
    return <WhisperConsent onAgree={handleAgreeConsent} />;
  }

  if (!hasAgreed) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded hover:bg-opacity-10" style={{ color: 'var(--text-primary)' }}>
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>🗣️ Whisper Network</h1>
        </div>
        <div className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <Info size={14} /> Anonymous
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'var(--bg)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="all">All Departments</option>
          {availableDepartments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* Faculty List */}
      {loading ? (
        <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      ) : filteredFaculty.length === 0 ? (
        <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>No teachers found.</div>
      ) : (
        <div className="space-y-3">
          {filteredFaculty.map((f) => {
            // Theory: average of the 3 criteria averages
            const friendlinessAvg = getAverage(f.theory_friendliness_score, f.theory_friendliness_votes);
            const notesAvg = getAverage(f.theory_notes_score, f.theory_notes_votes);
            const teachingAvg = getAverage(f.theory_teaching_score, f.theory_teaching_votes);
            const theoryAvg = (friendlinessAvg + notesAvg + teachingAvg) / 3;

            // Lab: average of the 3 criteria averages
            const strictnessAvg = getAverage(f.lab_strictness_score, f.lab_strictness_votes);
            const recordAvg = getAverage(f.lab_record_checking_score, f.lab_record_checking_votes);
            const marksAvg = getAverage(f.lab_marks_leniency_score, f.lab_marks_leniency_votes);
            const labAvg = (strictnessAvg + recordAvg + marksAvg) / 3;

            return (
              <div
                key={f.id}
                className="rounded-lg border p-4 cursor-pointer hover:bg-opacity-5 transition"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                onClick={() => setSelectedFaculty(f)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.department}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Theory:</span>
                        <span style={{ color: 'var(--text-primary)' }}>{theoryAvg.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Lab:</span>
                        <span style={{ color: 'var(--text-primary)' }}>{labAvg.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Faculty Detail Modal (unchanged, keeps stars) */}
      {selectedFaculty && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(44, 37, 32, 0.6)' }}
          onClick={() => setSelectedFaculty(null)}
        >
          <div
            className="max-w-lg w-full rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--card)', color: 'var(--text-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{selectedFaculty.name}</h3>
              <button onClick={() => setSelectedFaculty(null)} className="p-1 rounded hover:bg-opacity-10" style={{ color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{selectedFaculty.department}</p>

            {/* Theory Criteria */}
            <div className="mb-4">
              <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>📖 Theory</h4>
              {CRITERIA.theory.map(c => {
                const key = c.key as keyof Faculty;
                const scoreKey = `${key}_score` as keyof Faculty;
                const votesKey = `${key}_votes` as keyof Faculty;
                const score = selectedFaculty[scoreKey] as number || 0;
                const votes = selectedFaculty[votesKey] as number || 0;
                const avg = getAverage(score, votes);
                const ledgerKey = `${selectedFaculty.id}_${c.key}`;
                const userRating = userRatings.get(ledgerKey) || 0;

                return (
                  <div key={c.key} className="mb-3 p-2 rounded" style={{ backgroundColor: 'var(--surface)' }}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{c.label}</span>
                        <Info size={14} className="cursor-help" style={{ color: 'var(--text-muted)' }} title={c.tooltip} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{avg.toFixed(1)}</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {[1,2,3,4,5].map(val => (
                        <button
                          key={val}
                          onClick={() => handleRate(selectedFaculty.id, c.key, val)}
                          disabled={ratingLoading}
                          className="text-xl transition hover:scale-110"
                          style={{
                            color: val <= userRating ? 'var(--accent)' : 'var(--text-muted)',
                            opacity: ratingLoading ? 0.5 : 1,
                          }}
                        >
                          ★
                        </button>
                      ))}
                      {userRating > 0 && <span className="text-xs ml-2" style={{ color: 'var(--accent)' }}>(your vote: {userRating})</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Lab Criteria */}
            <div>
              <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>🧪 Lab</h4>
              {CRITERIA.lab.map(c => {
                const key = c.key as keyof Faculty;
                const scoreKey = `${key}_score` as keyof Faculty;
                const votesKey = `${key}_votes` as keyof Faculty;
                const score = selectedFaculty[scoreKey] as number || 0;
                const votes = selectedFaculty[votesKey] as number || 0;
                const avg = getAverage(score, votes);
                const ledgerKey = `${selectedFaculty.id}_${c.key}`;
                const userRating = userRatings.get(ledgerKey) || 0;

                return (
                  <div key={c.key} className="mb-3 p-2 rounded" style={{ backgroundColor: 'var(--surface)' }}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{c.label}</span>
                        <Info size={14} className="cursor-help" style={{ color: 'var(--text-muted)' }} title={c.tooltip} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{avg.toFixed(1)}</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {[1,2,3,4,5].map(val => (
                        <button
                          key={val}
                          onClick={() => handleRate(selectedFaculty.id, c.key, val)}
                          disabled={ratingLoading}
                          className="text-xl transition hover:scale-110"
                          style={{
                            color: val <= userRating ? 'var(--accent)' : 'var(--text-muted)',
                            opacity: ratingLoading ? 0.5 : 1,
                          }}
                        >
                          ★
                        </button>
                      ))}
                      {userRating > 0 && <span className="text-xs ml-2" style={{ color: 'var(--accent)' }}>(your vote: {userRating})</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

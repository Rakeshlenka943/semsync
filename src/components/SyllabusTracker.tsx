import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ChevronDown, ChevronUp, CheckCircle, AlertCircle, BookOpen, FlaskConical } from 'lucide-react';

interface SyllabusTrackerProps {
  onBack: () => void;
}

interface Topic {
  id: string;
  subject_code: string;
  module_number: number;
  topic_id: string;
  topic_name: string;
  is_completed: boolean;
  is_anomaly_skipped: boolean;
}

interface SubjectProgress {
  subject_code: string;
  subject_name: string;
  is_lab: boolean;
  total: number;
  completed: number;
  percentage: number;
  modules: {
    module_number: number;
    total: number;
    completed: number;
    percentage: number;
    topics: Topic[];
  }[];
}

function getSemesterInfo(startDate: Date | null): string {
  if (!startDate) return '1st Year, Sem 1';
  const now = new Date();
  const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
  const semester = Math.floor(monthsDiff / 6) + 1;
  const year = Math.ceil(semester / 2);
  const suffix = year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th';
  return `${year}${suffix} Year, Sem ${semester}`;
}

export const SyllabusTracker: React.FC<SyllabusTrackerProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [labSubjects, setLabSubjects] = useState<SubjectProgress[]>([]);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<{ subject: string; module: number } | null>(null);
  const [anomalies, setAnomalies] = useState<{ subject: string; topic: string; message: string }[]>([]);
  const [semesterInfo, setSemesterInfo] = useState<string>('');
  const [allSyllabus, setAllSyllabus] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchSyllabus();
    fetchSemesterInfo();
  }, [user]);

  const fetchSemesterInfo = async () => {
    const { data } = await supabase
      .from('semester_dates')
      .select('semester_start')
      .eq('user_roll', user?.roll_number)
      .single();
    if (data?.semester_start) {
      setSemesterInfo(getSemesterInfo(new Date(data.semester_start)));
    } else {
      setSemesterInfo('1st Year, Sem 1');
    }
  };

  const fetchSyllabus = async () => {
    setLoading(true);
    
    const { data: slots, error: slotsError } = await supabase
      .from('timetable_slots')
      .select('subject_code, subject_name, is_lab')
      .eq('user_roll', user?.roll_number)
      .eq('is_active', true);

    if (slotsError) {
      console.error('Error fetching slots:', slotsError);
      setLoading(false);
      return;
    }

    if (!slots || slots.length === 0) {
      setLoading(false);
      return;
    }

    const subjectCodes = [...new Set(slots.map(s => s.subject_code))];
    console.log('Active subject codes:', subjectCodes);

    const { data: structure, error: structureError } = await supabase
      .from('syllabus_structure')
      .select('*')
      .in('subject_code', subjectCodes);

    if (structureError) {
      console.error('Error fetching syllabus structure:', structureError);
      setLoading(false);
      return;
    }

    console.log('Found syllabus for:', structure?.map(s => s.subject_code));
    setAllSyllabus(structure || []);

    const { data: progress } = await supabase
      .from('syllabus_progress')
      .select('*')
      .eq('user_roll', user?.roll_number);

    const progressMap = new Map<string, Topic>();
    progress?.forEach((p: any) => progressMap.set(p.topic_id, p));

    const theorySubjects: SubjectProgress[] = [];
    const labSubjectsList: SubjectProgress[] = [];
    const anomalyList: { subject: string; topic: string; message: string }[] = [];

    subjectCodes.forEach((code) => {
      const slot = slots.find(s => s.subject_code === code);
      if (!slot) return;
      
      const topics = structure?.filter(t => t.subject_code === code) || [];
      if (topics.length === 0) return;

      const modulesMap = new Map<number, any[]>();
      topics.forEach(t => {
        if (!modulesMap.has(t.module_number)) modulesMap.set(t.module_number, []);
        modulesMap.get(t.module_number)!.push(t);
      });

      const moduleProgress = Array.from(modulesMap.entries()).map(([moduleNumber, moduleTopics]) => {
        const moduleTopicsWithProgress = moduleTopics.map(t => ({
          ...t,
          is_completed: progressMap.get(t.topic_id)?.is_completed || false,
          is_anomaly_skipped: progressMap.get(t.topic_id)?.is_anomaly_skipped || false,
        }));
        const total = moduleTopicsWithProgress.length;
        const completed = moduleTopicsWithProgress.filter(t => t.is_completed).length;
        return {
          module_number: moduleNumber,
          total,
          completed,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          topics: moduleTopicsWithProgress,
        };
      });

      const totalTopics = topics.length;
      const totalCompleted = moduleProgress.reduce((sum, m) => sum + m.completed, 0);

      const sortedTopics = [...topics].sort((a, b) => a.topic_id.localeCompare(b.topic_id));
      for (let i = 1; i < sortedTopics.length; i++) {
        const prev = progressMap.get(sortedTopics[i-1].topic_id);
        const curr = progressMap.get(sortedTopics[i].topic_id);
        if (curr?.is_completed && !prev?.is_completed && !prev?.is_anomaly_skipped) {
          anomalyList.push({
            subject: code,
            topic: sortedTopics[i-1].topic_name,
            message: `"${sortedTopics[i].topic_name}" is completed but "${sortedTopics[i-1].topic_name}" is not. Self-study required.`,
          });
        }
      }

      const subjectData = {
        subject_code: code,
        subject_name: slot.subject_name,
        is_lab: slot.is_lab || false,
        total: totalTopics,
        completed: totalCompleted,
        percentage: totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0,
        modules: moduleProgress,
      };

      if (slot.is_lab) {
        labSubjectsList.push(subjectData);
      } else {
        theorySubjects.push(subjectData);
      }
    });

    setSubjects(theorySubjects);
    setLabSubjects(labSubjectsList);
    setAnomalies(anomalyList);
    setLoading(false);
  };

  const toggleTopic = async (topic: any) => {
    if (!user) return;
    const newStatus = !topic.is_completed;
    const { error } = await supabase
      .from('syllabus_progress')
      .upsert({
        user_roll: user.roll_number,
        subject_code: topic.subject_code,
        topic_id: topic.topic_id,
        topic_name: topic.topic_name,
        module_number: topic.module_number,
        is_completed: newStatus,
        is_anomaly_skipped: topic.is_anomaly_skipped || false,
      }, { onConflict: 'user_roll, subject_code, topic_id' });

    if (!error) {
      fetchSyllabus();
    } else {
      console.error('Error toggling topic:', error);
    }
  };

  const skipAnomaly = async (subjectCode: string, topicId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('syllabus_progress')
      .upsert({
        user_roll: user.roll_number,
        subject_code: subjectCode,
        topic_id: topicId,
        is_anomaly_skipped: true,
      }, { onConflict: 'user_roll, subject_code, topic_id' });

    if (!error) {
      fetchSyllabus();
    }
  };

  const renderSubjectList = (subjectList: SubjectProgress[], isLab: boolean) => {
    if (subjectList.length === 0) return null;

    return (
      <div className="space-y-3">
        {isLab && (
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <FlaskConical size={20} style={{ color: 'var(--accent)' }} /> Lab Subjects
          </h2>
        )}
        {subjectList.map((subject) => {
          const isExpanded = expandedSubject === subject.subject_code;
          return (
            <div
              key={subject.subject_code}
              className="rounded-lg overflow-hidden"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-opacity-5"
                onClick={() => setExpandedSubject(isExpanded ? null : subject.subject_code)}
                style={{ backgroundColor: 'var(--surface)' }}
              >
                <div className="flex items-center gap-3">
                  {isLab ? <FlaskConical size={20} style={{ color: 'var(--accent)' }} /> : <BookOpen size={20} style={{ color: 'var(--accent)' }} />}
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {subject.subject_name} ({subject.subject_code})
                  </span>
                  {isLab && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>🧪 Lab</span>}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>{subject.completed}/{subject.total}</span>
                    <span className="font-medium" style={{ color: subject.percentage >= 80 ? 'var(--success)' : subject.percentage >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                      {subject.percentage}%
                    </span>
                  </div>
                  <div className="w-24 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${subject.percentage}%`, backgroundColor: subject.percentage >= 80 ? 'var(--success)' : subject.percentage >= 50 ? 'var(--warning)' : 'var(--danger)' }} />
                  </div>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 space-y-3" style={{ backgroundColor: 'var(--bg)' }}>
                  {subject.modules.map((mod) => {
                    const isModuleExpanded = expandedModule?.subject === subject.subject_code && expandedModule?.module === mod.module_number;
                    return (
                      <div key={mod.module_number} className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-opacity-5"
                          onClick={() => setExpandedModule(isModuleExpanded ? null : { subject: subject.subject_code, module: mod.module_number })}
                          style={{ backgroundColor: 'var(--surface)' }}
                        >
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {isLab ? `Experiments` : `Module ${mod.module_number}`}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{mod.completed}/{mod.total} completed</span>
                            <span className="text-sm font-medium" style={{ color: mod.percentage >= 80 ? 'var(--success)' : mod.percentage >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{mod.percentage}%</span>
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${mod.percentage}%`, backgroundColor: mod.percentage >= 80 ? 'var(--success)' : mod.percentage >= 50 ? 'var(--warning)' : 'var(--danger)' }} />
                            </div>
                            {isModuleExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>

                        {isModuleExpanded && (
                          <div className="p-3 space-y-1.5" style={{ backgroundColor: 'var(--bg)' }}>
                            {mod.topics.map((topic) => {
                              const isAnomaly = anomalies.some(a => a.topic === topic.topic_name);
                              return (
                                <div
                                  key={topic.id}
                                  className="flex items-center justify-between p-2 rounded hover:bg-opacity-5 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTopic(topic);
                                  }}
                                  style={{ backgroundColor: 'var(--card)' }}
                                >
                                  <div className="flex items-center gap-2">
                                    <CheckCircle size={18} style={{ color: topic.is_completed ? 'var(--success)' : 'var(--text-muted)', opacity: topic.is_completed ? 1 : 0.4 }} />
                                    <span className="text-sm" style={{ color: topic.is_completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                      {topic.topic_name}
                                    </span>
                                    {isAnomaly && !topic.is_anomaly_skipped && (
                                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(196, 90, 90, 0.15)', color: 'var(--danger)' }}>⚠️</span>
                                    )}
                                  </div>
                                  {topic.is_completed && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>✅ Done</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>Loading syllabus...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded hover:bg-opacity-10" style={{ color: 'var(--text-primary)' }}>
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>📚 Syllabus Tracker</h1>
        </div>
        {semesterInfo && (
          <span className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            {semesterInfo}
          </span>
        )}
      </div>

      {anomalies.length > 0 && (
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(196, 90, 90, 0.1)', border: '1px solid var(--danger)' }}>
          <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--danger)' }}>
            <AlertCircle size={20} /> Self-Study Required
          </h3>
          <ul className="mt-2 space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {anomalies.slice(0, 5).map((a, idx) => (
              <li key={idx} className="flex justify-between items-center">
                <span>📖 {a.subject}: {a.message}</span>
                <button
                  onClick={() => {
                    const topic = allSyllabus.find(t => t.topic_name === a.topic && t.subject_code === a.subject);
                    if (topic) skipAnomaly(a.subject, topic.topic_id);
                  }}
                  className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  Mark as Skipped
                </button>
              </li>
            ))}
            {anomalies.length > 5 && <li>...and {anomalies.length - 5} more</li>}
          </ul>
        </div>
      )}

      {renderSubjectList(subjects, false)}
      {renderSubjectList(labSubjects, true)}

      {subjects.length === 0 && labSubjects.length === 0 && (
        <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
          No syllabus found. Make sure you have a timetable set up.
        </div>
      )}
    </div>
  );
};

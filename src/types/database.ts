export type User = {
  roll_number: string;
  username: string;
  email?: string;
  batch_badge: string;
  academic_cycle: 'physics' | 'chemistry' | null;
  tier: 'free' | 'pro';
  sticky_note_content: string;
  theme_config: { base: 'light' | 'dark' | 'oled'; accent: string };
  faculty_vote_ledger: Record<string, number>;
  agreed_to_whisper: boolean;
  attendance_target: number;
  created_at: string;
};

export type TimetableSlot = {
  id: string;
  user_roll: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_code: string;
  subject_name: string;
  is_lab: boolean;
  is_active?: boolean;
  specific_date?: string;
  is_extra_class?: boolean;
  created_at: string;
};

export type AttendanceLog = {
  user_roll: string;
  subject_code: string;
  log_date: string;
  status: 'present' | 'absent' | 'teacher_absent' | 'proxy' | 'holiday';
  context_note?: string;
  created_at: string;
};

export type SyllabusProgress = {
  id: string;
  user_roll: string;
  subject_code: string;
  module_number: number;
  topic_id: string;
  topic_name: string;
  is_completed: boolean;
  is_anomaly_skipped: boolean;
  updated_at: string;
};

export type Deadline = {
  id: string;
  user_roll: string;
  subject_name: string;
  bounty_type: 'assignment' | 'quiz';
  due_date: string;
  description: string | null;
  is_completed: boolean;
  created_at: string;
};

export type FacultyProfile = {
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
  created_at: string;
};

export type Tables = {
  users: User;
  timetable_slots: TimetableSlot;
  attendance_logs: AttendanceLog;
  syllabus_progress: SyllabusProgress;
  deadlines: Deadline;
  faculty_profiles: FacultyProfile;
};

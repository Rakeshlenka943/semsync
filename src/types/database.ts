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
export type Tables = { users: User; };

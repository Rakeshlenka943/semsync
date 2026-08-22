import { supabase } from '../lib/supabase';
import type { User } from '../types/database';
import { parseRollNumber, buildBadge } from '../utils/rollNumberParser';

export type AuthCredentials = { username?: string; rollNumber?: string; password: string };
export type SignUpData = { username: string; rollNumber: string; password: string; academicCycle: 'physics' | 'chemistry' | null; email: string };

// Helper: Send welcome email via Resend
async function sendWelcomeEmail(email: string, username: string, rollNumber: string) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'SemSync <onboarding@resend.dev>',
        to: email,
        subject: 'Welcome to SemSync! 🎉',
        html: `
          <h1>Welcome to SemSync, ${username}!</h1>
          <p>Your account has been created successfully.</p>
          <p><strong>Your Roll Number:</strong> ${rollNumber}</p>
          <p><strong>Login Email:</strong> ${email}</p>
          <p>You can now login using your roll number or email.</p>
          <p>⚠️ Please keep your password safe. You can reset it anytime.</p>
          <br>
          <p>📚 <strong>SemSync</strong> - Your all-in-one student toolkit.</p>
          <p>Track attendance, syllabus, deadlines & more.</p>
        `,
      }),
    });
    if (!response.ok) {
      console.error('Failed to send welcome email:', await response.text());
    }
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
}

export async function signUp(data: SignUpData) {
  const { username, rollNumber, password, academicCycle, email } = data;

  let batchBadge: string;
  try {
    batchBadge = parseRollNumber(rollNumber).batchBadge;
  } catch {
    return { user: null, error: new Error('Invalid roll number') };
  }

  const authEmail = email || `${rollNumber}@gmail.com`;

  const { error: authError } = await supabase.auth.signUp({
    email: authEmail,
    password,
    options: {
      data: {
        username,
        roll_number: rollNumber,
        batch_badge: batchBadge,
        academic_cycle: academicCycle,
      },
    },
  });

  if (authError) {
    console.error('Auth signup error:', authError);
    return { user: null, error: authError };
  }

  const { data: userData, error: insertError } = await supabase
    .from('users')
    .insert({
      roll_number: rollNumber,
      username,
      email: authEmail,
      batch_badge: buildBadge(username, batchBadge),
      academic_cycle: academicCycle,
      tier: 'free',
      sticky_note_content: '',
      theme_config: { base: 'dark', accent: '#00d4ff' },
      faculty_vote_ledger: {},
      agreed_to_whisper: false,
      attendance_target: 75,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Profile insert error:', insertError);
    return { user: null, error: insertError };
  }

  // Send welcome email (async)
  sendWelcomeEmail(authEmail, username, rollNumber);

  return { user: userData as User, error: null };
}

export async function signIn(credentials: AuthCredentials) {
  const { username, rollNumber, password } = credentials;

  let authEmail: string | null = null;
  let finalRollNumber: string | null = null;

  // Case 1: Roll number provided
  if (rollNumber) {
    const { data, error } = await supabase
      .from('users')
      .select('email, roll_number')
      .eq('roll_number', rollNumber)
      .single();

    if (error || !data) {
      return { user: null, error: new Error('User not found with this roll number') };
    }
    authEmail = data.email;
    finalRollNumber = data.roll_number;
  }
  // Case 2: Username or email provided
  else if (username) {
    const { data, error } = await supabase
      .from('users')
      .select('email, roll_number')
      .or(`username.eq.${username},email.eq.${username}`);

    if (error || !data || data.length === 0) {
      return { user: null, error: new Error('User not found') };
    }
    if (data.length > 1) {
      return { user: null, error: null, needsRollNumber: true };
    }
    authEmail = data[0].email;
    finalRollNumber = data[0].roll_number;
  } else {
    return { user: null, error: new Error('Please provide username, email, or roll number') };
  }

  if (!authEmail || !finalRollNumber) {
    return { user: null, error: new Error('User data missing') };
  }

  // Authenticate with the actual email
  const { error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (error) {
    return { user: null, error };
  }

  // Fetch full user profile
  const { data: userData, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('roll_number', finalRollNumber)
    .single();

  if (fetchError) {
    return { user: null, error: fetchError };
  }

  return { user: userData as User, error: null };
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { user: null, error: null };

  const rollNumber = session.user.user_metadata?.roll_number;
  if (!rollNumber) {
    return { user: null, error: new Error('No roll number in metadata') };
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('roll_number', rollNumber)
    .single();

  return { user: userData as User | null, error };
}

// 🔑 Forgot Password - sends reset link directly via Supabase Auth
export async function resetPassword(email: string) {
  // Send password reset email via Supabase Auth
  // Supabase will check if the email exists in auth.users
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'http://localhost:5173/reset-password',
  });

  if (error) {
    console.error('Reset password error:', error);
    return { error };
  }

  return { error: null };
}

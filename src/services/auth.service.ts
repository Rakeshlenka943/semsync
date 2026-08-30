import { supabase } from '../lib/supabase';
import type { User } from '../types/database';
import { parseRollNumber, buildBadge } from '../utils/rollNumberParser';

export type AuthCredentials = { username?: string; rollNumber?: string; password: string };
export type SignUpData = { username: string; rollNumber: string; password: string; academicCycle: 'physics' | 'chemistry' | null };

export async function signUp(data: SignUpData) {
  const { username, rollNumber, password, academicCycle } = data;
  let batchBadge: string;
  try {
    batchBadge = parseRollNumber(rollNumber).batchBadge;
  } catch {
    return { user: null, error: new Error('Invalid roll number') };
  }

  const email = `${rollNumber}@gmail.com`;

  await supabase.auth.signOut();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
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
    if (authError.message?.includes('User already registered')) {
      return {
        user: null,
        error: new Error('This roll number is already registered. Please login instead.'),
      };
    }
    console.error('Auth signup error:', authError);
    return { user: null, error: authError };
  }

  const { data: userData, error: insertError } = await supabase
    .from('users')
    .insert({
      roll_number: rollNumber,
      username,
      email: email,
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

  return { user: userData as User, error: null };
}

export async function signIn(credentials: AuthCredentials) {
  const { username, rollNumber, password } = credentials;
  let finalRollNumber: string | null = rollNumber || null;
  let authEmail: string | null = null;
  let needsRollNumber = false;

  // 1. If roll number is provided – use it
  if (finalRollNumber) {
    authEmail = `${finalRollNumber}@gmail.com`;
    
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    if (error) {
      if (error.message?.includes('Invalid login credentials')) {
        return { user: null, error: new Error('Invalid roll number or password.') };
      }
      return { user: null, error };
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('roll_number', finalRollNumber)
      .single();

    if (profileError) {
      return { user: null, error: new Error('Profile not found.') };
    }
    return { user: profile as User, error: null };
  }

  // 2. If username provided
  if (username) {
    const { data: users, error } = await supabase
      .from('users')
      .select('roll_number, email')
      .eq('username', username);

    if (error) {
      console.error('User lookup error:', error);
      return { user: null, error: new Error('Database error. Please try again.') };
    }

    if (!users || users.length === 0) {
      return { user: null, error: new Error('User not found.') };
    }

    if (users.length > 1) {
      return { user: null, error: null, needsRollNumber: true };
    }

    const user = users[0];
    finalRollNumber = user.roll_number;
    authEmail = user.email || `${finalRollNumber}@gmail.com`;

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    if (signInError) {
      if (signInError.message?.includes('Invalid login credentials')) {
        return { user: null, error: new Error('Invalid username or password.') };
      }
      return { user: null, error: signInError };
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('roll_number', finalRollNumber)
      .single();

    if (profileError) return { user: null, error: profileError };
    return { user: profile as User, error: null };
  }

  return { user: null, error: new Error('Please provide username or roll number.') };
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { user: null, error: null };
  
  const rollNumber = session.user.user_metadata?.roll_number;
  if (!rollNumber) return { user: null, error: new Error('No roll number in metadata') };
  
  const { data: userData, error } = await supabase.from('users').select('*').eq('roll_number', rollNumber).single();
  return { user: userData as User | null, error };
}

export async function resetPassword(identifier: string) {
  // Find the user's auth email from the users table
  let email: string | null = null;
  
  // Try by email (if user enters email)
  const { data: userByEmail } = await supabase
    .from('users')
    .select('email')
    .eq('email', identifier)
    .single();
  if (userByEmail?.email) email = userByEmail.email;
  
  // If not found, try by roll number
  if (!email && /^\d{8}$/.test(identifier)) {
    const { data: userByRoll } = await supabase
      .from('users')
      .select('email')
      .eq('roll_number', identifier)
      .single();
    if (userByRoll?.email) email = userByRoll.email;
  }
  
  if (!email) {
    // Return success even if not found (security best practice)
    return { error: null };
  }
  
  // Build redirect URL – uses the current window origin (will be Vercel URL in production)
  const redirectUrl = window.location.origin + '/reset-password';
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  return { error };
}

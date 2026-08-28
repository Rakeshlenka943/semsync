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

  // Clear any existing session
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

  const { data: userData, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('roll_number', rollNumber)
    .single();

  if (fetchError) {
    console.error('Fetch profile error:', fetchError);
    return { user: null, error: new Error('Profile creation failed. Please try logging in.') };
  }

  return { user: userData as User, error: null };
}

export async function signIn(credentials: AuthCredentials) {
  const { username, rollNumber, password } = credentials;
  let finalRollNumber = rollNumber;
  let needsRollNumber = false;

  // If roll number provided directly, use it
  if (finalRollNumber) {
    const email = `${finalRollNumber}@gmail.com`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { user: null, error };
    }
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('roll_number', finalRollNumber)
      .single();
    if (fetchError) return { user: null, error: fetchError };
    return { user: userData as User, error: null };
  }

  // If username provided, check if multiple users share it
  if (username) {
    const { data: users, error } = await supabase
      .from('users')
      .select('roll_number, username')
      .eq('username', username);

    if (error) {
      return { user: null, error };
    }

    if (!users || users.length === 0) {
      // Try to find by email (if username is actually an email)
      const { data: emailUsers } = await supabase
        .from('users')
        .select('roll_number')
        .eq('email', username);
      if (emailUsers && emailUsers.length > 0) {
        const email = username;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) return { user: null, error: signInError };
        const { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('email', username)
          .single();
        if (fetchError) return { user: null, error: fetchError };
        return { user: userData as User, error: null };
      }
      return { user: null, error: new Error('User not found') };
    }

    if (users.length > 1) {
      // Multiple users with same username → need roll number
      return { user: null, error: null, needsRollNumber: true };
    }

    // Exactly one user with this username
    finalRollNumber = users[0].roll_number;
    const email = `${finalRollNumber}@gmail.com`;
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) return { user: null, error: signInError };
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('roll_number', finalRollNumber)
      .single();
    if (fetchError) return { user: null, error: fetchError };
    return { user: userData as User, error: null };
  }

  return { user: null, error: new Error('Please provide username or roll number') };
}

export async function signOut() { return supabase.auth.signOut(); }

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { user: null, error: null };
  const rollNumber = session.user.user_metadata?.roll_number;
  if (!rollNumber) return { user: null, error: new Error('No roll number in metadata') };
  const { data: userData, error } = await supabase.from('users').select('*').eq('roll_number', rollNumber).single();
  return { user: userData as User | null, error };
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password',
  });
  return { error };
}

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

  // Use the user's email (we'll store it in the users table)
  const email = `${rollNumber}@gmail.com`; // fallback, but we'll use the provided email from the form later

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

  // Fetch the newly created user profile (trigger should have created it)
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
  let finalRollNumber: string | null = rollNumber || null;
  let finalEmail: string | null = null;
  let needsRollNumber = false;

  // 1. If roll number is provided directly, use it
  if (finalRollNumber) {
    // Fetch the user's email from the users table
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('email')
      .eq('roll_number', finalRollNumber)
      .single();

    if (fetchError || !userData || !userData.email) {
      return { user: null, error: new Error('User not found with this roll number.') };
    }

    finalEmail = userData.email;

    const { error } = await supabase.auth.signInWithPassword({
      email: finalEmail,
      password,
    });

    if (error) {
      return { user: null, error };
    }

    // Fetch full profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('roll_number', finalRollNumber)
      .single();

    if (profileError) return { user: null, error: profileError };
    return { user: profile as User, error: null };
  }

  // 2. If username or email provided
  if (username) {
    // Check if the identifier looks like an email
    const isEmail = username.includes('@');

    let query = supabase.from('users').select('roll_number, username, email');

    if (isEmail) {
      // Search by email
      query = query.eq('email', username);
    } else {
      // Search by username
      query = query.eq('username', username);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('User lookup error:', error);
      return { user: null, error: new Error('Database error. Please try again.') };
    }

    if (!users || users.length === 0) {
      return { user: null, error: new Error('User not found.') };
    }

    if (users.length > 1) {
      // Multiple users with same username (should only happen if searching by username)
      return { user: null, error: null, needsRollNumber: true };
    }

    // Exactly one user found
    const user = users[0];
    finalRollNumber = user.roll_number;
    finalEmail = user.email;

    if (!finalEmail) {
      // Fallback: build email from roll number (should not happen)
      finalEmail = `${finalRollNumber}@gmail.com`;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: finalEmail,
      password,
    });

    if (signInError) {
      return { user: null, error: signInError };
    }

    // Fetch full profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('roll_number', finalRollNumber)
      .single();

    if (profileError) return { user: null, error: profileError };
    return { user: profile as User, error: null };
  }

  return { user: null, error: new Error('Please provide username, email, or roll number.') };
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

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password',
  });
  return { error };
}

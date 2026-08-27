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

  // 🔥 FIX: Clear any existing session before signup (prevents stale token issues)
  await supabase.auth.signOut();

  // 1. Create auth user (the trigger will insert the profile)
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
    // Check if user already exists in auth
    if (authError.message?.includes('User already registered')) {
      return {
        user: null,
        error: new Error('This roll number is already registered. Please login instead.'),
      };
    }
    console.error('Auth signup error:', authError);
    return { user: null, error: authError };
  }

  // 2. Fetch the newly created user profile (trigger should have created it)
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
  if (!finalRollNumber && username) {
    const { data } = await supabase.from('users').select('roll_number').eq('username', username);
    if (!data || data.length === 0) return { user: null, error: new Error('User not found') };
    if (data.length > 1) return { user: null, error: null, needsRollNumber: true };
    finalRollNumber = data[0].roll_number;
  }
  if (!finalRollNumber) return { user: null, error: new Error('No roll number provided') };
  const email = `${finalRollNumber}@gmail.com`;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error };
  const { data: userData, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('roll_number', finalRollNumber)
    .single();
  if (fetchError) return { user: null, error: fetchError };
  return { user: userData as User, error: null };
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

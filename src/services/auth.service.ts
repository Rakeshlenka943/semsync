import { supabase } from '../lib/supabase';
import type { User } from '../types/database';
import { parseRollNumber, buildBadge } from '../utils/rollNumberParser';

export type AuthCredentials = { username?: string; rollNumber?: string; password: string };
export type SignUpData = { username: string; rollNumber: string; password: string; academicCycle: 'physics' | 'chemistry' | null };

/**
 * Sign up a new user.
 * 1. Creates the auth user with email = rollNumber@outr.ac.in (or gmail)
 * 2. The DB trigger inserts the user profile into `users` table.
 * 3. Returns the user profile.
 */
export async function signUp(data: SignUpData) {
  const { username, rollNumber, password, academicCycle } = data;

  let batchBadge: string;
  try {
    batchBadge = parseRollNumber(rollNumber).batchBadge;
  } catch {
    return { user: null, error: new Error('Invalid roll number format. Must be 8 digits.') };
  }

  // Use a consistent email domain – we'll use gmail for simplicity.
  // Supabase auth requires a valid email format.
  const email = `${rollNumber}@gmail.com`;

  // Clear any stale session
  await supabase.auth.signOut();

  // 1. Create auth user
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
    console.error('Auth signup error:', authError);
    if (authError.message?.includes('User already registered')) {
      return {
        user: null,
        error: new Error('This roll number is already registered. Please login instead.'),
      };
    }
    return { user: null, error: authError };
  }

  // 2. The DB trigger should have inserted the profile, but we'll wait a moment and fetch.
  // Wait a bit for the trigger to run (Supabase trigger is synchronous but just in case)
  await new Promise(resolve => setTimeout(resolve, 100));

  const { data: userData, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('roll_number', rollNumber)
    .single();

  if (fetchError) {
    console.error('Fetch profile error:', fetchError);
    // If profile not found, try to insert manually (fallback)
    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert({
        roll_number: rollNumber,
        username,
        email,
        batch_badge: buildBadge(username, batchBadge),
        academic_cycle: academicCycle,
        tier: 'free',
        sticky_note_content: '',
        theme_config: { base: 'dark', accent: '#00d4ff' },
        faculty_vote_ledger: {},
        agreed_to_whisper: false,
        attendance_target: 75,
        auth_user_id: authData?.user?.id,
      })
      .select()
      .single();

    if (insertError) {
      return { user: null, error: new Error('Profile creation failed. Please try logging in.') };
    }
    return { user: inserted as User, error: null };
  }

  return { user: userData as User, error: null };
}

/**
 * Sign in a user with username, email, or roll number.
 * Always uses the email from the `users` table for authentication.
 */
export async function signIn(credentials: AuthCredentials) {
  const { username, rollNumber, password } = credentials;

  // If roll number provided directly, try to find the user by roll number
  if (rollNumber) {
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('roll_number', rollNumber)
      .single();

    if (fetchError || !userData) {
      return { user: null, error: new Error('No account found with this roll number.') };
    }

    // Check if we have an email stored in the users table
    const email = userData.email;
    if (!email) {
      return { user: null, error: new Error('Account email missing. Please contact support.') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Auth signin error:', error);
      return { user: null, error };
    }

    return { user: userData as User, error: null };
  }

  // If username or email provided
  if (username) {
    // Determine if this is an email
    const isEmail = username.includes('@');
    let query = supabase.from('users').select('*');

    if (isEmail) {
      query = query.eq('email', username);
    } else {
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
      // Multiple users with same username (only possible if username is duplicated)
      return { user: null, error: null, needsRollNumber: true };
    }

    const user = users[0];
    const email = user.email;
    if (!email) {
      return { user: null, error: new Error('Account email missing. Please contact support.') };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Auth signin error:', signInError);
      return { user: null, error: signInError };
    }

    return { user: user as User, error: null };
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
  if (!rollNumber) {
    return { user: null, error: new Error('No roll number in user metadata.') };
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('roll_number', rollNumber)
    .single();

  return { user: userData as User | null, error };
}

/**
 * Reset password – sends a reset link to the provided email.
 * If the email doesn't exist in our `users` table, we still return success to avoid email enumeration.
 * The actual reset will fail if Supabase Auth doesn't know the email.
 */
export async function resetPassword(email: string) {
  // Optional: check if email exists in users table (for a better user experience)
  // But we'll let Supabase handle it and return a generic message.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password',
  });

  if (error) {
    console.error('Reset password error:', error);
    return { error };
  }

  return { error: null };
}

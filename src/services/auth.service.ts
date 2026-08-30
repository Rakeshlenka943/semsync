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

  // The database trigger should create the profile row, but we'll fetch it
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
  
  // Clear any stale session before attempting login
  await supabase.auth.signOut();

  let finalRollNumber: string | null = null;
  let needsRollNumber = false;

  // 1. If roll number provided directly, use it
  if (rollNumber) {
    finalRollNumber = rollNumber;
  } 
  // 2. If username provided
  else if (username) {
    // Try to find by username in users table
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('roll_number, username, email')
      .eq('username', username);

    if (queryError) {
      console.error('Username lookup error:', queryError);
      return { user: null, error: new Error('Database error. Please try again.') };
    }

    if (!users || users.length === 0) {
      // Try to find by email (if username looks like an email)
      const isEmail = username.includes('@');
      if (isEmail) {
        const { data: emailUsers, error: emailError } = await supabase
          .from('users')
          .select('roll_number')
          .eq('email', username);
        if (!emailError && emailUsers && emailUsers.length > 0) {
          finalRollNumber = emailUsers[0].roll_number;
        }
      }
      
      if (!finalRollNumber) {
        // Try to find in auth.users by email (fallback)
        const { data: authUsers, error: authError } = await supabase
          .from('auth.users')
          .select('email')
          .eq('email', username);
        if (!authError && authUsers && authUsers.length > 0) {
          // We don't have roll number, but we can attempt login with email
          // We'll try to login directly with email and password
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: username,
            password,
          });
          if (signInError) {
            return { user: null, error: signInError };
          }
          // Fetch user profile from users table using the session's user metadata
          const roll = signInData.user.user_metadata?.roll_number;
          if (roll) {
            finalRollNumber = roll;
          } else {
            return { user: null, error: new Error('User profile incomplete. Please contact support.') };
          }
        } else {
          return { user: null, error: new Error('User not found. Please check your username/email.') };
        }
      }
    } else if (users.length > 1) {
      // Multiple users with same username -> need roll number
      return { user: null, error: null, needsRollNumber: true };
    } else {
      // Exactly one user
      finalRollNumber = users[0].roll_number;
    }
  } else {
    return { user: null, error: new Error('Please provide username or roll number') };
  }

  // If we still don't have a roll number, fail
  if (!finalRollNumber) {
    return { user: null, error: new Error('Unable to resolve user. Please try again.') };
  }

  // Get the email from the users table (or use the roll number to construct it)
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('email')
    .eq('roll_number', finalRollNumber)
    .single();

  let authEmail = userProfile?.email || `${finalRollNumber}@gmail.com`;

  // Attempt sign in
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (signInError) {
    // If login fails, maybe the email is wrong; try fallback
    if (signInError.message.includes('Invalid login credentials')) {
      // Try constructing email from roll number
      const fallbackEmail = `${finalRollNumber}@gmail.com`;
      if (fallbackEmail !== authEmail) {
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: fallbackEmail,
          password,
        });
        if (!retryError) {
          authEmail = fallbackEmail;
        } else {
          return { user: null, error: retryError };
        }
      } else {
        return { user: null, error: signInError };
      }
    } else {
      return { user: null, error: signInError };
    }
  }

  // Fetch full user profile
  const { data: userData, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('roll_number', finalRollNumber)
    .single();

  if (fetchError) {
    console.error('Fetch profile error:', fetchError);
    return { user: null, error: new Error('User profile not found. Please contact support.') };
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

/*
 * REQUIRED: Run this SQL in Supabase Dashboard → SQL Editor:
 *
 * create table if not exists user_profiles (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid references auth.users(id) on delete cascade not null unique,
 *   name text,
 *   motherhood_stage text,
 *   preferred_time_window text,
 *   preferred_categories text[] default '{}',
 *   support_people jsonb default '[]',
 *   onboarding_completed boolean default false,
 *   created_at timestamptz default now(),
 *   updated_at timestamptz default now()
 * );
 * alter table user_profiles enable row level security;
 * create policy "Users can manage their own profile"
 *   on user_profiles for all using (auth.uid() = user_id);
 *
 * create table if not exists user_preference_profile (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid references auth.users(id) on delete cascade not null unique,
 *   preferred_categories text[] default '{}',
 *   avoided_categories text[] default '{}',
 *   preferred_effort text default 'Low',
 *   strong_regulation_types text[] default '{}',
 *   total_checkins integer default 0,
 *   updated_at timestamptz default now()
 * );
 * alter table user_preference_profile enable row level security;
 * create policy "Users can manage their own preference profile"
 *   on user_preference_profile for all using (auth.uid() = user_id);
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Returns null when env vars aren't configured yet (local dev without Supabase)
function makeClient(key: string | undefined) {
  if (!supabaseUrl || !key) return null
  // Guard against placeholder values in .env.local
  if (!supabaseUrl.startsWith('http')) return null
  return createClient(supabaseUrl, key)
}

// Browser / client-side — uses anon key (respects RLS)
export const supabase = makeClient(supabaseAnonKey)

// Server-side only — uses service role key (bypasses RLS, for API routes)
export const supabaseAdmin = makeClient(supabaseServiceKey ?? supabaseAnonKey)

// ─── Types matching our SQL schema ───────────────────────────────────────────

export interface FeedbackRow {
  id?: string
  user_id: string
  rec_id: number
  rec_title: string
  rating: 1 | 2 | 3          // 1=skip  2=save  3=did_it
  check_in_mood?: string
  regulation_phase?: string
  regulation_type?: string
  category?: string
  effort_level?: string
  time_of_day?: string
  created_at?: string
}

export interface PreferenceProfileRow {
  user_id: string
  preferred_categories: string[]
  avoided_categories: string[]
  preferred_effort: string
  strong_regulation_types: string[]
  total_checkins: number
  updated_at?: string
}

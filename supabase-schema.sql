-- ─────────────────────────────────────────────────────────────────────────────
-- Kindrest Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Recommendation Feedback
--    Every time a user rates a recommendation (skip / save / did it)
--    one row is inserted here. This is the raw event log.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists recommendation_feedback (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null,          -- anonymous or auth user id
  rec_id             integer not null,        -- matches Airtable rec_id
  rec_title          text not null,
  rating             integer not null         -- 1=skip  2=save  3=did_it
                       check (rating between 1 and 3),
  check_in_mood      text,                    -- e.g. 'overwhelmed'
  regulation_phase   text,                    -- e.g. 'Contain'
  regulation_type    text,                    -- e.g. 'Physical'
  category           text,                    -- e.g. 'Micro Practice'
  effort_level       text,                    -- 'Low' | 'Medium' | 'High'
  time_of_day        text,                    -- 'morning' | 'afternoon' | 'evening'
  created_at         timestamptz default now()
);

create index if not exists idx_feedback_user_id on recommendation_feedback(user_id);
create index if not exists idx_feedback_rec_id   on recommendation_feedback(rec_id);
create index if not exists idx_feedback_rating   on recommendation_feedback(rating);


-- 2. User Preference Profile
--    One row per user. Updated (upserted) after each feedback event.
--    This compact record (~150 tokens) is injected into every Claude prompt
--    so the model personalises its response without needing a vector search.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists user_preference_profile (
  user_id                text primary key,
  preferred_categories   text[] default '{}',   -- top-rated categories
  avoided_categories     text[] default '{}',   -- skipped categories
  preferred_effort       text default 'Low',    -- 'Low' | 'Medium' | 'High'
  strong_regulation_types text[] default '{}',  -- which types resonate most
  total_checkins         integer default 0,
  updated_at             timestamptz default now()
);


-- 3. Row Level Security (enable after adding auth)
--    Uncomment these once you wire up Supabase Auth.
-- ─────────────────────────────────────────────────────────────────────────────
-- alter table recommendation_feedback enable row level security;
-- alter table user_preference_profile  enable row level security;
--
-- create policy "users can insert own feedback"
--   on recommendation_feedback for insert
--   with check (auth.uid()::text = user_id);
--
-- create policy "users can read own feedback"
--   on recommendation_feedback for select
--   using (auth.uid()::text = user_id);
--
-- create policy "users can manage own profile"
--   on user_preference_profile for all
--   using (auth.uid()::text = user_id);

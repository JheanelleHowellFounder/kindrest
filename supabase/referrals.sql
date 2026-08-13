-- Referrals — one mother inviting another.
--
-- Two tables so a code can outlive a single invite: referral_codes is her
-- permanent link, referrals records each person who came through it.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

create extension if not exists pgcrypto;

-- ── Her link ─────────────────────────────────────────────────────────────────
create table if not exists referral_codes (
  code       text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade unique,
  created_at timestamptz not null default now()
);

-- ── Who came through it ──────────────────────────────────────────────────────
create table if not exists referrals (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  referrer_id uuid references auth.users(id) on delete set null,
  -- One attribution per invitee, ever. Re-opening a link can't double-count.
  invitee_id  uuid not null references auth.users(id) on delete cascade unique,
  created_at  timestamptz not null default now()
);

create index if not exists referrals_referrer_idx on referrals(referrer_id);

-- ── Access ───────────────────────────────────────────────────────────────────
-- Both tables are reached only through server routes using the service role,
-- which bypasses RLS. Enabling it with no policy means a leaked anon key still
-- exposes nothing.
alter table referral_codes enable row level security;
alter table referrals      enable row level security;

-- Her village — the people who love her, leaving her notes.
--
-- Deliberately the narrow version of community:
--   · Notes travel one way. Nobody who leaves one can read anything of hers.
--   · No account, no profile, no login for the person writing.
--   · No feed, no discovery, no way to find a mother you weren't sent to.
--   · She holds the only link, and can switch it off.
--
-- That shape is what keeps this a guestbook rather than a social network, and
-- it is the reason it can ship without the moderation machinery a public space
-- would need. Keep it that way.
--
-- Safe to re-run.

create extension if not exists pgcrypto;

-- ── Her link ─────────────────────────────────────────────────────────────────
create table if not exists village_links (
  code       text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade unique,
  active     boolean not null default true,   -- she can close the door
  created_at timestamptz not null default now()
);

-- ── What they left her ───────────────────────────────────────────────────────
create table if not exists village_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  from_name  text not null,
  body       text not null,
  created_at timestamptz not null default now(),
  seen_at    timestamptz,                     -- so the home screen shows new ones first
  hidden     boolean not null default false   -- she can remove one instantly
);

create index if not exists village_notes_user_idx
  on village_notes (user_id, created_at desc);

-- Rate limiting counts recent notes per recipient.
create index if not exists village_notes_recent_idx
  on village_notes (user_id, created_at);

-- ── Access ───────────────────────────────────────────────────────────────────
-- Both tables are reached only through server routes using the service role,
-- which bypasses RLS. Enabling it with no policy means a leaked anon key
-- exposes nothing — which matters here, because these notes name real people.
alter table village_links enable row level security;
alter table village_notes enable row level security;

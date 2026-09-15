-- Check-ins — one row each time a mother goes through the check-in process.
--
-- Before this, nothing recorded a check-in. The app guessed two ways, both wrong:
--   · a counter that went up every time a care kit loaded, including every
--     "Something else" tap (overcounts)
--   · days on which she rated something (undercounts: 6 real mothers had
--     checked in without rating and were invisible to the admin report, their
--     History calendar, and the hard-day nudge)
--
-- RUN THESE AS TWO SEPARATE QUERIES. The Supabase SQL editor runs a block as a
-- single transaction, so if the backfill fails the table would roll back with it.


-- ── QUERY 1 — the table ──────────────────────────────────────────────────────
-- Safe to re-run.

create table if not exists checkins (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  mood            text,          -- null for "I'm not sure → write it out"
  time_available  text,
  source          text not null default 'care_kit',   -- care_kit | journal | backfill_rating | backfill_first
  estimated       boolean not null default false,     -- true only for rows reconstructed from before this table
  created_at      timestamptz not null default now()
);

create index if not exists checkins_user_created_idx on checkins (user_id, created_at desc);

-- A mother can read her own check-ins and nothing else. There is deliberately
-- no insert policy: rows are only ever written by the server, which is what
-- makes "Something else" provably the same check-in.
alter table checkins enable row level security;

drop policy if exists "checkins_select_own" on checkins;
create policy "checkins_select_own" on checkins
  for select using (auth.uid() = user_id);


-- ── QUERY 2 — backfill the past (estimated) ──────────────────────────────────
-- The founder chose option C: one check-in per day she rated something, plus her
-- first_checkin_at on a day with no rating. Every backfilled row is marked
-- estimated = true, and the admin report labels those numbers as estimated.
--
-- NOTE THE ::text CAST. recommendation_feedback.user_id is a *text* column that
-- also holds simulation ids ('demo-user-001', 'sim-persona-1'). Joining through
-- auth.users on the text form keeps only real accounts and avoids
--   42883: operator does not exist: uuid = text
--
-- Safe to re-run: part 1 only runs if no estimated rows exist yet, and part 2
-- skips any day that already has a check-in.

-- Part 1: one per (user, day) with a rating — the earliest rating that day.
insert into checkins (user_id, mood, source, estimated, created_at)
select u.id, f.check_in_mood, 'backfill_rating', true, f.first_at
from (
  select distinct on (user_id, (created_at at time zone 'utc')::date)
         user_id, check_in_mood, created_at as first_at
  from recommendation_feedback
  order by user_id, (created_at at time zone 'utc')::date, created_at
) f
join auth.users u on u.id::text = f.user_id
where not exists (select 1 from checkins c where c.estimated);

-- Part 2: her first check-in, for mothers whose first check-in day has no rating.
insert into checkins (user_id, source, estimated, created_at)
select p.user_id, 'backfill_first', true, p.first_checkin_at
from user_profiles p
join auth.users u on u.id = p.user_id
where p.first_checkin_at is not null
  and not exists (
    select 1 from checkins c
    where c.user_id = p.user_id
      and (c.created_at at time zone 'utc')::date = (p.first_checkin_at at time zone 'utc')::date
  );

-- Check the result: rows per source.
select source, estimated, count(*) as rows, count(distinct user_id) as mothers
from checkins
group by source, estimated
order by source;

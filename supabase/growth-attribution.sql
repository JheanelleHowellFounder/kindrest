-- Growth attribution — where each mother came from.
--
-- All nullable: every one of these is unknown for the 19 people who signed up
-- before this existed, and unknown for anyone who arrives with no campaign tags.
--
-- Safe to re-run.

alter table user_profiles
  add column if not exists utm_source      text,
  add column if not exists utm_medium      text,
  add column if not exists utm_campaign    text,
  add column if not exists referrer        text,
  add column if not exists device_type     text,
  add column if not exists heard_about_us  text,
  add column if not exists first_seen_at   timestamptz,
  -- Not in the original spec, added deliberately. Activation is measured as
  -- "first check-in within 48h", and the only dated check-in evidence today is
  -- recommendation_feedback — which is written when she *rates* a suggestion.
  -- 22 users have checked in but only 17 ever rated, so a feedback-based
  -- definition understates activation by roughly a quarter. This records the
  -- check-in itself.
  add column if not exists first_checkin_at timestamptz;

create index if not exists user_profiles_utm_source_idx on user_profiles (utm_source);

-- Backfill first_checkin_at for anyone who has rated something, so the growth
-- table has real history from day one rather than an empty activation column.
-- The six who checked in without ever rating can't be recovered; they'll be
-- recorded correctly from now on.
update user_profiles p
set first_checkin_at = f.first_at
from (
  select user_id, min(created_at) as first_at
  from recommendation_feedback
  group by user_id
) f
where p.user_id = f.user_id
  and p.first_checkin_at is null;

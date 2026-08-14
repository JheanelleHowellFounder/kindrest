-- Landing page views — the missing half of "is the landing page working?"
--
-- We record every signup but nothing about the people who looked and left, so
-- conversion has been unanswerable. This is a daily counter, nothing more:
-- no visitor ids, no IPs, no sessions, no personal data of any kind. One row
-- per day, one number on it.
--
-- Counted once per browser session, so a mother refreshing the page or coming
-- back later in the same visit doesn't inflate it.
--
-- Safe to re-run.

create table if not exists landing_views (
  day   date primary key,
  views integer not null default 0
);

alter table landing_views enable row level security;

-- Incremented server-side with the service role, which bypasses RLS. Enabling
-- RLS with no policy means a leaked anon key can neither read nor write it.

-- Atomic increment, so simultaneous visitors can't overwrite each other.
create or replace function increment_landing_view(on_day date)
returns void
language sql
as $$
  insert into landing_views (day, views)
  values (on_day, 1)
  on conflict (day) do update set views = landing_views.views + 1;
$$;

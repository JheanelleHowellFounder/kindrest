-- Kindrest @ Work — org attribution.
-- Run in Supabase → SQL Editor. Additive; nothing existing is touched.
--
-- Deliberately kept OUT of user_profiles: a separate membership table means the
-- profile query can never break because of a missing column (which is exactly
-- what took the admin report down before).

create table if not exists organizations (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,        -- the join link: /join/<slug>
  name         text not null,               -- "PagerDuty"
  cohort_size  integer,                     -- seats the pilot covers
  status       text not null default 'active',  -- 'active' | 'ended'
  started_on   date default (now()::date),
  created_at   timestamptz default now()
);

create table if not exists org_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  joined_at  timestamptz default now(),
  unique (org_id, user_id)
);

create index if not exists org_members_org on org_members (org_id);

alter table organizations enable row level security;
alter table org_members  enable row level security;

-- Orgs are readable by anyone (the join page needs the name before sign-in).
-- Writes happen server-side with the service role only.
create policy "Anyone can read active organizations"
  on organizations for select using (status = 'active');

-- A mother can see her own membership; nothing else.
create policy "Users read their own membership"
  on org_members for select using (auth.uid() = user_id);


-- ── Add a pilot ───────────────────────────────────────────────────────────────
-- insert into organizations (slug, name, cohort_size)
-- values ('pagerduty', 'PagerDuty', 50);
--
-- Her cohort then joins at:  kindrest.co/join/pagerduty

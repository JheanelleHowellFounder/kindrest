-- Glimmer V0 — the daily-glimmer feature.
-- Run this in Supabase → SQL Editor when you're ready to persist glimmers.
-- Until it's run, the app still works in preview (writes just don't save).

create table if not exists glimmers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  prompt_id   text not null,
  prompt_text text not null,
  body        text,                       -- null = "nothing today," still a valid check-in
  mood_signal text,                       -- 'answered' | 'quiet' | 'heavy' — how she finished
  responded   boolean default true,
  entry_date  date not null default (now()::date),
  created_at  timestamptz default now(),
  unique (user_id, entry_date)            -- one glimmer per day; re-answering upserts
);

-- If you already created `glimmers` before this column existed, run this once:
alter table glimmers add column if not exists mood_signal text;

alter table glimmers enable row level security;

create policy "Users manage their own glimmers"
  on glimmers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

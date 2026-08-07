-- Rest Card (V2) — a 4×4 card of restorative actions, refreshed on a cycle.
-- Run in Supabase → SQL Editor when ready. App degrades gracefully without it.

create table if not exists rest_cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  cycle_start date not null default (now()::date),
  cycle_end   date not null,
  status      text not null default 'active',   -- 'active' | 'archived'
  created_at  timestamptz default now()
);

create table if not exists rest_card_squares (
  id           uuid primary key default gen_random_uuid(),
  card_id      uuid references rest_cards(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  position     int not null,                    -- 0–15, row-major
  label        text not null,
  source       text not null default 'kindrest',-- 'kindrest' | 'user'
  status       text not null default 'open',    -- 'open' | 'done'
  completed_at timestamptz
);

alter table rest_cards enable row level security;
alter table rest_card_squares enable row level security;

create policy "Users manage their own rest cards"
  on rest_cards for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own rest card squares"
  on rest_card_squares for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists rest_cards_active on rest_cards (user_id, status);
create index if not exists rest_card_squares_card on rest_card_squares (card_id, position);

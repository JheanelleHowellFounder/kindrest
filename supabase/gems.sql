-- Gamification V1 — gems + reserve.
-- Run in Supabase → SQL Editor when ready to persist. Until then the app still
-- works in preview (the reserve just reads empty).
--
-- Append-only ledger: every gem grant (and later, spend) is one row. Balance and
-- reserve are computed from this — the ledger is the single source of truth, so
-- there's no balance to drift out of sync.

create table if not exists gem_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  delta      integer not null,          -- + earned, - spent (spending comes in V2)
  reason     text not null,             -- 'glimmer_answered', 'journal_entry', 'practice_done', ...
  ref_type   text not null,             -- what the grant is tied to ('glimmer', 'journal', 'practice')
  ref_id     text,                      -- natural key for idempotency (e.g. the date, or rec-date)
  created_at timestamptz default now()
);

alter table gem_ledger enable row level security;

create policy "Users read their own gem ledger"
  on gem_ledger for select using (auth.uid() = user_id);

create policy "Users insert their own gem ledger"
  on gem_ledger for insert with check (auth.uid() = user_id);

-- Idempotency: a given source event grants at most once.
create unique index if not exists gem_ledger_idem
  on gem_ledger (user_id, ref_type, ref_id) where ref_id is not null;

-- Love Notes — approve the first note from a new sender.
--
-- A note from someone she doesn't recognise shouldn't land unfiltered on her
-- home screen on her worst morning. But asking her to approve every note from
-- her own mother turns a kindness into an inbox.
--
-- So: the first note from a name waits. Once she allows that sender, everything
-- they write afterwards goes straight through.
--
-- Safe to re-run.

-- ── Note state ───────────────────────────────────────────────────────────────
-- pending → waiting for her
-- kept    → she allowed it; shows on her home screen
-- hidden  → she removed it, or blocked the sender
alter table village_notes
  add column if not exists status text not null default 'kept';

alter table village_notes
  drop constraint if exists village_notes_status_check;

alter table village_notes
  add constraint village_notes_status_check
  check (status in ('pending', 'kept', 'hidden'));

-- Everything that arrived before this existed was already visible to her.
update village_notes set status = 'kept'   where status is null;
update village_notes set status = 'hidden' where hidden = true;

create index if not exists village_notes_status_idx
  on village_notes (user_id, status, created_at desc);

-- ── Who she's allowed ────────────────────────────────────────────────────────
-- Matched on a normalised name, because that is all a sender gives us. It is
-- deliberately weak: someone could type a name she trusts. The protection this
-- offers is against a stranger's first note landing unannounced, not against a
-- determined impersonator — she can still delete anything and rotate her link.
create table if not exists village_senders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name_key   text not null,                  -- lowercased, trimmed
  status     text not null default 'allowed' check (status in ('allowed', 'blocked')),
  created_at timestamptz not null default now(),
  unique (user_id, name_key)
);

create index if not exists village_senders_lookup
  on village_senders (user_id, name_key);

alter table village_senders enable row level security;

-- Anyone already in her notes counts as allowed, so this change doesn't make
-- her re-approve people she has heard from before.
insert into village_senders (user_id, name_key)
select distinct user_id, lower(trim(from_name))
from village_notes
where from_name is not null and trim(from_name) <> ''
on conflict (user_id, name_key) do nothing;

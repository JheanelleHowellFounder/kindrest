-- Rest Card integrity — 8 September 2026
--
-- Two guarantees the application can't make on its own, from findings F1 and F7
-- of docs/rest-card-audit.md:
--
--   F1. A card must never carry the same label twice. The old dealer padded
--       short deals from a hardcoded list by index, with no uniqueness check.
--   F7. A mother must never have two active cards. The old route read, then
--       archived, then inserted, with nothing between the read and the write,
--       so two simultaneous requests could both deal.
--
-- Safe to run more than once.

-- ── 1. Clear the way ─────────────────────────────────────────────────────────
-- Four squares on one archived card carry an empty label. They are from the
-- 16-square prototype (source 'user') and render as blank cells: no content is
-- lost. They are the only rows that would violate the constraint below.
delete from rest_card_squares
where coalesce(trim(label), '') = '';

-- ── 2. F1 — one label per card ───────────────────────────────────────────────
alter table rest_card_squares
  drop constraint if exists rest_card_squares_card_label_unique;

alter table rest_card_squares
  add constraint rest_card_squares_card_label_unique unique (card_id, label);

-- ── 3. F7 — one active card per mother ───────────────────────────────────────
-- Partial, so archived cards are free to pile up as history.
drop index if exists rest_cards_one_active_per_user;

create unique index rest_cards_one_active_per_user
  on rest_cards (user_id)
  where status = 'active';

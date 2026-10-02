-- Journal starters: remember which question she answered.
--
-- Entries written from a starter are also marked source = 'journal_prompted'
-- rather than 'journal', which is what tells us whether offering her a way in
-- actually got her writing. The column below is what makes the entry readable
-- months later — "the dog sneezing" means nothing without its question.
--
-- Nullable on purpose: every existing entry, and every free write, has no
-- prompt and should stay that way.
--
-- Run this BEFORE deploying. Until the column exists, saving a prompted entry
-- fails with PGRST204.

alter table journal_entries
  add column if not exists prompt text;

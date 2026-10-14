-- Whose day is a day.
--
-- Every date in Kindrest was computed in UTC: journal entry_date from
-- toISOString(), glimmer entry_date from the server's own clock (UTC on
-- Vercel), and check-ins and ratings grouped by slicing an ISO string. For a
-- mother in New York, anything written after 8pm was filed under tomorrow —
-- and evening is when most of this gets written.
--
-- That was invisible while History only showed totals. It stops being
-- invisible the moment anything is grouped by day.
--
-- An IANA name, e.g. 'America/New_York'. Null means we have not learned hers
-- yet, and every reader falls back to UTC exactly as before, so nothing breaks
-- for a mother who has not opened the app since this shipped.

alter table user_preference_profile
  add column if not exists timezone text;

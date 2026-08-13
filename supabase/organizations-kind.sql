-- Local partners — cafés, salons, clinics, anywhere moms already go.
--
-- An employer pilot and a local partner both hand out /join/<slug> links, but
-- they need different words on the page: "your team set this aside for you"
-- makes no sense coming from a breakfast counter. This adds the distinction.
--
-- Safe to re-run.

alter table organizations
  add column if not exists kind text not null default 'employer';

alter table organizations
  drop constraint if exists organizations_kind_check;

alter table organizations
  add constraint organizations_kind_check
  check (kind in ('employer', 'partner'));

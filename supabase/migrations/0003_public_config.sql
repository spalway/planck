-- APEBITS — runtime configuration.
--
-- The mint address used to be VITE_APE_MINT, baked into the browser bundle
-- at build time. Launching the token therefore meant a rebuild and a redeploy
-- — minutes of downtime on the one day it matters most, with the contract
-- address wrong on the site the whole time.
--
-- It lives here instead. One UPDATE and every process picks it up within
-- seconds, with no deploy.
--
-- THE TABLE NAME IS THE CONTRACT. Every row is world-readable by the anon
-- key, deliberately, because that is how the browser reads the address. Never
-- put a secret in here. API keys and the service role key stay in Railway's
-- environment, where they are not served to anyone who asks.

create table public_config (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

comment on table public_config is
  'World-readable runtime config. Never store a secret here.';

alter table public_config enable row level security;

-- Read by everyone, written by nobody. The service role bypasses RLS, so the
-- SQL editor and the server can still write; the anon key cannot.
create policy public_config_public_read
  on public_config for select using (true);

-- updated_at is what the server logs when the value changes, so it is worth
-- keeping honest rather than trusting every writer to set it.
create or replace function public_config_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger public_config_set_updated_at
  before update on public_config
  for each row execute function public_config_touch();

-- The row exists from the start, empty. The site reads "not live yet" from a
-- null value, so there is no difference between "no row" and "not launched"
-- for anything downstream to get wrong.
insert into public_config (key, value)
values ('ape_mint', null)
on conflict (key) do nothing;

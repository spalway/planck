-- APEBITS — carry the rename into an existing database.
--
-- 0001 and 0003 were applied to the live project under the old name, so
-- editing them renamed nothing that already exists. Their text was updated so
-- a FRESH database gets the right identifiers from the start; this migration
-- brings an EXISTING one to the same place. Both paths converge here.
--
-- Every step is conditional, so it is safe to run against either.

-- ---------------------------------------------------------------------------
-- engagements.fee_planck -> fee_ape
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'engagements' and column_name = 'fee_planck'
  ) and not exists (
    select 1 from information_schema.columns
    where table_name = 'engagements' and column_name = 'fee_ape'
  ) then
    alter table engagements rename column fee_planck to fee_ape;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- public_config: planck_mint -> ape_mint
-- ---------------------------------------------------------------------------
--
-- The key is what every process reads to find the contract address, so the
-- value must survive the rename. Carry it across rather than resetting it —
-- resetting would read as "the token un-launched" to every client polling.

do $$
declare
  existing text;
begin
  select value into existing from public_config where key = 'planck_mint';

  if found then
    insert into public_config (key, value)
    values ('ape_mint', existing)
    on conflict (key) do update set value = excluded.value;

    delete from public_config where key = 'planck_mint';
  else
    -- Fresh database: 0003 already inserted ape_mint. Make sure of it.
    insert into public_config (key, value)
    values ('ape_mint', null)
    on conflict (key) do nothing;
  end if;
end
$$;

comment on table public_config is
  'World-readable runtime config. Never store a secret here.';

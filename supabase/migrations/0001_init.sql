-- PLANCKBITS — initial schema.
--
-- Off-chain v1: brokers and engagements live here, while vault holdings and
-- prices stay verifiable against Solana and Jupiter. See LAUNCH.md.
--
-- Everything readable by the public is readable by the anon key. Nothing is
-- writable by it: mint, hire and settlement all run server-side under the
-- service role, because a client that can insert its own engagement can grant
-- itself a track record.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type desk_id as enum ('equities', 'index', 'bullion', 'yield', 'credit');

-- ---------------------------------------------------------------------------
-- Brokers
-- ---------------------------------------------------------------------------

create table brokers (
  id              text primary key,
  name            text        not null unique,
  desk            desk_id     not null,

  -- Raw rolls. effective_nerve is derived (surplus coverage converts to
  -- nerve) and stored so the roster can sort on it without recomputing.
  nerve           smallint    not null check (nerve between 1 and 100),
  latency         smallint    not null check (latency between 1 and 100),
  coverage        smallint    not null check (coverage between 1 and 9),
  effective_nerve smallint    not null check (effective_nerve between 1 and 100),

  owner_wallet    text,
  minted_at       timestamptz not null default now(),

  -- Accrued across closed engagements. Not authoritative during a live term;
  -- the engagement rows are.
  tenure_hours    integer     not null default 0 check (tenure_hours >= 0)
);

create index brokers_desk_idx on brokers (desk);
create index brokers_owner_idx on brokers (owner_wallet);

-- ---------------------------------------------------------------------------
-- Engagements
-- ---------------------------------------------------------------------------

create table engagements (
  id            uuid primary key default gen_random_uuid(),
  broker_id     text        not null references brokers (id) on delete cascade,
  hirer_wallet  text        not null,

  term_start    timestamptz not null default now(),
  term_end      timestamptz not null,
  closed_at     timestamptz,

  fee_planck    numeric(38, 0) not null check (fee_planck > 0),

  -- The on-chain transfer that paid for this engagement. Unique so a single
  -- payment can never be replayed into two engagements.
  fee_signature text        not null unique,

  constraint term_is_forward check (term_end > term_start)
);

create index engagements_broker_idx on engagements (broker_id);
create index engagements_hirer_idx on engagements (hirer_wallet);

-- A broker can hold only one open engagement at a time. Enforced in the
-- database rather than in application code, because the check and the insert
-- would otherwise race under concurrent hires.
create unique index engagements_one_open_per_broker
  on engagements (broker_id)
  where closed_at is null;

-- ---------------------------------------------------------------------------
-- Vault holdings
-- ---------------------------------------------------------------------------
--
-- The vault's real position. Quantity is verifiable against Solana; the cost
-- basis is what the firm paid and is the one number only we know.

create table vault_holdings (
  mint          text primary key,
  quantity      numeric(38, 9) not null check (quantity >= 0),
  cost_basis_usd numeric(20, 4) not null check (cost_basis_usd >= 0),
  acquired_at   timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Price snapshots
-- ---------------------------------------------------------------------------
--
-- Jupiter returns spot only. A track record over time needs history, and this
-- is the one thing chain cannot give us cheaply.

create table price_snapshots (
  mint        text        not null,
  usd_price   numeric(20, 8) not null check (usd_price > 0),
  captured_at timestamptz not null default now(),
  primary key (mint, captured_at)
);

create index price_snapshots_recent_idx
  on price_snapshots (mint, captured_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table brokers         enable row level security;
alter table engagements     enable row level security;
alter table vault_holdings  enable row level security;
alter table price_snapshots enable row level security;

-- The floor is public. Anyone can read the roster, the book and the record --
-- that is the point of the site.
create policy brokers_public_read
  on brokers for select using (true);

create policy engagements_public_read
  on engagements for select using (true);

create policy vault_holdings_public_read
  on vault_holdings for select using (true);

create policy price_snapshots_public_read
  on price_snapshots for select using (true);

-- No insert/update/delete policies are defined, so with RLS enabled the anon
-- key cannot write at all. The service role bypasses RLS and is the only way
-- rows are created. This is deliberate: never expose a service-role key to
-- the browser, and never prefix it with VITE_.

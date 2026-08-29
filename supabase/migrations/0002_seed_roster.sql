-- APEBITS — seed the founding floor.
--
-- The 24 brokers the site has shipped with since launch, exactly as the
-- deterministic fixture in src/lib/brokers.ts generates them.
--
-- This has to exist before VITE_SUPABASE_URL is set. That variable is what
-- switches the roster from the fixture to Postgres, and switching against an
-- empty table would empty the floor, the census and every desk count on the
-- site in one deploy.
--
-- owner_wallet stays null: these are the house's own brokers, minted by
-- nobody, and a null owner is what marks them as such.
--
-- Idempotent, so re-running it is safe.

insert into brokers (id, name, desk, nerve, latency, coverage, effective_nerve, tenure_hours)
values
  ('PB-001', 'MARL FARRAR', 'credit', 81, 73, 5, 85, 3955),
  ('PB-002', 'MARL NAKASHIMA', 'credit', 63, 59, 9, 71, 3111),
  ('PB-003', 'IVO STRAND', 'bullion', 17, 9, 7, 22, 3423),
  ('PB-004', 'SABLE DELACROIX', 'credit', 25, 82, 6, 30, 1100),
  ('PB-005', 'GRIT VANCE', 'equities', 70, 24, 7, 70, 102),
  ('PB-006', 'RUE ASH', 'bullion', 24, 95, 9, 31, 2729),
  ('PB-007', 'FLINT VANCE', 'index', 27, 43, 7, 32, 1406),
  ('PB-008', 'MILO MOSS', 'yield', 58, 99, 6, 63, 2787),
  ('PB-009', 'WREN ASH', 'yield', 33, 10, 5, 37, 2813),
  ('PB-010', 'JUNO KIRBY', 'equities', 65, 12, 2, 65, 0),
  ('PB-011', 'VESPA STRAND', 'bullion', 44, 70, 8, 50, 2603),
  ('PB-012', 'JUNO BELL', 'equities', 76, 23, 3, 76, 1465),
  ('PB-013', 'PACE OKORO', 'equities', 91, 67, 9, 93, 0),
  ('PB-014', 'ORLA STRAND', 'equities', 48, 51, 7, 48, 2609),
  ('PB-015', 'PIPP DELACROIX', 'equities', 46, 72, 9, 48, 1215),
  ('PB-016', 'CASK MOSS', 'index', 37, 94, 4, 39, 2869),
  ('PB-017', 'HALE ASH', 'yield', 100, 99, 7, 100, 0),
  ('PB-018', 'OTIS STRAND', 'bullion', 46, 9, 4, 48, 3828),
  ('PB-019', 'NOVA VANCE', 'bullion', 46, 27, 2, 46, 2447),
  ('PB-020', 'CASK IBARRA', 'equities', 73, 18, 4, 73, 82),
  ('PB-021', 'MILO STRAND', 'equities', 26, 49, 7, 26, 0),
  ('PB-022', 'ZED NAKASHIMA', 'bullion', 15, 26, 5, 18, 2763),
  ('PB-023', 'ELSA HOLLOWAY', 'index', 74, 97, 9, 81, 0),
  ('PB-024', 'ZED VANCE', 'bullion', 71, 87, 8, 77, 1745)
on conflict (id) do nothing;

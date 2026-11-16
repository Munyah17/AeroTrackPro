-- Adaptive fuel-theft model state, one jsonb blob per device.
-- Written by ingest / the Traccar telemetry route after every probe reading.
-- Shape: FuelProfile in packages/shared/src/fuel-anomaly.ts
--   { baselinePctH, devPctH, noisePct, samples, skimAccumPct, skimSince }
alter table devices
  add column if not exists fuel_profile jsonb;

comment on column devices.fuel_profile is
  'Adaptive fuel model: learned consumption rate, probe noise and skim-window accumulator. See fuel-anomaly.ts.';

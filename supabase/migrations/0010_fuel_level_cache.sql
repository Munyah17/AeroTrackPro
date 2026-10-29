-- 0010: fuel-level hot cache on devices.
-- The Traccar telemetry bridge extracts tank-probe / flow-meter readings from
-- position attributes and keeps the latest values here so anomaly detection
-- can compare consecutive readings without scanning the positions table.

alter table devices
  add column if not exists last_fuel_level numeric,      -- last tank level, 0-100 %
  add column if not exists last_fuel_at timestamptz,     -- when that reading was taken
  add column if not exists last_fuel_used_l numeric;     -- cumulative flow-meter litres

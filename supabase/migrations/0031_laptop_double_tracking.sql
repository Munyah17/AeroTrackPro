-- 0031: laptop double tracking.
--
-- A laptop can carry two independent trackers: the AeroTrack desktop agent
-- (software, IP/Wi-Fi geolocation) AND a concealed hardware GPS module
-- (GT06-style SIM module wired to the laptop's power). Both should feed the
-- SAME tracked asset so the map shows one marker that updates from whichever
-- source last reported — if a thief wipes the OS the module still reports,
-- and if the module loses signal the agent still reports.
--
-- vehicles.secondary_device_id binds a second device to the asset. Ingest
-- resolves the vehicle from either device_id or secondary_device_id and
-- stamps every position with the shared vehicle_id.

alter table vehicles
  add column if not exists secondary_device_id uuid references devices(id) on delete set null;

create index if not exists idx_vehicles_secondary_device
  on vehicles(secondary_device_id) where secondary_device_id is not null;

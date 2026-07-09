-- Demo seed data for local development (supabase db reset applies this automatically).
-- Production tenants are created by the on_auth_user_created trigger at signup.

insert into tenants (id, name, slug, plan, status, vehicle_limit, user_limit)
values ('00000000-0000-4000-8000-000000000001', 'SpeedTrack Logistics', 'speedtrack', 'pro', 'active', 250, 15);

insert into devices (id, tenant_id, imei, protocol, device_model, name, status)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', '868120103331181', 'gt06', 'sinotrack-st901', 'ST-901 #1181', 'active'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', '868120103331182', 'gt06', 'sinotrack-st901', 'ST-901 #1182', 'active'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', '354017119208533', 'gps103', 'coban-tk103', 'TK-103 #8533', 'active'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', '354017119208534', 'h02', 'sinotrack-st906', 'ST-906 #8534', 'active');

insert into vehicles (id, tenant_id, device_id, plate, name, make, model, year, status, fuel_type, fuel_capacity_liters, speed_limit_kmh)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'AEF 4821', 'Delivery Van 1', 'Toyota', 'Hiace', 2022, 'active', 'diesel', 70, 120),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'AEG 1177', 'Delivery Van 2', 'Toyota', 'Hiace', 2023, 'active', 'diesel', 70, 120),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000103', 'AFC 9034', 'Box Truck 1', 'Isuzu', 'NQR', 2021, 'active', 'diesel', 140, 100),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000104', 'AFB 2210', 'Supervisor Car', 'Ford', 'Ranger', 2024, 'active', 'petrol', 80, 140);

insert into geofences (tenant_id, name, kind, center, radius_m, color, active)
values
  ('00000000-0000-4000-8000-000000000001', 'Harare Depot', 'circle', array[31.0522, -17.8292], 800, '#1E40FF', true),
  ('00000000-0000-4000-8000-000000000001', 'Msasa Warehouse', 'circle', array[31.1319, -17.8433], 500, '#16A34A', true);

insert into geofences (tenant_id, name, kind, points, color, active)
values
  ('00000000-0000-4000-8000-000000000001', 'CBD Delivery Zone', 'polygon',
   '[[31.0330, -17.8210], [31.0640, -17.8210], [31.0640, -17.8390], [31.0330, -17.8390]]'::jsonb,
   '#D97706', true);

-- A few recent positions so the map has something to show
insert into positions (tenant_id, device_id, vehicle_id, lng, lat, speed_kmh, course, event_type, recorded_at)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 31.0522, -17.8292, 0, 90, 'position', now() - interval '2 minutes'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000202', 31.0810, -17.8150, 46.5, 145, 'position', now() - interval '1 minute'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000203', 31.1319, -17.8433, 0, 0, 'position', now() - interval '5 minutes'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000204', 31.0450, -17.8600, 72.0, 310, 'position', now() - interval '30 seconds');

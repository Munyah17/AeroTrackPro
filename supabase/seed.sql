-- Demo seed data for local development (supabase db reset applies this automatically).
-- Production tenants are created by the on_auth_user_created trigger at signup.
-- Idempotent: safe to re-run — every insert ends with ON CONFLICT DO NOTHING
-- and rows without a natural unique key carry fixed UUIDs.

insert into tenants (id, name, slug, plan, status, vehicle_limit, user_limit)
values ('00000000-0000-4000-8000-000000000001', 'SpeedTrack Logistics', 'speedtrack', 'pro', 'active', 250, 15)
on conflict do nothing;

insert into devices (id, tenant_id, imei, protocol, device_model, name, status)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', '868120103331181', 'gt06', 'sinotrack-st901', 'ST-901 #1181', 'active'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', '868120103331182', 'gt06', 'sinotrack-st901', 'ST-901 #1182', 'active'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', '354017119208533', 'gps103', 'coban-tk103', 'TK-103 #8533', 'active'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', '354017119208534', 'h02', 'sinotrack-st906', 'ST-906 #8534', 'active'),
  -- ST-901A bench-test unit. For SinoTrack H02 the "imei" column holds the
  -- 10-digit tracker ID printed on the sticker (not the 15-digit IMEI),
  -- because that is what the device sends in *HQ,<id>,... frames.
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001', '8160528336', 'h02', 'sinotrack-st901a', 'ST-901A Bench', 'active')
on conflict do nothing;

insert into vehicles (id, tenant_id, device_id, plate, name, make, model, year, status, fuel_type, fuel_capacity_liters, speed_limit_kmh)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'AEF 4821', 'Delivery Van 1', 'Toyota', 'Hiace', 2022, 'active', 'diesel', 70, 120),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'AEG 1177', 'Delivery Van 2', 'Toyota', 'Hiace', 2023, 'active', 'diesel', 70, 120),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000103', 'AFC 9034', 'Box Truck 1', 'Isuzu', 'NQR', 2021, 'active', 'diesel', 140, 100),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000104', 'AFB 2210', 'Supervisor Car', 'Ford', 'Ranger', 2024, 'active', 'petrol', 80, 140),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000105', 'AFD 5555', 'ST-901A Test Rig', 'SinoTrack', 'ST-901A', 2026, 'active', 'petrol', 50, 140)
on conflict do nothing;

insert into geofences (id, tenant_id, name, kind, center, radius_m, color, active)
values
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000001', 'Harare Depot', 'circle', array[31.0522, -17.8292], 800, '#1E40FF', true),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000001', 'Msasa Warehouse', 'circle', array[31.1319, -17.8433], 500, '#16A34A', true)
on conflict do nothing;

insert into geofences (id, tenant_id, name, kind, points, color, active)
values
  ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000001', 'CBD Delivery Zone', 'polygon',
   '[[31.0330, -17.8210], [31.0640, -17.8210], [31.0640, -17.8390], [31.0330, -17.8390]]'::jsonb,
   '#D97706', true)
on conflict do nothing;

-- A few recent positions so the map has something to show
insert into positions (id, tenant_id, device_id, vehicle_id, lng, lat, speed_kmh, course, event_type, recorded_at)
values
  ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 31.0522, -17.8292, 0, 90, 'position', now() - interval '2 minutes'),
  ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000202', 31.0810, -17.8150, 46.5, 145, 'position', now() - interval '1 minute'),
  ('00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000203', 31.1319, -17.8433, 0, 0, 'position', now() - interval '5 minutes'),
  ('00000000-0000-4000-8000-000000000604', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000204', 31.0450, -17.8600, 72.0, 310, 'position', now() - interval '30 seconds')
on conflict do nothing;

-- ==================== DRIVERS + GROUPS ====================
insert into vehicle_groups (id, tenant_id, name, color) values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000001', 'Deliveries', '#16A34A'),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000001', 'Long Haul', '#D97706')
on conflict do nothing;

insert into drivers (id, tenant_id, name, phone, email, license_number, license_expiry, vehicle_id, behavior_score, risk_level) values
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000001', 'Tendai Moyo', '+263771234001', 'tendai@speedtrack.co.zw', 'ZW-4820113', '2027-06-30', '00000000-0000-4000-8000-000000000201', 92, 'low'),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000001', 'Rudo Mapfumo', '+263771234002', 'rudo@speedtrack.co.zw', 'ZW-3918754', '2026-11-15', '00000000-0000-4000-8000-000000000202', 78, 'medium'),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000001', 'Blessing Ncube', '+263771234003', 'blessing@speedtrack.co.zw', 'ZW-5533201', '2028-02-28', '00000000-0000-4000-8000-000000000203', 85, 'low'),
  ('00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000000001', 'Kudzai Moyo', '+263771234004', 'kudzai@speedtrack.co.zw', 'ZW-6174410', '2026-05-20', '00000000-0000-4000-8000-000000000204', 64, 'high')
on conflict do nothing;

update vehicles set
  driver_id = (case plate
    when 'AEF 4821' then '00000000-0000-4000-8000-000000000401'
    when 'AEG 1177' then '00000000-0000-4000-8000-000000000402'
    when 'AFC 9034' then '00000000-0000-4000-8000-000000000403'
    when 'AFB 2210' then '00000000-0000-4000-8000-000000000404'
  end)::uuid,
  group_id = (case plate
    when 'AEF 4821' then '00000000-0000-4000-8000-000000000301'
    when 'AEG 1177' then '00000000-0000-4000-8000-000000000301'
    when 'AFC 9034' then '00000000-0000-4000-8000-000000000302'
  end)::uuid,
  insurance_expiry = (case plate
    when 'AEF 4821' then '2027-03-31'
    when 'AEG 1177' then '2026-12-15'
    when 'AFC 9034' then '2026-11-05'
    when 'AFB 2210' then '2027-01-20'
  end)::date
where tenant_id = '00000000-0000-4000-8000-000000000001';

-- ==================== FUEL RECORDS ====================
insert into fuel_records (id, tenant_id, vehicle_id, kind, litres, cost_usd, odometer_km, level_after_pct, station, recorded_at)
values
  ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000201', 'refill', 55.0, 71.50, 48210, 92, 'Puma Samora Machel', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000201', 'consumption', 12.4, null, 48110, 74, null, now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000703', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000202', 'refill', 60.0, 78.00, 39150, 95, 'Total Borrowdale', now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000704', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000203', 'theft', 18.0, null, 62040, 41, null, now() - interval '4 days'),
  ('00000000-0000-4000-8000-000000000705', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000204', 'refill', 45.0, 58.50, 21500, 88, 'Zuva Harare Drive', now() - interval '6 days')
on conflict do nothing;

-- ==================== MAINTENANCE + INSURANCE ====================
insert into maintenance_items (id, tenant_id, vehicle_id, title, type, due_date, due_odometer_km, cost_usd, status) values
  ('00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000201', 'Engine oil & filter', 'oil', current_date + 12, 50000, 85, 'upcoming'),
  ('00000000-0000-4000-8000-000000000802', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000202', 'Brake pads (front)', 'brakes', current_date - 4, null, 120, 'overdue'),
  ('00000000-0000-4000-8000-000000000803', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000203', 'Annual inspection', 'inspection', current_date + 30, null, 60, 'upcoming'),
  ('00000000-0000-4000-8000-000000000804', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000204', 'Tyre rotation', 'tyres', current_date - 20, 20000, 40, 'completed')
on conflict do nothing;

insert into insurance_policies (id, tenant_id, vehicle_id, policy_number, provider, coverage, premium_usd, start_date, expiry_date) values
  ('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000201', 'ZIM-POL-88213', 'Zimnat', 'comprehensive', 640, '2026-04-01', '2027-03-31'),
  ('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000202', 'ZIM-POL-77450', 'Old Mutual', 'comprehensive', 590, '2025-12-15', '2026-12-15'),
  ('00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000203', 'ZIM-POL-60112', 'NicozDiamond', 'third-party', 310, '2025-11-05', '2026-11-05'),
  ('00000000-0000-4000-8000-000000000904', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000204', 'ZIM-POL-93308', 'Zimnat', 'comprehensive', 720, '2026-01-20', '2027-01-20')
on conflict do nothing;

-- ==================== DRIVER EVENTS ====================
insert into driver_events (id, tenant_id, driver_id, vehicle_id, type, speed_kmh, position, recorded_at)
values
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000202', 'harsh_braking', 78, '{"lat":-17.8150,"lng":31.0810}', now() - interval '5 hours'),
  ('00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000000204', 'overspeed', 118, '{"lat":-17.8600,"lng":31.0450}', now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000001003', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000201', 'idling', 0, '{"lat":-17.8292,"lng":31.0522}', now() - interval '2 days')
on conflict do nothing;

-- ==================== PLATFORM SEED ====================
-- Demo tenant runs the fuel coupon + insurance + maintenance modules.
insert into tenant_addons (tenant_id, module) values
  ('00000000-0000-4000-8000-000000000001', 'insurance'),
  ('00000000-0000-4000-8000-000000000001', 'maintenance'),
  ('00000000-0000-4000-8000-000000000001', 'fuel'),
  ('00000000-0000-4000-8000-000000000001', 'behavior')
on conflict do nothing;

insert into invoices (tenant_id, number, amount_usd, status, issued_at, paid_at, items) values
  ('00000000-0000-4000-8000-000000000001', 'INV-0001', 12.50, 'paid', now() - interval '60 days', now() - interval '59 days', '[{"label":"Base tracking — 4 devices × $2.50","qty":4,"unit_usd":2.5,"total_usd":10},{"label":"Fuel & Coupons addon","qty":4,"unit_usd":0.4,"total_usd":1.6},{"label":"Insurance addon","qty":4,"unit_usd":0.5,"total_usd":2}]'::jsonb),
  ('00000000-0000-4000-8000-000000000001', 'INV-0002', 12.50, 'paid', now() - interval '30 days', now() - interval '29 days', '[{"label":"Base tracking — 4 devices","qty":4,"unit_usd":2.5,"total_usd":10},{"label":"Add-ons","qty":4,"unit_usd":0.625,"total_usd":2.5}]'::jsonb),
  ('00000000-0000-4000-8000-000000000001', 'INV-0003', 12.50, 'pending', now() - interval '1 day', null, '[{"label":"Base tracking — 4 devices","qty":4,"unit_usd":2.5,"total_usd":10},{"label":"Add-ons","qty":4,"unit_usd":0.625,"total_usd":2.5}]'::jsonb)
on conflict do nothing;

insert into notifications (id, tenant_id, type, title, body, link) values
  ('00000000-0000-4000-8000-000000001101', '00000000-0000-4000-8000-000000000001', 'billing', 'Invoice INV-0003 due', 'Your latest tracking invoice is due for payment.', '/reseller/invoices'),
  ('00000000-0000-4000-8000-000000001102', '00000000-0000-4000-8000-000000000001', 'alert', 'Possible fuel theft', 'AFC 9034 lost 18 L while parked in Willowvale.', '/fuel'),
  ('00000000-0000-4000-8000-000000001103', '00000000-0000-4000-8000-000000000001', 'info', 'Welcome to AeroTrack Pro', 'Your fleet backend is live. Invite your team from Settings → Users.', '/settings')
on conflict do nothing;

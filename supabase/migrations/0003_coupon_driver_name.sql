-- AeroTrack Pro: coupon driver name
-- The coupons UI assigns coupons to a driver by name; the drivers table is
-- not in the schema yet, so persist the free-text name until driver_id can
-- be linked to a real drivers record.

alter table fuel_coupons add column if not exists driver_name text;

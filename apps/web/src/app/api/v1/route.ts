import { NextResponse } from "next/server";
import { isServiceRoleConfigured } from "@/lib/supabase/server";

/** API index — a live, self-describing endpoint map. */
export async function GET() {
  return NextResponse.json({
    name: "AeroTrack Pro API",
    version: "v1",
    mode: isServiceRoleConfigured() ? "live" : "demo",
    authentication: "Authorization: Bearer atk_<key> (manage keys in Settings → API)",
    endpoints: {
      vehicles: {
        "GET /api/v1/vehicles": "List vehicles (?status=&q=&page=&limit=)",
        "POST /api/v1/vehicles": "Create a vehicle",
        "GET /api/v1/vehicles/{id}": "Vehicle detail with latest position",
        "PATCH /api/v1/vehicles/{id}": "Update a vehicle",
        "DELETE /api/v1/vehicles/{id}": "Delete a vehicle",
        "GET /api/v1/vehicles/{id}/positions": "Position history (?from=&to=&limit=)",
      },
      positions: {
        "GET /api/v1/positions/latest": "Latest position for every vehicle",
      },
      trips: {
        "GET /api/v1/trips": "List trips (?vehicle_id=&from=&to=&page=&limit=)",
      },
      geofences: {
        "GET /api/v1/geofences": "List geofences",
        "POST /api/v1/geofences": "Create a geofence",
        "PATCH /api/v1/geofences/{id}": "Update a geofence",
        "DELETE /api/v1/geofences/{id}": "Delete a geofence",
      },
      alerts: {
        "GET /api/v1/alerts": "List alerts (?status=&severity=&page=&limit=)",
        "POST /api/v1/alerts/{id}/acknowledge": "Acknowledge an alert",
      },
      devices: {
        "GET /api/v1/devices": "List tracking devices",
        "POST /api/v1/devices": "Register a device (imei, protocol, device_model, name)",
        "GET /api/v1/devices/{id}/commands": "List queued commands for a device",
        "POST /api/v1/devices/{id}/commands": "Queue a command (engineStop, locate, setInterval, ...)",
      },
    },
  });
}

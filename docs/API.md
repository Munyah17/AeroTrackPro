# AeroTrack Pro REST API (v1)

Base URL: `https://<your-domain>/api/v1` (local: `http://localhost:3000/api/v1`)

`GET /api/v1` returns a live, self-describing endpoint index.

## Authentication

Every request carries an API key:

```
Authorization: Bearer atk_<key>
```

Keys are stored hashed (SHA-256) in the `api_keys` table with per-key scopes:

| Scope   | Grants                                   |
| ------- | ---------------------------------------- |
| `read`  | All GET endpoints                        |
| `write` | POST / PATCH / DELETE endpoints          |
| `*`     | Everything                               |

**Demo mode** — when the server has no `SUPABASE_SERVICE_ROLE_KEY`, the API
serves the built-in demo fleet without authentication and write endpoints
echo without persisting (responses carry `"mode": "demo"` / `"persisted": false`).

## Response envelope

```json
{ "data": ..., "meta": { "page": 1, "limit": 50, "total": 128 } }
```

Errors:

```json
{ "error": { "code": "not_found", "message": "The requested vehicle was not found" } }
```

## Endpoints

### Vehicles

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/vehicles` | `?status=active&q=hiace&page=1&limit=50` |
| POST | `/vehicles` | body: `plate`, `name` (+ optional make/model/year/speed_limit_kmh/...) |
| GET | `/vehicles/{id}` | includes `last_position` |
| PATCH | `/vehicles/{id}` | partial update |
| DELETE | `/vehicles/{id}` | |
| GET | `/vehicles/{id}/positions` | `?from=ISO&to=ISO&limit=200`, newest first |

### Positions

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/positions/latest` | latest fix per vehicle |

### Trips

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/trips` | `?vehicle_id=&from=&to=&page=&limit=` |

### Geofences

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/geofences` | |
| POST | `/geofences` | circle: `{name, kind:"circle", center:[lng,lat], radius_m}` — polygon: `{name, kind:"polygon", points:[[lng,lat],...]}` |
| PATCH | `/geofences/{id}` | |
| DELETE | `/geofences/{id}` | |

### Alerts

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/alerts` | `?status=active&severity=critical` |
| POST | `/alerts/{id}/acknowledge` | |

### Devices & commands

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/devices` | |
| POST | `/devices` | `{imei, protocol, device_model, name}` — protocol one of `gt06, h02, gps103, eelink, queclink, meitrack, topflytech, vt200` |
| GET | `/devices/{id}/commands` | last 50 queued commands |
| POST | `/devices/{id}/commands` | see command types below |

Command body examples:

```json
{ "type": "engineStop" }
{ "type": "locate" }
{ "type": "setInterval", "seconds": 30 }
{ "type": "setOverspeed", "kmh": 120 }
{ "type": "sosNumber", "slot": 1, "phone": "+263771234567" }
{ "type": "custom", "payload": "RELAY,1#" }
```

Commands are queued (`pending`), delivered by the ingest service over the
device's live TCP socket (`sent`), and confirmed when the device replies
(`acked`). Devices that are offline keep commands `pending` until they
reconnect.

## Webhooks

Rows in the `webhooks` table subscribe a URL to events:

- `position.created` — every stored GPS fix (high volume)
- `alert.created` — overspeed, SOS, power-cut, geofence, ...
- `command.acked` — device confirmed a command
- `*` — everything

Deliveries are `POST` JSON:

```json
{ "event": "alert.created", "data": { ... }, "timestamp": "2026-07-09T10:00:00Z" }
```

Verify the `X-AeroTrack-Signature: sha256=<hex>` header by computing
HMAC-SHA256 of the raw body with your webhook `secret`.

## cURL quickstart

```bash
# Demo mode (no key needed until Supabase is wired):
curl http://localhost:3000/api/v1/vehicles

# Live mode:
curl -H "Authorization: Bearer atk_..." https://fleet.example.com/api/v1/positions/latest

# Queue an immobilize command:
curl -X POST -H "Authorization: Bearer atk_..." -H "Content-Type: application/json" \
  -d '{"type":"engineStop"}' \
  https://fleet.example.com/api/v1/devices/<device-id>/commands
```

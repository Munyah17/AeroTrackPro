# EUROSENS fuel sensors on AeroTrack

AeroTrack does **not** listen for Bluetooth directly. EUROSENS Dominator probes
reach the platform through a BLE-capable tracker/gateway that forwards them as
ordinary tracker telemetry:

```
Dominator BT (BLE advert) ──► Teltonika FMB/FMC (BLE 4.0 Advanced preset)
                              └─► Codec 8/8E AVL ──► AeroTrack :5027
```

Wired Dominator variants (RS-485 LLS/Modbus, CAN/J1939, analog/frequency) need a
tracker/logger that speaks one of AeroTrack's TCP protocols; there is no native
Modbus listener.

## Dominator BT — verified path

Use the official EUROSENS preset for Teltonika
(`eurosens-dominator-bt-teltonika-preset`, Protocol 2 recommended — it adds the
status byte). In Teltonika Configurator:

1. **Bluetooth** tab → enable Bluetooth 4.0, allow BLE connections.
2. **Bluetooth 4.0** tab → Connection #1 → **Advanced** → load the EUROSENS
   preset (or fill the table manually) and set the sensor **MAC** from the
   Dominator configurator's *Information* tab.
3. **I/O** tab → set the BLE fuel parameters priority to **Low** so they are
   sent to the server.
4. Point the tracker's GPRS server at AeroTrack (`149.248.215.167:5027`,
   Codec 8 Extended recommended).

### What AeroTrack decodes

The decoder (`packages/protocols/src/protocols/teltonika/decoder.ts`) maps the
per-connection BLE AVL ids and exposes:

| BLE field (preset) | Conn 1 AVL | AeroTrack attribute | Unit after preset |
|---|---|---|---|
| Temperature | 25 | `eurosensTempC1` | °C (preset offset −40) |
| Battery | 29 | `eurosensBatteryPct1` | % |
| Fuel (detector) | 270 | `eurosensFuelDetector1` | raw — **not** a level |
| Fuel Frequency | 306 | `eurosensFuelLiters1` → `fuelLevelLiters` | centilitres ÷100 = L |
| Custom2 (% tank) | 463 | `eurosensFuelPct1` → `fuelLevel` | 0.01% ÷100 = % |
| Custom3 (status) | 464 | `eurosensStatus1` | flags (Protocol 2) |

Connections 2–4 use AVL ids 26/20/273/307/467/468, 27/22/276/308/471/472 and
28/23/279/309/475/476 respectively (`eurosens*2..4`). The **lowest-numbered**
connection with a valid percent or litre value is normalized to `fuelLevel` /
`fuelLevelLiters` for the shared fuel-anomaly engine.

The raw detector value (`Fuel`, AVL 270) is preserved but **never** fed to fuel
analysis — it is not a volume or percentage.

## Fuel analysis

`fuelLevel` (percent) drives the adaptive theft/refill/consumption model
directly. `fuelLevelLiters` is converted to percent using the vehicle's
`fuel_capacity_liters` when no percent field is present (wired/LLS routes).

Set the vehicle's **fuel capacity** in AeroTrack so litre readings and
percent→litre event estimates are correct.

## Wired Dominator (RS-485 / LLS / Modbus / CAN)

- **LLS mode**: Teltonika reads the sensor as LLS; AVL `io_201`/`io_202` (LLS1
  fuel/temperature) are preserved raw. Units are configuration-dependent
  ("kvants or ltr") — verify on real telemetry before treating them as litres.
- **Modbus RTU**: register map is documented (30004–30005 fuel volume in
  0.01 L, 30006–30007 tank volume, 30000 temperature in 0.1 °C). AeroTrack has
  no Modbus master; forward via a gateway/tracker that emits a supported TCP
  protocol.
- **CAN/J1939** and **analog/frequency** outputs similarly require a compatible
  tracker/logger.

## Safety

Dominator probes are certified measuring instruments for fuel tanks. Follow the
manufacturer's installation manual: correct tank calibration table, sealing,
and hazardous-area (Ex) requirements for the probe variant. Do not rely on
unverified AVL ids or units — confirm against a real forwarded frame before
enabling theft alerts.

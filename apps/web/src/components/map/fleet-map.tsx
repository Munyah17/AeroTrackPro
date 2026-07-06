"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Geofence, Vehicle } from "@aerotrack/shared";
import { MAP_CENTER } from "@aerotrack/shared";
import { DEFAULT_PROVIDER, styleFor } from "@/lib/map-providers";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<Vehicle["status"], string> = {
  moving: "#059669",
  stopped: "#dc2626",
  idle: "#d97706",
  parked: "#64748b",
  offline: "#94a3b8",
};

function markerElement(vehicle: Vehicle, selected: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "cursor-pointer";
  const color = STATUS_COLORS[vehicle.status];
  const moving = vehicle.status === "moving";
  el.innerHTML = `
    <div style="position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;">
      ${selected ? `<div style="position:absolute;inset:-6px;border-radius:9999px;background:${color}22;border:2px solid ${color};animation:pulse 2s infinite;"></div>` : ""}
      <div style="width:30px;height:30px;border-radius:9999px;background:white;box-shadow:0 2px 10px rgb(15 23 42/.28);display:flex;align-items:center;justify-content:center;transform:rotate(${moving ? vehicle.position.course : 0}deg);transition:transform .5s;">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="${color}" stroke="${color}">
          ${moving ? '<path d="M12 2 19 21 12 17 5 21 12 2Z"/>' : `<circle cx="12" cy="12" r="7"/>`}
        </svg>
      </div>
    </div>`;
  return el;
}

export interface FleetMapProps {
  vehicles: Vehicle[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  geofences?: Geofence[];
  /** [lng,lat] polyline to draw (trip replay / preview). */
  path?: [number, number][];
  center?: [number, number];
  zoom?: number;
  className?: string;
  /** Fit bounds to vehicles on load. */
  fit?: boolean;
}

export function FleetMap({
  vehicles,
  selectedId,
  onSelect,
  geofences,
  path,
  center = MAP_CENTER,
  zoom = 11.4,
  className,
  fit,
}: FleetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const loadedRef = useRef(false);

  // Init once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const dark = document.documentElement.classList.contains("dark");
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleFor(DEFAULT_PROVIDER, dark),
      center,
      zoom,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => {
      loadedRef.current = true;
      drawOverlays(map);
    });
    mapRef.current = map;

    // Follow app dark-mode toggles
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      map.setStyle(styleFor(DEFAULT_PROVIDER, isDark));
      map.once("styledata", () => drawOverlays(map));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function drawOverlays(map: MlMap) {
    // Trip path
    if (path && path.length > 1) {
      if (!map.getSource("trip-path")) {
        map.addSource("trip-path", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: path } },
        });
        map.addLayer({
          id: "trip-path-casing",
          type: "line",
          source: "trip-path",
          paint: { "line-color": "#1e40ff", "line-width": 7, "line-opacity": 0.18 },
          layout: { "line-cap": "round", "line-join": "round" },
        });
        map.addLayer({
          id: "trip-path-line",
          type: "line",
          source: "trip-path",
          paint: { "line-color": "#1e40ff", "line-width": 3.5 },
          layout: { "line-cap": "round", "line-join": "round" },
        });
      }
    }
    // Geofences
    if (geofences?.length && !map.getSource("geofences")) {
      const features = geofences.filter((g) => g.active).map((g) => {
        if (g.kind === "circle" && g.center && g.radiusM) {
          const pts: [number, number][] = [];
          const [clng, clat] = g.center;
          for (let i = 0; i <= 48; i++) {
            const a = (i / 48) * Math.PI * 2;
            pts.push([
              clng + (g.radiusM / (111320 * Math.cos((clat * Math.PI) / 180))) * Math.cos(a),
              clat + (g.radiusM / 110540) * Math.sin(a),
            ]);
          }
          return { type: "Feature" as const, properties: { color: g.color, name: g.name }, geometry: { type: "Polygon" as const, coordinates: [pts] } };
        }
        return {
          type: "Feature" as const,
          properties: { color: g.color, name: g.name },
          geometry: { type: "Polygon" as const, coordinates: [[...(g.points ?? []), (g.points ?? [])[0]!]] },
        };
      });
      map.addSource("geofences", { type: "geojson", data: { type: "FeatureCollection", features } });
      map.addLayer({
        id: "geofence-fill",
        type: "fill",
        source: "geofences",
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.08 },
      });
      map.addLayer({
        id: "geofence-line",
        type: "line",
        source: "geofences",
        paint: { "line-color": ["get", "color"], "line-width": 2, "line-dasharray": [3, 2] },
      });
    }
  }

  // Sync markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const existing = markersRef.current;
    const seen = new Set<string>();

    for (const v of vehicles) {
      seen.add(v.id);
      const lngLat: [number, number] = [v.position.lng, v.position.lat];
      const old = existing.get(v.id);
      if (old) old.remove();
      const el = markerElement(v, v.id === selectedId);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect?.(v.id);
      });
      const marker = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
      existing.set(v.id, marker);
    }
    for (const [id, m] of existing) {
      if (!seen.has(id)) {
        m.remove();
        existing.delete(id);
      }
    }

    if (fit && vehicles.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      vehicles.forEach((v) => bounds.extend([v.position.lng, v.position.lat]));
      map.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 600 });
    }
  }, [vehicles, selectedId, onSelect, fit]);

  // Fly to selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const v = vehicles.find((x) => x.id === selectedId);
    if (v) map.flyTo({ center: [v.position.lng, v.position.lat], zoom: Math.max(map.getZoom(), 13.5), duration: 800 });
  }, [selectedId, vehicles]);

  return <div ref={containerRef} className={cn("h-full w-full", className)} />;
}

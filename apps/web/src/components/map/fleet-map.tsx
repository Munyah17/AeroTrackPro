"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Pause, Play } from "lucide-react";
import type { Geofence, Vehicle } from "@aerotrack/shared";
import { MAP_CENTER } from "@aerotrack/shared";
import { DEFAULT_PROVIDER, styleFor } from "@/lib/map-providers";
import { LIVE_STATUS, liveStatusOf } from "@/lib/live-status";
import { cn } from "@/lib/utils";

function markerElement(vehicle: Vehicle, selected: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "cursor-pointer";
  const live = liveStatusOf(vehicle.status);
  const color = LIVE_STATUS[live].hex;
  const moving = vehicle.status === "moving";
  el.innerHTML = `
    <div style="position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;">
      ${selected ? `<div style="position:absolute;inset:-6px;border-radius:9999px;background:${color}22;border:2px solid ${color};animation:pulse 2s infinite;"></div>` : ""}
      <div data-rotor style="width:30px;height:30px;border-radius:9999px;background:white;box-shadow:0 2px 10px rgb(15 23 42/.28);display:flex;align-items:center;justify-content:center;transform:rotate(${moving ? vehicle.position.course : 0}deg);transition:transform .3s;">
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
  /** Callback when map is ready. */
  onMapReady?: (map: MlMap) => void;
  /** History replay: [lng,lat] coords + epoch-ms timestamps, oldest→newest.
   *  When set, a marker animates along the route in real time (scaled by speed). */
  replay?: { coords: [number, number][]; times: number[] } | null;
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
  onMapReady,
  replay,
}: FleetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const loadedRef = useRef(false);
  const pathRef = useRef<[number, number][] | undefined>(path);
  pathRef.current = path;

  /* ---- replay playback ---- */
  const replayMarkerRef = useRef<Marker | null>(null);
  const replayRafRef = useRef<number>(0);
  const replayStartRef = useRef(0); // epoch ms of animation start (performance.now base)
  const replayElapsedRef = useRef(0); // ms of *track* time already played
  const replayPlayingRef = useRef(false);
  const replaySpeedRef = useRef(1);
  const [replayUi, setReplayUi] = useState<{ playing: boolean; speed: number } | null>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const timeLabelRef = useRef<HTMLSpanElement>(null);
  const replayDataRef = useRef(replay);
  replayDataRef.current = replay;
  const replayControlsRef = useRef<{
    play: () => void; pause: () => void; cycleSpeed: () => void;
    seek: (x: number, el: HTMLElement) => void; fmt: (ms: number) => string; duration: number;
  } | null>(null);

  const pathFeature = (pts: [number, number][] | undefined) =>
    ({
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: pts && pts.length > 1 ? pts : [] },
    });

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
      onMapReady?.(map);
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
    // Trip / live-motion path (always created so it can be updated live)
    if (!map.getSource("trip-path")) {
      map.addSource("trip-path", { type: "geojson", data: pathFeature(pathRef.current) });
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
      const selected = v.id === selectedId;
      const styleKey = `${v.status}|${selected}`;

      // Fast path (trip playback): same visual style → move + rotate in place
      // instead of recreating the DOM marker every frame.
      if (old && old.getElement().dataset.styleKey === styleKey) {
        old.setLngLat(lngLat);
        const rotor = old.getElement().querySelector<HTMLElement>("[data-rotor]");
        if (rotor && v.status === "moving") {
          rotor.style.transform = `rotate(${v.position.course}deg)`;
        }
        continue;
      }

      if (old) old.remove();
      const el = markerElement(v, selected);
      el.dataset.styleKey = styleKey;
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

  // Live path updates (motion trail / trip replay)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const src = map.getSource("trip-path") as maplibregl.GeoJSONSource | undefined;
    src?.setData(pathFeature(path));
  }, [path]);

  // Fly to selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const v = vehicles.find((x) => x.id === selectedId);
    if (v) map.flyTo({ center: [v.position.lng, v.position.lat], zoom: Math.max(map.getZoom(), 13.5), duration: 800 });
  }, [selectedId, vehicles]);

  /* Replay: build marker + animation loop whenever the replay payload changes. */
  useEffect(() => {
    const map = mapRef.current;
    const data = replayDataRef.current;
    const valid = data && data.coords.length > 1 && data.times.length === data.coords.length;

    cancelAnimationFrame(replayRafRef.current);
    replayMarkerRef.current?.remove();
    replayMarkerRef.current = null;
    replayPlayingRef.current = false;
    replayElapsedRef.current = 0;
    replaySpeedRef.current = 1;
    setReplayUi(null);
    if (!map || !valid || !data) return;

    const { coords: pts, times } = data;
    const duration = Math.max(1, times[times.length - 1]! - times[0]!);
    const t0 = times[0]!;

    const el = document.createElement("div");
    el.style.cssText =
      "width:18px;height:18px;border-radius:9999px;background:#1e40ff;border:3px solid white;box-shadow:0 2px 8px rgb(15 23 42/.4);";
    const marker = new maplibregl.Marker({ element: el }).setLngLat(pts[0]!).addTo(map);
    replayMarkerRef.current = marker;

    const fmt = (ms: number) => {
      const d = new Date(t0 + ms);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    };

    const placeAt = (trackMs: number) => {
      const target = t0 + Math.min(trackMs, duration);
      // binary search for segment
      let lo = 0, hi = times.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (times[mid]! <= target) lo = mid; else hi = mid;
      }
      const tA = times[lo]!, tB = times[hi]!;
      const f = tB > tA ? (target - tA) / (tB - tA) : 0;
      const [lngA, latA] = pts[lo]!;
      const [lngB, latB] = pts[hi]!;
      marker.setLngLat([lngA + (lngB - lngA) * f, latA + (latB - latA) * f]);
      return target;
    };

    const syncUi = (trackMs: number) => {
      const frac = Math.min(1, trackMs / duration);
      if (progressFillRef.current) progressFillRef.current.style.width = `${frac * 100}%`;
      if (timeLabelRef.current) timeLabelRef.current.textContent = `${fmt(trackMs)} / ${fmt(duration)}`;
    };

    const tick = () => {
      if (!replayPlayingRef.current) return;
      replayElapsedRef.current += (performance.now() - replayStartRef.current) * replaySpeedRef.current;
      replayStartRef.current = performance.now();
      const ms = Math.min(replayElapsedRef.current, duration);
      placeAt(ms);
      syncUi(ms);
      if (ms >= duration) {
        replayPlayingRef.current = false;
        setReplayUi((u) => (u ? { ...u, playing: false } : u));
        return;
      }
      replayRafRef.current = requestAnimationFrame(tick);
    };

    const play = () => {
      if (replayElapsedRef.current >= duration) {
        replayElapsedRef.current = 0;
        placeAt(0);
        syncUi(0);
      }
      replayPlayingRef.current = true;
      replayStartRef.current = performance.now();
      replayRafRef.current = requestAnimationFrame(tick);
      setReplayUi((u) => (u ? { ...u, playing: true } : { playing: true, speed: replaySpeedRef.current }));
    };
    const pause = () => {
      replayPlayingRef.current = false;
      cancelAnimationFrame(replayRafRef.current);
      setReplayUi((u) => (u ? { ...u, playing: false } : u));
    };
    const cycleSpeed = () => {
      const order = [1, 4, 16, 60];
      const next = order[(order.indexOf(replaySpeedRef.current) + 1) % order.length]!;
      replaySpeedRef.current = next;
      setReplayUi((u) => (u ? { ...u, speed: next } : u));
    };
    const seek = (clientX: number, el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      replayElapsedRef.current = frac * duration;
      placeAt(replayElapsedRef.current);
      syncUi(replayElapsedRef.current);
    };

    // expose controls through a stable object the overlay reads
    replayControlsRef.current = { play, pause, cycleSpeed, seek, fmt, duration };
    placeAt(0);
    syncUi(0);
    setReplayUi({ playing: false, speed: 1 });

    return () => {
      cancelAnimationFrame(replayRafRef.current);
      replayMarkerRef.current?.remove();
      replayMarkerRef.current = null;
      replayControlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay?.coords, replay?.times]);

  return (
    <div className={cn("fleet-map relative h-full w-full", className)}>
      <div ref={containerRef} className="h-full w-full" />
      {replayUi && replayControlsRef.current && (
        <div className="absolute bottom-3 left-3 z-10 flex w-[240px] flex-col gap-1.5 rounded-xl border border-border/60 bg-card/95 px-3 py-2 shadow-float backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button
              className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              onClick={() => (replayUi.playing ? replayControlsRef.current!.pause() : replayControlsRef.current!.play())}
              aria-label={replayUi.playing ? "Pause replay" : "Play replay"}
            >
              {replayUi.playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
            <button
              className="rounded-lg border border-border/60 px-2 py-1 text-[11px] font-semibold tabular-nums"
              onClick={() => replayControlsRef.current!.cycleSpeed()}
            >
              {replayUi.speed}×
            </button>
            <span ref={timeLabelRef} className="ml-auto text-[10.5px] font-medium tabular-nums text-muted-foreground" />
          </div>
          <div
            className="h-1.5 w-full cursor-pointer rounded-full bg-muted"
            onClick={(e) => replayControlsRef.current!.seek(e.clientX, e.currentTarget)}
          >
            <div ref={progressFillRef} className="h-full w-0 rounded-full bg-primary" />
          </div>
        </div>
      )}
    </div>
  );
}

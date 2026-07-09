"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MlMap } from "maplibre-gl";
import { Circle, Hexagon, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type DrawMode = "circle" | "polygon" | null;

interface GeofenceDrawProps {
  map: MlMap | null;
  mode: DrawMode;
  onComplete?: (geofence: {
    name: string;
    kind: "circle" | "polygon";
    center?: [number, number];
    radiusM?: number;
    points?: [number, number][];
    color: string;
  }) => void;
  onCancel?: () => void;
}

export function GeofenceDraw({ map, mode, onComplete, onCancel }: GeofenceDrawProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#1E40FF");
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(500);
  const [points, setPoints] = useState<[number, number][]>([]);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map || !mode) {
      cleanup();
      return;
    }

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (mode === "circle") {
        setCenter(lngLat);
        if (markerRef.current) markerRef.current.remove();
        const marker = new maplibregl.Marker({ color })
          .setLngLat(lngLat)
          .addTo(map);
        markerRef.current = marker;
        drawCircle(lngLat, radius, color);
      } else if (mode === "polygon") {
        const newPoints = [...points, lngLat];
        setPoints(newPoints);
        drawPolygon(newPoints, color);
      }
    };

    map.on("click", handleClick);
    map.getCanvas().style.cursor = "crosshair";

    return () => {
      map.off("click", handleClick);
      map.getCanvas().style.cursor = "";
    };
  }, [map, mode, points, radius, color]);

  useEffect(() => {
    if (mode === "circle" && center) {
      drawCircle(center, radius, color);
    }
  }, [radius, center, color, mode]);

  const drawCircle = (centerLngLat: [number, number], radiusM: number, fillColor: string) => {
    if (!map) return;

    const circlePoints: [number, number][] = [];
    const [lng, lat] = centerLngLat;
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      const dx = (radiusM / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.cos(angle);
      const dy = (radiusM / 110540) * Math.sin(angle);
      circlePoints.push([lng + dx, lat + dy]);
    }

    if (map.getSource("draw-geofence")) {
      (map.getSource("draw-geofence") as maplibregl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [circlePoints] },
      });
    } else {
      map.addSource("draw-geofence", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [circlePoints] },
        },
      });
      map.addLayer({
        id: "draw-geofence-fill",
        type: "fill",
        source: "draw-geofence",
        paint: { "fill-color": fillColor, "fill-opacity": 0.15 },
      });
      map.addLayer({
        id: "draw-geofence-line",
        type: "line",
        source: "draw-geofence",
        paint: { "line-color": fillColor, "line-width": 2, "line-dasharray": [3, 2] },
      });
    }
  };

  const drawPolygon = (pts: [number, number][], fillColor: string) => {
    if (!map || pts.length === 0) return;

    const coordinates = pts.length > 2 ? [[...pts, pts[0]]] : [pts];

    if (map.getSource("draw-geofence")) {
      (map.getSource("draw-geofence") as maplibregl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: { type: pts.length > 2 ? "Polygon" : "LineString", coordinates: pts.length > 2 ? coordinates : pts },
      });
    } else {
      map.addSource("draw-geofence", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: pts.length > 2 ? "Polygon" : "LineString", coordinates: pts.length > 2 ? coordinates : pts },
        },
      });
      if (pts.length > 2) {
        map.addLayer({
          id: "draw-geofence-fill",
          type: "fill",
          source: "draw-geofence",
          paint: { "fill-color": fillColor, "fill-opacity": 0.15 },
        });
      }
      map.addLayer({
        id: "draw-geofence-line",
        type: "line",
        source: "draw-geofence",
        paint: { "line-color": fillColor, "line-width": 2, "line-dasharray": [3, 2] },
      });
    }

    // Add vertex markers
    pts.forEach((pt, i) => {
      const el = document.createElement("div");
      el.className = "size-3 rounded-full border-2 border-white bg-primary shadow-md cursor-pointer";
      new maplibregl.Marker({ element: el }).setLngLat(pt).addTo(map);
    });
  };

  const cleanup = () => {
    if (!map) return;
    if (map.getLayer("draw-geofence-fill")) map.removeLayer("draw-geofence-fill");
    if (map.getLayer("draw-geofence-line")) map.removeLayer("draw-geofence-line");
    if (map.getSource("draw-geofence")) map.removeSource("draw-geofence");
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    setCenter(null);
    setPoints([]);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a geofence name");
      return;
    }

    if (mode === "circle" && center) {
      onComplete?.({
        name: name.trim(),
        kind: "circle",
        center,
        radiusM: radius,
        color,
      });
    } else if (mode === "polygon" && points.length >= 3) {
      onComplete?.({
        name: name.trim(),
        kind: "polygon",
        points,
        color,
      });
    } else {
      toast.error(
        mode === "circle"
          ? "Click on the map to place a circular geofence"
          : "Add at least 3 points to create a polygon",
      );
      return;
    }

    cleanup();
    setName("");
    setColor("#1E40FF");
  };

  const handleCancel = () => {
    cleanup();
    setName("");
    setColor("#1E40FF");
    onCancel?.();
  };

  if (!mode) return null;

  return (
    <div className="absolute left-4 top-4 z-10 w-80 space-y-3 rounded-2xl border border-border/60 bg-card/95 p-4 shadow-float backdrop-blur-xl">
      <div className="flex items-center gap-2">
        {mode === "circle" ? <Circle className="size-5 text-primary" /> : <Hexagon className="size-5 text-primary" />}
        <h3 className="text-sm font-semibold">
          Draw {mode === "circle" ? "Circular" : "Polygon"} Geofence
        </h3>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Geofence name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Warehouse Zone"
            className="h-9 rounded-lg text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="size-9 cursor-pointer rounded-lg border"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 rounded-lg font-mono text-xs"
              />
            </div>
          </div>

          {mode === "circle" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Radius (m)</Label>
              <Input
                type="number"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                min={50}
                max={10000}
                step={50}
                className="h-9 rounded-lg text-sm"
              />
            </div>
          )}
        </div>

        {mode === "polygon" && (
          <div className="rounded-lg border border-border/60 bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
            Click on map to add points. Need at least 3 points. Polygon closes automatically.
            <div className="mt-1 font-medium">{points.length} point{points.length !== 1 ? "s" : ""} added</div>
          </div>
        )}

        {mode === "circle" && !center && (
          <div className="rounded-lg border border-border/60 bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
            Click on the map to place the center of the circular geofence.
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} className="flex-1 gap-1.5 rounded-lg" size="sm">
          <Check className="size-3.5" /> Save Geofence
        </Button>
        <Button onClick={handleCancel} variant="outline" size="sm" className="gap-1.5 rounded-lg">
          <X className="size-3.5" /> Cancel
        </Button>
      </div>

      {mode === "polygon" && points.length > 0 && (
        <Button
          onClick={() => {
            setPoints([]);
            cleanup();
          }}
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3.5" /> Clear Points
        </Button>
      )}
    </div>
  );
}

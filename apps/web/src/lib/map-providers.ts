/**
 * Map tile provider abstraction. All providers are keyless OSM-compatible
 * vector styles — no Google SDK, no billing. Add new providers here without
 * touching any map component.
 */

export interface MapProvider {
  id: string;
  name: string;
  lightStyle: string;
  darkStyle: string;
  satelliteStyle?: string;
  attribution?: string;
}

export const MAP_PROVIDERS: MapProvider[] = [
  {
    id: "carto",
    name: "CARTO Voyager",
    lightStyle: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    darkStyle: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  {
    id: "carto-positron",
    name: "CARTO Positron",
    lightStyle: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    darkStyle: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  {
    id: "openfreemap",
    name: "OpenFreeMap Liberty",
    lightStyle: "https://tiles.openfreemap.org/styles/liberty",
    darkStyle: "https://tiles.openfreemap.org/styles/dark",
  },
];

export const DEFAULT_PROVIDER = MAP_PROVIDERS[0]!;

export function styleFor(provider: MapProvider, dark: boolean): string {
  return dark ? provider.darkStyle : provider.lightStyle;
}

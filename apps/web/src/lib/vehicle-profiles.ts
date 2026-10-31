import type { Database } from "@aerotrack/shared";
import { supabase } from "@/lib/supabase";

export type VehicleProfile = Database["public"]["Tables"]["vehicle_profiles"]["Row"];
export type VehicleProfileInsert = Database["public"]["Tables"]["vehicle_profiles"]["Insert"];

export const VEHICLE_CATEGORIES: { id: VehicleProfile["category"]; label: string }[] = [
  { id: "kei", label: "Kei cars" },
  { id: "compact", label: "Compact" },
  { id: "sedan", label: "Sedan" },
  { id: "suv", label: "SUV / Crossover" },
  { id: "pickup", label: "Pickup / Bakkie" },
  { id: "van", label: "Van" },
  { id: "minibus", label: "Minibus / Kombi" },
  { id: "bus", label: "Bus" },
  { id: "truck", label: "Truck" },
  { id: "other", label: "Other" },
];

export const DIFFICULTY_LABEL: Record<VehicleProfile["difficulty"], string> = {
  easy: "Easy install",
  moderate: "Moderate",
  advanced: "Advanced — read carefully",
};

/** Educational disclaimer shown on every profile page. */
export const INSTALL_DISCLAIMER =
  "Educational reference only. Every vehicle varies — verify all wiring with a " +
  "multimeter and the vehicle's own documentation before cutting or splicing. " +
  "Work on fuel, ignition, hybrid/EV and airbag systems can injure you, damage " +
  "the vehicle, or void its warranty. You proceed entirely at your own risk; " +
  "AeroTrack accepts no responsibility for damage, loss, or injury arising " +
  "from use of this information. If unsure, use a qualified auto-electrician.";

export function profileTitle(p: VehicleProfile): string {
  const years =
    p.year_from != null ? `${p.year_from}–${p.year_to ?? "present"}` : "";
  return `${p.make} ${p.model}${years ? ` (${years})` : ""}`;
}

export function yearsLabel(p: VehicleProfile): string {
  if (p.year_from == null) return "";
  return `${p.year_from}–${p.year_to ?? "present"}`;
}

/** All published profiles, ordered by make/model/category. */
export async function fetchVehicleProfiles(): Promise<VehicleProfile[]> {
  const { data, error } = await supabase
    .from("vehicle_profiles")
    .select("*")
    .eq("is_published", true)
    .order("make")
    .order("category")
    .order("model");
  if (error) return FALLBACK_PROFILES;
  return data ?? [];
}

export async function fetchVehicleProfile(slug: string): Promise<VehicleProfile | null> {
  const { data, error } = await supabase
    .from("vehicle_profiles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) return FALLBACK_PROFILES.find((p) => p.slug === slug) ?? null;
  return data;
}

/** Admin view — includes unpublished drafts. */
export async function fetchAllVehicleProfiles(): Promise<VehicleProfile[]> {
  const { data, error } = await supabase
    .from("vehicle_profiles")
    .select("*")
    .order("make")
    .order("model");
  return error || !data ? [] : data;
}

// Rendered if the table isn't reachable yet (migration not applied / offline).
const FALLBACK_PROFILES: VehicleProfile[] = [
  {
    id: "fb-1", slug: "toyota-vitz-yp130", make: "Toyota", model: "Vitz / Yaris",
    variant: "XP130", year_from: 2010, year_to: 2019, category: "compact",
    market: "JDM import", voltage: "12V", difficulty: "easy", hybrid_or_ev: false,
    canbus: false,
    fusebox_notes: "Interior fusebox left of steering column; engine-bay box beside the battery.",
    cutoff_notes: "Cut the fuel-pump feed via the EFI/C-OPN relay in the engine-bay box.",
    fuel_sensor_notes: "Analog sender behind the rear seat.",
    accessories_notes: "iButton/RFID mounts beside the key barrel.",
    install_notes: "The most common JDM import on Zim roads.",
    zimbabwe_notes: "Dominant first-car import.",
    is_published: true, created_at: "", updated_at: "",
  },
  {
    id: "fb-2", slug: "toyota-aqua-nhp10", make: "Toyota", model: "Aqua / Prius C",
    variant: "NHP10", year_from: 2011, year_to: 2021, category: "compact",
    market: "JDM import", voltage: "hybrid", difficulty: "advanced", hybrid_or_ev: true,
    canbus: true,
    fusebox_notes: "Interior fusebox; 12V battery under the rear seat.",
    cutoff_notes: "HYBRID — the ECU restarts the engine automatically; a fuel cut alone won't immobilise. Never touch orange HV cables.",
    fuel_sensor_notes: "Sender behind the rear seat.",
    accessories_notes: "Standard.",
    install_notes: "Treat as advanced install.",
    zimbabwe_notes: "Very common import.",
    is_published: true, created_at: "", updated_at: "",
  },
  {
    id: "fb-3", slug: "scania-r-series", make: "Scania", model: "R/G/P-series",
    variant: "PGR", year_from: 2004, year_to: null, category: "truck",
    market: "EU", voltage: "24V", difficulty: "moderate", hybrid_or_ev: false,
    canbus: true,
    fusebox_notes: "Central fuse/relay box behind the centre dash panel; 24V direct.",
    cutoff_notes: "Cut the feed to the fuel-metering unit solenoid circuit.",
    fuel_sensor_notes: "CAN fuel data + analog sender at tank.",
    accessories_notes: "RFID driver ID near-universal in Scania fleets.",
    install_notes: "King of the Zim corridor.",
    zimbabwe_notes: "Dominant heavy-haulage choice in Zim.",
    is_published: true, created_at: "", updated_at: "",
  },
];

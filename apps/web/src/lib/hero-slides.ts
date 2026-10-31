import type { Database } from "@aerotrack/shared";
import { supabase } from "@/lib/supabase";

export type HeroSlide = Database["public"]["Tables"]["hero_slides"]["Row"];

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase
    .from("hero_slides")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  if (error || !data || data.length === 0) return FALLBACK_SLIDES;
  return data;
}

export async function fetchAllHeroSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase
    .from("hero_slides")
    .select("*")
    .order("sort_order");
  return error || !data ? [] : data;
}

// Used when the table is unreachable so the hero never renders empty.
const FALLBACK_SLIDES: HeroSlide[] = [
  {
    id: "fb-1", sort_order: 1,
    title: "Every vehicle on one live map",
    description:
      "Real-time positions, route replay and instant alerts for your whole fleet — from one screen, on any device.",
    cta_label: "Start Tracking", cta_href: "/register",
    image_url: "https://picsum.photos/seed/aerotrack-fleet/1600/900",
    is_published: true, created_at: "", updated_at: "",
  },
  {
    id: "fb-2", sort_order: 2,
    title: "Fuel theft caught the same day",
    description:
      "Fuel-level sensors and negotiated coupons flag every litre — drains, phantom fills and over-spend show up instantly.",
    cta_label: "Protect Your Fuel", cta_href: "/register",
    image_url: "https://picsum.photos/seed/aerotrack-fuel/1600/900",
    is_published: true, created_at: "", updated_at: "",
  },
  {
    id: "fb-3", sort_order: 3,
    title: "Cut the engine from anywhere",
    description:
      "Remote immobilisation by app or SMS — stop a stolen or unauthorised vehicle and restore it when it is safe.",
    cta_label: "Get Immobilised", cta_href: "/register",
    image_url: "https://picsum.photos/seed/aerotrack-cutoff/1600/900",
    is_published: true, created_at: "", updated_at: "",
  },
  {
    id: "fb-4", sort_order: 4,
    title: "We run your transport department",
    description:
      "Corporate & industrial fleets: we fit the hardware, watch the alerts, book the services and bill you once a month.",
    cta_label: "Talk To Us", cta_href: "#apply",
    image_url: "https://picsum.photos/seed/aerotrack-corporate/1600/900",
    is_published: true, created_at: "", updated_at: "",
  },
  {
    id: "fb-5", sort_order: 5,
    title: "Bring the trackers you already own",
    description:
      "Ten wire protocols decoded natively — SinoTrack, Teltonika, GT06, JT808 and more plug straight into AeroTrack.",
    cta_label: "See Supported Devices", cta_href: "/supported-vehicles",
    image_url: "https://picsum.photos/seed/aerotrack-devices/1600/900",
    is_published: true, created_at: "", updated_at: "",
  },
];

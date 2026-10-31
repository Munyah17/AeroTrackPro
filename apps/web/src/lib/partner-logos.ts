import type { Database } from "@aerotrack/shared";
import { supabase } from "@/lib/supabase";

export type PartnerLogo = Database["public"]["Tables"]["partner_logos"]["Row"];

export async function fetchPartnerLogos(): Promise<PartnerLogo[]> {
  const { data, error } = await supabase
    .from("partner_logos")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  if (error || !data || data.length === 0) return FALLBACK_LOGOS;
  return data;
}

export async function fetchAllPartnerLogos(): Promise<PartnerLogo[]> {
  const { data, error } = await supabase
    .from("partner_logos")
    .select("*")
    .order("sort_order");
  return error || !data ? [] : data;
}

// Shown when the table is unreachable so the marquee never renders empty.
const FALLBACK_LOGOS: PartnerLogo[] = [
  "SinoTrack", "Teltonika", "Concox", "Queclink", "Xexun", "Coban", "Meitrack",
].map((name, i) => ({
  id: `fb-${i + 1}`,
  sort_order: i + 1,
  name,
  logo_url: "",
  is_published: true,
  created_at: "",
  updated_at: "",
}));

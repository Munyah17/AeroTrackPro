import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AeroTrack Pro — live fleet tracking dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Branded Open Graph card, generated at request time — this is what
 * WhatsApp, Twitter/X, Telegram, LinkedIn and iMessage render when an
 * AeroTrack link is shared.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1e2a78 0%, #1E40FF 55%, #3b6cff 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative route line */}
        <svg
          width="1200"
          height="630"
          viewBox="0 0 1200 630"
          style={{ position: "absolute", top: 0, left: 0, opacity: 0.35 }}
        >
          <path
            d="M -40 500 C 200 420, 320 560, 520 470 S 900 300, 1240 380"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="4"
            strokeDasharray="14 12"
            fill="none"
          />
          <circle cx="520" cy="470" r="12" fill="#4ade80" />
          <circle cx="520" cy="470" r="26" fill="rgba(74,222,128,0.25)" />
          <circle cx="940" cy="352" r="12" fill="#fbbf24" />
          <circle cx="180" cy="463" r="12" fill="#f87171" />
        </svg>

        {/* Soft glow */}
        <div
          style={{
            position: "absolute",
            right: -180,
            top: -180,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.08)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "72px 80px",
            height: "100%",
            justifyContent: "space-between",
          }}
        >
          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 22,
                background: "rgba(255,255,255,0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                <circle cx="12" cy="12" r="8" strokeOpacity="0.6" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: "white", letterSpacing: -1 }}>
                AeroTrack Pro
              </div>
              <div style={{ fontSize: 22, color: "rgba(255,255,255,0.75)" }}>
                GPS Tracking · Fleet Management · Telematics
              </div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                fontSize: 62,
                fontWeight: 800,
                color: "white",
                letterSpacing: -1.5,
                lineHeight: 1.08,
                maxWidth: 900,
              }}
            >
              Know where every vehicle is. Always.
            </div>
            <div style={{ fontSize: 27, color: "rgba(255,255,255,0.82)", maxWidth: 860, lineHeight: 1.4 }}>
              Live tracking, geofencing, fuel monitoring, driver behavior and remote
              immobilization — in one white-label platform.
            </div>
          </div>

          {/* Stat chips */}
          <div style={{ display: "flex", gap: 16 }}>
            {["Live Tracking", "20+ Devices", "White Label", "Geofencing", "Fuel Analytics"].map((chip) => (
              <div
                key={chip}
                style={{
                  padding: "12px 26px",
                  borderRadius: 9999,
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  color: "white",
                  fontSize: 21,
                  fontWeight: 600,
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

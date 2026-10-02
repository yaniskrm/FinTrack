import { ImageResponse } from "next/og";

// Open Graph card shown when a public FinTrack link is shared. Drawn with the
// brand mark and tokens (charcoal #2B2620, gold #C9A961) — no external font or
// image, so it needs no extra dependency and no network at render time.
export function GET(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
          background: "#2B2620",
          color: "#F5F1EA",
        }}
      >
        <svg width="220" height="220" viewBox="0 0 100 100" fill="none">
          <path d="M24 72 H76" stroke="#C9A961" strokeWidth="10" strokeLinecap="round" />
          <path d="M24 50 H58" stroke="#C9A961" strokeWidth="10" strokeLinecap="round" />
          <path d="M24 28 H36" stroke="#C9A961" strokeWidth="10" strokeLinecap="round" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: -2 }}>FinTrack</div>
          <div style={{ fontSize: 40, color: "#C9A961" }}>Vos finances, sans friction.</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

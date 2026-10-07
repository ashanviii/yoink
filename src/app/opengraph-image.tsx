import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/BrandMark";

export const alt = "Yoinkit — save reels, snaps & vids in max quality";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PILLS = ["Instagram", "TikTok", "Facebook", "Snapchat", "Pinterest"];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0b0b0f",
          color: "#f4f3f8",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <BrandMark size={72} radius={20} glyph={48} />
          <div style={{ fontSize: 56, fontWeight: 800 }}>Yoinkit</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>Yoink any video in</div>
          <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1, letterSpacing: -3, color: "#c6ff3d" }}>
            max quality.
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {PILLS.map((pill) => (
            <div key={pill} style={{ padding: "12px 24px", borderRadius: 999, border: "2px solid #2a2a36", fontSize: 28 }}>
              {pill}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

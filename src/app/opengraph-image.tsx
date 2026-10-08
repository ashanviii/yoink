import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/BrandMark";

export const alt = "Yoinkit — get exactly the part you want";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PILLS = ["Trim", "Crop", "GIF", "MP4", "MP3"];

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
          background: "#fff7e0",
          color: "#1d1b16",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <BrandMark size={72} radius={20} glyph={48} />
          <div style={{ fontSize: 56, fontWeight: 800 }}>Yoinkit</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3 }}>Get exactly</div>
          <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3 }}>the part you want.</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {PILLS.map((pill, i) => (
            <div
              key={pill}
              style={{
                padding: "12px 28px",
                borderRadius: 999,
                fontSize: 28,
                fontWeight: 700,
                background: i === 0 ? "#1d1b16" : "#ffc83d",
                color: i === 0 ? "#ffffff" : "#1d1b16",
              }}
            >
              {pill}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

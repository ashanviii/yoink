/** The yoink glyph, written with inline styles so it also works inside next/og ImageResponse. */
export function BrandMark({ size, radius, glyph }: { size: number; radius: number; glyph: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "#c6ff3d",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={glyph} height={glyph} viewBox="0 0 64 64">
        <g fill="none" stroke="#0b0b0f" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 12v26m0 0-10-10m10 10 10-10" />
          <path d="M15 44c4.5 5 10.2 7.5 17 7.5S44.5 49 49 44" />
        </g>
      </svg>
    </div>
  );
}

import { brand } from "@/lib/brand";

/** Shared Open Graph frame for marketing routes (ImageResponse JSX). */
export function OgFrame({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#FFFFFF",
        padding: 72,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 48,
            height: 48,
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
            const filled = i === 2 || i === 4 || i === 6;
            const signal = i === 2;
            return (
              <div
                key={i}
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: 2,
                  background: signal
                    ? "#0A7A55"
                    : filled
                      ? "#0D0D0D"
                      : "rgba(13,13,13,0.14)",
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#0D0D0D",
          }}
        >
          {brand.name}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {eyebrow ? (
          <div
            style={{
              fontSize: 16,
              color: "#5C5C5C",
              fontFamily: "ui-monospace, monospace",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <div
          style={{
            fontSize: 56,
            fontWeight: 600,
            letterSpacing: "-0.045em",
            lineHeight: 1.05,
            color: "#0D0D0D",
            maxWidth: 980,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 22,
            color: "#5C5C5C",
            maxWidth: 820,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>
      </div>
      <div
        style={{
          fontSize: 18,
          color: "#5C5C5C",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {brand.domain}
      </div>
    </div>
  );
}

export const ogSize = { width: 1200, height: 630 };

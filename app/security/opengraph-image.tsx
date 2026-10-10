import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { OgFrame, ogSize } from "@/lib/og";

export const alt = `Security · ${brand.name}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame
        eyebrow="Trust"
        title="Security"
        subtitle="Scopes, API keys in User Properties, license checks, and subprocessors."
      />
    ),
    { ...size },
  );
}

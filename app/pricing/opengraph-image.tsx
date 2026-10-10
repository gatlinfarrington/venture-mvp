import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { OgFrame, ogSize } from "@/lib/og";

export const alt = `Pricing · ${brand.name}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame
        eyebrow="Pricing"
        title="Free to try. Pay when you schedule sync."
        subtitle="Free · Pro $9/mo · Business $19/mo."
      />
    ),
    { ...size },
  );
}

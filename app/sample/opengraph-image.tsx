import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { OgFrame, ogSize } from "@/lib/og";

export const alt = `Sample sheet · ${brand.name}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame
        eyebrow="Sample sheet"
        title="The sheet you get, filled in."
        subtitle="Dashboard, Orders and Subscriptions tabs with example data."
      />
    ),
    { ...size },
  );
}

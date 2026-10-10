import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { OgFrame, ogSize } from "@/lib/og";

export const alt = `Blog · ${brand.name}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame
        eyebrow="Blog"
        title="Notes on sheets-native revenue"
        subtitle="Product and setup writing from the RevenueSheet team."
      />
    ),
    { ...size },
  );
}

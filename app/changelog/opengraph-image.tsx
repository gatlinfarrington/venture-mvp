import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { OgFrame, ogSize } from "@/lib/og";

export const alt = `Changelog · ${brand.name}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame
        eyebrow="Changelog"
        title="What shipped"
        subtitle="Product, docs, and design notes for the Sheets add-on."
      />
    ),
    { ...size },
  );
}

import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { OgFrame, ogSize } from "@/lib/og";

export const alt = `Docs · ${brand.name}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame
        eyebrow="Help center"
        title="Docs for sync, keys, and fixes"
        subtitle="Setup guides for Lemon Squeezy, Polar, and Gumroad."
      />
    ),
    { ...size },
  );
}

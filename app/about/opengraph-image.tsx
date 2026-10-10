import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { OgFrame, ogSize } from "@/lib/og";

export const alt = `About · ${brand.name}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame
        eyebrow="Product"
        title={`About ${brand.name}`}
        subtitle="Why a sheet you own beats another dashboard SaaS."
      />
    ),
    { ...size },
  );
}

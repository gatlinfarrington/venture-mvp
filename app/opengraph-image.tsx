import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { OgFrame, ogSize } from "@/lib/og";

export const alt = `${brand.name} — ${brand.pitch}`;
export const size = ogSize;
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <OgFrame
        title={brand.pitch}
        subtitle="Lemon Squeezy, Polar, Gumroad and Stripe → Google Sheets, with an MRR dashboard."
      />
    ),
    { ...size },
  );
}

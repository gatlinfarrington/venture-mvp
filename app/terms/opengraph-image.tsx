import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { OgFrame, ogSize } from "@/lib/og";

export const alt = `Terms of service · ${brand.name}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame
        eyebrow="Legal"
        title="Terms of service"
        subtitle="Acceptable use, billing, and Google user data for the Sheets add-on."
      />
    ),
    { ...size },
  );
}

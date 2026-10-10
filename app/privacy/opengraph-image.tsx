import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { OgFrame, ogSize } from "@/lib/og";

export const alt = `Privacy policy · ${brand.name}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame
        eyebrow="Legal"
        title="Privacy policy"
        subtitle="Google user data, Limited Use disclosure, deletion, and contact."
      />
    ),
    { ...size },
  );
}

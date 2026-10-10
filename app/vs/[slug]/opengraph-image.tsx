import { ImageResponse } from "next/og";
import { comparePages, getComparePage } from "@/lib/compare-pages";
import { OgFrame, ogSize } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return comparePages.map((p) => ({ slug: p.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getComparePage(slug);

  return new ImageResponse(
    (
      <OgFrame
        eyebrow={page?.ogEyebrow ?? "Compare"}
        title={page?.ogTitle ?? "Compare"}
        subtitle={page?.ogSubtitle ?? page?.description ?? ""}
      />
    ),
    { ...size },
  );
}

import { ImageResponse } from "next/og";
import { getSeoPage, seoPages } from "@/lib/seo-pages";
import { OgFrame, ogSize } from "@/lib/og";
import { hasDesignerOg, serveDesignerOg } from "@/lib/og-static";

export const size = ogSize;
export const contentType = "image/png";
export const dynamicParams = false;

export function generateStaticParams() {
  return seoPages.map((p) => ({ slug: p.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (hasDesignerOg(slug)) {
    return serveDesignerOg(slug);
  }

  const page = getSeoPage(slug);
  const title = page?.ogTitle ?? page?.h1 ?? "Guide";
  const subtitle = page?.description ?? "";
  const eyebrow = page?.ogEyebrow ?? "Guide";

  return new ImageResponse(
    <OgFrame eyebrow={eyebrow} title={title} subtitle={subtitle} />,
    { ...size },
  );
}

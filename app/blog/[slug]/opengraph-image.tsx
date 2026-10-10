import { ImageResponse } from "next/og";
import { getAllBlogPosts, getBlogPost } from "@/lib/content/blog";
import { OgFrame, ogSize } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllBlogPosts().map((p) => ({ slug: p.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  return new ImageResponse(
    (
      <OgFrame
        eyebrow={post?.tags?.[0] ?? "Blog"}
        title={post?.ogTitle ?? post?.title ?? "Blog"}
        subtitle={post?.description ?? ""}
      />
    ),
    { ...size },
  );
}

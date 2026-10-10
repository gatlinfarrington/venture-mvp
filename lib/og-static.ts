import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ogSize } from "@/lib/og";

export { ogSize };

const OG_DIR = path.join(process.cwd(), "public", "og");

/** Designer OG filename for a route key (no extension), e.g. `about` → `og-about-1200x630.png`. */
export function designerOgFilename(key: string): string {
  return `og-${key}-1200x630.png`;
}

export function designerOgPath(key: string): string {
  return path.join(OG_DIR, designerOgFilename(key));
}

export function hasDesignerOg(key: string): boolean {
  return existsSync(designerOgPath(key));
}

/** Serve a designer PNG as the route opengraph-image response. */
export async function serveDesignerOg(key: string): Promise<Response> {
  const file = await readFile(designerOgPath(key));
  return new Response(file, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

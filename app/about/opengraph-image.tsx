import { brand } from "@/lib/brand";
import { ogSize, serveDesignerOg } from "@/lib/og-static";

export const alt = `About · ${brand.name}`;
export const size = ogSize;
export const contentType = "image/png";

export default async function Image() {
  return serveDesignerOg("about");
}

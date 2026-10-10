import Link from "next/link";
import { brand } from "@/lib/brand";
import { LogoMark } from "@/components/LogoMark";

type Props = {
  href?: string;
  markSize?: number;
  className?: string;
};

export function BrandWordmark({ href = "/", markSize = 28, className }: Props) {
  return (
    <Link
      href={href}
      className={`brand ${className ?? ""}`.trim()}
      aria-label={brand.name}
    >
      <LogoMark size={markSize} className="brand-mark" decorative />
      <span aria-hidden="true">{brand.name}</span>
      <span
        className="badge"
        title="Not yet on the Google Workspace Marketplace"
      >
        <i aria-hidden="true" />
        Pre-launch
      </span>
    </Link>
  );
}

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
    <div className={`brand ${className ?? ""}`.trim()}>
      <Link href={href} className="brand-home" aria-label={brand.name}>
        <LogoMark size={markSize} className="brand-mark" decorative />
        <span aria-hidden="true">{brand.name}</span>
      </Link>
    </div>
  );
}

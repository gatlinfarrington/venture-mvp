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
    <Link href={href} className={`brand ${className ?? ""}`.trim()}>
      <LogoMark size={markSize} className="brand-mark" />
      <span>{brand.name}</span>
    </Link>
  );
}

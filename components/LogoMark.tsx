import { brand } from "@/lib/brand";

type Props = {
  size?: number;
  className?: string;
  title?: string;
};

/** Ledger Cell mark (logo-v2 c3). Colors follow current theme via currentColor + signal. */
export function LogoMark({ size = 28, className, title }: Props) {
  const label = title ?? brand.logo.markAlt;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <rect x="6" y="6" width="8" height="8" rx="1" fill="currentColor" opacity="0.14" />
      <rect x="6" y="16" width="8" height="8" rx="1" fill="currentColor" opacity="0.14" />
      <rect x="6" y="26" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="16" y="6" width="8" height="8" rx="1" fill="currentColor" opacity="0.14" />
      <rect x="16" y="16" width="8" height="8" rx="1" fill="currentColor" />
      <rect x="16" y="26" width="8" height="8" rx="1" fill="currentColor" opacity="0.14" />
      <rect x="26" y="6" width="8" height="8" rx="1" fill="var(--c-signal)" />
      <rect x="26" y="16" width="8" height="8" rx="1" fill="currentColor" opacity="0.14" />
      <rect x="26" y="26" width="8" height="8" rx="1" fill="currentColor" opacity="0.14" />
    </svg>
  );
}

import { templateCopyUrl } from "@/lib/brand";

type Props = {
  className?: string;
  source: string;
};

/**
 * “Make a copy” for the sample sheet template.
 * Always visible; enabled only when NEXT_PUBLIC_TEMPLATE_COPY_URL is set.
 */
export function MakeACopySlot({ className, source }: Props) {
  const href = templateCopyUrl();
  const cls = className ?? "btn btn-secondary";
  if (!href) {
    return (
      <button type="button" className={cls} disabled aria-disabled="true">
        Make a copy
      </button>
    );
  }
  const url = href.includes("?")
    ? `${href}&utm_source=${source}`
    : `${href}?utm_source=${source}`;
  return (
    <a className={cls} href={url} target="_blank" rel="noopener noreferrer">
      Make a copy
    </a>
  );
}

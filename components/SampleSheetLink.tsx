import { templateCopyUrl } from "@/lib/brand";

type Props = {
  className?: string;
  source: string;
};

/** “Copy the sample sheet” — rendered only when NEXT_PUBLIC_TEMPLATE_COPY_URL is set. */
export function SampleSheetLink({ className, source }: Props) {
  const href = templateCopyUrl();
  if (!href) return null;
  const url = href.includes("?") ? `${href}&utm_source=${source}` : `${href}?utm_source=${source}`;
  return (
    <a
      className={className ?? "btn btn-secondary"}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      Copy the sample sheet
    </a>
  );
}

import { templateXlsxUrl } from "@/lib/brand";

type Props = {
  source: string;
};

/** Secondary CTA: download the blank public .xlsx template. */
export function SampleTemplateDownload({ source }: Props) {
  const href = templateXlsxUrl();
  const url = href.startsWith("http")
    ? href.includes("?")
      ? `${href}&utm_source=${source}`
      : `${href}?utm_source=${source}`
    : href;

  return (
    <a
      className="btn btn-secondary"
      href={url}
      download={href.startsWith("http") ? undefined : "revenuesheet-template.xlsx"}
    >
      Download the template (.xlsx)
    </a>
  );
}

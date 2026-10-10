import { DocsNav } from "@/components/DocsNav";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs-shell container">
      <DocsNav />
      <div className="docs-main">{children}</div>
    </div>
  );
}

import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import type { ReactNode } from "react";

const components = {
  a: ({ href = "", children }: { href?: string; children?: ReactNode }) => {
    if (href.startsWith("/")) {
      return <Link href={href}>{children}</Link>;
    }
    return (
      <a href={href} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>
        {children}
      </a>
    );
  },
};

export function MdxContent({ source }: { source: string }) {
  return <MDXRemote source={source} components={components} />;
}

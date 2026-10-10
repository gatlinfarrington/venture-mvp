import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { StripeAdminBanner } from "@/components/StripeAdminBanner";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const sans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  display: "swap",
  weight: ["400", "500", "600"],
  adjustFontFallback: true,
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-loaded",
  display: "swap",
  weight: ["400", "500"],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${brand.name} · ${brand.pitch}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.metaDescription,
  applicationName: brand.name,
  icons: {
    icon: [{ url: brand.logo.icon32 }, { url: brand.logo.icon128, sizes: "128x128" }],
  },
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: `${brand.name} · ${brand.pitch}`,
    description: brand.metaDescription,
    url: siteConfig.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} · ${brand.pitch}`,
    description: brand.metaDescription,
  },
  alternates: {
    canonical: siteConfig.url,
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <head>
        <style>{`:root{--font-sans:var(--font-sans-loaded),'Inter Tight',system-ui,sans-serif;--font-mono:var(--font-mono-loaded),'JetBrains Mono',ui-monospace,monospace}`}</style>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion')}catch(e){}",
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <StripeAdminBanner />
        <Nav />
        <div id="main" tabIndex={-1}>
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}

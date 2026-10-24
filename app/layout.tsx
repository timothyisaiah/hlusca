import type { Metadata, Viewport } from "next";
import "./globals.css";

import { env } from "@/lib/env";
import { themeInitScript } from "@/lib/theme";

const description = "Savings, loans and membership for HLUSCA members.";

// Icons, the share thumbnail and the manifest come from app/ file conventions
// (favicon.ico, icon.png, apple-icon.png, opengraph-image.png, manifest.ts).
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXTAUTH_URL),
  applicationName: "HLUSCA",
  title: { default: "HLUSCA SACCO Platform", template: "%s · HLUSCA" },
  description,
  openGraph: {
    type: "website",
    siteName: "HLUSCA",
    title: "HLUSCA SACCO Platform",
    description,
  },
  twitter: { card: "summary_large_image", title: "HLUSCA SACCO Platform", description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The pre-paint script sets the theme class before hydration.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

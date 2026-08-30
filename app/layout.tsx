import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HLUSCA SACCO Platform",
  description: "Savings, membership, and loan operations for HLUSCA.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

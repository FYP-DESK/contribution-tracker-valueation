import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FYP Desk — Contribution Tracker & Valuation",
  description: "Who did what, where, when — and what share it earns.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-bg text-[#dbe4ee] antialiased">{children}</body>
    </html>
  );
}

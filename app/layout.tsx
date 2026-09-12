import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeroPage - Multi-Page Messenger SaaS",
  description: "Manage multiple Facebook Pages and Messenger conversations from one unified dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}

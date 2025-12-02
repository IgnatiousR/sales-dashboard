import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Dashboard",
  description: "App developed for accessment, developed by Ignatious Rozario",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

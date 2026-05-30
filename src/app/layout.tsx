import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "mergeconflict",
  description: "Find the repository you were meant to commit to.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

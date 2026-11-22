import type { Metadata, Viewport } from "next";
import "./globals.css";

// Fonts are loaded via a runtime <link> (not next/font) so that builds never
// fail on a flaky network — if Google Fonts is unreachable the system font
// stack in globals.css is used instead.
export const metadata: Metadata = {
  title: "Pratipaksh — Know how you'll lose, before you sign",
  description:
    "An adversarial multi-agent AI that argues against your contract like opposing counsel, verifies every citation, and redrafts it until you win. Built for Indian law.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f1a33" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500..800&family=Inter:wght@400..700&family=Noto+Sans+Devanagari:wght@400;600&display=swap"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

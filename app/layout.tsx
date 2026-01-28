import React from "react";
import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono, Orbitron } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "RIPPLE 2026 - A Festival of Innovation, Culture & Creativity",
  description:
    "Join us for RIPPLE 2026, the ultimate college fest featuring technical competitions, cultural events, workshops, gaming tournaments, and more. Register now!",
  keywords: [
    "college fest",
    "RIPPLE 2026",
    "tech fest",
    "cultural fest",
    "workshops",
    "gaming",
  ],
  openGraph: {
    title: "RIPPLE 2026 - A Festival of Innovation, Culture & Creativity",
    description:
      "Join us for RIPPLE 2026, the ultimate college fest featuring technical competitions, cultural events, workshops, and gaming tournaments.",
    type: "website",
  },
  generator: 'v0.app'
};

export const viewport: Viewport = {
  themeColor: "#0a0a1a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${orbitron.variable} font-sans antialiased min-h-screen bg-background text-foreground`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

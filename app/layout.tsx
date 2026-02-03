import React from "react";
import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono, Orbitron } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { GlobalBackground } from "@/components/global-background";
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
  title: "TechSprint 2K26 - 24 Hour National Level Hackathon | Win an Internship",
  description:
    "Join TechSprint 2K26 at RGM College of Engineering & Technology. A 24-hour national level hackathon. IdeateX → CodeJam → Win an Internship!",
  keywords: [
    "hackathon",
    "TechSprint 2026",
    "coding competition",
    "ideathon",
    "codathon",
    "internship",
    "RGMCET",
    "Nandyal",
    "Andhra Pradesh",
  ],
  authors: [{ name: "Department of CSE, RGMCET" }],
  openGraph: {
    title: "TechSprint 2K26 - 24 Hour Hackathon | Win an Internship",
    description:
      "Join TechSprint 2K26, a 24-hour national level hackathon. IdeateX → CodeJam → Win an Internship!",
    type: "website",
    locale: "en_US",
    siteName: "TechSprint 2K26",
  },
  twitter: {
    card: "summary_large_image",
    title: "TechSprint 2K26",
    description: "24-hour national level hackathon at RGMCET.",
  },
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-icon.png",
  },
  generator: 'TechSprint 2K26'
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${orbitron.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
        suppressHydrationWarning
      >
        <GlobalBackground />
        {children}
        <Analytics />
      </body>
    </html>
  );
}

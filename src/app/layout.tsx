import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Snake Game - Classic Retro Game",
  description:
    "Play the classic Snake game in your browser. A fun and addictive retro game for all ages.",
  applicationName: "Snake Game",
  authors: [{ name: "Slavik Meltser" }],
  keywords: ["snake", "game", "retro", "classic", "arcade", "browser game"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Snake Game",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/icon-16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/icon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icon-48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        url: "/icon-96.png",
        sizes: "96x96",
        type: "image/png",
      },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "256x256", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "Snake Game",
    title: "Snake Game - Classic Retro Game",
    description:
      "Play the classic Snake game in your browser. A fun and addictive retro game for all ages.",
  },
  twitter: {
    card: "summary",
    title: "Snake Game - Classic Retro Game",
    description:
      "Play the classic Snake game in your browser. A fun and addictive retro game for all ages.",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

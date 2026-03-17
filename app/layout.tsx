import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Source_Sans_3, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/seo";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "SnapItNow | Wedding Disposable Camera App",
    template: "%s | SnapItNow",
  },
  description:
    "SnapItNow gives your guests a disposable-camera style wedding experience with instant shared gallery moments.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "SnapItNow",
    title: "SnapItNow | Wedding Disposable Camera App",
    description:
      "A disposable-camera style photo app for weddings: guests scan, snap, and share authentic moments instantly.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "SnapItNow wedding photo sharing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapItNow | Wedding Disposable Camera App",
    description:
      "A disposable-camera style photo app for weddings with instant shared gallery moments.",
    images: ["/og-default.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${playfair.variable}`}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Quadrants — Map ideas visually",
  description: "A private, browser-based tool for making beautiful quadrant maps. Drag, arrange, and export—no account required.",
  metadataBase: new URL("https://quadrants.io"),
  openGraph: {
    title: "Quadrants — Map ideas visually",
    description: "Place ideas. See the field.",
    siteName: "Quadrants",
    type: "website",
    images: ["/og.png"],
  },
  twitter: { card: "summary_large_image", title: "Quadrants — Map ideas visually", description: "Place ideas. See the field.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}

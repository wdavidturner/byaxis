import type { Metadata } from "next";
import { DM_Sans, Geist, Geist_Mono, IBM_Plex_Mono, IBM_Plex_Sans, Inter, Manrope, Nunito_Sans, Source_Serif_4, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const nunitoSans = Nunito_Sans({ variable: "--font-nunito-sans", subsets: ["latin"] });
const ibmPlexSans = IBM_Plex_Sans({ variable: "--font-ibm-plex-sans", subsets: ["latin"], weight: ["400", "600", "700"] });
const ibmPlexMono = IBM_Plex_Mono({ variable: "--font-ibm-plex-mono", subsets: ["latin"], weight: ["400", "600", "700"] });
const fontVariables = [geistSans, geistMono, inter, spaceGrotesk, dmSans, sourceSerif, manrope, nunitoSans, ibmPlexSans, ibmPlexMono].map((font) => font.variable).join(" ");

export const metadata: Metadata = {
  title: "Byaxis — Map ideas visually",
  description: "A private, browser-based tool for making beautiful quadrant maps. Drag, arrange, and export—no account required.",
  openGraph: {
    title: "Byaxis — Map ideas visually",
    description: "Place ideas. See the field.",
    siteName: "Byaxis",
    type: "website",
    images: ["/og.png"],
  },
  twitter: { card: "summary_large_image", title: "Byaxis — Map ideas visually", description: "Place ideas. See the field.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={fontVariables}>{children}</body></html>;
}

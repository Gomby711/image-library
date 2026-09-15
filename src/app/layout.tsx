import type { Metadata, Viewport } from "next";
import { Geist, Fraunces } from "next/font/google";
import { BootSplash } from "@/components/boot-splash";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "600", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Asset Library",
  description: "Private image library — upload, organize, and share your visual assets.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Asset Library",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0906",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <BootSplash />
        {children}
      </body>
    </html>
  );
}

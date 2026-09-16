import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Coverking Asset Library",
  description: "Private image library — upload, organize, and share your visual assets.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Coverking Asset Library",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${roboto.variable} h-full antialiased`}>
      <head>
        {/* Apply stored theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('ck-theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}}catch(e){}})();` }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito_Sans } from "next/font/google";
import Script from "next/script";
import { brand } from "@/lib/brand";
import { env } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: brand.productName,
  description: brand.description,
  openGraph: {
    type: "website",
    siteName: brand.productName,
    title: brand.productName,
    description: brand.description,
    url: env.APP_URL,
    images: [
      {
        url: brand.fullLogoPath,
        width: 1200,
        height: 630,
        alt: brand.productName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: brand.productName,
    description: brand.description,
    images: [brand.fullLogoPath],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${nunitoSans.variable} h-full antialiased`}
      data-theme="cyberduck"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="rubberduck-theme-init" strategy="beforeInteractive">
          {`(() => { try { const t = localStorage.getItem("rubberduck-theme"); const theme = t === "rubberduck" || t === "cyberduck" ? t : "cyberduck"; document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme === "rubberduck" ? "light" : "dark"; } catch (_) {} })();`}
        </Script>
        {children}
      </body>
    </html>
  );
}

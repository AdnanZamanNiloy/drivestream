import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/streamer/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Google Drive Video Streamer — Clean VLC-ready stream links",
  description:
    "Paste a Google Drive video link and get a clean, stable stream URL with HTTP Range/206 seeking support that works directly in VLC, mpv and any HTTP player. No expiring Google tokens.",
  keywords: [
    "Google Drive",
    "VLC",
    "video streaming",
    "stream URL",
    "HTTP Range",
    "206 Partial Content",
    "drive streamer",
  ],
  applicationName: "Google Drive Video Streamer",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Google Drive Video Streamer",
    description:
      "Clean, token-free VLC stream links for Google Drive videos with true HTTP Range seeking.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7faf8" },
    { media: "(prefers-color-scheme: dark)", color: "#101614" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";

export const metadata: Metadata = {
  title: { default: "TheOne", template: "%s · TheOne" },
  description: "Tagebuch, Aufgaben, Notizen & Einkaufsliste – alles in einer App.",
  applicationName: "TheOne",
  appleWebApp: { capable: true, title: "TheOne", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8ecf8" },
    { media: "(prefers-color-scheme: dark)", color: "#07080f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <div className="ambient" aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}

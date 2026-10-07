import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TheOne – Dein All-in-One",
    short_name: "TheOne",
    description: "Tagebuch, Aufgaben, Notizen & Einkaufsliste – alles in einer App.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0c18",
    theme_color: "#6d5dfc",
    lang: "de",
    categories: ["productivity", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Neuer Gedanke", url: "/journal?new=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Neue Aufgabe", url: "/todos?new=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Einkaufsliste", url: "/shopping", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

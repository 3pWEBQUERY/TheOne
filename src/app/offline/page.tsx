import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { StatusPage } from "@/components/status-page";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <StatusPage icon={WifiOff} title="Keine Verbindung" text="Sobald du wieder online bist, ist alles wieder da.">
      <a href="/" className="btn btn-primary w-full">
        Erneut versuchen
      </a>
    </StatusPage>
  );
}

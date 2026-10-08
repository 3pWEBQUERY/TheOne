import Link from "next/link";
import { SearchX } from "lucide-react";
import { StatusPage } from "@/components/status-page";

export default function NotFound() {
  return (
    <StatusPage icon={SearchX} title="Seite nicht gefunden" text="Diese Seite existiert nicht (mehr).">
      <Link href="/" className="btn btn-primary w-full">
        Zur Übersicht
      </Link>
    </StatusPage>
  );
}

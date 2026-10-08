"use client";

import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page">
      <EmptyState
        icon={TriangleAlert}
        title="Da ist etwas schiefgelaufen"
        text={error.digest ? `Fehler-ID: ${error.digest}` : "Bitte versuche es erneut."}
      >
        <button type="button" className="btn btn-primary" onClick={reset}>
          Erneut versuchen
        </button>
      </EmptyState>
    </div>
  );
}

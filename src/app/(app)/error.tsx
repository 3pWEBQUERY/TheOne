"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page">
      <div className="glass rounded-[28px] p-8 text-center">
        <div className="mb-3 text-5xl">😵‍💫</div>
        <h1 className="text-xl font-extrabold">Da ist etwas schiefgelaufen</h1>
        <p className="muted mt-2 text-sm">{error.digest ? `Fehler-ID: ${error.digest}` : "Bitte versuche es erneut."}</p>
        <button type="button" className="btn btn-primary mt-6" onClick={reset}>
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}

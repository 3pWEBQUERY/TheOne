import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <div className="glass-strong w-full max-w-sm rounded-[36px] p-8 text-center">
        <div className="mb-3 text-5xl">📡</div>
        <h1 className="text-2xl font-extrabold">Du bist offline</h1>
        <p className="muted mt-2 text-sm">Sobald du wieder Verbindung hast, ist alles wieder da.</p>
        <a href="/" className="btn btn-primary mt-6 w-full">
          Erneut versuchen
        </a>
      </div>
    </main>
  );
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-5" style={{ paddingTop: "calc(var(--safe-t) + 1.25rem)" }}>
      <div className="glass animate-pop w-full max-w-sm rounded-2xl p-7">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="mx-auto mb-4 h-14 w-14 rounded-xl" />
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="muted mt-1 text-sm">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}

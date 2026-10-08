import type { LucideIcon } from "lucide-react";

export function StatusPage({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <div className="glass w-full max-w-sm rounded-2xl p-8 text-center">
        <span className="icon-tile mx-auto mb-4 !h-12 !w-12 !rounded-xl">
          <Icon size={24} strokeWidth={1.8} />
        </span>
        <h1 className="text-xl font-semibold">{title}</h1>
        {text && <p className="muted mt-1.5 text-sm">{text}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </main>
  );
}

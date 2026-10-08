import type { LucideIcon } from "lucide-react";

/** One labelled line in a read-only detail view. */
export function DetailRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
      <Icon size={16} className="faint flex-none" />
      <span className="muted w-24 flex-none">{label}</span>
      <span className="min-w-0 flex-1 text-right font-medium">{children}</span>
    </div>
  );
}

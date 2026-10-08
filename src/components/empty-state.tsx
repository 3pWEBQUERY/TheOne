import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass animate-pop flex flex-col items-center rounded-xl px-6 py-10 text-center">
      <span className="icon-tile mb-3 !h-11 !w-11 !rounded-xl">
        <Icon size={22} strokeWidth={1.8} />
      </span>
      <p className="text-[15px] font-semibold">{title}</p>
      {text && <p className="muted mt-1 max-w-sm text-sm">{text}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookHeart, CheckCircle2, Home, ShoppingBasket, StickyNote } from "lucide-react";

export const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/journal", label: "Tagebuch", icon: BookHeart },
  { href: "/todos", label: "Aufgaben", icon: CheckCircle2 },
  { href: "/notes", label: "Notizen", icon: StickyNote },
  { href: "/shopping", label: "Einkauf", icon: ShoppingBasket },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function TabBar({ badges }: { badges: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  return (
    <>
      {/* Mobile: floating glass tab bar */}
      <nav
        className="fixed inset-x-0 z-50 flex justify-center px-3 lg:hidden"
        style={{ bottom: "calc(var(--safe-b) + 0.6rem)" }}
      >
        <div className="glass-strong glass-pill flex w-full max-w-md items-center justify-between p-1.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            const badge = badges[href];
            return (
              <Link
                key={href}
                href={href}
                className="relative flex h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-semibold transition-all duration-300"
                style={{
                  color: active ? "var(--accent)" : "var(--text-2)",
                  background: active ? "var(--glass-bg-strong)" : "transparent",
                  boxShadow: active ? "inset 0 1px 0 var(--glass-edge), 0 4px 14px -6px rgba(0,0,0,.25)" : "none",
                }}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                {label}
                {!!badge && (
                  <span className="absolute top-1 right-[calc(50%-20px)] min-w-[18px] rounded-full bg-[var(--danger)] px-1 text-center text-[10px] leading-[18px] text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop: glass sidebar */}
      <aside className="fixed top-4 bottom-4 left-4 z-40 hidden w-60 lg:block">
        <div className="glass flex h-full flex-col gap-1 rounded-[28px] p-3">
          <div className="flex items-center gap-2.5 px-3 pt-2 pb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="h-9 w-9 rounded-xl shadow" />
            <span className="text-xl font-extrabold tracking-tight">TheOne</span>
          </div>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            const badge = badges[href];
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 font-semibold transition-all"
                style={{
                  color: active ? "var(--accent)" : "var(--text)",
                  background: active ? "var(--glass-bg-strong)" : "transparent",
                  boxShadow: active ? "inset 0 1px 0 var(--glass-edge)" : "none",
                }}
              >
                <Icon size={20} />
                <span className="flex-1">{label}</span>
                {!!badge && (
                  <span className="rounded-full bg-[var(--danger)] px-2 text-xs leading-5 text-white">{badge}</span>
                )}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}

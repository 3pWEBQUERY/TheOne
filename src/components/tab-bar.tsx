"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, CircleCheckBig, LayoutDashboard, NotebookPen, Settings, ShoppingCart } from "lucide-react";
import { ThemeToggleButton } from "./theme";

export const NAV = [
  { href: "/", label: "Übersicht", short: "Home", icon: LayoutDashboard },
  { href: "/journal", label: "Tagebuch", short: "Tagebuch", icon: BookOpen },
  { href: "/todos", label: "Aufgaben", short: "Aufgaben", icon: CircleCheckBig },
  { href: "/notes", label: "Notizen", short: "Notizen", icon: NotebookPen },
  { href: "/shopping", label: "Einkauf", short: "Einkauf", icon: ShoppingCart },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const NON_TEXT_INPUTS = ["checkbox", "radio", "button", "submit", "reset", "file", "range", "color", "image"];

function isTextField(el: Element | null) {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.includes(el.type);
  return el.matches("textarea, select, [contenteditable='true']");
}

/**
 * iOS moves position:fixed elements up with the on-screen keyboard (and sometimes leaves
 * them there). Hide the bar while the keyboard is open and nudge the layout afterwards.
 */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    const keyboardByViewport = () => !!vv && window.innerHeight - vv.height > 150;
    const sync = () => setOpen(isTextField(document.activeElement) || keyboardByViewport());
    const onFocusIn = (e: FocusEvent) => {
      if (isTextField(e.target as Element)) setOpen(true);
    };
    const onFocusOut = () =>
      setTimeout(() => {
        sync();
        // Forces iOS to re-anchor fixed elements after the keyboard is gone.
        if (!isTextField(document.activeElement)) window.scrollTo(window.scrollX, window.scrollY);
      }, 80);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    vv?.addEventListener("resize", sync);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      vv?.removeEventListener("resize", sync);
    };
  }, []);
  return open;
}

export function TabBar({ badges }: { badges: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  const keyboardOpen = useKeyboardOpen();
  return (
    <>
      {/* Mobile: floating glass tab bar */}
      <nav
        className="fixed inset-x-0 z-50 flex justify-center px-3 transition-[transform,opacity] duration-200 lg:hidden"
        style={{
          bottom: "calc(var(--safe-b) + 0.5rem)",
          transform: keyboardOpen ? "translateY(140%)" : "none",
          opacity: keyboardOpen ? 0 : 1,
          pointerEvents: keyboardOpen ? "none" : undefined,
        }}
        aria-label="Hauptnavigation"
        aria-hidden={keyboardOpen || undefined}
      >
        <div className="glass-strong flex w-full max-w-md items-stretch rounded-2xl p-1">
          {NAV.map(({ href, short, icon: Icon }) => {
            const active = isActive(pathname, href);
            const badge = badges[href];
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10.5px] font-medium transition-colors"
                style={{
                  color: active ? "var(--accent-text)" : "var(--text-2)",
                  background: active ? "var(--accent-soft)" : "transparent",
                }}
              >
                <Icon size={21} strokeWidth={active ? 2.2 : 1.8} />
                {short}
                {!!badge && (
                  <span className="absolute top-1.5 left-[calc(50%+6px)] min-w-[17px] rounded-full bg-[var(--danger)] px-1 text-center text-[10px] leading-[17px] font-semibold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop: docked sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r px-3 py-5 lg:flex"
        style={{ borderColor: "var(--border)", background: "var(--surface-bar)", backdropFilter: "blur(20px)" }}
        aria-label="Hauptnavigation"
      >
        <div className="mb-6 flex items-center gap-2.5 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="text-[17px] font-semibold tracking-tight">TheOne</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            const badge = badges[href];
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors hover:bg-[var(--surface-hover)]"
                style={{
                  color: active ? "var(--accent-text)" : "var(--text)",
                  background: active ? "var(--accent-soft)" : undefined,
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                <span className="flex-1">{label}</span>
                {!!badge && <span className="badge">{badge}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-1 border-t px-1 pt-3" style={{ borderColor: "var(--border)" }}>
          <Link
            href="/settings"
            className="flex flex-1 items-center gap-3 rounded-lg px-1.5 py-2 text-[14px] font-medium transition-colors hover:bg-[var(--surface-hover)]"
            style={{ color: pathname.startsWith("/settings") ? "var(--accent-text)" : "var(--text)" }}
          >
            <Settings size={18} strokeWidth={1.8} /> Einstellungen
          </Link>
          <ThemeToggleButton />
        </div>
      </aside>
    </>
  );
}

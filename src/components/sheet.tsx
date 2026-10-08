"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
};

const noop = () => () => {};

/** false during SSR + hydration, true afterwards – keeps portals hydration-safe. */
export function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

/**
 * Locks page scrolling without letting iOS jump the page when an input inside
 * the sheet gets focus (overflow:hidden alone is ignored by Mobile Safari).
 */
let lockCount = 0;
let savedScrollY = 0;
function lockScroll() {
  if (lockCount++ > 0) return;
  savedScrollY = window.scrollY;
  const b = document.body.style;
  b.position = "fixed";
  b.top = `-${savedScrollY}px`;
  b.left = "0";
  b.right = "0";
  b.width = "100%";
  b.overflow = "hidden";
}
function unlockScroll() {
  if (--lockCount > 0) return;
  const b = document.body.style;
  b.position = "";
  b.top = "";
  b.left = "";
  b.right = "";
  b.width = "";
  b.overflow = "";
  window.scrollTo(0, savedScrollY);
}

type Viewport = { top: number; height: number; keyboard: boolean };

/** Tracks the visual viewport so the sheet always sits above the on-screen keyboard. */
function useVisualViewport(active: boolean) {
  const [vp, setVp] = useState<Viewport | null>(null);
  useEffect(() => {
    if (!active) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () =>
      setVp({ top: vv.offsetTop, height: vv.height, keyboard: window.innerHeight - vv.height > 120 });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);
  return vp;
}

export function Sheet({ open, onClose, title, actions, children, footer, wide }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const isClient = useIsClient();
  const vp = useVisualViewport(open && isClient);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    lockScroll();
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Keep the focused field visible inside the sheet instead of scrolling the page.
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const onFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target.matches("input, textarea, select")) return;
      setTimeout(() => target.scrollIntoView({ block: "nearest", behavior: "smooth" }), 300);
    };
    el.addEventListener("focusin", onFocus);
    return () => el.removeEventListener("focusin", onFocus);
  });

  if (!open || !isClient) return null;

  // Swipe down on the grabber to dismiss (mobile).
  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null || !panel.current) return;
    const dy = Math.max(0, e.touches[0].clientY - startY.current);
    panel.current.style.transform = `translateY(${dy}px)`;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startY.current === null || !panel.current) return;
    const dy = e.changedTouches[0].clientY - startY.current;
    startY.current = null;
    if (dy > 110) onClose();
    else panel.current.style.transform = "";
  };

  const keyboard = vp?.keyboard ?? false;

  return createPortal(
    <div
      className="fixed inset-x-0 z-[70] flex items-end justify-center md:items-center md:p-6"
      style={vp ? { top: vp.top, height: vp.height } : { top: 0, bottom: 0 }}
      role="dialog"
      aria-modal
    >
      <div className="sheet-backdrop absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={panel}
        className={`sheet-panel relative flex w-full flex-col border shadow-[var(--shadow-lg)] md:rounded-2xl ${
          keyboard ? "h-full rounded-none" : "max-h-[92%] rounded-t-2xl"
        } ${wide ? "md:max-w-2xl" : "md:max-w-lg"}`}
        style={{ transition: "transform 0.2s ease", background: "var(--surface-solid)", borderColor: "var(--border)" }}
      >
        {!keyboard && (
          <div
            className="flex cursor-grab touch-none justify-center pt-2.5 pb-1 md:hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="h-1.5 w-10 rounded-full bg-current opacity-20" />
          </div>
        )}
        <div className={`flex items-center gap-2 px-5 pb-3 md:pt-5 ${keyboard ? "pt-3" : "pt-2"}`}>
          <h2 className="min-w-0 flex-1 truncate text-[17px] font-semibold">{title}</h2>
          {actions}
          <button type="button" className="icon-btn -mr-2" onClick={onClose} aria-label="Schließen">
            <X size={20} />
          </button>
        </div>
        <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          {children}
        </div>
        {footer && (
          <div
            className="flex gap-3 border-t px-5 pt-3"
            style={{
              borderColor: "var(--border)",
              paddingBottom: keyboard ? "0.75rem" : "calc(var(--safe-b) + 0.9rem)",
            }}
          >
            {footer}
          </div>
        )}
        {!footer && !keyboard && <div style={{ height: "var(--safe-b)" }} />}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmButton({
  onConfirm,
  children,
  className = "btn btn-ghost",
  confirmText = "Wirklich löschen?",
}: {
  onConfirm: () => void;
  children: React.ReactNode;
  className?: string;
  confirmText?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 2500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={className}
      style={armed ? { color: "var(--danger)" } : undefined}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      {armed ? confirmText : children}
    </button>
  );
}

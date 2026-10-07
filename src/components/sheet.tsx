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

export function Sheet({ open, onClose, title, actions, children, footer, wide }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const isClient = useIsClient();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

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

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal>
      <div className="sheet-backdrop absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        className={`sheet-panel glass-strong relative flex max-h-[92dvh] w-full flex-col rounded-t-[32px] md:rounded-[32px] ${
          wide ? "md:max-w-2xl" : "md:max-w-lg"
        }`}
        style={{ transition: "transform 0.2s ease" }}
      >
        <div
          className="flex cursor-grab touch-none justify-center pt-2.5 pb-1 md:hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-1.5 w-10 rounded-full bg-current opacity-20" />
        </div>
        <div className="flex items-center gap-2 px-5 pt-2 pb-3 md:pt-5">
          <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{title}</h2>
          {actions}
          <button type="button" className="icon-btn -mr-2" onClick={onClose} aria-label="Schließen">
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && (
          <div
            className="flex gap-3 border-t px-5 pt-3"
            style={{ borderColor: "var(--divider)", paddingBottom: "calc(var(--safe-b) + 0.9rem)" }}
          >
            {footer}
          </div>
        )}
        {!footer && <div style={{ height: "var(--safe-b)" }} />}
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

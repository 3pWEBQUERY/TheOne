"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Toast = { id: number; text: string; tone: "default" | "success" | "error" };
type Ctx = (text: string, tone?: Toast["tone"]) => void;

const ToastContext = createContext<Ctx>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback<Ctx>((text, tone = "default") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[80] flex flex-col items-center gap-2 px-4"
        style={{ top: "calc(var(--safe-t) + 0.75rem)" }}
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast glass-strong glass-pill px-5 py-3 text-sm font-semibold"
            style={{
              color: t.tone === "error" ? "var(--danger)" : t.tone === "success" ? "var(--success)" : "var(--text)",
            }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

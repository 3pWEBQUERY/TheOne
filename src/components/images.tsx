"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from "lucide-react";
import type { ImageRef } from "@/db/schema";
import { useToast } from "./toast";

export const imgSrc = (key: string) => `/api/images/${key}`;

function uploadFile(file: File, onProgress: (p: number) => void) {
  return new Promise<ImageRef>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data as ImageRef);
        else reject(new Error(data.error || "Upload fehlgeschlagen"));
      } catch {
        reject(new Error("Upload fehlgeschlagen"));
      }
    };
    xhr.onerror = () => reject(new Error("Keine Verbindung"));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

type Pending = { id: string; preview: string; progress: number };

/** Lets the user pick/take photos, uploads them to the bucket and returns refs. */
export function ImagePicker({
  value,
  onChange,
  onBusyChange,
  compact,
}: {
  value: ImageRef[];
  onChange: (images: ImageRef[]) => void;
  onBusyChange?: (busy: boolean) => void;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const valueRef = useRef(value);
  valueRef.current = value;
  const toast = useToast();

  useEffect(() => onBusyChange?.(pending.length > 0), [pending.length, onBusyChange]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 10);
    const items = list.map((f) => ({ id: crypto.randomUUID(), preview: URL.createObjectURL(f), progress: 0 }));
    setPending((p) => [...p, ...items]);
    await Promise.all(
      list.map(async (file, i) => {
        const item = items[i];
        try {
          const ref = await uploadFile(file, (progress) =>
            setPending((p) => p.map((x) => (x.id === item.id ? { ...x, progress } : x))),
          );
          valueRef.current = [...valueRef.current, ref];
          onChange(valueRef.current);
        } catch (err) {
          toast((err as Error).message, "error");
        } finally {
          URL.revokeObjectURL(item.preview);
          setPending((p) => p.filter((x) => x.id !== item.id));
        }
      }),
    );
    if (input.current) input.current.value = "";
  };

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((img, i) => (
        <div key={img.key} className="relative h-20 w-20 overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc(img.thumb)} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-md bg-black/60 text-white"
            aria-label="Bild entfernen"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      {pending.map((p) => (
        <div key={p.id} className="relative h-20 w-20 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.preview} alt="" className="h-full w-full object-cover opacity-50" />
          <div className="absolute inset-0 grid place-items-center">
            <Loader2 className="animate-spin text-white drop-shadow" size={22} />
          </div>
          <div className="absolute inset-x-1 bottom-1 h-1 overflow-hidden rounded-full bg-white/40">
            <div className="h-full bg-white transition-all" style={{ width: `${Math.round(p.progress * 100)}%` }} />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={`grid place-items-center rounded-lg border border-dashed transition-colors hover:bg-[var(--surface-hover)] ${
          compact ? "h-11 w-11" : "h-20 w-20"
        }`}
        style={{ borderColor: "var(--border-strong)", background: "var(--surface-solid)" }}
        aria-label="Bild hinzufügen"
      >
        <span className="flex flex-col items-center gap-1 text-[11px] font-medium muted">
          <ImagePlus size={compact ? 18 : 22} />
          {!compact && "Foto"}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  );
}

/** Thumbnail strip that opens a fullscreen lightbox. */
export function ImageStrip({ images, size = 64, max = 4 }: { images: ImageRef[]; size?: number; max?: number }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!images?.length) return null;
  const shown = images.slice(0, max);
  const rest = images.length - shown.length;
  return (
    <>
      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
        {shown.map((img, i) => (
          <button
            key={img.key}
            type="button"
            onClick={() => setOpen(i)}
            className="relative overflow-hidden rounded-md border transition active:scale-95" style={{ width: size, height: size, borderColor: "var(--border)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc(img.thumb)} alt="" loading="lazy" className="h-full w-full object-cover" />
            {i === shown.length - 1 && rest > 0 && (
              <span className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-semibold text-white">
                +{rest}
              </span>
            )}
          </button>
        ))}
      </div>
      {open !== null && <Lightbox images={images} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Large cover image (for journal/notes cards). */
export function ImageCover({ images, className = "" }: { images: ImageRef[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!images?.length) return null;
  const img = images[0];
  return (
    <>
      <button
        type="button"
        className={`relative block w-full overflow-hidden ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(0);
        }}
        style={{ aspectRatio: img.w && img.h ? `${img.w} / ${Math.min(img.h, img.w * 1.25)}` : "4 / 3" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc(img.thumb)} alt="" loading="lazy" className="h-full w-full object-cover" />
        {images.length > 1 && (
          <span className="absolute right-2 bottom-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
            +{images.length - 1}
          </span>
        )}
      </button>
      {open !== null && <Lightbox images={images} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export function Lightbox({ images, index, onClose }: { images: ImageRef[]; index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  const touchX = useRef<number | null>(null);
  const prev = useCallback(() => setI((x) => (x - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setI((x) => (x + 1) % images.length), [images.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const ov = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = ov;
    };
  }, [onClose, prev, next]);

  const img = images[i];
  return createPortal(
    <div
      className="sheet-backdrop fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-xl"
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) (dx > 0 ? prev : next)();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={img.key}
        src={imgSrc(img.key)}
        alt=""
        className="animate-pop max-h-[88dvh] max-w-[94vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        className="absolute rounded-lg border border-white/15 bg-white/10 backdrop-blur-md right-4 grid h-11 w-11 place-items-center text-white"
        style={{ top: "calc(var(--safe-t) + 1rem)" }}
        onClick={onClose}
        aria-label="Schließen"
      >
        <X size={20} />
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="absolute rounded-lg border border-white/15 bg-white/10 backdrop-blur-md left-3 hidden h-12 w-12 place-items-center text-white md:grid"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Vorheriges Bild"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="absolute rounded-lg border border-white/15 bg-white/10 backdrop-blur-md right-3 hidden h-12 w-12 place-items-center text-white md:grid"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Nächstes Bild"
          >
            <ChevronRight />
          </button>
          <div
            className="absolute rounded-lg border border-white/15 bg-white/10 backdrop-blur-md left-1/2 -translate-x-1/2 px-3 py-1.5 text-sm font-semibold text-white"
            style={{ bottom: "calc(var(--safe-b) + 1.25rem)" }}
          >
            {i + 1} / {images.length}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}

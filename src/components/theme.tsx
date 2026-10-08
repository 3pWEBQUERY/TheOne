"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type ThemePref = "system" | "light" | "dark";
const KEY = "theone-theme";
const COLORS = { light: "#f3f4f6", dark: "#0b0c0f" };

/** Runs before first paint (inlined in <head>) so there is no theme flash. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;var c=t==="dark"?"${COLORS.dark}":"${COLORS.light}";document.addEventListener("DOMContentLoaded",function(){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c)})});}}catch(e){}})();`;

function resolved(pref: ThemePref) {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === "system") delete root.dataset.theme;
  else root.dataset.theme = pref;
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {}
  const color = COLORS[resolved(pref)];
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
}

export function useThemePref() {
  const [pref, setPref] = useState<ThemePref>("system");
  useEffect(() => {
    try {
      const t = localStorage.getItem(KEY);
      if (t === "light" || t === "dark") setPref(t);
    } catch {}
  }, []);
  const update = (p: ThemePref) => {
    setPref(p);
    applyTheme(p);
  };
  return [pref, update] as const;
}

/** Segmented control: System / Hell / Dunkel */
export function ThemeSwitch() {
  const [pref, setPref] = useThemePref();
  const options: { v: ThemePref; label: string; icon: typeof Sun }[] = [
    { v: "system", label: "System", icon: Monitor },
    { v: "light", label: "Hell", icon: Sun },
    { v: "dark", label: "Dunkel", icon: Moon },
  ];
  return (
    <div className="segmented" role="group" aria-label="Darstellung">
      {options.map(({ v, label, icon: Icon }) => (
        <button key={v} type="button" aria-pressed={pref === v} onClick={() => setPref(v)}>
          <Icon size={15} /> {label}
        </button>
      ))}
    </div>
  );
}

/** Compact header button that flips between light and dark. */
export function ThemeToggleButton({ className = "icon-btn" }: { className?: string }) {
  const [pref, setPref] = useThemePref();
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    setIsDark(resolved(pref) === "dark");
  }, [pref]);
  return (
    <button
      type="button"
      className={className}
      aria-label={isDark ? "Helles Design" : "Dunkles Design"}
      title={isDark ? "Helles Design" : "Dunkles Design"}
      onClick={() => setPref(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

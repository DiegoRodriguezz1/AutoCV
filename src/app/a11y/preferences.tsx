import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type TextSize = 100 | 125 | 150 | 200;
export type ThemePref = "system" | "light" | "dark";

export interface A11yPrefs {
  textSize: TextSize;
  theme: ThemePref;
  highContrast: boolean;
  readableFont: boolean;
  reduceMotion: boolean;
  hideTimer: boolean;
}

const STORAGE_KEY = "autocv_a11y";

export const DEFAULT_PREFS: A11yPrefs = {
  textSize: 100,
  theme: "system",
  highContrast: false,
  readableFont: false,
  reduceMotion: false,
  hideTimer: false,
};

function load(): A11yPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_PREFS, ...(JSON.parse(stored) as Partial<A11yPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function apply(prefs: A11yPrefs) {
  const root = document.documentElement;
  root.style.setProperty("--font-size", `${prefs.textSize}%`);
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const dark = prefs.theme === "dark" || (prefs.theme === "system" && systemDark);
  root.dataset.theme = dark ? "dark" : "light";
  root.classList.toggle("dark", dark);
  root.dataset.contrast = prefs.highContrast ? "high" : "normal";
  root.dataset.font = prefs.readableFont ? "legible" : "default";
  root.dataset.motion = prefs.reduceMotion ? "reduce" : "auto";
}

interface A11yContextValue {
  prefs: A11yPrefs;
  update: (patch: Partial<A11yPrefs>) => void;
  reset: () => void;
}

const A11yContext = createContext<A11yContextValue>({ prefs: DEFAULT_PREFS, update: () => undefined, reset: () => undefined });

export function A11yProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<A11yPrefs>(load);

  useEffect(() => {
    apply(prefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Sin almacenamiento: las preferencias duran solo esta visita.
    }
  }, [prefs]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const onChange = () => apply(prefs);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [prefs]);

  const value = useMemo<A11yContextValue>(
    () => ({
      prefs,
      update: (patch) => setPrefs((current) => ({ ...current, ...patch })),
      reset: () => setPrefs(DEFAULT_PREFS),
    }),
    [prefs],
  );

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export const useA11y = () => useContext(A11yContext);

/** Preferencias activas, para guardarlas con la sesión del experimento. */
export function prefsSnapshot(prefs: A11yPrefs): Record<string, unknown> {
  const reducedBySystem = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  return { ...prefs, systemReducedMotion: reducedBySystem };
}

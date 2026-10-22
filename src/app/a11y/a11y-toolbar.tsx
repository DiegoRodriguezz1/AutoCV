import { useEffect, useRef, useState } from "react";
import { Accessibility, X } from "lucide-react";

import { TextSize, ThemePref, useA11y } from "./preferences";

const SIZES: TextSize[] = [100, 125, 150, 200];
const THEMES: { value: ThemePref; label: string }[] = [
  { value: "system", label: "Como el sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

function Toggle({ id, label, help, checked, onChange }: { id: string; label: string; help: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={`${id}-help`}
        className="mt-1 h-5 w-5 shrink-0 accent-blue-700"
      />
      <label htmlFor={id} className="text-base">
        <span className="font-semibold text-gray-900">{label}</span>
        <span id={`${id}-help`} className="block text-sm text-gray-700">{help}</span>
      </label>
    </div>
  );
}

/**
 * Botón "Accesibilidad" con las preferencias de lectura, contraste y movimiento.
 * Flotante en las páginas; `inline` va dentro de un modal, porque un modal deja inerte lo de fuera.
 */
export function A11yToolbar({ inline = false }: { inline?: boolean }) {
  const { prefs, update, reset } = useA11y();
  // Flotante es su propio landmark; dentro del modal no puede anidarse en otro.
  const Wrapper = inline ? "div" : "aside";
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <Wrapper aria-label={inline ? undefined : "Accesibilidad"} className={inline ? "relative" : "a11y-fixed fixed bottom-4 left-4 z-[60]"}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="a11y-panel"
        onClick={() => setOpen((value) => !value)}
        className={
          inline
            ? "inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-500 bg-white px-3 font-semibold text-gray-900 hover:bg-gray-100"
            : "inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-white bg-blue-800 px-4 py-2 font-semibold text-white shadow-lg hover:bg-blue-900"
        }
      >
        <Accessibility className="h-5 w-5" aria-hidden="true" />
        Accesibilidad
      </button>

      {open && (
        <div
          id="a11y-panel"
          ref={panelRef}
          role="region"
          aria-label="Preferencias de accesibilidad"
          className={`${inline ? "right-0 top-full mt-2 z-50" : "bottom-16 left-0"} absolute max-h-[80vh] w-[min(92vw,24rem)] space-y-5 overflow-auto rounded-lg border-2 border-gray-800 bg-white p-5 text-gray-900 shadow-2xl`}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Accesibilidad</h2>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-gray-500"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Cerrar preferencias de accesibilidad</span>
            </button>
          </div>

          <fieldset>
            <legend className="mb-2 font-semibold">Tamaño del texto</legend>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((size) => (
                <label key={size} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-gray-500 px-3">
                  <input
                    type="radio"
                    name="a11y-size"
                    checked={prefs.textSize === size}
                    onChange={() => update({ textSize: size })}
                    className="h-4 w-4 accent-blue-700"
                  />
                  {size} %
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 font-semibold">Tema de color</legend>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((theme) => (
                <label key={theme.value} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-gray-500 px-3">
                  <input
                    type="radio"
                    name="a11y-theme"
                    checked={prefs.theme === theme.value}
                    onChange={() => update({ theme: theme.value })}
                    className="h-4 w-4 accent-blue-700"
                  />
                  {theme.label}
                </label>
              ))}
            </div>
          </fieldset>

          <Toggle id="a11y-contrast" label="Alto contraste" help="Texto y bordes más oscuros, con contraste de 7 a 1." checked={prefs.highContrast} onChange={(value) => update({ highContrast: value })} />
          <Toggle id="a11y-font" label="Fuente de lectura fácil" help="Atkinson Hyperlegible, con más espacio entre letras y líneas. Ayuda con dislexia y baja visión." checked={prefs.readableFont} onChange={(value) => update({ readableFont: value })} />
          <Toggle id="a11y-motion" label="Reducir movimiento" help="Quita animaciones y transiciones." checked={prefs.reduceMotion} onChange={(value) => update({ reduceMotion: value })} />
          <Toggle id="a11y-timer" label="Ocultar cronómetro" help="El tiempo se sigue midiendo, pero no se muestra en pantalla." checked={prefs.hideTimer} onChange={(value) => update({ hideTimer: value })} />

          <button type="button" onClick={reset} className="min-h-11 rounded-md border border-gray-500 px-4 font-semibold">
            Restablecer
          </button>
        </div>
      )}
    </Wrapper>
  );
}

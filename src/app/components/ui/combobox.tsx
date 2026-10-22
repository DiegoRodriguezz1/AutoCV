import { FocusEvent, KeyboardEvent, ReactNode, useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "./utils";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  uri?: string;
  badge?: string;
}

interface ComboboxProps {
  id: string;
  value: string;
  onValueChange: (text: string) => void;
  /** Busca opciones; recibe una señal para cancelar la petición anterior. */
  fetchOptions: (query: string, signal: AbortSignal) => Promise<ComboboxOption[]>;
  onSelect: (option: ComboboxOption) => void;
  /** Enter sin opción activa (por ejemplo, agregar una habilidad escrita a mano). */
  onEnterFreeText?: (text: string) => void;
  minChars?: number;
  debounceMs?: number;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
  inputProps?: Record<string, unknown>;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  emptyMessage?: string;
  footer?: ReactNode;
}

/**
 * Combobox con lista según el patrón WAI-ARIA 1.2: el foco se queda en el input,
 * la opción activa se indica con aria-activedescendant y los cambios se anuncian.
 * Siempre se acepta texto libre, para que nadie quede bloqueado si no encuentra su opción.
 */
export function Combobox({
  id,
  value,
  onValueChange,
  fetchOptions,
  onSelect,
  onEnterFreeText,
  minChars = 2,
  debounceMs = 250,
  placeholder,
  autoComplete = "off",
  className,
  inputProps,
  onFocus,
  onBlur,
  emptyMessage = "Sin resultados. Puedes dejar lo que escribiste.",
  footer,
}: ComboboxProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fetchRef = useRef(fetchOptions);
  fetchRef.current = fetchOptions;

  useEffect(() => {
    if (query === null) return;
    if (query.trim().length < minChars) {
      abortRef.current?.abort();
      setOptions([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setAnnouncement("Buscando…");
      fetchRef.current(query, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setOptions(result);
          setActive(-1);
          setOpen(true);
          setAnnouncement(
            result.length
              ? `${result.length} ${result.length === 1 ? "sugerencia" : "sugerencias"}. Usa las flechas para recorrerlas y Enter para elegir.`
              : emptyMessage,
          );
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setOptions([]);
          setOpen(false);
          setAnnouncement("No se pudieron cargar sugerencias. Puedes escribir el valor.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [query, minChars, debounceMs, emptyMessage]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const choose = (option: ComboboxOption) => {
    onSelect(option);
    setOpen(false);
    setOptions([]);
    setActive(-1);
    setQuery(null);
    setAnnouncement(`${option.label} seleccionado.`);
  };

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const count = options.length;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open && count) setOpen(true);
        setActive((index) => (count ? (index + 1) % count : -1));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open && count) setOpen(true);
        setActive((index) => (count ? (index <= 0 ? count - 1 : index - 1) : -1));
        break;
      case "Home":
        if (open && count) {
          event.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open && count) {
          event.preventDefault();
          setActive(count - 1);
        }
        break;
      case "Enter":
        if (open && active >= 0 && options[active]) {
          event.preventDefault();
          choose(options[active]);
        } else if (onEnterFreeText && value.trim()) {
          event.preventDefault();
          onEnterFreeText(value.trim());
          close();
          setQuery(null);
        }
        break;
      case "Escape":
        // Cierra la lista y cancela la búsqueda en curso, para que no aparezca después.
        if (open || loading) event.preventDefault();
        abortRef.current?.abort();
        setLoading(false);
        setQuery(null);
        close();
        break;
      case "Tab":
        close();
        break;
    }
  };

  const activeId = open && active >= 0 ? `${id}-opt-${active}` : undefined;

  return (
    <div className={cn("relative", className)}>
      <input
        {...inputProps}
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeId}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onValueChange(event.target.value);
          setQuery(event.target.value);
        }}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={(event) => {
          // Deja que el clic en una opción llegue antes de cerrar.
          window.setTimeout(close, 150);
          onBlur?.(event);
        }}
        className={cn(
          "w-full min-h-11 rounded-md border border-gray-500 bg-white px-3 py-2 pr-9 text-base text-gray-900 placeholder:text-gray-500",
          (inputProps?.["aria-invalid"] as boolean | undefined) && "border-red-700 bg-red-50",
        )}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-gray-600" aria-hidden="true" />
      )}
      <ul
        id={listId}
        role="listbox"
        aria-label="Sugerencias"
        hidden={!open || options.length === 0}
        className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-auto rounded-md border border-gray-500 bg-white py-1 shadow-lg"
      >
        {options.map((option, index) => (
          <li
            key={`${option.value}-${index}`}
            id={`${id}-opt-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(option)}
            onMouseEnter={() => setActive(index)}
            className={cn(
              "flex min-h-11 cursor-pointer flex-col justify-center px-3 py-2 text-base text-gray-900",
              index === active && "bg-blue-100 outline outline-2 -outline-offset-2 outline-blue-700",
            )}
          >
            <span className="flex flex-wrap items-center gap-2">
              <span>{option.label}</span>
              {option.badge && (
                <span className="rounded border border-emerald-700 px-1.5 text-xs font-semibold text-emerald-800">
                  {option.badge}
                </span>
              )}
            </span>
            {option.description && <span className="text-sm text-gray-700">{option.description}</span>}
          </li>
        ))}
      </ul>
      {footer}
      <p className="sr-only" aria-live="polite" role="status">
        {announcement}
      </p>
    </div>
  );
}

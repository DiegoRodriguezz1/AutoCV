import { ReactNode, useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";

import { FieldShell, inputClass, useEditTracking } from "./field";

interface DateRangeProps {
  idPrefix: string;
  track: string;
  start: string;
  end: string;
  current: boolean;
  currentLabel: string;
  onChange: (patch: { start?: string; end?: string; current?: boolean }) => void;
  error?: string;
}

function MonthInput({ id, label, value, onChange, track, disabled, error }: { id: string; label: string; value: string; onChange: (value: string) => void; track: string; disabled?: boolean; error?: string }) {
  const tracking = useEditTracking(track, value);
  return (
    <FieldShell id={id} label={label} help="Mes y año (AAAA-MM)." error={error}>
      {(aria) => (
        <input
          {...aria}
          {...tracking}
          type="month"
          value={value}
          disabled={disabled}
          pattern="\d{4}-\d{2}"
          placeholder="2024-02"
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClass(Boolean(error))} disabled:bg-gray-100 disabled:text-gray-600`}
        />
      )}
    </FieldShell>
  );
}

export function DateRange({ idPrefix, track, start, end, current, currentLabel, onChange, error }: DateRangeProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <MonthInput id={`${idPrefix}-start`} label="Inicio" value={start} onChange={(value) => onChange({ start: value })} track={`${track}.start`} />
      <MonthInput id={`${idPrefix}-end`} label="Fin" value={current ? "" : end} disabled={current} onChange={(value) => onChange({ end: value })} track={`${track}.end`} error={error} />
      <label className="inline-flex min-h-11 items-center gap-2 text-base text-gray-900">
        <input type="checkbox" checked={current} onChange={(event) => onChange({ current: event.target.checked })} className="h-5 w-5 accent-blue-700" />
        {currentLabel}
      </label>
    </div>
  );
}

interface EntryCardProps {
  title: string;
  onRemove: () => void;
  children: ReactNode;
}

export function EntryCard({ title, onRemove, children }: EntryCardProps) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-gray-400 bg-white p-4">
      <legend className="px-1 text-base font-bold text-gray-900">{title}</legend>
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-red-700 px-3 text-base font-semibold text-red-800 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Quitar {title.toLowerCase()}
      </button>
    </fieldset>
  );
}

/**
 * Gestiona el foco al añadir o quitar entradas: al añadir va al primer campo nuevo,
 * al quitar vuelve al botón "Añadir".
 */
export function useEntryFocus(keys: string[], firstFieldId: (key: string) => string) {
  const addRef = useRef<HTMLButtonElement>(null);
  const previous = useRef(keys);
  const pending = useRef<"added" | "removed" | null>(null);

  useEffect(() => {
    if (pending.current === "added") {
      const added = keys.find((key) => !previous.current.includes(key));
      if (added) document.getElementById(firstFieldId(added))?.focus();
    } else if (pending.current === "removed") {
      addRef.current?.focus();
    }
    pending.current = null;
    previous.current = keys;
  }, [keys, firstFieldId]);

  return {
    addRef,
    markAdded: () => {
      pending.current = "added";
    },
    markRemoved: () => {
      pending.current = "removed";
    },
  };
}

export function AddButton({ buttonRef, onClick, label }: { buttonRef: React.RefObject<HTMLButtonElement | null>; onClick: () => void; label: string }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-blue-700 px-4 text-base font-semibold text-white hover:bg-blue-800"
    >
      <Plus className="h-5 w-5" aria-hidden="true" />
      {label}
    </button>
  );
}

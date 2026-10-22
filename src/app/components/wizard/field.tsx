import { createContext, ReactNode, useContext, useRef } from "react";
import { AlertCircle } from "lucide-react";

/** Registra field_edit al confirmar un campo (blur con valor distinto), nunca por tecla. */
const TrackingContext = createContext<(field: string) => void>(() => undefined);

export const TrackingProvider = TrackingContext.Provider;

type FocusTarget = { currentTarget: { value?: string } };

export function useEditTracking(field: string, value: string) {
  const commit = useContext(TrackingContext);
  const valueOnFocus = useRef<string | null>(null);
  return {
    onFocus: (event?: FocusTarget) => {
      valueOnFocus.current = event?.currentTarget.value ?? value;
    },
    onBlur: (event?: FocusTarget) => {
      // Se compara con el valor real del campo: el de la prop puede ser del render anterior.
      const current = event?.currentTarget.value ?? value;
      if (valueOnFocus.current !== null && valueOnFocus.current !== current) commit(field);
      valueOnFocus.current = null;
    },
  };
}

export const inputClass = (hasError: boolean) =>
  `w-full min-h-11 rounded-md border px-3 py-2 text-base bg-white text-gray-900 placeholder:text-gray-500 ${
    hasError ? "border-red-700 bg-red-50" : "border-gray-500"
  }`;

interface FieldShellProps {
  id: string;
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  counter?: ReactNode;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean; "aria-required"?: boolean }) => ReactNode;
}

export function FieldShell({ id, label, required, help, error, counter, children }: FieldShellProps) {
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-base font-semibold text-gray-900">
        {label}
        {required ? <span className="ml-1 font-normal text-gray-700">(obligatorio)</span> : null}
      </label>
      {help && (
        <p id={`${id}-help`} className="text-sm text-gray-700">
          {help}
        </p>
      )}
      {children({
        id,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-required": required || undefined,
      })}
      {counter}
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1 text-sm font-semibold text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  track: string;
  required?: boolean;
  help?: string;
  error?: string;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  autoComplete?: string;
}

export function TextField({ id, label, value, onChange, track, required, help, error, placeholder, type = "text", inputMode, autoComplete }: TextFieldProps) {
  const tracking = useEditTracking(track, value);
  return (
    <FieldShell id={id} label={label} required={required} help={help} error={error}>
      {(aria) => (
        <input
          {...aria}
          {...tracking}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass(Boolean(error))}
        />
      )}
    </FieldShell>
  );
}

import { Combobox, ComboboxOption } from "../ui/combobox";
import { FieldShell, useEditTracking } from "./field";

interface ComboFieldProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (text: string) => void;
  onSelect: (option: ComboboxOption) => void;
  fetchOptions: (query: string, signal: AbortSignal) => Promise<ComboboxOption[]>;
  track: string;
  required?: boolean;
  help?: string;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  minChars?: number;
}

export function ComboField({ id, label, value, onValueChange, onSelect, fetchOptions, track, required, help, error, placeholder, autoComplete, minChars }: ComboFieldProps) {
  const tracking = useEditTracking(track, value);
  return (
    <FieldShell id={id} label={label} required={required} help={help} error={error}>
      {({ id: inputId, ...aria }) => (
        <Combobox
          id={inputId}
          value={value}
          onValueChange={onValueChange}
          onSelect={onSelect}
          fetchOptions={fetchOptions}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minChars={minChars}
          inputProps={aria}
          onFocus={tracking.onFocus}
          onBlur={tracking.onBlur}
        />
      )}
    </FieldShell>
  );
}

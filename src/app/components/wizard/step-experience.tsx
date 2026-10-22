import { useCallback, useMemo } from "react";
import { Lightbulb } from "lucide-react";

import { ComboField } from "./combo-field";
import { AddButton, DateRange, EntryCard, useEntryFocus } from "./entry-parts";
import { occupationFetcher } from "./esco-options";
import { FieldShell, TextField, inputClass, useEditTracking } from "./field";
import { ExperienceEntry, emptyExperience } from "./model";
import { DictationButton } from "./speech";
import type { StepProps } from "./step-props";

function DescriptionField({ id, value, onChange, track }: { id: string; value: string; onChange: (value: string) => void; track: string }) {
  const tracking = useEditTracking(track, value);
  return (
    <>
      <FieldShell id={id} label="Logros y funciones" help="Una idea por línea. Ej.: Reduje en 30 % el tiempo de respuesta del sistema.">
        {(aria) => (
          <textarea
            {...aria}
            {...tracking}
            rows={4}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={inputClass(false)}
          />
        )}
      </FieldShell>
      <DictationButton label="logros" onText={(text) => onChange(value ? `${value}\n${text}` : text)} />
    </>
  );
}

export function StepExperience({ data, update, errors, group, announce, onEscoDegraded }: StepProps) {
  const keys = useMemo(() => data.experience.map((item) => item.key), [data.experience]);
  const firstField = useCallback((key: string) => `f-exp-${key}-position`, []);
  const focus = useEntryFocus(keys, firstField);
  const fetchOccupations = useMemo(() => occupationFetcher(onEscoDegraded), [onEscoDegraded]);

  const patch = (key: string, change: Partial<ExperienceEntry>) =>
    update((current) => ({ experience: current.experience.map((item) => (item.key === key ? { ...item, ...change } : item)) }));

  const add = () => {
    focus.markAdded();
    update((current) => ({ experience: [...current.experience, emptyExperience()] }));
    announce(`Experiencia ${data.experience.length + 1} añadida.`);
  };

  const remove = (key: string, index: number) => {
    focus.markRemoved();
    update((current) => ({ experience: current.experience.filter((item) => item.key !== key) }));
    announce(`Experiencia ${index + 1} eliminada.`);
  };

  return (
    <div className="space-y-5">
      {data.experience.length === 0 && (
        <p className="rounded-md border border-gray-400 bg-gray-50 p-4 text-base text-gray-800">
          Añade empleos, prácticas, proyectos o voluntariados. Si todavía no tienes experiencia, puedes continuar.
        </p>
      )}

      {group === "B" && (
        <p className="flex gap-2 rounded-md border border-emerald-700 bg-emerald-50 p-3 text-base text-gray-900">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" aria-hidden="true" />
          <span>
            <strong>Consejo ATS:</strong> empieza cada logro con un verbo de acción (desarrollé, lideré, reduje) y añade
            cifras cuando puedas. Elige el cargo de la lista ESCO para recibir habilidades recomendadas.
          </span>
        </p>
      )}

      {data.experience.map((item, index) => {
        const base = `f-exp-${item.key}`;
        const track = `experience[${index}]`;
        return (
          <EntryCard key={item.key} title={`Experiencia ${index + 1}`} onRemove={() => remove(item.key, index)}>
            <div className="grid gap-4 md:grid-cols-2">
              {group === "B" ? (
                <ComboField
                  id={`${base}-position`}
                  label="Cargo"
                  required
                  value={item.position}
                  onValueChange={(position) => patch(item.key, { position, positionUri: undefined })}
                  onSelect={(option) => patch(item.key, { position: option.value, positionUri: option.uri })}
                  fetchOptions={fetchOccupations}
                  track={`${track}.position`}
                  autoComplete="organization-title"
                  placeholder="Ej.: Desarrollador web"
                  help="Sugerencias de ocupaciones ESCO."
                  error={errors[`${base}-position`]}
                />
              ) : (
                <TextField
                  id={`${base}-position`}
                  label="Cargo"
                  required
                  value={item.position}
                  onChange={(position) => patch(item.key, { position })}
                  track={`${track}.position`}
                  autoComplete="organization-title"
                  placeholder="Ej.: Desarrollador web"
                  error={errors[`${base}-position`]}
                />
              )}
              <TextField
                id={`${base}-company`}
                label="Empresa u organización"
                required
                value={item.company}
                onChange={(company) => patch(item.key, { company })}
                track={`${track}.company`}
                autoComplete="organization"
                placeholder="Ej.: Acme S.A.S."
                error={errors[`${base}-company`]}
              />
            </div>
            <DateRange
              idPrefix={base}
              track={track}
              start={item.start}
              end={item.end}
              current={item.current}
              currentLabel="Trabajo aquí actualmente"
              onChange={(change) => patch(item.key, change)}
              error={errors[`${base}-end`]}
            />
            <DescriptionField id={`${base}-description`} value={item.description} onChange={(description) => patch(item.key, { description })} track={`${track}.description`} />
          </EntryCard>
        );
      })}

      <AddButton buttonRef={focus.addRef} onClick={add} label={data.experience.length ? "Añadir otra experiencia" : "Añadir experiencia"} />
    </div>
  );
}

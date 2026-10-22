import { useCallback, useMemo } from "react";

import { ComboField } from "./combo-field";
import { AddButton, DateRange, EntryCard, useEntryFocus } from "./entry-parts";
import { institutionFetcher, occupationFetcher } from "./esco-options";
import { TextField } from "./field";
import { EducationEntry, emptyEducation } from "./model";
import type { StepProps } from "./step-props";

export function StepEducation({ data, update, errors, group, announce, onEscoDegraded }: StepProps) {
  const keys = useMemo(() => data.education.map((item) => item.key), [data.education]);
  const firstField = useCallback((key: string) => `f-edu-${key}-degree`, []);
  const focus = useEntryFocus(keys, firstField);
  const fetchOccupations = useMemo(() => occupationFetcher(onEscoDegraded), [onEscoDegraded]);

  const patch = (key: string, change: Partial<EducationEntry>) =>
    update((current) => ({ education: current.education.map((item) => (item.key === key ? { ...item, ...change } : item)) }));

  const add = () => {
    focus.markAdded();
    update((current) => ({ education: [...current.education, emptyEducation()] }));
    announce(`Formación ${data.education.length + 1} añadida.`);
  };

  const remove = (key: string, index: number) => {
    focus.markRemoved();
    update((current) => ({ education: current.education.filter((item) => item.key !== key) }));
    announce(`Formación ${index + 1} eliminada.`);
  };

  return (
    <div className="space-y-5">
      {data.education.length === 0 && (
        <p className="rounded-md border border-gray-400 bg-gray-50 p-4 text-base text-gray-800">
          Añade tus estudios: técnicos, tecnológicos, universitarios o cursos importantes. Si no tienes, puedes continuar.
        </p>
      )}

      {data.education.map((item, index) => {
        const base = `f-edu-${item.key}`;
        const track = `education[${index}]`;
        return (
          <EntryCard key={item.key} title={`Formación ${index + 1}`} onRemove={() => remove(item.key, index)}>
            <div className="grid gap-4 md:grid-cols-2">
              {group === "B" ? (
                <ComboField
                  id={`${base}-degree`}
                  label="Título obtenido"
                  required
                  value={item.degree}
                  onValueChange={(degree) => patch(item.key, { degree, degreeUri: undefined })}
                  onSelect={(option) => patch(item.key, { degree: option.value, degreeUri: option.uri })}
                  fetchOptions={fetchOccupations}
                  track={`${track}.degree`}
                  placeholder="Ej.: Tecnólogo en desarrollo de software"
                  help="Sugerencias de ocupaciones ESCO. También puedes escribir el título exacto."
                  error={errors[`${base}-degree`]}
                />
              ) : (
                <TextField
                  id={`${base}-degree`}
                  label="Título obtenido"
                  required
                  value={item.degree}
                  onChange={(degree) => patch(item.key, { degree })}
                  track={`${track}.degree`}
                  placeholder="Ej.: Tecnólogo en desarrollo de software"
                  error={errors[`${base}-degree`]}
                />
              )}
              <ComboField
                id={`${base}-institution`}
                label="Institución"
                required
                value={item.institution}
                onValueChange={(institution) => patch(item.key, { institution })}
                onSelect={(option) => patch(item.key, { institution: option.value })}
                fetchOptions={institutionFetcher}
                track={`${track}.institution`}
                autoComplete="organization"
                placeholder="Ej.: Escuela Tecnológica Instituto Técnico Central"
                error={errors[`${base}-institution`]}
              />
            </div>
            <DateRange
              idPrefix={base}
              track={track}
              start={item.start}
              end={item.end}
              current={item.current}
              currentLabel="En curso"
              onChange={(change) => patch(item.key, change)}
              error={errors[`${base}-end`]}
            />
          </EntryCard>
        );
      })}

      <AddButton buttonRef={focus.addRef} onClick={add} label={data.education.length ? "Añadir otra formación" : "Añadir formación"} />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Plus, X } from "lucide-react";
import { toast } from "sonner";

import type { EscoItem, SkillSource } from "../../dto/experiment";
import { fold } from "../../services/countries";
import { addSkill, getOccupationSkills, removeSkill, suggestEscoSkills } from "../../services/experiment-api";
import { Combobox } from "../ui/combobox";
import { skillFetcher } from "./esco-options";
import { inputClass } from "./field";
import { SkillEntry, newKey } from "./model";
import type { StepProps } from "./step-props";

interface Candidate {
  label: string;
  escoUri?: string;
  preferredLabel?: string;
  source: SkillSource;
}

// "Python (programación informática)" debe coincidir con "python".
const withoutQualifier = (label: string) => fold(label.replace(/\s*\([^)]*\)\s*$/, ""));

/** Busca en ESCO una etiqueta que coincida (sin tildes, mayúsculas ni aclaración entre paréntesis) con lo escrito. */
async function exactEscoMatch(text: string): Promise<EscoItem | null> {
  try {
    const { items } = await suggestEscoSkills(text);
    const wanted = fold(text);
    const matches = (label: string) => fold(label) === wanted || withoutQualifier(label) === wanted;
    return items.find((item) => matches(item.title) || item.alternative_labels.some(matches)) ?? null;
  } catch {
    return null;
  }
}

export function StepSkills({ data, update, group, sessionId, announce, onEscoDegraded }: StepProps) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(0);
  const [recommended, setRecommended] = useState<EscoItem[]>([]);
  const fetchSkills = useMemo(() => skillFetcher(onEscoDegraded), [onEscoDegraded]);

  const occupation = useMemo(() => {
    const fromExperience = data.experience.find((item) => item.positionUri);
    if (fromExperience) return { uri: fromExperience.positionUri!, label: fromExperience.position };
    const fromEducation = data.education.find((item) => item.degreeUri);
    return fromEducation ? { uri: fromEducation.degreeUri!, label: fromEducation.degree } : null;
  }, [data.experience, data.education]);

  const occupationUri = occupation?.uri;
  useEffect(() => {
    if (group !== "B" || !occupationUri) {
      setRecommended([]);
      return;
    }
    const controller = new AbortController();
    getOccupationSkills(occupationUri, controller.signal)
      .then((result) => setRecommended(result.essential_skills.slice(0, 12)))
      .catch(() => {
        if (!controller.signal.aborted) setRecommended([]);
      });
    return () => controller.abort();
  }, [group, occupationUri]);

  const has = (label: string) => data.skills.some((skill) => fold(skill.label) === fold(label));

  const save = async (candidate: Candidate) => {
    const label = candidate.label.trim();
    if (!label) return;
    if (has(label)) {
      announce(`${label} ya está en tu lista.`);
      return;
    }
    const entry: SkillEntry = {
      key: newKey(),
      id: null,
      label,
      escoUri: group === "B" ? candidate.escoUri ?? null : null,
      preferredLabel: group === "B" ? candidate.preferredLabel ?? null : null,
      source: candidate.source,
    };
    update((current) => ({ skills: [...current.skills, entry] }));
    try {
      const saved = await addSkill(sessionId, {
        input_label: label,
        esco_uri: entry.escoUri ?? undefined,
        preferred_label: entry.preferredLabel ?? undefined,
        source: entry.source,
      });
      update((current) => ({ skills: current.skills.map((skill) => (skill.key === entry.key ? { ...skill, id: saved.id } : skill)) }));
    } catch (error) {
      toast.warning(`No se pudo guardar "${label}" en el servidor. Queda en tu CV, pero no cuenta para las métricas.`, {
        description: error instanceof Error ? error.message : undefined,
      });
    }
    const total = data.skills.length + 1;
    announce(
      entry.escoUri
        ? `${label} añadida. Normalizada en ESCO como ${entry.preferredLabel}. ${total} habilidades.`
        : `${label} añadida. ${total} habilidades.`,
    );
  };

  const addFreeText = async (value: string) => {
    const label = value.trim();
    if (!label) return;
    // Se limpia ya, para que la persona pueda escribir la siguiente mientras se consulta ESCO.
    setText("");
    if (group !== "B") {
      await save({ label, source: "manual" });
      return;
    }
    // Grupo B: el sistema intenta asociar lo escrito con su etiqueta ESCO.
    setPending((count) => count + 1);
    const match = await exactEscoMatch(label);
    setPending((count) => count - 1);
    await save(match ? { label, escoUri: match.uri, preferredLabel: match.title, source: "manual" } : { label, source: "manual" });
  };

  const remove = async (skill: SkillEntry) => {
    update((current) => ({ skills: current.skills.filter((item) => item.key !== skill.key) }));
    announce(`${skill.label} quitada. ${data.skills.length - 1} habilidades.`);
    document.getElementById("f-skill")?.focus();
    if (skill.id !== null) {
      try {
        await removeSkill(sessionId, skill.id);
      } catch {
        // Si el servidor no responde, la habilidad igual sale del CV.
      }
    }
  };

  const normalized = data.skills.filter((skill) => skill.escoUri).length;
  const coverage = data.skills.length ? Math.round((normalized / data.skills.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="f-skill" className="block text-base font-semibold text-gray-900">
          Escribe una habilidad
        </label>
        <p id="f-skill-help" className="text-sm text-gray-700">
          {group === "B"
            ? "Verás sugerencias de la clasificación europea ESCO. Pulsa Enter o \"Agregar\" para añadirla."
            : "Pulsa Enter o \"Agregar\" para añadirla. Ej.: Python, trabajo en equipo, Excel."}
        </p>
        <div className="flex flex-wrap items-start gap-2">
          {group === "B" ? (
            <Combobox
              id="f-skill"
              className="min-w-[14rem] flex-1"
              value={text}
              onValueChange={setText}
              fetchOptions={fetchSkills}
              onSelect={(option) => void save({ label: option.value, escoUri: option.uri, preferredLabel: option.label, source: "esco_suggestion" })}
              onEnterFreeText={(value) => void addFreeText(value)}
              placeholder="Ej.: Python, liderazgo, Excel"
              inputProps={{ "aria-describedby": "f-skill-help" }}
            />
          ) : (
            <input
              id="f-skill"
              type="text"
              value={text}
              aria-describedby="f-skill-help"
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addFreeText(text);
                }
              }}
              placeholder="Ej.: Python, liderazgo, Excel"
              className={`${inputClass(false)} min-w-[14rem] flex-1`}
            />
          )}
          <button
            type="button"
            onClick={() => void addFreeText(text)}
            disabled={!text.trim()}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-blue-700 px-4 text-base font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Agregar
          </button>
        </div>
      </div>

      <section aria-labelledby="skills-list-title" className="space-y-2">
        {pending > 0 && (
          <p className="text-sm text-gray-800" aria-hidden="true">
            Buscando el nombre ESCO…
          </p>
        )}
        <h3 id="skills-list-title" className="text-base font-bold text-gray-900">
          Tus habilidades ({data.skills.length})
          {group === "B" && data.skills.length > 0 && (
            <span className="ml-2 font-normal text-gray-800">· {coverage} % normalizadas en ESCO</span>
          )}
        </h3>
        {data.skills.length === 0 ? (
          <p className="text-base text-gray-800">Todavía no has añadido habilidades. Se recomiendan al menos 5.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {data.skills.map((skill) => (
              <li
                key={skill.key}
                className={`inline-flex items-center gap-2 rounded-md border py-1 pl-3 pr-1 text-base ${
                  skill.escoUri ? "border-emerald-700 bg-emerald-50" : "border-gray-500 bg-white"
                }`}
              >
                {skill.escoUri && <BadgeCheck className="h-4 w-4 text-emerald-800" aria-hidden="true" />}
                <span className="text-gray-900">
                  {skill.label}
                  {skill.escoUri && (
                    <span className="block text-xs text-gray-800">ESCO: {skill.preferredLabel}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => void remove(skill)}
                  className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md hover:bg-gray-200"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Quitar {skill.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {group === "B" && recommended.length > 0 && occupation && (
        <section aria-labelledby="recommended-title" className="space-y-2 rounded-lg border border-emerald-700 bg-emerald-50 p-4">
          <h3 id="recommended-title" className="text-base font-bold text-gray-900">
            Habilidades recomendadas para «{occupation.label}»
          </h3>
          <p className="text-sm text-gray-800">Habilidades esenciales de este cargo en ESCO. Añade las que tengas.</p>
          <ul className="flex flex-wrap gap-2">
            {recommended
              .filter((item) => !has(item.title))
              .map((item) => (
                <li key={item.uri}>
                  <button
                    type="button"
                    onClick={() => void save({ label: item.title, escoUri: item.uri, preferredLabel: item.title, source: "occupation" })}
                    className="inline-flex min-h-11 items-center gap-1 rounded-md border border-emerald-700 bg-white px-3 text-left text-base text-gray-900 hover:bg-emerald-100"
                  >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="sr-only">Añadir </span>
                    {item.title}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

import { Lightbulb } from "lucide-react";

import { dialCodes } from "../../services/countries";
import { ComboField } from "./combo-field";
import { cityFetcher, countryFetcher } from "./esco-options";
import { FieldShell, TextField, inputClass, useEditTracking } from "./field";
import { countWords } from "./model";
import { DictationButton } from "./speech";
import type { StepProps } from "./step-props";

export function StepPersonal({ data, update, errors, group }: StepProps) {
  const words = countWords(data.summary);
  const summaryTracking = useEditTracking("personal.summary", data.summary);
  const dialTracking = useEditTracking("personal.phoneDial", data.phoneDial);
  const wordsOk = words >= 40 && words <= 120;

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          id="f-name"
          label="Nombre completo"
          required
          value={data.name}
          onChange={(name) => update({ name })}
          track="personal.name"
          placeholder="Ej.: Ana María Pérez Gómez"
          autoComplete="name"
          error={errors["f-name"]}
        />
        <TextField
          id="f-email"
          label="Correo electrónico"
          type="email"
          inputMode="email"
          value={data.email}
          onChange={(email) => update({ email })}
          track="personal.email"
          placeholder="Ej.: ana.perez@correo.com"
          autoComplete="email"
          help="Opcional, pero los reclutadores lo usan para contactarte."
          error={errors["f-email"]}
        />

        <FieldShell id="f-phone" label="Teléfono" help="Elige el indicativo y escribe solo números." error={errors["f-phone"]}>
          {(aria) => (
            <div className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(9rem,1fr)]">
              <select
                aria-label="Indicativo del país"
                value={data.phoneDial}
                onChange={(event) => update({ phoneDial: event.target.value })}
                {...dialTracking}
                className="min-h-11 w-full rounded-md border border-gray-500 bg-white px-2 text-base text-gray-900"
              >
                {dialCodes().map((item) => (
                  <option key={item.code} value={item.dial}>
                    {item.label}
                  </option>
                ))}
              </select>
              <PhoneInput aria={aria} value={data.phone} onChange={(phone) => update({ phone })} hasError={Boolean(errors["f-phone"])} />
            </div>
          )}
        </FieldShell>

        <ComboField
          id="f-country"
          label="País"
          value={data.country}
          onValueChange={(country) => update({ country, countryCode: "" })}
          onSelect={(option) => update({ country: option.value, countryCode: option.uri ?? "", city: option.uri === data.countryCode ? data.city : "" })}
          fetchOptions={countryFetcher}
          minChars={1}
          track="personal.country"
          autoComplete="country-name"
          placeholder="Ej.: Colombia"
        />

        <ComboField
          id="f-city"
          label="Ciudad"
          value={data.city}
          onValueChange={(city) => update({ city })}
          onSelect={(option) => update({ city: option.value })}
          fetchOptions={cityFetcher(data.countryCode)}
          track="personal.city"
          autoComplete="address-level2"
          placeholder="Ej.: Bogotá D.C."
          help={data.countryCode === "CO" ? "Escribe al menos 2 letras para ver sugerencias." : undefined}
        />
      </div>

      <FieldShell
        id="f-summary"
        label="Perfil profesional"
        help="Cuenta en 40 a 120 palabras quién eres, qué sabes hacer y qué buscas."
        counter={
          <p className={`text-sm font-semibold ${wordsOk ? "text-emerald-800" : "text-gray-800"}`} aria-live="polite">
            {words} {words === 1 ? "palabra" : "palabras"} · recomendado: 40 a 120 {wordsOk ? "(cumple)" : ""}
          </p>
        }
      >
        {(aria) => (
          <textarea
            {...aria}
            {...summaryTracking}
            value={data.summary}
            onChange={(event) => update({ summary: event.target.value })}
            rows={5}
            placeholder="Ej.: Tecnóloga en desarrollo de software con experiencia en aplicaciones web…"
            className={inputClass(false)}
          />
        )}
      </FieldShell>
      <DictationButton label="perfil" onText={(text) => update({ summary: `${data.summary} ${text}`.trim() })} />

      {group === "B" && (
        <p className="flex gap-2 rounded-md border border-emerald-700 bg-emerald-50 p-3 text-base text-gray-900">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" aria-hidden="true" />
          <span>
            <strong>Consejo ATS:</strong> los filtros automáticos leen mejor un perfil de 40 a 120 palabras que mencione tu
            cargo y tus habilidades principales.
          </span>
        </p>
      )}
    </div>
  );
}

function PhoneInput({ aria, value, onChange, hasError }: { aria: Record<string, unknown>; value: string; onChange: (value: string) => void; hasError: boolean }) {
  const tracking = useEditTracking("personal.phone", value);
  return (
    <input
      {...aria}
      {...tracking}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/[^\d\s]/g, ""))}
      placeholder="Ej.: 3001234567"
      className={inputClass(hasError)}
    />
  );
}

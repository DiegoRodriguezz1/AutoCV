import { FormEvent, useRef, useState } from "react";
import { CheckCircle2, Download, FileText, Loader2 } from "lucide-react";
import { Link } from "react-router";

import { mapCVDataToCvRequest } from "../../dto/cv-api";
import { SURVEY_ITEMS } from "../../dto/experiment";
import type { ExperimentGroup, ExportResult } from "../../dto/experiment";
import { renderCv } from "../../services/cv-api";
import { flushEvents } from "../../services/event-queue";
import { endSession, exportSession, submitSurvey } from "../../services/experiment-api";
import { WizardData, countWords, location, period, toCVData, toSnapshot } from "./model";

export type CvTheme = "classic" | "modern" | "casual";

const THEMES: { value: CvTheme; label: string }[] = [
  { value: "classic", label: "Clásico" },
  { value: "modern", label: "Moderno" },
  { value: "casual", label: "Casual" },
];

const LIKERT = ["Muy en desacuerdo", "En desacuerdo", "Ni de acuerdo ni en desacuerdo", "De acuerdo", "Muy de acuerdo"];

export type ExportPhase = "review" | "exported" | "done";

interface StepExportProps {
  data: WizardData;
  group: ExperimentGroup;
  sessionId: string;
  phase: ExportPhase;
  result: ExportResult | null;
  pdfBase64: string | null;
  onExported: (result: ExportResult, pdfBase64: string | null) => void;
  onFinished: () => void;
  onRestart: () => void;
  announce: (message: string) => void;
}

function Review({ data }: { data: WizardData }) {
  const row = (label: string, value: string) => (
    <div className="grid gap-1 sm:grid-cols-[12rem_1fr]">
      <dt className="font-semibold text-gray-900">{label}</dt>
      <dd className="text-gray-800">{value || <span className="italic text-gray-700">Sin completar</span>}</dd>
    </div>
  );
  return (
    <dl className="space-y-2 rounded-lg border border-gray-400 bg-white p-4 text-base">
      {row("Nombre", data.name)}
      {row("Contacto", [data.email, data.phone && `+${data.phoneDial} ${data.phone}`, location(data)].filter(Boolean).join(" · "))}
      {row("Perfil", data.summary ? `${countWords(data.summary)} palabras` : "")}
      {row("Formación", data.education.map((item) => `${item.degree} (${period(item.start, item.end, item.current) || "sin fechas"})`).join("; "))}
      {row("Experiencia", data.experience.map((item) => `${item.position} en ${item.company}`).join("; "))}
      {row("Habilidades", data.skills.map((skill) => skill.label).join(", "))}
    </dl>
  );
}

function ResultCards({ result, group }: { result: ExportResult; group: ExperimentGroup }) {
  const cards = [
    { label: "Tiempo para crear el CV", value: result.time_to_cv_min != null ? `${result.time_to_cv_min.toFixed(1)} min` : "—" },
    { label: "Puntaje ATS", value: result.ats_score != null ? `${Math.round(result.ats_score)} / 100` : "—", ok: (result.ats_score ?? 0) >= 75 },
    ...(group === "B"
      ? [{ label: "Habilidades normalizadas en ESCO", value: `${Math.round(result.esco_coverage_pct ?? 0)} %`, ok: (result.esco_coverage_pct ?? 0) >= 80 }]
      : []),
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <li key={card.label} className="rounded-lg border border-gray-400 bg-white p-4">
          <p className="text-sm text-gray-800">{card.label}</p>
          <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          {"ok" in card && card.ok !== undefined && (
            <p className={`text-sm font-semibold ${card.ok ? "text-emerald-800" : "text-gray-800"}`}>
              {card.ok ? "Cumple la meta" : "Por debajo de la meta"}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function StepExport({ data, group, sessionId, phase, result, pdfBase64, onExported, onFinished, onRestart, announce }: StepExportProps) {
  const [theme, setTheme] = useState<CvTheme>("classic");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [scores, setScores] = useState<(number | null)[]>(SURVEY_ITEMS.map(() => null));
  const [surveyError, setSurveyError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const surveyErrorRef = useRef<HTMLDivElement>(null);

  const doExport = async () => {
    setExporting(true);
    setError(null);
    setPdfError(null);
    announce("Generando tu CV. Esto puede tardar unos segundos.");
    await flushEvents();
    const [exported, rendered] = await Promise.allSettled([
      exportSession(sessionId, toSnapshot(data)),
      renderCv(mapCVDataToCvRequest(toCVData(data), theme)),
    ]);
    setExporting(false);
    if (exported.status === "rejected") {
      setError(exported.reason instanceof Error ? exported.reason.message : "No se pudo exportar el CV.");
      announce("No se pudo exportar el CV.");
      return;
    }
    let pdf: string | null = null;
    if (rendered.status === "fulfilled" && rendered.value.accepted && rendered.value.pdf_base64) {
      pdf = rendered.value.pdf_base64;
    } else {
      setPdfError(
        rendered.status === "rejected"
          ? "No se pudo generar el PDF en este momento. Tus datos y métricas sí quedaron guardados."
          : rendered.value.message || "El servidor no generó el PDF.",
      );
    }
    onExported(exported.value, pdf);
    announce(`CV exportado. Puntaje ATS ${Math.round(exported.value.ats_score ?? 0)} de 100. Ahora responde la encuesta.`);
  };

  const sendSurvey = async (event: FormEvent) => {
    event.preventDefault();
    if (scores.some((score) => score === null)) {
      setSurveyError(`Responde las ${SURVEY_ITEMS.length} preguntas para terminar.`);
      window.setTimeout(() => surveyErrorRef.current?.focus(), 0);
      return;
    }
    setSending(true);
    setSurveyError(null);
    try {
      await submitSurvey(sessionId, scores as number[]);
      await endSession(sessionId);
      onFinished();
    } catch (err) {
      setSurveyError(err instanceof Error ? err.message : "No se pudo enviar la encuesta.");
      window.setTimeout(() => surveyErrorRef.current?.focus(), 0);
    } finally {
      setSending(false);
    }
  };

  const pdfName = `${(data.name || "cv").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_")}.pdf`;
  const pdfLink = pdfBase64 && (
    <a
      href={`data:application/pdf;base64,${pdfBase64}`}
      download={pdfName}
      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800"
    >
      <Download className="h-5 w-5" aria-hidden="true" />
      Descargar mi CV en PDF
    </a>
  );

  if (phase === "done") {
    return (
      <div className="space-y-5">
        <p className="flex items-center gap-2 text-xl font-bold text-gray-900" data-read>
          <CheckCircle2 className="h-7 w-7 text-emerald-800" aria-hidden="true" />
          ¡Gracias! Tu participación quedó registrada.
        </p>
        <p className="text-base text-gray-800" data-read>
          {pdfBase64 ? "Ya puedes descargar tu CV." : "Tu CV quedó guardado."} Si quieres, revisa ofertas de empleo con él.
        </p>
        <div className="flex flex-wrap gap-3">
          {pdfLink}
          <Link to="/jobs" className="inline-flex min-h-11 items-center rounded-md border border-gray-500 px-4 font-semibold text-gray-900 hover:bg-gray-100">
            Ver ofertas de empleo
          </Link>
          <button type="button" onClick={onRestart} className="min-h-11 rounded-md border border-gray-500 px-4 font-semibold text-gray-900 hover:bg-gray-100">
            Crear otro CV
          </button>
        </div>
      </div>
    );
  }

  if (phase === "review") {
    return (
      <div className="space-y-5">
        <p className="text-base text-gray-800" data-read>
          Revisa tus datos. Puedes volver a cualquier paso con el botón «Anterior» o desde la barra de progreso. Cuando
          esté todo bien, genera tu CV.
        </p>
        <Review data={data} />
        <fieldset>
          <legend className="mb-2 text-base font-semibold text-gray-900">Diseño del PDF</legend>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((item) => (
              <label key={item.value} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-gray-500 bg-white px-3 text-gray-900">
                <input type="radio" name="cv-theme" value={item.value} checked={theme === item.value} onChange={() => setTheme(item.value)} className="h-4 w-4 accent-blue-700" />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="rounded-md border border-red-700 bg-red-50 p-3 font-semibold text-red-800">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => void doExport()}
          disabled={exporting}
          className="inline-flex min-h-12 items-center gap-2 rounded-md bg-blue-700 px-6 text-lg font-bold text-white hover:bg-blue-800 disabled:opacity-70"
        >
          {exporting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <FileText className="h-5 w-5" aria-hidden="true" />}
          {exporting ? "Generando…" : "Generar y exportar CV"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {result && <ResultCards result={result} group={group} />}
      {pdfError && (
        <p role="status" className="rounded-md border border-amber-700 bg-amber-50 p-3 text-gray-900">
          {pdfError}
        </p>
      )}
      {pdfLink}

      <form onSubmit={(event) => void sendSurvey(event)} className="space-y-4" noValidate>
        <h3 className="text-lg font-bold text-gray-900" data-read>
          Encuesta final: ¿qué tan de acuerdo estás?
        </h3>
        <p className="text-base text-gray-800" data-read>
          Elige una opción del 1 (muy en desacuerdo) al 5 (muy de acuerdo) en cada afirmación.
        </p>
        <div ref={surveyErrorRef} tabIndex={-1}>
          {surveyError && (
            <p role="alert" className="rounded-md border border-red-700 bg-red-50 p-3 font-semibold text-red-800">
              {surveyError}
            </p>
          )}
        </div>
        {SURVEY_ITEMS.map((question, index) => (
          <fieldset key={question} className="rounded-lg border border-gray-400 bg-white p-4">
            <legend className="px-1 text-base font-semibold text-gray-900">
              {index + 1}. {question}
            </legend>
            <div role="radiogroup" aria-required="true" className="mt-2 grid gap-2">
              {LIKERT.map((label, value) => (
                <label
                  key={label}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm text-gray-900 ${
                    scores[index] === value + 1 ? "border-blue-700 bg-blue-50 font-semibold" : "border-gray-500"
                  }`}
                >
                  <input
                    type="radio"
                    name={`survey-${index}`}
                    checked={scores[index] === value + 1}
                    onChange={() => setScores((current) => current.map((score, i) => (i === index ? value + 1 : score)))}
                    className="h-4 w-4 accent-blue-700"
                  />
                  {value + 1} · {label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button
          type="submit"
          disabled={sending}
          className="inline-flex min-h-12 items-center gap-2 rounded-md bg-blue-700 px-6 text-lg font-bold text-white hover:bg-blue-800 disabled:opacity-70"
        >
          {sending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          Enviar encuesta y finalizar
        </button>
      </form>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CloudOff, Timer } from "lucide-react";

import { A11yToolbar } from "../../a11y/a11y-toolbar";
import { useA11y } from "../../a11y/preferences";
import type { ExperimentGroup, ExportResult, FormSection, SectionName } from "../../dto/experiment";
import { enqueueEvent } from "../../services/event-queue";
import { CVPreview } from "../cv-preview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { Switch } from "../ui/switch";
import { TrackingProvider } from "./field";
import { MetricsPanel } from "./metrics-panel";
import { FieldError, STEPS, StepId, WizardData, groupLabel, toCVData, validateStep } from "./model";
import { ReadAloudButton } from "./speech";
import { StepEducation } from "./step-education";
import { StepExperience } from "./step-experience";
import { ExportPhase, StepExport } from "./step-export";
import { StepPersonal } from "./step-personal";
import type { StepProps } from "./step-props";
import { StepSkills } from "./step-skills";

export const DRAFT_KEY = "autocv_draft";
const METRICS_KEY = "autocv_metrics_panel";

export interface WizardDraft {
  sessionId: string;
  data: WizardData;
  stepIndex: number;
  maxStep: number;
  phase: ExportPhase;
}

export interface WizardSession {
  id: string;
  group: ExperimentGroup;
  startedAt: string;
}

interface CvWizardProps {
  open: boolean;
  session: WizardSession;
  initialDraft: WizardDraft;
  onClose: () => void;
  onRestart: () => void;
}

const INSTRUCTIONS: Record<StepId, (group: ExperimentGroup) => string> = {
  personal: () => "Escribe tus datos de contacto y un perfil corto. Solo el nombre es obligatorio.",
  education: () => "Añade tus estudios. Puedes añadir varios o continuar sin ninguno.",
  experience: () => "Añade tus empleos, prácticas o proyectos. Puedes continuar sin ninguno.",
  skills: (group) =>
    group === "B"
      ? "Añade tus habilidades una por una. El sistema te sugiere su nombre estándar en la clasificación europea ESCO."
      : "Añade tus habilidades una por una.",
  export: () => "Revisa tus datos y genera tu CV.",
};

const RESEARCHER_KEY = "autocv_investigador";

/** VITE_SHOW_METRICS=true: el panel de métricas está disponible y encendido para todos. */
const metricsAlwaysOn = () => import.meta.env.VITE_SHOW_METRICS === "true";

/**
 * El switch de métricas aparece en desarrollo, con VITE_SHOW_METRICS=true o en "modo
 * investigador" (`?investigador=1` lo activa en este navegador y `?investigador=0` lo quita).
 */
export function canShowMetrics(): boolean {
  if (import.meta.env.DEV || metricsAlwaysOn()) return true;
  const param = new URLSearchParams(window.location.search).get("investigador");
  try {
    if (param === "1") localStorage.setItem(RESEARCHER_KEY, "1");
    if (param === "0") localStorage.removeItem(RESEARCHER_KEY);
    return localStorage.getItem(RESEARCHER_KEY) === "1";
  } catch {
    return param === "1";
  }
}

function readMetricsPref(): boolean {
  try {
    const stored = localStorage.getItem(METRICS_KEY);
    // Con VITE_SHOW_METRICS arranca encendido, salvo que la persona lo haya apagado.
    return stored === null ? metricsAlwaysOn() : stored === "1";
  } catch {
    return metricsAlwaysOn();
  }
}

function saveDraft(draft: WizardDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Sin almacenamiento: el borrador no sobrevive a una recarga.
  }
}

/** Cronómetro informativo; se detiene al exportar, cuando termina TimeToCV. */
function useElapsed(startedAt: string, stopped: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (stopped) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [stopped]);
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function CvWizard({ open, session, initialDraft, onClose, onRestart }: CvWizardProps) {
  const { prefs } = useA11y();
  const [data, setData] = useState<WizardData>(initialDraft.data);
  const [stepIndex, setStepIndex] = useState(initialDraft.stepIndex);
  const [maxStep, setMaxStep] = useState(initialDraft.maxStep);
  const [phase, setPhase] = useState<ExportPhase>(initialDraft.phase);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [pdf, setPdf] = useState<string | null>(null);
  const [metricsOn, setMetricsOn] = useState(() => canShowMetrics() && readMetricsPref());
  const [mobilePane, setMobilePane] = useState<"form" | "side">("form");
  const [escoDegraded, setEscoDegraded] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Mueve el foco sin desplazar el modal entero; solo se desplaza el panel del formulario.
  const focusTop = useCallback((element: HTMLElement | null) => {
    element?.focus({ preventScroll: true });
    mainRef.current?.scrollTo({ top: 0 });
  }, []);
  const elapsed = useElapsed(session.startedAt, phase !== "review");

  const step = STEPS[stepIndex];
  const errorMap = useMemo(() => Object.fromEntries(errors.map((error) => [error.fieldId, error.message])), [errors]);

  const announce = useCallback((message: string) => {
    // Vaciar primero hace que el lector repita mensajes iguales.
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(message), 50);
  }, []);

  const update = useCallback<StepProps["update"]>((patch) => {
    setData((current) => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }));
  }, []);

  const trackEdit = useCallback(
    (field: string) => enqueueEvent(session.id, "field_edit", { field }),
    [session.id],
  );

  useEffect(() => {
    saveDraft({ sessionId: session.id, data, stepIndex, maxStep, phase });
  }, [session.id, data, stepIndex, maxStep, phase]);

  // Si el panel arranca encendido (VITE_SHOW_METRICS o preferencia guardada), la sesión
  // también queda marcada, igual que cuando se enciende a mano.
  useEffect(() => {
    if (open && metricsOn) enqueueEvent(session.id, "field_edit", { field: "metrics_panel", initial: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, open]);

  // Cada vez que se entra a un paso: evento, foco en el título y anuncio.
  useEffect(() => {
    if (!open) return;
    if (phase !== "done") enqueueEvent(session.id, "section_enter", { section: step.id as SectionName });
    const timer = window.setTimeout(() => focusTop(headingRef.current), 60);
    announce(`Paso ${stepIndex + 1} de ${STEPS.length}: ${step.title}.`);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, open]);

  const goTo = (index: number) => {
    setErrors([]);
    setMobilePane("form");
    setStepIndex(index);
  };

  const completeSection = () => {
    const found = validateStep(step.id, data);
    setErrors(found);
    if (found.length) {
      announce(`Hay ${found.length} ${found.length === 1 ? "error" : "errores"} que corregir.`);
      window.setTimeout(() => focusTop(summaryRef.current), 0);
      return;
    }
    enqueueEvent(session.id, "section_complete", { section: step.id as FormSection });
    const next = stepIndex + 1;
    setMaxStep((current) => Math.max(current, next));
    goTo(next);
  };

  const toggleMetrics = (value: boolean) => {
    setMetricsOn(value);
    try {
      localStorage.setItem(METRICS_KEY, value ? "1" : "0");
    } catch {
      // Preferencia solo en memoria.
    }
    // Ver métricas puede influir en el participante: se registra para poder excluir la sesión.
    if (value) enqueueEvent(session.id, "field_edit", { field: "metrics_panel" });
  };

  const requestClose = () => (phase === "done" ? onClose() : setConfirmClose(true));

  const stepProps: StepProps = {
    data,
    update,
    errors: errorMap,
    group: session.group,
    sessionId: session.id,
    announce,
    onEscoDegraded: setEscoDegraded,
  };

  const sidePane = metricsOn ? (
    <MetricsPanel sessionId={session.id} group={session.group} data={data} />
  ) : (
    <CVPreview data={toCVData(data)} generatedPdfBase64={phase !== "review" ? pdf : null} />
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(value) => (value ? undefined : requestClose())}>
        <DialogContent
          aria-describedby="wizard-desc"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            const target = event.target as HTMLElement | null;
            // En un campo con sugerencias que tiene texto, o en el panel de accesibilidad, Escape solo cierra eso.
            const inCombobox = target?.getAttribute?.("role") === "combobox" && Boolean((target as HTMLInputElement).value);
            if (inCombobox || target?.closest?.("#a11y-panel")) return;
            requestClose();
          }}
          className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none border-gray-500 bg-gray-50 p-0 sm:h-[94vh] sm:max-w-[min(1400px,96vw)] sm:rounded-lg"
        >
          <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-400 bg-white py-3 pl-4 pr-16 sm:pl-6">
            <DialogTitle className="text-xl font-bold text-gray-900">Crea tu hoja de vida</DialogTitle>
            <DialogDescription id="wizard-desc" className="sr-only">
              Asistente de cinco pasos. Tus datos se guardan solos mientras escribes.
            </DialogDescription>
            <span
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                session.group === "A" ? "border-amber-700 bg-amber-50 text-amber-800" : "border-emerald-700 bg-emerald-50 text-emerald-800"
              }`}
            >
              {groupLabel(session.group)}
            </span>
            {!prefs.hideTimer && (
              <span className="inline-flex items-center gap-1 font-mono text-base tabular-nums text-gray-800" aria-hidden="true" title="Tiempo de la sesión">
                <Timer className="h-4 w-4" />
                {elapsed}
              </span>
            )}
            <span className="ml-auto" />
            <A11yToolbar inline />
            {canShowMetrics() && (
              <span className="inline-flex items-center gap-2">
                <Switch
                  id="metrics-switch"
                  checked={metricsOn}
                  onCheckedChange={toggleMetrics}
                  className="h-6 w-11 border-2 border-gray-700 data-[state=checked]:bg-blue-700 data-[state=unchecked]:bg-gray-300 [&>span]:size-4 [&>span]:bg-white"
                />
                <label htmlFor="metrics-switch" className="text-base font-semibold text-gray-900">
                  Ver métricas <span className="font-normal text-gray-800" aria-hidden="true">({metricsOn ? "sí" : "no"})</span>
                </label>
              </span>
            )}
          </header>

          <nav aria-label="Progreso" className="border-b border-gray-400 bg-white px-4 py-2 sm:px-6">
            <ol className="flex flex-wrap gap-2">
              {STEPS.map((item, index) => {
                const done = index < stepIndex || (index === STEPS.length - 1 && phase === "done");
                const current = index === stepIndex;
                const reachable = index <= maxStep && phase !== "done" && !(index < STEPS.length - 1 && phase === "exported");
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={!reachable || current}
                      aria-current={current ? "step" : undefined}
                      onClick={() => goTo(index)}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-semibold disabled:cursor-default ${
                        current
                          ? "border-blue-700 bg-blue-700 text-white"
                          : done
                            ? "border-emerald-700 bg-white text-emerald-800"
                            : "border-gray-500 bg-white text-gray-800"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <span aria-hidden="true">{index + 1}.</span>}
                      {item.label}
                      <span className="sr-only">{current ? " (paso actual)" : done ? " (completado)" : ""}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="flex gap-2 border-b border-gray-400 bg-white px-4 py-2 lg:hidden" role="group" aria-label="Qué mostrar">
            {(["form", "side"] as const).map((pane) => (
              <button
                key={pane}
                type="button"
                aria-pressed={mobilePane === pane}
                onClick={() => setMobilePane(pane)}
                className={`min-h-11 flex-1 rounded-md border px-3 font-semibold ${
                  mobilePane === pane ? "border-blue-700 bg-blue-50 text-blue-800" : "border-gray-500 text-gray-900"
                }`}
              >
                {pane === "form" ? "Formulario" : metricsOn ? "Métricas" : "Vista previa"}
              </button>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <section
              ref={mainRef}
              aria-label="Paso actual"
              id="wizard-step"
              className={`relative min-h-0 overflow-y-auto px-4 py-5 sm:px-6 ${mobilePane === "side" ? "hidden lg:block" : ""}`}
            >
              <div className="mx-auto max-w-3xl space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800" data-read>
                      Paso {stepIndex + 1} de {STEPS.length}
                    </p>
                    <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 outline-none" data-read>
                      {step.title}
                    </h2>
                    <p className="mt-1 text-base text-gray-800" data-read>
                      {INSTRUCTIONS[step.id](session.group)}
                    </p>
                  </div>
                  <ReadAloudButton targetId="wizard-step" />
                </div>

                {session.group === "B" && escoDegraded && (
                  <p role="status" className="flex items-center gap-2 rounded-md border border-amber-700 bg-amber-50 p-3 text-gray-900">
                    <CloudOff className="h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" />
                    Las sugerencias ESCO no están disponibles ahora. Puedes escribir tus datos normalmente.
                  </p>
                )}

                <div ref={summaryRef} tabIndex={-1} className="outline-none">
                  {errors.length > 0 && (
                    <div role="alert" className="rounded-md border-2 border-red-700 bg-red-50 p-4">
                      <p className="font-bold text-red-800" data-read>
                        Corrige {errors.length === 1 ? "este dato" : `estos ${errors.length} datos`} para continuar:
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {errors.map((error) => (
                          <li key={error.fieldId} data-read>
                            <a
                              href={`#${error.fieldId}`}
                              onClick={(event) => {
                                event.preventDefault();
                                document.getElementById(error.fieldId)?.focus();
                              }}
                              className="font-semibold text-red-800 underline"
                            >
                              {error.message}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <TrackingProvider value={trackEdit}>
                  {step.id === "personal" && <StepPersonal {...stepProps} />}
                  {step.id === "education" && <StepEducation {...stepProps} />}
                  {step.id === "experience" && <StepExperience {...stepProps} />}
                  {step.id === "skills" && <StepSkills {...stepProps} />}
                  {step.id === "export" && (
                    <StepExport
                      data={data}
                      group={session.group}
                      sessionId={session.id}
                      phase={phase}
                      result={result}
                      pdfBase64={pdf}
                      announce={announce}
                      onExported={(exported, pdfBase64) => {
                        setResult(exported);
                        setPdf(pdfBase64);
                        setPhase("exported");
                      }}
                      onFinished={() => {
                        setPhase("done");
                        announce("Encuesta enviada. Gracias por participar.");
                      }}
                      onRestart={onRestart}
                    />
                  )}
                </TrackingProvider>
              </div>
            </section>

            <aside
              aria-label={metricsOn ? "Métricas" : "Vista previa del CV"}
              className={`relative min-h-0 overflow-y-auto border-l border-gray-400 bg-gray-100 ${metricsOn ? "p-4" : ""} ${
                mobilePane === "form" ? "hidden lg:block" : ""
              }`}
            >
              {sidePane}
            </aside>
          </div>

          {step.id !== "export" && (
            <footer className="flex flex-wrap items-center gap-3 border-t border-gray-400 bg-white px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => goTo(stepIndex - 1)}
                disabled={stepIndex === 0}
                className="inline-flex min-h-11 items-center gap-1 rounded-md border border-gray-500 px-4 font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                Anterior
              </button>
              <button
                type="button"
                onClick={completeSection}
                className="inline-flex min-h-11 items-center gap-1 rounded-md bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800"
              >
                {step.id === "skills" ? "Revisar y exportar" : "Completar sección"}
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="text-sm text-gray-800">Borrador guardado automáticamente</span>
            </footer>
          )}
          {step.id === "export" && phase === "review" && (
            <footer className="border-t border-gray-400 bg-white px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => goTo(stepIndex - 1)}
                className="inline-flex min-h-11 items-center gap-1 rounded-md border border-gray-500 px-4 font-semibold text-gray-900 hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                Anterior
              </button>
            </footer>
          )}

          <p className="sr-only" role="status" aria-live="polite">
            {announcement}
          </p>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir del asistente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tus datos quedan guardados en este navegador y la sesión sigue abierta. Puedes continuar después desde esta misma página.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir aquí</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmClose(false);
                onClose();
              }}
            >
              Salir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

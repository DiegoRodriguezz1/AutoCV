import { useEffect, useRef, useState } from "react";
import { ArrowLeft, FileText, Loader2, PlayCircle, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { Link } from "react-router";

import { prefsSnapshot, useA11y } from "../a11y/preferences";
import { CvWizard, DRAFT_KEY, WizardDraft, WizardSession } from "../components/wizard/cv-wizard";
import { emptyWizardData, fromCVData } from "../components/wizard/model";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import type { CVData } from "../dto/cv-data";
import type { ExperimentGroup } from "../dto/experiment";
import { extractCvFromPdfBase64, extractCvPreviewFromPdfBase64 } from "../services/cv-api";
import { enqueueEvent } from "../services/event-queue";
import { endSession, getSessionState, listSkills, startExperimentSession } from "../services/experiment-api";

const SESSION_KEY = "autocv_session";
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const MIN_PDF_SIZE_BYTES = 50 * 1024;

type GroupChoice = "random" | ExperimentGroup;

function readStored<T>(read: () => string | null): T | null {
  try {
    const value = read();
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function clearStored() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nada que limpiar.
  }
}

async function fileToBase64(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = reader.result;
      if (typeof value !== "string") {
        reject(new Error("No se pudo leer el archivo PDF."));
        return;
      }
      const base64 = value.includes(",") ? value.split(",")[1] : value;
      if (!base64) {
        reject(new Error("No se pudo convertir el PDF a base64."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Error leyendo el archivo PDF."));
    reader.readAsDataURL(file);
  });
}

function pickString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapExtractedDataToCvData(extracted: Record<string, unknown>): CVData {
  const personalInfoRaw = (extracted.personalInfo as Record<string, unknown> | undefined) ??
    (extracted.personal_info as Record<string, unknown> | undefined) ??
    {};
  const experienceRaw = (extracted.experience as Record<string, unknown>[] | undefined) ?? [];
  const educationRaw = (extracted.education as Record<string, unknown>[] | undefined) ?? [];
  const skillsRaw = (extracted.skills as unknown[] | undefined) ?? [];

  return {
    personalInfo: {
      name: pickString(personalInfoRaw.name) || pickString(extracted.name),
      email: pickString(personalInfoRaw.email) || pickString(extracted.email),
      phone: pickString(personalInfoRaw.phone) || pickString(extracted.phone),
      location: pickString(personalInfoRaw.location) || pickString(extracted.location),
      summary: pickString(personalInfoRaw.summary) || pickString(extracted.headline),
    },
    experience: experienceRaw.map((item) => ({
      position: pickString(item.position),
      company: pickString(item.company),
      duration:
        pickString(item.duration || item.date_range) ||
        `${pickString(item.start_date)} - ${pickString(item.end_date)}`.trim(),
      description: pickString(item.description || item.summary),
    })),
    education: educationRaw.map((item) => ({
      degree: pickString(item.degree || item.title || item.area),
      institution: pickString(item.institution),
      year:
        pickString(item.year || item.date_range) ||
        `${pickString(item.start_date)} - ${pickString(item.end_date)}`.trim(),
    })),
    skills: skillsRaw
      .map((item) => (typeof item === "string" ? item : pickString((item as Record<string, unknown>).details)))
      .filter(Boolean),
  };
}

export function CVCreatorPage() {
  const { prefs } = useA11y();
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [groupChoice, setGroupChoice] = useState<GroupChoice>("random");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [session, setSession] = useState<WizardSession | null>(null);
  const [draft, setDraft] = useState<WizardDraft | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [resumable, setResumable] = useState<{ session: WizardSession; draft: WizardDraft } | null>(null);
  const [prefill, setPrefill] = useState<CVData | null>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  // OCR
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [useGemini, setUseGemini] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Retomar una sesión abierta tras recargar la página.
  useEffect(() => {
    const stored = readStored<WizardSession>(() => sessionStorage.getItem(SESSION_KEY));
    const storedDraft = readStored<WizardDraft>(() => localStorage.getItem(DRAFT_KEY));
    if (!stored || !storedDraft || storedDraft.sessionId !== stored.id) return;
    void getSessionState(stored.id)
      .then(async (state) => {
        if (state.ended_at) {
          clearStored();
          return;
        }
        // Las habilidades guardadas en el servidor mandan sobre el borrador local.
        const serverSkills = await listSkills(stored.id).catch(() => null);
        const skills = serverSkills
          ? serverSkills.map((skill) => ({
              key: String(skill.id),
              id: skill.id,
              label: skill.input_label,
              escoUri: skill.esco_uri,
              preferredLabel: skill.preferred_label,
              source: skill.source,
            }))
          : storedDraft.data.skills;
        setResumable({ session: stored, draft: { ...storedDraft, data: { ...storedDraft.data, skills } } });
      })
      // Sin conexión no se borra nada: se ofrece retomar con el borrador local.
      .catch(() => setResumable({ session: stored, draft: storedDraft }));
  }, []);

  const start = async () => {
    if (!consent) {
      setConsentError("Para participar debes aceptar el consentimiento informado.");
      consentRef.current?.focus();
      return;
    }
    setStarting(true);
    setStartError(null);
    try {
      if (resumable) void endSession(resumable.session.id).catch(() => undefined);
      const created = await startExperimentSession({
        consent: true,
        group: groupChoice === "random" ? undefined : groupChoice,
        user_agent: navigator.userAgent,
        a11y_prefs: prefsSnapshot(prefs),
      });
      const next: WizardSession = { id: created.id, group: created.group, startedAt: created.started_at };
      const data = prefill ? fromCVData(prefill, emptyWizardData()) : emptyWizardData();
      if (prefill) enqueueEvent(created.id, "field_edit", { field: "ocr_import" });
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      } catch {
        // Sin almacenamiento: no se podrá retomar tras recargar.
      }
      setResumable(null);
      setSession(next);
      setDraft({ sessionId: created.id, data, stepIndex: 0, maxStep: 0, phase: "review" });
      setWizardOpen(true);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : "No se pudo iniciar la sesión.");
    } finally {
      setStarting(false);
    }
  };

  const resume = () => {
    if (!resumable) return;
    setSession(resumable.session);
    setDraft(resumable.draft);
    setResumable(null);
    setWizardOpen(true);
  };

  const restart = () => {
    clearStored();
    setResumable(null);
    setWizardOpen(false);
    setSession(null);
    setDraft(null);
    setPrefill(null);
    setConsent(false);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    const stored = readStored<WizardDraft>(() => localStorage.getItem(DRAFT_KEY));
    if (session && stored?.phase === "done") {
      restart();
      return;
    }
    if (session && stored) setResumable({ session, draft: stored });
    setSession(null);
    setDraft(null);
  };

  const onPdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setUploadError(null);
    if (!file) return setSelectedPdf(null);
    const invalid =
      file.type !== "application/pdf"
        ? "Solo se permiten archivos PDF."
        : file.size > MAX_PDF_SIZE_BYTES
          ? "El PDF pesa más de 10 MB. Usa un archivo más liviano."
          : file.size < MIN_PDF_SIZE_BYTES
            ? "El PDF es muy pequeño. Debe pesar al menos 50 KB."
            : null;
    if (invalid) {
      setUploadError(invalid);
      setSelectedPdf(null);
      event.target.value = "";
      return;
    }
    setSelectedPdf(file);
  };

  const processPdf = async () => {
    if (!selectedPdf) {
      setUploadError("Selecciona un archivo PDF para procesar.");
      return;
    }
    setParsing(true);
    setUploadError(null);
    try {
      const pdfBase64 = await fileToBase64(selectedPdf);
      const preview = await extractCvPreviewFromPdfBase64({ pdf_base64: pdfBase64, language: "es", use_gemini: false });
      const result = useGemini
        ? await extractCvFromPdfBase64({ pdf_base64: pdfBase64, language: "es", use_gemini: true })
        : preview;
      if (!result.accepted || !result.extracted_data) {
        throw new Error(result.message || "No se pudo extraer información del PDF.");
      }
      setPrefill(mapExtractedDataToCvData(result.extracted_data));
      setUploadMessage("Datos del PDF listos. Se cargarán en el formulario al comenzar; revísalos paso a paso.");
      setUploadOpen(false);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Error procesando el PDF.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="flex flex-wrap items-center gap-4 border-b border-gray-300 bg-white px-6 py-4">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 font-semibold text-gray-800 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Volver al inicio
        </Link>
        <span className="inline-flex items-center gap-2 text-xl font-bold">
          <FileText className="h-6 w-6 text-blue-700" aria-hidden="true" />
          AutoCV
        </span>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Crea tu hoja de vida</h1>
          <p className="text-lg text-gray-800">
            Esta herramienta hace parte de un estudio de la Escuela Tecnológica Instituto Técnico Central (ETITC) sobre
            cómo crear hojas de vida más rápido y mejor.
          </p>
        </div>

        {resumable && (
          <section aria-labelledby="resume-title" className="space-y-3 rounded-lg border-2 border-blue-700 bg-blue-50 p-5">
            <h2 id="resume-title" className="text-xl font-bold">Tienes un CV sin terminar</h2>
            <p className="text-base text-gray-800">Puedes seguir donde lo dejaste. Tus datos están guardados.</p>
            <button
              type="button"
              onClick={resume}
              className="inline-flex min-h-12 items-center gap-2 rounded-md bg-blue-700 px-5 text-lg font-bold text-white hover:bg-blue-800"
            >
              <PlayCircle className="h-5 w-5" aria-hidden="true" />
              Continuar donde quedé
            </button>
          </section>
        )}

        <section aria-labelledby="study-title" className="space-y-3 rounded-lg border border-gray-400 bg-white p-5">
          <h2 id="study-title" className="text-xl font-bold">Antes de empezar</h2>
          <ul className="list-disc space-y-1 pl-5 text-base text-gray-800">
            <li>Son 5 pasos: datos, formación, experiencia, habilidades y exportar.</li>
            <li>Tarda entre 20 y 30 minutos. No hay límite de tiempo y puedes pausar cuando quieras.</li>
            <li>
              Registramos cuánto tardas en cada paso, cuántas veces corriges un dato, tus habilidades y tu opinión al final.
              No vendemos ni compartimos tus datos.
            </li>
            <li>Puedes ajustar el tamaño del texto, el contraste o activar la lectura en voz alta con el botón «Accesibilidad».</li>
          </ul>
        </section>

        <section aria-labelledby="consent-title" className="space-y-4 rounded-lg border border-gray-400 bg-white p-5">
          <h2 id="consent-title" className="flex items-center gap-2 text-xl font-bold">
            <ShieldCheck className="h-6 w-6 text-blue-700" aria-hidden="true" />
            Consentimiento informado
          </h2>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-gray-300 bg-gray-50 p-4 text-base text-gray-800" tabIndex={0} aria-label="Texto del consentimiento">
            <p>
              Al participar autorizas el tratamiento de tus datos personales con fines académicos y de investigación,
              conforme a la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013 (Colombia).
            </p>
            <p>
              Los datos se usan para generar tu CV y para analizar, de forma agregada y anónima, el tiempo de creación, la
              calidad del CV y tu satisfacción. Puedes pedir la actualización, corrección o eliminación de tus datos en
              cualquier momento.
            </p>
            <p>Tu participación es voluntaria y puedes retirarte sin ninguna consecuencia.</p>
          </div>
          <div className="flex items-start gap-3">
            <input
              ref={consentRef}
              id="consent"
              type="checkbox"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                if (event.target.checked) setConsentError(null);
              }}
              aria-describedby={consentError ? "consent-error" : undefined}
              aria-invalid={consentError ? true : undefined}
              aria-required="true"
              className="mt-1 h-6 w-6 shrink-0 accent-blue-700"
            />
            <label htmlFor="consent" className="text-base font-semibold">
              Leí el consentimiento, soy mayor de edad y acepto participar. (obligatorio)
            </label>
          </div>
          {consentError && (
            <p id="consent-error" role="alert" className="font-semibold text-red-800">
              {consentError}
            </p>
          )}

          {import.meta.env.DEV && (
            <div className="space-y-1">
              <label htmlFor="group-choice" className="block font-semibold">
                Asignación de grupo (solo en desarrollo)
              </label>
              <select
                id="group-choice"
                value={groupChoice}
                onChange={(event) => setGroupChoice(event.target.value as GroupChoice)}
                className="min-h-11 rounded-md border border-gray-500 bg-white px-3"
              >
                <option value="random">Aleatoria</option>
                <option value="A">Forzar grupo A (control)</option>
                <option value="B">Forzar grupo B (AutoCV)</option>
              </select>
            </div>
          )}

          {uploadMessage && (
            <p role="status" className="rounded-md border border-emerald-700 bg-emerald-50 p-3 text-gray-900">
              {uploadMessage}
            </p>
          )}
          {startError && (
            <p role="alert" className="rounded-md border border-red-700 bg-red-50 p-3 font-semibold text-red-800">
              {startError}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void start()}
              disabled={starting}
              className="inline-flex min-h-12 items-center gap-2 rounded-md bg-blue-700 px-6 text-lg font-bold text-white hover:bg-blue-800 disabled:opacity-70"
            >
              {starting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : resumable ? <RotateCcw className="h-5 w-5" aria-hidden="true" /> : null}
              {resumable ? "Empezar un CV nuevo" : "Comenzar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadError(null);
                setSelectedPdf(null);
                setUploadOpen(true);
              }}
              className="inline-flex min-h-12 items-center gap-2 rounded-md border border-gray-500 bg-white px-5 font-semibold hover:bg-gray-100"
            >
              <Upload className="h-5 w-5" aria-hidden="true" />
              Rellenar desde mi CV en PDF
            </button>
          </div>
        </section>
      </main>

      {session && draft && (
        <CvWizard key={session.id} open={wizardOpen} session={session} initialDraft={draft} onClose={closeWizard} onRestart={restart} />
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Rellenar desde un CV en PDF</DialogTitle>
            <DialogDescription>
              Extraemos el texto de tu PDF para llenar el formulario. Revisa los datos antes de exportar. El PDF se usa solo
              para esto, bajo el mismo consentimiento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input ref={fileInputRef} id="pdf-file" type="file" accept="application/pdf" className="sr-only" onChange={onPdfChange} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-11 rounded-md border border-gray-500 px-4 font-semibold hover:bg-gray-100"
              >
                Seleccionar PDF
              </button>
              <span className="text-sm text-gray-800" aria-live="polite">
                {selectedPdf ? selectedPdf.name : "Ningún archivo seleccionado"}
              </span>
            </div>
            <label className="flex items-start gap-2 text-base">
              <input type="checkbox" checked={useGemini} onChange={(event) => setUseGemini(event.target.checked)} className="mt-1 h-5 w-5 accent-blue-700" />
              Usar inteligencia artificial (Gemini) para leer mejor el PDF. Es más precisa, pero un poco más lenta.
            </label>
            {uploadError && (
              <p role="alert" className="font-semibold text-red-800">
                {uploadError}
              </p>
            )}
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setUploadOpen(false)} className="min-h-11 rounded-md border border-gray-500 px-4 font-semibold">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void processPdf()}
              disabled={parsing}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-70"
            >
              {parsing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {parsing ? "Procesando…" : "Procesar PDF"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

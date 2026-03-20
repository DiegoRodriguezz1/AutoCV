import { useCallback, useEffect, useRef, useState } from "react";
import { CVForm, CVData } from "../components/cv-form.tsx";
import { CVPreview } from "../components/cv-preview.tsx";
import { FileText, ArrowLeft, Upload, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { mapCVDataToCvRequest } from "../dto/cv-api";
import {
  extractCvFromPdfBase64,
  extractCvPreviewFromPdfBase64,
  renderCv,
} from "../services/cv-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const AUTO_RENDER_IDLE_MS = 5000;
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const MIN_PDF_SIZE_BYTES = 50 * 1024;

type CVTheme = "classic" | "modern" | "casual";

const AVAILABLE_THEMES: { value: CVTheme; label: string }[] = [
  { value: "classic", label: "Clásico" },
  { value: "modern", label: "Moderno" },
  { value: "casual", label: "Casual" },
];

function hasMinimumData(data: CVData): boolean {
  return Boolean(data.personalInfo.name.trim());
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
  const navigate = useNavigate();
  const requestCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<CVTheme>("classic");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [hasAcceptedDataPolicy, setHasAcceptedDataPolicy] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [useGeminiForOcr, setUseGeminiForOcr] = useState(true);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const [pdfUploadSuccess, setPdfUploadSuccess] = useState<string | null>(null);

  const [cvData, setCvData] = useState<CVData>({
    personalInfo: {
      name: "",
      email: "",
      phone: "",
      location: "",
      summary: "",
    },
    experience: [],
    education: [],
    skills: [],
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPdfBase64, setGeneratedPdfBase64] = useState<string | null>(null);
  const [generatedYaml, setGeneratedYaml] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleValidationChange = useCallback(
    (isValid: boolean, errors: Record<string, string>) => {
      setIsFormValid((prev) => (prev === isValid ? prev : isValid));

      setFormErrors((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(errors);
        const hasSameLength = prevKeys.length === nextKeys.length;
        const hasSameValues =
          hasSameLength && prevKeys.every((key) => prev[key] === errors[key]);

        return hasSameValues ? prev : errors;
      });
    },
    [],
  );

  const handleGenerateCV = async (source: "manual" | "auto" = "manual") => {
    if (!hasMinimumData(cvData)) {
      setGeneratedPdfBase64(null);
      setGeneratedYaml(null);
      return;
    }

    const requestId = ++requestCounterRef.current;
    setApiError(null);
    setIsGenerating(true);

    try {
      const payload = mapCVDataToCvRequest(cvData, selectedTheme);
      const result = await renderCv(payload);

      // Ignore stale responses if a newer request was fired.
      if (requestId !== requestCounterRef.current) {
        return;
      }

      if (!result.accepted) {
        throw new Error(result.message || "La API no acepto la solicitud");
      }

      if (!result.pdf_base64) {
        throw new Error("La API respondio sin pdf_base64");
      }

      setGeneratedPdfBase64(result.pdf_base64);
      setGeneratedYaml(result.generated_yaml ?? null);
    } catch (error) {
      if (requestId !== requestCounterRef.current) {
        return;
      }

      const message = error instanceof Error ? error.message : "No se pudo generar el CV";
      setApiError(source === "auto" ? `Autogeneracion: ${message}` : message);
      setGeneratedPdfBase64(null);
      setGeneratedYaml(null);
    } finally {
      if (requestId === requestCounterRef.current) {
        setIsGenerating(false);
      }
    }
  };

  useEffect(() => {
    if (!hasMinimumData(cvData) || !isFormValid) {
      setApiError(null);
      setGeneratedPdfBase64(null);
      setGeneratedYaml(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void handleGenerateCV("auto");
    }, AUTO_RENDER_IDLE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [cvData, isFormValid, selectedTheme]);

  const handleApplyCV = () => {
    navigate("/jobs");
  };

  const handleOpenUploadModal = () => {
    setPdfUploadError(null);
    setPdfUploadSuccess(null);
    setSelectedPdfFile(null);
    setUseGeminiForOcr(true);
    setHasAcceptedDataPolicy(false);
    setIsUploadModalOpen(true);
  };

  const handleSelectPdfClick = () => {
    fileInputRef.current?.click();
  };

  const handlePdfFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPdfUploadError(null);
    setPdfUploadSuccess(null);

    if (!file) {
      setSelectedPdfFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setPdfUploadError("Solo se permiten archivos PDF.");
      setSelectedPdfFile(null);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      setPdfUploadError("El PDF excede 10MB. Usa un archivo más liviano.");
      setSelectedPdfFile(null);
      event.target.value = "";
      return;
    }

    if (file.size < MIN_PDF_SIZE_BYTES) {
      setPdfUploadError("El PDF es muy pequeño. Debe ser de al menos 50KB.");
      setSelectedPdfFile(null);
      event.target.value = "";
      return;
    }

    setSelectedPdfFile(file);
  };

  const handleProcessUploadedPdf = async () => {
    if (!hasAcceptedDataPolicy) {
      setPdfUploadError("Debes aceptar el tratamiento de datos para continuar.");
      return;
    }

    if (!selectedPdfFile) {
      setPdfUploadError("Selecciona un archivo PDF para procesar.");
      return;
    }

    setPdfUploadError(null);
    setPdfUploadSuccess(null);
    setIsParsingPdf(true);

    try {
      const pdfBase64 = await fileToBase64(selectedPdfFile);
      const previewResult = await extractCvPreviewFromPdfBase64({
        pdf_base64: pdfBase64,
        language: "es",
        use_gemini: false,
      });

      if (!previewResult.extracted_data && !useGeminiForOcr) {
        throw new Error(
          "No se pudo extraer informacion del PDF en modo rapido. Intenta activar OCR con IA.",
        );
      }

      const result = useGeminiForOcr
        ? await extractCvFromPdfBase64({
            pdf_base64: pdfBase64,
            language: "es",
            use_gemini: true,
          })
        : previewResult;

      if (!result.accepted) {
        throw new Error(result.message || "No se pudo procesar el PDF.");
      }

      if (result.extracted_data) {
        const mapped = mapExtractedDataToCvData(result.extracted_data);
        setCvData((prev) => ({
          personalInfo: {
            name: mapped.personalInfo.name || prev.personalInfo.name,
            email: mapped.personalInfo.email || prev.personalInfo.email,
            phone: mapped.personalInfo.phone || prev.personalInfo.phone,
            location: mapped.personalInfo.location || prev.personalInfo.location,
            summary: mapped.personalInfo.summary || prev.personalInfo.summary,
          },
          experience: mapped.experience.length > 0 ? mapped.experience : prev.experience,
          education: mapped.education.length > 0 ? mapped.education : prev.education,
          skills: mapped.skills.length > 0 ? mapped.skills : prev.skills,
        }));
      }

      const confidenceLabel =
        typeof result.confidence_score === "number"
          ? ` Confianza OCR: ${result.confidence_score.toFixed(1)}%.`
          : "";

      setPdfUploadSuccess(
        `CV cargado y procesado. Revisa los datos extraidos en el formulario.${confidenceLabel}`,
      );
      setIsUploadModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error procesando el PDF";
      setPdfUploadError(message);
    } finally {
      setIsParsingPdf(false);
    }
  };

  return (
    <div className="size-full flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <span className="text-xl text-gray-900">AutoCV</span>
          </div>
        </div>

        {/* Selector de Tema */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Tema:</label>
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value as CVTheme)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {AVAILABLE_THEMES.map((theme) => (
              <option key={theme.value} value={theme.value}>
                {theme.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenUploadModal}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Subir CV (PDF)
          </button>
          <button
            onClick={handleApplyCV}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Aplicar CV
          </button>
          <button
            onClick={() => void handleGenerateCV("manual")}
            disabled={isGenerating}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generando..." : "Generar ahora"}
          </button>
        </div>
      </header>

      {apiError && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200 text-red-700 text-sm">
          {apiError}
        </div>
      )}

      {pdfUploadSuccess && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 text-blue-700 text-sm">
          {pdfUploadSuccess}
        </div>
      )}

      {!isFormValid && Object.keys(formErrors).length > 0 && (
        <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200 text-yellow-700 text-sm">
          <strong>Errores de validación:</strong>
          <ul className="mt-2 ml-4 text-xs space-y-1">
            {Object.entries(formErrors).map(([key, error]) => (
              <li key={key}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {!apiError && generatedYaml && (
        <div className="px-6 py-2 bg-green-50 border-b border-green-200 text-green-700 text-xs">
          YAML sincronizado y PDF actualizado automaticamente
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Formulario a la izquierda */}
        <div className="w-1/2 border-r border-gray-300">
          <CVForm
            data={cvData}
            onChange={setCvData}
            onValidationChange={handleValidationChange}
          />
        </div>

        {/* Previsualizador a la derecha */}
        <div className="w-1/2">
          <CVPreview
            data={cvData}
            generatedPdfBase64={generatedPdfBase64}
            onClearGeneratedPdf={() => setGeneratedPdfBase64(null)}
          />
        </div>
      </div>

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Autorizacion de Tratamiento de Datos - Carga de CV
            </DialogTitle>
            <DialogDescription>
              Antes de cargar tu hoja de vida, debes leer y aceptar este consentimiento.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[360px] overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 space-y-3">
            <p>
              Al subir tu PDF autorizas el tratamiento de tus datos personales exclusivamente para
              extraer informacion curricular y completar tu perfil en esta plataforma.
            </p>
            <p>
              Referencias normativas aplicables en Colombia: Ley 1581 de 2012, Decreto 1377 de
              2013 y principios de habeas data (finalidad, libertad, seguridad y confidencialidad).
            </p>
            <p>
              Tus datos se usan solo para procesamiento por el backend y generacion de tu CV. No
              se comparten con terceros para fines comerciales. Solo podran ser revelados si existe
              obligacion legal o requerimiento de autoridad competente.
            </p>
            <p>
              Puedes solicitar actualizacion, correccion o eliminacion de tus datos conforme a la
              normativa vigente. Este texto es informativo y no reemplaza asesoria legal.
            </p>
            <p>
              Gestion de calidad: el flujo se diseña con trazabilidad y mejora continua alineada a
              principios de ISO 9001 para control del proceso documental.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={hasAcceptedDataPolicy}
                onChange={(e) => setHasAcceptedDataPolicy(e.target.checked)}
                className="mt-1"
              />
              <span>
                Acepto el tratamiento de mis datos personales para la transformacion de mi CV en
                PDF y confirmo que soy titular de la informacion cargada.
              </span>
            </label>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePdfFileChange}
              />
              <button
                type="button"
                onClick={handleSelectPdfClick}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Seleccionar PDF
              </button>
              <span className="text-xs text-gray-600 truncate">
                {selectedPdfFile ? selectedPdfFile.name : "Ningun archivo seleccionado"}
              </span>
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={useGeminiForOcr}
                onChange={(e) => setUseGeminiForOcr(e.target.checked)}
                className="mt-1"
              />
              <span>
                Activar OCR con IA (Gemini): mas preciso pero un poco mas lento.
              </span>
            </label>

            {pdfUploadError && (
              <p className="text-sm text-red-600">{pdfUploadError}</p>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleProcessUploadedPdf()}
              disabled={isParsingPdf}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isParsingPdf ? "Procesando..." : "Aceptar y procesar PDF"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { CvRequestDTO } from "../dto/cv-api";

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

const DEFAULT_CV_API_URL =
  viteEnv.VITE_CV_RENDER_API_URL ?? "http://127.0.0.1:8000/api/v1/cv/render";
const DEFAULT_OCR_EXTRACT_CV_API_URL =
  viteEnv.VITE_OCR_EXTRACT_CV_API_URL ?? "http://127.0.0.1:8000/api/v1/ocr/extract-cv";
const DEFAULT_OCR_EXTRACT_CV_PREVIEW_API_URL =
  viteEnv.VITE_OCR_EXTRACT_CV_PREVIEW_API_URL ??
  "http://127.0.0.1:8000/api/v1/ocr/extract-cv-preview";

interface AnyObject {
  [key: string]: unknown;
}

export interface RenderCvApiResponse {
  accepted: boolean;
  message: string;
  output_path?: string | null;
  generated_yaml?: string | null;
  pdf_base64?: string | null;
  filename?: string | null;
}

export interface OcrExtractCvRequestDTO {
  pdf_base64: string;
  language?: string;
  use_gemini?: boolean;
}

export interface OcrExtractCvApiResponse {
  accepted: boolean;
  message: string;
  ocr_text?: string | null;
  extracted_data?: Record<string, unknown> | null;
  suggested_cv_document?: Record<string, unknown> | null;
  suggested_yaml?: string | null;
  confidence_score?: number | null;
}

function extractBase64FromResponse(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Respuesta invalida: formato inesperado");
  }

  const data = payload as AnyObject;
  const candidates = [
    data.base64,
    data.pdf_base64,
    data.file_base64,
    data.content,
    data.result,
    (data.data as AnyObject | undefined)?.base64,
    (data.data as AnyObject | undefined)?.pdf_base64,
    (data.data as AnyObject | undefined)?.file_base64,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  throw new Error("No se encontro base64 en la respuesta del endpoint");
}

function parseRenderResponse(payload: unknown): RenderCvApiResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("Respuesta invalida: formato inesperado");
  }

  const data = payload as AnyObject;
  const accepted = Boolean(data.accepted);
  const message = typeof data.message === "string" ? data.message : "Respuesta sin mensaje";
  const generatedYaml =
    typeof data.generated_yaml === "string" ? data.generated_yaml : null;

  let pdfBase64: string | null = null;
  try {
    pdfBase64 = extractBase64FromResponse(payload);
  } catch {
    pdfBase64 = null;
  }

  return {
    accepted,
    message,
    output_path: typeof data.output_path === "string" ? data.output_path : null,
    generated_yaml: generatedYaml,
    pdf_base64: pdfBase64,
    filename: typeof data.filename === "string" ? data.filename : null,
  };
}

function parseOcrResponse(payload: unknown, fallbackMessage: string): OcrExtractCvApiResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("Respuesta OCR invalida: formato inesperado");
  }

  const data = payload as AnyObject;
  return {
    accepted: Boolean(data.accepted ?? true),
    message: typeof data.message === "string" ? data.message : fallbackMessage,
    ocr_text: typeof data.ocr_text === "string" ? data.ocr_text : null,
    extracted_data:
      (data.extracted_data as Record<string, unknown> | undefined) ??
      (data.data as Record<string, unknown> | undefined) ??
      null,
    suggested_cv_document:
      (data.suggested_cv_document as Record<string, unknown> | undefined) ?? null,
    suggested_yaml: typeof data.suggested_yaml === "string" ? data.suggested_yaml : null,
    confidence_score: typeof data.confidence_score === "number" ? data.confidence_score : null,
  };
}

export async function renderCv(
  request: CvRequestDTO,
  apiUrl: string = DEFAULT_CV_API_URL,
): Promise<RenderCvApiResponse> {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error ${response.status}: ${text}`);
  }

  const result = (await response.json()) as unknown;
  return parseRenderResponse(result);
}

export async function generateCvBase64(
  request: CvRequestDTO,
  apiUrl: string = DEFAULT_CV_API_URL,
): Promise<string> {
  const result = await renderCv(request, apiUrl);
  if (!result.pdf_base64) {
    throw new Error("La API respondio sin pdf_base64");
  }
  return result.pdf_base64;
}

export async function extractCvFromPdfBase64(
  request: OcrExtractCvRequestDTO,
  apiUrl: string = DEFAULT_OCR_EXTRACT_CV_API_URL,
): Promise<OcrExtractCvApiResponse> {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error ${response.status}: ${text}`);
  }

  const result = (await response.json()) as unknown;
  return parseOcrResponse(result, "CV extraido correctamente");
}

export async function extractCvPreviewFromPdfBase64(
  request: OcrExtractCvRequestDTO,
  apiUrl: string = DEFAULT_OCR_EXTRACT_CV_PREVIEW_API_URL,
): Promise<OcrExtractCvApiResponse> {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error ${response.status}: ${text}`);
  }

  const result = (await response.json()) as unknown;
  return parseOcrResponse(result, "Preview OCR generado correctamente");
}

import type {
  AtsResult,
  CityOption,
  ClientEventType,
  CvSnapshot,
  EscoItem,
  EscoList,
  EventMetadata,
  EventRow,
  ExperimentGroup,
  ExperimentMetrics,
  ExperimentSession,
  ExportResult,
  InstitutionOption,
  OccupationSkills,
  SessionLiveMetrics,
  SessionRow,
  SessionState,
  SkillCreate,
  SkillRecord,
  StartSessionRequest,
} from "../dto/experiment";

export const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL ??
    "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");

const RESEARCH_KEY_STORAGE = "autocv_research_key";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function getResearchKey(): string {
  try {
    return sessionStorage.getItem(RESEARCH_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setResearchKey(key: string): void {
  try {
    sessionStorage.setItem(RESEARCH_KEY_STORAGE, key);
  } catch {
    // Sin almacenamiento disponible: la clave solo dura mientras la página está abierta.
  }
}

function readableError(status: number, body: string): string {
  try {
    const detail = (JSON.parse(body) as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length) {
      return detail.map((item) => (item as { msg?: string }).msg ?? "").filter(Boolean).join(". ");
    }
  } catch {
    // La respuesta no era JSON.
  }
  if (status === 401) return "La clave de investigador no es válida.";
  if (status >= 500) return "El servidor tuvo un problema. Intenta de nuevo en un momento.";
  return `Error ${status}`;
}

interface RequestOptions extends RequestInit {
  research?: boolean;
}

async function raw(path: string, { research, headers, ...init }: RequestOptions = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(research && getResearchKey() ? { "X-Research-Key": getResearchKey() } : {}),
        ...(headers ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("No hay conexión con el servidor. Revisa tu internet o que el backend esté activo.", 0);
  }
  if (!response.ok) {
    throw new ApiError(readableError(response.status, await response.text()), response.status);
  }
  return response;
}

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const response = await raw(path, options);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const json = (body: unknown) => JSON.stringify(body);

// ---------- Sesión del participante ----------

export function startExperimentSession(payload: StartSessionRequest): Promise<ExperimentSession> {
  return request("/experiment/sessions", { method: "POST", body: json(payload) });
}

export function getSessionState(sessionId: string): Promise<SessionState> {
  return request(`/experiment/sessions/${sessionId}`);
}

export function postEvent(sessionId: string, eventType: ClientEventType, metadata?: EventMetadata, detail?: string) {
  return request(`/experiment/sessions/${sessionId}/events`, {
    method: "POST",
    body: json({ event_type: eventType, metadata, detail }),
  });
}

export function listSkills(sessionId: string): Promise<SkillRecord[]> {
  return request(`/experiment/sessions/${sessionId}/skills`);
}

export function addSkill(sessionId: string, skill: SkillCreate): Promise<SkillRecord> {
  return request(`/experiment/sessions/${sessionId}/skills`, { method: "POST", body: json(skill) });
}

export function removeSkill(sessionId: string, skillId: number): Promise<void> {
  return request(`/experiment/sessions/${sessionId}/skills/${skillId}`, { method: "DELETE" });
}

export function getSessionMetrics(sessionId: string, signal?: AbortSignal): Promise<SessionLiveMetrics> {
  return request(`/experiment/sessions/${sessionId}/metrics`, { signal });
}

export function previewAts(snapshot: CvSnapshot, escoCoveragePct: number, signal?: AbortSignal): Promise<AtsResult> {
  return request("/experiment/ats/preview", {
    method: "POST",
    body: json({ ...snapshot, esco_coverage_pct: escoCoveragePct }),
    signal,
  });
}

export function exportSession(sessionId: string, snapshot: CvSnapshot): Promise<ExportResult> {
  return request(`/experiment/sessions/${sessionId}/export`, { method: "POST", body: json(snapshot) });
}

export function submitSurvey(sessionId: string, scores: number[]): Promise<{ satisfaction: number }> {
  return request(`/experiment/sessions/${sessionId}/survey`, {
    method: "POST",
    body: json({ responses: scores.map((score, index) => ({ item: index + 1, score })) }),
  });
}

export function endSession(sessionId: string): Promise<{ ended_at: string }> {
  return request(`/experiment/sessions/${sessionId}/end`, { method: "POST" });
}

// ---------- Consola del investigador ----------

export function getMetrics(signal?: AbortSignal): Promise<ExperimentMetrics> {
  return request("/experiment/metrics", { research: true, signal });
}

export function listSessions(params: { group?: ExperimentGroup; limit?: number; offset?: number } = {}): Promise<SessionRow[]> {
  const query = new URLSearchParams();
  if (params.group) query.set("group", params.group);
  query.set("limit", String(params.limit ?? 100));
  query.set("offset", String(params.offset ?? 0));
  return request(`/experiment/sessions?${query}`, { research: true });
}

export function listEvents(params: { sessionId?: string; limit?: number } = {}): Promise<EventRow[]> {
  const query = new URLSearchParams({ limit: String(params.limit ?? 500) });
  if (params.sessionId) query.set("session_id", params.sessionId);
  return request(`/experiment/events?${query}`, { research: true });
}

export type CsvResource = "sessions" | "events" | "skills" | "survey";

/** Descarga un CSV enviando la clave por header (un enlace normal no puede enviarla). */
export async function downloadCsv(resource: CsvResource): Promise<void> {
  const response = await raw(`/experiment/export/${resource}.csv`, { research: true });
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `autocv_${resource}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ---------- ESCO (solo grupo B) ----------

async function escoList<T>(path: string, key: string, signal?: AbortSignal): Promise<EscoList<T>> {
  const response = await raw(path, { signal });
  const body = (await response.json()) as Record<string, unknown>;
  return {
    items: (body[key] as T[]) ?? [],
    degraded: response.headers.get("X-ESCO-Degraded") === "1" || body.degraded === true,
  };
}

export function suggestEscoSkills(text: string, signal?: AbortSignal): Promise<EscoList<EscoItem>> {
  const query = new URLSearchParams({ text, language: "es", limit: "8" });
  return escoList(`/esco/skills/suggest?${query}`, "skills", signal);
}

export function suggestEscoOccupations(text: string, signal?: AbortSignal): Promise<EscoList<EscoItem>> {
  const query = new URLSearchParams({ text, language: "es", limit: "8" });
  return escoList(`/esco/occupations/suggest?${query}`, "occupations", signal);
}

export function getOccupationSkills(occupationUri: string, signal?: AbortSignal): Promise<OccupationSkills> {
  const query = new URLSearchParams({ occupation_uri: occupationUri, language: "es", limit: "15" });
  return request(`/esco/occupations/skills?${query}`, { signal });
}

// ---------- Catálogos (los dos grupos) ----------

export function searchCities(text: string, country: string, signal?: AbortSignal): Promise<CityOption[]> {
  const query = new URLSearchParams({ text, country, limit: "10" });
  return request(`/catalog/cities?${query}`, { signal });
}

export function searchInstitutions(text: string, signal?: AbortSignal): Promise<InstitutionOption[]> {
  const query = new URLSearchParams({ text, limit: "10" });
  return request(`/catalog/institutions?${query}`, { signal });
}

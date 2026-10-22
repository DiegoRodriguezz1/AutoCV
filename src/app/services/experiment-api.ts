const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL ??
    "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");

export interface ExperimentSession {
  id: string;
  group: "A" | "B";
  started_at: string;
  consent_given_at: string;
}

export interface EscoSkillSuggestion {
  uri: string;
  title: string;
  alternative_labels: string[];
}

export interface EscoOccupationSuggestion {
  uri: string;
  title: string;
  alternative_labels: string[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

export function startExperimentSession(group?: "A" | "B"): Promise<ExperimentSession> {
  return request<ExperimentSession>("/experiment/sessions", {
    method: "POST",
    body: JSON.stringify({ group }),
  });
}

export function recordExperimentEvent(
  sessionId: string,
  eventType: string,
  detail?: string,
  metadata?: Record<string, unknown>,
): Promise<unknown> {
  return request(`/experiment/sessions/${sessionId}/events`, {
    method: "POST",
    body: JSON.stringify({ event_type: eventType, detail, metadata }),
  });
}

export function saveExperimentSkill(
  sessionId: string,
  inputLabel: string,
  suggestion?: EscoSkillSuggestion,
): Promise<unknown> {
  const params = new URLSearchParams({ input_label: inputLabel });
  if (suggestion?.uri) params.set("esco_uri", suggestion.uri);
  if (suggestion?.title) params.set("preferred_label", suggestion.title);
  return request(`/experiment/sessions/${sessionId}/skills?${params.toString()}`, { method: "POST" });
}

export function submitExperimentSurvey(
  sessionId: string,
  responses: Record<string, number>,
): Promise<unknown> {
  return request(`/experiment/sessions/${sessionId}/survey`, {
    method: "POST",
    body: JSON.stringify({ responses }),
  });
}

export function searchEscoSkills(text: string): Promise<{ skills: EscoSkillSuggestion[] }> {
  return request(`/esco/skills/search?text=${encodeURIComponent(text)}&language=es&limit=6`);
}

export function searchEscoOccupations(text: string): Promise<{ occupations: EscoOccupationSuggestion[] }> {
  return request(`/esco/occupations/suggest?text=${encodeURIComponent(text)}&language=es&limit=6`);
}

export function searchCountries(text: string): Promise<string[]> {
  const countries = ["Colombia", "Argentina", "Chile", "Ecuador", "España", "México", "Perú", "Uruguay"];
  const query = text.trim().toLocaleLowerCase();
  return Promise.resolve(query ? countries.filter((country) => country.toLocaleLowerCase().includes(query)) : countries);
}
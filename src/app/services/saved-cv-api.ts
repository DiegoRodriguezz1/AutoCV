import { request } from "./experiment-api";

export interface SavedCvSummary {
  id: number;
  name: string;
  updated_at: string;
}

export interface SavedCv extends SavedCvSummary {
  yaml_content: string;
  created_at: string;
}

export interface SavedCvWrite {
  name: string;
  yaml_content: string;
}

// Guardan datos personales: el backend pide la misma clave que la consola del investigador.
const json = (body: unknown) => JSON.stringify(body);

export function listSavedCvs(): Promise<SavedCvSummary[]> {
  return request("/cv/saved", { research: true });
}

export function getSavedCv(id: number): Promise<SavedCv> {
  return request(`/cv/saved/${id}`, { research: true });
}

export function createSavedCv(payload: SavedCvWrite): Promise<SavedCv> {
  return request("/cv/saved", { method: "POST", body: json(payload), research: true });
}

export function updateSavedCv(id: number, payload: SavedCvWrite): Promise<SavedCv> {
  return request(`/cv/saved/${id}`, { method: "PUT", body: json(payload), research: true });
}

export function deleteSavedCv(id: number): Promise<void> {
  return request(`/cv/saved/${id}`, { method: "DELETE", research: true });
}

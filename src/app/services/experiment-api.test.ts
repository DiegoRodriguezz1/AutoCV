import { afterEach, describe, expect, it, vi } from "vitest";

// API_BASE_URL se calcula al importar el módulo, así que cada caso lo importa de nuevo.
async function apiBaseUrl(env: Record<string, string | boolean>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value as string);
  return (await import("./experiment-api")).API_BASE_URL;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("API_BASE_URL", () => {
  it("usa VITE_API_BASE_URL si existe (sin barra final)", async () => {
    expect(await apiBaseUrl({ VITE_API_BASE_URL: "https://api.ejemplo.com/api/v1/" })).toBe("https://api.ejemplo.com/api/v1");
  });

  it("si falta, la deduce de VITE_CV_RENDER_API_URL", async () => {
    expect(
      await apiBaseUrl({ VITE_API_BASE_URL: "", VITE_CV_RENDER_API_URL: "https://bautocv.onrender.com/api/v1/cv/render" }),
    ).toBe("https://bautocv.onrender.com/api/v1");
  });

  it("en producción sin variables apunta a Render, nunca a localhost", async () => {
    expect(await apiBaseUrl({ VITE_API_BASE_URL: "", VITE_CV_RENDER_API_URL: "", PROD: true })).toBe(
      "https://bautocv.onrender.com/api/v1",
    );
  });

  it("en desarrollo sin variables usa el backend local", async () => {
    expect(await apiBaseUrl({ VITE_API_BASE_URL: "", VITE_CV_RENDER_API_URL: "", PROD: false })).toBe(
      "http://127.0.0.1:8000/api/v1",
    );
  });
});

import { useEffect, useState } from "react";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { Link } from "react-router";

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL ??
    "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");

type Metrics = {
  sessions: number;
  time_to_cv_avg: number | null;
  esco_coverage_avg: number | null;
  ats_score_avg: number | null;
  satisfaction_avg: number | null;
};

type SessionRow = {
  id: string;
  group: string;
  started_at: string;
  time_to_cv_min: number | null;
  esco_coverage_pct: number | null;
  ats_score: number | null;
  satisfaction: number | null;
  edits: number;
};

type EventRow = {
  id: number;
  session_id: string;
  group: string;
  event_type: string;
  detail: string | null;
  ts: string;
};

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(`Error ${response.status}`);
  return (await response.json()) as T;
}

const format = (value: number | null, suffix = "") => value == null ? "-" : `${value.toFixed(1)}${suffix}`;

export function ResearchDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const [nextMetrics, nextSessions, nextEvents] = await Promise.all([
        get<Metrics>("/experiment/metrics"),
        get<SessionRow[]>("/experiment/sessions"),
        get<EventRow[]>("/experiment/events"),
      ]);
      setMetrics(nextMetrics);
      setSessions(nextSessions);
      setEvents(nextEvents);
    } catch {
      setError("No se pudo cargar la consola. Verifica que el backend y PostgreSQL estén activos.");
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Link>
            <h1 className="mt-3 text-3xl font-semibold">Consola del investigador</h1>
            <p className="mt-1 text-slate-600">Datos experimentales consultados directamente desde PostgreSQL.</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
        </header>

        {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}

        <section aria-label="Métricas principales" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Sesiones", metrics?.sessions ?? 0],
            ["TimeToCV medio", format(metrics?.time_to_cv_avg ?? null, " min")],
            ["Cobertura ESCO", format(metrics?.esco_coverage_avg ?? null, "%")],
            ["ATS medio", format(metrics?.ats_score_avg ?? null)],
            ["Satisfacción", format(metrics?.satisfaction_avg ?? null, "/5")],
          ].map(([label, value]) => <article key={label} className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><strong className="mt-2 block text-2xl">{value}</strong></article>)}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Sesiones registradas</h2><a href={`${API_BASE_URL}/experiment/export/sessions.csv`} className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"><Download className="h-4 w-4" /> CSV</a></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">ID</th><th className="p-2">Grupo</th><th className="p-2">TimeToCV</th><th className="p-2">ESCO</th><th className="p-2">ATS</th><th className="p-2">Satisfacción</th><th className="p-2">Ediciones</th></tr></thead><tbody>{sessions.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="p-2 font-mono text-xs">{row.id.slice(0, 8)}</td><td className="p-2">{row.group}</td><td className="p-2">{format(row.time_to_cv_min, " min")}</td><td className="p-2">{format(row.esco_coverage_pct, "%")}</td><td className="p-2">{format(row.ats_score)}</td><td className="p-2">{format(row.satisfaction, "/5")}</td><td className="p-2">{row.edits}</td></tr>)}</tbody></table></div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Registro de eventos</h2><a href={`${API_BASE_URL}/experiment/export/events.csv`} className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"><Download className="h-4 w-4" /> CSV</a></div>
          <div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Fecha</th><th className="p-2">Sesión</th><th className="p-2">Grupo</th><th className="p-2">Evento</th><th className="p-2">Detalle</th></tr></thead><tbody>{events.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="p-2 whitespace-nowrap">{new Date(row.ts).toLocaleString()}</td><td className="p-2 font-mono text-xs">{row.session_id.slice(0, 8)}</td><td className="p-2">{row.group}</td><td className="p-2">{row.event_type}</td><td className="p-2">{row.detail ?? "-"}</td></tr>)}</tbody></table></div>
        </section>
      </div>
    </main>
  );
}
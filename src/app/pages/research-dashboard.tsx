import { FormEvent, ReactNode, useCallback, useEffect, useId, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, CircleAlert, Download, KeyRound, RefreshCw } from "lucide-react";
import { Link } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  LabelList,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { EventRow, ExperimentGroup, ExperimentMetrics, FormSection, SessionRow } from "../dto/experiment";
import { FORM_SECTIONS } from "../dto/experiment";
import {
  CsvResource,
  downloadCsv,
  getMetrics,
  getResearchKey,
  listEvents,
  listSessions,
  setResearchKey,
} from "../services/experiment-api";

const GROUP_COLOR: Record<ExperimentGroup, string> = { A: "#b45309", B: "#0f766e" };
const GROUP_NAME: Record<ExperimentGroup, string> = { A: "Grupo A (control)", B: "Grupo B (AutoCV)" };
const SECTION_COLOR: Record<FormSection, string> = {
  personal: "#1d4ed8",
  education: "#7c3aed",
  experience: "#be185d",
  skills: "#15803d",
};
const SECTION_LABEL: Record<FormSection, string> = {
  personal: "Datos",
  education: "Formación",
  experience: "Experiencia",
  skills: "Habilidades",
};
const PAGE_SIZE = 20;

const fmt = (value: number | null | undefined, digits = 1, suffix = "") =>
  value == null ? "—" : `${value.toFixed(digits)}${suffix}`;

/**
 * El grupo B lleva rayas además del color, para no depender solo del color.
 * Recharts solo dibuja <defs> si es hijo directo del gráfico, por eso es un elemento y no un componente.
 */
const groupPatterns = (
  <defs>
    <pattern id="pattern-b" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="8" height="8" fill={GROUP_COLOR.B} />
      <line x1="0" y1="0" x2="0" y2="8" stroke="#ffffff" strokeWidth="3" />
    </pattern>
  </defs>
);

// Textos y líneas de las gráficas heredan el color del tema (claro, oscuro o alto contraste).
const TICK = { fill: "currentColor", fontSize: 13 };
const GRID = "#9ca3af";

/** Muestra del color (y rayas en B) junto al nombre del grupo; el texto conserva el color normal. */
function Swatch({ group }: { group: ExperimentGroup }) {
  return (
    <svg aria-hidden="true" width="14" height="14" className="mr-2 inline-block align-[-2px]">
      {group === "B" ? groupPatterns : null}
      <rect width="14" height="14" fill={groupFill(group)} stroke="currentColor" />
    </svg>
  );
}

const groupFill = (group: ExperimentGroup) => (group === "B" ? "url(#pattern-b)" : GROUP_COLOR.A);

function ChartCard({ title, description, table, children }: { title: string; description: string; table: ReactNode; children: ReactNode }) {
  const [showTable, setShowTable] = useState(false);
  const id = useId();
  return (
    <figure className="space-y-3 rounded-lg border border-gray-400 bg-white p-4" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={`${id}-t`} className="text-base font-bold text-gray-900">{title}</h3>
          <p id={`${id}-d`} className="text-sm text-gray-800">{description}</p>
        </div>
        <button
          type="button"
          aria-expanded={showTable}
          aria-controls={`${id}-table`}
          onClick={() => setShowTable((value) => !value)}
          className="min-h-11 rounded-md border border-gray-500 px-3 text-sm font-semibold text-gray-900 hover:bg-gray-100"
        >
          {showTable ? "Ocultar tabla" : "Ver como tabla"}
        </button>
      </div>
      <div aria-hidden="true" className="h-64">
        {children}
      </div>
      <div id={`${id}-table`} hidden={!showTable} className="overflow-x-auto">
        {table}
      </div>
    </figure>
  );
}

function SimpleTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full border-collapse text-sm text-gray-900">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-gray-500 text-left">
          {headers.map((header) => (
            <th key={header} scope="col" className="p-2">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-b border-gray-300">
            {row.map((cell, cellIndex) =>
              cellIndex === 0 ? (
                <th key={cellIndex} scope="row" className="p-2 text-left font-semibold">{cell}</th>
              ) : (
                <td key={cellIndex} className="p-2 tabular-nums">{cell}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GroupBarChart({ metrics, field, digits, unit, sdField, domain }: {
  metrics: ExperimentMetrics;
  field: "time_to_cv_avg" | "esco_coverage_avg" | "ats_score_avg" | "satisfaction_avg";
  digits: number;
  unit: string;
  sdField?: "time_to_cv_sd";
  domain?: [number, number];
}) {
  const data = (["A", "B"] as ExperimentGroup[]).map((group) => ({
    group,
    name: GROUP_NAME[group],
    value: metrics.by_group[group][field] ?? 0,
    sd: sdField ? metrics.by_group[group][sdField] ?? 0 : 0,
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
        {groupPatterns}
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="name" tick={TICK} />
        <YAxis domain={domain ?? [0, "auto"]} tick={TICK} unit={unit} />
        <Tooltip formatter={(value: number) => `${value.toFixed(digits)}${unit}`} />
        <Bar dataKey="value" isAnimationActive={false} stroke="currentColor" strokeWidth={1}>
          {data.map((item) => (
            <Cell key={item.group} fill={groupFill(item.group)} />
          ))}
          <LabelList dataKey="value" position="top" formatter={(value: number) => `${value.toFixed(digits)}${unit}`} fill="currentColor" />
          {sdField && <ErrorBar dataKey="sd" width={8} stroke="currentColor" />}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Kpis({ metrics }: { metrics: ExperimentMetrics }) {
  const { A, B } = metrics.by_group;
  const t = metrics.targets;
  const rows = [
    { label: "Sesiones completas", a: String(A.n), b: String(B.n), target: `${metrics.sessions_completed} de ${metrics.sessions_started} iniciadas`, ok: null },
    { label: "TimeToCV medio", a: fmt(A.time_to_cv_avg, 1, " min"), b: fmt(B.time_to_cv_avg, 1, " min"), target: `B < ${t.time_to_cv_b_max} min`, ok: B.time_to_cv_avg == null ? null : B.time_to_cv_avg < t.time_to_cv_b_max },
    { label: "Cobertura ESCO", a: fmt(A.esco_coverage_avg, 0, " %"), b: fmt(B.esco_coverage_avg, 0, " %"), target: `B ≥ ${t.esco_coverage_b_min} %`, ok: B.esco_coverage_avg == null ? null : B.esco_coverage_avg >= t.esco_coverage_b_min },
    { label: "Puntaje ATS medio", a: fmt(A.ats_score_avg, 0), b: fmt(B.ats_score_avg, 0), target: `≥ ${t.ats_min}`, ok: B.ats_score_avg == null ? null : B.ats_score_avg >= t.ats_min },
    { label: "Satisfacción", a: fmt(A.satisfaction_avg, 2, " / 5"), b: fmt(B.satisfaction_avg, 2, " / 5"), target: `≥ ${t.satisfaction_min}`, ok: B.satisfaction_avg == null ? null : B.satisfaction_avg >= t.satisfaction_min },
    { label: "Ediciones medias", a: fmt(A.edits_avg, 1), b: fmt(B.edits_avg, 1), target: "Referencia", ok: null },
  ];
  return (
    <section aria-labelledby="kpi-title" className="rounded-lg border border-gray-400 bg-white p-4">
      <h2 id="kpi-title" className="mb-3 text-lg font-bold text-gray-900">Indicadores A vs B</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-base text-gray-900">
          <caption className="sr-only">Promedio de cada indicador por grupo, meta y si el grupo B la cumple</caption>
          <thead>
            <tr className="border-b-2 border-gray-500 text-left">
              <th scope="col" className="p-2">Indicador</th>
              <th scope="col" className="p-2"><Swatch group="A" />Grupo A · control</th>
              <th scope="col" className="p-2"><Swatch group="B" />Grupo B · AutoCV</th>
              <th scope="col" className="p-2">Meta</th>
              <th scope="col" className="p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-gray-300">
                <th scope="row" className="p-2 text-left font-semibold">{row.label}</th>
                <td className="p-2 tabular-nums">{row.a}</td>
                <td className="p-2 tabular-nums">{row.b}</td>
                <td className="p-2">{row.target}</td>
                <td className="p-2">
                  {row.ok === null ? (
                    <span className="text-gray-700">—</span>
                  ) : row.ok ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Cumple</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-red-800"><CircleAlert className="h-4 w-4" aria-hidden="true" />No cumple</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ResearchDashboardPage() {
  const [metrics, setMetrics] = useState<ExperimentMetrics | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyInput, setKeyInput] = useState(getResearchKey);
  const [groupFilter, setGroupFilter] = useState<"" | ExperimentGroup>("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextMetrics, nextSessions, nextEvents] = await Promise.all([
        getMetrics(),
        listSessions({ limit: 1000 }),
        listEvents({ sessionId: sessionFilter || undefined, limit: 500 }),
      ]);
      setMetrics(nextMetrics);
      setSessions(nextSessions);
      setEvents(nextEvents);
      setError(null);
      setStatus(`Datos actualizados: ${nextSessions.length} sesiones y ${nextMetrics.events} eventos.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la consola.");
    } finally {
      setLoading(false);
    }
  }, [sessionFilter]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const saveKey = (event: FormEvent) => {
    event.preventDefault();
    setResearchKey(keyInput.trim());
    void load();
  };

  const filtered = useMemo(() => sessions.filter((row) => !groupFilter || row.group === groupFilter), [sessions, groupFilter]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const scatter = useMemo(() => {
    const done = sessions.filter((row) => row.time_to_cv_min != null).slice().reverse();
    return (["A", "B"] as ExperimentGroup[]).map((group) => ({
      group,
      points: done
        .map((row, index) => ({ x: index + 1, y: row.time_to_cv_min as number, id: row.id.slice(0, 8), group: row.group }))
        .filter((point) => point.group === group),
    }));
  }, [sessions]);

  const sectionData = metrics
    ? (["A", "B"] as ExperimentGroup[]).map((group) => ({
        name: GROUP_NAME[group],
        ...Object.fromEntries(FORM_SECTIONS.map((section) => [section, metrics.by_group[group].section_seconds_avg[section] ?? 0])),
      }))
    : [];

  const download = async (resource: CsvResource) => {
    try {
      await downloadCsv(resource);
      setStatus(`Descargado ${resource}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el CSV.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link to="/" className="inline-flex min-h-11 items-center gap-2 font-semibold text-gray-800 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Volver al inicio
            </Link>
            <h1 className="text-3xl font-bold">Consola del investigador</h1>
            <p className="text-base text-gray-800">Experimento A/B de AutoCV: datos registrados por el servidor a partir del registro de eventos.</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-500 bg-white px-4 font-semibold hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Actualizar
          </button>
        </header>

        <form onSubmit={saveKey} className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-400 bg-white p-4">
          <div className="space-y-1">
            <label htmlFor="research-key" className="flex items-center gap-2 font-semibold">
              <KeyRound className="h-4 w-4" aria-hidden="true" /> Clave de investigador
            </label>
            <p id="research-key-help" className="text-sm text-gray-800">Solo si el servidor tiene RESEARCH_API_KEY. Se guarda en esta pestaña.</p>
            <input
              id="research-key"
              type="password"
              autoComplete="off"
              value={keyInput}
              aria-describedby="research-key-help"
              onChange={(event) => setKeyInput(event.target.value)}
              className="min-h-11 w-72 rounded-md border border-gray-500 bg-white px-3"
            />
          </div>
          <button type="submit" className="min-h-11 rounded-md bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800">
            Usar clave
          </button>
        </form>

        <p className="sr-only" role="status" aria-live="polite">{status}</p>
        {error && (
          <p role="alert" className="rounded-md border border-red-700 bg-red-50 p-3 font-semibold text-red-800">
            {error} Verifica que el backend esté activo y la clave sea correcta.
          </p>
        )}

        {metrics && <Kpis metrics={metrics} />}

        {metrics && (
          <section aria-labelledby="charts-title" className="space-y-4">
            <h2 id="charts-title" className="text-lg font-bold">Gráficas</h2>
            <p className="text-sm text-gray-800">
              Grupo A en color ámbar liso; grupo B en verde con rayas diagonales. Cada gráfica tiene una tabla equivalente.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard
                title="TimeToCV medio por grupo"
                description="Minutos desde el inicio hasta exportar el CV. Las líneas muestran la desviación estándar. Meta: grupo B por debajo de 30 minutos."
                table={
                  <SimpleTable
                    caption="TimeToCV por grupo"
                    headers={["Grupo", "Media (min)", "Desviación (min)", "n"]}
                    rows={(["A", "B"] as ExperimentGroup[]).map((g) => [GROUP_NAME[g], fmt(metrics.by_group[g].time_to_cv_avg, 2), fmt(metrics.by_group[g].time_to_cv_sd, 2), metrics.by_group[g].n])}
                  />
                }
              >
                <GroupBarChart metrics={metrics} field="time_to_cv_avg" sdField="time_to_cv_sd" digits={1} unit=" min" />
              </ChartCard>

              <ChartCard
                title="Cobertura ESCO por grupo"
                description="Porcentaje de habilidades asociadas a una URI de ESCO. Meta: 80 % o más en el grupo B."
                table={
                  <SimpleTable
                    caption="Cobertura ESCO por grupo"
                    headers={["Grupo", "Cobertura media (%)"]}
                    rows={(["A", "B"] as ExperimentGroup[]).map((g) => [GROUP_NAME[g], fmt(metrics.by_group[g].esco_coverage_avg, 1)])}
                  />
                }
              >
                <GroupBarChart metrics={metrics} field="esco_coverage_avg" digits={0} unit=" %" domain={[0, 100]} />
              </ChartCard>

              <ChartCard
                title="Puntaje ATS medio por grupo"
                description="Puntaje de 0 a 100 calculado al exportar. Meta: 75 o más."
                table={
                  <SimpleTable
                    caption="Puntaje ATS por grupo"
                    headers={["Grupo", "ATS medio"]}
                    rows={(["A", "B"] as ExperimentGroup[]).map((g) => [GROUP_NAME[g], fmt(metrics.by_group[g].ats_score_avg, 1)])}
                  />
                }
              >
                <GroupBarChart metrics={metrics} field="ats_score_avg" digits={0} unit="" domain={[0, 100]} />
              </ChartCard>

              <ChartCard
                title="Tiempo medio por sección"
                description="Segundos promedio en cada sección del formulario, apilados por grupo. Sirve para encontrar cuellos de botella."
                table={
                  <SimpleTable
                    caption="Segundos medios por sección y grupo"
                    headers={["Grupo", ...FORM_SECTIONS.map((s) => `${SECTION_LABEL[s]} (s)`)]}
                    rows={(["A", "B"] as ExperimentGroup[]).map((g) => [GROUP_NAME[g], ...FORM_SECTIONS.map((s) => fmt(metrics.by_group[g].section_seconds_avg[s], 0))])}
                  />
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionData} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis type="number" unit=" s" tick={TICK} />
                    <YAxis type="category" dataKey="name" width={130} tick={TICK} />
                    <Tooltip formatter={(value: number) => `${Math.round(value)} s`} />
                    <Legend />
                    {FORM_SECTIONS.map((section) => (
                      <Bar key={section} dataKey={section} name={SECTION_LABEL[section]} stackId="s" fill={SECTION_COLOR[section]} stroke="#ffffff" isAnimationActive={false}>
                        <LabelList dataKey={section} position="center" fill="#ffffff" formatter={(value: number) => (value >= 5 ? Math.round(value) : "")} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="TimeToCV de cada sesión"
                description="Cada punto es una sesión exportada, en orden de inicio. Grupo A con círculos; grupo B con triángulos."
                table={
                  <SimpleTable
                    caption="TimeToCV por sesión"
                    headers={["Sesión", "Grupo", "Orden", "TimeToCV (min)"]}
                    rows={scatter.flatMap((series) => series.points.map((p) => [p.id, p.group, p.x, p.y.toFixed(2)]))}
                  />
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis type="number" dataKey="x" name="Orden" allowDecimals={false} tick={TICK} />
                    <YAxis type="number" dataKey="y" name="TimeToCV" unit=" min" tick={TICK} />
                    <Tooltip formatter={(value: number) => value.toFixed(2)} />
                    <Legend />
                    {scatter.map((series) => (
                      <Scatter
                        key={series.group}
                        name={GROUP_NAME[series.group]}
                        data={series.points}
                        fill={GROUP_COLOR[series.group]}
                        shape={series.group === "A" ? "circle" : "triangle"}
                        isAnimationActive={false}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Satisfacción por grupo"
                description="Promedio de los 4 ítems Likert (1 a 5). Meta: 4,0 o más."
                table={
                  <SimpleTable
                    caption="Satisfacción por grupo"
                    headers={["Grupo", "Satisfacción media"]}
                    rows={(["A", "B"] as ExperimentGroup[]).map((g) => [GROUP_NAME[g], fmt(metrics.by_group[g].satisfaction_avg, 2)])}
                  />
                }
              >
                <GroupBarChart metrics={metrics} field="satisfaction_avg" digits={2} unit="" domain={[0, 5]} />
              </ChartCard>
            </div>
          </section>
        )}

        <section aria-labelledby="csv-title" className="space-y-3 rounded-lg border border-gray-400 bg-white p-4">
          <h2 id="csv-title" className="text-lg font-bold">Exportar datos (CSV para Excel o pandas)</h2>
          <div className="flex flex-wrap gap-2">
            {(["sessions", "events", "skills", "survey"] as CsvResource[]).map((resource) => (
              <button
                key={resource}
                type="button"
                onClick={() => void download(resource)}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-500 px-4 font-semibold hover:bg-gray-100"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {{ sessions: "Sesiones", events: "Eventos", skills: "Habilidades", survey: "Encuestas" }[resource]}
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="sessions-title" className="space-y-3 rounded-lg border border-gray-400 bg-white p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="sessions-title" className="text-lg font-bold">Sesiones registradas ({filtered.length})</h2>
            <div className="space-y-1">
              <label htmlFor="group-filter" className="block text-sm font-semibold">Filtrar por grupo</label>
              <select
                id="group-filter"
                value={groupFilter}
                onChange={(event) => {
                  setGroupFilter(event.target.value as "" | ExperimentGroup);
                  setPage(0);
                }}
                className="min-h-11 rounded-md border border-gray-500 bg-white px-3"
              >
                <option value="">Todos</option>
                <option value="A">Grupo A</option>
                <option value="B">Grupo B</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Sesiones del experimento, página {page + 1} de {pages}</caption>
              <thead>
                <tr className="border-b-2 border-gray-500">
                  {["Sesión", "Grupo", "Inicio", "TimeToCV", "ESCO", "ATS", "Satisfacción", "Ediciones", "Estado", "Eventos"].map((header) => (
                    <th key={header} scope="col" className="p-2">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} className="border-b border-gray-300">
                    <th scope="row" className="p-2 font-mono text-xs font-normal">{row.id.slice(0, 8)}</th>
                    <td className="p-2">{row.group}</td>
                    <td className="whitespace-nowrap p-2">{new Date(row.started_at).toLocaleString("es-CO")}</td>
                    <td className="p-2 tabular-nums">{fmt(row.time_to_cv_min, 2, " min")}</td>
                    <td className="p-2 tabular-nums">{fmt(row.esco_coverage_pct, 0, " %")}</td>
                    <td className="p-2 tabular-nums">{fmt(row.ats_score, 0)}</td>
                    <td className="p-2 tabular-nums">{fmt(row.satisfaction, 2)}</td>
                    <td className="p-2 tabular-nums">{row.edits}</td>
                    <td className="p-2">{row.ended_at ? (row.exported_at ? "Completa" : "Abandonada") : row.exported_at ? "Exportada" : "En curso"}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => setSessionFilter(row.id)}
                        className="min-h-9 rounded border border-gray-500 px-2 text-sm font-semibold hover:bg-gray-100"
                      >
                        Ver<span className="sr-only"> eventos de la sesión {row.id.slice(0, 8)}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav aria-label="Páginas de sesiones" className="flex items-center gap-2">
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="min-h-11 rounded-md border border-gray-500 px-3 font-semibold disabled:opacity-50">
              Anterior
            </button>
            <span className="text-sm">Página {page + 1} de {pages}</span>
            <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="min-h-11 rounded-md border border-gray-500 px-3 font-semibold disabled:opacity-50">
              Siguiente
            </button>
          </nav>
        </section>

        <section aria-labelledby="events-title" className="space-y-3 rounded-lg border border-gray-400 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="events-title" className="text-lg font-bold">
              Registro de eventos {sessionFilter ? `· sesión ${sessionFilter.slice(0, 8)}` : "(últimos 500)"}
            </h2>
            {sessionFilter && (
              <button type="button" onClick={() => setSessionFilter("")} className="min-h-11 rounded-md border border-gray-500 px-3 font-semibold hover:bg-gray-100">
                Ver todas las sesiones
              </button>
            )}
          </div>
          <div className="max-h-[28rem] overflow-auto" tabIndex={0} role="region" aria-label="Tabla de eventos (desplazable)">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Eventos registrados, del más reciente al más antiguo</caption>
              <thead className="sticky top-0 bg-white">
                <tr className="border-b-2 border-gray-500">
                  {["Fecha (servidor)", "Sesión", "Grupo", "Evento", "Detalle"].map((header) => (
                    <th key={header} scope="col" className="p-2">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((row) => (
                  <tr key={row.id} className="border-b border-gray-300">
                    <td className="whitespace-nowrap p-2 font-mono text-xs">{new Date(row.ts).toISOString().replace("T", " ").slice(0, 23)}</td>
                    <td className="p-2 font-mono text-xs">{row.session_id.slice(0, 8)}</td>
                    <td className="p-2">{row.group}</td>
                    <td className="p-2 font-mono text-xs">{row.event_type}</td>
                    <td className="p-2">{row.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, ExternalLink } from "lucide-react";
import { Link } from "react-router";

import type { AtsResult, ExperimentGroup, ExperimentMetrics, FormSection, SessionLiveMetrics } from "../../dto/experiment";
import { FORM_SECTIONS } from "../../dto/experiment";
import { getMetrics, getSessionMetrics, previewAts } from "../../services/experiment-api";
import { WizardData, toSnapshot } from "./model";

const SECTION_LABEL: Record<FormSection, string> = {
  personal: "Datos",
  education: "Formación",
  experience: "Experiencia",
  skills: "Habilidades",
};

const FACTORS: { key: keyof AtsResult["ats_breakdown"]; label: string; weight: number }[] = [
  { key: "S", label: "Secciones completas", weight: 25 },
  { key: "P", label: "Perfil de 40–120 palabras", weight: 15 },
  { key: "H", label: "Habilidades (hasta 5)", weight: 15 },
  { key: "E", label: "Cobertura ESCO", weight: 20 },
  { key: "C", label: "Correo y teléfono", weight: 10 },
  { key: "F", label: "Fechas en formación y experiencia", weight: 15 },
];

const fmt = (value: number | null | undefined, digits = 1, suffix = "") =>
  value == null ? "—" : `${value.toFixed(digits)}${suffix}`;

function Status({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="text-sm text-gray-700">Sin datos</span>;
  return ok ? (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800">
      <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Cumple
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-800">
      <CircleAlert className="h-4 w-4" aria-hidden="true" /> No cumple
    </span>
  );
}

function Bar({ label, value, max, text }: { label: string; value: number; max: number; text: string }) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm text-gray-900">
        <span>{label}</span>
        <span className="font-semibold tabular-nums">{text}</span>
      </div>
      <div className="mt-1 h-3 rounded bg-gray-200" aria-hidden="true">
        <div className="h-3 rounded bg-blue-700" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

interface MetricsPanelProps {
  sessionId: string;
  group: ExperimentGroup;
  data: WizardData;
}

/** Métricas en vivo de la sesión y comparación global A vs B (solo para investigadores). */
export function MetricsPanel({ sessionId, group, data }: MetricsPanelProps) {
  const [live, setLive] = useState<SessionLiveMetrics | null>(null);
  const [ats, setAts] = useState<AtsResult | null>(null);
  const [global, setGlobal] = useState<ExperimentMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = () =>
      getSessionMetrics(sessionId, controller.signal).then(setLive).catch(() => undefined);
    void load();
    const timer = window.setInterval(load, 5000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [sessionId]);

  useEffect(() => {
    const controller = new AbortController();
    const load = () =>
      getMetrics(controller.signal)
        .then((metrics) => {
          setGlobal(metrics);
          setError(null);
        })
        .catch((err: Error) => {
          if (!controller.signal.aborted) setError(err.message);
        });
    void load();
    const timer = window.setInterval(load, 15000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const normalized = data.skills.filter((skill) => skill.escoUri).length;
    const coverage = data.skills.length ? (normalized / data.skills.length) * 100 : 0;
    const timer = window.setTimeout(() => {
      previewAts(toSnapshot(data), coverage, controller.signal).then(setAts).catch(() => undefined);
    }, 1000);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [data]);

  const sectionMax = Math.max(1, ...FORM_SECTIONS.map((section) => live?.section_times[section] ?? 0));
  const targets = global?.targets;

  return (
    <div className="space-y-6 text-gray-900" aria-label="Métricas del experimento">
      <section aria-labelledby="live-title" className="space-y-3">
        <h3 id="live-title" className="text-base font-bold">
          Esta sesión (en vivo)
        </h3>
        <dl className="grid grid-cols-2 gap-3">
          {[
            ["Tiempo transcurrido", fmt(live?.elapsed_min, 1, " min")],
            ["Ediciones", String(live?.edits ?? 0)],
            ["Habilidades", String(live?.skills_count ?? data.skills.length)],
            ["Cobertura ESCO", group === "B" ? fmt(live?.esco_coverage_pct, 0, " %") : "No aplica (grupo A)"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-gray-400 bg-white p-3">
              <dt className="text-sm text-gray-800">{label}</dt>
              <dd className="text-lg font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-2 rounded-md border border-gray-400 bg-white p-3">
          <h4 className="text-sm font-bold">Segundos por sección</h4>
          {FORM_SECTIONS.map((section) => (
            <Bar
              key={section}
              label={SECTION_LABEL[section]}
              value={live?.section_times[section] ?? 0}
              max={sectionMax}
              text={live?.section_times[section] != null ? `${Math.round(live.section_times[section]!)} s` : "—"}
            />
          ))}
        </div>

        <div className="space-y-2 rounded-md border border-gray-400 bg-white p-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold">Puntaje ATS estimado</h4>
            <span className="text-xl font-bold tabular-nums">{ats ? `${ats.ats_score} / 100` : "—"}</span>
          </div>
          <Status ok={ats ? ats.ats_score >= 75 : null} />
          <span className="text-sm text-gray-800"> Meta: 75 o más</span>
          <ul className="space-y-1">
            {FACTORS.map((factor) => (
              <li key={factor.key}>
                <Bar
                  label={`${factor.key} · ${factor.label}`}
                  value={ats?.ats_breakdown[factor.key] ?? 0}
                  max={1}
                  text={ats ? `${(ats.ats_breakdown[factor.key] * factor.weight).toFixed(1)} / ${factor.weight}` : "—"}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="global-title" className="space-y-3">
        <h3 id="global-title" className="text-base font-bold">
          Todas las sesiones · A vs B
        </h3>
        {error && <p className="text-sm text-red-800">No se pudieron cargar las métricas globales: {error}</p>}
        {global && targets && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Promedios por grupo y si cumplen la meta</caption>
              <thead>
                <tr className="border-b border-gray-500 text-left">
                  <th scope="col" className="p-2">Métrica</th>
                  <th scope="col" className="p-2">Grupo A</th>
                  <th scope="col" className="p-2">Grupo B</th>
                  <th scope="col" className="p-2">Meta (B)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Sesiones completas (n)", a: String(global.by_group.A.n), b: String(global.by_group.B.n), target: "—", ok: null },
                  {
                    label: "TimeToCV medio",
                    a: fmt(global.by_group.A.time_to_cv_avg, 1, " min"),
                    b: fmt(global.by_group.B.time_to_cv_avg, 1, " min"),
                    target: `< ${targets.time_to_cv_b_max} min`,
                    ok: global.by_group.B.time_to_cv_avg == null ? null : global.by_group.B.time_to_cv_avg < targets.time_to_cv_b_max,
                  },
                  {
                    label: "Cobertura ESCO",
                    a: fmt(global.by_group.A.esco_coverage_avg, 0, " %"),
                    b: fmt(global.by_group.B.esco_coverage_avg, 0, " %"),
                    target: `≥ ${targets.esco_coverage_b_min} %`,
                    ok: global.by_group.B.esco_coverage_avg == null ? null : global.by_group.B.esco_coverage_avg >= targets.esco_coverage_b_min,
                  },
                  {
                    label: "ATS medio",
                    a: fmt(global.by_group.A.ats_score_avg, 0),
                    b: fmt(global.by_group.B.ats_score_avg, 0),
                    target: `≥ ${targets.ats_min}`,
                    ok: global.by_group.B.ats_score_avg == null ? null : global.by_group.B.ats_score_avg >= targets.ats_min,
                  },
                  {
                    label: "Satisfacción",
                    a: fmt(global.by_group.A.satisfaction_avg, 2, " / 5"),
                    b: fmt(global.by_group.B.satisfaction_avg, 2, " / 5"),
                    target: `≥ ${targets.satisfaction_min}`,
                    ok: global.by_group.B.satisfaction_avg == null ? null : global.by_group.B.satisfaction_avg >= targets.satisfaction_min,
                  },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-gray-300">
                    <th scope="row" className="p-2 text-left font-semibold">{row.label}</th>
                    <td className="p-2 tabular-nums">{row.a}</td>
                    <td className="p-2 tabular-nums">{row.b}</td>
                    <td className="p-2">
                      {row.target} {row.ok !== null && <Status ok={row.ok} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link to="/research" target="_blank" className="inline-flex items-center gap-1 font-semibold text-blue-700 underline">
          Abrir la consola completa del investigador
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">(se abre en una pestaña nueva)</span>
        </Link>
      </section>
    </div>
  );
}

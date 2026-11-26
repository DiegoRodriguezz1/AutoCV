import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Download, Eye, FilePlus2, KeyRound, Save, Trash2 } from "lucide-react";

import { renderCvYaml } from "../services/cv-api";
import { ApiError, getResearchKey, setResearchKey } from "../services/experiment-api";
import {
  SavedCvSummary,
  createSavedCv,
  deleteSavedCv,
  getSavedCv,
  listSavedCvs,
  updateSavedCv,
} from "../services/saved-cv-api";

const NEW_CV_TEMPLATE = `cv:
  name: Nombre Apellido
  headline: Cargo
  location: Bogotá D.C., Colombia
  email: correo@ejemplo.com
  sections:
    Sobre mí:
      - Resumen del perfil.

design:
  theme: classic

locale:
  language: spanish
`;

function base64ToBlobUrl(base64: string): string {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

const fileNameFor = (name: string) =>
  `${(name || "cv").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_")}.pdf`;

export function YamlEditorPage() {
  const [cvs, setCvs] = useState<SavedCvSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [yaml, setYaml] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState({ name: "", yaml: "" });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);
  const [keyInput, setKeyInput] = useState(getResearchKey);
  const gutterRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const dirty = name !== savedSnapshot.name || yaml !== savedSnapshot.yaml;
  const lineCount = yaml.split("\n").length;
  // La API nombra primero la línea que hay que corregir ("Revisa la línea 55…").
  const errorLine = Number(error?.match(/l[ií]nea (\d+)/)?.[1]) || null;

  const goToLine = (line: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    const lines = yaml.split("\n");
    const start = lines.slice(0, line - 1).reduce((total, text) => total + text.length + 1, 0);
    editor.focus();
    editor.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
    // 24px por línea (leading-6); deja la línea un poco abajo del borde superior.
    editor.scrollTop = Math.max(0, (line - 4) * 24);
  };

  const handleError = useCallback((err: unknown, fallback: string) => {
    if (err instanceof ApiError && err.status === 401) setNeedsKey(true);
    setError(err instanceof Error ? err.message : fallback);
  }, []);

  const refreshList = useCallback(async () => {
    try {
      setCvs(await listSavedCvs());
      setNeedsKey(false);
      setError(null);
    } catch (err) {
      handleError(err, "No se pudo cargar la lista de hojas de vida.");
    }
  }, [handleError]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  // Libera el PDF anterior cuando se genera otro o se sale de la página.
  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  const preview = useCallback(async (content: string, cvName: string) => {
    if (!content.trim()) return;
    setRendering(true);
    setError(null);
    try {
      const result = await renderCvYaml(content);
      if (result.accepted && result.pdf_base64) {
        setPdfUrl(base64ToBlobUrl(result.pdf_base64));
        setStatus(`Vista previa de «${cvName || "sin nombre"}» actualizada.`);
      } else {
        setError(result.message || "El servidor no generó el PDF.");
      }
    } catch (err) {
      handleError(err, "No se pudo generar la vista previa.");
    } finally {
      setRendering(false);
    }
  }, [handleError]);

  const confirmDiscard = () => !dirty || window.confirm("Tienes cambios sin guardar. ¿Descartarlos?");

  const selectCv = async (id: number | null) => {
    if (!confirmDiscard()) return;
    setPdfUrl(null);
    setError(null);
    if (id === null) {
      setSelectedId(null);
      setName("");
      setYaml(NEW_CV_TEMPLATE);
      setSavedSnapshot({ name: "", yaml: NEW_CV_TEMPLATE });
      return;
    }
    try {
      const cv = await getSavedCv(id);
      setSelectedId(cv.id);
      setName(cv.name);
      setYaml(cv.yaml_content);
      setSavedSnapshot({ name: cv.name, yaml: cv.yaml_content });
      void preview(cv.yaml_content, cv.name);
    } catch (err) {
      handleError(err, "No se pudo abrir la hoja de vida.");
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setError("Ponle un nombre a la hoja de vida antes de guardarla.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), yaml_content: yaml };
      const cv = selectedId === null ? await createSavedCv(payload) : await updateSavedCv(selectedId, payload);
      setSelectedId(cv.id);
      setName(cv.name);
      setSavedSnapshot({ name: cv.name, yaml: cv.yaml_content });
      setStatus(`«${cv.name}» guardada.`);
      await refreshList();
      void preview(cv.yaml_content, cv.name);
    } catch (err) {
      handleError(err, "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (selectedId === null || !window.confirm(`¿Eliminar «${savedSnapshot.name}»? No se puede deshacer.`)) return;
    try {
      await deleteSavedCv(selectedId);
      setSelectedId(null);
      setName("");
      setYaml("");
      setSavedSnapshot({ name: "", yaml: "" });
      setPdfUrl(null);
      setStatus("Hoja de vida eliminada.");
      await refreshList();
    } catch (err) {
      handleError(err, "No se pudo eliminar.");
    }
  };

  const onEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void save();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void preview(yaml, name);
      return;
    }
    // YAML se indenta con espacios: Tab inserta dos en vez de salir del campo.
    if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();
      const target = event.currentTarget;
      const { selectionStart, selectionEnd } = target;
      const next = `${yaml.slice(0, selectionStart)}  ${yaml.slice(selectionEnd)}`;
      setYaml(next);
      window.requestAnimationFrame(() => target.setSelectionRange(selectionStart + 2, selectionStart + 2));
    }
  };

  const saveKey = (event: FormEvent) => {
    event.preventDefault();
    setResearchKey(keyInput.trim());
    void refreshList();
  };

  const editing = selectedId !== null || yaml !== "";

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 sm:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="space-y-1">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 font-semibold text-gray-800 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold">Hojas de vida en YAML</h1>
          <p className="text-base text-gray-800">
            Elige una hoja de vida guardada, edita su YAML de RenderCV y guárdala. Ctrl+S guarda y Ctrl+Enter actualiza la vista previa.
          </p>
        </header>

        {needsKey && (
          <form onSubmit={saveKey} className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-400 bg-white p-4">
            <div className="space-y-1">
              <label htmlFor="yaml-research-key" className="flex items-center gap-2 font-semibold">
                <KeyRound className="h-4 w-4" aria-hidden="true" /> Clave de investigador
              </label>
              <input
                id="yaml-research-key"
                type="password"
                autoComplete="off"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                className="min-h-11 w-72 rounded-md border border-gray-500 bg-white px-3"
              />
            </div>
            <button type="submit" className="min-h-11 rounded-md bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800">
              Usar clave
            </button>
          </form>
        )}

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-400 bg-white p-4">
          <div className="space-y-1">
            <label htmlFor="saved-cv" className="block font-semibold">Hoja de vida</label>
            <select
              id="saved-cv"
              value={selectedId ?? ""}
              onChange={(event) => void selectCv(event.target.value ? Number(event.target.value) : null)}
              className="min-h-11 w-64 rounded-md border border-gray-500 bg-white px-3"
            >
              <option value="">{cvs.length ? "— Nueva hoja de vida —" : "— No hay guardadas —"}</option>
              {cvs.map((cv) => (
                <option key={cv.id} value={cv.id}>{cv.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="cv-name" className="block font-semibold">Nombre</label>
            <input
              id="cv-name"
              value={name}
              maxLength={200}
              placeholder="Hoja de vida de…"
              onChange={(event) => setName(event.target.value)}
              className="min-h-11 w-72 rounded-md border border-gray-500 bg-white px-3"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void selectCv(null)}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-500 bg-white px-4 font-semibold hover:bg-gray-50"
            >
              <FilePlus2 className="h-4 w-4" aria-hidden="true" /> Nueva
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !editing}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              <Save className="h-4 w-4" aria-hidden="true" /> {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => void preview(yaml, name)}
              disabled={rendering || !yaml.trim()}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-500 bg-white px-4 font-semibold hover:bg-gray-50 disabled:opacity-60"
            >
              <Eye className="h-4 w-4" aria-hidden="true" /> {rendering ? "Generando…" : "Vista previa"}
            </button>
            {pdfUrl && (
              <a
                href={pdfUrl}
                download={fileNameFor(name)}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-500 bg-white px-4 font-semibold hover:bg-gray-50"
              >
                <Download className="h-4 w-4" aria-hidden="true" /> PDF
              </a>
            )}
            {selectedId !== null && (
              <button
                type="button"
                onClick={() => void remove()}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-red-700 bg-white px-4 font-semibold text-red-800 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Eliminar
              </button>
            )}
          </div>
          {dirty && <p className="text-sm font-semibold text-amber-800">Cambios sin guardar</p>}
        </div>

        <p className="sr-only" role="status" aria-live="polite">{status}</p>
        {error && (
          <div role="alert" className="space-y-2 rounded-md border border-red-700 bg-red-50 p-3 text-red-800">
            {error.includes("\n") ? (
              // Los errores de validación de RenderCV vienen como tabla de texto: se conserva su forma.
              <pre className="max-h-60 overflow-auto whitespace-pre font-mono text-xs">{error}</pre>
            ) : (
              <p className="font-semibold">{error}</p>
            )}
            {errorLine && errorLine <= lineCount && (
              <button
                type="button"
                onClick={() => goToLine(errorLine)}
                className="min-h-11 rounded-md border border-red-700 bg-white px-4 font-semibold text-red-800 hover:bg-red-50"
              >
                Ir a la línea {errorLine}
              </button>
            )}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="yaml-title" className="flex flex-col rounded-lg border border-gray-400 bg-white">
            <h2 id="yaml-title" className="border-b border-gray-300 px-4 py-2 text-lg font-bold">YAML</h2>
            <div className="flex h-[70vh] min-h-[420px] overflow-hidden font-mono text-sm leading-6">
              <div
                ref={gutterRef}
                aria-hidden="true"
                className="select-none overflow-hidden border-r border-gray-300 bg-gray-50 px-2 py-3 text-right text-gray-600"
              >
                {Array.from({ length: lineCount }, (_, index) => (
                  <div key={index}>{index + 1}</div>
                ))}
              </div>
              <textarea
                ref={editorRef}
                aria-labelledby="yaml-title"
                value={yaml}
                spellCheck={false}
                wrap="off"
                placeholder="Elige una hoja de vida o crea una nueva."
                onChange={(event) => setYaml(event.target.value)}
                onKeyDown={onEditorKeyDown}
                onScroll={(event) => {
                  if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
                }}
                className="flex-1 resize-none bg-white px-3 py-3 text-gray-900 outline-none"
              />
            </div>
          </section>

          <section aria-labelledby="pdf-title" className="flex flex-col rounded-lg border border-gray-400 bg-white">
            <h2 id="pdf-title" className="border-b border-gray-300 px-4 py-2 text-lg font-bold">Vista previa</h2>
            <div className="flex h-[70vh] min-h-[420px] items-center justify-center bg-gray-50">
              {pdfUrl ? (
                <iframe title="Vista previa del PDF" src={pdfUrl} className="h-full w-full" />
              ) : (
                <p className="px-4 text-center text-gray-700">
                  {rendering ? "Generando el PDF…" : "Pulsa «Vista previa» para ver cómo queda el PDF."}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

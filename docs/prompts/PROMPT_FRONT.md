# Prompt para el frontend (AutoCV) — Formulario por pasos en modal, métricas y accesibilidad

> Pega este prompt completo en el agente que trabaja en el repo **AutoCV** (React 18 + Vite + Tailwind 4 + Radix/shadcn en `src/app/components/ui`, react-router 7, recharts).
> El backend (repo bAutoCV) lo hace otro agente con `PROMPT_BACK.md`; la sección **"Contrato de API"** es idéntica en los dos prompts. Si el back todavía no tiene un endpoint, usa un mock en `src/app/services/` detrás de la misma firma, y no cambies el contrato.

---

## Contexto

AutoCV es un proyecto de investigación de la ETITC. Hay que convertir la página `/create` en el **prototipo instrumental** de un experimento A/B que mide automáticamente:

- **TimeToCV** (min): desde `session_start` hasta el primer `cv_export`. Meta para el grupo B: < 30 min.
- **Tiempo por sección** (s): `section_enter` → `section_complete`.
- **Cobertura ESCO** (%): habilidades con URI ESCO / habilidades totales. Meta para B: ≥ 80 %.
- **Puntaje ATS** (0–100): `25·S + 15·P + 15·H + 20·E + 10·C + 15·F`, lo calcula el back.
- **Satisfacción** (Likert 1–5, 4 ítems). Meta: ≥ 4,0.
- **Ediciones**: eventos `field_edit`.

**Grupo A (control):** formulario manual, **sin** sugerencias ESCO ni el panel de optimización ATS.
**Grupo B (AutoCV):** sugerencias ESCO de habilidades y cargos, habilidades sugeridas según el cargo, y consejos ATS.
Los autocompletados que **no** son ESCO (país, ciudad, institución) los tienen **los dos grupos**, porque no forman parte de la variable independiente.

La referencia visual y funcional es el prototipo `AutoCV Prototipo Instrumental.html` (pídele el archivo al usuario si no lo tienes). Toma de ahí el flujo y la consola, pero conecta todo al backend real en vez de a `localStorage`.

## Estado actual (lo que hay que corregir)

- `src/app/pages/cv-creator.tsx`: formulario a la izquierda y vista previa a la derecha. Inicia una sesión al montar la página, sin consentimiento. Manda `field_edit` **en cada cambio de `cvData`** (una tecla = un evento) y `cv_export` **en cada autorender de 5 s**, lo que daña TimeToCV y el conteo de ediciones. `submitExperimentSurvey` está importado pero nunca se usa. No hay `section_complete`.
- `src/app/components/cv-form.tsx`: las habilidades son un input con comas, y elegir una sugerencia ESCO **reemplaza todas** las habilidades. Los autocompletados usan `<datalist>` (no son accesibles con lector de pantalla y no guardan la URI). El grupo A también recibe sugerencias ESCO.
- `src/app/services/experiment-api.ts`: `searchCountries` tiene 8 países con texto dañado por la codificación (`EspaÃ±a`).
- `src/app/pages/research-dashboard.tsx`: KPIs mezclados (sin separar por grupo), sin gráficas, y repite el cliente HTTP en vez de usar el servicio.

## Tareas

### 1. Inicio y consentimiento
En `/create` muestra primero una pantalla de bienvenida: qué es el estudio, cuánto tarda (unos 20–30 min), qué datos se recogen, y el consentimiento informado (Ley 1581 de 2012) con un checkbox **obligatorio** y un botón "Comenzar". Al pulsarlo:
- `POST /experiment/sessions` con `consent: true`, `user_agent` y `a11y_prefs` (las preferencias activas del punto 6).
- Guarda `session_id` en `sessionStorage`. Si el usuario recarga, recupera la sesión con `GET /experiment/sessions/{id}` y el borrador del CV desde `localStorage` (envuelto en try/catch).
- En desarrollo (`import.meta.env.DEV`) muestra un selector "Asignación de grupo: Aleatoria / Forzar A / Forzar B", como en el prototipo.

### 2. Modal grande por pasos
Abre un **modal a pantalla casi completa** (Radix `Dialog` de `components/ui/dialog.tsx`, `max-w-[min(1400px,96vw)] h-[94vh]`; en móvil, pantalla completa) con:

- **Encabezado:** título, pastilla del grupo ("Grupo A · control" / "Grupo B · AutoCV"), cronómetro de la sesión (`aria-hidden`, con su valor accesible solo a demanda), **switch "Ver métricas"** (Radix `Switch` de `components/ui/switch.tsx`) y botón para cerrar. Antes de cerrar, pide confirmación y avisa que la sesión queda abierta.
- **Stepper:** `Datos · Formación · Experiencia · Habilidades · Exportar`. Es un `<nav aria-label="Progreso">` con `<ol>`, y el paso actual lleva `aria-current="step"`. Marca los pasos hechos con un ícono y con texto, no solo con color. Se puede volver a un paso anterior; avanzar solo con "Completar sección".
- **Cuerpo:** formulario del paso a la izquierda. A la derecha, la **vista previa del CV** (`CVPreview` actual) o, si el switch está activo, el **panel de métricas** (ver 4). En pantallas < 1024 px el panel derecho pasa a una pestaña.
- **Pie:** "Anterior", "Completar sección" (en el último paso de datos: "Generar y exportar CV"), y estado de guardado ("Borrador guardado").

Eventos:
- Al entrar a un paso → `section_enter` con `metadata.section`.
- Al pulsar "Completar sección" → `section_complete`. El back calcula los segundos.
- `field_edit` → **solo en `onBlur` si el valor cambió** respecto al que había al enfocar, con `metadata.field` (por ejemplo `personal.email`, `experience[1].company`). Nunca por tecla.

Contenido de cada paso (los campos nuevos tienen que entrar en `CVData` y en `dto/cv-api.ts → mapCVDataToCvRequest`):

1. **Datos personales:** nombre*, correo, teléfono (selector de indicativo con Colombia +57 por defecto, más solo dígitos), país (autocompletado), ciudad (autocompletado, depende del país), resumen profesional con contador de palabras **"42 / 40–120 palabras"**, que es el factor P del ATS.
2. **Formación** (lista: se pueden añadir varias): título (en el grupo B, autocompletado de ocupaciones ESCO como ayuda; en el A, texto libre), institución (autocompletado `/catalog/institutions`), fecha de inicio y de fin (mes/año con `<input type="month">`, más el checkbox "En curso"). Se envían como `period` "2023-02 – 2026-06" o "2023-02 – actual".
3. **Experiencia** (lista): cargo (grupo B: autocompletado de ocupaciones ESCO que guarda la URI), empresa, inicio/fin/"Actual", logros y funciones (textarea; en el grupo B, consejo ATS: "Empieza cada línea con un verbo de acción y añade cifras").
4. **Habilidades:** campo con chips. Enter o "Agregar" añade el chip; cada chip tiene un botón de quitar con `aria-label="Quitar Java"`.
   - Grupo B: mientras escribe, sugerencias de `/esco/skills/suggest`. Al elegir una, se guarda con `esco_uri` y `source:"esco_suggestion"`, y el chip muestra "ESCO: <etiqueta preferente>". Si el usuario eligió un cargo con URI, muestra "Habilidades recomendadas para <cargo>" (de `/esco/occupations/skills`) como botones que se añaden de un clic, con `source:"occupation"`.
   - Grupo A: solo texto libre (`source:"manual"`), sin sugerencias.
   - Cada alta → `POST /skills` (el back registra `skill_added`/`skill_normalized`). Cada baja → `DELETE /skills/{id}`.
   - Avisa por `aria-live="polite"`: "Java añadida. Normalizada en ESCO como Java (computer programming). 5 habilidades."
5. **Exportar:** "Generar y exportar CV" → `POST /experiment/sessions/{id}/export` con el `CvSnapshot` y, en paralelo, el render del PDF con el `renderCv` actual. Muestra el resultado: PDF, TimeToCV, cobertura ESCO y puntaje ATS con su desglose. Debajo, la **encuesta** de 4 ítems Likert 1–5, cada uno como `radiogroup` (no `select`), con las etiquetas "1 · Muy en desacuerdo" … "5 · Muy de acuerdo". "Enviar encuesta y finalizar" → `POST /survey` y luego `POST /end`. Pantalla de cierre: "Gracias. Ya puedes descargar tu CV" (con descarga del PDF) e ir a `/jobs`.

El **autorender del PDF** cada 5 s puede quedarse para la vista previa, pero **no** registra `cv_export`. Ese evento sale solo del paso 5.

Si ESCO falla (lista vacía con header `X-ESCO-Degraded: 1`), muestra un aviso discreto ("Las sugerencias ESCO no están disponibles; puedes escribir tus habilidades") y deja continuar.

### 3. Componente `Combobox` accesible
Crea `src/app/components/ui/combobox.tsx`, que reemplaza todos los `<datalist>`. Debe seguir el patrón **WAI-ARIA 1.2 combobox con listbox**:
- `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete="list"`.
- Flechas ↑/↓, Enter, Escape, Home/End. El foco se queda en el input.
- Debounce de 250 ms, mínimo 2 caracteres, `AbortController` para cancelar la petición anterior, estado "Buscando…" y "Sin resultados" anunciados por `aria-live`.
- Por props: `allowFreeText` (por defecto `true`, para que el usuario nunca quede bloqueado si no encuentra su opción) y `onSelect(option)` con `{ value, label, uri? }`.
- Puedes construirlo sobre `cmdk` + `Popover`, que ya están instalados, siempre que cumpla lo anterior.

Úsalo para: país (todos los códigos ISO con `Intl.DisplayNames(['es'], {type:'region'})`, sin endpoint, con Colombia primero), ciudad (`/catalog/cities`), institución, cargo, título y habilidades (estos tres últimos, solo ESCO en el grupo B).

Arregla la codificación: todos los archivos en UTF-8 y sin texto como `Ã±`.

### 4. Switch "Ver métricas" (panel del investigador dentro del modal)
Con el switch activo, el panel derecho muestra:
- **Esta sesión (en vivo):** tiempo transcurrido, segundos por sección (barras horizontales), habilidades y % ESCO, ediciones y **puntaje ATS estimado** (`POST /experiment/ats/preview` con debounce de 1 s) con el desglose S/P/H/E/C/F y la meta (≥ 75).
- **Global:** KPIs de `GET /experiment/metrics` **por grupo A vs B**: TimeToCV medio, cobertura ESCO, ATS medio, satisfacción y n. Cada uno con su meta y una indicación de si se cumple ("Cumple" o "No cumple", con ícono y texto). Se actualiza cada 15 s mientras el panel está abierto.
- Un enlace a `/research` para ver la consola completa.

Ver las métricas en vivo puede influir en el participante, así que:
- El switch arranca **apagado**. Su estado se guarda en `localStorage`.
- El switch solo aparece si la URL tiene `?investigador=1` o si `import.meta.env.DEV` es verdadero. Documenta esto en el README.
- Cada vez que se enciende el switch, regístralo como `field_edit` con `metadata.field = "metrics_panel"`, para poder excluir esas sesiones en el análisis.

### 5. Consola del investigador `/research`
Rehaz `research-dashboard.tsx` usando `experiment-api.ts` (sin `fetch` duplicado):
- KPIs **A vs B** lado a lado, con meta y estado.
- Gráficas con `recharts` (ya instalado):
  - TimeToCV por grupo (cajas o barras con error estándar).
  - Cobertura ESCO por grupo.
  - ATS por grupo.
  - Tiempo medio por sección, en barras apiladas por grupo.
  - Dispersión de TimeToCV por sesión.
  - Toda gráfica tiene un título, una descripción para lector de pantalla y **una tabla de datos equivalente** (con un botón "Ver como tabla"). Colores con contraste suficiente, y A y B se distinguen también por patrón o forma, no solo por color.
- Tablas paginadas de sesiones y eventos, con filtro por grupo y por sesión.
- Botones para descargar los 4 CSV (sessions, events, skills, survey).
- Campo para la `X-Research-Key`, guardada en `sessionStorage`, que se envía en los encabezados.

### 6. Accesibilidad (requisito del proyecto: WCAG 2.2 nivel AA, para personas con discapacidad visual, auditiva, motora o cognitiva)
Crea una **barra de accesibilidad** global en `root-layout.tsx` (botón "Accesibilidad" con un panel). Las preferencias se guardan en `localStorage` y se aplican como atributos en `<html>`:
- **Tamaño de texto:** 100 / 125 / 150 / 200 %. Usa `rem` en todo; nada de `px` fijos en tipografía. A 200 % de zoom no puede haber scroll horizontal (WCAG 1.4.10).
- **Alto contraste:** tema con contraste ≥ 7:1. **Modo oscuro**, que respete `prefers-color-scheme`. Usa variables en `src/styles/theme.css`.
- **Fuente legible:** opción de fuente para dislexia (Atkinson Hyperlegible de Google Fonts), más interlineado y espaciado de letras amplios.
- **Reducir movimiento:** respeta `prefers-reduced-motion` y también ofrece un interruptor manual (afecta a `motion` y a las transiciones).
- **Lectura en voz alta:** botón "Escuchar" en cada paso, que lee el título, las instrucciones y los errores con `speechSynthesis` (`lang="es-CO"`, detectando si el navegador lo soporta). Sirve para baja visión y dificultades de lectura.
- **Dictado por voz:** en los textarea (resumen, logros), botón de micrófono con `SpeechRecognition`/`webkitSpeechRecognition` (`es-CO`), con detección de soporte y estado anunciado. Si no hay soporte, el botón no se muestra.

Reglas en todo el flujo:
- **Visual:** cada campo tiene `<label>` visible asociado; nada de solo `placeholder` ni solo `aria-label`. Contraste ≥ 4.5:1 en texto y ≥ 3:1 en bordes y estados. Foco visible y grueso (`outline` de 3 px, que no quede tapado; WCAG 2.4.11). Los estados (válido, error, ESCO, paso hecho) siempre van con ícono y texto, además del color. Los íconos decorativos llevan `aria-hidden`.
- **Lector de pantalla:** `lang="es"` en `index.html`. Al cambiar de paso, el foco va al `<h2>` del paso (con `tabIndex=-1`) y se anuncia "Paso 2 de 5: Formación". Si hay errores al pulsar "Completar sección", aparece un resumen arriba con `role="alert"` y enlaces a cada campo; cada campo lleva `aria-invalid` y `aria-describedby` hacia su mensaje. Las ayudas de formato ("Solo números, mínimo 7 dígitos") van en `aria-describedby`, no en el placeholder. Los campos que se añaden o quitan en listas (formación/experiencia) anuncian el cambio y mueven el foco al primer campo nuevo, o al botón "Añadir" si se borró.
- **Auditiva:** ninguna información se da solo por sonido. Las notificaciones son visuales (toast con `sonner` + `aria-live`), sin sonidos. Si en algún momento se añade un video de ayuda, va con subtítulos. Los textos de ayuda están escritos, no en audio.
- **Motora:** todo se puede hacer con teclado, en un orden lógico, sin trampas de foco (salvo dentro del modal, como corresponde: Radix ya lo hace). Áreas táctiles ≥ 24×24 px (mejor 44). Sin arrastrar y soltar obligatorio. Enlace "Saltar al contenido".
- **Tiempo:** ningún paso tiene límite de tiempo. El cronómetro es informativo y se puede ocultar ("Ocultar cronómetro"), para no generar ansiedad.
- **Cognitiva:** lenguaje claro y oraciones cortas. Cada campo tiene un ejemplo ("Ej.: Técnico en sistemas"). Un paso a la vez. Se puede volver atrás sin perder nada. El borrador se guarda solo. Antes de exportar, una revisión: "Revisa tus datos".
- **Autocompletado del navegador** (WCAG 1.3.5): `autoComplete="name"`, `"email"`, `"tel-national"`, `"country-name"`, `"address-level2"`, `"organization"`, `"organization-title"`.
- Ejecuta **axe** en desarrollo (`@axe-core/react` solo en DEV) y corrige todas las violaciones serias o críticas. Prueba con NVDA + Firefox o Narrador + Edge en Windows, y anota lo que encontraste.

### 7. Servicios y limpieza
- `src/app/services/experiment-api.ts`: implementa todo el contrato con un `request` común que maneje errores en español, `AbortSignal` y el header `X-Research-Key`. Los tipos van en `src/app/dto/experiment.ts`.
- Una cola de eventos: si un `POST /events` falla por red, se reintenta (hasta 3 veces con backoff) y no bloquea la interfaz. El timestamp lo pone el servidor, así que no mandes el del cliente.
- Borra el código muerto que quede de `cv-creator.tsx` (el flujo de dos columnas sin modal). El botón "Subir CV (PDF)" con OCR se queda: muévelo a la pantalla de bienvenida y al paso 1 como "Rellenar desde mi CV en PDF", y registra `field_edit` con `metadata.field = "ocr_import"`. Úsalo en los dos grupos y anótalo, porque afecta a TimeToCV.
- No añadas dependencias pesadas; usa lo que ya está en `package.json`. Las únicas permitidas son `@axe-core/react` (dev) y la fuente Atkinson Hyperlegible por Google Fonts.

## Reglas
- Sigue el estilo actual: componentes de función, Tailwind, componentes de `components/ui`, textos en español.
- Rama `feat/modal-instrumental-a11y`. Commits pequeños por tarea.
- Al terminar: `npm run build` sin errores, prueba el flujo completo como grupo A y como grupo B contra el back local (`VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`), revisa en `/research` que las métricas aparezcan, y pasa axe. Reporta qué funcionó y qué quedó pendiente.

---

## Contrato de API (compartido con el front)

Base: `{VITE_API_BASE_URL}` = `http://127.0.0.1:8000/api/v1`

| Método | Ruta | Body / query | Respuesta |
|---|---|---|---|
| POST | `/experiment/sessions` | `{ consent: true, group?: "A"\|"B", participant_code?: string, user_agent?: string, a11y_prefs?: object }` | `{ id, group, started_at, consent_given_at }` |
| GET | `/experiment/sessions/{id}` | — | `{ id, group, started_at, exported_at, ended_at, section_times, survey_done: bool }` |
| POST | `/experiment/sessions/{id}/events` | `{ event_type: "section_enter"\|"section_complete"\|"field_edit", detail?: string, metadata?: { section?, field? } }` | `{ id, session_id, event_type, detail, ts, metadata }` |
| GET | `/experiment/sessions/{id}/skills` | — | `[{ id, input_label, esco_uri, preferred_label, source }]` |
| POST | `/experiment/sessions/{id}/skills` | `{ input_label, esco_uri?, preferred_label?, source: "manual"\|"esco_suggestion"\|"occupation" }` | `{ id, input_label, esco_uri, preferred_label, source }` |
| DELETE | `/experiment/sessions/{id}/skills/{skill_id}` | — | `204` |
| GET | `/experiment/sessions/{id}/metrics` | — | `{ elapsed_min, section_times, esco_coverage_pct, skills_count, edits }` |
| POST | `/experiment/ats/preview` | `CvSnapshot & { esco_coverage_pct }` | `{ ats_score, ats_breakdown: { S, P, H, E, C, F } }` |
| POST | `/experiment/sessions/{id}/export` | `CvSnapshot` | `{ time_to_cv_min, esco_coverage_pct, ats_score, ats_breakdown, section_times }` |
| POST | `/experiment/sessions/{id}/survey` | `{ responses: [{ item: 1..4, score: 1..5 }] }` | `{ satisfaction }` |
| POST | `/experiment/sessions/{id}/end` | — | `{ ended_at }` |
| GET | `/experiment/metrics` | header `X-Research-Key` | ver objeto `by_group` arriba |
| GET | `/experiment/sessions` | `?limit&offset&group` | `[SessionRow]` (incluye `section_times`, `ats_score`, etc.) |
| GET | `/experiment/events` | `?session_id&limit` | `[EventRow]` (incluye `group`, `metadata`) |
| GET | `/experiment/export/{sessions\|events\|skills\|survey}.csv` | — | CSV UTF-8 con BOM |
| GET | `/esco/skills/suggest` | `?text&language=es&limit=8` | `{ skills: [{ uri, title, alternative_labels }] }` |
| GET | `/esco/occupations/suggest` | `?text&language=es&limit=8` | `{ occupations: [{ uri, title, alternative_labels }] }` |
| GET | `/esco/occupations/skills` | `?occupation_uri&language=es&limit=15` | `{ occupation, essential_skills, optional_skills }` |
| GET | `/catalog/cities` | `?country=CO&text` | `[{ name, department }]` |
| GET | `/catalog/institutions` | `?text` | `[{ name, city }]` |

```ts
type CvSnapshot = {
  name: string; email: string; phone: string; summary: string;
  education: { degree: string; institution: string; period: string }[];
  experience: { position: string; company: string; period: string }[];
  skills: string[];
};
```

Ítems de la encuesta (en orden 1–4):
1. El CV final representa bien mi perfil
2. El proceso fue fácil de completar
3. Usaría la herramienta para postularme
4. Confío en que el CV pasa filtros ATS

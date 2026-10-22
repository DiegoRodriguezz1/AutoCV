
  # Formulario y previsualizador CV

  This is a code bundle for Formulario y previsualizador CV. The original project is available at https://www.figma.com/design/kCCg3jzu94JMEe5p8KSRAs/Formulario-y-previsualizador-CV.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  

  ## Experimento A/B (prototipo instrumental)

  La página `/create` es el prototipo del experimento: consentimiento informado, asignación al
  grupo A (control) o B (AutoCV, con sugerencias ESCO y consejos ATS) y un asistente de 5 pasos en
  un modal. Cada acción se registra como evento en el backend (repo bAutoCV), que calcula TimeToCV,
  tiempo por sección, cobertura ESCO, puntaje ATS y satisfacción.

  - Backend: `VITE_API_BASE_URL` (por defecto `http://127.0.0.1:8000/api/v1`).
  - En desarrollo (`npm run dev`) aparece un selector para forzar el grupo A o B.
  - El interruptor **Ver métricas** del modal solo aparece en desarrollo o con `?investigador=1`
    en la URL (por ejemplo `/create?investigador=1`). Arranca apagado y, si se enciende, queda
    registrado (`field_edit` con `metrics_panel`) para poder excluir esa sesión del análisis.
  - La consola del investigador está en `/research` (gráficas A vs B y descarga de CSV). Si el
    backend tiene `RESEARCH_API_KEY`, escribe la clave en la consola.

  ## Accesibilidad

  Objetivo: WCAG 2.2 nivel AA. El botón **Accesibilidad** (también dentro del modal) permite
  cambiar el tamaño del texto (100–200 %), tema claro/oscuro, alto contraste, fuente de lectura
  fácil (Atkinson Hyperlegible), reducir movimiento y ocultar el cronómetro. El asistente tiene
  lectura en voz alta por paso y dictado por voz en los textos largos (si el navegador los soporta).

  En desarrollo, `@axe-core/react` reporta en la consola las violaciones de accesibilidad.
  Para revisar tipos: `npx tsc --noEmit`.
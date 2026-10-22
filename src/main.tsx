
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // En desarrollo, axe reporta en la consola las violaciones de accesibilidad.
  if (import.meta.env.DEV) {
    void Promise.all([import("@axe-core/react"), import("react"), import("react-dom")]).then(
      ([axe, React, ReactDOM]) => axe.default(React, ReactDOM, 1000),
    );
  }

  createRoot(document.getElementById("root")!).render(<App />);


import { Outlet } from "react-router";
import { Toaster } from "sonner";

import { A11yToolbar } from "../a11y/a11y-toolbar";
import { A11yProvider } from "../a11y/preferences";
import { SEOHead } from "../components/seo-head";

export function RootLayout() {
  return (
    <A11yProvider>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <SEOHead />
      <div id="contenido" tabIndex={-1} className="outline-none">
        <Outlet />
      </div>
      <A11yToolbar />
      <Toaster position="top-center" richColors closeButton />
    </A11yProvider>
  );
}

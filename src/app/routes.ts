import { createBrowserRouter } from "react-router";
import { RootLayout } from "./layouts/root-layout";
import { LandingPage } from "./pages/landing";
import { CVCreatorPage } from "./pages/cv-creator";
import { JobsPage } from "./pages/jobs-page";
import { ContactPage } from "./pages/contact";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        index: true,
        Component: LandingPage,
      },
      {
        path: "create",
        Component: CVCreatorPage,
      },
      {
        path: "jobs",
        Component: JobsPage,
      },
      {
        path: "contact",
        Component: ContactPage,
      },
    ],
  },
]);
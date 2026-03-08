import { createBrowserRouter } from "react-router";
import { LandingPage } from "./pages/landing";
import { CVCreatorPage } from "./pages/cv-creator";
import { JobsPage } from "./pages/jobs-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/create",
    Component: CVCreatorPage,
  },
  {
    path: "/jobs",
    Component: JobsPage,
  },
]);
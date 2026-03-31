import { Outlet } from "react-router";
import { SEOHead } from "../components/seo-head";

export function RootLayout() {
  return (
    <>
      <SEOHead />
      <Outlet />
    </>
  );
}

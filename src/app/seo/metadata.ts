const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

export const SITE_URL = (viteEnv.VITE_SITE_URL ?? "https://autocv.me").replace(/\/$/, "");
export const SITE_NAME = viteEnv.VITE_SITE_NAME ?? "AutoCV";
export const DEFAULT_OG_IMAGE =
  viteEnv.VITE_DEFAULT_OG_IMAGE ??
  "https://images.unsplash.com/photo-1554224155-cfa08c2a758f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200";

export interface RouteMetadata {
  title: string;
  description: string;
  path: string;
  keywords: string[];
  openGraph: {
    type: "website";
    image: string;
  };
  twitter: {
    card: "summary_large_image";
    image: string;
  };
}

const sharedKeywords = [
  "crear CV",
  "curriculum vitae",
  "CV online",
  "plantilla CV",
  "hoja de vida",
  "generador de CV",
];

const routesMetadata: Record<string, RouteMetadata> = {
  "/": {
    title: "AutoCV | Crea tu CV profesional en minutos",
    description:
      "Crea tu curriculum vitae profesional con ayuda de IA, optimiza tu perfil y descarga tu CV en PDF en pocos minutos.",
    path: "/",
    keywords: [...sharedKeywords, "cv con ia", "descargar cv pdf", "crear hoja de vida"],
    openGraph: {
      type: "website",
      image: DEFAULT_OG_IMAGE,
    },
    twitter: {
      card: "summary_large_image",
      image: DEFAULT_OG_IMAGE,
    },
  },
  "/create": {
    title: "Crear CV Gratis | AutoCV",
    description:
      "Completa tu informacion, recibe sugerencias inteligentes y genera un CV listo para aplicar a empleo.",
    path: "/create",
    keywords: [...sharedKeywords, "crear cv gratis", "editor cv", "mejorar cv"],
    openGraph: {
      type: "website",
      image: DEFAULT_OG_IMAGE,
    },
    twitter: {
      card: "summary_large_image",
      image: DEFAULT_OG_IMAGE,
    },
  },
  "/jobs": {
    title: "Ofertas de Empleo Recomendadas | AutoCV",
    description:
      "Explora ofertas de trabajo recomendadas segun tu perfil y encuentra oportunidades alineadas con tus habilidades.",
    path: "/jobs",
    keywords: [...sharedKeywords, "ofertas de empleo", "trabajos recomendados", "buscar trabajo"],
    openGraph: {
      type: "website",
      image: DEFAULT_OG_IMAGE,
    },
    twitter: {
      card: "summary_large_image",
      image: DEFAULT_OG_IMAGE,
    },
  },
  "/contact": {
    title: "Contactanos | AutoCV",
    description:
      "Canales de contacto de AutoCV para soporte, alianzas y consultas sobre tu experiencia creando CV.",
    path: "/contact",
    keywords: [...sharedKeywords, "contacto autocv", "soporte autocv", "ayuda cv"],
    openGraph: {
      type: "website",
      image: DEFAULT_OG_IMAGE,
    },
    twitter: {
      card: "summary_large_image",
      image: DEFAULT_OG_IMAGE,
    },
  },
};

const defaultMetadata = routesMetadata["/"];

export function resolveAbsoluteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}

export function getRouteMetadata(pathname: string): RouteMetadata {
  return routesMetadata[pathname] ?? defaultMetadata;
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "es",
    hasPart: [
      {
        "@type": "WebPage",
        name: "Inicio",
        url: resolveAbsoluteUrl("/"),
      },
      {
        "@type": "WebPage",
        name: "Crear tu CV",
        url: resolveAbsoluteUrl("/create"),
      },
      {
        "@type": "WebPage",
        name: "Ofertas de empleo",
        url: resolveAbsoluteUrl("/jobs"),
      },
      {
        "@type": "WebPage",
        name: "Contactanos",
        url: resolveAbsoluteUrl("/contact"),
      },
    ],
  };
}

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
  "crear cv gratis",
  "generador de curriculum",
  "como hacer una hoja de vida",
  "plantillas de cv",
  "ejemplos de cv",
  "cv profesional",
];

const routesMetadata: Record<string, RouteMetadata> = {
  "/": {
    title: "AutoCV | Crear CV Gratis Online y Hoja de Vida Profesional",
    description:
      "Crea tu CV profesional gratis con IA. Aprende como hacer una hoja de vida, usa plantillas de CV modernas y revisa ejemplos de CV para destacar.",
    path: "/",
    keywords: [
      ...sharedKeywords,
      "cv con ia",
      "descargar cv pdf",
      "crear hoja de vida profesional",
      "curriculum para trabajar",
      "cv online gratis",
    ],
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

export function buildHomeFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Como hacer una hoja de vida paso a paso?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Incluye datos de contacto, perfil profesional, experiencia relevante, educacion y habilidades. En AutoCV puedes completarlo en minutos y optimizar el texto con IA.",
        },
      },
      {
        "@type": "Question",
        name: "Que plantilla de CV debo usar para conseguir empleo?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Usa una plantilla de CV limpia, facil de leer y compatible con ATS. Prioriza estructura clara, logros medibles y una sola pagina cuando sea posible.",
        },
      },
      {
        "@type": "Question",
        name: "Donde puedo ver ejemplos de CV profesionales?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "En AutoCV puedes revisar ejemplos de CV por perfil y adaptar cada seccion para tu area. Esto te ayuda a escribir un curriculo competitivo y listo para postular.",
        },
      },
    ],
  };
}

import { useEffect } from "react";
import { useLocation } from "react-router";
import {
  buildHomeFaqJsonLd,
  buildWebSiteJsonLd,
  getRouteMetadata,
  resolveAbsoluteUrl,
  SITE_NAME,
} from "../seo/metadata";

function upsertMetaByName(name: string, content: string): void {
  let element = document.querySelector(`meta[name=\"${name}\"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertMetaByProperty(property: string, content: string): void {
  let element = document.querySelector(`meta[property=\"${property}\"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertCanonical(url: string): void {
  let element = document.querySelector("link[rel='canonical']");
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", url);
}

function upsertJsonLd(scriptId: string, data: unknown): void {
  let element = document.getElementById(scriptId);
  if (!element) {
    element = document.createElement("script");
    element.setAttribute("type", "application/ld+json");
    element.setAttribute("id", scriptId);
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
}

function removeJsonLd(scriptId: string): void {
  const element = document.getElementById(scriptId);
  element?.remove();
}

export function SEOHead() {
  const location = useLocation();

  useEffect(() => {
    const metadata = getRouteMetadata(location.pathname);
    const canonicalUrl = resolveAbsoluteUrl(metadata.path);

    document.title = metadata.title;
    document.documentElement.lang = "es";

    upsertMetaByName("description", metadata.description);
    upsertMetaByName("keywords", metadata.keywords.join(", "));
    upsertMetaByName("robots", "index,follow,max-image-preview:large");

    upsertCanonical(canonicalUrl);

    upsertMetaByProperty("og:type", metadata.openGraph.type);
    upsertMetaByProperty("og:site_name", SITE_NAME);
    upsertMetaByProperty("og:title", metadata.title);
    upsertMetaByProperty("og:description", metadata.description);
    upsertMetaByProperty("og:url", canonicalUrl);
    upsertMetaByProperty("og:locale", "es_CO");
    upsertMetaByProperty("og:image", metadata.openGraph.image);

    upsertMetaByName("twitter:card", metadata.twitter.card);
    upsertMetaByName("twitter:title", metadata.title);
    upsertMetaByName("twitter:description", metadata.description);
    upsertMetaByName("twitter:image", metadata.twitter.image);

    upsertJsonLd("seo-website-jsonld", buildWebSiteJsonLd());
    upsertJsonLd("seo-webpage-jsonld", {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: metadata.title,
      description: metadata.description,
      url: canonicalUrl,
      inLanguage: "es",
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
      },
    });

    if (location.pathname === "/") {
      upsertJsonLd("seo-home-faq-jsonld", buildHomeFaqJsonLd());
    } else {
      removeJsonLd("seo-home-faq-jsonld");
    }
  }, [location.pathname]);

  return null;
}

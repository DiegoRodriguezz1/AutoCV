const SITE_URL = "https://autocv.app";

export const sitemapRoutes = ["/", "/create", "/jobs", "/contact"];

export function buildSitemapXml(siteUrl: string = SITE_URL): string {
  const now = new Date().toISOString();

  const urls = sitemapRoutes
    .map((path) => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      return `  <url>\n    <loc>${siteUrl}${normalizedPath}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${path === "/" ? "1.0" : "0.8"}</priority>\n  </url>`;
    })
    .join("\n");

  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n${urls}\n</urlset>`;
}

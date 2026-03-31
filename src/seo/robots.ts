const SITE_URL = "https://autocv.app";

export function buildRobotsTxt(siteUrl: string = SITE_URL): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml`;
}

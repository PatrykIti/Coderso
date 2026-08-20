/**
 * Sitemap XML generation for the public site surface (TASK-493-02-L01).
 *
 * `buildSitemapXml` is pure and side-effect free so the Vitest lane can test it
 * without a database. The DB-backed `collectSitemapUrls` loads its runtime
 * dependencies lazily (mirroring `searchIndexService.buildDefaultDeps`), so
 * importing this module never opens a database connection or pulls server
 * adapters into a Bun-free test.
 */
import type { ContentRouteSetting } from "../settings/settingsContracts";

export type SitemapEntry = {
  loc: string;
  lastmod?: string;
};

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Builds the sitemap urlset XML document. Relative `loc` values are prefixed
 * with `origin`; absolute locs are kept unchanged. `lastmod` is emitted only
 * when present, and an empty entry list still produces a valid empty urlset.
 */
export function buildSitemapXml(entries: SitemapEntry[], origin: string): string {
  const urls = entries.map((entry) => {
    const isAbsolute = entry.loc.startsWith("http://") || entry.loc.startsWith("https://");
    const loc = xmlEscape(isAbsolute ? entry.loc : `${origin}${entry.loc}`);
    const lastmod = entry.lastmod ? `<lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : "";
    return `<url><loc>${loc}</loc>${lastmod}</url>`;
  });
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`
  );
}

const resolvePageHref = (slug: string) => {
  const normalized = slug.trim().replace(/^\/+/, "");
  return normalized ? `/${normalized}` : "/";
};

const resolveEntryHref = (route: ContentRouteSetting, slug: string, id: string) => {
  const pattern = route.detailPath;
  if (pattern.includes(":slug")) return pattern.replace(":slug", encodeURIComponent(slug));
  if (pattern.includes(":id")) return pattern.replace(":id", encodeURIComponent(id));
  return pattern;
};

const toIsoDate = (value: Date | string | null | undefined): string | undefined => {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
};

type SitemapTarget = {
  targetType: "page" | "entry";
  targetId: string;
  slug: string;
  loc: string;
  updatedAt: Date | string | null;
};

/**
 * Collects the public, indexable sitemap URLs. Only published pages (with a
 * published body) and published, public-visibility content entries whose type
 * has an enabled content route are considered. Each target is checked against
 * its `seo_documents` row through `resolvePublicSeoMetadata`; targets whose
 * robots directives contain `noindex` are skipped. Results are de-duplicated
 * by URL and ordered by lastmod descending, then loc ascending.
 */
export async function collectSitemapUrls(): Promise<SitemapEntry[]> {
  const [
    { and, desc, eq, isNotNull },
    { db },
    schema,
    { getSetting },
    { resolvePublicSeoMetadata },
  ] = await Promise.all([
    import("drizzle-orm"),
    import("../../db/client"),
    import("../../db/schema"),
    import("../settings/settingsService"),
    import("./seoService"),
  ]);
  const { contentEntries, contentTypes, pages } = schema;

  const rawRoutes = await getSetting("site.contentRoutes");
  const contentRoutes = Array.isArray(rawRoutes) ? (rawRoutes as ContentRouteSetting[]) : [];

  const pageRows = await db
    .select({
      id: pages.id,
      slug: pages.slug,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(and(eq(pages.status, "published"), isNotNull(pages.publishedData)))
    .orderBy(desc(pages.updatedAt));

  const entryRows = await db
    .select({
      id: contentEntries.id,
      slug: contentEntries.slug,
      typeSlug: contentTypes.slug,
      updatedAt: contentEntries.updatedAt,
    })
    .from(contentEntries)
    .innerJoin(contentTypes, eq(contentEntries.typeId, contentTypes.id))
    .where(
      and(
        eq(contentEntries.status, "published"),
        isNotNull(contentEntries.publishedAt),
        eq(contentEntries.visibility, "public")
      )
    )
    .orderBy(desc(contentEntries.updatedAt));

  const targets: SitemapTarget[] = [];
  for (const page of pageRows) {
    targets.push({
      targetType: "page",
      targetId: page.id,
      slug: page.slug,
      loc: resolvePageHref(page.slug),
      updatedAt: page.updatedAt,
    });
  }
  for (const entry of entryRows) {
    const route = contentRoutes.find(
      (candidate) => candidate.enabled && candidate.type === entry.typeSlug
    );
    if (!route) continue; // no enabled detail route means no public URL
    targets.push({
      targetType: "entry",
      targetId: entry.id,
      slug: entry.slug,
      loc: resolveEntryHref(route, entry.slug, entry.id),
      updatedAt: entry.updatedAt,
    });
  }

  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  for (const target of targets) {
    if (seen.has(target.loc)) continue;
    const metadata = await resolvePublicSeoMetadata({
      targetType: target.targetType,
      targetId: target.targetId,
      slug: target.slug,
    });
    if (metadata.robots?.toLowerCase().includes("noindex")) continue;
    seen.add(target.loc);
    const lastmod = toIsoDate(target.updatedAt);
    entries.push(lastmod ? { loc: target.loc, lastmod } : { loc: target.loc });
  }

  return entries.sort(
    (left, right) =>
      (right.lastmod ?? "").localeCompare(left.lastmod ?? "") || left.loc.localeCompare(right.loc)
  );
}

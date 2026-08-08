import { isRecord } from "../contracts";
import {
  entryTeaserFixtureContentTypeSlug,
  entryTeaserFixtureDetailPath,
  entryTeaserFixtureEntrySeeds,
  entryTeaserFixtureFallbackBlockId,
  entryTeaserFixtureImageSrc,
  entryTeaserFixtureListPath,
  entryTeaserFixtureListingBlockId,
  entryTeaserFixturePrimaryBlockId,
  type EntryTeaserFixtureContentRoute,
  type EntryTeaserFixtureContext,
  type EntryTeaserFixtureEntrySeed,
} from "../fixture-data";

export function buildEntryTeaserFixtureSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      excerpt: { type: "string" },
      featuredImage: { type: "string" },
      featuredImageAlt: { type: "string" },
      featured: { type: "boolean" },
    },
  };
}

export function buildEntryTeaserFixtureEntryData(
  seed: EntryTeaserFixtureEntrySeed
): Record<string, unknown> {
  return {
    excerpt: seed.excerpt,
    featuredImage: entryTeaserFixtureImageSrc,
    featuredImageAlt: seed.imageAlt,
    featured: seed.featured,
  };
}

function buildEntryTeaserFixtureRuntimeItem(
  seed: EntryTeaserFixtureEntrySeed,
  id: string
): Record<string, unknown> {
  return {
    id,
    title: seed.title,
    slug: seed.slug,
    href: `${entryTeaserFixtureListPath}/${seed.slug}`,
    excerpt: seed.excerpt,
    imageSrc: entryTeaserFixtureImageSrc,
    imageAlt: seed.imageAlt,
    tags: seed.tags,
    authorName: seed.authorName,
    publishedAt: seed.publishedAt,
    status: "published",
  };
}

function findEntryTeaserFixtureSeed(key: EntryTeaserFixtureEntrySeed["key"]) {
  const seed = entryTeaserFixtureEntrySeeds.find((item) => item.key === key);
  if (!seed) throw new Error(`entry_teaser_fixture_seed_missing:${key}`);
  return seed;
}

function resolveEntryTeaserFixtureEntryId(
  context: EntryTeaserFixtureContext,
  key: EntryTeaserFixtureEntrySeed["key"]
) {
  if (key === "manual") return context.manualEntryId;
  if (key === "featured") return context.featuredEntryId;
  return context.fallbackEntryId;
}

export function buildEntryTeaserFixtureListingQuery(
  contentTypeId: string,
  options: { fallbackOnly: boolean }
): Record<string, unknown> {
  return {
    source: "entries",
    sourceConfig: {
      contentTypeId,
      includeDrafts: false,
    },
    filters: options.fallbackOnly
      ? [
          {
            field: "tags",
            op: "contains",
            value: "fallback",
          },
        ]
      : [],
    sort: [
      {
        field: "publishedAt",
        dir: "desc",
      },
      {
        field: "id",
        dir: "asc",
      },
    ],
    pagination: {
      limit: 12,
      offset: 0,
    },
    fields: [
      "id",
      "title",
      "slug",
      "status",
      "tags",
      "publishedAt",
      "updatedAt",
      "author.name",
      "data.excerpt",
      "data.featuredImage",
      "data.featuredImageAlt",
      "data.featured",
    ],
  };
}

export function buildEntryTeaserFixtureListingTemplateConfig(): Record<string, unknown> {
  return {
    fields: [
      {
        key: "title",
        source: "title",
        label: "Title",
        fallback: null,
        format: "text",
        conditions: [],
      },
      {
        key: "excerpt",
        source: "data.excerpt",
        label: "Excerpt",
        fallback: null,
        format: "text",
        conditions: [],
      },
      {
        key: "image",
        source: "data.featuredImage",
        label: "Image",
        fallback: null,
        format: "text",
        conditions: [],
      },
      {
        key: "tags",
        source: "tags",
        label: "Tags",
        fallback: null,
        format: "badge",
        conditions: [],
      },
      {
        key: "date",
        source: "publishedAt",
        label: "Published",
        fallback: null,
        format: "date",
        conditions: [],
      },
    ],
    itemActions: [
      {
        id: "view-entry",
        label: "Read entry",
        kind: "view",
        href: `${entryTeaserFixtureListPath}/{{slug}}`,
        opensInNewTab: false,
      },
    ],
    emptyState: {
      title: "No fixture entries",
      description: "The Entry Teaser smoke fixture should stay populated.",
      ctaLabel: null,
      ctaHref: null,
    },
    style: {
      columns: 3,
      gap: "md",
      cardVariant: "default",
    },
  };
}

function buildEntryTeaserFixtureWidgetData(
  branch: "legacy-manual" | "listing-featured" | "listing-fallback",
  context: EntryTeaserFixtureContext
): Record<string, unknown> {
  const seed =
    branch === "legacy-manual"
      ? findEntryTeaserFixtureSeed("manual")
      : branch === "listing-featured"
        ? findEntryTeaserFixtureSeed("featured")
        : findEntryTeaserFixtureSeed("fallback");
  const entryId = resolveEntryTeaserFixtureEntryId(context, seed.key);
  const isListing = branch !== "legacy-manual";
  const listingQueryId =
    branch === "listing-fallback" ? context.listingFallbackQueryId : context.listingQueryId;

  return {
    sourceMode: branch === "legacy-manual" ? "manual" : "featured",
    source: isListing
      ? {
          mode: "listing",
          listingQueryId,
          listingTemplateId: context.listingTemplateId,
          listingManualTarget: {
            rowId: "",
            entryId: "",
          },
          contentTypeId: "",
          entryId: "",
        }
      : {
          mode: "legacy",
          listingQueryId: "",
          listingTemplateId: "",
          listingManualTarget: {
            rowId: "",
            entryId: "",
          },
          contentTypeId: context.contentTypeId,
          entryId,
        },
    fields: {
      showImage: true,
      showExcerpt: true,
      showMeta: true,
      showTags: true,
      tagLimit: 5,
    },
    cta: {
      label: "Read entry",
      hrefMode: "auto",
      href: "",
      opensInNewTab: false,
      style: "outline",
    },
    style: {
      radius: "lg",
      spacing: "md",
    },
    section: {
      title:
        branch === "legacy-manual"
          ? "Entry Teaser manual fixture"
          : branch === "listing-featured"
            ? "Entry Teaser listing fixture"
            : "Entry Teaser fallback fixture",
      headingLevel: "h2",
    },
    title: {
      headingLevel: "h3",
    },
    media: {
      mode: "image",
      aspect: "16:9",
      height: "md",
      fit: "cover",
    },
    layout: {
      maxWidth: "lg",
    },
    fallback: {
      title: "No fixture entry",
      description: "The Entry Teaser smoke fixture should stay populated.",
      fallbackToLatest: branch === "listing-fallback",
    },
    resolved: {
      item: buildEntryTeaserFixtureRuntimeItem(seed, entryId),
      sourceTypeId: context.contentTypeId,
      sourceTypeSlug: entryTeaserFixtureContentTypeSlug,
      resolvedAt: "2026-05-31T10:05:00.000Z",
      listingQueryId: isListing ? listingQueryId : "",
      listingTemplateId: isListing ? context.listingTemplateId : "",
    },
  };
}

export function normalizeEntryTeaserFixtureContentRoutes(
  value: unknown
): EntryTeaserFixtureContentRoute[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      if (typeof entry.type !== "string") return null;
      if (typeof entry.listPath !== "string") return null;
      if (typeof entry.detailPath !== "string") return null;
      const route: EntryTeaserFixtureContentRoute = {
        type: entry.type,
        listPath: entry.listPath,
        detailPath: entry.detailPath,
        enabled: typeof entry.enabled === "boolean" ? entry.enabled : true,
      };
      if (Object.prototype.hasOwnProperty.call(entry, "detailPageId")) {
        route.detailPageId =
          typeof entry.detailPageId === "string" && entry.detailPageId.trim()
            ? entry.detailPageId.trim()
            : null;
      }
      return route;
    })
    .filter((entry): entry is EntryTeaserFixtureContentRoute => Boolean(entry));
}

function isEntryTeaserFixtureRoute(route: EntryTeaserFixtureContentRoute): boolean {
  return (
    route.type === entryTeaserFixtureContentTypeSlug ||
    (route.listPath === entryTeaserFixtureListPath &&
      route.detailPath === entryTeaserFixtureDetailPath)
  );
}

export function buildEntryTeaserFixtureContentRoutes(
  currentValue: unknown
): EntryTeaserFixtureContentRoute[] {
  const fixtureRoute: EntryTeaserFixtureContentRoute = {
    type: entryTeaserFixtureContentTypeSlug,
    listPath: entryTeaserFixtureListPath,
    detailPath: entryTeaserFixtureDetailPath,
    enabled: true,
  };
  const existingRoutes = normalizeEntryTeaserFixtureContentRoutes(currentValue);
  const remainingRoutes = existingRoutes.filter((route) => !isEntryTeaserFixtureRoute(route));
  return [fixtureRoute, ...remainingRoutes];
}

function isEntryTeaserFixtureBlock(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.type === "entry-teaser";
}

function isEntryTeaserManagedFixtureBlock(value: unknown): boolean {
  if (!isEntryTeaserFixtureBlock(value)) return false;
  return (
    value.id === entryTeaserFixturePrimaryBlockId ||
    value.id === entryTeaserFixtureListingBlockId ||
    value.id === entryTeaserFixtureFallbackBlockId
  );
}

export function buildEntryTeaserFixturePageData(
  currentData: Record<string, unknown> | null | undefined,
  context: EntryTeaserFixtureContext
): Record<string, unknown> {
  const source = isRecord(currentData) ? currentData : {};
  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  const blocksWithoutManagedFixtures = sourceBlocks.filter(
    (block) => !isEntryTeaserManagedFixtureBlock(block)
  );
  let patchedPrimary = false;
  const blocks = blocksWithoutManagedFixtures.map((block) => {
    if (!patchedPrimary && isEntryTeaserFixtureBlock(block)) {
      patchedPrimary = true;
      const blockId =
        typeof block.id === "string" && block.id.trim()
          ? block.id.trim()
          : entryTeaserFixturePrimaryBlockId;
      return {
        ...block,
        id: blockId,
        type: "entry-teaser",
        variant: "horizontal",
        data: buildEntryTeaserFixtureWidgetData("legacy-manual", context),
      };
    }
    return block;
  });

  if (!patchedPrimary) {
    blocks.push({
      id: entryTeaserFixturePrimaryBlockId,
      type: "entry-teaser",
      variant: "horizontal",
      data: buildEntryTeaserFixtureWidgetData("legacy-manual", context),
    });
  }

  blocks.push(
    {
      id: entryTeaserFixtureListingBlockId,
      type: "entry-teaser",
      variant: "vertical",
      data: buildEntryTeaserFixtureWidgetData("listing-featured", context),
    },
    {
      id: entryTeaserFixtureFallbackBlockId,
      type: "entry-teaser",
      variant: "minimal",
      data: buildEntryTeaserFixtureWidgetData("listing-fallback", context),
    }
  );

  return {
    ...source,
    blocks,
  };
}

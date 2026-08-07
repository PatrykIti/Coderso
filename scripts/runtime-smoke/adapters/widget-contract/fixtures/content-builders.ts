import { isRecord } from "../contracts";
import {
  commerceProductFixtureDetailPath,
  commerceProductFixtureListPath,
  contentListFixtureFallbackBlockId,
  contentListFixtureImageSrc,
  postsFeedFixtureDetailPath,
  postsFeedFixtureFallbackBlockId,
  postsFeedFixtureImageSrc,
  postsFeedFixtureListPath,
  postsFeedFixturePostSeeds,
  productCompareFixtureFallbackBlockId,
  productGalleryFixtureFallbackBlockId,
  productGalleryFixtureProductBasePath,
  productGalleryFixtureViewAllHref,
  productTableFixtureFallbackBlockId,
  type CommerceFixtureContentRoute,
  type PostsFeedFixtureContentRoute,
  type PostsFeedFixturePostSeed,
} from "../fixture-data";

function buildContentListFixtureWidgetData(blockId: string): Record<string, unknown> {
  return {
    source: {
      mode: "legacy",
      listingQueryId: "",
      listingTemplateId: "",
      contentTypeId: "fixture-content-type",
      statusScope: "published",
      limit: 2,
      sort: "published-desc",
    },
    filters: {
      taxonomy: "",
      featuredOnly: false,
      searchQuery: "",
      authorId: "",
    },
    title: "Fixture stories",
    description: "Populated Content List smoke fixture.",
    pagination: {
      mode: "load-more",
      pageSize: 2,
      viewAllHref: "/fixture-content-list",
      viewAllLabel: "View all fixture stories",
      loadMoreLabel: "More fixture stories",
    },
    fields: {
      showImage: true,
      showExcerpt: true,
      showMeta: true,
      showCta: true,
    },
    emptyState: {
      title: "No fixture stories",
      description: "The Content List smoke fixture should stay populated.",
    },
    style: {
      columns: "2",
      gap: "lg",
      cardStyle: "elevated",
      imageAspect: "wide",
      tagMode: "badges",
      tagLimit: 2,
      ctaLabel: "Open story",
      backgroundColor: "var(--color-bg)",
      borderColor: "var(--color-border)",
      textColor: "var(--color-text)",
    },
    resolved: {
      items: [
        {
          id: "fixture-content-list-launch",
          title: "Fixture Launch Brief",
          slug: "launch-brief",
          href: "/fixture-content-list/launch-brief",
          excerpt: "A deterministic item with image, tags, metadata, and CTA proof.",
          imageSrc: contentListFixtureImageSrc,
          imageAlt: "Fixture Content List launch brief image",
          tags: ["launch", "featured"],
          authorName: "Fixture Editor",
          publishedAt: "2026-05-31T10:00:00.000Z",
          status: "published",
        },
        {
          id: "fixture-content-list-roadmap",
          title: "Fixture Roadmap Note",
          slug: "roadmap-note",
          href: "/fixture-content-list/roadmap-note",
          excerpt: "A second deterministic item that proves multi-card layout and gaps.",
          imageSrc: contentListFixtureImageSrc,
          imageAlt: "Fixture Content List roadmap note image",
          tags: ["roadmap", "release"],
          authorName: "Fixture Editor",
          publishedAt: "2026-05-30T10:00:00.000Z",
          status: "published",
        },
      ],
      total: 4,
      sourceTypeId: "fixture-content-type",
      sourceTypeSlug: "fixture-content-list",
      listPath: "/fixture-content-list",
      listingQueryId: "",
      listingTemplateId: "",
      resolvedAt: "2026-05-31T10:05:00.000Z",
      runtime: {
        rejectedTokens: [],
        page: 1,
        pageSize: 2,
        totalPages: 2,
        nextPageHref: `?cl.${blockId}.page=2`,
      },
    },
  };
}

function isContentListFixtureBlock(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.type === "content-list";
}

export function buildContentListFixturePageData(
  currentData: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const source = isRecord(currentData) ? currentData : {};
  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  let patchedContentList = false;
  const blocks = sourceBlocks.map((block) => {
    if (!patchedContentList && isContentListFixtureBlock(block)) {
      patchedContentList = true;
      const blockId =
        typeof block.id === "string" && block.id.trim()
          ? block.id.trim()
          : contentListFixtureFallbackBlockId;
      return {
        ...block,
        id: blockId,
        type: "content-list",
        variant: "cards",
        data: buildContentListFixtureWidgetData(blockId),
      };
    }
    return block;
  });

  if (!patchedContentList) {
    blocks.push({
      id: contentListFixtureFallbackBlockId,
      type: "content-list",
      variant: "cards",
      data: buildContentListFixtureWidgetData(contentListFixtureFallbackBlockId),
    });
  }

  return {
    ...source,
    blocks,
  };
}

function buildProductGalleryFixtureWidgetData(): Record<string, unknown> {
  return {
    source: {
      limit: 2,
      search: "",
      collectionIds: [],
      status: ["published"],
      sortField: "title",
      sortDir: "asc",
    },
    link: {
      basePath: productGalleryFixtureProductBasePath,
      target: "same-tab",
      ctaLabel: "View fixture product",
      ctaStyle: "button",
    },
    header: {
      title: "Product Gallery fixture",
      description: "Populated Product Gallery smoke fixture with image, links, and view-all proof.",
    },
    pagination: {
      mode: "view-all",
      viewAllHref: productGalleryFixtureViewAllHref,
      viewAllLabel: "View all fixture products",
    },
    curation: {
      mode: "query",
      productIds: [],
    },
    fields: {
      showExcerpt: true,
      showPrice: true,
      showStock: true,
      showStatus: true,
    },
    emptyState: {
      title: "No fixture products",
      description: "The Product Gallery smoke fixture should stay populated.",
    },
    style: {
      columns: "3",
      cardStyle: "outlined",
    },
    resolved: {
      items: [],
      total: 0,
      resolvedAt: "",
    },
  };
}

function isProductGalleryFixtureBlock(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.type === "product-gallery";
}

export function buildProductGalleryFixturePageData(
  currentData: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const source = isRecord(currentData) ? currentData : {};
  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  let patchedProductGallery = false;
  const blocks = sourceBlocks.map((block) => {
    if (!patchedProductGallery && isProductGalleryFixtureBlock(block)) {
      patchedProductGallery = true;
      const blockId =
        typeof block.id === "string" && block.id.trim()
          ? block.id.trim()
          : productGalleryFixtureFallbackBlockId;
      return {
        ...block,
        id: blockId,
        type: "product-gallery",
        variant: "cards",
        data: buildProductGalleryFixtureWidgetData(),
      };
    }
    return block;
  });

  if (!patchedProductGallery) {
    blocks.push({
      id: productGalleryFixtureFallbackBlockId,
      type: "product-gallery",
      variant: "cards",
      data: buildProductGalleryFixtureWidgetData(),
    });
  }

  return {
    ...source,
    blocks,
  };
}

function buildProductCompareFixtureWidgetData(): Record<string, unknown> {
  return {
    source: {
      limit: 3,
      search: "",
      collectionIds: [],
      productIds: [],
      status: ["published"],
      sortField: "title",
      sortDir: "asc",
    },
    rows: [
      { key: "price", visible: true },
      { key: "compareAt", visible: true },
      { key: "stock", visible: true },
      { key: "quantity", visible: true },
      { key: "slug", visible: true },
      { key: "excerpt", visible: true },
    ],
    header: {
      showImages: true,
      linkTitles: true,
      ctaMode: "view_product",
      ctaLabel: "Inspect fixture product",
    },
    section: {
      title: "Product Compare fixture",
      description: "Populated Product Compare smoke fixture with images, title links, and CTAs.",
      caption: "Fixture product comparison",
      hideCaption: false,
    },
    layout: {
      featuredProductId: "",
      stickyHeader: false,
    },
    emptyState: {
      title: "No fixture comparisons",
      description: "The Product Compare smoke fixture should stay populated.",
    },
    style: {},
    resolved: {
      rows: [],
      total: 0,
      resolvedAt: "",
    },
  };
}

function isProductCompareFixtureBlock(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.type === "product-compare";
}

export function buildProductCompareFixturePageData(
  currentData: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const source = isRecord(currentData) ? currentData : {};
  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  let patchedProductCompare = false;
  const blocks = sourceBlocks.map((block) => {
    if (!patchedProductCompare && isProductCompareFixtureBlock(block)) {
      patchedProductCompare = true;
      const blockId =
        typeof block.id === "string" && block.id.trim()
          ? block.id.trim()
          : productCompareFixtureFallbackBlockId;
      return {
        ...block,
        id: blockId,
        type: "product-compare",
        variant: "matrix",
        data: buildProductCompareFixtureWidgetData(),
      };
    }
    return block;
  });

  if (!patchedProductCompare) {
    blocks.push({
      id: productCompareFixtureFallbackBlockId,
      type: "product-compare",
      variant: "matrix",
      data: buildProductCompareFixtureWidgetData(),
    });
  }

  return {
    ...source,
    blocks,
  };
}

function buildProductTableFixtureWidgetData(): Record<string, unknown> {
  return {
    source: {
      limit: 3,
      search: "",
      collectionIds: [],
      status: ["published"],
      sortField: "title",
      sortDir: "asc",
    },
    header: {
      eyebrow: "Fixture catalog",
      title: "Product Table fixture",
      description: "Populated Product Table smoke fixture with images, links, and actions.",
    },
    fields: {
      showImage: true,
      showTitle: true,
      showExcerpt: true,
      showSlug: true,
      showPrice: true,
      showCompareAt: true,
      showStatus: true,
      showStock: true,
      showStockQuantity: true,
      showCollections: true,
    },
    links: {
      linkedColumn: "title",
      showAction: true,
      actionLabel: "Inspect fixture product",
      openInNewTab: false,
    },
    controls: {
      showSearchInput: false,
      showCollectionFilter: false,
      showStatusFilter: false,
      sorting: "indicator",
      pagination: "none",
      pageSize: 3,
    },
    format: {
      moneyLocale: "en-US",
      currencyDisplay: "symbol",
    },
    emptyState: {
      title: "No fixture products",
      description: "The Product Table smoke fixture should stay populated.",
    },
    style: {},
    resolved: {
      items: [],
      total: 0,
      resolvedAt: "",
      runtime: {
        availableCollections: [],
        availableStatuses: [],
      },
    },
  };
}

function isProductTableFixtureBlock(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.type === "product-table";
}

export function buildProductTableFixturePageData(
  currentData: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const source = isRecord(currentData) ? currentData : {};
  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  let patchedProductTable = false;
  const blocks = sourceBlocks.map((block) => {
    if (!patchedProductTable && isProductTableFixtureBlock(block)) {
      patchedProductTable = true;
      const blockId =
        typeof block.id === "string" && block.id.trim()
          ? block.id.trim()
          : productTableFixtureFallbackBlockId;
      return {
        ...block,
        id: blockId,
        type: "product-table",
        variant: "default",
        data: buildProductTableFixtureWidgetData(),
      };
    }
    return block;
  });

  if (!patchedProductTable) {
    blocks.push({
      id: productTableFixtureFallbackBlockId,
      type: "product-table",
      variant: "default",
      data: buildProductTableFixtureWidgetData(),
    });
  }

  return {
    ...source,
    blocks,
  };
}

export function normalizeCommerceFixtureContentRoutes(
  value: unknown
): CommerceFixtureContentRoute[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      if (typeof entry.type !== "string") return null;
      if (typeof entry.listPath !== "string") return null;
      if (typeof entry.detailPath !== "string") return null;
      const route: CommerceFixtureContentRoute = {
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
    .filter((entry): entry is CommerceFixtureContentRoute => Boolean(entry));
}

function isCommerceProductsFixtureRoute(route: CommerceFixtureContentRoute): boolean {
  return (
    route.type === "products" &&
    route.listPath === commerceProductFixtureListPath &&
    route.detailPath === commerceProductFixtureDetailPath
  );
}

export function buildCommerceFixtureContentRoutes(
  currentValue: unknown
): CommerceFixtureContentRoute[] {
  const fixtureRoute: CommerceFixtureContentRoute = {
    type: "products",
    listPath: commerceProductFixtureListPath,
    detailPath: commerceProductFixtureDetailPath,
    enabled: true,
  };
  const existingRoutes = normalizeCommerceFixtureContentRoutes(currentValue);
  const remainingRoutes = existingRoutes.filter((route) => !isCommerceProductsFixtureRoute(route));
  return [fixtureRoute, ...remainingRoutes];
}

export function buildPostsFeedFixturePostData(
  seed: PostsFeedFixturePostSeed
): Record<string, unknown> {
  return {
    excerpt: seed.excerpt,
    featuredImage: postsFeedFixtureImageSrc,
    featuredImageAlt: seed.imageAlt,
  };
}

function buildPostsFeedFixtureRuntimeItem(seed: PostsFeedFixturePostSeed): Record<string, unknown> {
  return {
    id: seed.slug,
    title: seed.title,
    slug: seed.slug,
    href: `${postsFeedFixtureListPath}/${seed.slug}`,
    excerpt: seed.excerpt,
    imageSrc: postsFeedFixtureImageSrc,
    imageAlt: seed.imageAlt,
    tags: seed.tags,
    authorName: seed.authorName,
    publishedAt: seed.publishedAt,
    status: "published",
  };
}

function buildPostsFeedFixtureWidgetData(blockId: string): Record<string, unknown> {
  return {
    source: {
      mode: "latest",
      category: "",
      manualPostIds: [],
      authorId: "",
      featuredFirst: true,
      dateRange: {
        from: "",
        to: "",
      },
      limit: 3,
      sort: "published-desc",
    },
    title: "Fixture posts",
    description: "Populated Posts Feed smoke fixture.",
    pagination: {
      mode: "load-more",
      pageSize: 2,
      viewAllHref: postsFeedFixtureListPath,
      viewAllLabel: "View all fixture posts",
      loadMoreLabel: "More fixture posts",
    },
    fields: {
      showImage: true,
      showExcerpt: true,
      showAuthor: true,
      showDate: true,
      showCta: true,
    },
    emptyState: {
      title: "No fixture posts",
      description: "The Posts Feed smoke fixture should stay populated.",
    },
    style: {
      columns: "2",
      gap: "lg",
      cardStyle: "elevated",
      imageAspect: "wide",
      ctaLabel: "Read post",
      backgroundColor: "var(--color-bg)",
      borderColor: "var(--color-border)",
      textColor: "var(--color-text)",
      motion: "fade",
    },
    resolved: {
      items: postsFeedFixturePostSeeds.map(buildPostsFeedFixtureRuntimeItem),
      total: postsFeedFixturePostSeeds.length,
      sourceMode: "latest",
      listPath: postsFeedFixtureListPath,
      resolvedAt: "2026-05-31T10:05:00.000Z",
      runtime: {
        page: 1,
        pageSize: 2,
        totalPages: 2,
        nextPageHref: `?cl.${blockId}.page=2`,
      },
    },
  };
}

export function normalizePostsFeedFixtureContentRoutes(
  value: unknown
): PostsFeedFixtureContentRoute[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      if (typeof entry.type !== "string") return null;
      if (typeof entry.listPath !== "string") return null;
      if (typeof entry.detailPath !== "string") return null;
      const route: PostsFeedFixtureContentRoute = {
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
    .filter((entry): entry is PostsFeedFixtureContentRoute => Boolean(entry));
}

function isPostsFeedFixtureRoute(route: PostsFeedFixtureContentRoute): boolean {
  return (
    (route.type === "post" || route.type === "posts") &&
    route.listPath === postsFeedFixtureListPath &&
    route.detailPath === postsFeedFixtureDetailPath
  );
}

export function buildPostsFeedFixtureContentRoutes(
  currentValue: unknown
): PostsFeedFixtureContentRoute[] {
  const fixtureRoute: PostsFeedFixtureContentRoute = {
    type: "posts",
    listPath: postsFeedFixtureListPath,
    detailPath: postsFeedFixtureDetailPath,
    enabled: true,
  };
  const existingRoutes = normalizePostsFeedFixtureContentRoutes(currentValue);
  const remainingRoutes = existingRoutes.filter((route) => !isPostsFeedFixtureRoute(route));
  return [fixtureRoute, ...remainingRoutes];
}

function isPostsFeedFixtureBlock(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.type === "posts-feed";
}

export function buildPostsFeedFixturePageData(
  currentData: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const source = isRecord(currentData) ? currentData : {};
  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  let patchedPostsFeed = false;
  const blocks = sourceBlocks.map((block) => {
    if (!patchedPostsFeed && isPostsFeedFixtureBlock(block)) {
      patchedPostsFeed = true;
      const blockId =
        typeof block.id === "string" && block.id.trim()
          ? block.id.trim()
          : postsFeedFixtureFallbackBlockId;
      return {
        ...block,
        id: blockId,
        type: "posts-feed",
        variant: "cards",
        data: buildPostsFeedFixtureWidgetData(blockId),
      };
    }
    return block;
  });

  if (!patchedPostsFeed) {
    blocks.push({
      id: postsFeedFixtureFallbackBlockId,
      type: "posts-feed",
      variant: "cards",
      data: buildPostsFeedFixtureWidgetData(postsFeedFixtureFallbackBlockId),
    });
  }

  return {
    ...source,
    blocks,
  };
}

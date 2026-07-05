import {
  getContentTypeCollectionWorkspaceCached,
  listContentTypesCached,
} from "@/services/contentTypesClient";
import { getDetailPageCached } from "@/services/detailPagesClient";
import { listAllEntriesCached, listEntriesCached } from "@/services/entriesClient";
import { listMenusCached } from "@/services/menusClient";
import { listMediaCached } from "@/services/mediaClient";
import { listPagesCached } from "@/services/pagesClient";
import { listFormsCached } from "@/services/formsClient";
import {
  listBookingBlackoutsCached,
  listBookingReservationsCached,
  listBookingResourcesCached,
  listBookingServicesCached,
} from "@/services/bookingClient";
import { listListingQueriesCached, listListingTemplatesCached } from "@/services/listingsClient";
import {
  listCommerceCollectionsCached,
  listCommerceProductsCached,
} from "@/services/commerceClient";
import { listPopupsCached } from "@/services/popupsClient";
import { listReviewsCached } from "@/services/reviewsClient";
import { listSolutionKitRunsCached, listSolutionKitsCached } from "@/services/solutionKitsClient";
import {
  listAdminThemeProfilesCached,
  listAdminThemeTemplatesCached,
} from "@/services/adminThemeClient";
import {
  getOverviewCached,
  getTopContentCached,
  getTopPagesCached,
  getTrafficOverviewCached,
} from "@/services/analyticsClient";
import { getBackupScheduleCached, listBackupsCached } from "@/services/backupsClient";
import { listImportHistoryCached } from "@/services/importExportClient";
import { listRedirectsCached } from "@/services/redirectsClient";
import { listRecentSearchesCached } from "@/services/searchClient";
import { listSeoCached } from "@/services/seoClient";
import { getSettingsCached } from "@/services/settingsClient";
import { getSiteSettingsCached } from "@/services/siteSettingsClient";
import { listPageTemplatesCached } from "@/services/pageTemplatesClient";
import { listWidgetCatalogCached } from "@/services/widgetsClient";
import {
  isExternalHref,
  resolveAdminRoutePath,
  resolveAdminBasePath,
  stripAdminBasePath,
} from "@/utils/adminPaths";
import { resolveCustomScreenWorkspacePrefetchTarget } from "@/ui/custom-screens/routeParams";

export type AdminPrefetchEntry = {
  match: string | ((path: string) => boolean);
  resolveKey?: (context: AdminPrefetchRunContext) => string;
  run: (context: AdminPrefetchRunContext) => Promise<unknown> | void;
};

export type AdminPrefetchRunContext = {
  href: string;
  basePath: string;
  path: string;
  activePath?: string;
};

type PrefetchOptions = {
  cooldownMs?: number;
  freshMs?: number;
  maxConcurrency?: number;
  schedule?: (callback: () => void) => void;
  now?: () => number;
};

export type AdminPrefetchRequestOptions = {
  activeHref?: string;
};

type QueuedPrefetch = {
  key: string;
  entry: AdminPrefetchEntry;
  context: AdminPrefetchRunContext;
};

export const prefetchWarmupOptions = { force: false } as const;

type CollectionWorkspacePrefetchTarget = {
  contentTypeId: string;
};

type DetailTemplatePrefetchTarget = CollectionWorkspacePrefetchTarget & {
  detailPageId: string;
};

const loadCustomScreensPrefetch = () => import("@/utils/adminPrefetchCustomScreens");

const defaultSchedule = (callback: () => void) => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(() => callback(), { timeout: 1200 });
    return;
  }
  setTimeout(callback, 0);
};

export const createAdminPrefetcher = (entries: AdminPrefetchEntry[], options?: PrefetchOptions) => {
  const cooldownMs = options?.cooldownMs ?? 15000;
  const freshMs = options?.freshMs ?? cooldownMs;
  const maxConcurrency = Math.max(1, options?.maxConcurrency ?? 2);
  const schedule = options?.schedule ?? defaultSchedule;
  const now = options?.now ?? (() => Date.now());
  const inFlight = new Map<string, Promise<void>>();
  const queued = new Set<string>();
  const queue: QueuedPrefetch[] = [];
  const lastAttempt = new Map<string, number>();
  const lastSuccess = new Map<string, number>();
  let activeCount = 0;
  let drainScheduled = false;

  const matchesEntry = (entry: AdminPrefetchEntry, path: string) =>
    typeof entry.match === "string" ? path.startsWith(entry.match) : entry.match(path);

  const entryMatchKey = (entry: AdminPrefetchEntry) =>
    typeof entry.match === "string" ? entry.match : "dynamic";

  const findEntryByPath = (path: string) =>
    entries.find((item) => matchesEntry(item, path)) ?? null;

  const drainQueue = () => {
    while (activeCount < maxConcurrency && queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      queued.delete(next.key);
      activeCount += 1;
      const startedAt = now();
      const promise = Promise.resolve()
        .then(() => next.entry.run(next.context))
        .then(() => {
          lastSuccess.set(next.key, startedAt);
        })
        .catch(() => undefined)
        .finally(() => {
          inFlight.delete(next.key);
          activeCount = Math.max(0, activeCount - 1);
          drainQueue();
        }) as Promise<void>;
      inFlight.set(next.key, promise);
    }
  };

  const scheduleDrain = () => {
    if (drainScheduled) return;
    drainScheduled = true;
    schedule(() => {
      drainScheduled = false;
      drainQueue();
    });
  };

  return (href: string, basePath?: string, request?: AdminPrefetchRequestOptions) => {
    if (!href) return;
    if (typeof window === "undefined") return;
    if (isExternalHref(href)) return;

    const resolvedBase = basePath ?? resolveAdminBasePath(href);
    const path = resolveAdminRoutePath(stripAdminBasePath(href, resolvedBase));
    const entry = findEntryByPath(path);
    if (!entry) return;
    let activePath: string | undefined;

    const activeHref = request?.activeHref;
    if (activeHref && !isExternalHref(activeHref)) {
      const activeBase = resolveAdminBasePath(activeHref);
      activePath = resolveAdminRoutePath(stripAdminBasePath(activeHref, activeBase));
      const activeEntry = findEntryByPath(activePath);
      if (activeEntry && entryMatchKey(activeEntry) === entryMatchKey(entry) && !entry.resolveKey) {
        return;
      }
    }

    const context: AdminPrefetchRunContext = {
      href,
      basePath: resolvedBase,
      path,
      activePath,
    };
    const key = entry.resolveKey?.(context) ?? entryMatchKey(entry);
    const currentTs = now();
    const successTs = lastSuccess.get(key);
    if (successTs != null && currentTs - successTs < freshMs) return;

    const lastTs = lastAttempt.get(key);
    if (lastTs != null && currentTs - lastTs < cooldownMs) return;

    if (inFlight.has(key)) return;
    if (queued.has(key)) return;
    lastAttempt.set(key, currentTs);

    queue.push({ key, entry, context });
    queued.add(key);
    scheduleDrain();
  };
};

export async function prefetchCustomScreenWorkspace(path: string) {
  const { prefetchCustomScreenWorkspaceData } = await loadCustomScreensPrefetch();
  return prefetchCustomScreenWorkspaceData(path, prefetchWarmupOptions);
}

export const resolveCollectionWorkspacePrefetchTarget = (
  path: string
): CollectionWorkspacePrefetchTarget | null => {
  const resolvedPath = resolveAdminRoutePath(path);
  const parts = resolvedPath.split("/").filter(Boolean);
  if (parts.length !== 4) return null;
  if (parts[0] !== "advanced" || parts[1] !== "engine") return null;
  if (parts[3] !== "collection") return null;
  const rawContentTypeId = parts[2];
  if (!rawContentTypeId) return null;
  try {
    return { contentTypeId: decodeURIComponent(rawContentTypeId) };
  } catch {
    return { contentTypeId: rawContentTypeId };
  }
};

export const resolveDetailTemplatePrefetchTarget = (
  path: string
): DetailTemplatePrefetchTarget | null => {
  const resolvedPath = resolveAdminRoutePath(path);
  const parts = resolvedPath.split("/").filter(Boolean);
  if (parts.length !== 6) return null;
  if (parts[0] !== "advanced" || parts[1] !== "engine") return null;
  if (parts[3] !== "collection" || parts[4] !== "detail-template") return null;
  const rawContentTypeId = parts[2];
  const rawDetailPageId = parts[5];
  if (!rawContentTypeId || !rawDetailPageId) return null;
  try {
    return {
      contentTypeId: decodeURIComponent(rawContentTypeId),
      detailPageId: decodeURIComponent(rawDetailPageId),
    };
  } catch {
    return { contentTypeId: rawContentTypeId, detailPageId: rawDetailPageId };
  }
};

export async function prefetchCollectionWorkspace(path: string) {
  const target = resolveCollectionWorkspacePrefetchTarget(path);
  if (!target) return false;

  await Promise.all([
    listContentTypesCached(prefetchWarmupOptions),
    getContentTypeCollectionWorkspaceCached(target.contentTypeId, prefetchWarmupOptions).catch(
      () => null
    ),
  ]);
  return true;
}

export async function prefetchDetailTemplateEditor(path: string) {
  const target = resolveDetailTemplatePrefetchTarget(path);
  if (!target) return false;

  const [, detailPage] = await Promise.all([
    getContentTypeCollectionWorkspaceCached(target.contentTypeId, prefetchWarmupOptions).catch(
      () => null
    ),
    getDetailPageCached(target.detailPageId, prefetchWarmupOptions).catch(() => null),
    listContentTypesCached(prefetchWarmupOptions),
  ] as const);

  if (detailPage?.contentTypeSlug) {
    await listEntriesCached(detailPage.contentTypeSlug, prefetchWarmupOptions).catch(() => null);
  }

  return true;
}

export async function prefetchSettingsRoute(path: string) {
  if (path === "/settings/site" || path.startsWith("/settings/site/")) {
    // The Site shell pickers moved to the Menus surface (`SiteShellDialog`,
    // TASK-458-01); the Site Settings page no longer consumes menus or
    // page-template caches, and the dialog loads them lazily on open.
    await Promise.all([
      getSiteSettingsCached(prefetchWarmupOptions),
      listPagesCached(prefetchWarmupOptions),
      listContentTypesCached(prefetchWarmupOptions),
    ]);
    return true;
  }

  await getSettingsCached(prefetchWarmupOptions);
  return true;
}

const defaultEntries: AdminPrefetchEntry[] = [
  {
    match: "/pages",
    run: () => listPagesCached(prefetchWarmupOptions),
  },
  {
    match: "/advanced/page-templates",
    run: () => listPageTemplatesCached(prefetchWarmupOptions),
  },
  {
    match: "/advanced/widgets",
    run: () => listWidgetCatalogCached(prefetchWarmupOptions),
  },
  {
    match: (path) => resolveDetailTemplatePrefetchTarget(path) !== null,
    resolveKey: ({ path }) => {
      const target = resolveDetailTemplatePrefetchTarget(path);
      return target
        ? `/advanced/engine/${encodeURIComponent(
            target.contentTypeId
          )}/collection/detail-template/${encodeURIComponent(target.detailPageId)}`
        : "/advanced/engine";
    },
    run: ({ path }) => prefetchDetailTemplateEditor(path),
  },
  {
    match: (path) => resolveCollectionWorkspacePrefetchTarget(path) !== null,
    resolveKey: ({ path }) => {
      const target = resolveCollectionWorkspacePrefetchTarget(path);
      return target
        ? `/advanced/engine/${encodeURIComponent(target.contentTypeId)}/collection`
        : "/advanced/engine";
    },
    run: ({ path }) => prefetchCollectionWorkspace(path),
  },
  {
    match: "/advanced/engine",
    run: () => listContentTypesCached(prefetchWarmupOptions),
  },
  {
    match: "/advanced/entries",
    run: () =>
      Promise.all([
        listContentTypesCached(prefetchWarmupOptions),
        listAllEntriesCached(prefetchWarmupOptions),
      ]),
  },
  {
    match: "/advanced/custom-screens",
    resolveKey: ({ path }) => {
      const target = resolveCustomScreenWorkspacePrefetchTarget(path);
      if (!target) return "/advanced/custom-screens";
      return target.entryId
        ? `/advanced/custom-screens/${target.screenId}/entries/${target.entryId}`
        : `/advanced/custom-screens/${target.screenId}/entries`;
    },
    run: async ({ path }) => {
      if (resolveCustomScreenWorkspacePrefetchTarget(path)) {
        return prefetchCustomScreenWorkspace(path);
      }
      const { prefetchCustomScreenListData } = await loadCustomScreensPrefetch();
      return prefetchCustomScreenListData(prefetchWarmupOptions);
    },
  },
  {
    match: "/advanced/forms",
    run: () => listFormsCached(prefetchWarmupOptions),
  },
  {
    match: "/advanced/listings",
    run: () =>
      Promise.all([
        listListingQueriesCached(prefetchWarmupOptions),
        listListingTemplatesCached(prefetchWarmupOptions),
      ]),
  },
  {
    match: "/advanced/filters",
    run: () => listListingQueriesCached(prefetchWarmupOptions),
  },
  {
    match: "/advanced/search",
    run: () => listListingQueriesCached(prefetchWarmupOptions),
  },
  {
    match: "/advanced/booking",
    run: () =>
      Promise.all([
        listBookingResourcesCached(prefetchWarmupOptions),
        listBookingServicesCached(prefetchWarmupOptions),
        listBookingReservationsCached(prefetchWarmupOptions),
        listBookingBlackoutsCached(prefetchWarmupOptions),
      ]),
  },
  {
    match: "/advanced/commerce",
    run: () =>
      Promise.all([
        listCommerceProductsCached(prefetchWarmupOptions),
        listCommerceCollectionsCached(prefetchWarmupOptions),
      ]),
  },
  {
    match: "/advanced/popups",
    run: () => listPopupsCached(prefetchWarmupOptions),
  },
  {
    match: "/advanced/reviews",
    run: () => listReviewsCached(prefetchWarmupOptions),
  },
  {
    match: "/advanced/solution-kits",
    run: () =>
      Promise.all([
        listSolutionKitsCached(prefetchWarmupOptions),
        listSolutionKitRunsCached(prefetchWarmupOptions),
      ]),
  },
  {
    match: "/menus",
    run: () => listMenusCached(prefetchWarmupOptions),
  },
  {
    match: "/media",
    run: () => listMediaCached(prefetchWarmupOptions),
  },
  {
    match: "/themes",
    run: () =>
      Promise.all([
        listAdminThemeTemplatesCached(prefetchWarmupOptions),
        listAdminThemeProfilesCached(prefetchWarmupOptions),
      ]),
  },
  {
    match: "/search",
    run: () => listRecentSearchesCached(prefetchWarmupOptions),
  },
  {
    match: "/seo",
    run: () => listSeoCached(prefetchWarmupOptions),
  },
  {
    match: "/analytics",
    run: () =>
      Promise.all([
        getOverviewCached(30, prefetchWarmupOptions),
        getTopContentCached({ limit: 50, rangeDays: 30, ...prefetchWarmupOptions }),
        getTrafficOverviewCached(30, prefetchWarmupOptions),
        getTopPagesCached({ rangeDays: 30, limit: 50, ...prefetchWarmupOptions }),
      ]),
  },
  {
    match: "/backups",
    run: () =>
      Promise.all([
        listBackupsCached({ page: 1, limit: 10, ...prefetchWarmupOptions }),
        getBackupScheduleCached(prefetchWarmupOptions),
      ]),
  },
  {
    match: "/tools/import-export",
    run: () => {
      listImportHistoryCached();
    },
  },
  {
    match: "/redirects",
    run: () => listRedirectsCached(prefetchWarmupOptions),
  },
  {
    match: "/settings",
    resolveKey: ({ path }) => path,
    run: ({ path }) => prefetchSettingsRoute(path),
  },
];

export const prefetchAdminRoute = createAdminPrefetcher(defaultEntries);

import { listContentTypesCached } from "@/services/contentTypesClient";
import { listAllEntriesCached } from "@/services/entriesClient";
import { listCustomScreensCached } from "@/services/customScreensClient";
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
import {
  listListingQueriesCached,
  listListingTemplatesCached,
} from "@/services/listingsClient";
import {
  listCommerceCollectionsCached,
  listCommerceProductsCached,
} from "@/services/commerceClient";
import { listPopupsCached } from "@/services/popupsClient";
import { listReviewsCached } from "@/services/reviewsClient";
import {
  listSolutionKitRunsCached,
  listSolutionKitsCached,
} from "@/services/solutionKitsClient";
import {
  listAdminThemeProfilesCached,
  listAdminThemeTemplatesCached,
} from "@/services/adminThemeClient";
import { listWidgetTemplateCategoriesCached } from "@/services/widgetTemplateCategoriesClient";
import { listWidgetTemplatesCached } from "@/services/widgetTemplatesClient";
import { listWidgetCatalogCached } from "@/services/widgetsClient";
import {
  isExternalHref,
  resolveAdminRoutePath,
  resolveAdminBasePath,
  stripAdminBasePath,
} from "@/utils/adminPaths";

export type AdminPrefetchEntry = {
  match: string;
  run: () => Promise<unknown> | void;
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
};

export const prefetchWarmupOptions = { force: false } as const;

const defaultSchedule = (callback: () => void) => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(() => callback(), { timeout: 1200 });
    return;
  }
  setTimeout(callback, 0);
};

export const createAdminPrefetcher = (
  entries: AdminPrefetchEntry[],
  options?: PrefetchOptions
) => {
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

  const findEntryByPath = (path: string) =>
    entries.find((item) => path.startsWith(item.match)) ?? null;

  const drainQueue = () => {
    while (activeCount < maxConcurrency && queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      queued.delete(next.key);
      activeCount += 1;
      const startedAt = now();
      const promise = Promise.resolve()
        .then(() => next.entry.run())
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

    const activeHref = request?.activeHref;
    if (activeHref && !isExternalHref(activeHref)) {
      const activeBase = resolveAdminBasePath(activeHref);
      const activePath = resolveAdminRoutePath(
        stripAdminBasePath(activeHref, activeBase)
      );
      const activeEntry = findEntryByPath(activePath);
      if (activeEntry?.match === entry.match) {
        return;
      }
    }

    const key = entry.match;
    const currentTs = now();
    const successTs = lastSuccess.get(key);
    if (successTs != null && currentTs - successTs < freshMs) return;

    const lastTs = lastAttempt.get(key);
    if (lastTs != null && currentTs - lastTs < cooldownMs) return;

    if (inFlight.has(key)) return;
    if (queued.has(key)) return;
    lastAttempt.set(key, currentTs);

    queue.push({ key, entry });
    queued.add(key);
    scheduleDrain();
  };
};

const defaultEntries: AdminPrefetchEntry[] = [
  {
    match: "/pages",
    run: () => listPagesCached(prefetchWarmupOptions),
  },
  {
    match: "/advanced/widgets",
    run: () =>
      Promise.all([
        listWidgetCatalogCached(prefetchWarmupOptions),
        listWidgetTemplateCategoriesCached(prefetchWarmupOptions),
        listWidgetTemplatesCached(prefetchWarmupOptions),
      ]),
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
    run: () =>
      Promise.all([
        listCustomScreensCached(prefetchWarmupOptions),
        listContentTypesCached(prefetchWarmupOptions),
      ]),
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
];

export const prefetchAdminRoute = createAdminPrefetcher(defaultEntries);

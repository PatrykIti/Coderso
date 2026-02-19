import { listContentTypesCached } from "@/services/contentTypesClient";
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
  schedule?: (callback: () => void) => void;
  now?: () => number;
};

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
  const schedule = options?.schedule ?? defaultSchedule;
  const now = options?.now ?? (() => Date.now());
  const inFlight = new Map<string, Promise<void>>();
  const lastRun = new Map<string, number>();

  return (href: string, basePath?: string) => {
    if (!href) return;
    if (typeof window === "undefined") return;
    if (isExternalHref(href)) return;

    const resolvedBase = basePath ?? resolveAdminBasePath(href);
    const path = resolveAdminRoutePath(stripAdminBasePath(href, resolvedBase));
    const entry = entries.find((item) => path.startsWith(item.match));
    if (!entry) return;

    const key = entry.match;
    const last = lastRun.get(key);
    if (last != null && now() - last < cooldownMs) return;
    if (inFlight.has(key)) return;
    lastRun.set(key, now());

    schedule(() => {
      const promise = Promise.resolve()
        .then(() => entry.run())
        .catch(() => undefined)
        .finally(() => {
          inFlight.delete(key);
        }) as Promise<void>;
      inFlight.set(key, promise);
    });
  };
};

const defaultEntries: AdminPrefetchEntry[] = [
  {
    match: "/pages",
    run: () => listPagesCached({ force: true }),
  },
  {
    match: "/coderso/widgets",
    run: () =>
      Promise.all([
        listWidgetCatalogCached({ force: true }),
        listWidgetTemplateCategoriesCached({ force: true }),
        listWidgetTemplatesCached({ force: true }),
      ]),
  },
  {
    match: "/coderso/engine",
    run: () => listContentTypesCached({ force: true }),
  },
  {
    match: "/coderso/entries",
    run: () => listContentTypesCached({ force: true }),
  },
  {
    match: "/coderso/forms",
    run: () => listFormsCached({ force: true }),
  },
  {
    match: "/coderso/listings",
    run: () =>
      Promise.all([
        listListingQueriesCached({ force: true }),
        listListingTemplatesCached({ force: true }),
      ]),
  },
  {
    match: "/coderso/filters",
    run: () => listListingQueriesCached({ force: true }),
  },
  {
    match: "/coderso/search",
    run: () => listListingQueriesCached({ force: true }),
  },
  {
    match: "/coderso/booking",
    run: () =>
      Promise.all([
        listBookingResourcesCached({ force: true }),
        listBookingServicesCached({ force: true }),
        listBookingReservationsCached({ force: true }),
        listBookingBlackoutsCached({ force: true }),
      ]),
  },
  {
    match: "/coderso/commerce",
    run: () =>
      Promise.all([
        listCommerceProductsCached({ force: true }),
        listCommerceCollectionsCached({ force: true }),
      ]),
  },
  {
    match: "/coderso/popups",
    run: () => listPopupsCached({ force: true }),
  },
  {
    match: "/coderso/reviews",
    run: () => listReviewsCached({ force: true }),
  },
  {
    match: "/coderso/solution-kits",
    run: () =>
      Promise.all([
        listSolutionKitsCached({ force: true }),
        listSolutionKitRunsCached({ force: true }),
      ]),
  },
  {
    match: "/menus",
    run: () => listMenusCached({ force: true }),
  },
  {
    match: "/media",
    run: () => listMediaCached({ force: true }),
  },
  {
    match: "/themes",
    run: () =>
      Promise.all([
        listAdminThemeTemplatesCached({ force: true }),
        listAdminThemeProfilesCached({ force: true }),
      ]),
  },
];

export const prefetchAdminRoute = createAdminPrefetcher(defaultEntries);

import { normalizeSitePath } from "../../site/cache/siteCache";
import {
  getPageSlugsByIds,
  listPublishedPagesForNavigation,
  type NavigationPageSummary,
} from "../pages/pageService";
import {
  getMenuWithItems,
  getMenuWithItemsByLocation,
  type MenuWithItems,
} from "../menus/menuService";
import {
  collectNavigationMenuPageIds,
  mapMenuNodesToNavigationItems,
} from "./navigationMenuMapping";
import {
  navigationDefaults,
  type NavigationItemMeta,
  type NavigationItem,
  type NavigationData,
  type NavigationLinkTarget,
} from "../../services/renderContracts/navigationRenderer";

export type NavigationLinksSource = NonNullable<NavigationData["linksSource"]>;

export type NavigationRuntimeResolution = {
  items: NavigationItem[];
  linksSource: NavigationLinksSource;
};

export type NavigationRuntimeResolverDeps = {
  listPublishedPagesForNavigation: () => Promise<NavigationPageSummary[]>;
  getMenuWithItems: (menuId: string) => Promise<MenuWithItems | null>;
  getMenuWithItemsByLocation: (location: string) => Promise<MenuWithItems | null>;
  getPageSlugsByIds: (pageIds: string[]) => Promise<Map<string, string>>;
};

const defaultDeps: NavigationRuntimeResolverDeps = {
  listPublishedPagesForNavigation,
  getMenuWithItems,
  getMenuWithItemsByLocation,
  getPageSlugsByIds,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const sanitizeHref = (value: string) => {
  const trimmed = value.trim();
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  return "#";
};

const normalizeTarget = (value: unknown): NavigationLinkTarget =>
  value === "blank" ? "blank" : "self";

const normalizeLinksSource = (value: unknown): NavigationLinksSource => {
  if (value === "menu" || value === "pages") return value;
  return "manual";
};

const toNavigationMeta = (value: unknown): NavigationItemMeta => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const source = value as Record<string, unknown>;
    const visibility =
      source.visibility === "all" ||
      source.visibility === "logged_in" ||
      source.visibility === "logged_out"
        ? source.visibility
        : "all";
    const description = readTrimmedString(source.description);
    const icon = readTrimmedString(source.icon);
    let badge: NavigationItemMeta["badge"] = null;
    if (source.badge && typeof source.badge === "object" && !Array.isArray(source.badge)) {
      const badgeSource = source.badge as Record<string, unknown>;
      const label = readTrimmedString(badgeSource.label);
      const tone =
        badgeSource.tone === "default" ||
        badgeSource.tone === "accent" ||
        badgeSource.tone === "success" ||
        badgeSource.tone === "warning" ||
        badgeSource.tone === "danger"
          ? badgeSource.tone
          : "default";
      if (label) {
        badge = { label, tone };
      }
    }
    return {
      visibility,
      badge,
      description,
      icon,
    };
  }

  return {
    visibility: "all",
    badge: null,
    description: null,
    icon: null,
  };
};

const normalizeNavigationItems = (value: unknown): NavigationItem[] => {
  if (!Array.isArray(value)) return [];

  const normalizeList = (list: unknown[]): NavigationItem[] => {
    const normalized: NavigationItem[] = [];
    for (const raw of list) {
      if (!isRecord(raw)) continue;
      const label = readTrimmedString(raw.label);
      const href = readTrimmedString(raw.href);
      if (!label || !href) continue;

      const children = Array.isArray(raw.children) ? normalizeList(raw.children) : undefined;
      normalized.push({
        label,
        href: sanitizeHref(href),
        target: normalizeTarget(raw.target),
        meta: toNavigationMeta(raw.meta),
        ...(children && children.length > 0 ? { children } : {}),
      });
    }
    return normalized;
  };

  return normalizeList(value);
};

const ensureMinimumItems = (
  items: NavigationItem[],
  fallback: NavigationItem[],
  minimumItems = 2
) => (items.length >= minimumItems ? items : fallback);

const resolveManualItems = (
  inputItems: unknown,
  normalizedItems: NavigationItem[],
  fallbackItems: NavigationItem[]
) => {
  if (normalizedItems.length > 0) return normalizedItems;
  if (Array.isArray(inputItems) && inputItems.length > 0) return [];
  return fallbackItems;
};

export async function resolveNavigationRuntimeData(
  input: unknown,
  options?: { menuLocationFallback?: string },
  deps?: Partial<NavigationRuntimeResolverDeps>
): Promise<NavigationRuntimeResolution> {
  const resolvedDeps = { ...defaultDeps, ...(deps ?? {}) } satisfies NavigationRuntimeResolverDeps;
  const data = isRecord(input) ? input : {};

  const requestedSource = normalizeLinksSource(data.linksSource);
  const defaultManualItems = normalizeNavigationItems(navigationDefaults.items);
  const manualItemsCandidate = normalizeNavigationItems(data.items);
  const manualItems = resolveManualItems(data.items, manualItemsCandidate, defaultManualItems);

  if (requestedSource === "manual") {
    return { items: manualItems, linksSource: "manual" };
  }

  if (requestedSource === "pages") {
    const pages = await resolvedDeps.listPublishedPagesForNavigation();
    const items = pages
      .map((page) => ({
        label: (page.title ?? "").trim() || page.slug,
        href: sanitizeHref(normalizeSitePath(page.slug)),
        meta: toNavigationMeta(undefined),
      }))
      .filter((item) => item.label.trim().length > 0);

    const safeItems = ensureMinimumItems(items, manualItems, 1);
    return {
      items: safeItems,
      linksSource: safeItems === items ? "pages" : "manual",
    };
  }

  const menuLocation = options?.menuLocationFallback ?? "primary";
  const menuId = readTrimmedString(data.menuKey);
  const menu = menuId
    ? await resolvedDeps.getMenuWithItems(menuId)
    : await resolvedDeps.getMenuWithItemsByLocation(menuLocation);

  if (!menu || menu.menu.status !== "published" || menu.items.length === 0) {
    return { items: manualItems, linksSource: "manual" };
  }

  const pageIds = collectNavigationMenuPageIds(menu.items);
  const pageSlugsById = await resolvedDeps.getPageSlugsByIds(pageIds);
  const menuItems = mapMenuNodesToNavigationItems(menu.items, pageSlugsById, {
    includeDefaultTarget: true,
  });

  const safeItems = ensureMinimumItems(menuItems, manualItems, 1);
  return { items: safeItems, linksSource: safeItems === menuItems ? "menu" : "manual" };
}

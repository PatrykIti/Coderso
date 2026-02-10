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
import type { MenuItemNode } from "../menus/treeBuilder";
import {
  navigationDefaults,
  type NavigationItem,
  type NavigationData,
} from "../../widgets/core/navigation";

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
  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return "#";
};

const normalizeLinksSource = (value: unknown): NavigationLinksSource => {
  if (value === "menu" || value === "pages") return value;
  return "manual";
};

const normalizeNavigationItems = (value: unknown): NavigationItem[] => {
  if (!Array.isArray(value)) return [];

  const normalizeList = (list: unknown[]): NavigationItem[] =>
    list
      .map((raw) => {
        if (!isRecord(raw)) return null;
        const label = readTrimmedString(raw.label);
        const href = readTrimmedString(raw.href);
        if (!label || !href) return null;

        const children = Array.isArray(raw.children) ? normalizeList(raw.children) : undefined;
        return {
          label,
          href: sanitizeHref(href),
          ...(children && children.length > 0 ? { children } : {}),
        } satisfies NavigationItem;
      })
      .filter((item): item is NavigationItem => Boolean(item));

  return normalizeList(value);
};

const ensureMinimumItems = (
  items: NavigationItem[],
  fallback: NavigationItem[],
  minimumItems = 2
) => (items.length >= minimumItems ? items : fallback);

const collectMenuPageIds = (nodes: MenuItemNode[]) => {
  const ids: string[] = [];
  const walk = (list: MenuItemNode[]) => {
    for (const node of list) {
      if (!node.href && node.pageId) ids.push(node.pageId);
      if (node.children.length > 0) walk(node.children);
    }
  };
  walk(nodes);
  return ids;
};

const mapMenuNodesToNavigationItems = (
  nodes: MenuItemNode[],
  pageSlugsById: Map<string, string>
): NavigationItem[] => {
  const walk = (list: MenuItemNode[]): NavigationItem[] =>
    list
      .map((node) => {
        const label = readTrimmedString(node.label);
        if (!label) return null;

        const hrefCandidate =
          readTrimmedString(node.href) ??
          (node.pageId ? pageSlugsById.get(node.pageId) ?? null : null) ??
          "#";
        const href = sanitizeHref(hrefCandidate);

        const children = node.children.length > 0 ? walk(node.children) : undefined;
        return {
          label,
          href,
          ...(children && children.length > 0 ? { children } : {}),
        } satisfies NavigationItem;
      })
      .filter((item): item is NavigationItem => Boolean(item));

  return walk(nodes);
};

export async function resolveNavigationRuntimeData(
  input: unknown,
  options?: { menuLocationFallback?: string },
  deps?: Partial<NavigationRuntimeResolverDeps>
): Promise<NavigationRuntimeResolution> {
  const resolvedDeps = { ...defaultDeps, ...(deps ?? {}) } satisfies NavigationRuntimeResolverDeps;
  const data = isRecord(input) ? input : {};

  const requestedSource = normalizeLinksSource(data.linksSource);
  const manualItemsCandidate = normalizeNavigationItems(data.items);
  const manualItems = ensureMinimumItems(manualItemsCandidate, navigationDefaults.items);

  if (requestedSource === "manual") {
    return { items: manualItems, linksSource: "manual" };
  }

  if (requestedSource === "pages") {
    const pages = await resolvedDeps.listPublishedPagesForNavigation();
    const items = pages
      .map((page) => ({
        label: (page.title ?? "").trim() || page.slug,
        href: sanitizeHref(normalizeSitePath(page.slug)),
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

  if (!menu || menu.items.length === 0) {
    return { items: manualItems, linksSource: "manual" };
  }

  const pageIds = collectMenuPageIds(menu.items);
  const pageSlugsById = await resolvedDeps.getPageSlugsByIds(pageIds);
  const menuItems = mapMenuNodesToNavigationItems(menu.items, pageSlugsById);

  const safeItems = ensureMinimumItems(menuItems, manualItems, 1);
  return { items: safeItems, linksSource: safeItems === menuItems ? "menu" : "manual" };
}

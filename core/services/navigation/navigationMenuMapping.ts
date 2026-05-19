import { resolveMenuItemSettings } from "../menus/menuItemSettings";
import type { NavigationItem, NavigationItemMeta } from "../../widgets/core/navigation";
import { normalizeWidgetSafeHref } from "../../widgets/core/widgetSafeHref";

export type NavigationMenuNodeLike = {
  label: string;
  href: string | null;
  pageId?: string | null;
  settings?: unknown;
  children: NavigationMenuNodeLike[];
};

const readTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizePagePath = (value: string) => {
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("#")) {
    return value;
  }
  const prefixed = value.startsWith("/") ? value : `/${value.replace(/^\/+/, "")}`;
  return prefixed.length > 1 && prefixed.endsWith("/") ? prefixed.slice(0, -1) : prefixed;
};

const normalizeNavigationMenuHref = (value: string | null | undefined) => {
  const trimmed = readTrimmedString(value);
  if (!trimmed) return "#";
  const candidate = normalizePagePath(trimmed);
  return (
    normalizeWidgetSafeHref(candidate, {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
    }) ?? "#"
  );
};

const menuSettingsToMeta = (value: unknown): NavigationItemMeta => {
  const settings = resolveMenuItemSettings(value);
  return {
    visibility: settings.visibility,
    badge: settings.badge,
    description: settings.description,
    icon: settings.icon,
  };
};

export const collectNavigationMenuPageIds = (nodes: NavigationMenuNodeLike[]) => {
  const ids = new Set<string>();
  const walk = (list: NavigationMenuNodeLike[]) => {
    for (const node of list) {
      const pageId = readTrimmedString(node.pageId);
      if (pageId) ids.add(pageId);
      if (node.children.length > 0) walk(node.children);
    }
  };
  walk(nodes);
  return Array.from(ids);
};

export function mapMenuNodesToNavigationItems(
  nodes: NavigationMenuNodeLike[],
  pagePathById: ReadonlyMap<string, string> = new Map(),
  options?: { includeDefaultTarget?: boolean }
): NavigationItem[] {
  return nodes.map((node) => {
    const pagePath = readTrimmedString(node.pageId)
      ? pagePathById.get(readTrimmedString(node.pageId)!)
      : null;

    return {
      label: node.label,
      href: normalizeNavigationMenuHref(node.href ?? pagePath ?? "#"),
      ...(options?.includeDefaultTarget ? { target: "self" as const } : {}),
      meta: menuSettingsToMeta(node.settings),
      children:
        node.children.length > 0
          ? mapMenuNodesToNavigationItems(node.children, pagePathById, options)
          : undefined,
    };
  });
}

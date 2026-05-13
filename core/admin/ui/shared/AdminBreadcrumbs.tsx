import { Children, isValidElement, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { AdminLink } from "@/ui/shared/AdminLink";

export type AdminBreadcrumbItem = {
  label: string;
  href?: string | null;
};

export type AdminBreadcrumbInput = string | AdminBreadcrumbItem;

type AdminBreadcrumbsProps = {
  items: AdminBreadcrumbInput[];
  className?: string;
};

const breadcrumbHrefByLabel: Record<string, string> = {
  Home: "/admin",
  Admin: "/admin",
  Dashboard: "/admin",
  Pages: "/pages",
  Posts: "/posts",
  Menus: "/menus",
  Media: "/media",
  "Media Library": "/media",
  Search: "/search",
  SEO: "/seo",
  "SEO Manager": "/seo",
  Analytics: "/analytics",
  Backups: "/backups",
  Redirects: "/redirects",
  "Site Management": "/redirects",
  Data: "/tools/import-export",
  "Import & Export": "/tools/import-export",
  Settings: "/settings",
  Security: "/settings/security",
  "Access Logs": "/access-logs",
  "Audit Logs": "/audit",
  Users: "/users",
  "Users & Roles": "/users",
  Advanced: "/advanced/engine",
  Coderso: "/advanced/engine",
  Engine: "/advanced/engine",
  Content: "/advanced/engine",
  "Content Types": "/advanced/engine",
  "Schema Builder": "/advanced/engine",
  Entries: "/advanced/entries",
  Screens: "/advanced/custom-screens",
  "Custom Screens": "/advanced/custom-screens",
  Widgets: "/advanced/widgets",
  Library: "/advanced/widgets",
  Templates: "/advanced/widgets",
  Listings: "/advanced/listings",
  Filters: "/advanced/filters",
  Forms: "/advanced/forms",
  Booking: "/advanced/booking",
  Reviews: "/advanced/reviews",
  Commerce: "/advanced/commerce",
  Popups: "/advanced/popups",
  "Solution Kits": "/advanced/solution-kits",
  Store: "/store",
  Plugins: "/store",
  "Plugin Store": "/store",
  Visual: "/themes",
  Themes: "/themes",
  "Theme Editor": "/themes",
  "Admin UI Theme": "/themes",
};

const normalizeLabel = (value: string) => value.replace(/\s+/g, " ").trim();

const splitBreadcrumbText = (value: string) => value.split("/").map(normalizeLabel).filter(Boolean);

const isLegacyBreadcrumbClassName = (className: unknown) =>
  typeof className === "string" &&
  className.includes("items-center") &&
  className.includes("text-sm") &&
  className.includes("text-muted-foreground");

const extractDirectText = (node: ReactNode): string | null => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    const children = Children.toArray(node.props.children);
    if (children.length !== 1) return null;
    const child = children[0];
    if (typeof child === "string" || typeof child === "number") return String(child);
  }
  return null;
};

const extractBreadcrumbLabels = (node: ReactNode): string[] | null => {
  if (typeof node === "string" || typeof node === "number") {
    const labels = splitBreadcrumbText(String(node));
    return labels.length >= 2 ? labels : null;
  }
  if (!isValidElement<{ className?: unknown; children?: ReactNode }>(node)) return null;
  if (!isLegacyBreadcrumbClassName(node.props.className)) return null;

  const labels: string[] = [];
  let sawSeparator = false;
  for (const child of Children.toArray(node.props.children)) {
    const text = extractDirectText(child);
    if (text === null) return null;
    const label = normalizeLabel(text);
    if (!label) continue;
    if (label === "/") {
      sawSeparator = true;
      continue;
    }
    labels.push(label);
  }
  return sawSeparator && labels.length >= 2 ? labels : null;
};

export const isAdminBreadcrumbItems = (value: unknown): value is AdminBreadcrumbInput[] =>
  Array.isArray(value) &&
  value.every((item) => {
    if (typeof item === "string") {
      const label = normalizeLabel(item);
      return label.length > 0;
    }
    return (
      Boolean(item) &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      typeof (item as AdminBreadcrumbItem).label === "string" &&
      ((item as AdminBreadcrumbItem).href === undefined ||
        (item as AdminBreadcrumbItem).href === null ||
        typeof (item as AdminBreadcrumbItem).href === "string")
    );
  });

export const buildAdminBreadcrumbItemsFromNode = (
  node: ReactNode
): AdminBreadcrumbItem[] | null => {
  const labels = extractBreadcrumbLabels(node);
  if (!labels) return null;
  const lastIndex = labels.length - 1;
  return labels.map((label, index) => ({
    label,
    href: index < lastIndex ? (breadcrumbHrefByLabel[label] ?? null) : null,
  }));
};

export function AdminBreadcrumbs({ items, className }: AdminBreadcrumbsProps) {
  const normalizedItems = items
    .map((input) => (typeof input === "string" ? { label: input } : input))
    .map((item, index) => {
      const label = normalizeLabel(item.label);
      const isLast = index === items.length - 1;
      return {
        ...item,
        label,
        href: isLast ? null : (item.href ?? breadcrumbHrefByLabel[label] ?? null),
      };
    })
    .filter((item) => item.label.length > 0);

  if (normalizedItems.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        {normalizedItems.map((item, index) => {
          const isLast = index === normalizedItems.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-[var(--admin-topbar-text)]/60">
                  /
                </span>
              ) : null}
              {item.href && !isLast ? (
                <AdminLink
                  href={item.href}
                  prefetch
                  className="truncate rounded-sm outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </AdminLink>
              ) : (
                <span
                  className={cn("truncate", isLast ? "text-[var(--admin-base-text)]" : null)}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export const DEFAULT_ADMIN_PATH = "/admin";

const normalizePath = (input: string) => {
  const withoutHash = input.split("#")[0] ?? input;
  const base = withoutHash.split("?")[0] ?? withoutHash;
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base;
};

export const resolveAdminBasePath = (pathname?: string) => {
  const source =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : DEFAULT_ADMIN_PATH);
  const normalized = normalizePath(source);
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) return DEFAULT_ADMIN_PATH;
  return `/${parts[0]}`;
};

export const stripAdminBasePath = (pathname: string, basePath: string) => {
  const normalized = normalizePath(pathname);
  if (normalized === basePath) return "/";
  if (normalized.startsWith(`${basePath}/`)) {
    return normalized.slice(basePath.length) || "/";
  }
  return normalized;
};

export const withAdminBasePath = (basePath: string, path: string) => {
  if (!path) return basePath;
  if (path.startsWith(basePath)) return path;
  if (path.startsWith(DEFAULT_ADMIN_PATH)) {
    return `${basePath}${path.slice(DEFAULT_ADMIN_PATH.length)}`;
  }
  if (path.startsWith("/")) return `${basePath}${path}`;
  return `${basePath}/${path}`;
};

export const isExternalHref = (href: string) =>
  href.startsWith("http://") ||
  href.startsWith("https://") ||
  href.startsWith("mailto:");

const splitPathSuffix = (href: string) => {
  const hashIndex = href.indexOf("#");
  const queryIndex = href.indexOf("?");
  let splitIndex = -1;
  if (hashIndex >= 0 && queryIndex >= 0) {
    splitIndex = Math.min(hashIndex, queryIndex);
  } else if (hashIndex >= 0) {
    splitIndex = hashIndex;
  } else if (queryIndex >= 0) {
    splitIndex = queryIndex;
  }
  if (splitIndex < 0) {
    return { path: href, suffix: "" };
  }
  return {
    path: href.slice(0, splitIndex),
    suffix: href.slice(splitIndex),
  };
};

const aliasPrefixes: Array<{ from: string; to: string }> = [
  { from: "/content-types", to: "/coderso/engine" },
  { from: "/entries", to: "/coderso/entries" },
  { from: "/content", to: "/coderso/entries" },
  { from: "/widgets", to: "/coderso/widgets" },
  { from: "/forms", to: "/coderso/forms" },
  { from: "/posts", to: "/coderso/posts" },
  { from: "/listings", to: "/coderso/listings" },
  { from: "/booking", to: "/coderso/booking" },
  { from: "/commerce", to: "/coderso/commerce" },
];

export const resolveAdminRoutePath = (path: string) => {
  const normalized = normalizePath(path.startsWith("/") ? path : `/${path}`);
  for (const alias of aliasPrefixes) {
    if (normalized === alias.from) return alias.to;
    if (normalized.startsWith(`${alias.from}/`)) {
      return `${alias.to}${normalized.slice(alias.from.length)}`;
    }
  }
  return normalized;
};

const toCanonicalAdminHref = (basePath: string, href: string) => {
  if (isExternalHref(href)) return href;
  const { path, suffix } = splitPathSuffix(href);
  const absolutePath = withAdminBasePath(basePath, path || "/");
  const relativePath = stripAdminBasePath(absolutePath, basePath);
  const canonicalPath = resolveAdminRoutePath(relativePath);
  return `${withAdminBasePath(basePath, canonicalPath)}${suffix}`;
};

export const resolveAdminHref = (basePath: string, href: string) =>
  toCanonicalAdminHref(basePath, href);

const normalizeComparableHref = (href: string) => normalizePath(splitPathSuffix(href).path);

export const isAdminHrefActive = (
  basePath: string,
  itemHref: string,
  activeHref?: string
) => {
  if (!activeHref) return false;
  const itemResolved = normalizeComparableHref(
    toCanonicalAdminHref(basePath, itemHref)
  );
  const activeResolved = normalizeComparableHref(
    toCanonicalAdminHref(basePath, activeHref)
  );
  if (itemResolved === activeResolved) return true;
  if (itemResolved === basePath) return false;
  return activeResolved.startsWith(`${itemResolved}/`);
};

export const mapNavItems = <T extends { href: string }>(items: T[], basePath: string) =>
  items.map((item) => ({
    ...item,
    href: resolveAdminHref(basePath, item.href),
  }));

export const mapNavSections = <
  T extends {
    items?: { href: string }[];
    groups?: { items: { href: string }[] }[];
  },
>(
  sections: T[],
  basePath: string
) =>
  sections.map((section) => ({
    ...section,
    items: section.items ? mapNavItems(section.items, basePath) : section.items,
    groups: section.groups
      ? section.groups.map((group) => ({
          ...group,
          items: mapNavItems(group.items, basePath),
        }))
      : section.groups,
  }));

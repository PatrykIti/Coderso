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

export const resolveAdminHref = (basePath: string, href: string) => {
  if (isExternalHref(href)) return href;
  if (href.startsWith(basePath)) return href;
  return withAdminBasePath(basePath, href);
};

export const mapNavItems = <T extends { href: string }>(items: T[], basePath: string) =>
  items.map((item) => ({
    ...item,
    href: resolveAdminHref(basePath, item.href),
  }));

export const mapNavSections = <T extends { items: { href: string }[] }>(
  sections: T[],
  basePath: string
) =>
  sections.map((section) => ({
    ...section,
    items: mapNavItems(section.items, basePath),
  }));

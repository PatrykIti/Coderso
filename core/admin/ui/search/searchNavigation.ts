import type { SearchItem } from "./SearchResults";
import { resolveAdminBasePath, withAdminBasePath } from "@/utils/adminPaths";

export function resolveSearchDestination(item: SearchItem): string | null {
  const basePath = resolveAdminBasePath();
  if (item.type === "page") {
    return withAdminBasePath(basePath, `/pages/${encodeURIComponent(item.id)}`);
  }

  if (item.type === "entry") {
    const typeSlug =
      item.entryTypeSlug ??
      (item.categoryId?.startsWith("entry:")
        ? item.categoryId.split(":")[1]
        : null);
    if (typeSlug) {
      return withAdminBasePath(
        basePath,
        `/entries/${encodeURIComponent(typeSlug)}/${encodeURIComponent(item.id)}`
      );
    }
    return withAdminBasePath(basePath, "/entries");
  }

  if (item.type === "media") {
    return withAdminBasePath(basePath, `/media?selected=${encodeURIComponent(item.id)}`);
  }

  if (item.type === "user") {
    return withAdminBasePath(basePath, `/users?user=${encodeURIComponent(item.id)}`);
  }

  return null;
}

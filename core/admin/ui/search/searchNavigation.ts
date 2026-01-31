import type { SearchItem } from "./SearchResults";

export function resolveSearchDestination(item: SearchItem): string | null {
  if (item.type === "page") {
    return `/admin/pages/${encodeURIComponent(item.id)}`;
  }

  if (item.type === "entry") {
    const typeSlug =
      item.entryTypeSlug ??
      (item.categoryId?.startsWith("entry:")
        ? item.categoryId.split(":")[1]
        : null);
    if (typeSlug) {
      return `/admin/entries/${encodeURIComponent(typeSlug)}/${encodeURIComponent(item.id)}`;
    }
    return "/admin/entries";
  }

  if (item.type === "media") {
    return `/admin/media?selected=${encodeURIComponent(item.id)}`;
  }

  if (item.type === "user") {
    return `/admin/users?user=${encodeURIComponent(item.id)}`;
  }

  return null;
}

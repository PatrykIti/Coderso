import { matchRoute, normalizePath } from "../server/router";
import type { ContentRouteSetting } from "../services/settings/settingsService";

export type ContentRouteMatch = {
  type: string;
  mode: "list" | "detail";
  params: Record<string, string>;
  listPath: string;
  detailPath: string;
  detailPageId: string | null;
};

export function matchContentRoute(
  pathname: string,
  routes: ContentRouteSetting[]
): ContentRouteMatch | null {
  const normalizedPath = normalizePath(pathname);

  for (const route of routes) {
    if (!route.enabled) continue;
    const detailMatch = matchRoute(route.detailPath, normalizedPath);
    if (detailMatch.matched) {
      return {
        type: route.type,
        mode: "detail",
        params: detailMatch.params,
        listPath: route.listPath,
        detailPath: route.detailPath,
        detailPageId: route.detailPageId ?? null,
      };
    }
  }

  for (const route of routes) {
    if (!route.enabled) continue;
    if (normalizePath(route.listPath) === normalizedPath) {
      return {
        type: route.type,
        mode: "list",
        params: {},
        listPath: route.listPath,
        detailPath: route.detailPath,
        detailPageId: route.detailPageId ?? null,
      };
    }
  }

  return null;
}

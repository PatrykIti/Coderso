import { matchRoute, normalizePath } from "../server/router";
import type { ContentRouteSetting } from "../services/settings/settingsService";
import { compareContentRouteDetailSpecificity } from "../services/settings/contentRoutePaths";

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

  const detailRoutes = routes
    .filter((route) => route.enabled)
    .sort((left, right) => compareContentRouteDetailSpecificity(left.detailPath, right.detailPath));

  for (const route of detailRoutes) {
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

  return null;
}

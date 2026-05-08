import {
  canonicalizeContentRouteDetailPath,
  compareContentRouteDetailSpecificity,
  matchesContentRouteDetailPath,
  normalizeContentRouteDetailPath,
  normalizeContentRouteListPath,
} from "../../../services/settings/contentRoutePaths";

export type SiteContentRouteForm = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
  detailPageId?: string | null;
};

export type RouteFieldErrors = {
  listPath?: string;
  detailPath?: string;
  detailPageId?: string;
};

export type RouteValidationResult = {
  hasErrors: boolean;
  errorsByType: Record<string, RouteFieldErrors>;
};

export const normalizeRouteInput = (value: string, allowRoot: boolean) => {
  try {
    return allowRoot
      ? normalizeContentRouteListPath(value)
      : normalizeContentRouteDetailPath(value);
  } catch {
    return null;
  }
};

export const buildDefaultRoute = (slug: string): SiteContentRouteForm => ({
  type: slug,
  listPath: `/${slug}`,
  detailPath: `/${slug}/:slug`,
  enabled: true,
});

const detailPageIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const normalizeDetailPageIdInput = (value: string | null | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

export const mergeContentRoutes = (
  existing: SiteContentRouteForm[],
  contentTypes: Array<{ slug: string }>
) => {
  const existingMap = new Map(existing.map((route) => [route.type, route]));
  const merged = contentTypes.map(
    (type) => existingMap.get(type.slug) ?? buildDefaultRoute(type.slug)
  );
  const extras = existing.filter((route) => !contentTypes.some((type) => type.slug === route.type));
  return [...merged, ...extras];
};

const ensureError = (errorsByType: Record<string, RouteFieldErrors>, type: string) => {
  if (!errorsByType[type]) {
    errorsByType[type] = {};
  }
  return errorsByType[type];
};

export const validateContentRoutes = (routes: SiteContentRouteForm[]): RouteValidationResult => {
  const errorsByType: Record<string, RouteFieldErrors> = {};
  const listMap = new Map<string, string[]>();
  const detailMap = new Map<string, string[]>();
  const normalizedLists = new Map<string, string>();
  const normalizedDetails = new Map<string, string>();

  routes.forEach((route) => {
    if (!route.enabled) return;
    const normalizedList = normalizeRouteInput(route.listPath, true);
    const normalizedDetail = normalizeRouteInput(route.detailPath, false);

    if (!normalizedList) {
      ensureError(errorsByType, route.type).listPath = "List path is required.";
    } else if (normalizedList.includes(":")) {
      ensureError(errorsByType, route.type).listPath = "List path must be a static URL.";
    } else {
      const listOwners = listMap.get(normalizedList) ?? [];
      listOwners.push(route.type);
      listMap.set(normalizedList, listOwners);
      normalizedLists.set(route.type, normalizedList);
    }

    if (!normalizedDetail) {
      ensureError(errorsByType, route.type).detailPath = "Detail path is required.";
    } else {
      const detailOwners =
        detailMap.get(canonicalizeContentRouteDetailPath(normalizedDetail)) ?? [];
      detailOwners.push(route.type);
      detailMap.set(canonicalizeContentRouteDetailPath(normalizedDetail), detailOwners);
      normalizedDetails.set(route.type, normalizedDetail);
    }

    if (normalizedList && normalizedDetail && normalizedList === normalizedDetail) {
      const error = ensureError(errorsByType, route.type);
      error.listPath = "List and detail paths must be different.";
      error.detailPath = "List and detail paths must be different.";
    }

    const normalizedDetailPageId = normalizeDetailPageIdInput(route.detailPageId);
    if (normalizedDetailPageId && !detailPageIdPattern.test(normalizedDetailPageId)) {
      ensureError(errorsByType, route.type).detailPageId = "Detail page ID must be a valid UUID.";
    }
  });

  for (const [path, owners] of listMap.entries()) {
    if (owners.length < 2) continue;
    owners.forEach((type) => {
      const error = ensureError(errorsByType, type);
      if (!error.listPath) {
        error.listPath = `Conflict: ${path} is used by multiple content types.`;
      }
    });
  }

  for (const [path, owners] of detailMap.entries()) {
    if (owners.length < 2) continue;
    owners.forEach((type) => {
      const error = ensureError(errorsByType, type);
      if (!error.detailPath) {
        error.detailPath = `Conflict: ${path.replace(":param", ":slug")} is used by multiple content types.`;
      }
    });
  }

  const sortedDetailPaths = [...normalizedDetails.entries()].sort((left, right) =>
    compareContentRouteDetailSpecificity(left[1], right[1])
  );

  for (const [listType, listPath] of normalizedLists.entries()) {
    for (const [detailType, detailPath] of sortedDetailPaths) {
      if (listType === detailType) continue;
      if (!matchesContentRouteDetailPath(detailPath, listPath)) continue;
      const listError = ensureError(errorsByType, listType);
      if (!listError.listPath) {
        listError.listPath = `Conflict: ${listPath} is shadowed by detail route ${detailPath}.`;
      }
      const detailError = ensureError(errorsByType, detailType);
      if (!detailError.detailPath) {
        detailError.detailPath = `Conflict: ${detailPath} shadows list route ${listPath}.`;
      }
    }
  }

  return {
    hasErrors: Object.keys(errorsByType).length > 0,
    errorsByType,
  };
};

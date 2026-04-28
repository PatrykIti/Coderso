export type SiteContentRouteForm = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
};

export type RouteFieldErrors = {
  listPath?: string;
  detailPath?: string;
};

export type RouteValidationResult = {
  hasErrors: boolean;
  errorsByType: Record<string, RouteFieldErrors>;
};

export const normalizeRouteInput = (value: string, allowRoot: boolean) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (!allowRoot && prefixed === "/") return null;
  return prefixed.length > 1 && prefixed.endsWith("/")
    ? prefixed.slice(0, -1)
    : prefixed;
};

export const buildDefaultRoute = (slug: string): SiteContentRouteForm => ({
  type: slug,
  listPath: `/${slug}`,
  detailPath: `/${slug}/:slug`,
  enabled: true,
});

export const mergeContentRoutes = (
  existing: SiteContentRouteForm[],
  contentTypes: Array<{ slug: string }>
) => {
  const existingMap = new Map(existing.map((route) => [route.type, route]));
  const merged = contentTypes.map((type) =>
    existingMap.get(type.slug) ?? buildDefaultRoute(type.slug)
  );
  const extras = existing.filter(
    (route) => !contentTypes.some((type) => type.slug === route.type)
  );
  return [...merged, ...extras];
};

const ensureError = (
  errorsByType: Record<string, RouteFieldErrors>,
  type: string
) => {
  if (!errorsByType[type]) {
    errorsByType[type] = {};
  }
  return errorsByType[type];
};

export const validateContentRoutes = (
  routes: SiteContentRouteForm[]
): RouteValidationResult => {
  const errorsByType: Record<string, RouteFieldErrors> = {};
  const listMap = new Map<string, string[]>();
  const detailMap = new Map<string, string[]>();

  routes.forEach((route) => {
    if (!route.enabled) return;
    const normalizedList = normalizeRouteInput(route.listPath, true);
    const normalizedDetail = normalizeRouteInput(route.detailPath, false);

    if (!normalizedList) {
      ensureError(errorsByType, route.type).listPath = "List path is required.";
    } else if (normalizedList.includes(":")) {
      ensureError(errorsByType, route.type).listPath =
        "List path must be a static URL.";
    } else {
      const listOwners = listMap.get(normalizedList) ?? [];
      listOwners.push(route.type);
      listMap.set(normalizedList, listOwners);
    }

    if (!normalizedDetail) {
      ensureError(errorsByType, route.type).detailPath =
        "Detail path is required.";
    } else if (
      !normalizedDetail.includes(":slug") &&
      !normalizedDetail.includes(":id")
    ) {
      ensureError(errorsByType, route.type).detailPath =
        "Detail path must include :slug or :id.";
    } else {
      const detailOwners = detailMap.get(normalizedDetail) ?? [];
      detailOwners.push(route.type);
      detailMap.set(normalizedDetail, detailOwners);
    }

    if (normalizedList && normalizedDetail && normalizedList === normalizedDetail) {
      const error = ensureError(errorsByType, route.type);
      error.listPath = "List and detail paths must be different.";
      error.detailPath = "List and detail paths must be different.";
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
        error.detailPath = `Conflict: ${path} is used by multiple content types.`;
      }
    });
  }

  return {
    hasErrors: Object.keys(errorsByType).length > 0,
    errorsByType,
  };
};

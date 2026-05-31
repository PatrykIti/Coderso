const detailPathParamNames = new Set(["slug", "id"]);

const normalizeBaseRoutePath = (value: unknown, allowRoot: boolean) => {
  if (typeof value !== "string") {
    throw new Error("settings_value_invalid");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("settings_value_invalid");
  }
  if (allowRoot && trimmed === "/") return "/";
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed.endsWith("/") && prefixed.length > 1 ? prefixed.slice(0, -1) : prefixed;
};

const readRouteSegments = (path: string) => path.split("/").filter(Boolean);

export const normalizeContentRouteListPath = (value: unknown) => {
  const normalized = normalizeBaseRoutePath(value, true);
  if (normalized.includes(":")) {
    throw new Error("settings_value_invalid");
  }
  return normalized;
};

export const normalizeContentRouteDetailPath = (value: unknown) => {
  const normalized = normalizeBaseRoutePath(value, false);
  const segments = readRouteSegments(normalized);
  const dynamicSegments = segments.filter((segment) => segment.startsWith(":"));

  if (dynamicSegments.length !== 1) {
    throw new Error("settings_value_invalid");
  }

  const detailSegment = segments.at(-1);
  if (!detailSegment?.startsWith(":")) {
    throw new Error("settings_value_invalid");
  }

  const paramName = detailSegment.slice(1);
  if (!detailPathParamNames.has(paramName)) {
    throw new Error("settings_value_invalid");
  }

  for (const segment of segments.slice(0, -1)) {
    if (segment.startsWith(":") || segment.includes(":")) {
      throw new Error("settings_value_invalid");
    }
  }

  return normalized;
};

export const canonicalizeContentRouteDetailPath = (path: string) =>
  readRouteSegments(path)
    .map((segment, index, segments) =>
      index === segments.length - 1 && segment.startsWith(":") ? ":param" : segment
    )
    .join("/");

export const compareContentRouteDetailSpecificity = (left: string, right: string) => {
  const leftSegments = readRouteSegments(left);
  const rightSegments = readRouteSegments(right);
  const staticDelta =
    rightSegments.filter((segment) => !segment.startsWith(":")).length -
    leftSegments.filter((segment) => !segment.startsWith(":")).length;
  if (staticDelta !== 0) return staticDelta;
  const lengthDelta = rightSegments.length - leftSegments.length;
  if (lengthDelta !== 0) return lengthDelta;
  return right.localeCompare(left);
};

export const matchesContentRouteDetailPath = (detailPath: string, pathname: string) => {
  const detailSegments = readRouteSegments(detailPath);
  const pathSegments = readRouteSegments(pathname);
  if (detailSegments.length !== pathSegments.length) return false;

  for (const [index, segment] of detailSegments.entries()) {
    const candidate = pathSegments[index];
    if (!segment?.startsWith(":") && segment !== candidate) {
      return false;
    }
  }

  return true;
};

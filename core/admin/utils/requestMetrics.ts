export type RequestMetricEvent = {
  path: string;
  method: string;
  route: string;
  startedAt: number;
  durationMs: number;
  status: number;
  ok: boolean;
  errorCode: string | null;
};

export type RequestMetricSnapshotItem = {
  path: string;
  method: string;
  route: string;
  count: number;
  errorCount: number;
  avgDurationMs: number;
  maxDurationMs: number;
  lastStatus: number;
  lastStartedAt: number;
};

export type RequestMetricSnapshot = {
  windowMs: number | null;
  total: number;
  generatedAt: number;
  items: RequestMetricSnapshotItem[];
};

const MAX_EVENTS = 2_000;

let events: RequestMetricEvent[] = [];
let enabledOverride: boolean | null = null;

const getDefaultEnabled = () => {
  if (typeof window === "undefined") return false;
  const hostname = window.location?.hostname?.toLowerCase() ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
};

const resolveCurrentRoute = () => {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
};

const clampDuration = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
};

const pushEvent = (event: RequestMetricEvent) => {
  events.push(event);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
};

const getGlobalScope = () => globalThis as Record<string, unknown>;

const installDebugHandle = () => {
  const scope = getGlobalScope();
  if (scope.__NEXTLESS_ADMIN_NET_DEBUG__) return;
  scope.__NEXTLESS_ADMIN_NET_DEBUG__ = {
    get enabled() {
      return isRequestMetricsEnabled();
    },
    setEnabled: (value: boolean) => {
      setRequestMetricsEnabled(value);
    },
    reset: () => {
      resetRequestMetrics();
    },
    events: () => getRequestMetricsEvents(),
    snapshot: (windowMs?: number) => getRequestMetricsSnapshot({ windowMs }),
  };
};

export const isRequestMetricsEnabled = () => {
  if (enabledOverride !== null) return enabledOverride;
  return getDefaultEnabled();
};

export const setRequestMetricsEnabled = (value: boolean | null) => {
  enabledOverride = value;
  if (isRequestMetricsEnabled()) {
    installDebugHandle();
  }
};

export const resetRequestMetrics = () => {
  events = [];
};

export const getRequestMetricsEvents = () => [...events];

export const getRequestMetricsSnapshot = (input?: {
  windowMs?: number;
  now?: number;
}): RequestMetricSnapshot => {
  const now = input?.now ?? Date.now();
  const windowMs =
    typeof input?.windowMs === "number" && Number.isFinite(input.windowMs) && input.windowMs > 0
      ? Math.floor(input.windowMs)
      : null;
  const minStartedAt = windowMs === null ? Number.NEGATIVE_INFINITY : now - windowMs;
  const filtered = events.filter((item) => item.startedAt >= minStartedAt);

  const grouped = new Map<string, RequestMetricSnapshotItem>();
  for (const event of filtered) {
    const key = `${event.method}|${event.path}|${event.route}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        path: event.path,
        method: event.method,
        route: event.route,
        count: 1,
        errorCount: event.ok ? 0 : 1,
        avgDurationMs: event.durationMs,
        maxDurationMs: event.durationMs,
        lastStatus: event.status,
        lastStartedAt: event.startedAt,
      });
      continue;
    }

    const nextCount = existing.count + 1;
    existing.count = nextCount;
    existing.errorCount += event.ok ? 0 : 1;
    existing.avgDurationMs =
      (existing.avgDurationMs * (nextCount - 1) + event.durationMs) / nextCount;
    existing.maxDurationMs = Math.max(existing.maxDurationMs, event.durationMs);
    if (event.startedAt >= existing.lastStartedAt) {
      existing.lastStartedAt = event.startedAt;
      existing.lastStatus = event.status;
    }
  }

  const items = Array.from(grouped.values()).sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    if (right.errorCount !== left.errorCount) return right.errorCount - left.errorCount;
    return left.path.localeCompare(right.path);
  });

  return {
    windowMs,
    total: filtered.length,
    generatedAt: now,
    items,
  };
};

export const startRequestMetric = (input: {
  path: string;
  method?: string;
  route?: string;
  startedAt?: number;
}) => {
  if (!isRequestMetricsEnabled()) {
    return (_result: {
      status: number;
      ok: boolean;
      errorCode?: string | null;
      endedAt?: number;
    }) => undefined;
  }

  installDebugHandle();

  const startedAt = input.startedAt ?? Date.now();
  const method = (input.method ?? "GET").toUpperCase();
  const route = input.route ?? resolveCurrentRoute();
  let closed = false;

  return (result: {
    status: number;
    ok: boolean;
    errorCode?: string | null;
    endedAt?: number;
  }) => {
    if (closed) return;
    closed = true;

    const endedAt = result.endedAt ?? Date.now();
    pushEvent({
      path: input.path,
      method,
      route,
      startedAt,
      durationMs: clampDuration(endedAt - startedAt),
      status: result.status,
      ok: result.ok,
      errorCode: result.errorCode ?? null,
    });
  };
};

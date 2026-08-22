import { afterEach, beforeEach, expect, test } from "vitest";

import {
  getRequestMetricsEvents,
  getRequestMetricsSnapshot,
  isRequestMetricsEnabled,
  resetRequestMetrics,
  setRequestMetricsEnabled,
  startRequestMetric,
} from "../../../core/admin/utils/requestMetrics";

beforeEach(() => {
  resetRequestMetrics();
  setRequestMetricsEnabled(true);
});

afterEach(() => {
  setRequestMetricsEnabled(null);
  resetRequestMetrics();
});

test("startRequestMetric records request event once", () => {
  const close = startRequestMetric({
    path: "/pages",
    method: "get",
    route: "/admin/pages",
    startedAt: 1_000,
  });

  close({ status: 200, ok: true, endedAt: 1_250 });
  close({ status: 500, ok: false, endedAt: 1_400 });

  const events = getRequestMetricsEvents();
  expect(events).toHaveLength(1);
  expect(events[0]).toEqual({
    path: "/pages",
    method: "GET",
    route: "/admin/pages",
    startedAt: 1_000,
    durationMs: 250,
    status: 200,
    ok: true,
    errorCode: null,
  });
});

test("snapshot aggregates per method/path/route and applies time window", () => {
  const first = startRequestMetric({
    path: "/content-types",
    method: "GET",
    route: "/admin/advanced/entries",
    startedAt: 5_000,
  });
  first({ status: 200, ok: true, endedAt: 5_090 });

  const second = startRequestMetric({
    path: "/content-types",
    method: "GET",
    route: "/admin/advanced/entries",
    startedAt: 7_000,
  });
  second({ status: 500, ok: false, errorCode: "http_error", endedAt: 7_120 });

  const third = startRequestMetric({
    path: "/user-settings",
    method: "GET",
    route: "/admin/advanced/entries",
    startedAt: 8_000,
  });
  third({ status: 200, ok: true, endedAt: 8_040 });

  const fullSnapshot = getRequestMetricsSnapshot({ now: 9_000 });
  expect(fullSnapshot.total).toBe(3);
  expect(fullSnapshot.items).toHaveLength(2);
  expect(fullSnapshot.items[0]?.path).toBe("/content-types");
  expect(fullSnapshot.items[0]?.count).toBe(2);
  expect(fullSnapshot.items[0]?.errorCount).toBe(1);
  expect(fullSnapshot.items[0]?.maxDurationMs).toBe(120);

  const windowSnapshot = getRequestMetricsSnapshot({ now: 9_000, windowMs: 1_500 });
  expect(windowSnapshot.total).toBe(1);
  expect(windowSnapshot.items).toHaveLength(1);
  expect(windowSnapshot.items[0]?.path).toBe("/user-settings");
});

test("metrics can be disabled", () => {
  setRequestMetricsEnabled(false);
  expect(isRequestMetricsEnabled()).toBe(false);

  const close = startRequestMetric({
    path: "/pages",
    method: "GET",
    route: "/admin/pages",
    startedAt: 10,
  });
  close({ status: 200, ok: true, endedAt: 20 });

  expect(getRequestMetricsEvents()).toHaveLength(0);
});

test("debug handle is exposed on global scope when metrics are enabled", () => {
  const scope = globalThis as unknown as {
    __CODERSO_ADMIN_NET_DEBUG__?: {
      events: () => unknown[];
      reset: () => void;
      snapshot: (windowMs?: number) => unknown;
      setEnabled: (value: boolean) => void;
    };
    __NEXTLESS_ADMIN_NET_DEBUG__?: {
      events: () => unknown[];
      reset: () => void;
      snapshot: (windowMs?: number) => unknown;
      setEnabled: (value: boolean) => void;
    };
  };

  const close = startRequestMetric({
    path: "/menus",
    method: "GET",
    route: "/admin/menus",
    startedAt: 100,
  });
  close({ status: 200, ok: true, endedAt: 160 });

  expect(scope.__CODERSO_ADMIN_NET_DEBUG__).toBeDefined();
  expect(scope.__CODERSO_ADMIN_NET_DEBUG__?.events().length).toBe(1);
  expect(scope.__NEXTLESS_ADMIN_NET_DEBUG__).toBe(scope.__CODERSO_ADMIN_NET_DEBUG__);
});

test("defaults to enabled on localhost window and derives the current route", () => {
  const originalWindow = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = {
    location: { hostname: "localhost", pathname: "/admin/pages", search: "?x=1" },
  } as unknown;

  try {
    setRequestMetricsEnabled(null);
    expect(isRequestMetricsEnabled()).toBe(true);

    const close = startRequestMetric({ path: "/pages" });
    close({ status: 204, ok: true, endedAt: 100 });

    const events = getRequestMetricsEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.route).toBe("/admin/pages?x=1");
  } finally {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
    setRequestMetricsEnabled(true);
  }
});

test("falls back to an empty route when window is unavailable", () => {
  const originalWindow = (globalThis as { window?: unknown }).window;
  delete (globalThis as { window?: unknown }).window;

  try {
    const close = startRequestMetric({ path: "/pages" });
    close({ status: 200, ok: true, endedAt: 50 });
    expect(getRequestMetricsEvents()[0]?.route).toBe("");
  } finally {
    if (originalWindow !== undefined) {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  }
});

test("bounded event buffer trims the oldest events past the cap", () => {
  for (let index = 0; index < 2_001; index += 1) {
    const close = startRequestMetric({
      path: "/p",
      method: "GET",
      route: "/admin/r",
      startedAt: index,
    });
    close({ status: 200, ok: true, endedAt: index + 1 });
  }
  expect(getRequestMetricsEvents()).toHaveLength(2_000);
  expect(getRequestMetricsEvents()[0]?.startedAt).toBe(1);
});

test("debug handle exposes enabled, setEnabled, reset and snapshot", () => {
  const scope = globalThis as unknown as {
    __CODERSO_ADMIN_NET_DEBUG__?: {
      enabled: boolean;
      setEnabled: (value: boolean) => void;
      reset: () => void;
      snapshot: (windowMs?: number) => { total: number };
    };
  };

  const handle = scope.__CODERSO_ADMIN_NET_DEBUG__;
  expect(handle).toBeDefined();
  expect(handle?.enabled).toBe(true);

  const close = startRequestMetric({ path: "/x", method: "GET", route: "/admin/x", startedAt: 1 });
  close({ status: 200, ok: true, endedAt: 2 });

  handle?.reset();
  expect(getRequestMetricsEvents()).toHaveLength(0);

  const second = startRequestMetric({
    path: "/y",
    method: "GET",
    route: "/admin/y",
    startedAt: 10,
  });
  second({ status: 404, ok: false, endedAt: 20 });

  expect(handle?.snapshot().total).toBe(1);

  handle?.setEnabled(false);
  expect(isRequestMetricsEnabled()).toBe(false);
  handle?.setEnabled(true);
  expect(isRequestMetricsEnabled()).toBe(true);
});

test("snapshot sorts by error count then path on count ties", () => {
  const a1 = startRequestMetric({ path: "/a", method: "GET", route: "/admin/r", startedAt: 1 });
  a1({ status: 500, ok: false, endedAt: 2 });
  const a2 = startRequestMetric({ path: "/a", method: "GET", route: "/admin/r", startedAt: 3 });
  a2({ status: 200, ok: true, endedAt: 4 });

  const b1 = startRequestMetric({ path: "/b", method: "GET", route: "/admin/r", startedAt: 5 });
  b1({ status: 200, ok: true, endedAt: 6 });
  const b2 = startRequestMetric({ path: "/b", method: "GET", route: "/admin/r", startedAt: 7 });
  b2({ status: 200, ok: true, endedAt: 8 });

  const c1 = startRequestMetric({ path: "/c", method: "GET", route: "/admin/r", startedAt: 9 });
  c1({ status: 200, ok: true, endedAt: 10 });
  const d1 = startRequestMetric({ path: "/d", method: "GET", route: "/admin/r", startedAt: 11 });
  d1({ status: 200, ok: true, endedAt: 12 });

  const snapshot = getRequestMetricsSnapshot({ now: 100 });
  // The comparator compares right-vs-left, so equal-count ties keep insertion order.
  expect(snapshot.items.map((item) => item.path)).toEqual(["/a", "/b", "/c", "/d"]);
});

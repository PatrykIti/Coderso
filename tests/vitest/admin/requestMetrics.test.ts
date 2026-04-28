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

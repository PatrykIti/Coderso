import { expect, test } from "vitest";

import {
  AdminQueryConventionError,
  assertFilterLabelMatchesSource,
  buildCursorPageState,
  decodeAdminCursor,
  encodeAdminCursor,
  normalizeAdminDateRange,
  normalizeAdminIsoDateBoundary,
  normalizeAdminQueryLimit,
  normalizeAdminSearchQuery,
  resolveTruthfulCountCopy,
  validateAdminCustomDateRange,
} from "../../../core/services/admin/adminQueryConventions";

test("normalizeAdminQueryLimit clamps valid positive limits and rejects malformed values", () => {
  expect(normalizeAdminQueryLimit(undefined)).toBe(50);
  expect(normalizeAdminQueryLimit("25")).toBe(25);
  expect(normalizeAdminQueryLimit("999")).toBe(200);
  expect(normalizeAdminQueryLimit("500", { defaultLimit: 25, maxLimit: 100 })).toBe(100);

  expect(() => normalizeAdminQueryLimit("0")).toThrow(AdminQueryConventionError);
  expect(() => normalizeAdminQueryLimit("10.5")).toThrow(AdminQueryConventionError);
  expect(() => normalizeAdminQueryLimit("abc")).toThrow(AdminQueryConventionError);
});

test("assertFilterLabelMatchesSource rejects role and user label drift", () => {
  expect(() =>
    assertFilterLabelMatchesSource({
      kind: "user",
      label: "User",
      userId: "user-1",
    })
  ).not.toThrow();

  expect(() =>
    assertFilterLabelMatchesSource({
      kind: "role",
      label: "User" as "Role",
      roleId: "role-1",
    })
  ).toThrow(AdminQueryConventionError);
});

test("normalizeAdminDateRange rejects invalid and reversed custom ranges", () => {
  const range = normalizeAdminDateRange({
    from: "2026-06-01T00:00:00.000Z",
    to: "2026-06-02T00:00:00.000Z",
  });

  expect(range.from?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  expect(range.to?.toISOString()).toBe("2026-06-02T00:00:00.000Z");
  expect(() => normalizeAdminDateRange({ from: "not-a-date" })).toThrow(AdminQueryConventionError);
  expect(() =>
    normalizeAdminDateRange({
      from: "2026-06-03T00:00:00.000Z",
      to: "2026-06-02T00:00:00.000Z",
    })
  ).toThrow(AdminQueryConventionError);
  expect(() => validateAdminCustomDateRange({ from: "2026-06-01T00:00:00.000Z" })).toThrow(
    AdminQueryConventionError
  );
  expect(
    validateAdminCustomDateRange({
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-02T00:00:00.000Z",
    }).to.toISOString()
  ).toBe("2026-06-02T00:00:00.000Z");
});

test("normalizeAdminIsoDateBoundary turns date-only input into UTC boundaries", () => {
  expect(normalizeAdminIsoDateBoundary("2026-06-01", "start")).toBe("2026-06-01T00:00:00.000Z");
  expect(normalizeAdminIsoDateBoundary("2026-06-01", "end")).toBe("2026-06-01T23:59:59.999Z");
  expect(normalizeAdminIsoDateBoundary("2026-06-01T12:30:00.000Z", "start")).toBe(
    "2026-06-01T12:30:00.000Z"
  );
});

test("buildCursorPageState uses response metadata for truthful count copy", () => {
  const response = {
    items: [{ id: "log-1" }, { id: "log-2" }],
    nextCursor: "cursor-2",
  };
  const state = buildCursorPageState({ limit: 2 }, response, { resourceLabel: "audit logs" });

  expect(state.rows).toHaveLength(2);
  expect(state.hasMore).toBe(true);
  expect(state.countCopy).toBe("Showing 2 loaded audit logs. More results are available.");
  expect(
    resolveTruthfulCountCopy(
      { items: response.items, totalCount: 12 },
      { resourceLabel: "access logs" }
    )
  ).toBe("Showing 2 loaded of 12 access logs.");
});

test("normalizeAdminSearchQuery trims text and rejects overlong values", () => {
  expect(normalizeAdminSearchQuery("  login  ")).toBe("login");
  expect(normalizeAdminSearchQuery("   ")).toBeUndefined();
  expect(() => normalizeAdminSearchQuery("x".repeat(201))).toThrow(AdminQueryConventionError);
});

test("admin cursor helpers round-trip opaque keyset payloads and reject tampering", () => {
  const cursor = encodeAdminCursor({
    createdAt: "2026-06-01T00:00:00.000Z",
    id: "log-1",
  });

  expect(decodeAdminCursor(cursor)).toEqual({
    createdAt: "2026-06-01T00:00:00.000Z",
    id: "log-1",
  });
  expect(() => decodeAdminCursor("not-json")).toThrow(AdminQueryConventionError);
  expect(() => encodeAdminCursor({ createdAt: "2026-06-01T00:00:00.000Z", id: "" })).toThrow(
    AdminQueryConventionError
  );
});

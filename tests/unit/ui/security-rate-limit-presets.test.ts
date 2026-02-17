import { expect, test } from "bun:test";

import { RATE_LIMIT_PRESETS } from "../../../core/admin/ui/settings/SecuritySettingsPage";

const toNumber = (value: string | undefined) => Number(value ?? 0);

test("strict and relaxed presets are ordered around wordpress defaults", () => {
  const wordpress = RATE_LIMIT_PRESETS.find((preset) => preset.id === "wordpress");
  const strict = RATE_LIMIT_PRESETS.find((preset) => preset.id === "strict");
  const relaxed = RATE_LIMIT_PRESETS.find((preset) => preset.id === "relaxed");

  expect(wordpress).toBeDefined();
  expect(strict).toBeDefined();
  expect(relaxed).toBeDefined();
  expect(wordpress?.enabled).toBe(true);
  expect(strict?.enabled).toBe(true);
  expect(relaxed?.enabled).toBe(true);

  const buckets = [
    "auth",
    "admin_read",
    "admin_write",
    "public_read",
    "public_write",
    "assistant",
  ] as const;

  for (const bucket of buckets) {
    expect(toNumber(strict?.buckets[bucket].maxRequests)).toBeLessThan(
      toNumber(wordpress?.buckets[bucket].maxRequests)
    );
    expect(toNumber(relaxed?.buckets[bucket].maxRequests)).toBeGreaterThan(
      toNumber(wordpress?.buckets[bucket].maxRequests)
    );
  }
});

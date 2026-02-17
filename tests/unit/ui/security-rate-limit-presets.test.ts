import { expect, test } from "bun:test";

import { RATE_LIMIT_PRESETS } from "../../../core/admin/ui/settings/SecuritySettingsPage";

test("relaxed preset keeps rate limits enabled with higher throughput", () => {
  const wordpress = RATE_LIMIT_PRESETS.find((preset) => preset.id === "wordpress");
  const relaxed = RATE_LIMIT_PRESETS.find((preset) => preset.id === "relaxed");

  expect(wordpress).toBeDefined();
  expect(relaxed).toBeDefined();

  expect(relaxed?.enabled).toBe(true);
  expect(Number(relaxed?.buckets.auth.maxRequests ?? 0)).toBeGreaterThan(
    Number(wordpress?.buckets.auth.maxRequests ?? 0)
  );
  expect(Number(relaxed?.buckets.admin_read.maxRequests ?? 0)).toBeGreaterThan(
    Number(wordpress?.buckets.admin_read.maxRequests ?? 0)
  );
  expect(Number(relaxed?.buckets.admin_write.maxRequests ?? 0)).toBeGreaterThan(
    Number(wordpress?.buckets.admin_write.maxRequests ?? 0)
  );
  expect(Number(relaxed?.buckets.public_read.maxRequests ?? 0)).toBeGreaterThan(
    Number(wordpress?.buckets.public_read.maxRequests ?? 0)
  );
  expect(Number(relaxed?.buckets.public_write.maxRequests ?? 0)).toBeGreaterThan(
    Number(wordpress?.buckets.public_write.maxRequests ?? 0)
  );
  expect(Number(relaxed?.buckets.assistant.maxRequests ?? 0)).toBeGreaterThan(
    Number(wordpress?.buckets.assistant.maxRequests ?? 0)
  );
});

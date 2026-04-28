import { expect, test } from "bun:test";

import { createRequestIdContext } from "../../../core/server/middleware/requestId";

const baseConfig = { enabled: true, headerName: "x-request-id" } as const;

test("createRequestIdContext returns header name and id", () => {
  const ctx = createRequestIdContext(baseConfig);
  expect(ctx).not.toBeNull();
  expect(ctx?.headerName).toBe("x-request-id");
  expect(ctx?.requestId).toBeTypeOf("string");
  expect(ctx?.requestId.length).toBeGreaterThan(10);
});

test("createRequestIdContext returns null when disabled", () => {
  const ctx = createRequestIdContext({ enabled: false, headerName: "x-test" });
  expect(ctx).toBeNull();
});

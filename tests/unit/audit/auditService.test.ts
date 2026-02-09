import { expect, test } from "bun:test";

import { sanitizeMetadata } from "../../../core/services/audit/auditService";

test("sanitizeMetadata strips sensitive keys", () => {
  const meta = sanitizeMetadata({
    token: "secret",
    password: "hidden",
    keep: "ok",
    authorization: "bearer",
  });

  expect(meta).toEqual({ keep: "ok" });
});

test("sanitizeMetadata redacts token-like values in nested structures", () => {
  const meta = sanitizeMetadata({
    provider: "openrouter",
    nested: {
      details: "Bearer sk-or-v1-abcdef1234567890",
    },
    list: ["ok", "eyJabc.def.ghi"],
  });

  expect(meta).toEqual({
    provider: "openrouter",
    nested: {
      details: "Bearer [REDACTED]",
    },
    list: ["ok", "[REDACTED]"],
  });
});

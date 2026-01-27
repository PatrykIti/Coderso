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

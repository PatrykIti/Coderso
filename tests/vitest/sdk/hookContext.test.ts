import { expect, test } from "vitest";

import type { HookContext } from "../../../packages/sdk/src/shared";

test("hook context shape", () => {
  const ctx: HookContext = {
    requestId: "req-1",
    method: "POST",
    path: "/pages",
    locale: "en",
    session: { id: "s1", userId: "u1" },
    user: { id: "u1", email: "a@example.com", roles: ["admin"] },
    ip: "127.0.0.1",
    userAgent: "test",
  };

  expect(ctx.requestId).toBe("req-1");
  expect(ctx.user?.roles).toEqual(["admin"]);
});

import { expect, test } from "bun:test";
import { hashPassword, verifyPassword } from "../../../core/services/auth/password";

test("hashPassword and verifyPassword", async () => {
  const hashValue = await hashPassword("secret-1234");

  const ok = await verifyPassword(hashValue, "secret-1234");
  const bad = await verifyPassword(hashValue, "wrong");

  expect(ok).toBe(true);
  expect(bad).toBe(false);
});

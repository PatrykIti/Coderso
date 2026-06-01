import { afterEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { hashSeedAdminPassword } from "../../../core/db/seedPassword";
import { verifyPassword } from "../../../core/services/auth/password";

const originalPepper = process.env.AUTH_PASSWORD_PEPPER;
const seedPath = path.resolve(import.meta.dir, "../../../core/db/seed.ts");

afterEach(() => {
  if (originalPepper === undefined) {
    delete process.env.AUTH_PASSWORD_PEPPER;
  } else {
    process.env.AUTH_PASSWORD_PEPPER = originalPepper;
  }
});

test("seed admin password hashing verifies without pepper", async () => {
  delete process.env.AUTH_PASSWORD_PEPPER;

  const hash = await hashSeedAdminPassword("seed-secret-123");

  expect(await verifyPassword(hash, "seed-secret-123")).toBe(true);
  expect(await verifyPassword(hash, "wrong-secret")).toBe(false);
});

test("seed admin password hashing verifies with configured pepper", async () => {
  process.env.AUTH_PASSWORD_PEPPER = "pepper-for-seed-test";

  const hash = await hashSeedAdminPassword("seed-secret-456");

  expect(await verifyPassword(hash, "seed-secret-456")).toBe(true);
  process.env.AUTH_PASSWORD_PEPPER = "different-pepper";
  expect(await verifyPassword(hash, "seed-secret-456")).toBe(false);
});

test("seed admin path does not bypass the shared password helper", () => {
  const source = readFileSync(seedPath, "utf8");

  expect(source).not.toContain("@node-rs/argon2");
  expect(source).not.toContain("Algorithm");
  expect(source).not.toContain("hash(");
  expect(source).toContain("hashSeedAdminPassword(adminPassword)");
  expect(source).not.toContain("console.log(adminPassword");
  expect(source).not.toContain("AUTH_PASSWORD_PEPPER");
});

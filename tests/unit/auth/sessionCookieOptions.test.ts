import { afterEach, expect, test } from "bun:test";

import { buildSessionCookieOptions } from "../../../core/services/auth/sessionService";

const originalNodeEnv = process.env.NODE_ENV;
const originalCookieSecure = process.env.COOKIE_SECURE;

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }

  if (originalCookieSecure === undefined) {
    delete process.env.COOKIE_SECURE;
  } else {
    process.env.COOKIE_SECURE = originalCookieSecure;
  }
});

test("buildSessionCookieOptions defaults to insecure outside production", () => {
  delete process.env.NODE_ENV;
  delete process.env.COOKIE_SECURE;

  const options = buildSessionCookieOptions();
  expect(options.secure).toBe(false);
});

test("buildSessionCookieOptions uses secure in production", () => {
  process.env.NODE_ENV = "production";
  delete process.env.COOKIE_SECURE;

  const options = buildSessionCookieOptions();
  expect(options.secure).toBe(true);
});

test("buildSessionCookieOptions respects COOKIE_SECURE override", () => {
  process.env.NODE_ENV = "production";
  process.env.COOKIE_SECURE = "false";

  const options = buildSessionCookieOptions();
  expect(options.secure).toBe(false);
});

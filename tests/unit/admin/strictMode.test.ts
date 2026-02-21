import { expect, test } from "bun:test";

import { shouldEnableAdminStrictMode } from "../../../core/admin/utils/strictMode";

test("strict mode is disabled by default in dev", () => {
  expect(shouldEnableAdminStrictMode({ DEV: true })).toBe(false);
});

test("strict mode is enabled when explicit flag is true", () => {
  expect(
    shouldEnableAdminStrictMode({ DEV: true, VITE_ADMIN_STRICT_MODE: "true" })
  ).toBe(true);
  expect(
    shouldEnableAdminStrictMode({ DEV: true, VITE_ADMIN_STRICT_MODE: "1" })
  ).toBe(true);
  expect(
    shouldEnableAdminStrictMode({ DEV: true, VITE_ADMIN_STRICT_MODE: "on" })
  ).toBe(true);
});

test("strict mode stays disabled outside dev", () => {
  expect(
    shouldEnableAdminStrictMode({ DEV: false, VITE_ADMIN_STRICT_MODE: "true" })
  ).toBe(false);
});

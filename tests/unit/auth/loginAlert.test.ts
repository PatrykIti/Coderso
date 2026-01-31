import { expect, test } from "bun:test";

import { evaluateLoginAlert } from "../../../core/services/auth/sessionService";

test("evaluateLoginAlert returns false when no previous session", () => {
  const result = evaluateLoginAlert(null, { ip: "1.1.1.1", userAgent: "ua" });
  expect(result).toEqual({ newDevice: false, newLocation: false });
});

test("evaluateLoginAlert detects new device", () => {
  const result = evaluateLoginAlert(
    { ip: "1.1.1.1", userAgent: "chrome" },
    { ip: "1.1.1.1", userAgent: "safari" }
  );
  expect(result.newDevice).toBe(true);
  expect(result.newLocation).toBe(false);
});

test("evaluateLoginAlert detects new location", () => {
  const result = evaluateLoginAlert(
    { ip: "1.1.1.1", userAgent: "chrome" },
    { ip: "2.2.2.2", userAgent: "chrome" }
  );
  expect(result.newDevice).toBe(false);
  expect(result.newLocation).toBe(true);
});

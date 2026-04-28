import { expect, test } from "bun:test";

import {
  applyBookingAccessModeToSettings,
  bookingAccessDefaults,
  evaluateBookingAccess,
  normalizeBookingAccessMode,
  resolveBookingAccessModeFromSettings,
} from "../../../core/services/booking/bookingAccess";

test("normalizeBookingAccessMode uses fallback and supports valid values", () => {
  expect(normalizeBookingAccessMode(undefined)).toBe("public");
  expect(normalizeBookingAccessMode("internal")).toBe("internal");
  expect(normalizeBookingAccessMode(null, "internal")).toBe("internal");
});

test("normalizeBookingAccessMode rejects invalid values", () => {
  expect(() => normalizeBookingAccessMode("private")).toThrow(
    "booking_submission_access_invalid"
  );
});

test("resolveBookingAccessModeFromSettings reads mode from settings", () => {
  expect(resolveBookingAccessModeFromSettings({ submissionAccess: "internal" })).toBe(
    "internal"
  );
  expect(resolveBookingAccessModeFromSettings({ foo: true })).toBe("public");
  expect(resolveBookingAccessModeFromSettings(null, "internal")).toBe("internal");
});

test("applyBookingAccessModeToSettings preserves existing keys", () => {
  const result = applyBookingAccessModeToSettings({ title: "Service A" }, "internal");
  expect(result).toEqual({ title: "Service A", submissionAccess: "internal" });
});

test("evaluateBookingAccess allows public mode with captcha", () => {
  const result = evaluateBookingAccess({
    mode: "public",
    isAuthenticated: false,
  });

  expect(result).toEqual({ allow: true, requireCaptcha: true });
});

test("evaluateBookingAccess allows internal mode for authenticated user", () => {
  const result = evaluateBookingAccess({
    mode: "internal",
    isAuthenticated: true,
  });

  expect(result).toEqual({ allow: true, requireCaptcha: false });
});

test("evaluateBookingAccess allows internal mode for API key with booking scope", () => {
  const result = evaluateBookingAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: [bookingAccessDefaults.requiredApiKeyScope],
  });

  expect(result).toEqual({ allow: true, requireCaptcha: false });
});

test("evaluateBookingAccess rejects internal mode with wrong API key scope", () => {
  const result = evaluateBookingAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: ["media.read"],
  });

  expect(result).toEqual({
    allow: false,
    requireCaptcha: false,
    reason: "forbidden",
  });
});

test("evaluateBookingAccess rejects internal mode without auth", () => {
  const result = evaluateBookingAccess({
    mode: "internal",
    isAuthenticated: false,
  });

  expect(result).toEqual({
    allow: false,
    requireCaptcha: false,
    reason: "auth_required",
  });
});

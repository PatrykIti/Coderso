import { expect, test } from "bun:test";

import {
  evaluateMediaAccess,
  mediaAccessDefaults,
  normalizeMediaDeliveryAccessMode,
} from "../../../core/services/media/mediaAccess";

test("normalizeMediaDeliveryAccessMode supports valid values", () => {
  expect(normalizeMediaDeliveryAccessMode(undefined)).toBe("public");
  expect(normalizeMediaDeliveryAccessMode("internal")).toBe("internal");
  expect(normalizeMediaDeliveryAccessMode(null, "internal")).toBe("internal");
});

test("normalizeMediaDeliveryAccessMode rejects invalid values", () => {
  expect(() => normalizeMediaDeliveryAccessMode("private")).toThrow("media_access_invalid");
});

test("evaluateMediaAccess allows public mode", () => {
  const result = evaluateMediaAccess({
    mode: "public",
    isAuthenticated: false,
  });

  expect(result).toEqual({ allow: true });
});

test("evaluateMediaAccess allows internal mode for authenticated user", () => {
  const result = evaluateMediaAccess({
    mode: "internal",
    isAuthenticated: true,
  });

  expect(result).toEqual({ allow: true });
});

test("evaluateMediaAccess allows API key with media.read scope", () => {
  const result = evaluateMediaAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: [mediaAccessDefaults.requiredApiKeyScope],
  });

  expect(result).toEqual({ allow: true });
});

test("evaluateMediaAccess rejects API key without required scope", () => {
  const result = evaluateMediaAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: ["forms.submit"],
  });

  expect(result).toEqual({ allow: false, reason: "forbidden" });
});

test("evaluateMediaAccess rejects anonymous internal request", () => {
  const result = evaluateMediaAccess({
    mode: "internal",
    isAuthenticated: false,
  });

  expect(result).toEqual({ allow: false, reason: "auth_required" });
});

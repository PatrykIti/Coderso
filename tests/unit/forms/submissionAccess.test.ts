import { expect, test } from "bun:test";

import {
  evaluateSubmissionAccess,
  normalizeSubmissionAccess,
} from "../../../core/services/forms/submissionAccess";

test("normalizeSubmissionAccess accepts known values", () => {
  expect(normalizeSubmissionAccess("public")).toBe("public");
  expect(normalizeSubmissionAccess("internal")).toBe("internal");
});

test("normalizeSubmissionAccess returns fallback for undefined", () => {
  expect(normalizeSubmissionAccess(undefined, "internal")).toBe("internal");
});

test("normalizeSubmissionAccess rejects invalid values", () => {
  expect(() => normalizeSubmissionAccess("nope")).toThrow("form_invalid");
});

test("evaluateSubmissionAccess allows public with captcha", () => {
  const result = evaluateSubmissionAccess({
    mode: "public",
    isAuthenticated: false,
  });
  expect(result.allow).toBe(true);
  expect(result.requireCaptcha).toBe(true);
});

test("evaluateSubmissionAccess allows internal with admin session", () => {
  const result = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: true,
  });
  expect(result.allow).toBe(true);
  expect(result.requireCaptcha).toBe(false);
});

test("evaluateSubmissionAccess allows internal with api key scope", () => {
  const result = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: ["forms.submit"],
  });
  expect(result.allow).toBe(true);
});

test("evaluateSubmissionAccess rejects internal without auth", () => {
  const result = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: false,
  });
  expect(result.allow).toBe(false);
  expect(result.reason).toBe("auth_required");
});

test("evaluateSubmissionAccess rejects internal without scope", () => {
  const result = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: ["content.read"],
  });
  expect(result.allow).toBe(false);
  expect(result.reason).toBe("forbidden");
});

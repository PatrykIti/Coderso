import { expect, test } from "vitest";

import {
  evaluateSubmissionAccess,
  normalizeSubmissionAccess,
  SUBMISSION_ACCESS_MODE_VALUES,
} from "../../../core/services/forms/submissionAccess";

test("submission access values are exported from the runtime owner", () => {
  expect(SUBMISSION_ACCESS_MODE_VALUES).toEqual(["public", "internal"]);
});

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

test("evaluateSubmissionAccess requires nonce and captcha for anonymous public writes", () => {
  const result = evaluateSubmissionAccess({
    mode: "public",
    isAuthenticated: false,
  });
  expect(result).toEqual({
    allow: true,
    mode: "public",
    principal: "anonymous",
    requireFormNonce: true,
    requireCaptcha: true,
    requireSessionCsrf: false,
    rateBucket: "public_write",
  });
  expect(Object.isFrozen(result)).toBe(true);
});

test("evaluateSubmissionAccess preserves captcha bypass but not nonce bypass for public sessions", () => {
  const result = evaluateSubmissionAccess({
    mode: "public",
    isAuthenticated: true,
  });
  expect(result).toEqual({
    allow: true,
    mode: "public",
    principal: "session",
    requireFormNonce: true,
    requireCaptcha: false,
    requireSessionCsrf: false,
    rateBucket: "public_write",
  });
});

test("public mode ignores bearer scopes", () => {
  const result = evaluateSubmissionAccess({
    mode: "public",
    isAuthenticated: false,
    apiKeyScopes: ["forms.submit"],
  });
  expect(result).toMatchObject({
    allow: true,
    principal: "anonymous",
    requireFormNonce: true,
    requireCaptcha: true,
    rateBucket: "public_write",
  });
});

test("evaluateSubmissionAccess allows internal with admin session", () => {
  const result = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: true,
  });
  expect(result).toEqual({
    allow: true,
    mode: "internal",
    principal: "session",
    requireFormNonce: false,
    requireCaptcha: false,
    requireSessionCsrf: true,
    rateBucket: "admin_write",
  });
});

test("evaluateSubmissionAccess allows internal with api key scope", () => {
  const result = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: ["forms.submit"],
  });
  expect(result).toEqual({
    allow: true,
    mode: "internal",
    principal: "apiKey",
    requireFormNonce: false,
    requireCaptcha: false,
    requireSessionCsrf: false,
    rateBucket: "admin_write",
  });
});

test("evaluateSubmissionAccess rejects internal without auth", () => {
  const result = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: false,
  });
  expect(result).toEqual({ allow: false, reason: "auth_required" });
});

test("evaluateSubmissionAccess rejects internal without scope", () => {
  const result = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: ["content.read"],
  });
  expect(result).toEqual({ allow: false, reason: "forbidden" });
});

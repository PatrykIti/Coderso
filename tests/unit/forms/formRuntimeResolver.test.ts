import { expect, test } from "bun:test";

import { resolveFormSubmissionAccess } from "../../../core/services/forms/formRuntimeResolver";

test("resolveFormSubmissionAccess defaults to public when missing", () => {
  expect(resolveFormSubmissionAccess(undefined)).toBe("public");
  expect(resolveFormSubmissionAccess(null)).toBe("public");
});

test("resolveFormSubmissionAccess accepts valid modes", () => {
  expect(resolveFormSubmissionAccess("public")).toBe("public");
  expect(resolveFormSubmissionAccess("internal")).toBe("internal");
});

test("resolveFormSubmissionAccess rejects unknown mode", () => {
  expect(() => resolveFormSubmissionAccess("private")).toThrow("form_invalid");
});

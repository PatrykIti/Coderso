import { expect, test } from "bun:test";

import { ApiError, toErrorResponse } from "../../../core/server/errorHandler";

test("toErrorResponse maps ApiError", () => {
  const error = new ApiError("auth_failed", "Invalid credentials", 401);
  const payload = toErrorResponse(error);

  expect(payload.error.code).toBe("auth_failed");
  expect(payload.error.message).toBe("Invalid credentials");
});

test("toErrorResponse maps unknown error", () => {
  const payload = toErrorResponse(new Error("boom"));

  expect(payload.error.code).toBe("internal_error");
  expect(payload.error.message).toBe("Unexpected error");
});

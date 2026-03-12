import { expect, test } from "vitest";

import { ApiError, toErrorResponse } from "../../../core/server/errorHandler";

test("toErrorResponse maps ApiError", () => {
  const error = new ApiError("auth_failed", "Invalid credentials", 401);
  const payload = toErrorResponse(error);

  expect(payload.error.code).toBe("auth_failed");
  expect(payload.error.message).toBe("Invalid credentials");
});

test("toErrorResponse maps unknown error in production", () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const payload = toErrorResponse(new Error("boom"));

    expect(payload.error.code).toBe("internal_error");
    expect(payload.error.message).toBe("Unexpected error");
    expect(payload.error.details).toBeUndefined();
  } finally {
    if (prev === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = prev;
    }
  }
});

test("toErrorResponse exposes details in dev", () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  try {
    const payload = toErrorResponse(new Error("boom"));

    expect(payload.error.code).toBe("internal_error");
    expect(payload.error.message).toBe("boom");
    expect(payload.error.details).toEqual(expect.objectContaining({ stack: expect.any(String) }));
  } finally {
    if (prev === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = prev;
    }
  }
});

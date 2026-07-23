import { expect, test } from "bun:test";

import { applyCorsHeaders } from "../../../core/server/middleware/cors";
import { SECURITY_SETTINGS_DEFAULTS } from "../../../core/services/settings/securitySettings";

const baseConfig = {
  allowedOrigins: ["https://admin.example.com"],
  allowCredentials: true,
  allowedMethods: ["GET", "POST"],
  allowedHeaders: ["content-type", "x-csrf-token"],
  maxAgeSeconds: 600,
};

test("applyCorsHeaders allows configured origin", () => {
  const headers = new Headers();
  const req = new Request("http://localhost/admin/api", {
    method: "GET",
    headers: { Origin: "https://admin.example.com" },
  });
  const result = applyCorsHeaders(req, headers, baseConfig);

  expect(result.allowed).toBe(true);
  expect(headers.get("Access-Control-Allow-Origin")).toBe("https://admin.example.com");
  expect(headers.get("Access-Control-Allow-Credentials")).toBe("true");
});

test("trusted OPTIONS unions required headers into a legacy configured list", () => {
  const headers = new Headers();
  const req = new Request("http://localhost/admin/api/user-settings", {
    method: "OPTIONS",
    headers: {
      Origin: "https://admin.example.com",
      "Access-Control-Request-Method": "PATCH",
      "Access-Control-Request-Headers": "Content-Type, X-CSRF-Token, X-Coderso-Expected-User-Id",
    },
  });

  const result = applyCorsHeaders(req, headers, {
    ...baseConfig,
    allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Custom-Trace"],
  });

  expect(result.allowed).toBe(true);
  expect(headers.get("Access-Control-Allow-Origin")).toBe("https://admin.example.com");
  expect(headers.get("Access-Control-Allow-Credentials")).toBe("true");
  expect(headers.get("Access-Control-Allow-Headers")).toBe(
    "Content-Type, X-CSRF-Token, X-Custom-Trace, x-coderso-expected-user-id"
  );
});

test("trusted OPTIONS preserves the first configured spelling of the required header", () => {
  const headers = new Headers();
  const req = new Request("http://localhost/admin/api/user-settings", {
    method: "OPTIONS",
    headers: { Origin: "https://admin.example.com" },
  });

  const result = applyCorsHeaders(req, headers, {
    ...baseConfig,
    allowedHeaders: [
      "Content-Type",
      "X-Coderso-Expected-User-Id",
      "X-Custom-Trace",
      "x-coderso-EXPECTED-user-id",
      "x-csrf-token",
    ],
  });
  const allowedHeaders = headers.get("Access-Control-Allow-Headers");

  expect(result.allowed).toBe(true);
  expect(allowedHeaders).toBe(
    "Content-Type, X-Coderso-Expected-User-Id, X-Custom-Trace, x-csrf-token"
  );
  expect(
    allowedHeaders
      ?.split(", ")
      .filter((header) => header.toLowerCase() === "x-coderso-expected-user-id")
  ).toHaveLength(1);
});

test("security settings defaults include the expected-user CORS header", () => {
  expect(SECURITY_SETTINGS_DEFAULTS.cors.allowedHeaders).toEqual([
    "content-type",
    "x-csrf-token",
    "x-coderso-expected-user-id",
  ]);
});

test("applyCorsHeaders returns configured origin value instead of reflecting request casing", () => {
  const headers = new Headers();
  const req = new Request("http://localhost/admin/api", {
    method: "GET",
    headers: { Origin: "https://ADMIN.example.com" },
  });
  const result = applyCorsHeaders(req, headers, baseConfig);

  expect(result.allowed).toBe(true);
  expect(headers.get("Access-Control-Allow-Origin")).toBe("https://admin.example.com");
});

test("applyCorsHeaders rejects unknown origin", () => {
  const headers = new Headers();
  const req = new Request("http://localhost/admin/api", {
    method: "GET",
    headers: { Origin: "https://evil.example.com" },
  });
  const result = applyCorsHeaders(req, headers, baseConfig);

  expect(result.allowed).toBe(false);
  expect(headers.get("Access-Control-Allow-Origin")).toBeNull();
});

test("applyCorsHeaders allows wildcard without credentials", () => {
  const headers = new Headers();
  const req = new Request("http://localhost/admin/api", {
    method: "GET",
    headers: { Origin: "https://public.example.com" },
  });
  const result = applyCorsHeaders(req, headers, {
    ...baseConfig,
    allowedOrigins: ["*"],
    allowCredentials: true,
  });

  expect(result.allowed).toBe(true);
  expect(headers.get("Access-Control-Allow-Origin")).toBe("*");
  expect(headers.get("Access-Control-Allow-Credentials")).toBeNull();
});

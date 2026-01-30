import { expect, test } from "bun:test";

import { applyCorsHeaders } from "../../../core/server/middleware/cors";

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

import { expect, test } from "bun:test";

import { applySecurityHeaders } from "../../../core/server/middleware/securityHeaders";

const baseConfig = {
  enabled: true,
  frameOptions: "DENY" as const,
  contentTypeOptions: true,
  referrerPolicy: "no-referrer",
  permissionsPolicy: null,
  csp: "default-src 'self'",
  hsts: "max-age=31536000; includeSubDomains",
};

test("applySecurityHeaders sets defaults", () => {
  const headers = new Headers();
  applySecurityHeaders(headers, baseConfig);

  expect(headers.get("X-Frame-Options")).toBe("DENY");
  expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(headers.get("Referrer-Policy")).toBe("no-referrer");
  expect(headers.get("Content-Security-Policy")).toBe("default-src 'self'");
  expect(headers.get("Strict-Transport-Security")).toBe(
    "max-age=31536000; includeSubDomains"
  );
});

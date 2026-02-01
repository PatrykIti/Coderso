import { expect, test } from "bun:test";

import { evaluateHostPolicy } from "../../../core/server/middleware/hostPolicy";

const adminBaseUrl = "https://cms.example.com";
const publicBaseUrl = "https://www.example.com";

test("allows when base urls are not configured", () => {
  const decision = evaluateHostPolicy({
    requestHost: "localhost:3000",
    pathname: "/admin",
    adminBaseUrl: null,
    publicBaseUrl: null,
  });

  expect(decision.allow).toBe(true);
});

test("allows admin routes on admin host and blocks public routes", () => {
  const adminOk = evaluateHostPolicy({
    requestHost: "cms.example.com",
    pathname: "/admin",
    adminBaseUrl,
    publicBaseUrl,
  });
  expect(adminOk.allow).toBe(true);

  const publicBlocked = evaluateHostPolicy({
    requestHost: "cms.example.com",
    pathname: "/",
    adminBaseUrl,
    publicBaseUrl,
  });
  expect(publicBlocked.allow).toBe(false);
  expect(publicBlocked.reason).toBe("public_host_required");
});

test("blocks admin routes on public host and allows public routes", () => {
  const adminBlocked = evaluateHostPolicy({
    requestHost: "www.example.com",
    pathname: "/admin",
    adminBaseUrl,
    publicBaseUrl,
  });
  expect(adminBlocked.allow).toBe(false);
  expect(adminBlocked.reason).toBe("admin_host_required");

  const publicOk = evaluateHostPolicy({
    requestHost: "www.example.com",
    pathname: "/pages",
    adminBaseUrl,
    publicBaseUrl,
  });
  expect(publicOk.allow).toBe(true);
});

test("allows media on admin host", () => {
  const decision = evaluateHostPolicy({
    requestHost: "cms.example.com",
    pathname: "/media/uploads/logo.png",
    adminBaseUrl,
    publicBaseUrl,
  });
  expect(decision.allow).toBe(true);
});

test("blocks unknown host when both are configured", () => {
  const decision = evaluateHostPolicy({
    requestHost: "other.example.com",
    pathname: "/admin",
    adminBaseUrl,
    publicBaseUrl,
  });
  expect(decision.allow).toBe(false);
  expect(decision.reason).toBe("host_mismatch");
});

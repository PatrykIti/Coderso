// Media delivery access control: test-deps seam guards, mount/method routing,
// rate limiting, and the internal auth/RBAC + API key scope variants.
import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import { handleMediaDeliveryRequest } from "../../../core/server/mediaDelivery";
import {
  createMediaDeliveryHarness,
  passiveFixtures,
  request,
  securitySettings,
} from "./mediaDeliveryTestSupport";

const { state, recordFor, installHarness, setMediaDeliveryDepsForTests } =
  createMediaDeliveryHarness();

test("test dependency overrides reject in production while null reset remains allowed", () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    expect(() => setMediaDeliveryDepsForTests({ loadAccessMode: async () => "public" })).toThrow(
      "media_delivery_test_override_forbidden_in_production"
    );
    expect(() => setMediaDeliveryDepsForTests(null)).not.toThrow();
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("an override installed before production is ignored by the handler", async () => {
  const previous = process.env.NODE_ENV;
  let overrideCalls = 0;
  try {
    process.env.NODE_ENV = "test";
    setMediaDeliveryDepsForTests({
      loadSecuritySettings: async () => {
        overrideCalls += 1;
        return securitySettings;
      },
    });
    process.env.NODE_ENV = "production";
    // Exercise dependency selection without pinning a response owned by the current
    // production access/rate/settings/record state.
    await handleMediaDeliveryRequest(request("/media/object.png"));
    expect(overrideCalls).toBe(0);
  } finally {
    setMediaDeliveryDepsForTests(null);
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("mount and method failures are exact and perform zero downstream work", async () => {
  for (const path of ["/media", "/media/", "/mediax/key.png"]) {
    expect((await handleMediaDeliveryRequest(request(path))).status).toBe(404);
  }
  const method = await handleMediaDeliveryRequest(request("/media/key.png", { method: "POST" }));
  expect(method.status).toBe(405);
  expect(method.headers.get("allow")).toBe("GET, HEAD");
  expect(state.calls.rate).toEqual([]);
  expect(state.calls.records).toEqual([]);
  expect(state.calls.resolves).toBe(0);
});

test("rate-limit rejection maps to 429 before key, record, or adapter work", async () => {
  installHarness({
    chargeRateLimit: () => {
      throw new ApiError("rate_limited", "Too many requests", 429);
    },
  });
  const result = await handleMediaDeliveryRequest(request("/media/%ZZ.png"));
  expect(result.status).toBe(429);
  expect(state.calls.records).toEqual([]);
  expect(state.calls.resolves).toBe(0);
});

test("internal auth and RBAC complete before row lookup for missing and existing keys", async () => {
  state.mode = "internal";
  recordFor("existing.png", "image/png", passiveFixtures[0].bytes);

  for (const key of ["existing.png", "missing.png"]) {
    expect((await handleMediaDeliveryRequest(request(`/media/${key}`))).status).toBe(401);
  }
  expect(state.calls.records).toEqual([]);

  expect(
    (
      await handleMediaDeliveryRequest(
        request("/media/existing.png", { headers: { authorization: "Bearer wrong" } })
      )
    ).status
  ).toBe(403);
  expect(state.calls.records).toEqual([]);

  state.permissionAllowed = false;
  expect(
    (
      await handleMediaDeliveryRequest(
        request("/media/existing.png", { headers: { cookie: "session=allowed" } })
      )
    ).status
  ).toBe(403);
  expect(state.calls.records).toEqual([]);

  state.permissionAllowed = true;
  const allowedSession = await handleMediaDeliveryRequest(
    request("/media/existing.png", { headers: { cookie: "session=allowed" } })
  );
  expect(allowedSession.status).toBe(200);
  expect(allowedSession.headers.get("content-type")).toBe("image/png");
  expect(allowedSession.headers.get("content-disposition")?.startsWith("inline;")).toBe(true);
  expect(allowedSession.headers.get("x-content-type-options")).toBe("nosniff");
  expect(allowedSession.headers.get("content-length")).toBeNull();
  expect(Buffer.from(await allowedSession.arrayBuffer())).toEqual(passiveFixtures[0].bytes);
  expect(state.calls.records).toEqual(["existing.png"]);
  expect(state.calls.permissions).toBe(2);
});

test("internal API key scope streams through the proxy and never asks for provider URL", async () => {
  state.mode = "internal";
  const fixture = passiveFixtures[0];
  recordFor("allowed.png", fixture.mimeType, fixture.bytes);
  const result = await handleMediaDeliveryRequest(
    request("/media/allowed.png", {
      headers: {
        authorization: "Bearer allowed",
        "x-forwarded-for": "198.51.100.20, 10.0.0.2",
        "user-agent": "internal-agent",
      },
    })
  );
  expect(result.status).toBe(200);
  expect(result.headers.get("content-type")).toBe(fixture.mimeType);
  expect(result.headers.get("content-disposition")?.startsWith("inline;")).toBe(true);
  expect(result.headers.get("x-content-type-options")).toBe("nosniff");
  expect(result.headers.get("content-length")).toBeNull();
  expect(Buffer.from(await result.arrayBuffer())).toEqual(fixture.bytes);
  expect(state.calls.publicUrls).toBe(0);
  expect(state.calls.apiKeys).toBe(1);
  expect(state.calls.rate).toEqual([
    {
      bucket: "public_read",
      identity: { ip: "198.51.100.20", userAgent: "internal-agent" },
    },
  ]);
});

// Media delivery error cases: absent/mismatched rows, invalid sizes, resolver
// and dependency failures, and the provider 404/503 missing-shape mapping.
import { expect, test } from "bun:test";

import { handleMediaDeliveryRequest } from "../../../core/server/mediaDelivery";
import { createMediaDeliveryHarness, passiveFixtures, request } from "./mediaDeliveryTestSupport";

const { state, recordFor, installHarness } = createMediaDeliveryHarness();

test("absent and mismatched records never resolve or read storage", async () => {
  expect((await handleMediaDeliveryRequest(request("/media/missing.png"))).status).toBe(404);
  expect(state.calls.resolves).toBe(0);
  expect(state.calls.gets).toEqual([]);

  installHarness({
    findRecord: async (key) => {
      state.calls.records.push(key);
      return { key: "different.png", mimeType: "image/png", originalName: null, size: 13 };
    },
  });
  expect((await handleMediaDeliveryRequest(request("/media/requested.png"))).status).toBe(404);
  expect(state.calls.resolves).toBe(0);
  expect(state.calls.gets).toEqual([]);
});

test("invalid row size and resolver failures map to generic 503", async () => {
  for (const [index, size] of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ].entries()) {
    const key = `invalid-${index}.png`;
    state.records.set(key, { key, mimeType: "image/png", originalName: null, size });
    expect((await handleMediaDeliveryRequest(request(`/media/${key}`))).status).toBe(503);
  }
  expect(state.calls.resolves).toBe(0);

  recordFor("resolver.png", "image/png", passiveFixtures[0].bytes);
  installHarness({ resolveAdapter: async () => Promise.reject(new Error("secret resolver")) });
  const result = await handleMediaDeliveryRequest(request("/media/resolver.png"));
  expect(result.status).toBe(503);
  expect(await result.text()).toBe("Service Unavailable");
});

test("missing-shaped failures outside object get/prefix reads remain generic 503", async () => {
  const enoent = () => Object.assign(new Error("missing"), { code: "ENOENT" });

  installHarness({ loadSecuritySettings: async () => Promise.reject(enoent()) });
  expect((await handleMediaDeliveryRequest(request("/media/object.png"))).status).toBe(503);

  installHarness({
    loadAccessMode: async () =>
      Promise.reject(Object.assign(new Error("missing"), { $metadata: { httpStatusCode: 404 } })),
  });
  expect((await handleMediaDeliveryRequest(request("/media/object.png"))).status).toBe(503);

  state.mode = "internal";
  installHarness({ attachSession: async () => Promise.reject(new Error("s3_object_missing")) });
  expect((await handleMediaDeliveryRequest(request("/media/object.png"))).status).toBe(503);

  installHarness({
    attachSession: async (ctx) => {
      ctx.user = { id: "session-user" };
    },
    requireSessionMediaRead: async () => Promise.reject(enoent()),
  });
  expect((await handleMediaDeliveryRequest(request("/media/object.png"))).status).toBe(503);

  state.mode = "public";
  installHarness({
    findRecord: async () => Promise.reject(Object.assign(new Error("missing"), { status: 404 })),
  });
  expect((await handleMediaDeliveryRequest(request("/media/object.png"))).status).toBe(503);

  recordFor("object.png", "image/png", passiveFixtures[0].bytes);
  installHarness({ resolveAdapter: async () => Promise.reject(enoent()) });
  expect((await handleMediaDeliveryRequest(request("/media/object.png"))).status).toBe(503);
});

test("local, S3, and Azure missing shapes map to 404 while other get failures map to 503", async () => {
  recordFor("object.png", "image/png", passiveFixtures[0].bytes);
  const missingErrors: unknown[] = [
    Object.assign(new Error("missing"), { code: "ENOENT" }),
    new Error("s3_object_missing"),
    new Error("azure_object_missing"),
    Object.assign(new Error("missing"), { name: "NoSuchKey" }),
    Object.assign(new Error("missing"), { name: "NotFound" }),
    Object.assign(new Error("missing"), { code: "BlobNotFound" }),
    Object.assign(new Error("missing"), { name: "ResourceNotFound" }),
    Object.assign(new Error("missing"), { status: 404 }),
    Object.assign(new Error("missing"), { statusCode: 404 }),
    Object.assign(new Error("missing"), { $metadata: { httpStatusCode: 404 } }),
  ];
  for (const error of missingErrors) {
    state.adapterGet = async () => Promise.reject(error);
    expect((await handleMediaDeliveryRequest(request("/media/object.png"))).status).toBe(404);
  }

  state.adapterGet = async () => Promise.reject(new Error("provider secret"));
  const unavailable = await handleMediaDeliveryRequest(request("/media/object.png"));
  expect(unavailable.status).toBe(503);
  expect(await unavailable.text()).toBe("Service Unavailable");
});

// Media delivery access contract: canonical key routing and per-grant matrix.
//
// The remaining contract suites live in sibling files that share the harness
// from mediaDeliveryTestSupport.ts:
//   - mediaDeliveryAccessControl.test.ts  (seam, mount/method, rate, auth/RBAC)
//   - mediaDeliveryAdapters.test.ts       (real adapter + Bun.serve transport)
//   - mediaDeliveryErrors.test.ts         (absent rows, invalid sizes, 404/503)
//   - mediaDeliveryStreams.test.ts        (stream failures, replay, poison)
import { expect, test } from "bun:test";

import { handleMediaDeliveryRequest } from "../../../core/server/mediaDelivery";
import {
  attachmentFixtures,
  createMediaDeliveryHarness,
  passiveFixtures,
  request,
  trackedStream,
} from "./mediaDeliveryTestSupport";

const { state, recordFor } = createMediaDeliveryHarness();

test("canonical key parsing rejects observable aliases and the unsafe sentinel before lookup", async () => {
  const invalidPaths = [
    "/media/%00unavailable/id",
    "/media/%ZZ.png",
    "/media/a%2Fb.png",
    "/media/%252e%252e/file.png",
    "/media/%c5%bc.png",
    "/media/a%25b.png",
  ];
  for (const path of invalidPaths) {
    expect((await handleMediaDeliveryRequest(request(path))).status).toBe(400);
  }
  expect(state.calls.rate).toHaveLength(invalidPaths.length);
  expect(state.calls.records).toEqual([]);
  expect(state.calls.resolves).toBe(0);
});

test("WHATWG-normalized dot segments cannot create a traversal storage key", async () => {
  const bytes = passiveFixtures[0].bytes;
  recordFor("safe.png", "image/png", bytes);
  const normalized = request("/media/folder/../safe.png");
  expect(new URL(normalized.url).pathname).toBe("/media/safe.png");
  expect((await handleMediaDeliveryRequest(normalized)).status).toBe(200);
  expect(state.calls.records).toEqual(["safe.png"]);

  const outside = request("/media/%2e%2e/outside.png");
  expect(new URL(outside.url).pathname).toBe("/outside.png");
  expect((await handleMediaDeliveryRequest(outside)).status).toBe(404);
  expect(state.calls.records).toEqual(["safe.png"]);
});

test("encoded space and Unicode keys round-trip canonically with one public_read charge", async () => {
  const first = passiveFixtures[0];
  const firstKey = "folder/a b.png";
  recordFor(firstKey, first.mimeType, first.bytes);
  const firstResponse = await handleMediaDeliveryRequest(
    request("/media/folder/a%20b.png", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1", "user-agent": "agent" },
    })
  );
  expect(firstResponse.status).toBe(200);
  expect(state.calls.records).toEqual([firstKey]);
  expect(state.calls.rate[0]).toEqual({
    bucket: "public_read",
    identity: { ip: "203.0.113.10", userAgent: "agent" },
  });

  const secondKey = "folder/żółć.png";
  recordFor(secondKey, first.mimeType, first.bytes);
  const secondResponse = await handleMediaDeliveryRequest(
    request("/media/folder/%C5%BC%C3%B3%C5%82%C4%87.png")
  );
  expect(secondResponse.status).toBe(200);
  expect(state.calls.records.at(-1)).toBe(secondKey);
  expect(state.calls.rate).toHaveLength(2);
});

test("all passive canonical profiles require matching bytes and emit inline safe headers", async () => {
  for (const [index, fixture] of passiveFixtures.entries()) {
    const key = `2026/07/passive-${index}${fixture.extension}`;
    recordFor(key, fixture.mimeType, fixture.bytes);
    const result = await handleMediaDeliveryRequest(request(`/media/${key}`));
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toBe(fixture.mimeType);
    expect(result.headers.get("content-disposition")?.startsWith("inline;")).toBe(true);
    expect(result.headers.get("content-disposition")).toContain(fixture.extension);
    expect(result.headers.get("x-content-type-options")).toBe("nosniff");
    expect(result.headers.get("content-length")).toBeNull();
    expect(Buffer.from(await result.arrayBuffer())).toEqual(fixture.bytes);
  }
  expect(state.calls.publicUrls).toBe(0);
});

test("canonical active profiles remain attachments based on persisted MIME and key", async () => {
  for (const [index, fixture] of attachmentFixtures.entries()) {
    const key = `2026/07/active-${index}${fixture.extension}`;
    const bytes = index === 1 ? passiveFixtures[0].bytes : fixture.bytes;
    recordFor(key, fixture.mimeType, bytes, `unsafe\r\nname${fixture.extension}.exe`);
    const get = await handleMediaDeliveryRequest(request(`/media/${key}`));
    expect(get.status).toBe(200);
    expect(get.headers.get("content-type")).toBe(fixture.mimeType);
    expect(get.headers.get("content-disposition")?.startsWith("attachment;")).toBe(true);
    expect(get.headers.get("content-disposition")).toContain(fixture.extension);
    expect(get.headers.get("content-disposition")).not.toContain("\r");
    expect(get.headers.get("content-disposition")).not.toContain("\n");
    expect(get.headers.get("x-content-type-options")).toBe("nosniff");
    expect(get.headers.get("content-length")).toBeNull();
    expect(Buffer.from(await get.arrayBuffer())).toEqual(bytes);

    const head = await handleMediaDeliveryRequest(request(`/media/${key}`, { method: "HEAD" }));
    expect(head.status).toBe(200);
    for (const name of ["content-type", "content-disposition", "x-content-type-options"]) {
      expect(head.headers.get(name)).toBe(get.headers.get(name));
    }
    expect(head.headers.get("content-length")).toBe(String(bytes.byteLength));
    expect(await head.text()).toBe("");
  }
  expect(state.calls.rate).toHaveLength(attachmentFixtures.length * 2);
  expect(state.calls.publicUrls).toBe(0);
});

test("legacy MIME/key or passive byte mismatches fall back to octet-stream download.bin", async () => {
  const cases = [
    { key: "legacy/wrong.jpg", mimeType: "image/png", bytes: passiveFixtures[0].bytes },
    { key: "legacy/spoof.png", mimeType: "image/png", bytes: Buffer.from("plain text body") },
    { key: "legacy/page.html", mimeType: "text/html", bytes: Buffer.from("<html>safe download") },
  ];
  for (const entry of cases) {
    recordFor(entry.key, entry.mimeType, entry.bytes, "deceptive.svg.html");
    const result = await handleMediaDeliveryRequest(request(`/media/${entry.key}`));
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toBe("application/octet-stream");
    expect(result.headers.get("content-disposition")).toBe(
      "attachment; filename=\"download.bin\"; filename*=UTF-8''download.bin"
    );
    expect(Buffer.from(await result.arrayBuffer())).toEqual(entry.bytes);
  }
});

test("signature-only EOF never promotes a truncated passive image", async () => {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  recordFor("truncated.png", "image/png", signature);
  const result = await handleMediaDeliveryRequest(request("/media/truncated.png"));
  expect(result.status).toBe(200);
  expect(result.headers.get("content-type")).toBe("application/octet-stream");
  expect(result.headers.get("content-disposition")).toContain(".bin");
  expect(Buffer.from(await result.arrayBuffer())).toEqual(signature);
});

test("GET and HEAD share policy headers while HEAD owns exact length and closes the source", async () => {
  const bytes = Buffer.from("RIFF1234WEBP!head-parity");
  recordFor("head.webp", "image/webp", bytes);
  let tracked = trackedStream([bytes]);
  state.streamFactory = () => tracked.stream;
  const get = await handleMediaDeliveryRequest(request("/media/head.webp"));
  await get.arrayBuffer();

  tracked = trackedStream([bytes.subarray(0, 13)], { keepOpen: true });
  state.streamFactory = () => tracked.stream;
  const head = await handleMediaDeliveryRequest(request("/media/head.webp", { method: "HEAD" }));
  expect(head.status).toBe(200);
  for (const name of ["content-type", "content-disposition", "x-content-type-options"]) {
    expect(head.headers.get(name)).toBe(get.headers.get(name));
  }
  expect(get.headers.get("content-length")).toBeNull();
  expect(head.headers.get("content-length")).toBe(String(bytes.byteLength));
  expect(await head.text()).toBe("");
  expect(tracked.tracker.closeCount).toBe(1);
});

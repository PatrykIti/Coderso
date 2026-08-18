// Media delivery stream failure cases: prefix/tail errors, chunk replay,
// short/excess bodies, poison tail coercion, and web-stream cancellation.
import { expect, test } from "bun:test";

import { handleMediaDeliveryRequest } from "../../../core/server/mediaDelivery";
import {
  createMediaDeliveryHarness,
  passiveFixtures,
  poisonTailStream,
  request,
  trackedStream,
} from "./mediaDeliveryTestSupport";

const { state, recordFor } = createMediaDeliveryHarness();

test("prefix-time stream errors map missing to 404 and unavailable to 503", async () => {
  recordFor("stream.png", "image/png", passiveFixtures[0].bytes);
  let tracked = trackedStream([], {
    tailError: Object.assign(new Error("missing"), { code: "ENOENT" }),
  });
  state.streamFactory = () => tracked.stream;
  expect((await handleMediaDeliveryRequest(request("/media/stream.png"))).status).toBe(404);
  expect(tracked.tracker.closeCount).toBe(1);

  tracked = trackedStream([], { tailError: new Error("credential=secret") });
  state.streamFactory = () => tracked.stream;
  const unavailable = await handleMediaDeliveryRequest(request("/media/stream.png"));
  expect(unavailable.status).toBe(503);
  expect(await unavailable.text()).not.toContain("secret");
  expect(tracked.tracker.closeCount).toBe(1);
});

test("one-byte chunks and an oversized first chunk replay without loss", async () => {
  const bytes = Buffer.from("RIFF1234WEBP!exact-replay");
  recordFor("one.webp", "image/webp", bytes);
  let tracked = trackedStream(Array.from(bytes, (byte) => Buffer.from([byte])));
  state.streamFactory = () => tracked.stream;
  let result = await handleMediaDeliveryRequest(request("/media/one.webp"));
  expect(Buffer.from(await result.arrayBuffer())).toEqual(bytes);
  expect(tracked.tracker.closeCount).toBe(1);

  recordFor("chunk.webp", "image/webp", bytes);
  tracked = trackedStream([bytes]);
  state.streamFactory = () => tracked.stream;
  result = await handleMediaDeliveryRequest(request("/media/chunk.webp"));
  expect(Buffer.from(await result.arrayBuffer())).toEqual(bytes);
  expect(tracked.tracker.closeCount).toBe(1);
});

test("pre-header short and excess objects fail with 503", async () => {
  state.records.set("short.png", {
    key: "short.png",
    mimeType: "image/png",
    originalName: null,
    size: 10,
  });
  state.bodies.set("short.png", Buffer.from("short"));
  expect((await handleMediaDeliveryRequest(request("/media/short.png"))).status).toBe(503);

  state.records.set("excess.png", {
    key: "excess.png",
    mimeType: "image/png",
    originalName: null,
    size: 2,
  });
  state.bodies.set("excess.png", Buffer.from("excess"));
  expect((await handleMediaDeliveryRequest(request("/media/excess.png"))).status).toBe(503);
});

test("tail short, excess, and provider errors reject only with generic stream failure", async () => {
  const first = Buffer.from("RIFF1234WEBP!");
  const cases: Array<{
    key: string;
    size: number;
    source: ReturnType<typeof trackedStream>;
  }> = [
    { key: "short.webp", size: first.byteLength + 5, source: trackedStream([first]) },
    {
      key: "excess.webp",
      size: first.byteLength + 1,
      source: trackedStream([first, Buffer.from("xx")]),
    },
    {
      key: "error.webp",
      size: first.byteLength + 1,
      source: trackedStream([first], { tailError: new Error("provider credential secret") }),
    },
  ];

  for (const entry of cases) {
    state.records.set(entry.key, {
      key: entry.key,
      mimeType: "image/webp",
      originalName: null,
      size: entry.size,
    });
    state.streamFactory = () => entry.source.stream;
    const result = await handleMediaDeliveryRequest(request(`/media/${entry.key}`));
    expect(result.status).toBe(200);
    let caught: unknown;
    try {
      await result.arrayBuffer();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe("media_stream_failed");
    expect((caught as Error).message).not.toContain("secret");
    expect((caught as Error & { cause?: unknown }).cause).toBeUndefined();
    expect(entry.source.tracker.closeCount).toBe(1);
  }
});

test("resolved poison tail chunks reject generically without coercing provider data", async () => {
  const first = Buffer.from("RIFF1234WEBP!");
  state.records.set("poison.webp", {
    key: "poison.webp",
    mimeType: "image/webp",
    originalName: null,
    size: first.byteLength + 1,
  });
  const poisoned = poisonTailStream(first);
  state.streamFactory = () => poisoned.stream;
  const result = await handleMediaDeliveryRequest(request("/media/poison.webp"));
  expect(result.status).toBe(200);
  let caught: unknown;
  try {
    await result.arrayBuffer();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(Error);
  expect((caught as Error).message).toBe("media_stream_failed");
  expect((caught as Error).message).not.toContain("SECRET");
  expect((caught as Error & { cause?: unknown }).cause).toBeUndefined();
  expect(poisoned.tracker.closeCount).toBe(1);
});

test("Web-stream cancellation closes the source once without a synthetic body error", async () => {
  const first = Buffer.from("RIFF1234WEBP!");
  state.records.set("cancel.webp", {
    key: "cancel.webp",
    mimeType: "image/webp",
    originalName: null,
    size: first.byteLength + 100,
  });
  const tracked = trackedStream([first], { keepOpen: true });
  state.streamFactory = () => tracked.stream;
  const result = await handleMediaDeliveryRequest(request("/media/cancel.webp"));
  const reader = result.body?.getReader();
  expect(reader).toBeDefined();
  let received = 0;
  while (received < first.byteLength) {
    const chunk = await reader!.read();
    expect(chunk.done).toBe(false);
    received += chunk.value?.byteLength ?? 0;
  }
  const pendingRead = reader!.read();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await expect(reader!.cancel("done")).resolves.toBeUndefined();
  await expect(pendingRead).resolves.toMatchObject({ done: true });
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  expect(tracked.tracker.closeCount).toBe(1);
});

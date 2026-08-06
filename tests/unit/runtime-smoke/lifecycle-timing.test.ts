import { expect, test } from "bun:test";
import { RuntimeLifecycle } from "../../../scripts/runtime-smoke/lifecycle";
import { pollUntil } from "../../../scripts/runtime-smoke/polling";
import { TimingRecorder } from "../../../scripts/runtime-smoke/timing";

test("lifecycle closes in reverse order once and preserves cleanup failures", async () => {
  const events: string[] = [];
  const lifecycle = new RuntimeLifecycle();
  lifecycle.register({
    name: "first",
    async close() {
      events.push("close:first");
    },
    async proveAbsent() {
      events.push("absent:first");
      return true;
    },
  });
  lifecycle.register({
    name: "second",
    async close() {
      events.push("close:second");
      throw new Error("private failure");
    },
    async proveAbsent() {
      events.push("absent:second");
      return false;
    },
  });

  const first = lifecycle.closeAllNeverThrow();
  const second = lifecycle.closeAllNeverThrow();
  expect(first).toBe(second);
  expect(await first).toEqual({
    pass: false,
    failures: [
      { resource: "second", phase: "close", code: "smoke_cleanup_failed" },
      { resource: "second", phase: "absence", code: "smoke_cleanup_failed" },
    ],
  });
  expect(events).toEqual(["close:second", "absent:second", "close:first", "absent:first"]);
  expect(() => lifecycle.assertAccepting()).toThrow();
});

test("timings and polling use monotonic bounded state", async () => {
  const clockValues = [10, 12.2, 20, 23.1];
  const recorder = new TimingRecorder(() => clockValues.shift() ?? 23.1);
  await recorder.measure("phase", "setup", async () => "ok");
  await expect(
    recorder.measure("phase", "setup", async () => {
      throw new Error("expected");
    })
  ).rejects.toThrow("expected");
  expect(recorder.snapshot()).toEqual([
    { kind: "phase", name: "setup", count: 2, failed: 1, elapsedMs: 7 },
  ]);

  let now = 0;
  let attempts = 0;
  const result = await pollUntil({
    timeoutMs: 20,
    intervalMs: 5,
    now: () => now,
    schedule(callback, delayMs) {
      now += delayMs;
      callback();
      return 0;
    },
    async check() {
      attempts += 1;
      return attempts === 3 ? "ready" : null;
    },
  });
  expect(result).toBe("ready");
  expect(attempts).toBe(3);
});

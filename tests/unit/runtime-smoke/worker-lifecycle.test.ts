import { expect, test } from "bun:test";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { ProcessSupervisor } from "../../../scripts/runtime-smoke/process-supervisor";
import { runWorkerEntry } from "../../../scripts/runtime-smoke/workers/entry";
import {
  SELF_TEST_ECHO_DESCRIPTOR,
  SELF_TEST_MUTATION_DESCRIPTOR,
  createSelfTestWorkerRegistry,
} from "../../../scripts/runtime-smoke/workers/operation-registry";
import { WorkerPool, type WorkerProfileSpec } from "../../../scripts/runtime-smoke/workers/pool";

const root = process.cwd();
const entryFile = resolve(root, "scripts/runtime-smoke/workers/entry.ts");
const executable = await realpath(process.execPath);

function profiles(): readonly WorkerProfileSpec[] {
  return [
    {
      profileId: "self-test",
      databaseBearing: false,
      entryFile,
      cwd: root,
      environment: {},
    },
    {
      profileId: "self-test-a",
      databaseBearing: false,
      entryFile,
      cwd: root,
      environment: { SMOKE_CANARY_A: "present" },
    },
    {
      profileId: "self-test-b",
      databaseBearing: false,
      entryFile,
      cwd: root,
      environment: { SMOKE_CANARY_B: "present" },
    },
  ];
}

test("worker entry closes and proves registry resources before a clean EOF exit", async () => {
  const events: string[] = [];
  const registry = createSelfTestWorkerRegistry({
    async close() {
      events.push("close");
    },
    async proveAbsent() {
      events.push("absence");
      return events[0] === "close";
    },
  });
  const input = (async function* emptyInput() {
    await Promise.resolve();
  })();
  await runWorkerEntry({
    profileId: "self-test",
    registry,
    input,
    output: {
      async write() {
        throw new Error("empty worker input must not produce output");
      },
    },
  });
  expect(events).toEqual(["close", "absence"]);
});

test("worker pool reuses one supervised process and matches the one-shot oracle", async () => {
  const supervisor = new ProcessSupervisor(root);
  const registry = createSelfTestWorkerRegistry();
  const pool = await WorkerPool.create({
    root,
    executable,
    supervisor,
    registry,
    profiles: profiles(),
  });
  const firstClient = await pool.forProfile("self-test");
  const first = await pool.dispatch(SELF_TEST_ECHO_DESCRIPTOR, { value: "first" });
  const second = await pool.dispatch(SELF_TEST_ECHO_DESCRIPTOR, { value: "second" });
  const oneShot = await registry.executeOneShot(SELF_TEST_ECHO_DESCRIPTOR, { value: "second" });

  expect(first).toEqual({ value: "first" });
  expect(second).toEqual(oneShot);
  expect((await pool.forProfile("self-test")).pid).toBe(firstClient.pid);
  expect(pool.counters()).toMatchObject({ starts: 1, requests: 2, reconnects: 0 });

  await pool.close();
  expect(await pool.proveAbsent()).toBe(true);
});

test("worker pool never replays a mutation after response loss", async () => {
  const supervisor = new ProcessSupervisor(root);
  const pool = await WorkerPool.create({
    root,
    executable,
    supervisor,
    registry: createSelfTestWorkerRegistry(),
    profiles: profiles(),
  });
  await expect(
    pool.dispatch(SELF_TEST_MUTATION_DESCRIPTOR, { mode: "lose-response" })
  ).rejects.toMatchObject({ dispatched: true });
  expect(pool.counters()).toMatchObject({ starts: 1, requests: 1, reconnects: 0 });
  await pool.close();
  expect(await pool.proveAbsent()).toBe(true);
});

test("worker pool retries an idempotent read only when delivery never starts", async () => {
  const supervisor = new ProcessSupervisor(root);
  const pool = await WorkerPool.create({
    root,
    executable,
    supervisor,
    registry: createSelfTestWorkerRegistry(),
    profiles: profiles(),
  });
  let boundaries = 0;
  await expect(
    pool.dispatch(SELF_TEST_ECHO_DESCRIPTOR, { value: "unwritten" }, () => {
      boundaries += 1;
      throw new Error("pre-dispatch stop");
    })
  ).rejects.toMatchObject({ dispatched: false });
  expect(boundaries).toBe(2);
  expect(pool.counters()).toMatchObject({ starts: 2, requests: 0, reconnects: 1 });
  await pool.close();
  expect(await pool.proveAbsent()).toBe(true);
});

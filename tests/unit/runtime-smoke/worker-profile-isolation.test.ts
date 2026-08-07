import { expect, test } from "bun:test";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { ProcessSupervisor } from "../../../scripts/runtime-smoke/process-supervisor";
import {
  SELF_TEST_PROFILE_DESCRIPTORS,
  createSelfTestWorkerRegistry,
} from "../../../scripts/runtime-smoke/workers/operation-registry";
import { WorkerPool } from "../../../scripts/runtime-smoke/workers/pool";

const root = process.cwd();
const entryFile = resolve(root, "scripts/runtime-smoke/workers/entry.ts");
const executable = await realpath(process.execPath);

test("workers are lazy, reused by exact profile, and never receive a union of secrets", async () => {
  const supervisor = new ProcessSupervisor(root);
  const pool = await WorkerPool.create({
    root,
    executable,
    supervisor,
    registry: createSelfTestWorkerRegistry(),
    profiles: [
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
        privileged: true,
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
    ],
  });
  expect(pool.counters().starts).toBe(0);

  const resultA = await pool.dispatch(SELF_TEST_PROFILE_DESCRIPTORS.a, {});
  const clientA = await pool.forProfile("self-test-a");
  const resultB = await pool.dispatch(SELF_TEST_PROFILE_DESCRIPTORS.b, {});
  const clientB = await pool.forProfile("self-test-b");
  expect(resultA).toEqual({ profileId: "self-test-a", canaryA: true, canaryB: false });
  expect(resultB).toEqual({ profileId: "self-test-b", canaryA: false, canaryB: true });
  expect(clientA.pid).not.toBe(clientB.pid);
  expect(pool.counters().starts).toBe(2);

  await expect(clientA.dispatch(SELF_TEST_PROFILE_DESCRIPTORS.b, {})).rejects.toThrow(
    "profile does not own"
  );
  const startsBeforeBoundary = pool.counters().starts;
  await pool.closePrivilegedProfiles();
  expect(await clientA.proveAbsent()).toBe(true);
  expect(pool.counters().starts).toBe(startsBeforeBoundary);
  await pool.closePrivilegedProfiles();
  expect(pool.counters().starts).toBe(startsBeforeBoundary);
  expect((await pool.forProfile("self-test-b")).pid).toBe(clientB.pid);
  const replacementA = await pool.forProfile("self-test-a");
  expect(replacementA.pid).not.toBe(clientA.pid);
  expect((await pool.forProfile("self-test-b")).pid).toBe(clientB.pid);
  expect(pool.counters().starts).toBe(3);

  await pool.close();
  expect(await pool.proveAbsent()).toBe(true);
});

test("database-bearing profiles require a single-connection pool", async () => {
  const supervisor = new ProcessSupervisor(root);
  await expect(
    WorkerPool.create({
      root,
      executable,
      supervisor,
      registry: createSelfTestWorkerRegistry(),
      profiles: [
        {
          profileId: "self-test",
          databaseBearing: true,
          entryFile,
          cwd: root,
          environment: { DB_POOL_MAX: "2" },
        },
        {
          profileId: "self-test-a",
          databaseBearing: false,
          entryFile,
          cwd: root,
          environment: {},
        },
        {
          profileId: "self-test-b",
          databaseBearing: false,
          entryFile,
          cwd: root,
          environment: {},
        },
      ],
    })
  ).rejects.toThrow("DB_POOL_MAX=1");
  await supervisor.close();
});

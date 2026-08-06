import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import type { PlainJsonValue } from "../../../scripts/runtime-smoke/workers/contracts";
import {
  TASK540_SOURCE_CATALOG,
  type Task540SourceEntry,
} from "../../../scripts/runtime-smoke/adapters/task-540/source-catalog";
import {
  TASK540_SOURCE_INPUT_SLOT_KEY,
  compileTask540BridgeSource,
} from "../../../scripts/runtime-smoke/adapters/task-540/source-compiler";
import { Task540SourceExecutor } from "../../../scripts/runtime-smoke/adapters/task-540/source-executor";

const root = path.resolve(import.meta.dir, "../../..");
const coreRoot = path.join(root, "core");

function canonical(value: PlainJsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((nested) => canonical(nested)).join(",")}]`;
  const object = value as Readonly<Record<string, PlainJsonValue>>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key] as PlainJsonValue)}`)
    .join(",")}}`;
}

function screenMaterializeInput(): PlainJsonValue & Record<string, PlainJsonValue> {
  const id = "00000000-0000-4000-8000-000000007529";
  return {
    bodyWithoutDefinition: {
      contentTypeId: id,
      name: "Task 540 Screen",
      showInSidebar: true,
      sidebarLabel: "Task 540",
      status: "active",
    },
    contentType: {
      id,
      name: "Task 540 Type",
      schema: { type: "object", properties: {} },
      slug: "task-540-type",
    },
    definitionWithoutListView: {
      editorView: {
        document: { schemaVersion: 1, sections: [] },
        bindings: [],
        saveMode: "entry",
        interactionMode: "inline",
      },
      schemaVersion: 4,
    },
  };
}

function rehash(entry: Task540SourceEntry, source: string): Task540SourceEntry {
  return {
    ...entry,
    source,
    sourceSha256: createHash("sha256").update(source).digest("hex"),
  };
}

test("TASK-540 catalog is complete, profile-isolated, and supports hash-bound dynamic P/C/A IDs", () => {
  const entries = TASK540_SOURCE_CATALOG.entries();
  expect(entries).toHaveLength(57);
  expect(new Set(entries.map(({ sourceSha256 }) => sourceSha256)).size).toBe(57);
  TASK540_SOURCE_CATALOG.assertComplete();
  expect(
    TASK540_SOURCE_CATALOG.operationIds().filter((id) =>
      ["/provenance/", "/cleanup", "/absence"].some((part) => id.includes(part))
    ).length
  ).toBeGreaterThanOrEqual(41);

  const exact = TASK540_SOURCE_CATALOG.require("source/resource/seo/delete");
  expect(
    TASK540_SOURCE_CATALOG.require(
      "dynamic/resource/seo-document-entry/delete/0001",
      exact.profileId,
      exact.sourceSha256
    )
  ).toBe(exact);
  expect(() =>
    TASK540_SOURCE_CATALOG.require(
      "dynamic/resource/seo-document-entry/delete/0001",
      "user-identity-proof",
      exact.sourceSha256
    )
  ).toThrow("not allowlisted");
  expect(() =>
    TASK540_SOURCE_CATALOG.require("source/resource/seo/delete", exact.profileId, "0".repeat(64))
  ).toThrow("digest authority drifted");
});

test("TASK-540 compiler accepts every canonical source and rejects digest, import, and envelope drift", async () => {
  const compiled = await Promise.all(
    TASK540_SOURCE_CATALOG.entries().map((entry) => compileTask540BridgeSource(entry, coreRoot))
  );
  expect(compiled).toHaveLength(57);
  for (const result of compiled) {
    expect(result.moduleSource).not.toContain("Bun.stdin");
    expect(result.moduleSource).not.toContain("Bun.stdout");
    expect(result.moduleSource).not.toContain('from "./');
    expect(result.moduleSource).not.toContain('from "drizzle-orm"');
    expect(result.moduleSource.endsWith("export default canonical(output);")).toBe(true);
  }

  const schema = TASK540_SOURCE_CATALOG.require("runtime/set-035-screen-create");
  await expect(
    compileTask540BridgeSource({ ...schema, sourceSha256: "0".repeat(64) }, coreRoot)
  ).rejects.toThrow("source shape drifted");
  const forbiddenImport = schema.source.replace(
    'from "./server/validation/schemaValidator.ts"',
    'from "./server/forbidden.ts"'
  );
  await expect(
    compileTask540BridgeSource(rehash(schema, forbiddenImport), coreRoot)
  ).rejects.toThrow("import is not allowlisted");
  await expect(
    compileTask540BridgeSource(rehash(schema, `${schema.source}\n`), coreRoot)
  ).rejects.toThrow("source shape drifted");
  const unknownImport = schema.source.replace(
    "\nimport { validate }",
    '\nimport fs from "node:fs";\nimport { validate }'
  );
  await expect(compileTask540BridgeSource(rehash(schema, unknownImport), coreRoot)).rejects.toThrow(
    "named import shape drifted"
  );
});

test("TASK-540 persistent executor is byte-parity compatible with the real schema-only source", async () => {
  const input = screenMaterializeInput();
  const entry = TASK540_SOURCE_CATALOG.require("runtime/set-035-screen-create");
  const oneShot = spawnSync(process.execPath, ["--no-env-file", "--eval", entry.source], {
    cwd: coreRoot,
    env: { PATH: process.env.PATH ?? "" },
    input: `${canonical(input)}\n`,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
  expect(oneShot.status).toBe(0);
  const expected = JSON.parse(oneShot.stdout.trim()) as PlainJsonValue;

  const executor = new Task540SourceExecutor(coreRoot);
  const actual = await executor.execute({
    operationId: "runtime/set-035-screen-create",
    profileId: entry.profileId,
    sourceSha256: entry.sourceSha256,
    input,
  });
  expect(actual).toEqual(expected);
  expect(executor.counters()).toMatchObject({
    executions: 1,
    blobModuleExecutions: 1,
    compiledSources: 1,
    databaseModuleLoads: 0,
    maximumConcurrentExecutions: 1,
  });
  await executor.close();
});

test("TASK-540 source execution is serial, redacted on failure, and always clears its input slot", async () => {
  const entry = TASK540_SOURCE_CATALOG.require("runtime/set-035-screen-create");
  const validInput = screenMaterializeInput();
  const validObject = validInput as Readonly<Record<string, PlainJsonValue>>;
  const invalidInput = {
    bodyWithoutDefinition: validObject.bodyWithoutDefinition,
    contentType: {
      ...(validObject.contentType as Record<string, PlainJsonValue>),
      schema: "task-540-do-not-leak",
    },
    definitionWithoutListView: validObject.definitionWithoutListView,
  };
  const executor = new Task540SourceExecutor(coreRoot);
  let failure: unknown;
  try {
    await executor.execute({
      operationId: "runtime/set-035-screen-create",
      profileId: entry.profileId,
      sourceSha256: entry.sourceSha256,
      input: invalidInput,
    });
  } catch (error) {
    failure = error;
  }
  expect(String(failure)).toContain("TASK-540 source execution failed");
  expect(String(failure)).not.toContain("do-not-leak");
  expect(Reflect.has(globalThis, Symbol.for(TASK540_SOURCE_INPUT_SLOT_KEY))).toBe(false);

  const request = {
    operationId: "runtime/set-035-screen-create",
    profileId: entry.profileId,
    sourceSha256: entry.sourceSha256,
    input: validInput,
  } as const;
  const outputs = await Promise.all([executor.execute(request), executor.execute(request)]);
  expect(outputs[0]).toEqual(outputs[1]);
  expect(executor.counters()).toMatchObject({
    executions: 2,
    blobModuleExecutions: 2,
    maximumConcurrentExecutions: 1,
  });
  expect(Reflect.has(globalThis, Symbol.for(TASK540_SOURCE_INPUT_SLOT_KEY))).toBe(false);
  await executor.close();
});

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

databaseTest(
  "TASK-540 persistent executor preserves real read-only DB parity and reuses one DB module",
  async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl === undefined) throw new Error("database test was selected without a URL");
    const entry = TASK540_SOURCE_CATALOG.require("resource/content-routes-exact");
    const input = {};
    const oneShot = spawnSync(process.execPath, ["--no-env-file", "--eval", entry.source], {
      cwd: coreRoot,
      env: {
        PATH: process.env.PATH ?? "",
        DATABASE_URL: databaseUrl,
        DB_POOL_MAX: "1",
      },
      input: `${canonical(input)}\n`,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    expect(oneShot.status).toBe(0);
    const expected = JSON.parse(oneShot.stdout.trim()) as PlainJsonValue;

    const executor = new Task540SourceExecutor(coreRoot);
    const request = {
      operationId: "resource/content-routes-exact",
      profileId: entry.profileId,
      sourceSha256: entry.sourceSha256,
      input,
    } as const;
    expect(await executor.execute(request)).toEqual(expected);
    expect(await executor.execute(request)).toEqual(expected);
    expect(typeof executor.databaseEndHook()).toBe("function");
    expect(executor.counters()).toMatchObject({
      executions: 2,
      blobModuleExecutions: 2,
      compiledSources: 1,
      databaseModuleLoads: 1,
      databaseModuleReuseHits: 1,
      databaseCloseCalls: 0,
      maximumConcurrentExecutions: 1,
    });
    await executor.close();
    await executor.close();
    expect(executor.counters().databaseCloseCalls).toBe(1);
  }
);

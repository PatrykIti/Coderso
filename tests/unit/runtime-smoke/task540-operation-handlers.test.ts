import { expect, test } from "bun:test";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type {
  PlainJsonObject,
  PlainJsonValue,
} from "../../../scripts/runtime-smoke/workers/contracts";
import { requireTask540OperationAlias } from "../../../scripts/runtime-smoke/adapters/task-540/operations/aliases";
import {
  createTask540TypedHandlers,
  requireTask540TypedHandler,
} from "../../../scripts/runtime-smoke/adapters/task-540/operations/handlers";
import {
  createTask540OperationRegistry,
  task540OperationDescriptor,
} from "../../../scripts/runtime-smoke/adapters/task-540/operations/registry";

const root = path.resolve(import.meta.dir, "../../..");

function screenMaterializeInput(): PlainJsonObject {
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

test("TASK-540 schema-only handler executes as static typed code", async () => {
  const row = requireTask540OperationAlias("runtime/set-035-screen-create");
  const registry = createTask540OperationRegistry();
  const output = await registry.executeOneShot(
    task540OperationDescriptor(row),
    screenMaterializeInput()
  );
  expect(output).toMatchObject({
    contentTypeId: "00000000-0000-4000-8000-000000007529",
    name: "Task 540 Screen",
    schemaVersion: 4,
  });
  expect(output).toHaveProperty("definition.listView");
});

test("TASK-540 operation definitions reject unknown input fields and profile drift", async () => {
  const row = requireTask540OperationAlias("runtime/set-035-screen-create");
  const registry = createTask540OperationRegistry();
  await expect(
    registry.executeOneShot(task540OperationDescriptor(row), {
      ...screenMaterializeInput(),
      unexpected: true,
    })
  ).rejects.toThrow("unknown or missing fields");
  await expect(
    registry.executeOneShot(
      { ...task540OperationDescriptor(row), profileId: "database" },
      screenMaterializeInput()
    )
  ).rejects.toThrow("descriptor drifted");
  expect(() => registry.require("runtime/not-registered")).toThrow("not registered");
});

test("TASK-540 operation output validators fail closed for a malformed shared handler", async () => {
  const handlers = new Map(createTask540TypedHandlers());
  const row = requireTask540OperationAlias("runtime/set-035-screen-create");
  const original = requireTask540TypedHandler(handlers, row.handlerId);
  handlers.set(
    row.handlerId,
    Object.freeze({
      ...original,
      async execute(): Promise<PlainJsonValue> {
        return Object.freeze({ schemaVersion: 4 });
      },
    })
  );
  const registry = createTask540OperationRegistry({}, undefined, handlers);
  await expect(
    registry.executeOneShot(task540OperationDescriptor(row), screenMaterializeInput())
  ).rejects.toThrow("unknown or missing fields");

  const mediaRow = requireTask540OperationAlias("media-row-key/absence");
  const mediaHandlers = new Map(createTask540TypedHandlers());
  const mediaHandler = requireTask540TypedHandler(mediaHandlers, mediaRow.handlerId);
  mediaHandlers.set(
    mediaRow.handlerId,
    Object.freeze({
      ...mediaHandler,
      async execute(): Promise<PlainJsonValue> {
        return Object.freeze({ absent: false, present: true, stage: "provenance" });
      },
    })
  );
  const mediaRegistry = createTask540OperationRegistry({}, undefined, mediaHandlers);
  const mediaId = "00000000-0000-4000-8000-000000007530";
  await expect(
    mediaRegistry.executeOneShot(task540OperationDescriptor(mediaRow), {
      identifier: [mediaId, `2026/08/${mediaId}.png`],
    })
  ).rejects.toThrow("media resource outcome drifted");
});

test("TASK-540 typed operation lane contains no executable-code transport", async () => {
  const operationRoot = path.join(root, "scripts/runtime-smoke/adapters/task-540/operations");
  const files = [
    "contracts.ts",
    "output-validators.ts",
    "aliases.ts",
    "registry.ts",
    "worker-entry.ts",
    "handlers/access-log.ts",
    "handlers/bootstrap.ts",
    "handlers/platform.ts",
    "handlers/resources.ts",
    "handlers/response-lost.ts",
    "handlers/user-preference.ts",
    "../persistent-bridge.ts",
    "../production-handlers.ts",
    "../worker-entry.ts",
    "../worker-operations.ts",
    "../suite/executor/operation-dispatch.ts",
    "../suite/runtime/bootstrap-restoration.ts",
    "../suite/runtime/operation-router.ts",
    "../suite/runtime/worker-phases.ts",
  ];
  const combined = (
    await Promise.all(files.map((file) => readFile(path.join(operationRoot, file), "utf8")))
  ).join("\n");
  for (const forbidden of [
    "new Blob(",
    "URL.createObjectURL",
    "eval(",
    "new Function(",
    "Bun.stdin",
    "Bun.stdout",
    "descriptor.source",
  ]) {
    expect(combined).not.toContain(forbidden);
  }
  for (const retired of ["source-compiler.ts", "source-executor.ts"]) {
    await expect(access(path.join(operationRoot, "..", retired))).rejects.toThrow();
  }
});

test("TASK-540 production SEO cleanup accepts the contract's dynamic cardinality", async () => {
  const source = await readFile(
    path.join(root, "scripts/runtime-smoke/adapters/task-540/production-handlers.ts"),
    "utf8"
  );
  expect(source).toContain("task540CleanupCardinality(resources.length)");
  expect(source).not.toContain("resources.length !== 6");
  expect(source).not.toContain("must own six rows");
});

import { expect, test } from "bun:test";
import path from "node:path";
import { RuntimeLifecycle } from "../../../scripts/runtime-smoke/lifecycle";
import { ProcessSupervisor } from "../../../scripts/runtime-smoke/process-supervisor";
import type { PlainJsonObject } from "../../../scripts/runtime-smoke/workers/contracts";
import {
  Task540PersistentBridge,
  task540PersistentFailureToken,
  type PersistentBunBridgeDispatch,
} from "../../../scripts/runtime-smoke/adapters/task-540/persistent-bridge";
import { TASK540_SOURCE_CATALOG } from "../../../scripts/runtime-smoke/adapters/task-540/source-catalog";

const root = path.resolve(import.meta.dir, "../../..");

test("TASK-540 persistent failure diagnostics expose only a bounded catalog token", () => {
  expect(task540PersistentFailureToken("response-lost/query/set-012-user-a-create")).toBe(
    "wf540_worker_response_lost_query_set_012_user_a_create"
  );
  expect(task540PersistentFailureToken(`runtime/${"a".repeat(100)}`)).toMatch(
    /^wf540_worker_[a-z0-9_]{1,50}$/u
  );
  expect(() => task540PersistentFailureToken("///")).toThrow("operation ID is invalid");
});

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

test("TASK-540 bridge keeps one profile worker and uninstalls it through shared lifecycle", async () => {
  const lifecycle = new RuntimeLifecycle();
  const processes = new ProcessSupervisor(root);
  lifecycle.register(processes);
  let dispatcher: ((dispatch: PersistentBunBridgeDispatch) => Promise<unknown>) | null = null;
  let uninstalled = false;
  const bridge = await Task540PersistentBridge.create({
    root,
    processes,
    lifecycle,
    install(installed) {
      expect(dispatcher).toBeNull();
      dispatcher = installed;
      return () => {
        dispatcher = null;
        uninstalled = true;
      };
    },
  });
  const entry = TASK540_SOURCE_CATALOG.require("runtime/set-035-screen-create");
  const descriptor = {
    envProfileId: entry.profileId,
    operationId: "runtime/set-035-screen-create",
    source: entry.source,
    sourceSha256: entry.sourceSha256,
  };
  let boundaries = 0;
  const dispatch = dispatcher as
    ((dispatch: PersistentBunBridgeDispatch) => Promise<unknown>) | null;
  if (dispatch === null) throw new Error("persistent dispatcher was not installed");
  for (let index = 0; index < 2; index += 1) {
    const output = await dispatch({
      descriptor,
      environment: { PATH: process.env.PATH ?? "" },
      executablePath: process.execPath,
      executionBoundaryObserver: () => {
        boundaries += 1;
      },
      input: screenMaterializeInput(),
      rootPath: root,
    });
    expect(output).toMatchObject({ schemaVersion: 4 });
  }
  expect(bridge.counters()).toMatchObject({ starts: 1, requests: 2, reconnects: 0 });
  expect(boundaries).toBe(2);
  expect(await lifecycle.closeAllNeverThrow()).toEqual({ pass: true, failures: [] });
  expect(uninstalled).toBe(true);
  expect(dispatcher).toBeNull();
});

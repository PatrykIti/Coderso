import type { PlainJsonObject, PlainJsonValue } from "../../../../workers/contracts";
import type { Task540NativeAction } from "../composition/contracts";
import type { Task540RuntimeState } from "./contracts";
import {
  assertRecordFields,
  capture,
  deepJsonEqual,
  fixtureObject,
  runtimeInvariant,
  runtimeObject,
  runtimeSafeProjection,
} from "./native-utils";

function bootstrap(state: Task540RuntimeState) {
  return state.sessions.require("bootstrap");
}

function screenRoute(state: Task540RuntimeState): string {
  return `/custom-screens/${encodeURIComponent(capture(state.memory.captures, "screen.id"))}`;
}

function currentScreenRevision(screen: PlainJsonObject, label: string): number {
  const revision = screen.revision;
  runtimeInvariant(
    typeof revision === "number" && Number.isSafeInteger(revision) && revision >= 1,
    `${label} revision is invalid`
  );
  return revision;
}

async function patchScreenDefinition(
  state: Task540RuntimeState,
  definition: PlainJsonObject,
  expectedRevision: number,
  label: string
): Promise<PlainJsonObject> {
  const response = await bootstrap(state).request("PATCH", screenRoute(state), {
    json: { schemaVersion: 4, definition, expectedRevision },
  });
  const saved = runtimeObject(response.value, `${label} save`);
  runtimeInvariant(
    deepJsonEqual(
      runtimeObject(saved.definition, `${label} saved definition`) as PlainJsonValue,
      definition as PlainJsonValue
    ),
    `${label} definition drifted`
  );
  runtimeInvariant(saved.revision === expectedRevision + 1, `${label} revision drifted`);
  return saved;
}

function entryRoute(state: Task540RuntimeState): string {
  const type = fixtureObject(
    state.plan.fixtureBlueprint,
    ["contentTypes", "editable"],
    "TASK-540 editable type"
  );
  return `/content/${encodeURIComponent(String(type.slug))}/entries/${encodeURIComponent(
    capture(state.memory.captures, "entry.id")
  )}`;
}

function overrideRoute(state: Task540RuntimeState, retry = false): string {
  const screenId = capture(state.memory.captures, retry ? "retry-screen.id" : "screen.id");
  const entryId = capture(state.memory.captures, "entry.id");
  return `/custom-screens/${encodeURIComponent(screenId)}/entries/${encodeURIComponent(
    entryId
  )}/overrides`;
}

function exactOverrides(value: unknown): readonly PlainJsonObject[] {
  const object = runtimeObject(value, "TASK-540 override response");
  runtimeInvariant(Array.isArray(object.overrides), "TASK-540 override rows are invalid");
  return Object.freeze(object.overrides.map((row) => runtimeObject(row, "TASK-540 override row")));
}

async function replaceOverrides(state: Task540RuntimeState, empty: boolean) {
  const blockIds = fixtureObject(
    state.plan.fixtureBlueprint,
    ["screen", "blockIds"],
    "TASK-540 Screen block IDs"
  );
  const overrides = empty
    ? Object.freeze([])
    : Object.freeze([
        Object.freeze({
          blockId: blockIds.raceImage as string,
          propPath: "mediaAssetId",
          value: capture(state.memory.captures, "media.id"),
        }),
      ]);
  const response = await bootstrap(state).request("PATCH", overrideRoute(state), {
    json: { overrides },
  });
  const returned = exactOverrides(response.value).map(({ blockId, propPath, value }) => ({
    blockId,
    propPath,
    value,
  }));
  runtimeInvariant(
    deepJsonEqual(returned as PlainJsonValue, overrides as PlainJsonValue),
    "TASK-540 override replacement drifted"
  );
  state.expectedOverrides = overrides;
  return runtimeSafeProjection({ count: overrides.length });
}

async function proveOverrides(state: Task540RuntimeState, empty: boolean) {
  const response = await bootstrap(state).request("GET", overrideRoute(state), { csrf: false });
  const returned = exactOverrides(response.value).map(({ blockId, propPath, value }) => ({
    blockId,
    propPath,
    value,
  }));
  runtimeInvariant(
    deepJsonEqual(returned as PlainJsonValue, state.expectedOverrides as PlainJsonValue) &&
      (empty ? returned.length === 0 : returned.length === 1),
    "TASK-540 override proof drifted"
  );
  if (!empty) {
    const retry = await bootstrap(state).request("GET", overrideRoute(state, true), {
      csrf: false,
    });
    runtimeInvariant(
      exactOverrides(retry.value).length === 0,
      "TASK-540 retry Screen owns an override"
    );
  }
  return runtimeSafeProjection({ count: returned.length });
}

async function patchUnsafeBinding(state: Task540RuntimeState) {
  const current = await bootstrap(state).request("GET", screenRoute(state), { csrf: false });
  const screen = runtimeObject(current.value, "TASK-540 unsafe Screen");
  const expectedRevision = currentScreenRevision(screen, "TASK-540 unsafe Screen");
  const definition = structuredClone(
    runtimeObject(screen.definition, "TASK-540 unsafe definition")
  );
  const editor = runtimeObject(definition.editorView, "TASK-540 unsafe editor view");
  runtimeInvariant(Array.isArray(editor.bindings), "TASK-540 unsafe bindings are invalid");
  const buttonId = capture(state.memory.captures, "palette.button");
  let changed = 0;
  const bindings = editor.bindings.map((value) => {
    const binding = runtimeObject(value, "TASK-540 unsafe binding");
    if (binding.blockId === buttonId && binding.propPath === "href") {
      changed += 1;
      return { ...binding, field: "secondaryUrl" };
    }
    return binding;
  });
  runtimeInvariant(changed === 1, "TASK-540 unsafe binding target drifted");
  const patchedDefinition = { ...definition, editorView: { ...editor, bindings } };
  await patchScreenDefinition(state, patchedDefinition, expectedRevision, "TASK-540 unsafe Screen");
  return runtimeSafeProjection({ changed });
}

async function proveUnsafeBinding(state: Task540RuntimeState) {
  const current = await bootstrap(state).request("GET", screenRoute(state), { csrf: false });
  const definition = runtimeObject(
    runtimeObject(current.value, "TASK-540 unsafe Screen").definition,
    "TASK-540 unsafe definition"
  );
  const editor = runtimeObject(definition.editorView, "TASK-540 unsafe editor view");
  runtimeInvariant(Array.isArray(editor.bindings), "TASK-540 unsafe bindings are invalid");
  const buttonId = capture(state.memory.captures, "palette.button");
  const matching = editor.bindings.filter((value) => {
    const binding = runtimeObject(value, "TASK-540 unsafe binding");
    return (
      binding.blockId === buttonId &&
      binding.propPath === "href" &&
      binding.field === "secondaryUrl"
    );
  });
  runtimeInvariant(matching.length === 1, "TASK-540 unsafe binding proof drifted");
  return runtimeSafeProjection({ bindingCount: 1, field: "secondaryUrl" });
}

async function resetScreen(state: Task540RuntimeState) {
  const body = state.screenBodies.get("main");
  runtimeInvariant(body !== undefined, "TASK-540 Screen baseline is absent");
  const definition = runtimeObject(body.definition, "TASK-540 Screen baseline definition");
  const current = await bootstrap(state).request("GET", screenRoute(state), { csrf: false });
  const expectedRevision = currentScreenRevision(
    runtimeObject(current.value, "TASK-540 Screen reset"),
    "TASK-540 Screen reset"
  );
  await patchScreenDefinition(state, definition, expectedRevision, "TASK-540 Screen reset");
  return runtimeSafeProjection({ reset: true });
}

async function proveScreenBaseline(state: Task540RuntimeState) {
  const body = state.screenBodies.get("main");
  runtimeInvariant(body !== undefined, "TASK-540 Screen baseline is absent");
  const response = await bootstrap(state).request("GET", screenRoute(state), { csrf: false });
  runtimeInvariant(
    deepJsonEqual(
      runtimeObject(response.value, "TASK-540 Screen baseline proof").definition as PlainJsonValue,
      body.definition as PlainJsonValue
    ),
    "TASK-540 Screen baseline proof drifted"
  );
  return runtimeSafeProjection({ baseline: true });
}

async function resetEntry(state: Task540RuntimeState) {
  runtimeInvariant(state.editableEntryBody !== null, "TASK-540 entry baseline is absent");
  const response = await bootstrap(state).request("PATCH", entryRoute(state), {
    json: state.editableEntryBody,
  });
  assertRecordFields(
    response.value,
    { id: capture(state.memory.captures, "entry.id"), ...state.editableEntryBody },
    "TASK-540 entry reset"
  );
  return runtimeSafeProjection({ reset: true });
}

async function proveEntryBaseline(state: Task540RuntimeState) {
  runtimeInvariant(state.editableEntryBody !== null, "TASK-540 entry baseline is absent");
  const response = await bootstrap(state).request("GET", entryRoute(state), { csrf: false });
  assertRecordFields(
    response.value,
    { id: capture(state.memory.captures, "entry.id"), ...state.editableEntryBody },
    "TASK-540 entry baseline proof"
  );
  return runtimeSafeProjection({ baseline: true });
}

function isolatedExpectation(plan: Task540RuntimeState["plan"], actionId: string): boolean {
  const expectations = plan.requiredIsolatedApiReadExpectations;
  const keys = Object.keys(expectations).sort();
  runtimeInvariant(
    JSON.stringify(keys) ===
      JSON.stringify([
        "ru-047a-a-durable-proof",
        "ru-051-a-server-false-proof",
        "ru-061a-a-durable-bypass-read",
      ]) &&
      expectations["ru-047a-a-durable-proof"] === true &&
      expectations["ru-051-a-server-false-proof"] === false &&
      expectations["ru-061a-a-durable-bypass-read"] === false,
    "TASK-540 isolated API expectation authority drifted"
  );
  const expected = expectations[actionId];
  runtimeInvariant(typeof expected === "boolean", "TASK-540 isolated API action is unknown");
  return expected;
}

async function readUserAPreference(state: Task540RuntimeState, actionId: string) {
  const expected = isolatedExpectation(state.plan, actionId);
  const response = await state.sessions
    .require("user-a")
    .request("GET", "/user-settings/customScreens.entry.preferences", { csrf: false });
  const object = runtimeObject(response.value, "TASK-540 isolated preference response");
  const value = runtimeObject(object.value, "TASK-540 isolated preference value");
  runtimeInvariant(
    object.key === "customScreens.entry.preferences" &&
      value.version === 1 &&
      value.showFieldMetadata === expected,
    "TASK-540 isolated preference read drifted"
  );
  return runtimeSafeProjection({ showFieldMetadata: expected });
}

async function writeUserAPreferenceFalse(state: Task540RuntimeState) {
  const userId = capture(state.memory.captures, "user-a.id");
  const response = await state.sessions
    .require("user-a")
    .request("PATCH", "/user-settings/customScreens.entry.preferences", {
      expectedUserId: userId,
      json: { value: { version: 1, showFieldMetadata: false } },
    });
  const value = runtimeObject(
    runtimeObject(response.value, "TASK-540 isolated preference write").value,
    "TASK-540 isolated preference write value"
  );
  runtimeInvariant(value.showFieldMetadata === false, "TASK-540 isolated preference write drifted");
  return runtimeSafeProjection({ showFieldMetadata: false });
}

export async function executeTask540OverrideAction(
  state: Task540RuntimeState,
  action: Task540NativeAction
): Promise<PlainJsonValue | undefined> {
  switch (action.id) {
    case "set-039-override-create":
      return replaceOverrides(state, false);
    case "set-040-override-proof":
      return proveOverrides(state, false);
    case "bi-060-unsafe-patch":
      return patchUnsafeBinding(state);
    case "bi-061-unsafe-proof-read":
      return proveUnsafeBinding(state);
    case "bi-064-baseline-restore":
    case "ss-001-screen-reset":
    case "ru-001-screen-reset":
      return resetScreen(state);
    case "bi-065-baseline-proof":
    case "ss-002-screen-proof":
    case "ru-002-screen-proof":
      return proveScreenBaseline(state);
    case "tc-001-reset":
    case "ss-005-overrides-reset":
    case "rc-003-overrides-reset":
    case "ru-005-overrides-reset":
      return replaceOverrides(state, true);
    case "tc-002-reset-proof":
    case "ss-006-overrides-proof":
    case "rc-004-overrides-proof":
    case "ru-006-overrides-proof":
      return proveOverrides(state, true);
    case "ss-003-entry-reset":
    case "dg-001-entry-reset":
    case "rc-001-entry-reset":
    case "ru-003-entry-reset":
      return resetEntry(state);
    case "ss-004-entry-proof":
    case "dg-002-entry-proof":
    case "rc-002-entry-proof":
    case "ru-004-entry-proof":
      return proveEntryBaseline(state);
    case "ru-047a-a-durable-proof":
    case "ru-051-a-server-false-proof":
    case "ru-061a-a-durable-bypass-read":
      return readUserAPreference(state, action.id);
    case "ru-050-a-server-false":
      return writeUserAPreferenceFalse(state);
    default:
      return undefined;
  }
}

export function task540IsolatedReadExpectation(
  plan: Task540RuntimeState["plan"],
  actionId: string
): boolean {
  return isolatedExpectation(plan, actionId);
}

import { Script } from "node:vm";

import { BUN_BRIDGE_INPUT_VALIDATORS } from "../bridge-input-validators.mjs";
import { SingleAssignmentCaptureMap } from "../captures.mjs";
import { canonicalJson, deepFreezeExact, invariant } from "../foundation.mjs";
import { assertPlainJsonValue } from "../json-schema.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";
import { BRIDGE_INPUT_READER } from "../../runtime/bun-child-protocol.mjs";

export async function expectUncountedAsyncFailure(callback, label) {
  let failed = false;
  try {
    await callback();
  } catch {
    failed = true;
  }
  invariant(failed, label + " must fail closed");
}

export function selfTestStringSchema({
  minLength = 0,
  maxLength = 256,
  enumValues = null,
  format = null,
} = {}) {
  return {
    type: "string",
    minLength,
    maxLength,
    enum: enumValues,
    format,
  };
}

export function selfTestNumberSchema({ minimum = null, maximum = null } = {}) {
  return { type: "number", minimum, maximum };
}

export function selfTestContext(plan, actionId) {
  return {
    plan,
    captures: new SingleAssignmentCaptureMap(),
    priorOutputs: new Map(),
    variables: new Map(),
    currentOutput: null,
    root: "/task540-self-test-root",
    actionId,
  };
}

export function selfTestJsonTransport(jsonLayers = 1) {
  return {
    encoding: "json",
    jsonLayers,
    nativeMode: null,
    exactText: null,
    sessionName: null,
    normalizedValue: null,
  };
}

export function selfTestNativeTransport({
  nativeMode,
  exactText = null,
  sessionName = null,
  normalizedValue,
}) {
  return {
    encoding: "native",
    jsonLayers: 0,
    nativeMode,
    exactText,
    sessionName,
    normalizedValue,
  };
}

export function selfTestBunBridgeInputForSchema(schemaId) {
  const uuid = (ordinal) => `54000000-0000-4000-8000-${String(ordinal).padStart(12, "0")}`;
  const primaryId = uuid(7500);
  const roleId = uuid(7501);
  const timestamp = "2026-07-16T00:00:00.000Z";
  const bootstrap = {
    decryptEmailProof: true,
    emailHashProof: true,
    encryptedEmailProof: true,
    id: primaryId,
    lastLoginAt: null,
    normalizedEmailProof: true,
    rawUserRow: {
      createdAt: timestamp,
      email: "admin@example.test",
      emailEncrypted: "encrypted-email",
      emailHash: "a".repeat(64),
      id: primaryId,
      lastLoginAt: null,
      name: "Task 540 Admin",
      passwordHash: "private-hash",
      status: "active",
      updatedAt: timestamp,
    },
    roleTuples: [
      {
        roleCreatedAt: timestamp,
        roleDescription: null,
        roleId,
        roleName: "admin",
        rolePermissions: ["*"],
        userId: primaryId,
      },
    ],
    updatedAt: timestamp,
  };
  const fixtures = {
    "bootstrap-restore-input-v1": {
      baseline: bootstrap,
      newestOwnedPair: { lastLoginAt: timestamp, updatedAt: timestamp },
      userId: primaryId,
    },
    "email-input-v1": { email: "task-540@example.test" },
    "empty-input-v1": {},
    "entry-discovery-input-v1": { slug: "task-540-entry", typeId: uuid(7502) },
    "entry-preflight-input-v1": {
      entrySlug: "task-540-entry",
      typeSlug: "task-540-type",
    },
    "identifier-media-input-v1": {
      identifier: [uuid(7503), `2026/07/${uuid(7503)}.png`],
    },
    "identifier-override-input-v1": {
      identifier: [uuid(7504), uuid(7505), "task-540-block", "mediaAssetId"],
    },
    "identifier-seo-entry-input-v1": {
      identifier: [uuid(7533), "entry", uuid(7534)],
    },
    "identifier-setting-input-v1": {
      identifier: [uuid(7506), "customScreens.entry.preferences"],
    },
    "identifier-uuid-input-v1": { identifier: [uuid(7507)] },
    "media-id-input-v1": { mediaId: uuid(7508) },
    "media-natural-input-v1": {
      mimeType: "image/png",
      originalName: "task-540.png",
      size: 540,
    },
    "override-discovery-input-v1": {
      blockId: "task-540-block",
      entryId: uuid(7509),
      propPath: "mediaAssetId",
      screenId: uuid(7510),
    },
    "override-preflight-input-v1": {
      blockId: "task-540-block",
      contentTypeSlug: "task-540-type",
      entrySlug: "task-540-entry",
      propPath: "mediaAssetId",
      screenName: "Task 540 Screen",
    },
    "preference-write-input-v1": {
      showFieldMetadata: true,
      userId: uuid(7511),
    },
    "resource-owner-input-v2": {
      entryIds: Array.from({ length: 6 }, (_value, index) => uuid(7520 + index)),
      mediaId: uuid(7526),
      override: {
        blockId: "task-540-block",
        entryId: uuid(7520),
        propPath: "mediaAssetId",
        screenId: uuid(7527),
      },
      overrideExpectedPresent: true,
    },
    "seo-entry-targets-input-v1": {
      targetIds: Array.from({ length: 6 }, (_value, index) => uuid(7535 + index)),
    },
    "screen-discovery-input-v1": {
      contentTypeId: uuid(7528),
      name: "Task 540 Screen",
    },
    "screen-materialize-input-v1": {
      bodyWithoutDefinition: {
        contentTypeId: uuid(7529),
        name: "Task 540 Screen",
        showInSidebar: true,
        sidebarLabel: "Task 540",
        status: "active",
      },
      contentType: {
        id: uuid(7529),
        name: "Task 540 Type",
        schema: { type: "object" },
        slug: "task-540-type",
      },
      definitionWithoutListView: { editorView: {}, schemaVersion: 4 },
    },
    "screen-preflight-input-v1": {
      contentTypeSlug: "task-540-type",
      name: "Task 540 Screen",
    },
    "slug-input-v1": { slug: "task-540-type" },
    "user-agents-input-v1": {
      userAgents: Array.from(
        { length: 4 },
        (_value, index) => `TASK-540/self-test-bun-${index + 1}`
      ),
    },
    "user-id-input-v1": { userId: uuid(7530) },
    "user-identity-input-v1": {
      email: "task-540-user@example.test",
      userId: uuid(7531),
    },
    "user-provision-input-v1": {
      email: "task-540-user@example.test",
      name: "Task 540 User",
    },
    "user-session-observation-input-v1": {
      userAgent: "TASK-540/self-test-session",
      userId: uuid(7532),
    },
  };
  invariant(
    deepEqualJson(Object.keys(fixtures).sort(), Object.keys(BUN_BRIDGE_INPUT_VALIDATORS).sort()),
    "self-test Bun input fixture registry is not exhaustive"
  );
  invariant(
    Object.hasOwn(fixtures, schemaId),
    "self-test Bun input schema is unknown: " + schemaId
  );
  return deepFreezeExact(fixtures[schemaId]);
}

export async function selfTestExactBunChildInputSource(schemaId, input) {
  invariant(
    Object.hasOwn(BUN_BRIDGE_INPUT_VALIDATORS, schemaId),
    "self-test child Bun input schema is unknown: " + schemaId
  );
  assertPlainJsonValue(input, "self-test child Bun input");
  const runtimeFramingLine = "const raw = await new Response(Bun.stdin.stream()).text();\n";
  invariant(
    BRIDGE_INPUT_READER.startsWith(runtimeFramingLine),
    "Bun child input reader framing source drift"
  );
  const raw = canonicalJson(input) + "\n";
  const hermeticReader =
    "const raw = " +
    JSON.stringify(raw) +
    ";\n" +
    BRIDGE_INPUT_READER.slice(runtimeFramingLine.length);
  const program =
    "(async()=>{\n" +
    hermeticReader +
    "\nvalidateInput(" +
    JSON.stringify(schemaId) +
    ",input);\nreturn true;\n})()";
  const result = await new Script(program, {
    filename: "task-540-bun-child-" + schemaId + ".self-test.js",
  }).runInNewContext({ TextEncoder }, { timeout: 15_000 });
  invariant(result === true, schemaId + " child Bun input source did not return success");
  return input;
}

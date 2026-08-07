import { createHash } from "node:crypto";
import { assertExactKeys, isPlainObject } from "../../../contracts";
import {
  WorkerProtocolError,
  assertPlainJson,
  assertPlainJsonObject,
  assertSha256,
  assertWorkerToken,
  type PlainJsonObject,
  type PlainJsonValue,
  type WorkerOperationContext,
  type WorkerRetryClass,
} from "../../../workers/contracts";

export const TASK540_OPERATION_PROFILE_IDS = [
  "schema-only",
  "database",
  "bootstrap-preflight",
  "user-identity-proof",
  "user-provisioning",
] as const;

export type Task540OperationProfileId = (typeof TASK540_OPERATION_PROFILE_IDS)[number];

export const TASK540_INPUT_SCHEMA_IDS = [
  "bootstrap-restore-input-v1",
  "email-input-v1",
  "empty-input-v1",
  "entry-discovery-input-v1",
  "entry-preflight-input-v1",
  "identifier-media-input-v1",
  "identifier-override-input-v1",
  "identifier-seo-entry-input-v1",
  "identifier-setting-input-v1",
  "identifier-uuid-input-v1",
  "media-id-input-v1",
  "media-natural-input-v1",
  "override-discovery-input-v1",
  "override-preflight-input-v1",
  "preference-write-input-v1",
  "resource-owner-input-v2",
  "screen-discovery-input-v1",
  "screen-materialize-input-v1",
  "screen-preflight-input-v1",
  "seo-entry-targets-input-v1",
  "slug-input-v1",
  "user-agents-input-v1",
  "user-id-input-v1",
  "user-identity-input-v1",
  "user-provision-input-v1",
  "user-session-observation-input-v1",
] as const;

export type Task540InputSchemaId = (typeof TASK540_INPUT_SCHEMA_IDS)[number];

export const TASK540_OUTPUT_SCHEMA_IDS = [
  "api-session-observation-private-v1",
  "auth-rate-private-v1",
  "bootstrap-baseline-read-private-v1",
  "bootstrap-login-observation-private-v1",
  "bootstrap-restore-private-v2",
  "bounded-natural-candidates-v1",
  "content-routes-private-v1",
  "legacy-user-absence-private-v1",
  "legacy-user-delete-private-v1",
  "missing-media-row-count-v1",
  "preference-read-private-v1",
  "preference-write-private-v1",
  "resource-owner-private-v2",
  "screen-materialize-private-v1",
  "seo-entry-discovery-private-v1",
  "session-policy-private-v1",
  "storage-preflight-private-v2",
  "strict-resource-operation-v1",
  "task-traffic-complete-private-v2",
  "user-identity-private-v2",
  "user-provision-private-v2",
] as const;

export type Task540OutputSchemaId = (typeof TASK540_OUTPUT_SCHEMA_IDS)[number];

export const TASK540_OPERATION_CATEGORIES = [
  "canonical",
  "explicit-alias",
  "response-lost-alias",
  "resource-alias",
] as const;

export type Task540OperationCategory = (typeof TASK540_OPERATION_CATEGORIES)[number];

export interface Task540OperationParityRow {
  readonly operationId: string;
  readonly handlerId: string;
  readonly profileId: Task540OperationProfileId;
  readonly inputSchemaId: Task540InputSchemaId;
  readonly outputSchemaId: Task540OutputSchemaId;
  readonly retryClass: WorkerRetryClass;
  readonly handlerArtifactSha256: string;
  readonly category: Task540OperationCategory;
}

export type Task540OperationSeed = readonly [
  operationId: string,
  handlerId: string,
  profileId: Task540OperationProfileId,
  inputSchemaId: Task540InputSchemaId,
  outputSchemaId: Task540OutputSchemaId,
  retryClass: WorkerRetryClass,
  category: Task540OperationCategory,
];

export interface Task540TypedHandler {
  readonly handlerId: string;
  readonly handlerArtifactSha256: string;
  execute(input: PlainJsonObject, context: WorkerOperationContext): Promise<PlainJsonValue>;
}

export const TASK540_HANDLER_ARTIFACT_VERSION = "task-540-static-handler-v1";

export function task540HandlerArtifactSha256(handlerId: string): string {
  assertWorkerToken(handlerId, "TASK-540 handler ID");
  return createHash("sha256")
    .update(TASK540_HANDLER_ARTIFACT_VERSION)
    .update("\0")
    .update(handlerId)
    .digest("hex");
}

export function materializeTask540OperationSeed(
  seed: Task540OperationSeed
): Task540OperationParityRow {
  const [operationId, handlerId, profileId, inputSchemaId, outputSchemaId, retryClass, category] =
    seed;
  assertWorkerToken(operationId, "TASK-540 operation ID");
  assertWorkerToken(handlerId, "TASK-540 handler ID");
  if (
    !TASK540_OPERATION_PROFILE_IDS.includes(profileId) ||
    !TASK540_INPUT_SCHEMA_IDS.includes(inputSchemaId) ||
    !TASK540_OUTPUT_SCHEMA_IDS.includes(outputSchemaId) ||
    !TASK540_OPERATION_CATEGORIES.includes(category) ||
    !new Set<WorkerRetryClass>(["idempotent-read", "mutation"]).has(retryClass)
  ) {
    throw new WorkerProtocolError("TASK-540 operation seed is invalid");
  }
  const handlerArtifactSha256 = task540HandlerArtifactSha256(handlerId);
  assertSha256(handlerArtifactSha256, "TASK-540 handler artifact digest");
  return Object.freeze({
    operationId,
    handlerId,
    profileId,
    inputSchemaId,
    outputSchemaId,
    retryClass,
    handlerArtifactSha256,
    category,
  });
}

type JsonRecord = Readonly<Record<string, PlainJsonValue>>;

export type Task540InputFor<TSchema extends Task540InputSchemaId> = TSchema extends "empty-input-v1"
  ? Readonly<Record<never, never>>
  : TSchema extends "email-input-v1"
    ? Readonly<{ email: string }>
    : TSchema extends "slug-input-v1"
      ? Readonly<{ slug: string }>
      : TSchema extends "user-id-input-v1"
        ? Readonly<{ userId: string }>
        : TSchema extends "media-id-input-v1"
          ? Readonly<{ mediaId: string }>
          : TSchema extends "user-agents-input-v1"
            ? Readonly<{ userAgents: readonly string[] }>
            : TSchema extends "user-session-observation-input-v1"
              ? Readonly<{ userAgent: string; userId: string }>
              : TSchema extends "entry-discovery-input-v1"
                ? Readonly<{ slug: string; typeId: string }>
                : TSchema extends "entry-preflight-input-v1"
                  ? Readonly<{ entrySlug: string; typeSlug: string }>
                  : TSchema extends "media-natural-input-v1"
                    ? Readonly<{ mimeType: string; originalName: string; size: number }>
                    : TSchema extends "screen-discovery-input-v1"
                      ? Readonly<{ contentTypeId: string; name: string }>
                      : TSchema extends "screen-preflight-input-v1"
                        ? Readonly<{ contentTypeSlug: string; name: string }>
                        : TSchema extends "override-discovery-input-v1"
                          ? Readonly<{
                              blockId: string;
                              entryId: string;
                              propPath: "mediaAssetId";
                              screenId: string;
                            }>
                          : TSchema extends "override-preflight-input-v1"
                            ? Readonly<{
                                blockId: string;
                                contentTypeSlug: string;
                                entrySlug: string;
                                propPath: "mediaAssetId";
                                screenName: string;
                              }>
                            : TSchema extends "preference-write-input-v1"
                              ? Readonly<{ showFieldMetadata: boolean; userId: string }>
                              : TSchema extends "user-identity-input-v1"
                                ? Readonly<{ email: string; userId: string }>
                                : TSchema extends "user-provision-input-v1"
                                  ? Readonly<{ email: string; name: string }>
                                  : TSchema extends "seo-entry-targets-input-v1"
                                    ? Readonly<{ targetIds: readonly string[] }>
                                    : TSchema extends "identifier-uuid-input-v1"
                                      ? Readonly<{ identifier: readonly [string] }>
                                      : TSchema extends "identifier-media-input-v1"
                                        ? Readonly<{ identifier: readonly [string, string] }>
                                        : TSchema extends "identifier-setting-input-v1"
                                          ? Readonly<{
                                              identifier: readonly [string, string];
                                            }>
                                          : TSchema extends "identifier-seo-entry-input-v1"
                                            ? Readonly<{
                                                identifier: readonly [string, "entry", string];
                                              }>
                                            : TSchema extends "identifier-override-input-v1"
                                              ? Readonly<{
                                                  identifier: readonly [
                                                    string,
                                                    string,
                                                    string,
                                                    "mediaAssetId",
                                                  ];
                                                }>
                                              : TSchema extends "resource-owner-input-v2"
                                                ? Readonly<{
                                                    entryIds: readonly string[];
                                                    mediaId: string;
                                                    override: Readonly<{
                                                      blockId: string;
                                                      entryId: string;
                                                      propPath: "mediaAssetId";
                                                      screenId: string;
                                                    }>;
                                                    overrideExpectedPresent: boolean;
                                                  }>
                                                : TSchema extends "screen-materialize-input-v1"
                                                  ? Readonly<{
                                                      bodyWithoutDefinition: JsonRecord;
                                                      contentType: JsonRecord & {
                                                        readonly id: string;
                                                        readonly name: string;
                                                        readonly schema: JsonRecord;
                                                        readonly slug: string;
                                                      };
                                                      definitionWithoutListView: JsonRecord & {
                                                        readonly editorView: JsonRecord;
                                                        readonly schemaVersion: 4;
                                                      };
                                                    }>
                                                  : TSchema extends "bootstrap-restore-input-v1"
                                                    ? Readonly<{
                                                        baseline: JsonRecord & {
                                                          readonly id: string;
                                                          readonly rawUserRow: JsonRecord;
                                                          readonly roleTuples: readonly JsonRecord[];
                                                        };
                                                        newestOwnedPair: Readonly<{
                                                          lastLoginAt: string | null;
                                                          updatedAt: string;
                                                        }>;
                                                        userId: string;
                                                      }>
                                                    : never;

export function canonicalTask540Json(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((nested) => canonicalTask540Json(nested)).join(",")}]`;
  }
  const object = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalTask540Json(object[key])}`)
    .join(",")}}`;
}

function requireObject(value: unknown, label: string, keys: readonly string[]): PlainJsonObject {
  assertPlainJsonObject(value, label);
  assertExactKeys(value, keys, label);
  return value;
}

function requireString(value: unknown, label: string, maximum: number): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    Buffer.byteLength(value) > maximum ||
    value.includes("\0")
  ) {
    throw new WorkerProtocolError(`${label} is invalid`);
  }
  return value;
}

function requireUuid(value: unknown, label: string): string {
  const string = requireString(value, label, 64);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(string)) {
    throw new WorkerProtocolError(`${label} is invalid`);
  }
  return string;
}

function requireEmail(value: unknown): string {
  const email = requireString(value, "TASK-540 email", 320);
  if (email !== email.toLowerCase() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new WorkerProtocolError("TASK-540 email is not normalized");
  }
  return email;
}

function requireIdentifier(value: unknown, length: number): readonly PlainJsonValue[] {
  if (!Array.isArray(value) || value.length !== length) {
    throw new WorkerProtocolError("TASK-540 identifier tuple is invalid");
  }
  return value as readonly PlainJsonValue[];
}

function requireStringArray(value: unknown, label: string, length: number): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length !== length ||
    new Set(value).size !== length ||
    value.some((item) => typeof item !== "string" || item.length === 0)
  ) {
    throw new WorkerProtocolError(`${label} is invalid`);
  }
  return value as readonly string[];
}

function validateIdentifierInput(value: unknown, schemaId: Task540InputSchemaId): PlainJsonObject {
  const input = requireObject(value, "TASK-540 identifier input", ["identifier"]);
  const lengths: Partial<Record<Task540InputSchemaId, number>> = {
    "identifier-uuid-input-v1": 1,
    "identifier-media-input-v1": 2,
    "identifier-setting-input-v1": 2,
    "identifier-seo-entry-input-v1": 3,
    "identifier-override-input-v1": 4,
  };
  const length = lengths[schemaId];
  if (length === undefined) throw new WorkerProtocolError("TASK-540 identifier schema is invalid");
  const identifier = requireIdentifier(input.identifier, length);
  requireUuid(identifier[0], "TASK-540 identifier ID");
  if (schemaId === "identifier-media-input-v1") {
    const key = requireString(identifier[1], "TASK-540 storage key", 1024);
    if (!/^\d{4}\/(?:0[1-9]|1[0-2])\/[0-9a-f-]{36}\.png$/u.test(key)) {
      throw new WorkerProtocolError("TASK-540 storage key is invalid");
    }
  }
  if (schemaId === "identifier-setting-input-v1") {
    requireUuid(identifier[0], "TASK-540 setting user ID");
    if (identifier[1] !== "customScreens.entry.preferences") {
      throw new WorkerProtocolError("TASK-540 setting key is invalid");
    }
  }
  if (schemaId === "identifier-seo-entry-input-v1") {
    if (identifier[1] !== "entry") throw new WorkerProtocolError("TASK-540 SEO target is invalid");
    requireUuid(identifier[2], "TASK-540 SEO target ID");
  }
  if (schemaId === "identifier-override-input-v1") {
    requireUuid(identifier[1], "TASK-540 override entry ID");
    requireString(identifier[2], "TASK-540 override block ID", 256);
    if (identifier[3] !== "mediaAssetId") {
      throw new WorkerProtocolError("TASK-540 override property is invalid");
    }
  }
  return input;
}

function validateBootstrapRestoreInput(value: unknown): PlainJsonObject {
  const input = requireObject(value, "TASK-540 bootstrap restore input", [
    "baseline",
    "newestOwnedPair",
    "userId",
  ]);
  const baseline = requireObject(input.baseline, "TASK-540 bootstrap baseline", [
    "id",
    "rawUserRow",
    "roleTuples",
  ]);
  const pair = requireObject(input.newestOwnedPair, "TASK-540 newest login pair", [
    "lastLoginAt",
    "updatedAt",
  ]);
  const userId = requireUuid(input.userId, "TASK-540 bootstrap user ID");
  if (
    baseline.id !== userId ||
    !isPlainObject(baseline.rawUserRow) ||
    !Array.isArray(baseline.roleTuples)
  ) {
    throw new WorkerProtocolError("TASK-540 bootstrap baseline identity drifted");
  }
  for (const key of ["lastLoginAt", "updatedAt"] as const) {
    const candidate = pair[key];
    if (
      candidate !== null &&
      (typeof candidate !== "string" || new Date(candidate).toISOString() !== candidate)
    ) {
      throw new WorkerProtocolError("TASK-540 bootstrap timestamp is invalid");
    }
  }
  if (pair.updatedAt === null)
    throw new WorkerProtocolError("TASK-540 updated timestamp is absent");
  return input;
}

export function validateTask540OperationInput(
  schemaId: Task540InputSchemaId,
  value: unknown
): PlainJsonObject {
  if (schemaId.startsWith("identifier-")) return validateIdentifierInput(value, schemaId);
  if (schemaId === "bootstrap-restore-input-v1") return validateBootstrapRestoreInput(value);
  const keyMap: Readonly<Partial<Record<Task540InputSchemaId, readonly string[]>>> = {
    "email-input-v1": ["email"],
    "empty-input-v1": [],
    "entry-discovery-input-v1": ["slug", "typeId"],
    "entry-preflight-input-v1": ["entrySlug", "typeSlug"],
    "media-id-input-v1": ["mediaId"],
    "media-natural-input-v1": ["mimeType", "originalName", "size"],
    "override-discovery-input-v1": ["blockId", "entryId", "propPath", "screenId"],
    "override-preflight-input-v1": [
      "blockId",
      "contentTypeSlug",
      "entrySlug",
      "propPath",
      "screenName",
    ],
    "preference-write-input-v1": ["showFieldMetadata", "userId"],
    "resource-owner-input-v2": ["entryIds", "mediaId", "override", "overrideExpectedPresent"],
    "screen-discovery-input-v1": ["contentTypeId", "name"],
    "screen-materialize-input-v1": [
      "bodyWithoutDefinition",
      "contentType",
      "definitionWithoutListView",
    ],
    "screen-preflight-input-v1": ["contentTypeSlug", "name"],
    "seo-entry-targets-input-v1": ["targetIds"],
    "slug-input-v1": ["slug"],
    "user-agents-input-v1": ["userAgents"],
    "user-id-input-v1": ["userId"],
    "user-identity-input-v1": ["email", "userId"],
    "user-provision-input-v1": ["email", "name"],
    "user-session-observation-input-v1": ["userAgent", "userId"],
  };
  const inputKeys = keyMap[schemaId];
  if (inputKeys === undefined) throw new WorkerProtocolError("TASK-540 input schema is invalid");
  const input = requireObject(value, "TASK-540 operation input", inputKeys);
  switch (schemaId) {
    case "empty-input-v1":
      break;
    case "email-input-v1":
      requireEmail(input.email);
      break;
    case "slug-input-v1":
      requireString(input.slug, "TASK-540 slug", 256);
      break;
    case "user-id-input-v1":
      requireUuid(input.userId, "TASK-540 user ID");
      break;
    case "media-id-input-v1":
      requireUuid(input.mediaId, "TASK-540 media ID");
      break;
    case "user-agents-input-v1":
      requireStringArray(input.userAgents, "TASK-540 user agents", 4);
      break;
    case "user-session-observation-input-v1":
      requireUuid(input.userId, "TASK-540 session user ID");
      requireString(input.userAgent, "TASK-540 user agent", 512);
      break;
    case "entry-discovery-input-v1":
      requireString(input.slug, "TASK-540 entry slug", 256);
      requireUuid(input.typeId, "TASK-540 entry type ID");
      break;
    case "entry-preflight-input-v1":
      requireString(input.entrySlug, "TASK-540 entry slug", 256);
      requireString(input.typeSlug, "TASK-540 type slug", 256);
      break;
    case "media-natural-input-v1":
      requireString(input.mimeType, "TASK-540 MIME type", 128);
      requireString(input.originalName, "TASK-540 media filename", 512);
      if (!Number.isSafeInteger(input.size) || (input.size as number) <= 0) {
        throw new WorkerProtocolError("TASK-540 media size is invalid");
      }
      break;
    case "screen-discovery-input-v1":
      requireUuid(input.contentTypeId, "TASK-540 Screen content-type ID");
      requireString(input.name, "TASK-540 Screen name", 256);
      break;
    case "screen-preflight-input-v1":
      requireString(input.contentTypeSlug, "TASK-540 Screen content-type slug", 256);
      requireString(input.name, "TASK-540 Screen name", 256);
      break;
    case "override-discovery-input-v1":
      requireUuid(input.screenId, "TASK-540 override Screen ID");
      requireUuid(input.entryId, "TASK-540 override entry ID");
      requireString(input.blockId, "TASK-540 override block ID", 256);
      if (input.propPath !== "mediaAssetId")
        throw new WorkerProtocolError("TASK-540 override property is invalid");
      break;
    case "override-preflight-input-v1":
      for (const key of ["blockId", "contentTypeSlug", "entrySlug", "screenName"] as const) {
        requireString(input[key], `TASK-540 override ${key}`, 256);
      }
      if (input.propPath !== "mediaAssetId")
        throw new WorkerProtocolError("TASK-540 override property is invalid");
      break;
    case "preference-write-input-v1":
      requireUuid(input.userId, "TASK-540 preference user ID");
      if (typeof input.showFieldMetadata !== "boolean")
        throw new WorkerProtocolError("TASK-540 preference is invalid");
      break;
    case "user-identity-input-v1":
      requireEmail(input.email);
      requireUuid(input.userId, "TASK-540 identity user ID");
      break;
    case "user-provision-input-v1":
      requireEmail(input.email);
      requireString(input.name, "TASK-540 user name", 256);
      break;
    case "seo-entry-targets-input-v1":
      requireStringArray(input.targetIds, "TASK-540 SEO targets", 6).forEach((id) =>
        requireUuid(id, "TASK-540 SEO target ID")
      );
      break;
    case "resource-owner-input-v2": {
      requireStringArray(input.entryIds, "TASK-540 owner entries", 6).forEach((id) =>
        requireUuid(id, "TASK-540 owner entry ID")
      );
      requireUuid(input.mediaId, "TASK-540 owner media ID");
      const override = requireObject(input.override, "TASK-540 owner override", [
        "blockId",
        "entryId",
        "propPath",
        "screenId",
      ]);
      requireString(override.blockId, "TASK-540 owner block ID", 256);
      requireUuid(override.entryId, "TASK-540 owner entry ID");
      requireUuid(override.screenId, "TASK-540 owner Screen ID");
      if (
        override.propPath !== "mediaAssetId" ||
        typeof input.overrideExpectedPresent !== "boolean"
      ) {
        throw new WorkerProtocolError("TASK-540 owner override is invalid");
      }
      break;
    }
    case "screen-materialize-input-v1": {
      const body = requireObject(input.bodyWithoutDefinition, "TASK-540 Screen body", [
        "contentTypeId",
        "name",
        "showInSidebar",
        "sidebarLabel",
        "status",
      ]);
      const contentType = requireObject(input.contentType, "TASK-540 Screen content type", [
        "id",
        "name",
        "schema",
        "slug",
      ]);
      const definition = requireObject(
        input.definitionWithoutListView,
        "TASK-540 Screen definition",
        ["editorView", "schemaVersion"]
      );
      requireUuid(body.contentTypeId, "TASK-540 Screen body type ID");
      requireUuid(contentType.id, "TASK-540 Screen content-type ID");
      if (
        body.status !== "active" ||
        typeof body.showInSidebar !== "boolean" ||
        definition.schemaVersion !== 4 ||
        !isPlainObject(contentType.schema) ||
        !isPlainObject(definition.editorView)
      ) {
        throw new WorkerProtocolError("TASK-540 Screen input is invalid");
      }
      break;
    }
  }
  return input;
}

export { validateTask540OperationOutput } from "./output-validators";

import path from "node:path";
import { assertExactKeys, isPlainObject } from "../../../contracts";
import {
  WorkerProtocolError,
  assertPlainJson,
  assertPlainJsonObject,
  type PlainJsonObject,
  type PlainJsonValue,
} from "../../../workers/contracts";
import type { Task540OperationParityRow } from "./contracts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const STORAGE_KEY_PATTERN = /^\d{4}\/(?:0[1-9]|1[0-2])\/[0-9a-f-]{36}\.png$/u;

function requireObject(value: unknown, label: string, keys: readonly string[]): PlainJsonObject {
  assertPlainJsonObject(value, label);
  assertExactKeys(value, keys, label);
  return value;
}

function requireArray(
  value: PlainJsonValue | undefined,
  label: string,
  maximum = 4096
): readonly PlainJsonValue[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new WorkerProtocolError(`${label} is invalid`);
  }
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
  const candidate = requireString(value, label, 64);
  if (!UUID_PATTERN.test(candidate)) throw new WorkerProtocolError(`${label} is invalid`);
  return candidate;
}

function requireNullableUuid(value: unknown, label: string): void {
  if (value !== null) requireUuid(value, label);
}

function requireIsoTimestamp(value: unknown, label: string, nullable = false): void {
  if (nullable && value === null) return;
  if (typeof value !== "string") throw new WorkerProtocolError(`${label} is invalid`);
  try {
    if (new Date(value).toISOString() !== value) {
      throw new WorkerProtocolError(`${label} is invalid`);
    }
  } catch {
    throw new WorkerProtocolError(`${label} is invalid`);
  }
}

function requireBooleanProjection(
  value: unknown,
  key: string,
  expected?: boolean
): PlainJsonObject {
  const output = requireObject(value, "TASK-540 boolean output", [key]);
  if (typeof output[key] !== "boolean" || (expected !== undefined && output[key] !== expected)) {
    throw new WorkerProtocolError("TASK-540 boolean output drifted");
  }
  return output;
}

function requireUuidArray(
  value: PlainJsonValue | undefined,
  label: string,
  maximum = 4096
): readonly PlainJsonValue[] {
  const rows = requireArray(value, label, maximum);
  const ids = new Set<string>();
  for (const row of rows) ids.add(requireUuid(row, `${label} ID`));
  if (ids.size !== rows.length) throw new WorkerProtocolError(`${label} contains duplicate IDs`);
  return rows;
}

const RAW_USER_KEYS = [
  "createdAt",
  "email",
  "emailEncrypted",
  "emailHash",
  "id",
  "lastLoginAt",
  "name",
  "passwordHash",
  "status",
  "updatedAt",
] as const;

const ROLE_TUPLE_KEYS = [
  "roleCreatedAt",
  "roleDescription",
  "roleId",
  "roleName",
  "rolePermissions",
  "userId",
] as const;

function validateRawUser(value: unknown, expectedId: string | null): PlainJsonObject {
  const row = requireObject(value, "TASK-540 raw user row", RAW_USER_KEYS);
  const id = requireUuid(row.id, "TASK-540 raw user ID");
  if (expectedId !== null && id !== expectedId) {
    throw new WorkerProtocolError("TASK-540 raw user identity drifted");
  }
  requireString(row.email, "TASK-540 stored email", 512);
  requireString(row.emailHash, "TASK-540 email hash", 512);
  requireString(row.passwordHash, "TASK-540 password hash", 4096);
  requireString(row.name, "TASK-540 user name", 256);
  if (!new Set(["active", "inactive", "pending"]).has(String(row.status))) {
    throw new WorkerProtocolError("TASK-540 user status drifted");
  }
  if (!isPlainObject(row.emailEncrypted)) {
    throw new WorkerProtocolError("TASK-540 encrypted email projection drifted");
  }
  requireIsoTimestamp(row.createdAt, "TASK-540 user created timestamp");
  requireIsoTimestamp(row.updatedAt, "TASK-540 user updated timestamp");
  requireIsoTimestamp(row.lastLoginAt, "TASK-540 user login timestamp", true);
  return row;
}

function validateRoleTuples(value: PlainJsonValue | undefined, expectedUserId: string): void {
  const rows = requireArray(value, "TASK-540 role tuples", 1);
  if (rows.length !== 1) throw new WorkerProtocolError("TASK-540 role tuple cardinality drifted");
  const role = requireObject(rows[0], "TASK-540 role tuple", ROLE_TUPLE_KEYS);
  if (requireUuid(role.userId, "TASK-540 role user ID") !== expectedUserId) {
    throw new WorkerProtocolError("TASK-540 role user identity drifted");
  }
  requireUuid(role.roleId, "TASK-540 role ID");
  requireString(role.roleName, "TASK-540 role name", 128);
  requireIsoTimestamp(role.roleCreatedAt, "TASK-540 role created timestamp");
  requireArray(role.rolePermissions, "TASK-540 role permissions", 128);
  if (role.roleDescription !== null) {
    requireString(role.roleDescription, "TASK-540 role description", 4096);
  }
}

function validateBootstrapBaseline(value: unknown, input: PlainJsonObject | null): PlainJsonObject {
  const output = requireObject(value, "TASK-540 bootstrap baseline output", [
    "id",
    "rawUserRow",
    "roleTuples",
  ]);
  const id = requireUuid(output.id, "TASK-540 bootstrap output ID");
  if (input !== null && input.userId !== id) {
    throw new WorkerProtocolError("TASK-540 bootstrap output identity drifted");
  }
  validateRawUser(output.rawUserRow, id);
  validateRoleTuples(output.roleTuples, id);
  return output;
}

function validateBootstrapLogin(value: unknown, input: PlainJsonObject | null): PlainJsonObject {
  const output = requireObject(value, "TASK-540 bootstrap login output", [
    "auditIds",
    "id",
    "lastLoginAt",
    "rawUserRow",
    "roleTuples",
    "sessionIds",
    "updatedAt",
  ]);
  const id = requireUuid(output.id, "TASK-540 bootstrap login ID");
  if (input !== null && input.userId !== id) {
    throw new WorkerProtocolError("TASK-540 bootstrap login identity drifted");
  }
  const raw = validateRawUser(output.rawUserRow, id);
  if (output.lastLoginAt !== raw.lastLoginAt || output.updatedAt !== raw.updatedAt) {
    throw new WorkerProtocolError("TASK-540 bootstrap login timestamp correlation drifted");
  }
  validateRoleTuples(output.roleTuples, id);
  requireUuidArray(output.auditIds, "TASK-540 bootstrap audit IDs");
  requireUuidArray(output.sessionIds, "TASK-540 bootstrap session IDs");
  return output;
}

const RESTORE_PROOF_KEYS = [
  "afterCommitByteIdentical",
  "completeRowByteIdentical",
  "conditionalUpdateAffectedOne",
  "inTransactionByteIdentical",
  "restored",
  "roleTuplesByteIdentical",
  "rolesInTransactionByteIdentical",
  "rolesShareLocked",
  "transactionLocked",
] as const;

function validateBootstrapRestore(value: unknown): PlainJsonObject {
  const output = requireObject(value, "TASK-540 bootstrap restore output", [
    "kind",
    "proof",
    "reason",
  ]);
  const kind = output.kind;
  if (!new Set(["committed", "committed-proof-failed", "rolled-back"]).has(String(kind))) {
    throw new WorkerProtocolError("TASK-540 bootstrap restore kind drifted");
  }
  if (kind === "rolled-back") {
    if (
      output.proof !== null ||
      typeof output.reason !== "string" ||
      !output.reason.startsWith("wf540_bootstrap_cas_")
    ) {
      throw new WorkerProtocolError("TASK-540 bootstrap rollback projection drifted");
    }
    return output;
  }
  if (output.reason !== null)
    throw new WorkerProtocolError("TASK-540 committed restore has a reason");
  const proof = requireObject(output.proof, "TASK-540 bootstrap restore proof", RESTORE_PROOF_KEYS);
  if (RESTORE_PROOF_KEYS.some((key) => typeof proof[key] !== "boolean")) {
    throw new WorkerProtocolError("TASK-540 bootstrap restore proof drifted");
  }
  const transactionKeys = [
    "conditionalUpdateAffectedOne",
    "inTransactionByteIdentical",
    "rolesInTransactionByteIdentical",
    "rolesShareLocked",
    "transactionLocked",
  ] as const;
  if (
    transactionKeys.some((key) => proof[key] !== true) ||
    proof.completeRowByteIdentical !== proof.afterCommitByteIdentical ||
    (kind === "committed" && RESTORE_PROOF_KEYS.some((key) => proof[key] !== true)) ||
    (kind === "committed-proof-failed" &&
      (proof.restored !== false ||
        (proof.afterCommitByteIdentical !== false && proof.roleTuplesByteIdentical !== false)))
  ) {
    throw new WorkerProtocolError("TASK-540 bootstrap restore outcome drifted");
  }
  return output;
}

function validateContentRoutes(value: unknown): PlainJsonObject {
  const output = requireObject(value, "TASK-540 content routes output", [
    "exists",
    "updatedAt",
    "value",
  ]);
  if (
    typeof output.exists !== "boolean" ||
    (output.exists && output.updatedAt === null) ||
    (!output.exists && (output.updatedAt !== null || output.value !== null))
  ) {
    throw new WorkerProtocolError("TASK-540 content routes projection drifted");
  }
  requireIsoTimestamp(output.updatedAt, "TASK-540 content routes timestamp", !output.exists);
  return output;
}

function validateResourcePca(row: Task540OperationParityRow, value: unknown): PlainJsonObject {
  const output = requireObject(value, "TASK-540 resource P/C/A output", [
    "absent",
    "affected",
    "present",
  ]);
  if (
    typeof output.absent !== "boolean" ||
    typeof output.present !== "boolean" ||
    !Number.isSafeInteger(output.affected)
  ) {
    throw new WorkerProtocolError("TASK-540 resource P/C/A scalar drifted");
  }
  const slot = row.handlerId.split("/").at(-1);
  const expected =
    slot === "provenance"
      ? { absent: false, affected: 0, present: true }
      : slot === "delete"
        ? { absent: true, affected: 1, present: true }
        : slot === "absence"
          ? { absent: true, affected: 0, present: false }
          : null;
  if (
    expected === null ||
    output.absent !== expected.absent ||
    output.affected !== expected.affected ||
    output.present !== expected.present
  ) {
    throw new WorkerProtocolError("TASK-540 resource P/C/A outcome drifted");
  }
  return output;
}

function validateMediaResource(row: Task540OperationParityRow, value: unknown): PlainJsonObject {
  const output = requireObject(value, "TASK-540 media resource output", [
    "absent",
    "present",
    "stage",
  ]);
  const slot = row.handlerId.split("/").at(-1);
  if (
    !new Set(["provenance", "delete", "absence"]).has(String(slot)) ||
    output.stage !== slot ||
    output.present !== (slot === "provenance") ||
    output.absent !== (slot !== "provenance")
  ) {
    throw new WorkerProtocolError("TASK-540 media resource outcome drifted");
  }
  return output;
}

function validateStrictResource(
  row: Task540OperationParityRow,
  input: PlainJsonObject | null,
  value: unknown
): PlainJsonValue {
  if (row.handlerId === "source/bootstrap/cas-restore") return validateBootstrapRestore(value);
  if (row.handlerId === "source/bootstrap/login-observation") {
    return validateBootstrapLogin(value, input);
  }
  if (row.handlerId === "source/platform/content-routes-exact") {
    return validateContentRoutes(value);
  }
  if (row.handlerId === "source/platform/missing-media-db-absence") {
    const output = requireObject(value, "TASK-540 missing media absence", ["rowCount"]);
    if (output.rowCount !== 0) throw new WorkerProtocolError("TASK-540 media row remains present");
    return output;
  }
  if (row.handlerId === "source/platform/storage-preflight") {
    return validateStoragePreflight(value);
  }
  if (row.handlerId.startsWith("source/resource/media/")) {
    return validateMediaResource(row, value);
  }
  if (
    row.handlerId === "source/resource/content-entry-provenance" ||
    row.handlerId === "source/resource/content-type-provenance" ||
    row.handlerId === "source/resource/custom-screen-provenance"
  ) {
    return requireBooleanProjection(value, "present", true);
  }
  if (
    /^source\/resource\/(?:access-log|audit-log|override|seo|session|setting|user)\//u.test(
      row.handlerId
    )
  ) {
    return validateResourcePca(row, value);
  }
  throw new WorkerProtocolError("TASK-540 strict resource handler is not registered");
}

const CANDIDATE_KEYS = Object.freeze({
  user: [
    "adminRoleTupleCount",
    "adminWildcardPermissionCount",
    "id",
    "name",
    "normalizedEmailMatches",
    "passwordHashPresent",
    "status",
  ],
  contentType: ["config", "id", "name", "schema", "slug", "status"],
  entry: [
    "accessPasswordAbsent",
    "authorId",
    "data",
    "id",
    "publishedAt",
    "scheduledAt",
    "slug",
    "status",
    "tags",
    "title",
    "typeId",
    "visibility",
  ],
  screen: [
    "collectionRole",
    "compositionKey",
    "contentTypeId",
    "definition",
    "id",
    "name",
    "schemaVersion",
    "showInSidebar",
    "sidebarLabel",
    "status",
  ],
  media: [
    "alt",
    "caption",
    "createdBy",
    "credit",
    "description",
    "focalX",
    "focalY",
    "folderId",
    "height",
    "id",
    "key",
    "mimeType",
    "originalName",
    "size",
    "tags",
    "title",
    "type",
    "url",
    "width",
  ],
  override: ["blockId", "entryId", "propPath", "screenId", "updatedBy", "value"],
  setting: ["key", "userId", "value"],
});

type CandidateFamily = keyof typeof CANDIDATE_KEYS;

function candidateFamily(handlerId: string): CandidateFamily {
  const suffix = handlerId.replace("source/response-lost/", "");
  if (suffix === "content-type") return "contentType";
  if (suffix === "entry" || suffix === "entry-preflight") return "entry";
  if (suffix === "screen" || suffix === "screen-preflight") return "screen";
  if (suffix === "override" || suffix === "override-preflight") return "override";
  if (suffix === "setting" || suffix === "setting-preflight") return "setting";
  if (new Set(["user", "media"]).has(suffix)) return suffix as "user" | "media";
  throw new WorkerProtocolError("TASK-540 candidate handler is not registered");
}

function validateCandidate(
  family: CandidateFamily,
  input: PlainJsonObject | null,
  candidateValue: PlainJsonValue
): void {
  const candidate = requireObject(
    candidateValue,
    `TASK-540 ${family} candidate`,
    CANDIDATE_KEYS[family]
  );
  requireUuid(candidate.id ?? candidate.userId ?? candidate.screenId, `TASK-540 ${family} ID`);
  if (family === "user") {
    if (
      !Number.isSafeInteger(candidate.adminRoleTupleCount) ||
      !Number.isSafeInteger(candidate.adminWildcardPermissionCount) ||
      candidate.adminRoleTupleCount !== candidate.adminWildcardPermissionCount ||
      typeof candidate.normalizedEmailMatches !== "boolean" ||
      typeof candidate.passwordHashPresent !== "boolean" ||
      !new Set(["active", "inactive", "pending"]).has(String(candidate.status))
    ) {
      throw new WorkerProtocolError("TASK-540 user candidate drifted");
    }
    return;
  }
  if (family === "contentType") {
    const slug = requireString(candidate.slug, "TASK-540 content-type slug", 256);
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) ||
      (input?.slug !== undefined && input.slug !== slug) ||
      !new Set(["draft", "published"]).has(String(candidate.status)) ||
      !isPlainObject(candidate.schema) ||
      !isPlainObject(candidate.config)
    ) {
      throw new WorkerProtocolError("TASK-540 content-type candidate drifted");
    }
    return;
  }
  if (family === "entry") {
    requireUuid(candidate.typeId, "TASK-540 entry type ID");
    requireNullableUuid(candidate.authorId, "TASK-540 entry author ID");
    const expectedSlug = input?.slug ?? input?.entrySlug;
    if (
      (expectedSlug !== undefined && candidate.slug !== expectedSlug) ||
      (input?.typeId !== undefined && candidate.typeId !== input.typeId) ||
      !isPlainObject(candidate.data) ||
      !Array.isArray(candidate.tags) ||
      typeof candidate.accessPasswordAbsent !== "boolean"
    ) {
      throw new WorkerProtocolError("TASK-540 entry candidate drifted");
    }
    requireIsoTimestamp(candidate.publishedAt, "TASK-540 entry published timestamp", true);
    requireIsoTimestamp(candidate.scheduledAt, "TASK-540 entry scheduled timestamp", true);
    return;
  }
  if (family === "screen") {
    requireUuid(candidate.contentTypeId, "TASK-540 Screen content-type ID");
    if (
      (input?.name !== undefined && candidate.name !== input.name) ||
      (input?.contentTypeId !== undefined && candidate.contentTypeId !== input.contentTypeId) ||
      candidate.schemaVersion !== 4 ||
      typeof candidate.showInSidebar !== "boolean" ||
      !isPlainObject(candidate.definition)
    ) {
      throw new WorkerProtocolError("TASK-540 Screen candidate drifted");
    }
    return;
  }
  if (family === "media") {
    const key = requireString(candidate.key, "TASK-540 media storage key", 1024);
    if (
      !STORAGE_KEY_PATTERN.test(key) ||
      candidate.url !== `/media/${key}` ||
      (input?.originalName !== undefined && candidate.originalName !== input.originalName) ||
      (input?.mimeType !== undefined && candidate.mimeType !== input.mimeType) ||
      (input?.size !== undefined && candidate.size !== input.size) ||
      !Number.isSafeInteger(candidate.size) ||
      (candidate.size as number) <= 0
    ) {
      throw new WorkerProtocolError("TASK-540 media candidate drifted");
    }
    return;
  }
  if (family === "override") {
    requireUuid(candidate.entryId, "TASK-540 override entry ID");
    requireUuid(candidate.screenId, "TASK-540 override Screen ID");
    requireUuid(candidate.value, "TASK-540 override media ID");
    if (
      (input?.blockId !== undefined && candidate.blockId !== input.blockId) ||
      (input?.propPath !== undefined && candidate.propPath !== input.propPath) ||
      (input?.entryId !== undefined && candidate.entryId !== input.entryId) ||
      (input?.screenId !== undefined && candidate.screenId !== input.screenId)
    ) {
      throw new WorkerProtocolError("TASK-540 override candidate drifted");
    }
    return;
  }
  const setting = requireObject(candidate.value, "TASK-540 preference candidate", [
    "showFieldMetadata",
    "version",
  ]);
  if (
    candidate.key !== "customScreens.entry.preferences" ||
    (input?.userId !== undefined && candidate.userId !== input.userId) ||
    setting.version !== 1 ||
    typeof setting.showFieldMetadata !== "boolean"
  ) {
    throw new WorkerProtocolError("TASK-540 setting candidate drifted");
  }
}

function validateCandidates(
  row: Task540OperationParityRow,
  input: PlainJsonObject | null,
  value: unknown
): PlainJsonObject {
  const output = requireObject(value, "TASK-540 candidate output", ["candidates", "overflow"]);
  const candidates = requireArray(output.candidates, "TASK-540 candidates", 64);
  if (typeof output.overflow !== "boolean") {
    throw new WorkerProtocolError("TASK-540 candidate overflow drifted");
  }
  const family = candidateFamily(row.handlerId);
  for (const candidate of candidates) validateCandidate(family, input, candidate);
  return output;
}

function validateStoragePreflight(value: unknown): PlainJsonObject {
  const output = requireObject(value, "TASK-540 storage preflight output", [
    "bootstrap",
    "contentRoutes",
    "local",
    "requiredSettings",
    "setupComplete",
    "storageRoot",
    "taskTrafficBaseline",
  ]);
  if (
    output.local !== true ||
    output.setupComplete !== true ||
    typeof output.storageRoot !== "string" ||
    !path.isAbsolute(output.storageRoot)
  ) {
    throw new WorkerProtocolError("TASK-540 storage preflight scalar drifted");
  }
  validateContentRoutes(output.contentRoutes);
  const settings = requireObject(output.requiredSettings, "TASK-540 required settings", [
    "driver",
    "localDir",
    "setup",
  ]);
  const expected = {
    driver: ["storage.driver", "local"],
    localDir: ["storage.local.dir", null],
    setup: ["setup.completed", true],
  } as const;
  for (const name of Object.keys(expected) as (keyof typeof expected)[]) {
    const setting = requireObject(settings[name], `TASK-540 ${name} setting`, [
      "key",
      "updatedAt",
      "value",
    ]);
    const [expectedKey, expectedValue] = expected[name];
    if (
      setting.key !== expectedKey ||
      (expectedValue === null
        ? typeof setting.value !== "string" || setting.value.length === 0
        : setting.value !== expectedValue)
    ) {
      throw new WorkerProtocolError(`TASK-540 ${name} setting drifted`);
    }
    requireIsoTimestamp(setting.updatedAt, `TASK-540 ${name} timestamp`);
  }
  const bootstrap = requireObject(output.bootstrap, "TASK-540 storage bootstrap", [
    "decryptEmailProof",
    "emailHashProof",
    "encryptedEmailProof",
    "id",
    "lastLoginAt",
    "normalizedEmailProof",
    "rawUserRow",
    "roleTuples",
    "updatedAt",
  ]);
  const bootstrapId = requireUuid(bootstrap.id, "TASK-540 storage bootstrap ID");
  if (
    ["decryptEmailProof", "emailHashProof", "encryptedEmailProof", "normalizedEmailProof"].some(
      (key) => bootstrap[key] !== true
    )
  ) {
    throw new WorkerProtocolError("TASK-540 storage bootstrap identity proof drifted");
  }
  const raw = validateRawUser(bootstrap.rawUserRow, bootstrapId);
  if (bootstrap.lastLoginAt !== raw.lastLoginAt || bootstrap.updatedAt !== raw.updatedAt) {
    throw new WorkerProtocolError("TASK-540 storage bootstrap timestamp drifted");
  }
  validateRoleTuples(bootstrap.roleTuples, bootstrapId);
  const traffic = requireObject(output.taskTrafficBaseline, "TASK-540 task traffic baseline", [
    "accessIds",
    "auditIds",
    "sessionIds",
  ]);
  requireUuidArray(traffic.accessIds, "TASK-540 baseline access IDs");
  requireUuidArray(traffic.auditIds, "TASK-540 baseline audit IDs");
  requireUuidArray(traffic.sessionIds, "TASK-540 baseline session IDs");
  return output;
}

function validateResourceOwner(value: unknown, input: PlainJsonObject | null): PlainJsonObject {
  const output = requireObject(value, "TASK-540 owner output", [
    "entries",
    "media",
    "override",
    "overrideAbsent",
  ]);
  const entries = requireArray(output.entries, "TASK-540 owner entries", 6);
  if (entries.length !== 6) throw new WorkerProtocolError("TASK-540 owner entry count drifted");
  for (const entryValue of entries) {
    const entry = requireObject(entryValue, "TASK-540 owner entry", [
      "id",
      "ownerSubjectIdentifier",
    ]);
    requireUuid(entry.id, "TASK-540 owner entry ID");
    requireNullableUuid(entry.ownerSubjectIdentifier, "TASK-540 entry owner ID");
  }
  const media = requireObject(output.media, "TASK-540 owner media", [
    "id",
    "ownerSubjectIdentifier",
  ]);
  if (input !== null && media.id !== input.mediaId) {
    throw new WorkerProtocolError("TASK-540 owner media drifted");
  }
  requireUuid(media.id, "TASK-540 owner media ID");
  requireNullableUuid(media.ownerSubjectIdentifier, "TASK-540 media owner ID");
  if (
    typeof output.overrideAbsent !== "boolean" ||
    (input !== null && output.overrideAbsent !== !input.overrideExpectedPresent)
  ) {
    throw new WorkerProtocolError("TASK-540 override owner absence drifted");
  }
  if (output.overrideAbsent === false) {
    const override = requireObject(output.override, "TASK-540 override owner", [
      "ownerSubjectIdentifier",
    ]);
    requireNullableUuid(override.ownerSubjectIdentifier, "TASK-540 override owner ID");
  } else if (output.override !== null) {
    throw new WorkerProtocolError("TASK-540 absent override owner drifted");
  }
  return output;
}

function validateTaskTraffic(value: unknown): PlainJsonObject {
  const output = requireObject(value, "TASK-540 task traffic output", [
    "access",
    "audit",
    "completeSession",
    "session",
  ]);
  const keys = {
    access: ["id", "sessionId", "userAgent", "userId"],
    audit: ["actorId", "id", "userAgent"],
    completeSession: ["id", "userAgent", "userId"],
    session: ["id", "userAgent", "userId"],
  } as const;
  for (const name of Object.keys(keys) as (keyof typeof keys)[]) {
    for (const rowValue of requireArray(output[name], `TASK-540 ${name} rows`)) {
      const row = requireObject(rowValue, `TASK-540 ${name} row`, keys[name]);
      requireUuid(row.id, `TASK-540 ${name} ID`);
      if (name === "access") {
        requireNullableUuid(row.sessionId, "TASK-540 access session ID");
        requireNullableUuid(row.userId, "TASK-540 access user ID");
      } else if (name === "audit") {
        requireNullableUuid(row.actorId, "TASK-540 audit actor ID");
      } else {
        requireUuid(row.userId, `TASK-540 ${name} user ID`);
      }
      if (row.userAgent !== null) requireString(row.userAgent, `TASK-540 ${name} user agent`, 512);
    }
  }
  return output;
}

export function validateTask540OperationOutput(
  row: Task540OperationParityRow,
  input: PlainJsonObject | null,
  value: unknown
): PlainJsonValue {
  assertPlainJson(value, "TASK-540 operation output");
  switch (row.outputSchemaId) {
    case "bounded-natural-candidates-v1":
      return validateCandidates(row, input, value);
    case "api-session-observation-private-v1": {
      const output = requireObject(value, "TASK-540 session observation", ["rows"]);
      const rows = requireArray(output.rows, "TASK-540 session rows", 1);
      for (const rowValue of rows) {
        const session = requireObject(rowValue, "TASK-540 session row", [
          "createdAt",
          "csrfTokenHash",
          "expiresAt",
          "id",
          "ip",
          "revokedAt",
          "tokenHash",
          "userAgent",
          "userId",
        ]);
        requireUuid(session.id, "TASK-540 session ID");
        if (
          input !== null &&
          (session.userId !== input.userId || session.userAgent !== input.userAgent)
        ) {
          throw new WorkerProtocolError("TASK-540 session correlation drifted");
        }
        requireIsoTimestamp(session.createdAt, "TASK-540 session created timestamp");
        requireIsoTimestamp(session.expiresAt, "TASK-540 session expiry timestamp");
        requireIsoTimestamp(session.revokedAt, "TASK-540 session revoked timestamp", true);
      }
      return output;
    }
    case "auth-rate-private-v1": {
      const output = requireObject(value, "TASK-540 auth rate output", [
        "enabled",
        "maxRequests",
        "windowSeconds",
      ]);
      if (
        typeof output.enabled !== "boolean" ||
        !Number.isSafeInteger(output.maxRequests) ||
        (output.maxRequests as number) <= 0 ||
        !Number.isSafeInteger(output.windowSeconds) ||
        (output.windowSeconds as number) <= 0
      ) {
        throw new WorkerProtocolError("TASK-540 auth rate output drifted");
      }
      return output;
    }
    case "bootstrap-baseline-read-private-v1":
      return validateBootstrapBaseline(value, input);
    case "bootstrap-login-observation-private-v1":
      return validateBootstrapLogin(value, input);
    case "bootstrap-restore-private-v2":
      return validateBootstrapRestore(value);
    case "content-routes-private-v1":
      return validateContentRoutes(value);
    case "legacy-user-absence-private-v1":
      return requireBooleanProjection(value, "absent");
    case "legacy-user-delete-private-v1":
    case "preference-write-private-v1":
      return requireBooleanProjection(value, "ok");
    case "user-identity-private-v2":
      return requireBooleanProjection(value, "ok", true);
    case "preference-read-private-v1":
      return requireBooleanProjection(value, "showFieldMetadata");
    case "missing-media-row-count-v1": {
      const output = requireObject(value, "TASK-540 missing-media output", ["rowCount"]);
      if (
        !Number.isSafeInteger(output.rowCount) ||
        (output.rowCount as number) < 0 ||
        (output.rowCount as number) > 1
      ) {
        throw new WorkerProtocolError("TASK-540 missing-media count drifted");
      }
      return output;
    }
    case "resource-owner-private-v2":
      return validateResourceOwner(value, input);
    case "screen-materialize-private-v1": {
      if (input === null) {
        assertPlainJsonObject(value, "TASK-540 Screen output");
        if (value.schemaVersion !== 4 || !isPlainObject(value.definition)) {
          throw new WorkerProtocolError("TASK-540 Screen output drifted");
        }
        return value;
      }
      if (!isPlainObject(input.bodyWithoutDefinition)) {
        throw new WorkerProtocolError("TASK-540 Screen body is absent");
      }
      const body = input.bodyWithoutDefinition;
      const output = requireObject(value, "TASK-540 Screen output", [
        ...Object.keys(body),
        "definition",
        "schemaVersion",
      ]);
      if (
        output.schemaVersion !== 4 ||
        !isPlainObject(output.definition) ||
        Object.keys(body).some((key) => output[key] !== body[key])
      ) {
        throw new WorkerProtocolError("TASK-540 Screen output drifted");
      }
      return output;
    }
    case "seo-entry-discovery-private-v1": {
      const output = requireObject(value, "TASK-540 SEO discovery output", ["candidates"]);
      const candidates = requireArray(output.candidates, "TASK-540 SEO candidates", 6);
      const documentIds = new Set<string>();
      const targetIds = new Set<string>();
      let previous = "";
      for (const candidateValue of candidates) {
        const candidate = requireObject(candidateValue, "TASK-540 SEO candidate", [
          "id",
          "targetId",
          "targetType",
        ]);
        const id = requireUuid(candidate.id, "TASK-540 SEO document ID");
        const targetId = requireUuid(candidate.targetId, "TASK-540 SEO target ID");
        const correlation = `${targetId}\0${id}`;
        if (
          candidate.targetType !== "entry" ||
          (input !== null &&
            Array.isArray(input.targetIds) &&
            !input.targetIds.includes(targetId)) ||
          documentIds.has(id) ||
          targetIds.has(targetId) ||
          (previous.length > 0 && previous >= correlation)
        ) {
          throw new WorkerProtocolError("TASK-540 SEO candidate correlation drifted");
        }
        documentIds.add(id);
        targetIds.add(targetId);
        previous = correlation;
      }
      return output;
    }
    case "session-policy-private-v1": {
      const output = requireObject(value, "TASK-540 session policy output", [
        "csrfHeaderName",
        "effectiveMaxPerUserAtLeast2",
        "singleSession",
      ]);
      const header = requireString(output.csrfHeaderName, "TASK-540 CSRF header", 128);
      if (
        header !== header.toLowerCase() ||
        typeof output.effectiveMaxPerUserAtLeast2 !== "boolean" ||
        typeof output.singleSession !== "boolean"
      ) {
        throw new WorkerProtocolError("TASK-540 session policy output drifted");
      }
      return output;
    }
    case "storage-preflight-private-v2":
      return validateStoragePreflight(value);
    case "strict-resource-operation-v1":
      return validateStrictResource(row, input, value);
    case "task-traffic-complete-private-v2":
      return validateTaskTraffic(value);
    case "user-provision-private-v2": {
      const output = requireObject(value, "TASK-540 user provision output", [
        "adminRoleTupleCount",
        "exactIdPasswordUpdate",
        "normalizedEmailMatches",
        "userEmail",
        "userId",
      ]);
      requireUuid(output.userId, "TASK-540 provisioned user ID");
      if (
        output.adminRoleTupleCount !== 1 ||
        output.exactIdPasswordUpdate !== true ||
        output.normalizedEmailMatches !== true ||
        typeof output.userEmail !== "string" ||
        (input !== null && output.userEmail !== input.email)
      ) {
        throw new WorkerProtocolError("TASK-540 user provision output drifted");
      }
      return output;
    }
  }
}

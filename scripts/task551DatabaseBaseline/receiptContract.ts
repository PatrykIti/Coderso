import {
  canonicalizeTask551Rfc8785,
  digestTask551CanonicalBytes,
  requireTask551LowercaseSha256,
} from "./digestContract";
import type {
  JsonValue,
  Task551LowercaseSha256,
  Task551ReviewableFreezeReceiptV1,
  Task551ReviewableReceiptDigestInputV1,
  Task551ReviewableReceiptNumericCeilingV1,
  Task551L02OwnerCapabilityReceiptV1,
  Task551ReviewedCandidateTransitionInputV1,
  Task551ReviewedCandidateTransitionResultV1,
  Task551BaselineCheckSuccessRecord,
} from "./digestContract";

const INVALID_ERROR_MESSAGE = "database_baseline_invalid";
const ADMIN_STATEMENT_IDS = [
  "admin-pages-page",
  "admin-pages-fixed-summary",
  "admin-pages-authors-facet",
  "admin-entries-global-page",
  "admin-entries-global-fixed-summary",
  "admin-entries-global-facets",
  "admin-entries-typed-page",
  "admin-entries-typed-fixed-summary",
  "admin-entries-typed-authors-facet",
  "admin-posts-page",
  "admin-posts-fixed-summary",
  "admin-posts-authors-facet",
  "admin-users-page",
  "admin-users-fixed-summary",
  "admin-users-roles-facet",
  "admin-forms-page",
  "admin-forms-fixed-summary",
  "admin-form-submissions-page",
  "admin-form-submissions-fixed-summary",
  "admin-media-page",
  "admin-media-fixed-summary",
  "admin-media-facets",
  "admin-booking-reservations-page",
  "admin-booking-reservations-fixed-summary",
  "admin-booking-resources-page",
  "admin-booking-resources-fixed-summary",
  "admin-booking-services-page",
  "admin-booking-services-fixed-summary",
  "admin-booking-blackouts-page",
  "admin-booking-blackouts-fixed-summary",
  "admin-booking-service-resources-fixed-list",
  "admin-booking-schedules-fixed-list",
] as const;

function invalid(): never {
  throw new Error(INVALID_ERROR_MESSAGE);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function assertOwnKeys(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isPlainObject(value)) invalid();
  const ownKeys = Reflect.ownKeys(value);
  const expected = new Set(keys);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !expected.has(key)) ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  ) {
    invalid();
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      invalid();
  }
  return value;
}

function assertArray(value: unknown, length: number): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length !== length
  )
    invalid();
  const expected = new Set(["length", ...Array.from({ length }, (_, index) => String(index))]);
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== expected.size ||
    ownKeys.some((key) => typeof key !== "string" || !expected.has(key))
  )
    invalid();
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      invalid();
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    lengthDescriptor.enumerable !== false ||
    !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value")
  )
    invalid();
  return value;
}

function assertString(value: unknown): string {
  if (typeof value !== "string") invalid();
  return value;
}

function assertNonEmptyString(value: unknown): string {
  const result = assertString(value);
  if (result.length === 0) invalid();
  return result;
}

function assertPositiveNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) invalid();
  return value;
}

function assertPositiveSafeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) invalid();
  return value;
}

function assertJson(value: unknown): asserts value is JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalid();
    return;
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) invalid();
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== value.length + 1 ||
      ownKeys.some((key) => typeof key !== "string" || (key !== "length" && !/^\d+$/u.test(key)))
    )
      invalid();
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        descriptor === undefined ||
        descriptor.enumerable !== true ||
        !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined
      )
        invalid();
    }
    for (const item of value) assertJson(item);
    return;
  }
  if (isPlainObject(value)) {
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") invalid();
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        descriptor.enumerable !== true ||
        !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined
      )
        invalid();
      assertJson(value[key]);
    }
    return;
  }
  invalid();
}

function numericCeiling(value: unknown): Task551ReviewableReceiptNumericCeilingV1 {
  const record = assertOwnKeys(value, [
    "queryCountMax",
    "rowsReadMax",
    "rowsReturnedMax",
    "transferredBytesMax",
    "sharedBuffersMax",
    "p50MsMax",
    "p95MsMax",
    "p99MsMax",
  ]);
  if (record.queryCountMax !== 1) invalid();
  const rowsReturnedMax = record.rowsReturnedMax;
  if (
    rowsReturnedMax !== 1 &&
    rowsReturnedMax !== 51 &&
    rowsReturnedMax !== 101 &&
    rowsReturnedMax !== 102
  )
    invalid();
  return {
    queryCountMax: 1,
    rowsReadMax: assertPositiveNumber(record.rowsReadMax),
    rowsReturnedMax,
    transferredBytesMax: assertPositiveNumber(record.transferredBytesMax),
    sharedBuffersMax: assertPositiveNumber(record.sharedBuffersMax),
    p50MsMax: assertPositiveNumber(record.p50MsMax),
    p95MsMax: assertPositiveNumber(record.p95MsMax),
    p99MsMax: assertPositiveNumber(record.p99MsMax),
  };
}

function reviewableReceipt(value: unknown): Task551ReviewableReceiptDigestInputV1 {
  const baseKeys = [
    "reviewState",
    "profile",
    "provenanceCommit",
    "contractDigest",
    "fixtureDigest",
    "schemaDigest",
    "runnerDigest",
    "platform",
    "arch",
    "cpuModel",
    "logicalCpus",
    "memoryMb",
    "postgresMajor",
    "postgresConfigDigest",
    "bunVersion",
    "poolCapacity",
    "containerMode",
    "scopeDigest",
    "calibration",
    "statementCeilings",
    "poolWaitCeiling",
  ] as const;
  if (!isPlainObject(value)) invalid();
  const hasSelfDigest = Object.prototype.hasOwnProperty.call(value, "reviewableReceiptDigest");
  const record = assertOwnKeys(
    value,
    hasSelfDigest ? ["reviewableReceiptDigest", ...baseKeys] : baseKeys
  );
  const reviewState = assertString(record.reviewState);
  const profile = assertString(record.profile);
  if (
    (reviewState !== "candidate" && reviewState !== "reviewed") ||
    (profile !== "small" && profile !== "large")
  )
    invalid();
  const selfDigest = hasSelfDigest
    ? requireTask551LowercaseSha256(assertString(record.reviewableReceiptDigest))
    : undefined;
  const digestFields = ["contractDigest", "fixtureDigest", "schemaDigest", "runnerDigest"] as const;
  for (const field of digestFields) requireTask551LowercaseSha256(assertString(record[field]));
  const textFields = [
    "provenanceCommit",
    "platform",
    "arch",
    "cpuModel",
    "postgresConfigDigest",
    "bunVersion",
    "containerMode",
    "scopeDigest",
  ] as const;
  for (const field of textFields) assertNonEmptyString(record[field]);
  const logicalCpus = assertPositiveSafeInteger(record.logicalCpus);
  const memoryMb = assertPositiveSafeInteger(record.memoryMb);
  const postgresMajor = assertPositiveSafeInteger(record.postgresMajor);
  const poolCapacity = assertPositiveSafeInteger(record.poolCapacity);
  if (poolCapacity !== (profile === "small" ? 2 : 10)) invalid();
  const calibrationRecord = assertOwnKeys(record.calibration, ["warmups", "samples", "medianMs"]);
  if (calibrationRecord.warmups !== 20 || calibrationRecord.samples !== 100) invalid();
  const calibration = {
    warmups: 20 as const,
    samples: 100 as const,
    medianMs: assertPositiveNumber(calibrationRecord.medianMs),
  };
  const statementValues = assertArray(record.statementCeilings, ADMIN_STATEMENT_IDS.length);
  const statementCeilings = statementValues.map((statement) => {
    const item = assertOwnKeys(statement, ["statementId", "ceiling"]);
    return { statementId: assertString(item.statementId), ceiling: numericCeiling(item.ceiling) };
  });
  if (
    statementCeilings.some(
      (statement, index) => statement.statementId !== ADMIN_STATEMENT_IDS[index]
    )
  )
    invalid();
  const poolWaitCeiling = numericCeiling(record.poolWaitCeiling);
  return {
    ...(selfDigest === undefined ? {} : { reviewableReceiptDigest: selfDigest }),
    reviewState,
    profile,
    provenanceCommit: assertString(record.provenanceCommit),
    contractDigest: assertString(record.contractDigest),
    fixtureDigest: assertString(record.fixtureDigest),
    schemaDigest: assertString(record.schemaDigest),
    runnerDigest: assertString(record.runnerDigest),
    platform: assertString(record.platform),
    arch: assertString(record.arch),
    cpuModel: assertString(record.cpuModel),
    logicalCpus,
    memoryMb,
    postgresMajor,
    postgresConfigDigest: assertString(record.postgresConfigDigest),
    bunVersion: assertString(record.bunVersion),
    poolCapacity,
    containerMode: assertString(record.containerMode),
    scopeDigest: assertString(record.scopeDigest),
    calibration,
    statementCeilings,
    poolWaitCeiling,
  };
}

function receiptPayload(receipt: Task551ReviewableReceiptDigestInputV1): JsonValue {
  const checked = reviewableReceipt(receipt);
  const { reviewState: _reviewState, reviewableReceiptDigest: _selfDigest, ...payload } = checked;
  return payload as unknown as JsonValue;
}

function completeReceiptDigest(
  receipt: Task551ReviewableFreezeReceiptV1,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551LowercaseSha256 {
  reviewableReceipt(receipt);
  return digestTask551CanonicalBytes(
    canonicalizeTask551Rfc8785(receipt as unknown as JsonValue),
    sha256Bytes
  );
}

export function computeTask551ReviewableReceiptDigest(
  receipt: Task551ReviewableReceiptDigestInputV1,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551LowercaseSha256 {
  const checked = reviewableReceipt(receipt);
  const digest = digestTask551CanonicalBytes(
    canonicalizeTask551Rfc8785(receiptPayload(checked)),
    sha256Bytes
  );
  if (
    Object.prototype.hasOwnProperty.call(checked, "reviewableReceiptDigest") &&
    checked.reviewableReceiptDigest !== digest
  )
    invalid();
  return digest;
}

export function buildTask551ReviewedCandidateTransitionInput(
  candidateSnapshot: readonly [
    Readonly<{ profile: "small"; candidateReceipt: Task551ReviewableFreezeReceiptV1 }>,
    Readonly<{ profile: "large"; candidateReceipt: Task551ReviewableFreezeReceiptV1 }>,
  ],
  sha256Bytes: (bytes: Uint8Array) => string
): Task551ReviewedCandidateTransitionInputV1 {
  const candidates = assertArray(candidateSnapshot, 2).map((candidate, index) => {
    const record = assertOwnKeys(candidate, ["profile", "candidateReceipt"]);
    const profile = index === 0 ? "small" : "large";
    if (record.profile !== profile) invalid();
    const receipt = reviewableReceipt(record.candidateReceipt);
    if (
      receipt.reviewState !== "candidate" ||
      receipt.profile !== profile ||
      !Object.prototype.hasOwnProperty.call(receipt, "reviewableReceiptDigest")
    )
      invalid();
    if (
      computeTask551ReviewableReceiptDigest(receipt, sha256Bytes) !==
      receipt.reviewableReceiptDigest
    )
      invalid();
    return {
      profile,
      candidateReceipt: receipt as Task551ReviewableFreezeReceiptV1,
      candidateCanonicalReceiptDigest: completeReceiptDigest(
        receipt as Task551ReviewableFreezeReceiptV1,
        sha256Bytes
      ),
    };
  });
  return {
    schema: "coderso.task551.reviewed-candidate-transition-input@v1",
    candidates: candidates as unknown as Task551ReviewedCandidateTransitionInputV1["candidates"],
  };
}

function transitionInput(
  value: unknown,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551ReviewedCandidateTransitionInputV1 {
  const record = assertOwnKeys(value, ["schema", "candidates"]);
  if (record.schema !== "coderso.task551.reviewed-candidate-transition-input@v1") invalid();
  const candidates = assertArray(record.candidates, 2).map((candidate, index) => {
    const item = assertOwnKeys(candidate, [
      "profile",
      "candidateReceipt",
      "candidateCanonicalReceiptDigest",
    ]);
    const profile = index === 0 ? "small" : "large";
    if (item.profile !== profile) invalid();
    const receipt = reviewableReceipt(item.candidateReceipt);
    if (
      receipt.profile !== profile ||
      receipt.reviewState !== "candidate" ||
      !Object.prototype.hasOwnProperty.call(receipt, "reviewableReceiptDigest")
    )
      invalid();
    if (
      computeTask551ReviewableReceiptDigest(receipt, sha256Bytes) !==
      receipt.reviewableReceiptDigest
    )
      invalid();
    if (
      completeReceiptDigest(receipt as Task551ReviewableFreezeReceiptV1, sha256Bytes) !==
      item.candidateCanonicalReceiptDigest
    )
      invalid();
    return {
      profile,
      candidateReceipt: receipt as Task551ReviewableFreezeReceiptV1,
      candidateCanonicalReceiptDigest: requireTask551LowercaseSha256(
        assertString(item.candidateCanonicalReceiptDigest)
      ),
    };
  });
  return {
    schema: "coderso.task551.reviewed-candidate-transition-input@v1",
    candidates: candidates as unknown as Task551ReviewedCandidateTransitionInputV1["candidates"],
  };
}

function transitionResult(value: unknown): Task551ReviewedCandidateTransitionResultV1 {
  const record = assertOwnKeys(value, ["schema", "capabilityReceipt", "reviewed"]);
  if (record.schema !== "coderso.task551.reviewed-candidate-transition-result@v1") invalid();
  const checkedCapabilityReceipt = task551CapabilityReceipt(record.capabilityReceipt);
  const reviewed = assertArray(record.reviewed, 2).map((entry, index) => {
    const item = assertOwnKeys(entry, [
      "profile",
      "candidateCanonicalReceiptDigest",
      "reviewedReceipt",
      "reviewedCanonicalReceiptDigest",
    ]);
    const profile = index === 0 ? "small" : "large";
    if (item.profile !== profile) invalid();
    const receipt = reviewableReceipt(item.reviewedReceipt);
    if (
      receipt.profile !== profile ||
      receipt.reviewState !== "reviewed" ||
      !Object.prototype.hasOwnProperty.call(receipt, "reviewableReceiptDigest")
    )
      invalid();
    return {
      profile,
      candidateCanonicalReceiptDigest: requireTask551LowercaseSha256(
        assertString(item.candidateCanonicalReceiptDigest)
      ),
      reviewedReceipt: receipt as Task551ReviewableFreezeReceiptV1,
      reviewedCanonicalReceiptDigest: requireTask551LowercaseSha256(
        assertString(item.reviewedCanonicalReceiptDigest)
      ),
    };
  });
  return {
    schema: "coderso.task551.reviewed-candidate-transition-result@v1",
    capabilityReceipt: checkedCapabilityReceipt,
    reviewed: reviewed as unknown as Task551ReviewedCandidateTransitionResultV1["reviewed"],
  };
}

function task551CapabilityReceipt(value: unknown): Task551L02OwnerCapabilityReceiptV1 {
  const record = assertOwnKeys(value, ["schemaVersion", "digest"]);
  if (record.schemaVersion !== "coderso.task551.l02-owner-capability-receipt@v1") invalid();
  return {
    schemaVersion: record.schemaVersion,
    digest: requireTask551LowercaseSha256(assertString(record.digest)),
  };
}

export function assertExactTask551ReviewedCandidateTransition(
  input: Readonly<{
    input: Task551ReviewedCandidateTransitionInputV1;
    result: Task551ReviewedCandidateTransitionResultV1;
    sha256Bytes: (bytes: Uint8Array) => string;
  }>
): Task551ReviewedCandidateTransitionResultV1 {
  const record = assertOwnKeys(input, ["input", "result", "sha256Bytes"]);
  if (typeof record.sha256Bytes !== "function") invalid();
  const sha256Bytes = record.sha256Bytes as (bytes: Uint8Array) => string;
  const checkedInput = transitionInput(record.input, sha256Bytes);
  const checkedResult = transitionResult(record.result);
  for (let index = 0; index < 2; index += 1) {
    const candidate = checkedInput.candidates[index]!;
    const reviewed = checkedResult.reviewed[index]!;
    const candidateBytes = canonicalizeTask551Rfc8785(
      candidate.candidateReceipt as unknown as JsonValue
    );
    const reviewedBytes = canonicalizeTask551Rfc8785(
      reviewed.reviewedReceipt as unknown as JsonValue
    );
    const candidateDigest = digestTask551CanonicalBytes(candidateBytes, sha256Bytes);
    if (
      candidateDigest !== candidate.candidateCanonicalReceiptDigest ||
      reviewed.candidateCanonicalReceiptDigest !== candidateDigest
    )
      invalid();
    if (
      computeTask551ReviewableReceiptDigest(reviewed.reviewedReceipt, sha256Bytes) !==
      reviewed.reviewedReceipt.reviewableReceiptDigest
    )
      invalid();
    if (
      completeReceiptDigest(reviewed.reviewedReceipt, sha256Bytes) !==
      reviewed.reviewedCanonicalReceiptDigest
    )
      invalid();
    const reviewedText = new TextDecoder().decode(reviewedBytes);
    const expectedReviewedBytes = canonicalizeTask551Rfc8785({
      ...candidate.candidateReceipt,
      reviewState: "reviewed",
    } as unknown as JsonValue);
    const expectedReviewedText = new TextDecoder().decode(expectedReviewedBytes);
    if (reviewedText !== expectedReviewedText) invalid();
  }
  return checkedResult;
}

export function assertExactTask551ReviewedCandidateTransitionInput(
  value: Task551ReviewedCandidateTransitionInputV1,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551ReviewedCandidateTransitionInputV1 {
  return transitionInput(value, sha256Bytes);
}

export function buildExactTask551ReviewedResultByChangingOnlyReviewState(
  input: Readonly<{
    input: Task551ReviewedCandidateTransitionInputV1;
    capabilityReceipt: Task551L02OwnerCapabilityReceiptV1;
    sha256Bytes: (bytes: Uint8Array) => string;
  }>
): Task551ReviewedCandidateTransitionResultV1 {
  const record = assertOwnKeys(input, ["input", "capabilityReceipt", "sha256Bytes"]);
  const sha256Bytes = record.sha256Bytes as (bytes: Uint8Array) => string;
  const checkedInput = transitionInput(record.input, sha256Bytes);
  const capabilityReceipt = task551CapabilityReceipt(record.capabilityReceipt);
  const reviewed = checkedInput.candidates.map((candidate) => {
    const { reviewableReceiptDigest: _digest, ...withoutDigest } = candidate.candidateReceipt;
    const reviewedWithoutDigest = { ...withoutDigest, reviewState: "reviewed" as const };
    const reviewedReceipt = {
      ...reviewedWithoutDigest,
      reviewableReceiptDigest: computeTask551ReviewableReceiptDigest(
        reviewedWithoutDigest,
        sha256Bytes
      ),
    } as Task551ReviewableFreezeReceiptV1;
    return {
      profile: candidate.profile,
      candidateCanonicalReceiptDigest: candidate.candidateCanonicalReceiptDigest,
      reviewedReceipt,
      reviewedCanonicalReceiptDigest: completeReceiptDigest(reviewedReceipt, sha256Bytes),
    };
  }) as unknown as Task551ReviewedCandidateTransitionResultV1["reviewed"];
  return {
    schema: "coderso.task551.reviewed-candidate-transition-result@v1",
    capabilityReceipt,
    reviewed,
  };
}

function scanJsonString(text: string, start: number): number {
  if (text[start] !== '"') invalid();
  let index = start + 1;
  while (index < text.length) {
    const code = text.charCodeAt(index);
    if (code === 34) return index + 1;
    if (code === 92) {
      index += 2;
      if (index > text.length) invalid();
      continue;
    }
    if (code < 32) invalid();
    index += 1;
  }
  invalid();
}

function scanJsonValue(text: string, start: number): number {
  let index = start;
  while (/\s/u.test(text[index] ?? "")) index += 1;
  const character = text[index];
  if (character === '"') return scanJsonString(text, index);
  if (character === "[") {
    index += 1;
    while (/\s/u.test(text[index] ?? "")) index += 1;
    if (text[index] === "]") return index + 1;
    while (index < text.length) {
      index = scanJsonValue(text, index);
      while (/\s/u.test(text[index] ?? "")) index += 1;
      if (text[index] === "]") return index + 1;
      if (text[index] !== ",") invalid();
      index += 1;
    }
    invalid();
  }
  if (character === "{") {
    index += 1;
    const keys = new Set<string>();
    while (/\s/u.test(text[index] ?? "")) index += 1;
    if (text[index] === "}") return index + 1;
    while (index < text.length) {
      while (/\s/u.test(text[index] ?? "")) index += 1;
      const keyStart = index;
      index = scanJsonString(text, index);
      const key = JSON.parse(text.slice(keyStart, index)) as unknown;
      if (typeof key !== "string" || keys.has(key)) invalid();
      keys.add(key);
      while (/\s/u.test(text[index] ?? "")) index += 1;
      if (text[index] !== ":") invalid();
      index = scanJsonValue(text, index + 1);
      while (/\s/u.test(text[index] ?? "")) index += 1;
      if (text[index] === "}") return index + 1;
      if (text[index] !== ",") invalid();
      index += 1;
    }
    invalid();
  }
  const match = text
    .slice(index)
    .match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u);
  if (match === null) invalid();
  return index + match[0].length;
}

export function parseTask551StrictJson(text: string): JsonValue {
  const end = scanJsonValue(text, 0);
  let index = end;
  while (/\s/u.test(text[index] ?? "")) index += 1;
  if (index !== text.length) invalid();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    invalid();
  }
  assertJson(parsed);
  return parsed;
}

export function parseCanonicalTask551BaselineCheckStdout(
  stdout: string
): Task551BaselineCheckSuccessRecord {
  if (
    typeof stdout !== "string" ||
    !stdout.endsWith("\n") ||
    stdout.endsWith("\n\n") ||
    stdout.includes("\r")
  )
    invalid();
  const parsed = parseTask551StrictJson(stdout.slice(0, -1));
  const record = assertOwnKeys(parsed, [
    "schema",
    "taskId",
    "mode",
    "profile",
    "pass",
    "fixtureTargetPreflight",
    "reviewableReceiptDigest",
    "contractDigest",
    "fixtureDigest",
    "schemaDigest",
    "runnerDigest",
    "manifestScenarioResultDigest",
  ]);
  if (
    record.schema !== "coderso.task551.database-baseline-check@v1" ||
    record.taskId !== "TASK-551-01-L02" ||
    record.mode !== "check" ||
    (record.profile !== "small" && record.profile !== "large") ||
    record.pass !== true
  )
    invalid();
  const proof = assertOwnKeys(record.fixtureTargetPreflight, [
    "rolledBack",
    "currentDatabaseMatched",
    "exactSingleMarkerMatched",
    "boundSentinelByteMatched",
  ]);
  if (
    proof.rolledBack !== true ||
    proof.currentDatabaseMatched !== true ||
    proof.exactSingleMarkerMatched !== true ||
    proof.boundSentinelByteMatched !== true
  )
    invalid();
  for (const field of [
    "reviewableReceiptDigest",
    "contractDigest",
    "fixtureDigest",
    "schemaDigest",
    "runnerDigest",
    "manifestScenarioResultDigest",
  ] as const) {
    requireTask551LowercaseSha256(assertString(record[field]));
  }
  const canonical = canonicalizeTask551Rfc8785(parsed);
  const expected = `${new TextDecoder().decode(canonical)}\n`;
  if (expected !== stdout) invalid();
  return parsed as unknown as Task551BaselineCheckSuccessRecord;
}

// --- Active v2 state transition receipt and reviewed attestation (pure) ---

export const TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_SCHEMA_V2 =
  "coderso.task551.l02-active-state-transition-receipt@v2" as const;
export const TASK551_L02_REVIEWED_STATE_ATTESTATION_SCHEMA_V2 =
  "coderso.task551.l02-reviewed-state-attestation@v2" as const;
export const TASK551_L02_ACTIVE_GENERATION_ARCHIVE_SHA256_V2 =
  "17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f" as const;

export const TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_KEYS_V2 = [
  "schema",
  "version",
  "generationId",
  "operation",
  "sequence",
  "transitionId",
  "previousTransitionId",
  "beforeState",
  "beforeStateDigest",
  "afterState",
  "afterStateDigest",
  "archiveSha256",
  "bootstrapSourceSha256",
  "l02ClosureSha256",
] as const;
export const TASK551_L02_REVIEWED_STATE_ATTESTATION_KEYS_V2 = [
  "schema",
  "version",
  "generationId",
  "state",
  "sequence",
  "transitionId",
  "stateDigest",
  "archiveSha256",
  "bootstrapSourceSha256",
  "l02ClosureSha256",
] as const;

export type Task551L02ActiveStateTransitionReceiptV2 = Readonly<{
  schema: typeof TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_SCHEMA_V2;
  version: 2;
  generationId: "task551-freeze-candidate-generation-v2";
  operation: "freeze-small" | "freeze-large" | "review";
  sequence: 1 | 2 | 3;
  transitionId: Task551LowercaseSha256;
  previousTransitionId: Task551LowercaseSha256 | null;
  beforeState: "awaiting-small" | "awaiting-large" | "ready-for-review";
  beforeStateDigest: "absent" | Task551LowercaseSha256;
  afterState: "awaiting-large" | "ready-for-review" | "reviewed";
  afterStateDigest: Task551LowercaseSha256;
  archiveSha256: typeof TASK551_L02_ACTIVE_GENERATION_ARCHIVE_SHA256_V2;
  bootstrapSourceSha256: Task551LowercaseSha256;
  l02ClosureSha256: Task551LowercaseSha256;
}>;

export type Task551L02ReviewedStateAttestationV2 = Readonly<{
  schema: typeof TASK551_L02_REVIEWED_STATE_ATTESTATION_SCHEMA_V2;
  version: 2;
  generationId: "task551-freeze-candidate-generation-v2";
  state: "reviewed";
  sequence: 3;
  transitionId: Task551LowercaseSha256;
  stateDigest: Task551LowercaseSha256;
  archiveSha256: typeof TASK551_L02_ACTIVE_GENERATION_ARCHIVE_SHA256_V2;
  bootstrapSourceSha256: Task551LowercaseSha256;
  l02ClosureSha256: Task551LowercaseSha256;
}>;

type Task551ActiveStateEdgeV2 = Readonly<{
  operation: "freeze-small" | "freeze-large" | "review";
  sequence: 1 | 2 | 3;
  beforeState: "awaiting-small" | "awaiting-large" | "ready-for-review";
  afterState: "awaiting-large" | "ready-for-review" | "reviewed";
  firstEdge: boolean;
}>;

const ACTIVE_STATE_EDGES_V2: readonly Task551ActiveStateEdgeV2[] = [
  {
    operation: "freeze-small",
    sequence: 1,
    beforeState: "awaiting-small",
    afterState: "awaiting-large",
    firstEdge: true,
  },
  {
    operation: "freeze-large",
    sequence: 2,
    beforeState: "awaiting-large",
    afterState: "ready-for-review",
    firstEdge: false,
  },
  {
    operation: "review",
    sequence: 3,
    beforeState: "ready-for-review",
    afterState: "reviewed",
    firstEdge: false,
  },
];

function requireDigestField(value: unknown): Task551LowercaseSha256 {
  if (typeof value !== "string") invalid();
  return requireTask551LowercaseSha256(value);
}

function requireExactOrderedOwnRecord(
  value: unknown,
  keys: readonly string[]
): Record<string, unknown> {
  if (!isPlainObject(value)) invalid();
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length || ownKeys.some((key, index) => key !== keys[index])) {
    invalid();
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      descriptor.value === undefined
    ) {
      invalid();
    }
  }
  return value;
}

// Pure, strict, already-reduced validator: no filesystem, archive,
// environment, or state I/O, and no mutation of the received value.
export function requireExactTask551L02ActiveStateTransitionReceiptV2(
  value: unknown
): Task551L02ActiveStateTransitionReceiptV2 {
  const record = requireExactOrderedOwnRecord(
    value,
    TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_KEYS_V2
  );
  if (
    record.schema !== TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_SCHEMA_V2 ||
    record.version !== 2 ||
    record.generationId !== "task551-freeze-candidate-generation-v2" ||
    record.archiveSha256 !== TASK551_L02_ACTIVE_GENERATION_ARCHIVE_SHA256_V2
  ) {
    invalid();
  }
  const edge = ACTIVE_STATE_EDGES_V2.find(
    (candidate) =>
      candidate.operation === record.operation && candidate.sequence === record.sequence
  );
  if (
    edge === undefined ||
    edge.beforeState !== record.beforeState ||
    edge.afterState !== record.afterState
  ) {
    invalid();
  }
  if (edge.firstEdge) {
    if (record.beforeStateDigest !== "absent" || record.previousTransitionId !== null) invalid();
  } else {
    requireDigestField(record.beforeStateDigest);
    requireDigestField(record.previousTransitionId);
  }
  if (record.afterStateDigest === "absent") invalid();
  requireDigestField(record.afterStateDigest);
  requireDigestField(record.transitionId);
  requireDigestField(record.bootstrapSourceSha256);
  requireDigestField(record.l02ClosureSha256);
  if (record.transitionId === record.previousTransitionId) invalid();
  return Object.freeze(record as unknown as Task551L02ActiveStateTransitionReceiptV2);
}

// Pure, strict, already-reduced validator for the non-mutating check record.
export function requireExactTask551L02ReviewedStateAttestationV2(
  value: unknown
): Task551L02ReviewedStateAttestationV2 {
  const record = requireExactOrderedOwnRecord(
    value,
    TASK551_L02_REVIEWED_STATE_ATTESTATION_KEYS_V2
  );
  if (
    record.schema !== TASK551_L02_REVIEWED_STATE_ATTESTATION_SCHEMA_V2 ||
    record.version !== 2 ||
    record.generationId !== "task551-freeze-candidate-generation-v2" ||
    record.state !== "reviewed" ||
    record.sequence !== 3 ||
    record.archiveSha256 !== TASK551_L02_ACTIVE_GENERATION_ARCHIVE_SHA256_V2
  ) {
    invalid();
  }
  requireDigestField(record.transitionId);
  requireDigestField(record.stateDigest);
  requireDigestField(record.bootstrapSourceSha256);
  requireDigestField(record.l02ClosureSha256);
  return Object.freeze(record as unknown as Task551L02ReviewedStateAttestationV2);
}

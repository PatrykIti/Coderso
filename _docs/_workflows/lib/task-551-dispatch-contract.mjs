// TASK-551 dispatch-contract helper (single owner: TASK-551-11 sidecar).
//
// This module deliberately has no filesystem access. The
// author-audit workflow supplies an own-data snapshot of the current HEAD and
// TASK-551 task files; this helper validates the bytes-derived task metadata,
// graph, and leaf envelopes before returning a frozen dispatch projection.

import { requireTask551L02WorkflowCompatibilityExtensions } from "./task-551-worktree-compatibility.mjs";

const TASK551_GRAPH_SCHEMA = "coderso.task551.workflow-dispatch-graph@v1";
const TASK551_ENVELOPE_SCHEMA = "coderso.task551.workflow-dispatch@v1";
const TASK551_SNAPSHOT_KEYS = Object.freeze(["sourceHead", "taskFiles"]);
const TASK551_TASK_FILE_KEYS = Object.freeze(["path", "text"]);
const TASK551_GRAPH_KEYS = Object.freeze(["schema", "version", "nodes"]);
const TASK551_GRAPH_NODE_KEYS = Object.freeze(["id", "taskId", "occurrenceId", "dependsOn"]);
const TASK551_ENVELOPE_KEYS = Object.freeze([
  "schema",
  "taskId",
  "parent",
  "allowlist",
  "forbiddenPaths",
  "dependencies",
  "commands",
  "occurrences",
]);
const TASK551_PARENT_KEYS = Object.freeze(["taskId", "subtaskId"]);
const TASK551_COMMAND_KEYS = Object.freeze([
  "id",
  "lane",
  "environmentProfile",
  "argv",
  "positiveDiscovery",
]);
const TASK551_OCCURRENCE_KEYS = Object.freeze(["id", "dependsOn", "commandIds"]);
const TASK551_SUBGATE_KEYS = Object.freeze([
  "id",
  "kind",
  "ordinal",
  "ownerTaskId",
  "occurrenceId",
  "afterCommandIds",
  "beforeCommandId",
  "barrier",
]);
const TASK551_CLASSIFIER_BARRIER_KEYS = Object.freeze([
  "exactFourTestPrerequisite",
  "classifierManifestDeltaPath",
  "exactNinePathManifestMembershipPostchecks",
  "currentByteState",
]);
const TASK551_REVIEW_BARRIER_KEYS = Object.freeze([
  "validatedSnapshotRegistrationHook",
  "publicTransition",
  "activeStateTransitionReceiptSchema",
  "activeStateTransitionReceiptNormalizer",
  "reviewedStateAttestationNormalizer",
  "inMemoryExpectedStateDigestRebase",
  "l02CodeTestMaterializationClosure",
  "materializationClosureTiming",
  "finalLeafClosureTiming",
  "sourceFree",
  "zeroCheckDispatchesOnFailure",
]);
const TASK551_ALLOWED_STATUSES = new Set([
  "⏳ To Do",
  "🚧 In Progress",
  "✅ Done",
  "⏭️ Superseded",
  "❌ Cancelled",
]);
const TASK551_OCCURRENCE_IDS = new Set(["initial", "single", "final"]);
const TASK551_LANES = new Set([
  "aggregate",
  "bun-test",
  "cli",
  "migration",
  "runtime-smoke",
  "tooling",
  "vitest",
]);
const TASK551_ENVIRONMENT_PROFILES = new Set([
  "none",
  "task551-db-test",
  "task551-db-redis-test",
  "task551-redis-test",
  "task551-db-migration-test",
  "task551-phase-l03",
  "task551-phase-l02",
  "task551-phase-05-l02",
]);
const TASK551_ARTIFACT_POLICIES = new Set([
  "none",
  "task551-drizzle-migration-triple",
  "task551-changelog-closure-entry",
]);
const TASK551_MAX_TASK_FILE_BYTES = 512 * 1024;
const TASK551_MAX_JSON_BYTES = 160 * 1024;
const TASK551_MAX_JSON_DEPTH = 64;
const TASK551_MAX_JSON_NODES = 20_000;
const TASK551_TASKS_PREFIX = "_docs/_TASKS/";
const TASK551_FENCED_JSON = /^```json[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gmu;

function fail(code) {
  throw new Error(`task551_dispatch_${code}`);
}

function ownKeys(value, code) {
  try {
    return Reflect.ownKeys(value);
  } catch {
    fail(code);
  }
}

function requireOwnDataRecord(value, expectedKeys, code, prototype = Object.prototype) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  if (Object.getPrototypeOf(value) !== prototype) fail(code);
  const keys = ownKeys(value, code);
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    fail(code);
  }
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      fail(code);
    }
  }
  return value;
}

function requireJsonRecord(value, expectedKeys, code) {
  return requireOwnDataRecord(value, expectedKeys, code, null);
}

function requireOwnDataArray(value, code, { min = 0, max = 10_000 } = {}) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail(code);
  if (value.length < min || value.length > max) fail(code);
  const keys = ownKeys(value, code);
  if (keys.length !== value.length + 1 || !keys.includes("length")) fail(code);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      fail(code);
    }
  }
  return value;
}

function utf8Bytes(value) {
  return new TextEncoder().encode(value).byteLength;
}

function requireText(value, code, { min = 1, max = TASK551_MAX_TASK_FILE_BYTES } = {}) {
  if (typeof value !== "string" || value.length < min || value.includes("\u0000")) fail(code);
  if (value.includes("\uFEFF") || utf8Bytes(value) > max) fail(code);
  return value;
}

function requireLiteralId(value, code, pattern) {
  const text = requireText(value, code, { max: 160 });
  if (!pattern.test(text)) fail(code);
  return text;
}

function requireRepoPath(value, code) {
  const path = requireText(value, code, { max: 512 });
  if (
    !/^[A-Za-z0-9._/@+,-]+$/u.test(path) ||
    path.startsWith("/") ||
    path.endsWith("/") ||
    path.includes("//") ||
    path.includes("\\") ||
    path.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    fail(code);
  }
  return path;
}

function requireUniqueStrings(values, code, mapper = (value) => value) {
  const result = [];
  const seen = new Set();
  for (const value of values) {
    const normalized = mapper(value);
    if (seen.has(normalized)) fail(code);
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function requireExactSequence(actual, expected, code) {
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    fail(code);
  }
}

function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
  return Object.freeze(value);
}

function parseDuplicateKeyAwareJson(source, code) {
  requireText(source, code, { min: 2, max: TASK551_MAX_JSON_BYTES });
  let index = 0;
  let nodeCount = 0;

  const error = (suffix) => fail(`${code}:${suffix}`);
  const whitespace = () => {
    while (/[ \n\r\t]/u.test(source[index] ?? "")) index += 1;
  };
  const requireNode = (depth) => {
    nodeCount += 1;
    if (depth > TASK551_MAX_JSON_DEPTH || nodeCount > TASK551_MAX_JSON_NODES) {
      error("bounds");
    }
  };
  const parseString = () => {
    const start = index;
    if (source[index] !== '"') error("string_open");
    index += 1;
    while (index < source.length) {
      const character = source[index];
      if (character === '"') {
        index += 1;
        try {
          return JSON.parse(source.slice(start, index));
        } catch {
          error("string_invalid");
        }
      }
      if (character === "\\") {
        const escape = source[index + 1];
        if (escape === "u") {
          const hex = source.slice(index + 2, index + 6);
          if (!/^[0-9a-fA-F]{4}$/u.test(hex)) error("unicode_escape");
          index += 6;
          continue;
        }
        if (!'"\\/bfnrt'.includes(escape ?? "")) error("escape");
        index += 2;
        continue;
      }
      if (character === undefined || character.charCodeAt(0) < 0x20) error("string_control");
      index += 1;
    }
    error("string_unterminated");
  };
  const parseArray = (depth) => {
    const values = [];
    index += 1;
    whitespace();
    if (source[index] === "]") {
      index += 1;
      return values;
    }
    while (true) {
      values.push(parseValue(depth + 1));
      whitespace();
      if (source[index] === "]") {
        index += 1;
        return values;
      }
      if (source[index] !== ",") error("array_separator");
      index += 1;
      whitespace();
    }
  };
  const parseObject = (depth) => {
    const target = Object.create(null);
    const seen = new Set();
    index += 1;
    whitespace();
    if (source[index] === "}") {
      index += 1;
      return target;
    }
    while (true) {
      if (source[index] !== '"') error("object_key");
      const key = parseString();
      if (seen.has(key) || key === "__proto__" || key === "prototype" || key === "constructor") {
        error("duplicate_or_magic_key");
      }
      seen.add(key);
      whitespace();
      if (source[index] !== ":") error("object_colon");
      index += 1;
      whitespace();
      const value = parseValue(depth + 1);
      Object.defineProperty(target, key, {
        value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
      whitespace();
      if (source[index] === "}") {
        index += 1;
        return target;
      }
      if (source[index] !== ",") error("object_separator");
      index += 1;
      whitespace();
    }
  };
  const parseValue = (depth) => {
    requireNode(depth);
    whitespace();
    const character = source[index];
    if (character === '"') return parseString();
    if (character === "{") return parseObject(depth);
    if (character === "[") return parseArray(depth);
    if (source.startsWith("true", index)) {
      index += 4;
      return true;
    }
    if (source.startsWith("false", index)) {
      index += 5;
      return false;
    }
    if (source.startsWith("null", index)) {
      index += 4;
      return null;
    }
    const number = source
      .slice(index)
      .match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u);
    if (number === null) error("value");
    const parsed = Number(number[0]);
    if (!Number.isFinite(parsed)) error("number_nonfinite");
    index += number[0].length;
    return parsed;
  };

  whitespace();
  const value = parseValue(0);
  whitespace();
  if (index !== source.length) error("trailing");
  return value;
}

function collectTask551JsonFences(text, path) {
  const records = [];
  for (const match of text.matchAll(TASK551_FENCED_JSON)) {
    const raw = match[1] ?? "";
    // Parse every bounded JSON fence before deciding whether it belongs to the
    // dispatch namespace. A raw substring check misses escaped schema strings
    // (for example `workflow-dispatch\\u002dgraph@v1`) and lets a second
    // authority evade the cardinality checks below.
    const parsed = parseDuplicateKeyAwareJson(raw, `json:${path}`);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) continue;
    const schema = parsed.schema;
    if (typeof schema !== "string" || !schema.startsWith("coderso.task551.workflow-dispatch"))
      continue;
    if (schema !== TASK551_GRAPH_SCHEMA && schema !== TASK551_ENVELOPE_SCHEMA) {
      fail(`json_schema_unsupported:${path}`);
    }
    records.push({ schema, value: parsed });
  }
  return records;
}

function readSingleMarkdownField(text, expression, code, { optional = false } = {}) {
  const matches = [...text.matchAll(expression)];
  if (matches.length === 0 && optional) return undefined;
  if (matches.length !== 1) fail(code);
  return matches[0][1];
}

function expectedTaskIdFromPath(path) {
  const basename = path.slice(TASK551_TASKS_PREFIX.length);
  if (/^TASK-551_[A-Za-z0-9][A-Za-z0-9._-]*\.md$/u.test(basename)) return "TASK-551";
  const leaf = basename.match(/^(TASK-551-[0-9]{2}-L[0-9]{2})-[A-Za-z0-9][A-Za-z0-9._-]*\.md$/u);
  if (leaf !== null) return leaf[1];
  const child = basename.match(/^(TASK-551-[0-9]{2})-[A-Za-z0-9][A-Za-z0-9._-]*\.md$/u);
  if (child !== null) return child[1];
  fail(`metadata_path_task_id:${path}`);
}

function readTask551Metadata(path, text) {
  const fileName = readSingleMarkdownField(
    text,
    /^# FileName: ([^\r\n]+)$/gmu,
    `metadata_filename:${path}`
  );
  const h1 = readSingleMarkdownField(
    text,
    /^# (TASK-551(?:-[0-9]{2}(?:-L[0-9]{2})?)?): [^\r\n]+$/gmu,
    `metadata_h1:${path}`
  );
  const status = readSingleMarkdownField(
    text,
    /^\*\*Status:\*\* ([^\r\n]+)$/gmu,
    `metadata_status:${path}`
  );
  const parentTaskId = readSingleMarkdownField(
    text,
    /^\*\*Parent Task:\*\* ([^\r\n]+)$/gmu,
    `metadata_parent_task:${path}`,
    { optional: true }
  );
  const parentSubtaskId = readSingleMarkdownField(
    text,
    /^\*\*Parent Subtask:\*\* ([^\r\n]+)$/gmu,
    `metadata_parent_subtask:${path}`,
    { optional: true }
  );
  const basename = path.slice(TASK551_TASKS_PREFIX.length);
  const expectedTaskId = expectedTaskIdFromPath(path);
  if (fileName !== basename || h1 !== expectedTaskId || !TASK551_ALLOWED_STATUSES.has(status)) {
    fail(`metadata_mismatch:${path}`);
  }
  if (h1 === "TASK-551") {
    if (parentTaskId !== undefined || parentSubtaskId !== undefined)
      fail(`metadata_parent_root:${path}`);
    return { path, taskId: h1, status, kind: "parent" };
  }
  if (/^TASK-551-[0-9]{2}$/u.test(h1)) {
    if (parentTaskId !== "TASK-551" || parentSubtaskId !== undefined)
      fail(`metadata_parent_child:${path}`);
    return { path, taskId: h1, status, kind: "child" };
  }
  if (!/^TASK-551-[0-9]{2}-L[0-9]{2}$/u.test(h1)) fail(`metadata_task_id:${path}`);
  const expectedSubtask = h1.replace(/-L[0-9]{2}$/u, "");
  if (
    parentSubtaskId !== expectedSubtask ||
    (parentTaskId !== undefined && parentTaskId !== "TASK-551")
  ) {
    fail(`metadata_parent_leaf:${path}`);
  }
  return {
    path,
    taskId: h1,
    status,
    kind: "leaf",
    parentSubtaskId: expectedSubtask,
  };
}

function requirePathList(value, code, { min = 0 } = {}) {
  const paths = requireOwnDataArray(value, code, { min, max: 4_096 });
  return requireUniqueStrings(paths, code, (path) => requireRepoPath(path, code));
}

function requireNodeId(value, code) {
  return requireLiteralId(value, code, /^TASK-551-[0-9]{2}-L[0-9]{2}:(?:initial|single|final)$/u);
}

function requireCommandId(value, code) {
  return requireLiteralId(value, code, /^[a-z0-9][a-z0-9-]{0,127}$/u);
}

function requireLiteralArgv(value, code) {
  const argv = requireOwnDataArray(value, code, { min: 1, max: 128 });
  return argv.map((token, index) => {
    const literal = requireText(token, code, { max: 4_096 });
    // Bun's direct `-e` argument is an argv value, not a shell fragment. Its
    // task-owned line-count program is intentionally literal and bounded.
    if (index > 0 && argv[index - 1] === "-e") return literal;
    if (
      /[\n\r\t`$*?\[\]{}|&;<>]/u.test(literal) ||
      literal === "source" ||
      literal === "." ||
      /^[A-Za-z_][A-Za-z0-9_]*=/u.test(literal)
    ) {
      fail(code);
    }
    return literal;
  });
}

function normalizePositiveDiscovery(value, lane, argv, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const kind = value.kind;
  if (kind === "not-applicable") {
    requireJsonRecord(value, ["kind"], code);
    if (lane === "bun-test" || lane === "vitest") fail(code);
    return Object.freeze({ kind });
  }
  if (kind !== "test-paths") fail(code);
  requireJsonRecord(value, ["kind", "paths", "minimum"], code);
  if (lane !== "bun-test" && lane !== "vitest") fail(code);
  if (!Number.isSafeInteger(value.minimum) || value.minimum < 1) fail(code);
  const paths = requirePathList(value.paths, code, { min: 1 });
  if (
    paths.some(
      (path) =>
        !path.startsWith("tests/") || (!path.endsWith(".test.ts") && !path.endsWith(".test.tsx"))
    )
  ) {
    fail(code);
  }
  if (paths.some((path) => !argv.includes(path))) fail(code);
  return Object.freeze({ kind, paths: Object.freeze(paths), minimum: value.minimum });
}

function normalizeEnvironmentOverrides(value, profile, code) {
  if (profile !== "task551-redis-test") fail(code);
  requireJsonRecord(value, Object.keys(value).sort(), code);
  const keys = Object.keys(value).sort();
  if (
    keys.length === 0 ||
    keys.some((key) => !["SERVER_CACHE_BACKEND", "SERVER_CACHE_NAMESPACE"].includes(key))
  ) {
    fail(code);
  }
  const normalized = {};
  if (Object.hasOwn(value, "SERVER_CACHE_BACKEND")) {
    if (value.SERVER_CACHE_BACKEND !== "redis") fail(code);
    normalized.SERVER_CACHE_BACKEND = "redis";
  }
  if (Object.hasOwn(value, "SERVER_CACHE_NAMESPACE")) {
    const namespace = requireText(value.SERVER_CACHE_NAMESPACE, code, { max: 63 });
    if (!/^task551-[a-z0-9-]{1,55}$/u.test(namespace)) fail(code);
    normalized.SERVER_CACHE_NAMESPACE = namespace;
  }
  return Object.freeze(normalized);
}

function normalizeCommand(value, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const hasOverrides = Object.hasOwn(value, "environmentOverrides");
  requireJsonRecord(
    value,
    hasOverrides ? [...TASK551_COMMAND_KEYS, "environmentOverrides"] : TASK551_COMMAND_KEYS,
    code
  );
  const id = requireCommandId(value.id, code);
  const lane = requireLiteralId(value.lane, code, /^[a-z-]+$/u);
  if (!TASK551_LANES.has(lane)) fail(code);
  const environmentProfile = requireLiteralId(value.environmentProfile, code, /^[a-z0-9-]+$/u);
  if (!TASK551_ENVIRONMENT_PROFILES.has(environmentProfile)) fail(code);
  const argv = requireLiteralArgv(value.argv, code);
  if (environmentProfile !== "none" && (argv[0] !== "bun" || argv[1] !== "--env-file=/dev/null")) {
    fail(code);
  }
  const positiveDiscovery = normalizePositiveDiscovery(value.positiveDiscovery, lane, argv, code);
  const command = { id, lane, environmentProfile, argv: Object.freeze(argv), positiveDiscovery };
  if (hasOverrides)
    command.environmentOverrides = normalizeEnvironmentOverrides(
      value.environmentOverrides,
      environmentProfile,
      code
    );
  return Object.freeze(command);
}

function normalizeOccurrence(value, code) {
  requireJsonRecord(value, TASK551_OCCURRENCE_KEYS, code);
  const id = requireLiteralId(value.id, code, /^(?:initial|single|final)$/u);
  if (!TASK551_OCCURRENCE_IDS.has(id)) fail(code);
  const dependsOn = requireUniqueStrings(
    requireOwnDataArray(value.dependsOn, code, { max: 64 }),
    code,
    (dependency) => requireNodeId(dependency, code)
  );
  const commandIds = requireUniqueStrings(
    requireOwnDataArray(value.commandIds, code, { min: 1, max: 256 }),
    code,
    (commandId) => requireCommandId(commandId, code)
  );
  return Object.freeze({
    id,
    dependsOn: Object.freeze(dependsOn),
    commandIds: Object.freeze(commandIds),
  });
}

function normalizeClassifierBarrier(value, code) {
  requireJsonRecord(value, TASK551_CLASSIFIER_BARRIER_KEYS, code);
  if (
    typeof value.exactFourTestPrerequisite !== "boolean" ||
    typeof value.exactNinePathManifestMembershipPostchecks !== "boolean" ||
    typeof value.currentByteState !== "boolean"
  )
    fail(code);
  return Object.freeze({
    exactFourTestPrerequisite: value.exactFourTestPrerequisite,
    classifierManifestDeltaPath: requireRepoPath(value.classifierManifestDeltaPath, code),
    exactNinePathManifestMembershipPostchecks: value.exactNinePathManifestMembershipPostchecks,
    currentByteState: value.currentByteState,
  });
}

function normalizeReviewBarrier(value, code) {
  requireJsonRecord(value, TASK551_REVIEW_BARRIER_KEYS, code);
  for (const key of [
    "validatedSnapshotRegistrationHook",
    "publicTransition",
    "activeStateTransitionReceiptSchema",
    "activeStateTransitionReceiptNormalizer",
    "reviewedStateAttestationNormalizer",
    "l02CodeTestMaterializationClosure",
    "materializationClosureTiming",
    "finalLeafClosureTiming",
  ])
    requireText(value[key], code, { max: 160 });
  for (const key of [
    "inMemoryExpectedStateDigestRebase",
    "sourceFree",
    "zeroCheckDispatchesOnFailure",
  ])
    if (typeof value[key] !== "boolean") fail(code);
  return Object.freeze({
    validatedSnapshotRegistrationHook: value.validatedSnapshotRegistrationHook,
    publicTransition: value.publicTransition,
    activeStateTransitionReceiptSchema: value.activeStateTransitionReceiptSchema,
    activeStateTransitionReceiptNormalizer: value.activeStateTransitionReceiptNormalizer,
    reviewedStateAttestationNormalizer: value.reviewedStateAttestationNormalizer,
    inMemoryExpectedStateDigestRebase: value.inMemoryExpectedStateDigestRebase,
    l02CodeTestMaterializationClosure: value.l02CodeTestMaterializationClosure,
    materializationClosureTiming: value.materializationClosureTiming,
    finalLeafClosureTiming: value.finalLeafClosureTiming,
    sourceFree: value.sourceFree,
    zeroCheckDispatchesOnFailure: value.zeroCheckDispatchesOnFailure,
  });
}

function normalizeSubgate(value, code) {
  requireJsonRecord(value, TASK551_SUBGATE_KEYS, code);
  const kind = requireLiteralId(
    value.kind,
    code,
    /^(?:classifier-materialization|reviewed-pair-transition)$/u
  );
  if (!Number.isSafeInteger(value.ordinal) || (value.ordinal !== 1 && value.ordinal !== 2))
    fail(code);
  const afterCommandIds = requireUniqueStrings(
    requireOwnDataArray(value.afterCommandIds, code, { max: 256 }),
    code,
    (commandId) => requireCommandId(commandId, code)
  );
  return Object.freeze({
    id: requireCommandId(value.id, code),
    kind,
    ordinal: value.ordinal,
    ownerTaskId: requireLiteralId(value.ownerTaskId, code, /^TASK-551-[0-9]{2}$/u),
    occurrenceId: requireLiteralId(value.occurrenceId, code, /^(?:initial|single|final)$/u),
    afterCommandIds: Object.freeze(afterCommandIds),
    beforeCommandId: requireCommandId(value.beforeCommandId, code),
    barrier:
      kind === "classifier-materialization"
        ? normalizeClassifierBarrier(value.barrier, code)
        : normalizeReviewBarrier(value.barrier, code),
  });
}

function normalizeEnvelopeSubgates(
  value,
  prerequisites,
  metadata,
  occurrences,
  hasSubgates,
  hasPrerequisites
) {
  const code = `envelope_subgate:${metadata.path}`;
  if (metadata.taskId !== "TASK-551-01-L02") {
    if (hasSubgates || hasPrerequisites) fail(`envelope_subgate_owner:${metadata.path}`);
    return Object.freeze({ workflowPrerequisites: Object.freeze([]), subgates: Object.freeze([]) });
  }
  if (!hasSubgates || !hasPrerequisites) fail(`envelope_subgate_required:${metadata.path}`);
  const workflowPrerequisites = Object.freeze(
    requireUniqueStrings(
      requireOwnDataArray(prerequisites, code, { min: 1, max: 1 }),
      code,
      (item) => requireLiteralId(item, code, /^TASK-551-11:compatibility-bootstrap@v2$/u)
    )
  );
  const subgates = Object.freeze(
    requireOwnDataArray(value, code, { min: 2, max: 2 }).map((subgate) =>
      normalizeSubgate(subgate, code)
    )
  );
  const occurrence = occurrences.find((candidate) => candidate.id === "single");
  if (occurrence === undefined) fail(`envelope_subgate_occurrence:${metadata.path}`);
  for (const subgate of subgates) {
    const boundary = subgate.afterCommandIds.length;
    requireExactSequence(
      occurrence.commandIds.slice(0, boundary),
      subgate.afterCommandIds,
      `envelope_subgate_prefix:${metadata.path}`
    );
    if (occurrence.commandIds[boundary] !== subgate.beforeCommandId)
      fail(`envelope_subgate_boundary:${metadata.path}`);
  }
  const descriptor = Object.freeze({
    taskId: metadata.taskId,
    workflowPrerequisites,
    subgates,
    commandIds: Object.freeze([...occurrence.commandIds]),
  });
  try {
    requireTask551L02WorkflowCompatibilityExtensions(descriptor);
  } catch {
    fail(`envelope_subgate_contract:${metadata.path}`);
  }
  return Object.freeze({ workflowPrerequisites, subgates });
}

function normalizeEnvelope(value, metadata) {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(`envelope_record:${metadata.path}`);
  const hasArtifactPolicy = Object.hasOwn(value, "artifactPolicy");
  const hasSubgates = Object.hasOwn(value, "subgates");
  const hasWorkflowPrerequisites = Object.hasOwn(value, "workflowPrerequisites");
  requireJsonRecord(
    value,
    [
      ...TASK551_ENVELOPE_KEYS,
      ...(hasArtifactPolicy ? ["artifactPolicy"] : []),
      ...(hasSubgates ? ["subgates"] : []),
      ...(hasWorkflowPrerequisites ? ["workflowPrerequisites"] : []),
    ],
    `envelope_keys:${metadata.path}`
  );
  if (value.schema !== TASK551_ENVELOPE_SCHEMA || value.taskId !== metadata.taskId) {
    fail(`envelope_identity:${metadata.path}`);
  }
  requireJsonRecord(value.parent, TASK551_PARENT_KEYS, `envelope_parent:${metadata.path}`);
  if (value.parent.taskId !== "TASK-551" || value.parent.subtaskId !== metadata.parentSubtaskId) {
    fail(`envelope_parent:${metadata.path}`);
  }
  const allowlist = requirePathList(value.allowlist, `envelope_allowlist:${metadata.path}`, {
    min: 1,
  });
  const forbiddenPaths = requirePathList(
    value.forbiddenPaths,
    `envelope_forbidden:${metadata.path}`
  );
  if (forbiddenPaths.some((path) => allowlist.includes(path)))
    fail(`envelope_self_collision:${metadata.path}`);
  const dependencies = requireUniqueStrings(
    requireOwnDataArray(value.dependencies, `envelope_dependencies:${metadata.path}`, { max: 64 }),
    `envelope_dependencies:${metadata.path}`,
    (dependency) => requireNodeId(dependency, `envelope_dependencies:${metadata.path}`)
  );
  const commands = requireOwnDataArray(value.commands, `envelope_commands:${metadata.path}`, {
    min: 1,
    max: 512,
  }).map((command) => normalizeCommand(command, `envelope_command:${metadata.path}`));
  requireUniqueStrings(
    commands,
    `envelope_command_duplicate:${metadata.path}`,
    (command) => command.id
  );
  const occurrences = requireOwnDataArray(
    value.occurrences,
    `envelope_occurrences:${metadata.path}`,
    { min: 1, max: 3 }
  ).map((occurrence) => normalizeOccurrence(occurrence, `envelope_occurrence:${metadata.path}`));
  requireUniqueStrings(
    occurrences,
    `envelope_occurrence_duplicate:${metadata.path}`,
    (occurrence) => occurrence.id
  );
  const commandIds = new Set(commands.map((command) => command.id));
  const referencedCommandIds = new Set();
  for (const occurrence of occurrences) {
    for (const commandId of occurrence.commandIds) {
      if (!commandIds.has(commandId)) fail(`envelope_command_reference:${metadata.path}`);
      referencedCommandIds.add(commandId);
    }
  }
  if (referencedCommandIds.size !== commandIds.size)
    fail(`envelope_command_unreferenced:${metadata.path}`);
  const extensions = normalizeEnvelopeSubgates(
    value.subgates,
    value.workflowPrerequisites,
    metadata,
    occurrences,
    hasSubgates,
    hasWorkflowPrerequisites
  );
  let artifactPolicy = "none";
  if (hasArtifactPolicy) {
    artifactPolicy = requireLiteralId(
      value.artifactPolicy,
      `envelope_artifact_policy:${metadata.path}`,
      /^[a-z0-9-]+$/u
    );
    if (!TASK551_ARTIFACT_POLICIES.has(artifactPolicy))
      fail(`envelope_artifact_policy:${metadata.path}`);
  }
  if (
    (artifactPolicy === "task551-drizzle-migration-triple" &&
      metadata.taskId !== "TASK-551-05-L01") ||
    (artifactPolicy === "task551-changelog-closure-entry" && metadata.taskId !== "TASK-551-10-L02")
  ) {
    fail(`envelope_artifact_owner:${metadata.path}`);
  }
  return Object.freeze({
    taskId: metadata.taskId,
    path: metadata.path,
    parentTaskId: "TASK-551",
    parentSubtaskId: metadata.parentSubtaskId,
    allowlist: Object.freeze(allowlist),
    forbiddenPaths: Object.freeze(forbiddenPaths),
    dependencies: Object.freeze(dependencies),
    commands: Object.freeze(commands),
    occurrences: Object.freeze(occurrences),
    workflowPrerequisites: extensions.workflowPrerequisites,
    subgates: extensions.subgates,
    artifactPolicy,
  });
}

function normalizeGraph(value, path) {
  requireJsonRecord(value, TASK551_GRAPH_KEYS, `graph_keys:${path}`);
  if (value.schema !== TASK551_GRAPH_SCHEMA || value.version !== 1) fail(`graph_identity:${path}`);
  const rawNodes = requireOwnDataArray(value.nodes, `graph_nodes:${path}`, { min: 1, max: 256 });
  const nodes = [];
  const knownNodeIds = new Set();
  const knownOccurrences = new Set();
  for (let index = 0; index < rawNodes.length; index += 1) {
    const rawNode = rawNodes[index];
    requireJsonRecord(rawNode, TASK551_GRAPH_NODE_KEYS, `graph_node:${path}`);
    const taskId = requireLiteralId(
      rawNode.taskId,
      `graph_node_task:${path}`,
      /^TASK-551-[0-9]{2}-L[0-9]{2}$/u
    );
    const occurrenceId = requireLiteralId(
      rawNode.occurrenceId,
      `graph_node_occurrence:${path}`,
      /^(?:initial|single|final)$/u
    );
    const id = requireNodeId(rawNode.id, `graph_node_id:${path}`);
    if (id !== `${taskId}:${occurrenceId}` || knownNodeIds.has(id)) fail(`graph_node_id:${path}`);
    const occurrenceKey = `${taskId}:${occurrenceId}`;
    if (knownOccurrences.has(occurrenceKey)) fail(`graph_occurrence_duplicate:${path}`);
    const dependsOn = requireUniqueStrings(
      requireOwnDataArray(rawNode.dependsOn, `graph_node_dependencies:${path}`, { max: 64 }),
      `graph_node_dependencies:${path}`,
      (dependency) => requireNodeId(dependency, `graph_node_dependencies:${path}`)
    );
    if ((index === 0 && dependsOn.length !== 0) || (index > 0 && dependsOn.length === 0)) {
      fail(`graph_dependency_order:${path}`);
    }
    if (dependsOn.some((dependency) => !knownNodeIds.has(dependency))) {
      fail(`graph_dependency_order:${path}`);
    }
    knownNodeIds.add(id);
    knownOccurrences.add(occurrenceKey);
    nodes.push(Object.freeze({ id, taskId, occurrenceId, dependsOn: Object.freeze(dependsOn) }));
  }
  const groups = new Map();
  for (const node of nodes) {
    const entries = groups.get(node.taskId) ?? [];
    entries.push(node.occurrenceId);
    groups.set(node.taskId, entries);
  }
  for (const occurrences of groups.values()) {
    const validSingle = occurrences.length === 1 && occurrences[0] === "single";
    const validPhased =
      occurrences.length === 2 && occurrences[0] === "initial" && occurrences[1] === "final";
    if (!validSingle && !validPhased) fail(`graph_occurrence_group:${path}`);
  }
  return Object.freeze(nodes);
}

function validateSnapshot(input) {
  requireOwnDataRecord(input, TASK551_SNAPSHOT_KEYS, "snapshot_shape");
  const sourceHead = requireLiteralId(input.sourceHead, "snapshot_head", /^[0-9a-f]{7,64}$/u);
  const rawFiles = requireOwnDataArray(input.taskFiles, "snapshot_files", { min: 1, max: 128 });
  const files = [];
  const paths = new Set();
  for (const rawFile of rawFiles) {
    requireOwnDataRecord(rawFile, TASK551_TASK_FILE_KEYS, "snapshot_file_shape");
    const path = requireRepoPath(rawFile.path, "snapshot_file_path");
    if (
      !path.startsWith(TASK551_TASKS_PREFIX) ||
      !/^TASK-551(?:[-_][A-Za-z0-9._-]+)?\.md$/u.test(path.slice(TASK551_TASKS_PREFIX.length)) ||
      paths.has(path)
    ) {
      fail("snapshot_file_path");
    }
    paths.add(path);
    files.push({ path, text: requireText(rawFile.text, "snapshot_file_text") });
  }
  return { sourceHead, files };
}

function reconcileTask551Dispatch({ sourceHead, files }) {
  const metadata = [];
  const jsonRecords = new Map();
  for (const file of files) {
    const record = readTask551Metadata(file.path, file.text);
    metadata.push(record);
    jsonRecords.set(file.path, collectTask551JsonFences(file.text, file.path));
  }
  if (new Set(metadata.map((record) => record.taskId)).size !== metadata.length) {
    fail("task_inventory_duplicate");
  }
  const parents = metadata.filter((record) => record.kind === "parent");
  const children = metadata.filter((record) => record.kind === "child");
  const leaves = metadata.filter((record) => record.kind === "leaf");
  if (parents.length !== 1 || children.length === 0 || leaves.length === 0)
    fail("task_inventory_shape");
  const parent = parents[0];
  const childIds = new Set(
    requireUniqueStrings(children, "task_child_duplicate", (child) => child.taskId)
  );
  for (const leaf of leaves) {
    if (!childIds.has(leaf.parentSubtaskId)) fail(`task_leaf_orphan:${leaf.path}`);
  }
  for (const child of children) {
    if (jsonRecords.get(child.path).length !== 0) fail(`task_child_envelope:${child.path}`);
  }
  const parentRecords = jsonRecords.get(parent.path);
  if (parentRecords.length !== 1 || parentRecords[0].schema !== TASK551_GRAPH_SCHEMA) {
    fail(`parent_graph:${parent.path}`);
  }
  const graph = normalizeGraph(parentRecords[0].value, parent.path);
  const envelopes = [];
  for (const leaf of leaves) {
    const records = jsonRecords.get(leaf.path);
    if (records.length !== 1 || records[0].schema !== TASK551_ENVELOPE_SCHEMA) {
      fail(`leaf_envelope:${leaf.path}`);
    }
    envelopes.push(normalizeEnvelope(records[0].value, leaf));
  }
  const envelopeByTask = new Map();
  for (const envelope of envelopes) {
    if (envelopeByTask.has(envelope.taskId)) fail(`envelope_task_duplicate:${envelope.path}`);
    envelopeByTask.set(envelope.taskId, envelope);
  }
  const graphTaskIds = new Set(graph.map((node) => node.taskId));
  if (
    graphTaskIds.size !== envelopeByTask.size ||
    [...graphTaskIds].some((taskId) => !envelopeByTask.has(taskId))
  ) {
    fail("graph_envelope_task_set");
  }
  const ownerByPath = new Map();
  for (const envelope of envelopes) {
    for (const path of envelope.allowlist) {
      const owner = ownerByPath.get(path);
      if (owner !== undefined && owner !== envelope.taskId) fail(`allowlist_cross_owner:${path}`);
      ownerByPath.set(path, envelope.taskId);
    }
  }
  const graphByTask = new Map();
  for (const node of graph) {
    const entries = graphByTask.get(node.taskId) ?? [];
    entries.push(node);
    graphByTask.set(node.taskId, entries);
  }
  const dispatchOrder = [];
  for (const [taskId, envelope] of envelopeByTask) {
    const expectedNodes = graphByTask.get(taskId) ?? [];
    const expectedOccurrences = expectedNodes.map((node) => node.occurrenceId);
    requireExactSequence(
      envelope.occurrences.map((occurrence) => occurrence.id),
      expectedOccurrences,
      `occurrence_graph_set:${envelope.path}`
    );
    const expectedDependencies = [];
    for (const node of expectedNodes) {
      for (const dependency of node.dependsOn) {
        if (!expectedDependencies.includes(dependency)) expectedDependencies.push(dependency);
      }
    }
    requireExactSequence(
      envelope.dependencies,
      expectedDependencies,
      `envelope_dependencies:${envelope.path}`
    );
    for (let index = 0; index < expectedNodes.length; index += 1) {
      const node = expectedNodes[index];
      const occurrence = envelope.occurrences[index];
      requireExactSequence(
        occurrence.dependsOn,
        node.dependsOn,
        `occurrence_dependencies:${envelope.path}`
      );
    }
  }
  for (const node of graph) {
    const envelope = envelopeByTask.get(node.taskId);
    const occurrence = envelope.occurrences.find((candidate) => candidate.id === node.occurrenceId);
    const commandById = new Map(envelope.commands.map((command) => [command.id, command]));
    dispatchOrder.push(
      Object.freeze({
        id: node.id,
        taskId: node.taskId,
        occurrenceId: node.occurrenceId,
        dependsOn: Object.freeze([...node.dependsOn]),
        allowlist: Object.freeze([...envelope.allowlist]),
        forbiddenPaths: Object.freeze([...envelope.forbiddenPaths]),
        artifactPolicy: envelope.artifactPolicy,
        workflowPrerequisites: Object.freeze([...envelope.workflowPrerequisites]),
        commands: Object.freeze(
          occurrence.commandIds.map((commandId) => commandById.get(commandId))
        ),
        subgates: Object.freeze(
          envelope.subgates.filter((subgate) => subgate.occurrenceId === node.occurrenceId)
        ),
      })
    );
  }
  const taskFiles = metadata
    .map((record) =>
      Object.freeze({
        path: record.path,
        taskId: record.taskId,
        status: record.status,
        kind: record.kind,
        ...(record.parentSubtaskId === undefined
          ? {}
          : { parentSubtaskId: record.parentSubtaskId }),
      })
    )
    .sort((left, right) => left.path.localeCompare(right.path));
  return deepFreeze({
    sourceHead,
    inventory: {
      taskFileCount: taskFiles.length,
      childTaskCount: children.length,
      leafTaskCount: leaves.length,
      occurrenceCount: graph.length,
    },
    taskFiles,
    dispatchOrder,
  });
}

/**
 * Validates a strict own-data current-HEAD task-file snapshot and returns a
 * frozen dispatch projection. Neither markdown nor raw JSON source escapes
 * this function, so consumers cannot reparse or mutate the verified inputs.
 */
export function preflightTask551DispatchSnapshot(snapshot) {
  return reconcileTask551Dispatch(validateSnapshot(snapshot));
}

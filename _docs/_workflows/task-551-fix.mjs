// TASK-551-11 bounded fix-loop workflow module (single owner: TASK-551-11 sidecar).
import { createHash } from "node:crypto";
/* global process, setTimeout, clearTimeout, Bun, Buffer -- Bun-runtime workflow tooling */
//
// Owns the bounded fix loop mandated by TASK-551-11: a failed gate plus scope
// is retried through an injected fix agent for AT MOST three rounds, each round
// followed by exactly one injected verification re-run of the failing gate.
// The loop fails closed on repeated failure, on an out-of-scope edit, or on an
// invalid verification payload, and survives only on redacted telemetry:
// fixed codes, counters, booleans, and allowlisted repo paths. No raw child
// output, source value, capability state, or environment ever enters a result.
//
// It also owns the private logical argv registry and all source-child adapter
// mechanics. Author-audit deliberately neither imports nor wraps this module.

const TASK551_CHILD_DIAGNOSTIC_MAX_BYTES = 8_192;
const TASK551_CHILD_FAILURE_CODES = Object.freeze({
  stdout_reader: "task551_child_stdout_reader_failed",
  stderr_reader: "task551_child_stderr_reader_failed",
  reducer: "task551_child_reducer_failed",
  parser: "task551_child_parser_failed",
  timeout: "task551_child_timeout",
  overflow: "task551_child_overflow",
  abort: "task551_child_abort",
  spawn: "task551_child_spawn_failed",
});
const TASK551_LOGICAL_ARGV_CONTRACT_ID = "coderso.task551.logical-argv@v1";
const TASK551_LOGICAL_ARGV_PREIMAGE_MAGIC = "coderso.task551.logical-argv-preimage@v1";
const TASK551_LOGICAL_ARGV_MAX = Object.freeze({
  context: 160,
  id: 96,
  token: 4_096,
  count: 2,
  total: 16_384,
});
const TASK551_COMMAND_RECEIPT_SCHEMA = "coderso.task551.command-receipt@v1";
const task551LogicalArgvEncoder = new TextEncoder(),
  task551LogicalArgvDecoder = new TextDecoder("utf-8", { fatal: true });
const freezeTask551LogicalArgvRows = (rows) => {
  if (
    !Array.isArray(rows) ||
    rows.length !== 15 ||
    new Set(rows.map(([context]) => context)).size !== 15
  )
    throw new Error("task551_logical_argv_registry_invalid");
  return Object.freeze(
    rows.map(([commandContextId, logicalCommandId, argv]) =>
      Object.freeze({ commandContextId, logicalCommandId, argv: Object.freeze([...argv]) })
    )
  );
};
// The registry is intentionally module-private. Context (rather than command)
// is the key so equivalent small/large argv stay non-interchangeable.
const TASK551_LOGICAL_ARGV_REGISTRY = freezeTask551LogicalArgvRows([
  [
    "TASK-551-01-L03:single/focused-static-test",
    "l03-focused-test",
    ["bun", "--env-file=/dev/null", "test", "tests/perf/task551FixtureTargetBootstrap.test.ts"],
  ],
  [
    "TASK-551-01-L03:single/bootstrap-initialize",
    "l03-initialize",
    ["bun", "--env-file=/dev/null", "scripts/task-551-fixture-target-bootstrap.ts", "--initialize"],
  ],
  [
    "TASK-551-01-L03:single/bootstrap-check",
    "l03-check",
    ["bun", "--env-file=/dev/null", "scripts/task-551-fixture-target-bootstrap.ts", "--check"],
  ],
  [
    "TASK-551-01-L02:single/isolated-projection-static-small",
    "l02-static-small-baseline",
    ["bun", "--env-file=/dev/null", "test", "tests/perf/database-query-baseline.test.ts"],
  ],
  [
    "TASK-551-01-L02:single/isolated-digest-static-small",
    "l02-static-small-digest",
    [
      "bun",
      "--env-file=/dev/null",
      "test",
      "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
    ],
  ],
  [
    "TASK-551-01-L02:single/isolated-projection-static-large",
    "l02-static-large-baseline",
    ["bun", "--env-file=/dev/null", "test", "tests/perf/database-query-baseline.test.ts"],
  ],
  [
    "TASK-551-01-L02:single/isolated-digest-static-large",
    "l02-static-large-digest",
    [
      "bun",
      "--env-file=/dev/null",
      "test",
      "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
    ],
  ],
  [
    "TASK-551-01-L02:single/freeze-small",
    "l02-freeze",
    [
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-database-baseline.ts",
      "--freeze",
      "--profile",
      "small",
      "--all",
    ],
  ],
  [
    "TASK-551-01-L02:single/freeze-large",
    "l02-freeze",
    [
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-database-baseline.ts",
      "--freeze",
      "--profile",
      "large",
      "--all",
    ],
  ],
  [
    "TASK-551-01-L02:single/check-small",
    "l02-check",
    [
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-database-baseline.ts",
      "--check",
      "--profile",
      "small",
      "--all",
    ],
  ],
  [
    "TASK-551-01-L02:single/check-large",
    "l02-check",
    [
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-database-baseline.ts",
      "--check",
      "--profile",
      "large",
      "--all",
    ],
  ],
  [
    "TASK-551-05-L02:single/database-explain-plans-test",
    "05-l02-explain-plans-test",
    ["bun", "--env-file=/dev/null", "test", "tests/perf/database-explain-plans.test.ts"],
  ],
  [
    "TASK-551-05-L02:single/task489-predecessor-plans-test",
    "05-l02-predecessor-test",
    [
      "bun",
      "--env-file=/dev/null",
      "test",
      "tests/perf/task489-solution-kit-run-predecessor-plans.test.ts",
    ],
  ],
  [
    "TASK-551-05-L02:single/explain-plan-small-check",
    "05-l02-explain-small",
    [
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-explain-plans.ts",
      "--scale",
      "small",
      "--check",
    ],
  ],
  [
    "TASK-551-05-L02:single/explain-plan-large-check",
    "05-l02-explain-large",
    [
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-explain-plans.ts",
      "--scale",
      "large",
      "--check",
    ],
  ],
]);
const TASK551_LOGICAL_ARGV_BY_CONTEXT = new Map(
  TASK551_LOGICAL_ARGV_REGISTRY.map((row) => [row.commandContextId, row])
);

// ---------------------------------------------------------------------------
// Bounded fix loop (injected fix agents; never spawned here)
// ---------------------------------------------------------------------------

/** Hard ceiling mandated by the task contract: at most three fix rounds. */
export const TASK551_FIX_MAX_ROUNDS = 3;

export const TASK551_FIX_TERMINAL_CODES = Object.freeze({
  roundsExhausted: "task551_fix_rounds_exhausted",
  outOfScope: "task551_fix_out_of_scope",
  verificationInvalid: "task551_fix_verification_invalid",
  snapshotInvalid: "task551_fix_snapshot_invalid",
});

const SNAPSHOT_DIGEST_RE = /^(?:sha256:)?[a-f0-9]{64}$/;

const FAILED_GATE_REQUIRED_KEYS = Object.freeze(["gateId", "scope", "exitCode"]);
const FAILED_GATE_OPTIONAL_KEYS = Object.freeze(["signalCode", "stdoutBytes", "stderrBytes"]);
const TASK551_CHILD_TIMEOUT_MAX_MS = 600_000;
const TASK551_CHILD_MAX_OUTPUT_BYTES_LIMIT = 16 * 1024 * 1024;
const TASK551_CHILD_KILL_GRACE_MAX_MS = 60_000;

/**
 * The workflow receives values from injected agents.  Object.keys alone is not
 * sufficient here: inherited fields and accessors can manufacture a seemingly
 * valid result after the shape check.  Require an ordinary object whose whole
 * enumerable surface is made of own data properties.
 */
function isPlainOwnDataRecord(value, expectedKeys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    if (Object.getPrototypeOf(value) !== Object.prototype) return false;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) return false;
    if (
      expectedKeys !== undefined &&
      (ownKeys.length !== expectedKeys.length || ownKeys.some((key) => !expectedKeys.includes(key)))
    )
      return false;
    for (const key of expectedKeys ?? ownKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value") ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}

const TASK551_LOGICAL_RECEIPT_KEYS = Object.freeze([
  "schema",
  "logicalCommandId",
  "commandContextId",
  "logicalArgv",
  "process",
  "discovery",
]);
const TASK551_LOGICAL_DESCRIPTOR_KEYS = Object.freeze([
  "contractId",
  "sha256",
  "argCount",
  "envFile",
]);
const TASK551_LOGICAL_PROCESS_KEYS = Object.freeze([
  "status",
  "result",
  "exitCode",
  "signalCode",
  "stdoutBytes",
  "stderrBytes",
  "killStrategy",
]);
const TASK551_LOGICAL_DISCOVERY_KEYS = Object.freeze(["kind", "discoveredTestCount", "positive"]);
const TASK551_BOUNDED_CHILD_INPUT_KEYS = Object.freeze([
  "commandContextId",
  "logicalCommandId",
  "profile",
  "bunExecutablePath",
  "env",
  "cwd",
  "discovery",
  "spawn",
  "timeoutMs",
  "maxOutputBytes",
  "killGraceMs",
]);
const TASK551_RECEIPT_MAX_OUTPUT_BYTES = 1_048_576;
const TASK551_RECEIPT_MAX_DISCOVERED_TESTS = 1_048_576;
const TASK551_RECEIPT_MAX_SIGNAL_CODE = 255;
const TASK551_RECEIPT_KILL_STRATEGIES = Object.freeze([
  "none",
  "process_group",
  "root_pid_fallback",
  "already_gone",
  "taskkill_tree",
]);

function task551ExactOwn(value, keys, code) {
  if (
    !isPlainOwnDataRecord(value) ||
    (!Object.isFrozen(value) && code !== "task551_logical_argv_input_invalid")
  )
    throw new Error(code);
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some((key, index) => key !== keys[index]))
    throw new Error(code);
  return value;
}
function task551StrictUtf8(value, max, code) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0"))
    throw new Error(code);
  const bytes = task551LogicalArgvEncoder.encode(value);
  if (bytes.byteLength > max || task551LogicalArgvDecoder.decode(bytes) !== value)
    throw new Error(code);
  return bytes;
}
function task551LogicalArgvRow(commandContextId, logicalCommandId, profile, enforceProfile) {
  const row = TASK551_LOGICAL_ARGV_BY_CONTEXT.get(commandContextId);
  if (row === undefined) throw new Error("task551_command_context_unknown");
  if (row.logicalCommandId !== logicalCommandId) throw new Error("task551_command_id_mismatch");
  const profileIndex = Math.max(row.argv.indexOf("--profile"), row.argv.indexOf("--scale")),
    expectedProfile = profileIndex < 0 ? null : row.argv[profileIndex + 1];
  if (
    row.argv[0] !== "bun" ||
    row.argv[1] !== "--env-file=/dev/null" ||
    (profileIndex >= 0 &&
      (profileIndex + 1 >= row.argv.length || !["small", "large"].includes(expectedProfile)))
  )
    throw new Error("task551_logical_argv_registry_invalid");
  if (enforceProfile) {
    if (expectedProfile === null && profile !== undefined)
      throw new Error(`task551_command_profile_not_allowed:${logicalCommandId}`);
    if (expectedProfile !== null && profile === undefined)
      throw new Error(`task551_command_profile_missing:${logicalCommandId}`);
    if (expectedProfile !== null && profile !== expectedProfile)
      throw new Error(`task551_command_profile_crossed:${logicalCommandId}`);
  }
  return row;
}
function encodeTask551LogicalArgvPreimageV1(row) {
  const fields = [
    TASK551_LOGICAL_ARGV_PREIMAGE_MAGIC,
    TASK551_LOGICAL_ARGV_CONTRACT_ID,
    row.commandContextId,
    row.logicalCommandId,
    String(row.argv.length),
    ...row.argv,
  ];
  if (row.argv.length < 2 || row.argv.length > 16 || !/^(?:[2-9]|1[0-6])$/u.test(fields[4]))
    throw new Error("task551_logical_argv_frame_invalid");
  let total = 0;
  const encoded = fields.map((field, index) => {
    const max =
      index === 2
        ? TASK551_LOGICAL_ARGV_MAX.context
        : index === 3
          ? TASK551_LOGICAL_ARGV_MAX.id
          : index === 4
            ? TASK551_LOGICAL_ARGV_MAX.count
            : TASK551_LOGICAL_ARGV_MAX.token;
    const bytes = task551StrictUtf8(field, max, "task551_logical_argv_frame_invalid");
    if (bytes.byteLength >= 0xffff_ffff) throw new Error("task551_logical_argv_length_overflow");
    const frameLength = 4 + bytes.byteLength;
    if (total > TASK551_LOGICAL_ARGV_MAX.total - frameLength)
      throw new Error("task551_logical_argv_length_overflow");
    total += frameLength;
    return bytes;
  });
  const output = new Uint8Array(total);
  let offset = 0;
  for (const bytes of encoded) {
    new DataView(output.buffer, output.byteOffset + offset, 4).setUint32(
      0,
      bytes.byteLength,
      false
    );
    offset += 4;
    output.set(bytes, offset);
    offset += bytes.byteLength;
  }
  return output;
}
function decodeTask551LogicalArgvPreimageV1(bytes) {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength === 0 ||
    bytes.byteLength > TASK551_LOGICAL_ARGV_MAX.total
  )
    throw new Error("task551_logical_argv_frame_invalid");
  const fields = [];
  let offset = 0;
  while (offset < bytes.byteLength) {
    if (bytes.byteLength - offset < 4) throw new Error("task551_logical_argv_frame_invalid");
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
    offset += 4;
    if (
      length === 0xffff_ffff ||
      length > bytes.byteLength - offset ||
      offset + length > TASK551_LOGICAL_ARGV_MAX.total
    )
      throw new Error(
        length === 0xffff_ffff
          ? "task551_logical_argv_length_overflow"
          : "task551_logical_argv_frame_invalid"
      );
    let field;
    try {
      field = task551LogicalArgvDecoder.decode(bytes.subarray(offset, offset + length));
    } catch {
      throw new Error("task551_logical_argv_frame_invalid");
    }
    const max =
      fields.length === 2
        ? TASK551_LOGICAL_ARGV_MAX.context
        : fields.length === 3
          ? TASK551_LOGICAL_ARGV_MAX.id
          : fields.length === 4
            ? TASK551_LOGICAL_ARGV_MAX.count
            : TASK551_LOGICAL_ARGV_MAX.token;
    if (
      field.includes("\0") ||
      task551LogicalArgvEncoder.encode(field).byteLength !== length ||
      task551StrictUtf8(field, max, "task551_logical_argv_frame_invalid").some(
        (byte, index) => byte !== bytes[offset + index]
      )
    )
      throw new Error("task551_logical_argv_frame_invalid");
    fields.push(field);
    offset += length;
  }
  const [magic, contractId, commandContextId, logicalCommandId, countText, ...argv] = fields;
  if (
    magic !== TASK551_LOGICAL_ARGV_PREIMAGE_MAGIC ||
    contractId !== TASK551_LOGICAL_ARGV_CONTRACT_ID ||
    !/^(?:[2-9]|1[0-6])$/u.test(countText) ||
    Number(countText) !== argv.length
  )
    throw new Error("task551_logical_argv_frame_invalid");
  const row = task551LogicalArgvRow(commandContextId, logicalCommandId, undefined, false);
  if (argv.length !== row.argv.length || argv.some((token, index) => token !== row.argv[index]))
    throw new Error("task551_logical_argv_frame_invalid");
  return row;
}
function task551LogicalArgvDescriptor(row) {
  const preimage = encodeTask551LogicalArgvPreimageV1(row);
  try {
    return Object.freeze({
      contractId: TASK551_LOGICAL_ARGV_CONTRACT_ID,
      sha256: createHash("sha256").update(preimage).digest("hex"),
      argCount: row.argv.length,
      envFile: "--env-file=/dev/null",
    });
  } finally {
    preimage.fill(0);
  }
}
function task551ProcessReceipt(value) {
  task551ExactOwn(value, TASK551_LOGICAL_PROCESS_KEYS, "task551_logical_argv_receipt_invalid");
  const signal = value.signalCode;
  const validSignal =
    signal === null ||
    (typeof signal === "string" && /^SIG[A-Z0-9_]{1,29}$/u.test(signal)) ||
    (Number.isSafeInteger(signal) && signal >= 1 && signal <= TASK551_RECEIPT_MAX_SIGNAL_CODE);
  const boundedCounter = (counter) =>
    Number.isSafeInteger(counter) && counter >= 0 && counter <= TASK551_RECEIPT_MAX_OUTPUT_BYTES;
  const passed =
    value.status === "passed" &&
    value.result === "zero_exit" &&
    value.exitCode === 0 &&
    signal === null &&
    value.killStrategy === "none";
  const failedExit = value.exitCode > 0 && signal === null;
  const failedSignal =
    typeof signal === "number"
      ? value.exitCode === 0
      : typeof signal === "string" && value.exitCode >= 128;
  const failed =
    value.status === "failed" &&
    value.result === "nonzero_exit" &&
    (failedExit || failedSignal) &&
    TASK551_RECEIPT_KILL_STRATEGIES.includes(value.killStrategy);
  if (
    (!passed && !failed) ||
    !Number.isSafeInteger(value.exitCode) ||
    value.exitCode < 0 ||
    value.exitCode > 255 ||
    !validSignal ||
    !boundedCounter(value.stdoutBytes) ||
    !boundedCounter(value.stderrBytes)
  )
    throw new Error("task551_logical_argv_receipt_invalid");
  return Object.freeze({ ...value });
}
function task551DiscoveryReceipt(row, value) {
  task551ExactOwn(value, TASK551_LOGICAL_DISCOVERY_KEYS, "task551_logical_argv_receipt_invalid");
  const test = row.argv[2] === "test";
  if (
    (test &&
      (value.kind !== "test-paths" ||
        !Number.isSafeInteger(value.discoveredTestCount) ||
        value.discoveredTestCount < 1 ||
        value.discoveredTestCount > TASK551_RECEIPT_MAX_DISCOVERED_TESTS ||
        value.positive !== true)) ||
    (!test &&
      (value.kind !== "not-applicable" ||
        value.discoveredTestCount !== null ||
        value.positive !== false))
  )
    throw new Error("task551_logical_argv_receipt_invalid");
  return Object.freeze({ ...value });
}
function task551LogicalReceipt(row, process, discovery) {
  return Object.freeze({
    schema: TASK551_COMMAND_RECEIPT_SCHEMA,
    logicalCommandId: row.logicalCommandId,
    commandContextId: row.commandContextId,
    logicalArgv: task551LogicalArgvDescriptor(row),
    process: task551ProcessReceipt(process),
    discovery: task551DiscoveryReceipt(row, discovery),
  });
}
/** Strict redacted receipt validator; it never exposes a row, argv, or preimage. */
export function requireTask551CommandReceiptV1(value) {
  task551ExactOwn(value, TASK551_LOGICAL_RECEIPT_KEYS, "task551_logical_argv_receipt_invalid");
  if (value.schema !== TASK551_COMMAND_RECEIPT_SCHEMA)
    throw new Error("task551_logical_argv_receipt_invalid");
  const row = task551LogicalArgvRow(
    value.commandContextId,
    value.logicalCommandId,
    undefined,
    false
  );
  task551ExactOwn(
    value.logicalArgv,
    TASK551_LOGICAL_DESCRIPTOR_KEYS,
    "task551_logical_argv_receipt_invalid"
  );
  const expected = task551LogicalArgvDescriptor(row),
    descriptor = value.logicalArgv;
  if (
    descriptor.contractId !== expected.contractId ||
    !/^[0-9a-f]{64}$/u.test(descriptor.sha256) ||
    descriptor.sha256 !== expected.sha256 ||
    descriptor.argCount !== expected.argCount ||
    descriptor.envFile !== expected.envFile
  )
    throw new Error("task551_logical_argv_digest_invalid");
  task551ProcessReceipt(value.process);
  task551DiscoveryReceipt(row, value.discovery);
  return true;
}
/** Decoder surface returns only a redacted descriptor, never raw logical argv. */
export function requireTask551LogicalArgvPreimageV1(bytes) {
  return task551LogicalArgvDescriptor(decodeTask551LogicalArgvPreimageV1(bytes));
}
for (const row of TASK551_LOGICAL_ARGV_REGISTRY)
  decodeTask551LogicalArgvPreimageV1(encodeTask551LogicalArgvPreimageV1(row));

function requireFixTimeout(value) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("task551_fix_timeout_invalid");
  }
  return value;
}

function snapshotAllowedPaths(allowedPaths) {
  if (!Array.isArray(allowedPaths) || allowedPaths.length === 0) {
    throw new Error("task551_fix_allowed_paths_missing");
  }
  const seen = new Set();
  for (const path of allowedPaths) {
    if (typeof path !== "string" || path.length === 0) {
      throw new Error("task551_fix_allowed_path_invalid");
    }
    seen.add(path);
  }
  return Object.freeze([...seen]);
}

/** Strict reject-unknown normalization of a failed-gate descriptor. */
export function normalizeTask551FailedGate(raw) {
  if (!isPlainOwnDataRecord(raw)) throw new Error("task551_failed_gate_not_object");
  const allowed = new Set([...FAILED_GATE_REQUIRED_KEYS, ...FAILED_GATE_OPTIONAL_KEYS]);
  const own = Reflect.ownKeys(raw);
  for (const key of own)
    if (!allowed.has(key)) throw new Error(`task551_failed_gate_unknown_key:${key}`);
  for (const key of FAILED_GATE_REQUIRED_KEYS)
    if (!Object.hasOwn(raw, key)) throw new Error(`task551_failed_gate_missing_key:${key}`);
  if (typeof raw.gateId !== "string" || raw.gateId.length === 0)
    throw new Error("task551_failed_gate_gateid_invalid");
  if (typeof raw.scope !== "string" || raw.scope.length === 0)
    throw new Error("task551_failed_gate_scope_invalid");
  if (!Number.isInteger(raw.exitCode) || raw.exitCode < 0)
    throw new Error("task551_failed_gate_exit_code_invalid");
  if (
    raw.signalCode !== undefined &&
    raw.signalCode !== null &&
    (typeof raw.signalCode !== "string" || raw.signalCode.length === 0)
  ) {
    throw new Error("task551_failed_gate_signal_invalid");
  }
  for (const key of ["stdoutBytes", "stderrBytes"]) {
    if (raw[key] !== undefined && (!Number.isInteger(raw[key]) || raw[key] < 0)) {
      throw new Error(`task551_failed_gate_counter_invalid:${key}`);
    }
  }
  return Object.freeze({
    gateId: raw.gateId,
    scope: raw.scope,
    exitCode: raw.exitCode,
    signalCode: raw.signalCode ?? null,
    stdoutBytes: raw.stdoutBytes,
    stderrBytes: raw.stderrBytes,
  });
}

/**
 * Normalizes one fix-agent result against the owning phase's single-writer
 * closed allowlist. Statuses have disjoint exact payload shapes: only a
 * completed result may claim paths, and an unknown status can never become a
 * successful completion by default.
 */
export function normalizeTask551FixAgentResult(raw, allowedPaths) {
  const allowed = new Set(snapshotAllowedPaths(allowedPaths));
  const malformed = () => Object.freeze({ status: "malformed", changedPaths: Object.freeze([]) });
  if (!isPlainOwnDataRecord(raw)) return malformed();
  const own = Reflect.ownKeys(raw);
  if (!Object.hasOwn(raw, "status") || typeof raw.status !== "string") return malformed();
  if (raw.status === "timeout" || raw.status === "error") {
    if (own.length !== 1 || own[0] !== "status") return malformed();
    return Object.freeze({ status: raw.status, changedPaths: Object.freeze([]) });
  }
  if (
    raw.status !== "completed" ||
    own.length !== 2 ||
    !own.includes("status") ||
    !own.includes("changedPaths") ||
    !Array.isArray(raw.changedPaths)
  )
    return malformed();
  const seen = new Set();
  for (const path of raw.changedPaths) {
    if (typeof path !== "string" || path.length === 0 || seen.has(path)) return malformed();
    seen.add(path);
    if (!allowed.has(path)) {
      return Object.freeze({ status: "out_of_scope", changedPaths: Object.freeze([path]) });
    }
  }
  return Object.freeze({
    status: "completed",
    changedPaths: Object.freeze([...raw.changedPaths].sort()),
  });
}

/**
 * Strict verification payload: EXACTLY `{ pass: boolean }`. Anything else is
 * invalid and fails the loop closed rather than being guessed about.
 */
export function evaluateTask551FixVerification(raw) {
  if (!isPlainOwnDataRecord(raw, ["pass"]) || typeof raw.pass !== "boolean") {
    throw new Error("task551_fix_verification_shape_invalid");
  }
  return raw.pass;
}

function awaitBounded(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(undefined), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function invokeFixAgent(agent, argument, timeoutMs) {
  if (typeof agent !== "function") return { status: "malformed" };
  try {
    const raw = await awaitBounded(
      Promise.resolve().then(() => agent(argument)),
      timeoutMs
    );
    if (raw === undefined) return { status: "timeout" };
    return raw;
  } catch {
    return { status: "error" };
  }
}

function normalizeSnapshotPath(path) {
  // Snapshot paths are repository-relative names, never absolute/traversal
  // spellings. Keep this local because the provider is an injected boundary.
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").includes("..") ||
    path.includes("//")
  ) {
    throw new Error("task551_fix_authoritative_snapshot_invalid");
  }
  return path;
}

function normalizeAuthoritativeSnapshot(raw) {
  // Arrays and `{ changedPaths }` remain accepted as a compatibility seam for
  // callers that can only observe names. A full snapshot should use
  // `{ files: [{ path, digest }] }`, which catches edits to an existing path as
  // well as additions/removals.
  let entries;
  if (Array.isArray(raw)) {
    entries = raw.map((path) => ({ path: normalizeSnapshotPath(path), digest: null }));
  } else if (isPlainOwnDataRecord(raw, ["changedPaths"]) && Array.isArray(raw.changedPaths)) {
    entries = raw.changedPaths.map((path) => ({ path: normalizeSnapshotPath(path), digest: null }));
  } else if (isPlainOwnDataRecord(raw, ["files"]) && Array.isArray(raw.files)) {
    entries = raw.files.map((entry) => {
      if (
        !isPlainOwnDataRecord(entry, ["path", "digest"]) ||
        typeof entry.path !== "string" ||
        !SNAPSHOT_DIGEST_RE.test(entry.digest)
      ) {
        throw new Error("task551_fix_authoritative_snapshot_invalid");
      }
      return { path: normalizeSnapshotPath(entry.path), digest: entry.digest };
    });
  } else {
    throw new Error("task551_fix_authoritative_snapshot_invalid");
  }
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.path)) throw new Error("task551_fix_authoritative_snapshot_invalid");
    seen.add(entry.path);
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
}

function diffAuthoritativeSnapshots(before, after) {
  const beforeByPath = new Map(before.map((entry) => [entry.path, entry.digest]));
  const afterByPath = new Map(after.map((entry) => [entry.path, entry.digest]));
  const changed = [];
  for (const [path, digest] of afterByPath) {
    if (!beforeByPath.has(path) || beforeByPath.get(path) !== digest) changed.push(path);
  }
  for (const path of beforeByPath.keys()) {
    if (!afterByPath.has(path)) changed.push(path);
  }
  return Object.freeze([...new Set(changed)].sort());
}

function samePathSet(left, right) {
  return left.length === right.length && left.every((path, index) => path === right[index]);
}

async function readAuthoritativeSnapshot(provider, input, timeoutMs) {
  try {
    const raw = await awaitBounded(
      Promise.resolve().then(() => provider(input)),
      timeoutMs
    );
    if (raw === undefined) throw new Error("task551_fix_authoritative_snapshot_timeout");
    return normalizeAuthoritativeSnapshot(raw);
  } catch {
    throw new Error("task551_fix_authoritative_snapshot_invalid");
  }
}

function requireChildBound(value, max, code, integer = false) {
  if (!Number.isFinite(value) || value <= 0 || value > max || (integer && !Number.isInteger(value)))
    throw new Error(code);
  return value;
}

function fixLoopFailure(rounds, attempts, terminalCode) {
  return Object.freeze({
    pass: false,
    rounds,
    attempts: Object.freeze(attempts),
    terminalCode,
  });
}

/**
 * Bounded fix loop over INJECTED agents and runners (never spawns directly).
 *
 * An optional authoritative snapshot provider is called before the first fix
 * callback and after each callback.  Its set-diff, rather than the agent's
 * self-report, is the source of truth for the edit boundary.  The three
 * accepted property names are aliases retained for callers that already use
 * a snapshot seam; they all have the same `(input) => string[]` contract.
 *
 * Per round: invoke the fix agent under a bounded timeout, normalize its
 * result against the immutable allowlist, then re-run ONLY the failing gate
 * through a bounded `verifyRunner`. Out-of-scope edits and invalid payloads
 * are immediate hard stops; anything else consumes one of at most three
 * rounds. Repeated failure fails closed with a fixed code.
 */
export async function runTask551FixLoop(input) {
  const {
    failedGate,
    allowedPaths,
    fixAgent,
    verifyRunner,
    timeoutMs = 600_000,
    maxRounds = TASK551_FIX_MAX_ROUNDS,
    authoritativeSnapshotProvider = null,
    authoritativeChangedPathsProvider = null,
    snapshotProvider: requestedSnapshotProvider = null,
  } = input ?? {};
  const gate = normalizeTask551FailedGate(failedGate);
  const allowedSnapshot = snapshotAllowedPaths(allowedPaths);
  if (typeof verifyRunner !== "function") {
    throw new Error("task551_fix_verify_runner_missing");
  }
  requireFixTimeout(timeoutMs);
  if (!Number.isInteger(maxRounds) || maxRounds < 1 || maxRounds > TASK551_FIX_MAX_ROUNDS) {
    throw new Error("task551_fix_max_rounds_invalid");
  }
  const snapshotProvider =
    authoritativeChangedPathsProvider ??
    authoritativeSnapshotProvider ??
    requestedSnapshotProvider ??
    null;
  if (snapshotProvider !== null && typeof snapshotProvider !== "function") {
    throw new Error("task551_fix_authoritative_snapshot_provider_invalid");
  }
  const attempts = [];
  let authoritativeBefore = null;
  if (snapshotProvider !== null) {
    try {
      authoritativeBefore = await readAuthoritativeSnapshot(
        snapshotProvider,
        {
          phase: "before",
          failedGate: gate,
          round: 0,
          allowedPaths: allowedSnapshot,
        },
        timeoutMs
      );
    } catch {
      return fixLoopFailure(0, attempts, TASK551_FIX_TERMINAL_CODES.snapshotInvalid);
    }
  }
  for (let round = 1; round <= maxRounds; round += 1) {
    const raw = await invokeFixAgent(
      fixAgent,
      { failedGate: gate, round, allowedPaths: allowedSnapshot },
      timeoutMs
    );
    let authoritativeChanged = null;
    if (snapshotProvider !== null) {
      try {
        const authoritativeAfter = await readAuthoritativeSnapshot(
          snapshotProvider,
          {
            phase: "after",
            failedGate: gate,
            round,
            allowedPaths: allowedSnapshot,
          },
          timeoutMs
        );
        authoritativeChanged = diffAuthoritativeSnapshots(authoritativeBefore, authoritativeAfter);
      } catch {
        return fixLoopFailure(round, attempts, TASK551_FIX_TERMINAL_CODES.snapshotInvalid);
      }
    }
    const normalized = normalizeTask551FixAgentResult(raw, allowedSnapshot);
    const observedChangedPaths = authoritativeChanged ?? normalized.changedPaths;
    const allowedSet = new Set(allowedSnapshot);
    const outOfScope = observedChangedPaths.find((path) => !allowedSet.has(path));
    // When a full authoritative snapshot is available, the agent's claim must
    // agree with the observed diff. This prevents an under-declared edit and
    // rejects a successful no-op that merely returns `completed`.
    attempts.push(
      Object.freeze({
        round,
        status: normalized.status,
        changedPathCount: observedChangedPaths.length,
      })
    );
    // The authoritative observed set wins over a fixer's self-report. A
    // foreign observed path is an ownership violation, even when the fixer
    // omitted it from its claim or returned a malformed payload.
    if (normalized.status === "out_of_scope" || outOfScope !== undefined) {
      return fixLoopFailure(round, attempts, TASK551_FIX_TERMINAL_CODES.outOfScope);
    }
    if (
      snapshotProvider !== null &&
      (normalized.status !== "completed" ||
        !samePathSet(normalized.changedPaths, observedChangedPaths) ||
        observedChangedPaths.length === 0)
    ) {
      return fixLoopFailure(round, attempts, TASK551_FIX_TERMINAL_CODES.snapshotInvalid);
    }
    if (normalized.status !== "completed") continue;
    let verified = false;
    try {
      verified = evaluateTask551FixVerification(
        await awaitBounded(
          Promise.resolve().then(() =>
            verifyRunner({
              failedGate: gate,
              round,
              changedPaths: observedChangedPaths,
              allowedPaths: allowedSnapshot,
            })
          ),
          timeoutMs
        )
      );
    } catch {
      return fixLoopFailure(round, attempts, TASK551_FIX_TERMINAL_CODES.verificationInvalid);
    }
    if (verified) {
      return Object.freeze({
        pass: true,
        rounds: round,
        attempts: Object.freeze(attempts),
        terminalCode: null,
      });
    }
    if (snapshotProvider !== null) {
      try {
        authoritativeBefore = await readAuthoritativeSnapshot(
          snapshotProvider,
          {
            phase: "baseline",
            failedGate: gate,
            round,
            allowedPaths: allowedSnapshot,
          },
          timeoutMs
        );
      } catch {
        return fixLoopFailure(round, attempts, TASK551_FIX_TERMINAL_CODES.snapshotInvalid);
      }
    }
  }
  return fixLoopFailure(maxRounds, attempts, TASK551_FIX_TERMINAL_CODES.roundsExhausted);
}

// ---------------------------------------------------------------------------
// Generic bounded argv child execution (non-registry commands; injectable)
// ---------------------------------------------------------------------------

function requirePlainStringMap(value, label) {
  if (!isPlainOwnDataRecord(value)) {
    throw new Error(`task551_child_env_not_plain_object:${label}`);
  }
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string") {
      throw new Error(`task551_child_env_value_not_string:${label}:${key}`);
    }
  }
}

function requireExactArgv(argv) {
  if (!Array.isArray(argv) || Object.getPrototypeOf(argv) !== Array.prototype || argv.length < 2) {
    throw new Error("task551_child_argv_invalid");
  }
  const keys = Reflect.ownKeys(argv);
  if (
    keys.length !== argv.length + 1 ||
    !keys.includes("length") ||
    keys.some(
      (key) =>
        key !== "length" &&
        (typeof key !== "string" || !/^0$|^[1-9][0-9]*$/u.test(key) || Number(key) >= argv.length)
    )
  ) {
    throw new Error("task551_child_argv_invalid");
  }
  for (let index = 0; index < argv.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(argv, String(index));
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      typeof descriptor.value !== "string" ||
      descriptor.value.length === 0
    ) {
      throw new Error("task551_child_argv_token_invalid");
    }
  }
  if (!argv[0].startsWith("/") || argv[0].split("/").includes("..")) {
    throw new Error("task551_child_executable_not_absolute");
  }
}

function requireTrustedExecutablePath(executablePath, trustedExecutablePath, verifier) {
  if (
    trustedExecutablePath !== undefined &&
    trustedExecutablePath !== null &&
    (typeof trustedExecutablePath !== "string" || trustedExecutablePath !== executablePath)
  ) {
    throw new Error("task551_child_executable_provenance_invalid");
  }
  if (verifier !== undefined && verifier !== null && typeof verifier !== "function") {
    throw new Error("task551_child_executable_verifier_invalid");
  }
  // The path is a trusted-parent input in production.  When no parent verifier
  // is supplied, retain the historical Bun launcher marker for injected fakes;
  // arbitrary absolute paths must not silently become executable authorities.
  if (verifier === undefined || verifier === null) {
    const basename = executablePath.slice(executablePath.lastIndexOf("/") + 1);
    if (!/^bun(?:[-._][A-Za-z0-9._-]+)?$/u.test(basename)) {
      throw new Error("task551_child_executable_provenance_invalid");
    }
    return;
  }
  let trusted = false;
  try {
    trusted = verifier(executablePath) === true;
  } catch {
    trusted = false;
  }
  if (!trusted) throw new Error("task551_child_executable_provenance_invalid");
}

function requireProcessIdentity(proc) {
  if (
    !Number.isSafeInteger(proc.pid) ||
    proc.pid <= 0 ||
    typeof proc.exited?.then !== "function" ||
    proc.stdout === undefined ||
    proc.stderr === undefined
  ) {
    throw new Error("task551_child_process_shape_invalid");
  }
}

function requireSignalCode(signalCode) {
  if (
    signalCode !== null &&
    signalCode !== undefined &&
    !(typeof signalCode === "string" && /^SIG[A-Z0-9_]{1,29}$/u.test(signalCode)) &&
    !(
      Number.isSafeInteger(signalCode) &&
      signalCode >= 1 &&
      signalCode <= TASK551_RECEIPT_MAX_SIGNAL_CODE
    )
  ) {
    throw new Error("task551_child_signal_invalid");
  }
}

async function readCappedStream(stream, maxBytes, tails, tailKey) {
  let bytes = 0;
  const tailChunks = [];
  let tailBytes = 0;
  for await (const chunk of stream) {
    const buf = Buffer.from(chunk);
    bytes += buf.byteLength;
    if (tails !== undefined) {
      // Keep only the last TASK551_CHILD_DIAGNOSTIC_MAX_BYTES per stream for
      // the redacted failure diagnostic; raw bytes never leave this capture.
      tailChunks.push(buf);
      tailBytes += buf.byteLength;
      while (tailBytes > TASK551_CHILD_DIAGNOSTIC_MAX_BYTES) {
        const excess = tailBytes - TASK551_CHILD_DIAGNOSTIC_MAX_BYTES;
        const first = tailChunks[0];
        if (first.byteLength <= excess) {
          tailChunks.shift();
          tailBytes -= first.byteLength;
        } else {
          tailChunks[0] = first.subarray(excess);
          tailBytes -= excess;
        }
      }
      tails[tailKey] = Buffer.concat(tailChunks);
    }
    if (bytes > maxBytes) return { bytes, overflow: true };
  }
  return { bytes, overflow: false };
}

async function killProcessGroup(pid, signal) {
  // POSIX detached children form their own process group (-pid). Windows has
  // no POSIX process groups, so taskkill /T /F is the platform tree kill. If
  // the group kill degrades to the root-pid fallback, the returned strategy
  // makes that degradation explicit in the redacted result instead of silent.
  if (process.platform === "win32") {
    try {
      const killer = Bun.spawn(["taskkill", "/PID", String(pid), "/T", "/F"], {
        stdin: "ignore",
        stdout: "ignore",
        stderr: "ignore",
      });
      await killer.exited;
      return "taskkill_tree";
    } catch {
      /* fall through to the root-pid fallback */
    }
  }
  try {
    process.kill(-pid, signal);
    return "process_group";
  } catch {
    try {
      process.kill(pid, signal);
      return "root_pid_fallback";
    } catch {
      return "already_gone";
    }
  }
}

async function terminateProcess(proc, killGraceMs) {
  let killStrategy = await killProcessGroup(proc.pid, "SIGTERM");
  let exited = await awaitBounded(proc.exited, killGraceMs);
  if (exited === undefined) {
    killStrategy = await killProcessGroup(proc.pid, "SIGKILL");
    exited = await awaitBounded(proc.exited, killGraceMs);
  }
  return killStrategy;
}

// Redacted failure diagnostic (doc cleanup-path contract, ~683-684). Local to
// this module and mirrored in task-551-author-audit.mjs; these workflow
// scripts keep tiny pure helpers module-local instead of widening the library
// surface. Credential-looking lines are dropped whole and KEY=value
// assignments are masked before anything leaves the capture boundary.
function redactTask551DiagnosticText(text) {
  if (typeof text !== "string" || text.length === 0) return "";
  return text
    .split("\n")
    .filter(
      (line) =>
        !/(pass(word)?|secret|token|api[-_]?key|credential|authorization|bearer|private[-_]?key)/i.test(
          line
        )
    )
    .map((line) => line.replace(/\b([A-Za-z_][A-Za-z0-9_-]*)=(\S*)/g, "$1=[redacted]"))
    .join("\n");
}

/** Frozen counters/codes/killStrategy plus tails, hard-capped at the budget. */
function buildTask551ChildDiagnostic({ code, stdoutTail = "", stderrTail = "", extra }) {
  let shrunk = {
    code,
    ...(extra ?? {}),
    stdoutTail: redactTask551DiagnosticText(stdoutTail),
    stderrTail: redactTask551DiagnosticText(stderrTail),
  };
  const overBudget = () =>
    Buffer.byteLength(JSON.stringify(shrunk)) > TASK551_CHILD_DIAGNOSTIC_MAX_BYTES;
  while (overBudget() && (shrunk.stdoutTail.length > 0 || shrunk.stderrTail.length > 0)) {
    // Keep only the LAST half of each tail until the serialized render fits.
    shrunk = {
      ...shrunk,
      stdoutTail: shrunk.stdoutTail.slice(Math.floor(shrunk.stdoutTail.length / 2)),
      stderrTail: shrunk.stderrTail.slice(Math.floor(shrunk.stderrTail.length / 2)),
    };
  }
  if (overBudget()) shrunk = { ...shrunk, stdoutTail: "", stderrTail: "" };
  // Defensive hard ceiling: never exceed the documented byte budget.
  return Object.freeze(overBudget() ? { code } : JSON.parse(JSON.stringify(shrunk)));
}

/** Builds the exact mapped code error with the capped diagnostic attached. */
function failTask551ArgvChildWithDiagnostic(code, tails, extra) {
  return Object.defineProperty(new Error(code), "task551Diagnostic", {
    value: buildTask551ChildDiagnostic({
      code,
      stdoutTail: tails.stdout.toString("utf8"),
      stderrTail: tails.stderr.toString("utf8"),
      extra,
    }),
    enumerable: false,
    writable: true,
    configurable: true,
  });
}

/**
 * Bounded execution of ONE exact argv child (fixer CLI or gate command) via an
 * injected spawner. Mirrors the author-audit child contract: absolute trusted
 * executable as the first token, plain-string env, stdin ignore, piped and
 * capped readers, hard timeout, SIGTERM-then-SIGKILL process-group teardown,
 * awaited numeric exit, and redacted counter-only results. Raw stream bytes
 * never survive into the returned state.
 */
export async function runTask551BoundedArgvChild(input) {
  const {
    argv,
    cwd,
    env,
    spawn,
    timeoutMs = 120_000,
    maxOutputBytes = 1_048_576,
    killGraceMs = 2_000,
    trustedExecutablePath,
    trustedExecutableVerifier,
  } = input ?? {};
  if (typeof cwd !== "string" || !cwd.startsWith("/")) {
    throw new Error("task551_child_cwd_not_absolute");
  }
  requireExactArgv(argv);
  requireTrustedExecutablePath(argv[0], trustedExecutablePath, trustedExecutableVerifier);
  requirePlainStringMap(env, "argv-child");
  if (typeof spawn !== "function") {
    throw new Error("task551_child_spawner_missing");
  }
  requireChildBound(timeoutMs, TASK551_CHILD_TIMEOUT_MAX_MS, "task551_child_timeout_invalid");
  requireChildBound(
    maxOutputBytes,
    TASK551_CHILD_MAX_OUTPUT_BYTES_LIMIT,
    "task551_child_output_limit_invalid",
    true
  );
  requireChildBound(
    killGraceMs,
    TASK551_CHILD_KILL_GRACE_MAX_MS,
    "task551_child_kill_grace_invalid",
    true
  );
  let proc;
  let killStrategy = "none";
  // Running redacted-diagnostic tail capture; counters/codes/killStrategy join
  // these tails in buildTask551ChildDiagnostic under the documented budget.
  const tails = { stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  const failWithDiagnostic = (code, extra) =>
    failTask551ArgvChildWithDiagnostic(code, tails, extra);
  try {
    proc = spawn(argv, {
      cwd,
      env,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      detached: process.platform !== "win32",
    });
  } catch {
    throw failWithDiagnostic(TASK551_CHILD_FAILURE_CODES.spawn, { phase: "spawn", killStrategy });
  }
  if (proc === null || typeof proc !== "object") {
    throw failWithDiagnostic(TASK551_CHILD_FAILURE_CODES.spawn, { phase: "spawn", killStrategy });
  }
  try {
    requireProcessIdentity(proc);
  } catch {
    throw failWithDiagnostic(TASK551_CHILD_FAILURE_CODES.spawn, { phase: "spawn", killStrategy });
  }

  let timeoutId;
  let timedOut = false;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      resolve(undefined);
    }, timeoutMs);
  });

  try {
    const readers = Promise.all([
      readCappedStream(proc.stdout, maxOutputBytes, tails, "stdout").catch(() => ({
        readerFailed: true,
      })),
      readCappedStream(proc.stderr, maxOutputBytes, tails, "stderr").catch(() => ({
        readerFailed: true,
      })),
    ]);
    const settled = await Promise.race([
      readers.then((value) => ({ value })),
      timeoutPromise.then(() => undefined),
    ]);
    clearTimeout(timeoutId);

    if (settled === undefined) {
      killStrategy = await terminateProcess(proc, killGraceMs);
      throw failWithDiagnostic(
        timedOut ? TASK551_CHILD_FAILURE_CODES.timeout : TASK551_CHILD_FAILURE_CODES.abort,
        { phase: timedOut ? "timeout" : "abort", killStrategy }
      );
    }
    const [stdoutCapture, stderrCapture] = settled.value;
    if (stdoutCapture.readerFailed || stderrCapture.readerFailed) {
      killStrategy = await terminateProcess(proc, killGraceMs);
      throw failWithDiagnostic(
        stdoutCapture.readerFailed
          ? TASK551_CHILD_FAILURE_CODES.stdout_reader
          : TASK551_CHILD_FAILURE_CODES.stderr_reader,
        { phase: "reader", killStrategy }
      );
    }
    if (stdoutCapture.overflow || stderrCapture.overflow) {
      killStrategy = await terminateProcess(proc, killGraceMs);
      throw failWithDiagnostic(TASK551_CHILD_FAILURE_CODES.overflow, {
        phase: "overflow",
        killStrategy,
      });
    }
    const exitCode = await awaitBounded(proc.exited, killGraceMs);
    if (exitCode === undefined || !Number.isInteger(exitCode)) {
      killStrategy = await terminateProcess(proc, killGraceMs);
      throw failWithDiagnostic(TASK551_CHILD_FAILURE_CODES.timeout, {
        phase: "exit_timeout",
        killStrategy,
      });
    }
    const signalCode = proc.signalCode ?? null;
    requireSignalCode(signalCode);
    return Object.freeze({
      status: exitCode === 0 && signalCode === null ? "passed" : "failed",
      result: exitCode === 0 && signalCode === null ? "zero_exit" : "nonzero_exit",
      exitCode,
      signalCode,
      stdoutBytes: stdoutCapture.bytes,
      stderrBytes: stderrCapture.bytes,
      killStrategy,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Composes `runTask551BoundedArgvChild` into a fix-agent function compatible
 * with `runTask551FixLoop`. The adapter receives `{ failedGate, round }`,
 * launches the caller-supplied exact fixer argv, and reports ONLY redacted
 * counters back to the loop; translating a successful child run into an
 * allowlist-scoped changed-paths claim stays the caller's injected concern
 * (via `mapExitToResult`), so this module never parses raw child output.
 *
 * `mapExitToResult(result)` must return `{ status, changedPaths }` or throw.
 */
export function createTask551ChildBackedFixAgent({ childInput, mapExitToResult }) {
  if (childInput === null || typeof childInput !== "object") {
    throw new Error("task551_fix_child_input_missing");
  }
  if (typeof mapExitToResult !== "function") {
    throw new Error("task551_fix_child_mapper_missing");
  }
  return async () => {
    const result = await runTask551BoundedArgvChild(childInput);
    if (result.status !== "passed") {
      return { status: "error" };
    }
    return mapExitToResult(result);
  };
}

/** Starts a source-bound child synchronously, then drops the raw source before await. */
export async function runTask551SourceBoundChild({
  phase,
  operation,
  phaseSourceProvider,
  phaseChildStarter,
  phaseResourceDisposer,
}) {
  let source;
  const thenable = (value) =>
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    (() => {
      try {
        return typeof value.then === "function";
      } catch {
        return true;
      }
    })();
  try {
    source = await phaseSourceProvider({ phase, operation });
    const child = phaseChildStarter({ phase, operation, source });
    if (thenable(child)) throw new Error("task551_implement_phase_child_thenable");
    if (
      child === source ||
      child === null ||
      typeof child !== "object" ||
      Array.isArray(child) ||
      Object.getPrototypeOf(child) !== Object.prototype ||
      !Object.isFrozen(child) ||
      Reflect.ownKeys(child).length !== 0
    )
      throw new Error("task551_implement_phase_child_invalid");
    return child;
  } finally {
    if (source !== undefined) {
      try {
        const result = phaseResourceDisposer({ phase, operation, source });
        if (result !== undefined)
          throw new Error(
            thenable(result)
              ? "task551_implement_phase_resource_disposer_thenable"
              : "task551_implement_phase_resource_disposer_result_invalid"
          );
      } finally {
        source = undefined;
      }
    }
  }
}

// Production composition seam kept explicit and lazy: importing modules never
// touches Bun.spawn; only an actual workflow invocation with no injected
// spawner falls through to the real runtime API.
export function defaultTask551Spawn() {
  return (argv, options) => Bun.spawn(argv, options);
}

/** The sole source-child adapter for fixed logical argv entries. */
export async function runTask551BoundedChild(input) {
  if (
    !isPlainOwnDataRecord(input) ||
    Reflect.ownKeys(input).some(
      (key) => typeof key !== "string" || !TASK551_BOUNDED_CHILD_INPUT_KEYS.includes(key)
    )
  )
    throw new Error("task551_logical_argv_input_invalid");
  const {
    commandContextId,
    logicalCommandId,
    profile,
    bunExecutablePath,
    env,
    cwd,
    discovery,
    timeoutMs = 120_000,
    maxOutputBytes = 1_048_576,
    killGraceMs = 2_000,
  } = input;
  if (
    typeof bunExecutablePath !== "string" ||
    !bunExecutablePath.startsWith("/") ||
    bunExecutablePath.split("/").includes("..")
  ) {
    throw new Error("task551_child_bun_executable_not_absolute");
  }
  requireChildBound(
    maxOutputBytes,
    TASK551_RECEIPT_MAX_OUTPUT_BYTES,
    "task551_child_output_limit_invalid",
    true
  );
  const row = task551LogicalArgvRow(commandContextId, logicalCommandId, profile, true);
  const childEnv = Object.freeze(
    Object.fromEntries((requirePlainStringMap(env, "logical-child"), Object.entries(env)))
  );
  const normalizedDiscovery = task551DiscoveryReceipt(row, discovery);
  const process = await runTask551BoundedArgvChild({
    argv: [bunExecutablePath, ...row.argv.slice(1)],
    cwd,
    env: childEnv,
    spawn: input?.spawn ?? defaultTask551Spawn(),
    timeoutMs,
    maxOutputBytes,
    killGraceMs,
    trustedExecutablePath: bunExecutablePath,
  });
  return Object.freeze({
    ...process,
    commandReceipt: task551LogicalReceipt(row, process, normalizedDiscovery),
  });
}

import { execFile, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { constants as FS_CONSTANTS } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rmdir,
  unlink,
} from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { sweepPriorBridgeLaunchesForRecovery } from "./task-540-codex-agent-bridge.mjs";

const execFileAsync = promisify(execFile);
const GIT = "/usr/bin/git";
const PROJECT_PARENT = "/home/coder/project";
const EXPECTED_GIT_COMMON_DIR = PROJECT_PARENT + "/Coderso/.git";
const EXPECTED_BRANCH = "feature/tasks-fixes";
const EXPECTED_MODULE_BASENAME = "task-540-local-orchestrator.mjs";
const BRIDGE_BASENAME = "task-540-codex-agent-bridge.mjs";
const IMPLEMENTER_BASENAME = "task-540-implement.mjs";
const REQUEST_PREFIX = "/tmp/coderso-task540-request-";
const JOURNAL_BASENAME = "coderso-task540-recovery-v1";
const STATUS_JOURNAL_BASENAME = "coderso-task540-status-closure-v1";
const STATUS_TARGET_RELATIVE_PATHS = Object.freeze([
  "_docs/_TASKS/TASK-540-01-L01-Reject-Unknown-Sanitize-Urls-Unique-Tabs-And-Prune-Ghosts.md",
  "_docs/_TASKS/TASK-540-02-L01-Expose-Link-Binding-And-Complete-Tab-Slot-Editing.md",
  "_docs/_TASKS/TASK-540-03-L01-Functional-Tabs-And-No-Nested-Interactive-Space-Trap.md",
  "_docs/_TASKS/TASK-540-04-L01-Make-Related-Entry-Promise-Caches-Retryable.md",
  "_docs/_TASKS/TASK-540-04-L02-Cancel-And-Retry-Related-Entry-Loads.md",
  "_docs/_TASKS/TASK-540-04-L03-Guard-Entry-Drafts-And-Subscribe-Related-Caches.md",
  "_docs/_TASKS/TASK-540-04-L04-Guard-Screen-Builder-Drafts.md",
  "_docs/_TASKS/TASK-540-05-L01-Keep-Screen-Canvas-Usable-And-Aria-Valid.md",
  "_docs/_TASKS/TASK-540-05-L02-Scope-Screen-Preferences-Through-User-Settings.md",
  "_docs/_TASKS/TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md",
  "_docs/_TASKS/TASK-540-01-Strict-Screen-Data-Urls-Tabs-And-Binding-Gc.md",
  "_docs/_TASKS/TASK-540-02-Button-Binding-And-Tabs-Authoring.md",
  "_docs/_TASKS/TASK-540-03-Accessible-Tabs-And-Selection-Semantics.md",
  "_docs/_TASKS/TASK-540-04-Dirty-Navigation-And-Async-Cache-Recovery.md",
  "_docs/_TASKS/TASK-540-05-Responsive-Canvas-Aria-And-User-Preferences.md",
  "_docs/_TASKS/TASK-540-06-Tests-Smoke-And-Closure.md",
  "_docs/_TASKS/TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md",
  "_docs/_TASKS/README.md",
]);
const TERMINAL_TARGET_RELATIVE_PATHS = Object.freeze([
  "_docs/_CHANGELOG/1252-2026-07-14-task-540-custom-screens-functional-and-data-integrity-remediation.md",
  "_docs/_TASKS/TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md",
  "_docs/_TASKS/TASK-540-06-Tests-Smoke-And-Closure.md",
  "_docs/_TASKS/TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md",
  "_docs/_CHANGELOG/README.md",
]);
const EVIDENCE_BEGIN = "<!-- TASK-540-SMOKE-EVIDENCE:BEGIN -->";
const EVIDENCE_END = "<!-- TASK-540-SMOKE-EVIDENCE:END -->";
const CLOSURE_ANCHOR_PREFIX = "<!-- TASK-540-CLOSURE-ANCHOR:";
const CLOSURE_ANCHOR_SUFFIX = " -->";
const MAX_PROMPT_BYTES = 128 * 1024;
const MAX_FRAME_BYTES = 8_454_144;
const MAX_RESULT_BYTES = 8 * 1024 * 1024;
const MAX_STRING_BYTES = 4096;
const MAX_ARRAY_ITEMS = 4096;
const MAX_DEPTH = 64;
const AGENT_TIMEOUT_MS = 60 * 60 * 1000;
const HEX_128 = /^[a-f0-9]{32}$/u;
const HEX_256 = /^[a-f0-9]{64}$/u;
const HASH_DOMAINS = new Set(
  "schema request claim contender-start settlement ack agent-result status-observation procedure transcript request-id run-id recovery-task recovery-review recovery-helper-sweep ledger-entry ledger-prefix terminal-ledger abort-ledger branch-id git-dir-id root-id worktree-id artifact-path run run-prepared artifact-plan artifact-created artifact-cleanup-started artifact-cleaned helper-launch-planned helper-launch-armed helper-launch-cleanup-started helper-launch-cleaned recovery-manifest recovery-prepared recovery-rollback-prepared recovery-committed recovery-ledger-cleaned status-manifest status-prepared status-rollback-prepared status-committed".split(
    " "
  )
);
const CONTROL_COMMANDS = Object.freeze([
  "inspect",
  "respond",
  "status",
  "wait",
  "procedure",
  "recover-review",
  "abort",
]);
const BRIDGE_COMMANDS = Object.freeze([
  "inspect",
  "respond",
  "status",
  "wait",
  "procedure",
  "recover-review",
]);
const REQUEST_FILE_INVENTORY = Object.freeze([
  "request.json",
  "operator.claim.candidate.json",
  "timeout.claim.candidate.json",
  "claim.json",
  "response.started.json",
  "cancel.started.json",
  "response.candidate.json",
  "cancel.candidate.json",
  "settlement.json",
  "response.done.candidate.json",
  "cancel.done.candidate.json",
  "response.done.json",
  "cancel.done.json",
  "procedure.candidate.json",
  "procedure.json",
]);
const SAFE_CHILD_ENVIRONMENT = Object.freeze(
  Object.assign(Object.create(null), {
    CI: "true",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    HOME: "/nonexistent/task540-bridge-home",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    NO_COLOR: "1",
    PATH: "/usr/local/bin:/usr/bin:/bin",
  })
);
const GIT_ENVIRONMENT = Object.freeze(
  Object.assign(Object.create(null), {
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    HOME: "/nonexistent/task540-host-git-home",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    PATH: "/usr/bin:/bin",
  })
);
const CODEX_POLICY =
  "Use local repository inspection only for an audit request. Do not edit, stage, commit, " +
  "start a server or browser, run smoke, fixtures, cleanup, or validation, invoke another " +
  "agent, or access credentials, .env files, raw logs, or user data. For a mutation request, " +
  "edit only the explicitly allowed files and keep every other prohibition.";
const SENSITIVE_ENV_KEY =
  /PASSWORD|PASSWD|SECRET|(?:^|_)TOKEN(?:_|$)|API[_-]?KEY|PRIVATE[_-]?KEY|ACCESS[_-]?KEY|DATABASE_URL|REDIS_URL|DSN/i;
const SENSITIVE_VALUES = Object.freeze(
  Object.entries(process.env)
    .filter(([key, value]) => SENSITIVE_ENV_KEY.test(key) && typeof value === "string" && value)
    .map(([, value]) => value)
);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, keys, label) {
  invariant(isPlainObject(value), label + ": object required");
  const actual = Reflect.ownKeys(value);
  invariant(
    actual.every((key) => typeof key === "string") &&
      actual.slice().sort().join("\0") === keys.slice().sort().join("\0"),
    label + ": keys drift"
  );
  for (const key of actual) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    invariant(
      descriptor &&
        descriptor.enumerable === true &&
        Object.hasOwn(descriptor, "value") &&
        !Object.hasOwn(descriptor, "get") &&
        !Object.hasOwn(descriptor, "set"),
      label + ": data property required"
    );
  }
  return value;
}

function requirePlainData(value, depth = 0, stringLimit = MAX_STRING_BYTES) {
  invariant(depth <= MAX_DEPTH, "TASK-540 value depth exceeded");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    invariant(Buffer.byteLength(value, "utf8") <= stringLimit, "TASK-540 string too large");
    return value;
  }
  if (typeof value === "number") {
    invariant(Number.isFinite(value), "TASK-540 number must be finite");
    return value;
  }
  if (Array.isArray(value)) {
    invariant(value.length <= MAX_ARRAY_ITEMS, "TASK-540 array too large");
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      invariant(
        descriptor &&
          descriptor.enumerable === true &&
          Object.hasOwn(descriptor, "value") &&
          !Object.hasOwn(descriptor, "get") &&
          !Object.hasOwn(descriptor, "set"),
        "TASK-540 array must be dense data"
      );
      requirePlainData(descriptor.value, depth + 1, stringLimit);
    }
    invariant(
      Reflect.ownKeys(value).every(
        (key) => key === "length" || (typeof key === "string" && /^(?:0|[1-9][0-9]*)$/u.test(key))
      ),
      "TASK-540 array has extra properties"
    );
    return value;
  }
  invariant(isPlainObject(value), "TASK-540 custom object rejected");
  for (const key of Reflect.ownKeys(value)) {
    invariant(
      typeof key === "string" && Buffer.byteLength(key, "utf8") <= MAX_STRING_BYTES,
      "TASK-540 object key rejected"
    );
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    invariant(
      descriptor &&
        descriptor.enumerable === true &&
        Object.hasOwn(descriptor, "value") &&
        !Object.hasOwn(descriptor, "get") &&
        !Object.hasOwn(descriptor, "set"),
      "TASK-540 object accessor rejected"
    );
    requirePlainData(descriptor.value, depth + 1, stringLimit);
  }
  return value;
}

function canonicalJson(value, stringLimit = MAX_STRING_BYTES) {
  requirePlainData(value, 0, stringLimit);
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map((item) => canonicalJson(item, stringLimit)).join(",") + "]";
  }
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key], stringLimit))
      .join(",") +
    "}"
  );
}

function digest(domain, core) {
  invariant(HASH_DOMAINS.has(domain), "TASK-540 hash domain rejected");
  const stringLimit = domain === "request" ? MAX_PROMPT_BYTES : MAX_STRING_BYTES;
  return createHash("sha256")
    .update(
      "coderso.task540.bridge." + domain + ".v1\0" + canonicalJson(core, stringLimit),
      "utf8"
    )
    .digest("hex");
}

function rawDigest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function randomId() {
  return randomBytes(16).toString("hex");
}

function frame(value, stringLimit = MAX_STRING_BYTES) {
  const bytes = Buffer.from(canonicalJson(value, stringLimit) + "\n", "utf8");
  invariant(bytes.length <= MAX_FRAME_BYTES, "TASK-540 frame too large");
  return bytes;
}

function parseCanonical(
  bytes,
  withLf,
  maxBytes,
  label,
  stringLimit = MAX_STRING_BYTES
) {
  invariant(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= maxBytes, label);
  invariant(!withLf || bytes.at(-1) === 10, label);
  const body = withLf ? bytes.subarray(0, -1) : bytes;
  invariant(!body.includes(0) && !body.includes(13), label);
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new Error(label);
  }
  invariant(!source.startsWith("\uFEFF"), label);
  let value;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error(label);
  }
  invariant(canonicalJson(value, stringLimit) === source, label);
  return value;
}

async function readBounded(stream, maxBytes) {
  const chunks = [];
  let length = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.from(chunk);
    length += bytes.length;
    invariant(length <= maxBytes, "TASK-540 stream too large");
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, length);
}

function fileMode(info) {
  return Number(info.mode & 0o777n);
}

function sameIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

async function syncDirectory(path) {
  const before = await lstat(path, { bigint: true });
  invariant(
    before.isDirectory() &&
      !before.isSymbolicLink() &&
      before.uid === BigInt(process.getuid()),
    "TASK-540 directory identity rejected"
  );
  const handle = await open(
    path,
    FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_DIRECTORY | FS_CONSTANTS.O_NOFOLLOW
  );
  try {
    const descriptor = await handle.stat({ bigint: true });
    invariant(before.dev === descriptor.dev && before.ino === descriptor.ino, "TASK-540 directory changed");
    await handle.sync();
    const after = await lstat(path, { bigint: true });
    invariant(after.dev === descriptor.dev && after.ino === descriptor.ino, "TASK-540 directory replaced");
  } finally {
    await handle.close();
  }
}

async function writeExclusive(path, bytes) {
  invariant(Buffer.isBuffer(bytes), "TASK-540 write bytes required");
  const handle = await open(
    path,
    FS_CONSTANTS.O_CREAT |
      FS_CONSTANTS.O_EXCL |
      FS_CONSTANTS.O_WRONLY |
      FS_CONSTANTS.O_NOFOLLOW,
    0o600
  );
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await syncDirectory(dirname(path));
  const info = await lstat(path, { bigint: true });
  invariant(
    info.isFile() &&
      !info.isSymbolicLink() &&
      info.uid === BigInt(process.getuid()) &&
      fileMode(info) === 0o600 &&
      info.nlink === 1n &&
      info.size === BigInt(bytes.length),
    "TASK-540 created file rejected"
  );
  return info;
}

async function readStable(path, maxBytes = MAX_FRAME_BYTES) {
  const before = await lstat(path, { bigint: true });
  invariant(
    before.isFile() &&
      !before.isSymbolicLink() &&
      before.uid === BigInt(process.getuid()) &&
      before.nlink === 1n &&
      before.size <= BigInt(maxBytes),
    "TASK-540 stable file rejected"
  );
  const handle = await open(path, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
  try {
    const descriptor = await handle.stat({ bigint: true });
    invariant(sameIdentity(before, descriptor), "TASK-540 file changed before read");
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    const pathAfter = await lstat(path, { bigint: true });
    invariant(
      bytes.length === Number(after.size) &&
        sameIdentity(before, after) &&
        sameIdentity(after, pathAfter) &&
        rawDigest(bytes) === rawDigest(bytes),
      "TASK-540 file changed during read"
    );
    return Object.freeze({ bytes, info: after });
  } finally {
    await handle.close();
  }
}

async function unlinkStable(path) {
  let before;
  try {
    before = await lstat(path, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
  invariant(
    before.isFile() &&
      !before.isSymbolicLink() &&
      before.uid === BigInt(process.getuid()) &&
      fileMode(before) === 0o600 &&
      before.nlink === 1n,
    "TASK-540 cleanup file rejected"
  );
  const handle = await open(path, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
  try {
    const descriptor = await handle.stat({ bigint: true });
    invariant(sameIdentity(before, descriptor), "TASK-540 cleanup identity changed");
    const pathBefore = await lstat(path, { bigint: true });
    invariant(sameIdentity(descriptor, pathBefore), "TASK-540 cleanup path replaced");
    await unlink(path);
  } finally {
    await handle.close();
  }
  await syncDirectory(dirname(path));
  return true;
}

function gitLine(result, label) {
  invariant(
    isPlainObject(result) &&
      typeof result.stdout === "string" &&
      result.stderr === "" &&
      /^[^\0\r\n]+(?:\n)?$/u.test(result.stdout),
    label
  );
  return result.stdout.trim();
}

async function deriveRoot(moduleUrl) {
  const modulePath = fileURLToPath(moduleUrl);
  const root = resolve(dirname(modulePath), "../..");
  invariant(
    dirname(root) === PROJECT_PARENT &&
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(basename(root)) &&
      modulePath === root + "/_docs/_workflows/" + EXPECTED_MODULE_BASENAME,
    "TASK-540 host module authority rejected"
  );
  for (const path of [PROJECT_PARENT, root, root + "/_docs", root + "/_docs/_workflows"]) {
    const info = await lstat(path);
    invariant(
      info.isDirectory() && !info.isSymbolicLink() && (await realpath(path)) === path,
      "TASK-540 host root path rejected"
    );
  }
  const moduleInfo = await lstat(modulePath);
  invariant(
    moduleInfo.isFile() &&
      !moduleInfo.isSymbolicLink() &&
      (await realpath(modulePath)) === modulePath,
    "TASK-540 host module rejected"
  );
  const options = {
    cwd: root,
    encoding: "utf8",
    env: GIT_ENVIRONMENT,
    maxBuffer: 64 * 1024,
  };
  const [topResult, dirResult, commonResult, branchResult] = await Promise.all([
    execFileAsync(GIT, ["rev-parse", "--show-toplevel"], options),
    execFileAsync(GIT, ["rev-parse", "--path-format=absolute", "--git-dir"], options),
    execFileAsync(GIT, ["rev-parse", "--path-format=absolute", "--git-common-dir"], options),
    execFileAsync(GIT, ["branch", "--show-current"], options),
  ]);
  const top = await realpath(gitLine(topResult, "TASK-540 Git top-level rejected"));
  const gitDir = await realpath(gitLine(dirResult, "TASK-540 Git directory rejected"));
  const gitCommonDir = await realpath(
    gitLine(commonResult, "TASK-540 Git common directory rejected")
  );
  const branch = gitLine(branchResult, "TASK-540 Git branch rejected");
  invariant(
    top === root &&
      gitCommonDir === EXPECTED_GIT_COMMON_DIR &&
      gitDir !== gitCommonDir &&
      dirname(gitDir) === gitCommonDir + "/worktrees" &&
      basename(gitDir) === basename(root) &&
      branch === EXPECTED_BRANCH,
    "TASK-540 dedicated worktree rejected"
  );
  const branchSha256 = digest("branch-id", { branch });
  const gitDirSha256 = digest("git-dir-id", { gitDir });
  const rootSha256 = digest("root-id", { root });
  const worktreeSha256 = digest("worktree-id", {
    branchSha256,
    gitDirSha256,
    rootSha256,
  });
  return Object.freeze({
    branch,
    branchSha256,
    gitCommonDir,
    gitDir,
    gitDirSha256,
    modulePath,
    root,
    rootSha256,
    worktreeSha256,
  });
}

async function requireRuntimeAuthority(root) {
  for (const [path, kind] of [
    [root + "/.env", "file"],
    [root + "/node_modules", "directory"],
  ]) {
    const info = await lstat(path);
    invariant(
      !info.isSymbolicLink() &&
        (kind === "file" ? info.isFile() : info.isDirectory()) &&
        info.uid === process.getuid() &&
        info.nlink > 0 &&
        (await realpath(path)) === path,
      "TASK-540 runtime resource rejected"
    );
  }
}

function parseProcStat(source, expectedPid) {
  const close = source.lastIndexOf(")");
  const openBoundary = source.indexOf(" (");
  invariant(close > openBoundary && openBoundary > 0, "TASK-540 process stat rejected");
  const pid = Number(source.slice(0, openBoundary));
  const fields = source
    .slice(close + 1)
    .trim()
    .split(/\s+/u);
  invariant(
    pid === expectedPid && fields.length >= 20 && /^[1-9][0-9]*$/u.test(fields[19]),
    "TASK-540 process identity rejected"
  );
  return Object.freeze({
    pid,
    ppid: Number(fields[1]),
    processGroupId: Number(fields[2]),
    sessionId: Number(fields[3]),
    startTime: fields[19],
    state: fields[0],
  });
}

async function processIdentity(pid) {
  invariant(Number.isSafeInteger(pid) && pid > 1, "TASK-540 PID rejected");
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      return parseProcStat(await readFile("/proc/" + pid + "/stat", "utf8"), pid);
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ESRCH") throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 2));
    }
  }
  return null;
}

function validateSchema(schema, schemaName, path = "", depth = 0) {
  invariant(depth <= MAX_DEPTH && isPlainObject(schema), "TASK-540 schema rejected");
  requirePlainData(schema, depth);
  const allowed = new Set([
    "additionalProperties",
    "enum",
    "items",
    "minLength",
    "properties",
    "required",
    "type",
    "uniqueItems",
  ]);
  invariant(
    Reflect.ownKeys(schema).every((key) => typeof key === "string" && allowed.has(key)),
    "TASK-540 schema keyword rejected"
  );
  if (Object.hasOwn(schema, "type")) {
    const scalar = ["object", "array", "string", "boolean", "integer"].includes(schema.type);
    const gateUnion =
      schemaName === "gate" &&
      path === "properties.failedCommand" &&
      Array.isArray(schema.type) &&
      schema.type.length === 2 &&
      schema.type[0] === "string" &&
      schema.type[1] === "null";
    invariant(scalar || gateUnion, "TASK-540 schema type rejected");
  }
  if (schema.enum !== undefined) {
    invariant(
      Array.isArray(schema.enum) &&
        schema.enum.length > 0 &&
        new Set(schema.enum.map((item) => canonicalJson(item))).size === schema.enum.length,
      "TASK-540 schema enum rejected"
    );
  }
  if (schema.properties !== undefined) {
    invariant(isPlainObject(schema.properties), "TASK-540 schema properties rejected");
    for (const [key, child] of Object.entries(schema.properties)) {
      validateSchema(child, schemaName, path ? path + "." + key : "properties." + key, depth + 1);
    }
  }
  if (schema.items !== undefined) {
    validateSchema(schema.items, schemaName, path + ".items", depth + 1);
  }
  if (schema.required !== undefined) {
    invariant(
      Array.isArray(schema.required) &&
        schema.required.every((key) => typeof key === "string") &&
        new Set(schema.required).size === schema.required.length,
      "TASK-540 schema required rejected"
    );
  }
  if (schema.additionalProperties !== undefined) {
    invariant(schema.additionalProperties === false, "TASK-540 open schema rejected");
  }
  if (schema.minLength !== undefined) {
    invariant(
      Number.isSafeInteger(schema.minLength) && schema.minLength >= 0,
      "TASK-540 schema minLength rejected"
    );
  }
  if (schema.uniqueItems !== undefined) {
    invariant(schema.uniqueItems === true, "TASK-540 schema uniqueItems rejected");
  }
  return schema;
}

function validateValue(value, schema, depth = 0) {
  invariant(depth <= MAX_DEPTH, "TASK-540 result depth exceeded");
  requirePlainData(value, depth);
  if (schema.enum) {
    invariant(
      schema.enum.some((candidate) => canonicalJson(candidate) === canonicalJson(value)),
      "TASK-540 result enum rejected"
    );
  }
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (types.length > 0) {
    invariant(
      types.some((type) => {
        if (type === "null") return value === null;
        if (type === "array") return Array.isArray(value);
        if (type === "object") return isPlainObject(value);
        if (type === "integer") return Number.isSafeInteger(value);
        return typeof value === type;
      }),
      "TASK-540 result type rejected"
    );
  }
  if (typeof value === "string" && schema.minLength !== undefined) {
    invariant(value.length >= schema.minLength, "TASK-540 result string rejected");
  }
  if (Array.isArray(value)) {
    invariant(value.length <= MAX_ARRAY_ITEMS, "TASK-540 result array too large");
    if (schema.uniqueItems) {
      invariant(
        new Set(value.map((item) => canonicalJson(item))).size === value.length,
        "TASK-540 result duplicate rejected"
      );
    }
    if (schema.items) {
      value.forEach((item) => validateValue(item, schema.items, depth + 1));
    }
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (schema.additionalProperties === false) {
      invariant(
        isPlainObject(schema.properties) &&
          keys.every((key) => Object.hasOwn(schema.properties, key)),
        "TASK-540 result extra key rejected"
      );
    }
    for (const key of schema.required ?? []) {
      invariant(Object.hasOwn(value, key), "TASK-540 result required key missing");
    }
    for (const key of keys) {
      if (schema.properties?.[key]) validateValue(value[key], schema.properties[key], depth + 1);
    }
  }
  invariant(
    Buffer.byteLength(canonicalJson(value), "utf8") <= MAX_RESULT_BYTES,
    "TASK-540 result too large"
  );
  return value;
}

function containsSensitiveValue(source, secret) {
  if (secret.length >= 6) return source.includes(secret);
  const escaped = secret.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp("(?:^|[^A-Za-z0-9])" + escaped + "(?=$|[^A-Za-z0-9])", "u").test(
    source
  );
}

function requireSecretSafeResult(value) {
  const source = canonicalJson(value);
  invariant(
    !SENSITIVE_VALUES.some((secret) => containsSensitiveValue(source, secret)) &&
      !/\b(?:authorization|proxy-authorization|cookie|set-cookie)\s*:/iu.test(source) &&
      !/\bbearer\s+[a-z0-9._~+\/-]{8,}/iu.test(source) &&
      !/\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/u.test(source),
    "TASK-540 collaboration result failed secret scan"
  );
  return value;
}

function requireCli(argv) {
  invariant(
    Array.isArray(argv) &&
      argv.length === 1 &&
      (argv[0] === "--self-test" || argv[0] === "--run"),
    "TASK-540 host accepts exactly --self-test or --run"
  );
  return argv[0];
}

const ROOT_AUTHORITY = await deriveRoot(import.meta.url);
const ROOT = ROOT_AUTHORITY.root;
const BRIDGE = ROOT + "/_docs/_workflows/" + BRIDGE_BASENAME;
const IMPLEMENTER = ROOT + "/_docs/_workflows/" + IMPLEMENTER_BASENAME;
const JOURNAL = ROOT_AUTHORITY.gitDir + "/" + JOURNAL_BASENAME;
const STATUS_JOURNAL = ROOT_AUTHORITY.gitDir + "/" + STATUS_JOURNAL_BASENAME;
const HOST_IDENTITY = await processIdentity(process.pid);
const SCHEMA_AUTHORITY = new WeakMap();
const REGISTERED_SCHEMAS = new Map();
const REQUESTS = new Map();
const CONTROL_IDS = new Set();
const JOURNAL_FILES = new Set();
const LEDGER_FILES = new Set();
const LEDGER_RECORDS = [];
let schemasRegistered = false;
let runAuthority = null;
let ledgerPath = null;
let requestSequence = 0;
let launchOrdinal = 0;
let controlOrdinal = 0;
let controlInFlight = false;
let controlledAbort = false;
let rawRootLoss = false;
let workflowFinished = false;
let dispatchFrozen = false;
let preClosureCount = null;
let preClosureProjection = null;
let terminalTransaction = null;
let statusTransaction = null;
let hostPhase = "fresh";
let priorHelperSweep = null;

async function ensureDirectory(path, mode) {
  try {
    await mkdir(path, { mode });
    await syncDirectory(dirname(path));
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }
  const info = await lstat(path, { bigint: true });
  invariant(
    info.isDirectory() &&
      !info.isSymbolicLink() &&
      info.uid === BigInt(process.getuid()) &&
      fileMode(info) === mode,
    "TASK-540 directory contract rejected"
  );
  return info;
}

function directoryIdentity(info) {
  return Object.freeze({
    dev: info.dev.toString(),
    ino: info.ino.toString(),
    mode: fileMode(info),
    type: "directory",
    uid: info.uid.toString(),
  });
}

function fileIdentity(info) {
  return Object.freeze({
    ctimeNs: info.ctimeNs.toString(),
    dev: info.dev.toString(),
    ino: info.ino.toString(),
    mode: fileMode(info),
    mtimeNs: info.mtimeNs.toString(),
    nlink: info.nlink.toString(),
    size: info.size.toString(),
    type: "file",
    uid: info.uid.toString(),
  });
}

function artifactRecordPath(artifactKind, sequence, suffix) {
  const stem =
    artifactKind === "ledger-directory"
      ? "ledger-directory"
      : (artifactKind === "request-directory" ? "request" : "ledger") +
        "-" +
        String(sequence).padStart(12, "0");
  return JOURNAL + "/" + stem + "." + suffix + ".json";
}

async function persistArtifactPlan(artifactKind, path, requestIdSha256, sequence, runIdSha256) {
  const core = {
    artifactKind,
    path,
    pathSha256: digest("artifact-path", { path }),
    requestIdSha256,
    runIdSha256,
    sequence,
  };
  const plan = Object.freeze({ ...core, planSha256: digest("artifact-plan", core) });
  const recordPath = artifactRecordPath(artifactKind, sequence, "planned");
  await writeExclusive(recordPath, Buffer.from(canonicalJson(plan)));
  JOURNAL_FILES.add(recordPath);
  return plan;
}

async function persistArtifactCreated(plan, info, contentSha256 = null) {
  const core = {
    artifactKind: plan.artifactKind,
    contentSha256,
    identity: plan.artifactKind === "ledger-entry" ? fileIdentity(info) : directoryIdentity(info),
    pathSha256: plan.pathSha256,
    planSha256: plan.planSha256,
    sequence: plan.sequence,
  };
  const created = Object.freeze({ ...core, createdSha256: digest("artifact-created", core) });
  const recordPath = artifactRecordPath(plan.artifactKind, plan.sequence, "created");
  await writeExclusive(recordPath, Buffer.from(canonicalJson(created)));
  JOURNAL_FILES.add(recordPath);
  return created;
}

async function persistArtifactCleanupStarted(plan, created) {
  const core = {
    createdSha256: created.createdSha256,
    pathSha256: plan.pathSha256,
    sequence: plan.sequence,
  };
  const record = Object.freeze({
    ...core,
    cleanupStartedSha256: digest("artifact-cleanup-started", core),
  });
  const recordPath = artifactRecordPath(plan.artifactKind, plan.sequence, "cleanup-started");
  await writeExclusive(recordPath, Buffer.from(canonicalJson(record)));
  JOURNAL_FILES.add(recordPath);
  return record;
}

async function persistArtifactCleaned(plan, created, cleanupStarted) {
  const core = {
    cleanupStartedSha256: cleanupStarted.cleanupStartedSha256,
    createdSha256: created.createdSha256,
    pathSha256: plan.pathSha256,
    sequence: plan.sequence,
  };
  const record = Object.freeze({
    ...core,
    cleanedSha256: digest("artifact-cleaned", core),
  });
  const recordPath = artifactRecordPath(plan.artifactKind, plan.sequence, "cleaned");
  await writeExclusive(recordPath, Buffer.from(canonicalJson(record)));
  JOURNAL_FILES.add(recordPath);
  return record;
}

async function prepareRun() {
  await recoverStatusJournalAtStartup();
  try {
    let names = await readdir(JOURNAL);
    if (names.length > 0) {
      const run = (await readCanonicalPath(JOURNAL + "/run.json")).value;
      exactKeys(
        run,
        [
          "branchSha256",
          "gitDirSha256",
          "ledgerPath",
          "ledgerPathSha256",
          "rootSha256",
          "runIdSha256",
          "runSha256",
          "worktreeSha256",
        ],
        "TASK-540 recovery run"
      );
      const runCore = Object.fromEntries(
        Object.entries(run).filter(([key]) => key !== "runSha256")
      );
      invariant(
        run.runSha256 === digest("run", runCore) &&
          run.branchSha256 === ROOT_AUTHORITY.branchSha256 &&
          run.gitDirSha256 === ROOT_AUTHORITY.gitDirSha256 &&
          run.rootSha256 === ROOT_AUTHORITY.rootSha256 &&
          run.worktreeSha256 === ROOT_AUTHORITY.worktreeSha256 &&
          run.ledgerPathSha256 === digest("artifact-path", { path: run.ledgerPath }) &&
          dirname(run.ledgerPath) === "/tmp" &&
          basename(run.ledgerPath).startsWith("coderso-task540-ledger-"),
        "TASK-540 recovery run binding rejected"
      );
      const prepared = (await readCanonicalPath(JOURNAL + "/run.prepared.json")).value;
      exactKeys(prepared, ["runPreparedSha256", "runSha256"], "TASK-540 recovery prepared");
      invariant(
        prepared.runSha256 === run.runSha256 &&
          prepared.runPreparedSha256 === digest("run-prepared", { runSha256: run.runSha256 }),
        "TASK-540 recovery prepared binding rejected"
      );
      const ledgerPlan = (
        await readCanonicalPath(JOURNAL + "/ledger-directory.planned.json")
      ).value;
      const ledgerCreated = (
        await readCanonicalPath(JOURNAL + "/ledger-directory.created.json")
      ).value;
      ledgerPath = run.ledgerPath;
      runAuthority = Object.freeze({ ...run, ledgerCreated, ledgerPlan, runId: null });
      if (statusTransaction && !names.includes("terminal.prepared.json")) {
        await rollbackStatusClosure();
      }
      await routeStartupModeRecovery(names);
      names = await readdir(JOURNAL);
      requestSequence = names
        .filter((name) => /^request-[0-9]{12}\.planned\.json$/u.test(name))
        .reduce((highest, name) => Math.max(highest, Number(name.slice(8, 20))), 0);
      launchOrdinal = names
        .filter((name) => /^launch-[0-9]{12}\.planned\.json$/u.test(name))
        .reduce((highest, name) => Math.max(highest, Number(name.slice(7, 19))), 0);
      for (const name of names) JOURNAL_FILES.add(JOURNAL + "/" + name);
      priorHelperSweep = await sweepPriorBridgeLaunchesForRecovery({
        hostModulePath: ROOT_AUTHORITY.modulePath,
        phase: "recovery-only",
        processId: process.pid,
        processStartTime: HOST_IDENTITY.startTime,
        root: ROOT,
      });
      hostPhase = "recovery-only";
      return runAuthority;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (statusTransaction) await rollbackStatusClosure();
  await ensureDirectory(JOURNAL, 0o700);
  const runId = randomId();
  ledgerPath = "/tmp/coderso-task540-ledger-" + runId;
  const runCore = {
    branchSha256: ROOT_AUTHORITY.branchSha256,
    gitDirSha256: ROOT_AUTHORITY.gitDirSha256,
    ledgerPath,
    ledgerPathSha256: digest("artifact-path", { path: ledgerPath }),
    rootSha256: ROOT_AUTHORITY.rootSha256,
    runIdSha256: digest("run-id", { runId }),
    worktreeSha256: ROOT_AUTHORITY.worktreeSha256,
  };
  const run = Object.freeze({ ...runCore, runSha256: digest("run", runCore) });
  await writeExclusive(JOURNAL + "/run.json", Buffer.from(canonicalJson(run)));
  JOURNAL_FILES.add(JOURNAL + "/run.json");
  const preparedCore = { runSha256: run.runSha256 };
  const prepared = Object.freeze({
    ...preparedCore,
    runPreparedSha256: digest("run-prepared", preparedCore),
  });
  await writeExclusive(
    JOURNAL + "/run.prepared.json",
    Buffer.from(canonicalJson(prepared))
  );
  JOURNAL_FILES.add(JOURNAL + "/run.prepared.json");
  const ledgerPlan = await persistArtifactPlan(
    "ledger-directory",
    ledgerPath,
    null,
    null,
    run.runIdSha256
  );
  await mkdir(ledgerPath, { mode: 0o700 });
  await syncDirectory("/tmp");
  const ledgerDirectory = await lstat(ledgerPath, { bigint: true });
  invariant(
    ledgerDirectory.isDirectory() &&
      !ledgerDirectory.isSymbolicLink() &&
      ledgerDirectory.uid === BigInt(process.getuid()) &&
      fileMode(ledgerDirectory) === 0o700,
    "TASK-540 ledger directory rejected"
  );
  const ledgerCreated = await persistArtifactCreated(ledgerPlan, ledgerDirectory);
  runAuthority = Object.freeze({ ...run, ledgerCreated, ledgerPlan, runId });
  return runAuthority;
}

function registerSchemas(value) {
  invariant(!schemasRegistered, "TASK-540 schemas already registered");
  exactKeys(value, ["audit", "gate", "mutation", "result"], "TASK-540 schema registry");
  const classes = Object.freeze({
    audit: "read-only",
    gate: "rejected",
    mutation: "mutating",
    result: "read-only",
  });
  for (const name of ["audit", "gate", "mutation", "result"]) {
    const schema = value[name];
    validateSchema(schema, name);
    const sha256 = digest("schema", { name, resultSchema: schema });
    invariant(!SCHEMA_AUTHORITY.has(schema), "TASK-540 schema identity reused");
    SCHEMA_AUTHORITY.set(schema, Object.freeze({ accessClass: classes[name], name, sha256 }));
    REGISTERED_SCHEMAS.set(name, schema);
  }
  schemasRegistered = true;
}

function requireRegisteredSchema(schema) {
  const authority = SCHEMA_AUTHORITY.get(schema);
  invariant(authority && authority.accessClass !== "rejected", "TASK-540 schema not dispatchable");
  validateSchema(schema, authority.name);
  invariant(
    digest("schema", { name: authority.name, resultSchema: schema }) === authority.sha256,
    "TASK-540 registered schema mutated"
  );
  return authority;
}

function launchPath(ordinal, suffix) {
  return (
    JOURNAL +
    "/launch-" +
    String(ordinal).padStart(12, "0") +
    "." +
    suffix +
    ".json"
  );
}

async function createRequest(prompt, options, schemaAuthority) {
  invariant(runAuthority, "TASK-540 run journal is not prepared");
  invariant(typeof prompt === "string" && prompt.length > 0, "TASK-540 prompt missing");
  invariant(Buffer.byteLength(prompt, "utf8") <= MAX_PROMPT_BYTES, "TASK-540 prompt too large");
  invariant(isPlainObject(options), "TASK-540 agent options rejected");
  const sequence = ++requestSequence;
  const requestId = randomId();
  const requestDir = REQUEST_PREFIX + requestId;
  const deadlineAtEpochMs = Date.now() + AGENT_TIMEOUT_MS;
  const deadlineMonotonicNs = (
    process.hrtime.bigint() + BigInt(AGENT_TIMEOUT_MS) * 1_000_000n
  ).toString();
  const schemaSha256 = digest("schema", {
    name: schemaAuthority.name,
    resultSchema: options.schema,
  });
  const core = {
    accessClass: schemaAuthority.accessClass,
    deadlineAtEpochMs,
    deadlineMonotonicNs,
    label: options.label,
    orchestratorPid: process.pid,
    orchestratorStartTime: HOST_IDENTITY.startTime,
    phase: options.phase,
    policy: CODEX_POLICY,
    prompt,
    requestId,
    resultSchema: options.schema,
    runId: runAuthority.runId,
    schemaSha256,
    sequence,
    worktreeSha256: ROOT_AUTHORITY.worktreeSha256,
  };
  requirePlainData(core, 0, MAX_PROMPT_BYTES);
  const request = Object.freeze({ ...core, requestSha256: digest("request", core) });
  const plan = await persistArtifactPlan(
    "request-directory",
    requestDir,
    digest("request-id", { requestId }),
    sequence,
    runAuthority.runIdSha256
  );
  await mkdir(requestDir, { mode: 0o700 });
  await syncDirectory("/tmp");
  await writeExclusive(
    requestDir + "/request.json",
    Buffer.from(canonicalJson(request, MAX_PROMPT_BYTES))
  );
  const directory = await lstat(requestDir, { bigint: true });
  const created = await persistArtifactCreated(plan, directory);
  return Object.freeze({ created, plan, request, requestDir, schemaAuthority });
}

async function writeNotification(authority) {
  const notification = {
    deadlineAtEpochMs: authority.request.deadlineAtEpochMs,
    requestDir: authority.requestDir,
    requestId: authority.request.requestId,
    sequence: authority.request.sequence,
  };
  if (!process.stdout.write(frame(notification))) {
    await new Promise((resolveDrain) => process.stdout.once("drain", resolveDrain));
  }
}

async function launchBridge(mode, authority, payload = null, priorHelperSweep = null) {
  invariant(BRIDGE_COMMANDS.includes(mode), "TASK-540 bridge mode rejected");
  const ordinal = ++launchOrdinal;
  const bridgeBytes = (await readStable(BRIDGE, MAX_RESULT_BYTES)).bytes;
  const moduleSha256 = rawDigest(bridgeBytes);
  const planCore = {
    launchId: randomId(),
    launchOrdinal: ordinal,
    mode,
    requestDir: authority?.requestDir ?? null,
    requestIdSha256: authority
      ? digest("request-id", { requestId: authority.request.requestId })
      : null,
    requestSha256: authority?.request.requestSha256 ?? null,
    runSha256: runAuthority.runSha256,
    sequence: authority?.request.sequence ?? null,
  };
  const plan = Object.freeze({
    ...planCore,
    launchPlannedSha256: digest("helper-launch-planned", planCore),
  });
  const plannedPath = launchPath(ordinal, "planned");
  await writeExclusive(plannedPath, Buffer.from(canonicalJson(plan)));
  JOURNAL_FILES.add(plannedPath);
  const args = [BRIDGE, "--" + mode];
  if (authority) args.push(authority.requestDir);
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    detached: false,
    env: SAFE_CHILD_ENVIRONMENT,
    shell: false,
    stdio: ["pipe", "pipe", "pipe", "pipe"],
  });
  invariant(Number.isSafeInteger(child.pid), "TASK-540 bridge child PID missing");
  const identity = await processIdentity(child.pid);
  invariant(identity, "TASK-540 bridge child identity missing");
  const armCore = {
    launchOrdinal: ordinal,
    launchPlannedSha256: plan.launchPlannedSha256,
    mode,
    moduleSha256,
    priorHelperSweepSha256: priorHelperSweep?.priorHelperSweepSha256 ?? null,
    processId: child.pid,
    processStartTime: identity.startTime,
    worktreeSha256: ROOT_AUTHORITY.worktreeSha256,
  };
  const arm = Object.freeze({
    ...armCore,
    launchArmedSha256: digest("helper-launch-armed", armCore),
  });
  const armedPath = launchPath(ordinal, "armed");
  await writeExclusive(armedPath, Buffer.from(canonicalJson(arm)));
  JOURNAL_FILES.add(armedPath);
  const bootstrap = {
    launchOrdinal: ordinal,
    launchPlannedSha256: plan.launchPlannedSha256,
    mode,
  };
  const go = {
    command: "GO",
    launchArmedSha256: arm.launchArmedSha256,
    launchOrdinal: ordinal,
    launchPlannedSha256: plan.launchPlannedSha256,
    priorHelperSweep,
  };
  child.stdio[3].end(Buffer.concat([frame(bootstrap), frame(go)]));
  child.stdin.end(payload === null ? undefined : frame(payload));
  const stdoutPromise = readBounded(child.stdout, MAX_FRAME_BYTES);
  const stderrPromise = readBounded(child.stderr, MAX_FRAME_BYTES);
  const completion = await new Promise((resolveCompletion) => {
    let spawnError = null;
    child.once("error", (error) => {
      spawnError = error;
    });
    child.once("close", (status, signal) =>
      resolveCompletion(Object.freeze({ signal, spawnError, status }))
    );
  });
  const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);
  invariant(
    completion.spawnError === null &&
      completion.status === 0 &&
      completion.signal === null &&
      stderr.length === 0,
    "TASK-540 bridge child failed"
  );
  const absent = await processIdentity(child.pid);
  invariant(absent === null, "TASK-540 bridge child remained live");
  const result = parseCanonical(
    stdout,
    true,
    MAX_FRAME_BYTES,
    "TASK-540 bridge output rejected",
    mode === "inspect" ? MAX_PROMPT_BYTES : MAX_STRING_BYTES
  );
  const cleanupStartedCore = {
    launchArmedSha256: arm.launchArmedSha256,
    launchOrdinal: ordinal,
    launchPlannedSha256: plan.launchPlannedSha256,
  };
  const cleanupStarted = Object.freeze({
    ...cleanupStartedCore,
    launchCleanupStartedSha256: digest(
      "helper-launch-cleanup-started",
      cleanupStartedCore
    ),
  });
  const cleanupStartedPath = launchPath(ordinal, "cleanup-started");
  await writeExclusive(cleanupStartedPath, Buffer.from(canonicalJson(cleanupStarted)));
  JOURNAL_FILES.add(cleanupStartedPath);
  const cleanedCore = {
    ...cleanupStartedCore,
    launchCleanupStartedSha256: cleanupStarted.launchCleanupStartedSha256,
  };
  const cleaned = Object.freeze({
    ...cleanedCore,
    launchCleanedSha256: digest("helper-launch-cleaned", cleanedCore),
  });
  const cleanedPath = launchPath(ordinal, "cleaned");
  await writeExclusive(cleanedPath, Buffer.from(canonicalJson(cleaned)));
  JOURNAL_FILES.add(cleanedPath);
  return result;
}

async function readCanonicalPath(path, allowPrompt = false) {
  const record = await readStable(path, MAX_FRAME_BYTES);
  return Object.freeze({
    ...record,
    value: parseCanonical(
      record.bytes,
      false,
      MAX_FRAME_BYTES,
      "TASK-540 retained canonical file rejected",
      allowPrompt ? MAX_PROMPT_BYTES : MAX_STRING_BYTES
    ),
  });
}

async function persistLedgerEntry(authority, core) {
  const entry = Object.freeze({
    ...core,
    ledgerEntrySha256: digest("ledger-entry", core),
  });
  const path =
    ledgerPath + "/ledger-" + String(authority.request.sequence).padStart(12, "0") + ".json";
  const plan = await persistArtifactPlan(
    "ledger-entry",
    path,
    digest("request-id", { requestId: authority.request.requestId }),
    authority.request.sequence,
    runAuthority.runIdSha256
  );
  const bytes = Buffer.from(canonicalJson(entry));
  const info = await writeExclusive(path, bytes);
  const created = await persistArtifactCreated(plan, info, rawDigest(bytes));
  const verified = await readCanonicalPath(path);
  invariant(
    rawDigest(verified.bytes) === rawDigest(bytes) &&
      canonicalJson(verified.value) === canonicalJson(entry),
    "TASK-540 immutable ledger verification failed"
  );
  LEDGER_FILES.add(path);
  authority.ledger = Object.freeze({ created, entry, path, plan });
  LEDGER_RECORDS.push(authority.ledger);
  return entry;
}

async function appendLedger(authority, disposition) {
  const requestDir = authority.requestDir;
  const [claimRecord, settlementRecord, procedureRecord] = await Promise.all([
    readCanonicalPath(requestDir + "/claim.json"),
    readCanonicalPath(requestDir + "/settlement.json"),
    readCanonicalPath(requestDir + "/procedure.json"),
  ]);
  const claim = claimRecord.value;
  const settlement = settlementRecord.value;
  const procedure = procedureRecord.value;
  const contenders = [];
  for (const contenderKind of ["response", "cancel"]) {
    let start;
    try {
      start = (await readCanonicalPath(requestDir + "/" + contenderKind + ".started.json")).value;
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    const acknowledgement = (
      await readCanonicalPath(requestDir + "/" + contenderKind + ".done.json")
    ).value;
    contenders.push({
      ackSha256: acknowledgement.ackSha256,
      contenderKind,
      startSha256: start.startSha256,
    });
  }
  invariant(contenders.length > 0, "TASK-540 ledger contenders missing");
  const core = {
    accessClass: authority.request.accessClass,
    claim: { claimOwner: claim.claimOwner, claimSha256: claim.claimSha256 },
    contenders,
    dispatch: {
      agentResultSha256: procedure.agentResultSha256,
      agentStateAtFinalList: procedure.agentStateAtFinalList,
      agentStateAtFirstList: procedure.agentStateAtFirstList,
      dispatchStatus: procedure.dispatchStatus,
      forkTurns: procedure.forkTurns,
      interruptAttempted: procedure.interruptAttempted,
      interruptPreviousState: procedure.interruptPreviousState,
      procedureSha256: procedure.procedureSha256,
      spawned: procedure.spawned,
      statusSha256: procedure.statusSha256,
      transcriptCorrelationSha256: procedure.transcriptCorrelationSha256,
    },
    disposition,
    request: {
      deadlineMonotonicNs: authority.request.deadlineMonotonicNs,
      requestIdSha256: digest("request-id", { requestId: authority.request.requestId }),
      requestSha256: authority.request.requestSha256,
      runIdSha256: runAuthority.runIdSha256,
      sequence: authority.request.sequence,
      worktreeSha256: authority.request.worktreeSha256,
    },
    settlement: {
      agentResultSha256: settlement.agentResultSha256,
      decisionMonotonicNs: settlement.decisionMonotonicNs,
      error: settlement.error ?? null,
      settlementSha256: settlement.settlementSha256,
      startSha256: settlement.startSha256,
      status: settlement.status,
    },
  };
  return persistLedgerEntry(authority, core);
}

async function appendPreclaimTimeoutLedger(authority) {
  const requestDir = authority.requestDir;
  const [claim, settlement, start, acknowledgement] = await Promise.all([
    readCanonicalPath(requestDir + "/claim.json").then(({ value }) => value),
    readCanonicalPath(requestDir + "/settlement.json").then(({ value }) => value),
    readCanonicalPath(requestDir + "/cancel.started.json").then(({ value }) => value),
    readCanonicalPath(requestDir + "/cancel.done.json").then(({ value }) => value),
  ]);
  invariant(claim.claimOwner === "timeout", "TASK-540 preclaim timeout owner rejected");
  return persistLedgerEntry(authority, {
    accessClass: authority.request.accessClass,
    claim: { claimOwner: claim.claimOwner, claimSha256: claim.claimSha256 },
    contenders: [
      {
        ackSha256: acknowledgement.ackSha256,
        contenderKind: "cancel",
        startSha256: start.startSha256,
      },
    ],
    dispatch: {
      agentResultSha256: null,
      agentStateAtFinalList: null,
      agentStateAtFirstList: null,
      dispatchStatus: "not_started",
      forkTurns: null,
      interruptAttempted: false,
      interruptPreviousState: null,
      procedureSha256: null,
      spawned: false,
      statusSha256: null,
      transcriptCorrelationSha256: null,
    },
    disposition: "rejected_rolled_back",
    request: {
      deadlineMonotonicNs: authority.request.deadlineMonotonicNs,
      requestIdSha256: digest("request-id", { requestId: authority.request.requestId }),
      requestSha256: authority.request.requestSha256,
      runIdSha256: runAuthority.runIdSha256,
      sequence: authority.request.sequence,
      worktreeSha256: authority.request.worktreeSha256,
    },
    settlement: {
      agentResultSha256: null,
      decisionMonotonicNs: settlement.decisionMonotonicNs,
      error: settlement.error,
      settlementSha256: settlement.settlementSha256,
      startSha256: settlement.startSha256,
      status: settlement.status,
    },
  });
}

async function cleanupRequest(authority) {
  const cleanupStarted = await persistArtifactCleanupStarted(authority.plan, authority.created);
  const names = await readdir(authority.requestDir);
  invariant(
    names.every((name) => REQUEST_FILE_INVENTORY.includes(name)),
    "TASK-540 request cleanup inventory rejected"
  );
  for (const name of REQUEST_FILE_INVENTORY) {
    await unlinkStable(authority.requestDir + "/" + name);
  }
  await rmdir(authority.requestDir);
  await syncDirectory("/tmp");
  await persistArtifactCleaned(authority.plan, authority.created, cleanupStarted);
}

async function finalizeRequest(disposition) {
  invariant(
    disposition === "accepted" || disposition === "rejected_rolled_back",
    "TASK-540 request disposition rejected"
  );
  invariant(REQUESTS.size === 1, "TASK-540 finalization request missing");
  const authority = REQUESTS.values().next().value;
  invariant(
    authority.procedureRecorded || authority.preclaimTimeout,
    "TASK-540 procedure not recorded before finalization"
  );
  if (authority.preclaimTimeout) {
    invariant(
      disposition === "rejected_rolled_back",
      "TASK-540 preclaim timeout cannot be accepted"
    );
    await appendPreclaimTimeoutLedger(authority);
  } else {
    await appendLedger(authority, disposition);
  }
  await cleanupRequest(authority);
  REQUESTS.delete(authority.request.requestId);
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

function requireHex(value, label) {
  invariant(typeof value === "string" && HEX_256.test(value), label);
  return value;
}

function validateSafeLedgerEntry(entry, expectedSequence) {
  exactKeys(
    entry,
    [
      "accessClass",
      "claim",
      "contenders",
      "dispatch",
      "disposition",
      "ledgerEntrySha256",
      "request",
      "settlement",
    ],
    "TASK-540 ledger entry"
  );
  const core = Object.fromEntries(
    Object.entries(entry).filter(([key]) => key !== "ledgerEntrySha256")
  );
  invariant(
    ["read-only", "mutating"].includes(entry.accessClass) &&
      ["accepted", "rejected_rolled_back"].includes(entry.disposition) &&
      entry.ledgerEntrySha256 === digest("ledger-entry", core),
    "TASK-540 ledger entry header rejected"
  );
  exactKeys(entry.claim, ["claimOwner", "claimSha256"], "TASK-540 ledger claim");
  requireHex(entry.claim.claimSha256, "TASK-540 ledger claim hash rejected");
  invariant(
    ["operator", "timeout"].includes(entry.claim.claimOwner),
    "TASK-540 ledger claim owner rejected"
  );
  invariant(
    Array.isArray(entry.contenders) && entry.contenders.length > 0,
    "TASK-540 ledger contenders rejected"
  );
  entry.contenders.forEach((contender, index) => {
    exactKeys(
      contender,
      ["ackSha256", "contenderKind", "startSha256"],
      "TASK-540 ledger contender"
    );
    requireHex(contender.ackSha256, "TASK-540 ledger acknowledgement rejected");
    requireHex(contender.startSha256, "TASK-540 ledger start rejected");
    invariant(
      ["response", "cancel"].includes(contender.contenderKind) &&
        index < 2 &&
        (index === 0 ||
          (entry.contenders[0].contenderKind === "response" &&
            contender.contenderKind === "cancel")),
      "TASK-540 ledger contender order rejected"
    );
  });
  invariant(
    new Set(entry.contenders.map(({ contenderKind }) => contenderKind)).size ===
      entry.contenders.length,
    "TASK-540 ledger contenders duplicated"
  );
  exactKeys(
    entry.request,
    [
      "deadlineMonotonicNs",
      "requestIdSha256",
      "requestSha256",
      "runIdSha256",
      "sequence",
      "worktreeSha256",
    ],
    "TASK-540 ledger request"
  );
  invariant(
    /^[1-9][0-9]*$/u.test(entry.request.deadlineMonotonicNs) &&
      entry.request.sequence === expectedSequence &&
      entry.request.runIdSha256 === runAuthority.runIdSha256 &&
      entry.request.worktreeSha256 === ROOT_AUTHORITY.worktreeSha256,
    "TASK-540 ledger request binding rejected"
  );
  for (const key of ["requestIdSha256", "requestSha256", "runIdSha256", "worktreeSha256"]) {
    requireHex(entry.request[key], "TASK-540 ledger request hash rejected");
  }
  exactKeys(
    entry.settlement,
    [
      "agentResultSha256",
      "decisionMonotonicNs",
      "error",
      "settlementSha256",
      "startSha256",
      "status",
    ],
    "TASK-540 ledger settlement"
  );
  invariant(
    /^[1-9][0-9]*$/u.test(entry.settlement.decisionMonotonicNs) &&
      ["response", "cancelled"].includes(entry.settlement.status) &&
      entry.contenders.some(
        ({ contenderKind, startSha256 }) =>
          startSha256 === entry.settlement.startSha256 &&
          contenderKind === (entry.settlement.status === "response" ? "response" : "cancel")
      ),
    "TASK-540 ledger settlement rejected"
  );
  requireHex(entry.settlement.settlementSha256, "TASK-540 settlement hash rejected");
  requireHex(entry.settlement.startSha256, "TASK-540 settlement start rejected");
  if (entry.settlement.status === "response") {
    requireHex(entry.settlement.agentResultSha256, "TASK-540 result hash rejected");
    invariant(entry.settlement.error === null, "TASK-540 response error rejected");
  } else {
    invariant(
      entry.settlement.agentResultSha256 === null &&
        ["deadline_exceeded", "dispatch_failed"].includes(entry.settlement.error),
      "TASK-540 cancellation settlement rejected"
    );
  }
  exactKeys(
    entry.dispatch,
    [
      "agentResultSha256",
      "agentStateAtFinalList",
      "agentStateAtFirstList",
      "dispatchStatus",
      "forkTurns",
      "interruptAttempted",
      "interruptPreviousState",
      "procedureSha256",
      "spawned",
      "statusSha256",
      "transcriptCorrelationSha256",
    ],
    "TASK-540 ledger dispatch"
  );
  if (entry.dispatch.agentResultSha256 !== null) {
    requireHex(entry.dispatch.agentResultSha256, "TASK-540 dispatch result hash rejected");
  }
  if (entry.claim.claimOwner === "timeout") {
    invariant(
      entry.dispatch.dispatchStatus === "not_started" &&
        entry.dispatch.spawned === false &&
        entry.dispatch.interruptAttempted === false &&
        [
          "agentResultSha256",
          "agentStateAtFinalList",
          "agentStateAtFirstList",
          "forkTurns",
          "interruptPreviousState",
          "procedureSha256",
          "statusSha256",
          "transcriptCorrelationSha256",
        ].every((key) => entry.dispatch[key] === null),
      "TASK-540 timeout dispatch projection rejected"
    );
  } else {
    invariant(
      ["spawned", "spawn_failed"].includes(entry.dispatch.dispatchStatus) &&
        entry.dispatch.forkTurns === "none",
      "TASK-540 operator dispatch projection rejected"
    );
    requireHex(entry.dispatch.procedureSha256, "TASK-540 procedure hash rejected");
    requireHex(entry.dispatch.statusSha256, "TASK-540 status hash rejected");
    if (entry.dispatch.dispatchStatus === "spawned") {
      invariant(entry.dispatch.spawned === true, "TASK-540 spawned projection rejected");
      requireHex(
        entry.dispatch.transcriptCorrelationSha256,
        "TASK-540 transcript hash rejected"
      );
    } else {
      invariant(
        entry.dispatch.spawned === false &&
          entry.dispatch.agentResultSha256 === null &&
          entry.dispatch.transcriptCorrelationSha256 === null,
        "TASK-540 spawn-failed projection rejected"
      );
    }
  }
  return entry;
}

async function stableLedgerEntries() {
  invariant(
    REQUESTS.size === 0 &&
      LEDGER_RECORDS.length === LEDGER_FILES.size &&
      LEDGER_RECORDS.length === requestSequence,
    "TASK-540 ledger cardinality rejected"
  );
  const entries = [];
  for (let index = 0; index < LEDGER_RECORDS.length; index += 1) {
    const record = LEDGER_RECORDS[index];
    const sequence = index + 1;
    invariant(
      record.path ===
        ledgerPath + "/ledger-" + String(sequence).padStart(12, "0") + ".json",
      "TASK-540 ledger path order rejected"
    );
    const stable = await readCanonicalPath(record.path);
    invariant(
      canonicalJson(fileIdentity(stable.info)) === canonicalJson(record.created.identity) &&
        rawDigest(stable.bytes) === record.created.contentSha256 &&
        canonicalJson(stable.value) === canonicalJson(record.entry),
      "TASK-540 ledger stable identity rejected"
    );
    entries.push(validateSafeLedgerEntry(stable.value, sequence));
  }
  return deepFreeze(entries);
}

async function captureLedgerPrefix() {
  invariant(!dispatchFrozen, "TASK-540 cannot capture a frozen ledger");
  const entries = await stableLedgerEntries();
  invariant(entries.length > 0, "TASK-540 ledger prefix must be positive");
  preClosureCount = entries.length;
  preClosureProjection = deepFreeze({
    entries,
    preClosureCount,
    preClosureSha256: digest("ledger-prefix", { entries }),
  });
  return preClosureProjection;
}

async function freezeDispatch() {
  invariant(REQUESTS.size === 0, "TASK-540 cannot freeze with an active request");
  invariant(!dispatchFrozen, "TASK-540 dispatch already frozen");
  invariant(preClosureProjection, "TASK-540 ledger prefix was not captured");
  dispatchFrozen = true;
  const entries = await stableLedgerEntries();
  invariant(
    canonicalJson(entries.slice(0, preClosureCount)) ===
      canonicalJson(preClosureProjection.entries),
    "TASK-540 terminal ledger does not retain its prefix"
  );
  const terminalCore = {
    entries,
    preClosureCount,
    preClosureSha256: preClosureProjection.preClosureSha256,
    schemaVersion: 1,
  };
  const terminalReceipt = deepFreeze({
    count: entries.length,
    preClosureCount,
    preClosureSha256: preClosureProjection.preClosureSha256,
    schemaVersion: 1,
    sha256: digest("terminal-ledger", terminalCore),
  });
  terminalTransaction = await commitTerminalLedger(entries, terminalReceipt);
  return terminalReceipt;
}

async function snapshotTerminalTarget(path) {
  try {
    const record = await readStable(path, 32 * 1024 * 1024);
    return Object.freeze({ bytes: record.bytes, exists: true, mode: fileMode(record.info), path });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return Object.freeze({ bytes: Buffer.alloc(0), exists: false, mode: 0o644, path });
  }
}

async function writeJournalRecord(basename, domain, digestField, core) {
  const record = Object.freeze({ ...core, [digestField]: digest(domain, core) });
  const path = JOURNAL + "/" + basename;
  await writeExclusive(path, Buffer.from(canonicalJson(record)));
  JOURNAL_FILES.add(path);
  return record;
}

function requireJournalEnvelope(value, domain, digestField, label) {
  invariant(isPlainObject(value) && HEX_256.test(value[digestField]), label);
  const core = Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== digestField)
  );
  invariant(value[digestField] === digest(domain, core), label);
  return value;
}

async function cleanupLedgerArtifacts(manifestSha256, transactionId) {
  const cleaned = [];
  for (const record of LEDGER_RECORDS) {
    const cleanupStarted = await persistArtifactCleanupStarted(record.plan, record.created);
    await unlinkStable(record.path);
    const cleanedRecord = await persistArtifactCleaned(record.plan, record.created, cleanupStarted);
    cleaned.push(cleanedRecord.cleanedSha256);
  }
  const directoryCleanupStarted = await persistArtifactCleanupStarted(
    runAuthority.ledgerPlan,
    runAuthority.ledgerCreated
  );
  await rmdir(ledgerPath);
  await syncDirectory("/tmp");
  const directoryCleaned = await persistArtifactCleaned(
    runAuthority.ledgerPlan,
    runAuthority.ledgerCreated,
    directoryCleanupStarted
  );
  await writeJournalRecord(
    "ledger-cleaned.json",
    "recovery-ledger-cleaned",
    "ledgerCleanedSha256",
    {
      ledgerDirectoryCleanedSha256: directoryCleaned.cleanedSha256,
      ledgerEntryCleanedSha256s: cleaned,
      manifestSha256,
      transactionId,
    }
  );
}

async function currentClosureGeneration() {
  const source = await readFile(
    ROOT + "/_docs/_TASKS/TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md",
    "utf8"
  );
  const matches = [...source.matchAll(/^\*\*Closure Generation:\*\* ([1-9][0-9]*)$/gmu)];
  if (matches.length === 0) return 1;
  invariant(matches.length === 1, "TASK-540 closure generation duplicated");
  const generation = Number(matches[0][1]);
  invariant(Number.isSafeInteger(generation), "TASK-540 closure generation rejected");
  return generation;
}

function decodeUtf8(bytes, label) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(label);
  }
}

function replaceExactlyOnce(source, before, after, label) {
  invariant(before.length > 0 && source.split(before).length === 2, label);
  return source.replace(before, after);
}

function evidenceRegion(source) {
  const start = source.indexOf(EVIDENCE_BEGIN);
  const end = source.indexOf(EVIDENCE_END, start + EVIDENCE_BEGIN.length);
  invariant(
    start >= 0 &&
      end >= 0 &&
      source.indexOf(EVIDENCE_BEGIN, start + 1) < 0 &&
      source.indexOf(EVIDENCE_END, end + 1) < 0,
    "TASK-540 terminal evidence region rejected"
  );
  const block = source.slice(start, end + EVIDENCE_END.length);
  const prefix = EVIDENCE_BEGIN + "\n```json\n";
  const suffix = "\n```\n" + EVIDENCE_END;
  invariant(block.startsWith(prefix) && block.endsWith(suffix), "TASK-540 evidence framing rejected");
  const payload = JSON.parse(block.slice(prefix.length, -suffix.length));
  invariant(
    isPlainObject(payload) &&
      block === prefix + JSON.stringify(payload, null, 2) + suffix,
    "TASK-540 evidence serialization rejected"
  );
  return Object.freeze({ block, payload });
}

function terminalLedgerControl(control, entries, receipt) {
  exactKeys(
    control,
    [
      "schemaVersion",
      "generation",
      "boardBaseline",
      "changelogPath",
      "gateReceipt",
      "collaborationLedger",
    ],
    "TASK-540 closure control"
  );
  exactKeys(
    control.gateReceipt,
    ["field", "valueSha256"],
    "TASK-540 closure gate receipt"
  );
  invariant(
    control.schemaVersion === 1 &&
      Number.isSafeInteger(control.generation) &&
      control.generation > 0 &&
      /^toDo [0-9]+ \/ inProgress [0-9]+ \/ done [0-9]+$/u.test(
        control.boardBaseline
      ) &&
      control.changelogPath === TERMINAL_TARGET_RELATIVE_PATHS[0] &&
      ["Targeted Gate Passed", "Revalidation Passed"].includes(
        control.gateReceipt.field
      ) &&
      HEX_256.test(control.gateReceipt.valueSha256),
    "TASK-540 closure control fields rejected"
  );
  exactKeys(
    control.collaborationLedger,
    ["preClosureCount", "preClosureSha256", "terminalCount", "terminalSha256"],
    "TASK-540 collaboration ledger control"
  );
  invariant(
    control.collaborationLedger.preClosureCount === preClosureProjection.preClosureCount &&
      control.collaborationLedger.preClosureSha256 === preClosureProjection.preClosureSha256 &&
      control.collaborationLedger.terminalCount === null &&
      control.collaborationLedger.terminalSha256 === null,
    "TASK-540 pre-terminal collaboration control rejected"
  );
  return deepFreeze({
    ...control,
    collaborationLedger: {
      ...control.collaborationLedger,
      terminalCount: entries.length,
      terminalSha256: receipt.sha256,
    },
  });
}

function transformTerminalTargetBytes(currentTargets, entries, receipt) {
  invariant(
    currentTargets.length === TERMINAL_TARGET_RELATIVE_PATHS.length &&
      currentTargets.every(
        (target, index) => target.path === ROOT + "/" + TERMINAL_TARGET_RELATIVE_PATHS[index]
      ),
    "TASK-540 terminal target order rejected"
  );
  const sources = currentTargets.map(({ bytes }) =>
    decodeUtf8(bytes, "TASK-540 terminal target is not UTF-8")
  );
  const evidence = evidenceRegion(sources[0]);
  invariant(
    canonicalJson(evidence.payload.collaborationLedgerPrefix) ===
      canonicalJson(preClosureProjection.entries) &&
      evidence.payload.terminalCollaborationReceipt === null,
    "TASK-540 evidence ledger prefix rejected"
  );
  const oldControl = evidence.payload.closureControl;
  const newControl = terminalLedgerControl(oldControl, entries, receipt);
  const newEvidencePayload = {
    ...evidence.payload,
    closureControl: newControl,
    collaborationLedgerPrefix: entries,
    terminalCollaborationReceipt: receipt,
  };
  const newEvidenceBlock =
    EVIDENCE_BEGIN +
    "\n```json\n" +
    JSON.stringify(newEvidencePayload, null, 2) +
    "\n```\n" +
    EVIDENCE_END;
  const oldEvidenceSha256 = rawDigest(Buffer.from(evidence.block));
  const newEvidenceSha256 = rawDigest(Buffer.from(newEvidenceBlock));
  const transformed = [
    replaceExactlyOnce(
      sources[0],
      evidence.block,
      newEvidenceBlock,
      "TASK-540 evidence block is not unique"
    ),
  ];
  const taskReceiptBefore = "**Closure Evidence SHA-256:** " + oldEvidenceSha256;
  const taskReceiptAfter = "**Closure Evidence SHA-256:** " + newEvidenceSha256;
  for (const source of sources.slice(1, 4)) {
    transformed.push(
      replaceExactlyOnce(
        source,
        taskReceiptBefore,
        taskReceiptAfter,
        "TASK-540 closure task receipt is not unique"
      )
    );
  }
  const anchorLines = sources[4]
    .split("\n")
    .filter((line) => line.startsWith(CLOSURE_ANCHOR_PREFIX));
  invariant(
    anchorLines.length === 1 && anchorLines[0].endsWith(CLOSURE_ANCHOR_SUFFIX),
    "TASK-540 terminal anchor rejected"
  );
  invariant(
    sources[4].split("## Index\n" + anchorLines[0] + "\n\n").length === 2,
    "TASK-540 terminal anchor slot rejected"
  );
  const oldAnchor = JSON.parse(
    anchorLines[0].slice(CLOSURE_ANCHOR_PREFIX.length, -CLOSURE_ANCHOR_SUFFIX.length)
  );
  exactKeys(
    oldAnchor,
    [
      "schemaVersion",
      "evidenceSha256",
      "closureControl",
      "collaborationLedgerPrefix",
      "terminalCollaborationReceipt",
      "repairAuthorization",
    ],
    "TASK-540 terminal anchor"
  );
  invariant(
    oldAnchor.schemaVersion === 1 &&
      oldAnchor.evidenceSha256 === oldEvidenceSha256 &&
      canonicalJson(oldAnchor.closureControl) === canonicalJson(oldControl) &&
      canonicalJson(oldAnchor.collaborationLedgerPrefix) ===
        canonicalJson(preClosureProjection.entries) &&
      oldAnchor.terminalCollaborationReceipt === null &&
      oldAnchor.repairAuthorization === null,
    "TASK-540 terminal anchor preimage rejected"
  );
  const newAnchor = {
    ...oldAnchor,
    evidenceSha256: newEvidenceSha256,
    closureControl: newControl,
    collaborationLedgerPrefix: entries,
    terminalCollaborationReceipt: receipt,
  };
  const newAnchorLine =
    CLOSURE_ANCHOR_PREFIX + JSON.stringify(newAnchor) + CLOSURE_ANCHOR_SUFFIX;
  transformed.push(
    replaceExactlyOnce(
      sources[4],
      anchorLines[0],
      newAnchorLine,
      "TASK-540 closure anchor is not unique"
    )
  );
  return Object.freeze({
    evidenceSha256: newEvidenceSha256,
    payloads: Object.freeze(transformed.map((source) => Buffer.from(source, "utf8"))),
  });
}

async function unlinkReplacementTemp(path, expectedMode) {
  const record = await readStable(path, 32 * 1024 * 1024);
  invariant(
    [0o600, expectedMode].includes(fileMode(record.info)),
    "TASK-540 terminal temp mode rejected"
  );
  await unlink(path);
  await syncDirectory(dirname(path));
}

async function replaceTerminalTarget(target, requiredBytes, oppositeBytes) {
  let temporary = null;
  try {
    temporary = await readStable(target.tempPath, 32 * 1024 * 1024);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const current = await readStable(target.path, 32 * 1024 * 1024);
  const currentSha256 = rawDigest(current.bytes);
  invariant(
    [target.oldSha256, target.newSha256].includes(currentSha256) &&
      fileMode(current.info) === target.mode,
    "TASK-540 terminal target preimage rejected"
  );
  if (temporary) {
    if (
      rawDigest(temporary.bytes) === rawDigest(requiredBytes) &&
      fileMode(temporary.info) === target.mode
    ) {
      await rename(target.tempPath, target.path);
      await syncDirectory(dirname(target.path));
    } else {
      invariant(
        temporary.bytes.length <= Math.max(requiredBytes.length, oppositeBytes.length),
        "TASK-540 terminal temp bytes rejected"
      );
      await unlinkReplacementTemp(target.tempPath, target.mode);
      temporary = null;
    }
  }
  if (!temporary && currentSha256 !== rawDigest(requiredBytes)) {
    const handle = await open(
      target.tempPath,
      FS_CONSTANTS.O_CREAT |
        FS_CONSTANTS.O_EXCL |
        FS_CONSTANTS.O_WRONLY |
        FS_CONSTANTS.O_NOFOLLOW,
      0o600
    );
    try {
      await handle.writeFile(requiredBytes);
      await handle.chmod(target.mode);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(target.tempPath, target.path);
    await syncDirectory(dirname(target.path));
  } else {
    await syncDirectory(dirname(target.path));
  }
  const verified = await readStable(target.path, 32 * 1024 * 1024);
  invariant(
    rawDigest(verified.bytes) === rawDigest(requiredBytes) &&
      fileMode(verified.info) === target.mode,
    "TASK-540 terminal target replacement rejected"
  );
}

function statusJournalPath(name) {
  invariant(
    /^(?:status\.(?:manifest|prepared|rollback-prepared|committed)\.json|(?:old|new)-(?:[0-9]|1[0-7])\.bin)$/u.test(
      name
    ),
    "TASK-540 status journal name rejected"
  );
  return STATUS_JOURNAL + "/" + name;
}

async function writeStatusJournalRecord(basename, domain, digestField, core) {
  const record = Object.freeze({ ...core, [digestField]: digest(domain, core) });
  await writeExclusive(statusJournalPath(basename), Buffer.from(canonicalJson(record)));
  return record;
}

async function optionalStatusRecord(name) {
  try {
    return await readCanonicalPath(statusJournalPath(name));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function validateStatusTransactionInput(value) {
  exactKeys(value, ["generation", "targets"], "TASK-540 status transaction input");
  invariant(
    Number.isSafeInteger(value.generation) &&
      value.generation > 0 &&
      Array.isArray(value.targets) &&
      value.targets.length === STATUS_TARGET_RELATIVE_PATHS.length,
    "TASK-540 status transaction header rejected"
  );
  const targets = value.targets.map((target, index) => {
    exactKeys(target, ["path", "source"], "TASK-540 status transaction target");
    const relativePath = STATUS_TARGET_RELATIVE_PATHS[index];
    const bytes = Buffer.from(target.source, "utf8");
    invariant(
      target.path === relativePath &&
        typeof target.source === "string" &&
        !target.source.includes("\0") &&
        bytes.length > 0 &&
        bytes.length <= 32 * 1024 * 1024 &&
        new TextDecoder("utf-8", { fatal: true }).decode(bytes) === target.source,
      "TASK-540 status transaction target rejected"
    );
    return Object.freeze({ bytes, relativePath });
  });
  return Object.freeze({ generation: value.generation, targets: Object.freeze(targets) });
}

function validateStatusTargetShape(target, index, label) {
  exactKeys(
    target,
    ["index", "mode", "newSha256", "oldSha256", "path", "tempPath"],
    label
  );
  const relativePath = STATUS_TARGET_RELATIVE_PATHS[index];
  const transactionId = basename(target.tempPath).match(
    /^\.task540-status-([a-f0-9]{32})-(?:[0-9]|1[0-7])\.tmp$/u
  )?.[1];
  invariant(
    target.index === index &&
      Number.isSafeInteger(target.mode) &&
      target.mode >= 0 &&
      target.mode <= 0o777 &&
      HEX_256.test(target.oldSha256) &&
      HEX_256.test(target.newSha256) &&
      target.path === ROOT + "/" + relativePath &&
      dirname(target.tempPath) === dirname(target.path) &&
      basename(target.tempPath) === ".task540-status-" + transactionId + "-" + index + ".tmp" &&
      HEX_128.test(transactionId),
    label
  );
  return transactionId;
}

function validateStatusManifest(manifest, prepared) {
  exactKeys(
    manifest,
    [
      "branchSha256",
      "generation",
      "gitDirSha256",
      "mode",
      "rootSha256",
      "statusManifestSha256",
      "targets",
      "transactionId",
      "worktreeSha256",
    ],
    "TASK-540 status manifest"
  );
  exactKeys(
    prepared,
    [
      "manifestSha256",
      "newPayloadSha256s",
      "oldPayloadSha256s",
      "statusPreparedSha256",
      "transactionId",
    ],
    "TASK-540 status prepared"
  );
  invariant(
    manifest.mode === "status-close" &&
      manifest.branchSha256 === ROOT_AUTHORITY.branchSha256 &&
      manifest.gitDirSha256 === ROOT_AUTHORITY.gitDirSha256 &&
      manifest.rootSha256 === ROOT_AUTHORITY.rootSha256 &&
      manifest.worktreeSha256 === ROOT_AUTHORITY.worktreeSha256 &&
      Number.isSafeInteger(manifest.generation) &&
      manifest.generation > 0 &&
      HEX_128.test(manifest.transactionId) &&
      Array.isArray(manifest.targets) &&
      manifest.targets.length === 18,
    "TASK-540 status manifest authority rejected"
  );
  manifest.targets.forEach((target, index) => {
    invariant(
      validateStatusTargetShape(target, index, "TASK-540 status manifest target") ===
        manifest.transactionId,
      "TASK-540 status target transaction rejected"
    );
  });
  const oldPayloadSha256s = manifest.targets.map(({ oldSha256 }) => oldSha256);
  const newPayloadSha256s = manifest.targets.map(({ newSha256 }) => newSha256);
  invariant(
    prepared.manifestSha256 === manifest.statusManifestSha256 &&
      prepared.transactionId === manifest.transactionId &&
      JSON.stringify(prepared.oldPayloadSha256s) === JSON.stringify(oldPayloadSha256s) &&
      JSON.stringify(prepared.newPayloadSha256s) === JSON.stringify(newPayloadSha256s),
    "TASK-540 status prepared binding rejected"
  );
  return Object.freeze({ manifest, newPayloadSha256s, oldPayloadSha256s, prepared });
}

async function readStatusPayloads(manifest) {
  const oldPayloads = [];
  const newPayloads = [];
  for (let index = 0; index < 18; index += 1) {
    const [oldRecord, newRecord] = await Promise.all([
      readStable(statusJournalPath("old-" + index + ".bin"), 32 * 1024 * 1024),
      readStable(statusJournalPath("new-" + index + ".bin"), 32 * 1024 * 1024),
    ]);
    invariant(
      fileMode(oldRecord.info) === 0o600 &&
        fileMode(newRecord.info) === 0o600 &&
        rawDigest(oldRecord.bytes) === manifest.targets[index].oldSha256 &&
        rawDigest(newRecord.bytes) === manifest.targets[index].newSha256,
      "TASK-540 status payload rejected"
    );
    oldPayloads.push(oldRecord.bytes);
    newPayloads.push(newRecord.bytes);
  }
  return Object.freeze({
    newPayloads: Object.freeze(newPayloads),
    oldPayloads: Object.freeze(oldPayloads),
  });
}

async function verifyStatusTargets(transaction, direction) {
  const hashField = direction === "new" ? "newSha256" : "oldSha256";
  invariant(["new", "old"].includes(direction), "TASK-540 status direction rejected");
  for (const target of transaction.manifest.targets) {
    const current = await readStable(target.path, 32 * 1024 * 1024);
    invariant(
      rawDigest(current.bytes) === target[hashField] && fileMode(current.info) === target.mode,
      "TASK-540 status target verification rejected"
    );
    await requireAbsentPath(target.tempPath, "TASK-540 status temp remained");
  }
  return transaction;
}

async function removeStatusJournal(transaction, direction) {
  await verifyStatusTargets(transaction, direction);
  await unlinkStable(statusJournalPath("status.committed.json"));
  await unlinkStable(statusJournalPath("status.rollback-prepared.json"));
  for (let index = 17; index >= 0; index -= 1) {
    await unlinkStable(statusJournalPath("new-" + index + ".bin"));
  }
  for (let index = 17; index >= 0; index -= 1) {
    await unlinkStable(statusJournalPath("old-" + index + ".bin"));
  }
  await unlinkStable(statusJournalPath("status.prepared.json"));
  await unlinkStable(statusJournalPath("status.manifest.json"));
  const remaining = await readdir(STATUS_JOURNAL);
  invariant(remaining.length === 0, "TASK-540 status journal cleanup inventory rejected");
  await rmdir(STATUS_JOURNAL);
  await syncDirectory(ROOT_AUTHORITY.gitDir);
  statusTransaction = null;
}

async function writeStatusRollbackMarker(transaction) {
  const existing = await optionalStatusRecord("status.rollback-prepared.json");
  if (existing) {
    const rollback = requireJournalEnvelope(
      existing.value,
      "status-rollback-prepared",
      "statusRollbackPreparedSha256",
      "TASK-540 status rollback marker rejected"
    );
    exactKeys(
      rollback,
      ["manifestSha256", "statusRollbackPreparedSha256", "transactionId"],
      "TASK-540 status rollback marker"
    );
    invariant(
      rollback.manifestSha256 === transaction.manifest.statusManifestSha256 &&
        rollback.transactionId === transaction.manifest.transactionId,
      "TASK-540 status rollback marker binding rejected"
    );
    return rollback;
  }
  return writeStatusJournalRecord(
    "status.rollback-prepared.json",
    "status-rollback-prepared",
    "statusRollbackPreparedSha256",
    {
      manifestSha256: transaction.manifest.statusManifestSha256,
      transactionId: transaction.manifest.transactionId,
    }
  );
}

async function convergeStatusTransaction(transaction, direction) {
  const required = direction === "new" ? transaction.newPayloads : transaction.oldPayloads;
  const opposite = direction === "new" ? transaction.oldPayloads : transaction.newPayloads;
  for (let index = 0; index < 18; index += 1) {
    await replaceTerminalTarget(transaction.manifest.targets[index], required[index], opposite[index]);
  }
  return verifyStatusTargets(transaction, direction);
}

async function commitStatusClosure(rawInput) {
  invariant(!statusTransaction, "TASK-540 status transaction already exists");
  const input = validateStatusTransactionInput(rawInput);
  try {
    await lstat(STATUS_JOURNAL);
    throw new Error("TASK-540 status journal already exists");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir(STATUS_JOURNAL, { mode: 0o700 });
  await syncDirectory(ROOT_AUTHORITY.gitDir);
  const directory = await lstat(STATUS_JOURNAL, { bigint: true });
  invariant(
    directory.isDirectory() &&
      !directory.isSymbolicLink() &&
      directory.uid === BigInt(process.getuid()) &&
      fileMode(directory) === 0o700,
    "TASK-540 status journal directory rejected"
  );
  const currentTargets = await Promise.all(
    STATUS_TARGET_RELATIVE_PATHS.map((relativePath) =>
      snapshotTerminalTarget(ROOT + "/" + relativePath)
    )
  );
  invariant(currentTargets.every(({ exists }) => exists), "TASK-540 status target missing");
  const transactionId = randomId();
  const targets = currentTargets.map((target, index) => ({
    index,
    mode: target.mode,
    newSha256: rawDigest(input.targets[index].bytes),
    oldSha256: rawDigest(target.bytes),
    path: target.path,
    tempPath: dirname(target.path) + "/.task540-status-" + transactionId + "-" + index + ".tmp",
  }));
  for (let index = 0; index < 18; index += 1) {
    await writeExclusive(statusJournalPath("old-" + index + ".bin"), currentTargets[index].bytes);
    await writeExclusive(statusJournalPath("new-" + index + ".bin"), input.targets[index].bytes);
  }
  const manifest = await writeStatusJournalRecord(
    "status.manifest.json",
    "status-manifest",
    "statusManifestSha256",
    {
      branchSha256: ROOT_AUTHORITY.branchSha256,
      generation: input.generation,
      gitDirSha256: ROOT_AUTHORITY.gitDirSha256,
      mode: "status-close",
      rootSha256: ROOT_AUTHORITY.rootSha256,
      targets,
      transactionId,
      worktreeSha256: ROOT_AUTHORITY.worktreeSha256,
    }
  );
  const prepared = await writeStatusJournalRecord(
    "status.prepared.json",
    "status-prepared",
    "statusPreparedSha256",
    {
      manifestSha256: manifest.statusManifestSha256,
      newPayloadSha256s: targets.map(({ newSha256 }) => newSha256),
      oldPayloadSha256s: targets.map(({ oldSha256 }) => oldSha256),
      transactionId,
    }
  );
  const transaction = Object.freeze({
    manifest,
    newPayloads: Object.freeze(input.targets.map(({ bytes }) => bytes)),
    oldPayloads: Object.freeze(currentTargets.map(({ bytes }) => bytes)),
    prepared,
  });
  statusTransaction = transaction;
  try {
    await convergeStatusTransaction(transaction, "new");
    const committed = await writeStatusJournalRecord(
      "status.committed.json",
      "status-committed",
      "statusCommittedSha256",
      {
        boardNewSha256: targets.at(-1).newSha256,
        manifestSha256: manifest.statusManifestSha256,
        transactionId,
      }
    );
    statusTransaction = Object.freeze({ ...transaction, committed });
    return deepFreeze({
      generation: manifest.generation,
      manifestSha256: manifest.statusManifestSha256,
      targetCount: targets.length,
    });
  } catch (error) {
    await writeStatusRollbackMarker(transaction);
    await convergeStatusTransaction(transaction, "old");
    await removeStatusJournal(transaction, "old");
    throw error;
  }
}

async function rollbackStatusClosure() {
  if (!statusTransaction) return Object.freeze({ status: "absent" });
  const transaction = statusTransaction;
  await writeStatusRollbackMarker(transaction);
  await convergeStatusTransaction(transaction, "old");
  await removeStatusJournal(transaction, "old");
  return Object.freeze({ status: "rolled-back" });
}

async function verifyStatusClosure() {
  invariant(statusTransaction, "TASK-540 committed status transaction missing");
  await verifyStatusTargets(statusTransaction, "new");
  return Object.freeze({
    generation: statusTransaction.manifest.generation,
    manifestSha256: statusTransaction.manifest.statusManifestSha256,
    targetCount: statusTransaction.manifest.targets.length,
  });
}

async function discardUnpreparedStatusJournal(names) {
  invariant(
    !names.includes("status.prepared.json") &&
      !names.includes("status.rollback-prepared.json") &&
      !names.includes("status.committed.json"),
    "TASK-540 unprepared status journal has a terminal marker"
  );
  for (const name of [...names].sort().reverse()) {
    await unlinkStable(statusJournalPath(name));
  }
  const remaining = await readdir(STATUS_JOURNAL);
  invariant(remaining.length === 0, "TASK-540 unprepared status cleanup rejected");
  await rmdir(STATUS_JOURNAL);
  await syncDirectory(ROOT_AUTHORITY.gitDir);
}

async function recoverStatusJournalAtStartup() {
  let directory;
  try {
    directory = await lstat(STATUS_JOURNAL, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  invariant(
    directory.isDirectory() &&
      !directory.isSymbolicLink() &&
      directory.uid === BigInt(process.getuid()) &&
      fileMode(directory) === 0o700,
    "TASK-540 recovered status journal directory rejected"
  );
  const names = (await readdir(STATUS_JOURNAL)).sort();
  invariant(
    names.length > 0 &&
      names.every((name) =>
        /^(?:status\.(?:manifest|prepared|rollback-prepared|committed)\.json|(?:old|new)-(?:[0-9]|1[0-7])\.bin)$/u.test(
          name
        )
      ),
    "TASK-540 recovered status journal inventory rejected"
  );
  if (!names.includes("status.prepared.json")) {
    await discardUnpreparedStatusJournal(names);
    return null;
  }
  const requiredNames = [
    "status.manifest.json",
    "status.prepared.json",
    ...Array.from({ length: 18 }, (_, index) => "old-" + index + ".bin"),
    ...Array.from({ length: 18 }, (_, index) => "new-" + index + ".bin"),
  ];
  invariant(
    requiredNames.every((name) => names.includes(name)),
    "TASK-540 prepared status journal is incomplete"
  );
  const [manifestRecord, preparedRecord, rollbackRecord, committedRecord] = await Promise.all([
    readCanonicalPath(statusJournalPath("status.manifest.json")),
    readCanonicalPath(statusJournalPath("status.prepared.json")),
    optionalStatusRecord("status.rollback-prepared.json"),
    optionalStatusRecord("status.committed.json"),
  ]);
  const manifest = requireJournalEnvelope(
    manifestRecord.value,
    "status-manifest",
    "statusManifestSha256",
    "TASK-540 recovered status manifest rejected"
  );
  const prepared = requireJournalEnvelope(
    preparedRecord.value,
    "status-prepared",
    "statusPreparedSha256",
    "TASK-540 recovered status prepared rejected"
  );
  validateStatusManifest(manifest, prepared);
  const payloads = await readStatusPayloads(manifest);
  const transaction = Object.freeze({ manifest, prepared, ...payloads });
  let rollback = null;
  if (rollbackRecord) {
    rollback = requireJournalEnvelope(
      rollbackRecord.value,
      "status-rollback-prepared",
      "statusRollbackPreparedSha256",
      "TASK-540 recovered status rollback marker rejected"
    );
    exactKeys(
      rollback,
      ["manifestSha256", "statusRollbackPreparedSha256", "transactionId"],
      "TASK-540 recovered status rollback marker"
    );
    invariant(
      rollback.manifestSha256 === manifest.statusManifestSha256 &&
        rollback.transactionId === manifest.transactionId,
      "TASK-540 recovered status rollback binding rejected"
    );
  }
  let committed = null;
  if (committedRecord) {
    committed = requireJournalEnvelope(
      committedRecord.value,
      "status-committed",
      "statusCommittedSha256",
      "TASK-540 recovered status committed marker rejected"
    );
    exactKeys(
      committed,
      [
        "boardNewSha256",
        "manifestSha256",
        "statusCommittedSha256",
        "transactionId",
      ],
      "TASK-540 recovered status committed marker"
    );
    invariant(
      committed.boardNewSha256 === manifest.targets.at(-1).newSha256 &&
        committed.manifestSha256 === manifest.statusManifestSha256 &&
        committed.transactionId === manifest.transactionId,
      "TASK-540 recovered status committed binding rejected"
    );
  }
  const board = await readStable(manifest.targets.at(-1).path, 32 * 1024 * 1024);
  const boardSha256 = rawDigest(board.bytes);
  invariant(
    [manifest.targets.at(-1).oldSha256, manifest.targets.at(-1).newSha256].includes(
      boardSha256
    ),
    "TASK-540 recovered status board state rejected"
  );
  const rollBack = Boolean(rollback) || boardSha256 === manifest.targets.at(-1).oldSha256;
  invariant(
    !committed || rollback || !rollBack,
    "TASK-540 recovered status committed marker contradicts board"
  );
  statusTransaction = Object.freeze({ ...transaction, ...(committed ? { committed } : {}) });
  if (rollBack) {
    await writeStatusRollbackMarker(statusTransaction);
    await convergeStatusTransaction(statusTransaction, "old");
    await removeStatusJournal(statusTransaction, "old");
    return null;
  }
  await convergeStatusTransaction(statusTransaction, "new");
  if (!committed) {
    committed = await writeStatusJournalRecord(
      "status.committed.json",
      "status-committed",
      "statusCommittedSha256",
      {
        boardNewSha256: manifest.targets.at(-1).newSha256,
        manifestSha256: manifest.statusManifestSha256,
        transactionId: manifest.transactionId,
      }
    );
    statusTransaction = Object.freeze({ ...transaction, committed });
  }
  return statusTransaction;
}

async function commitTerminalLedger(entries, terminalReceipt) {
  const currentTargets = await Promise.all(
    TERMINAL_TARGET_RELATIVE_PATHS.map((relativePath) =>
      snapshotTerminalTarget(ROOT + "/" + relativePath)
    )
  );
  invariant(currentTargets.every(({ exists }) => exists), "TASK-540 terminal target missing");
  const transformed = transformTerminalTargetBytes(currentTargets, entries, terminalReceipt);
  const transactionId = randomId();
  const targets = currentTargets.map((target, index) => ({
    index,
    mode: target.mode,
    newSha256: rawDigest(transformed.payloads[index]),
    oldSha256: rawDigest(target.bytes),
    path: target.path,
    tempPath: dirname(target.path) + "/.task540-" + transactionId + "-" + index + ".tmp",
  }));
  const oldPayloadSha256s = targets.map(({ oldSha256 }) => oldSha256);
  const newPayloadSha256s = targets.map(({ newSha256 }) => newSha256);
  for (let index = 0; index < targets.length; index += 1) {
    for (const [prefix, bytes] of [
      ["old", currentTargets[index].bytes],
      ["new", transformed.payloads[index]],
    ]) {
      const payloadPath = JOURNAL + "/" + prefix + "-" + index + ".bin";
      await writeExclusive(payloadPath, bytes);
      JOURNAL_FILES.add(payloadPath);
    }
  }
  const manifest = await writeJournalRecord(
    "terminal.manifest.json",
    "recovery-manifest",
    "manifestSha256",
    {
      branchSha256: ROOT_AUTHORITY.branchSha256,
      entries,
      generation: await currentClosureGeneration(),
      gitDirSha256: ROOT_AUTHORITY.gitDirSha256,
      ledgerDirectoryCreatedSha256: runAuthority.ledgerCreated.createdSha256,
      ledgerEntryCreatedSha256s: LEDGER_RECORDS.map(({ created }) => created.createdSha256),
      mode: "terminal",
      preClosureCount: preClosureProjection.preClosureCount,
      preClosureSha256: preClosureProjection.preClosureSha256,
      rootSha256: ROOT_AUTHORITY.rootSha256,
      runSha256: runAuthority.runSha256,
      targets,
      terminalReceipt,
      transactionId,
      worktreeSha256: ROOT_AUTHORITY.worktreeSha256,
    }
  );
  await writeJournalRecord("terminal.prepared.json", "recovery-prepared", "preparedSha256", {
    manifestSha256: manifest.manifestSha256,
    newPayloadSha256s,
    oldPayloadSha256s,
    transactionId,
  });
  try {
    for (let index = 0; index < targets.length; index += 1) {
      await replaceTerminalTarget(
        targets[index],
        transformed.payloads[index],
        currentTargets[index].bytes
      );
    }
    const committed = await writeJournalRecord(
      "committed.json",
      "recovery-committed",
      "committedSha256",
      {
        indexNewSha256: targets.at(-1).newSha256,
        manifestSha256: manifest.manifestSha256,
        terminalSha256: terminalReceipt.sha256,
        transactionId,
      }
    );
    return deepFreeze({ committed, manifest, terminalReceipt, transactionId });
  } catch (error) {
    await writeJournalRecord(
      "terminal.rollback-prepared.json",
      "recovery-rollback-prepared",
      "rollbackPreparedSha256",
      {
        manifestSha256: manifest.manifestSha256,
        reason: "terminal_verification_failed",
        transactionId,
      }
    );
    for (let index = 0; index < targets.length; index += 1) {
      await replaceTerminalTarget(
        targets[index],
        currentTargets[index].bytes,
        transformed.payloads[index]
      );
    }
    throw error;
  }
}

async function rollbackTerminalClosure() {
  if (!terminalTransaction) return Object.freeze({ status: "absent" });
  const transaction = terminalTransaction;
  let rollbackRecord = await optionalRecoveryJson("terminal.rollback-prepared.json");
  if (!rollbackRecord) {
    await writeJournalRecord(
      "terminal.rollback-prepared.json",
      "recovery-rollback-prepared",
      "rollbackPreparedSha256",
      {
        manifestSha256: transaction.manifest.manifestSha256,
        reason: "terminal_verification_failed",
        transactionId: transaction.manifest.transactionId,
      }
    );
    rollbackRecord = await optionalRecoveryJson("terminal.rollback-prepared.json");
  }
  const rollback = requireJournalEnvelope(
    rollbackRecord.value,
    "recovery-rollback-prepared",
    "rollbackPreparedSha256",
    "TASK-540 terminal rollback marker rejected"
  );
  exactKeys(
    rollback,
    ["manifestSha256", "reason", "rollbackPreparedSha256", "transactionId"],
    "TASK-540 terminal rollback marker"
  );
  invariant(
    rollback.manifestSha256 === transaction.manifest.manifestSha256 &&
      rollback.reason === "terminal_verification_failed" &&
      rollback.transactionId === transaction.manifest.transactionId,
    "TASK-540 terminal rollback binding rejected"
  );
  for (let index = 0; index < 5; index += 1) {
    const [oldRecord, newRecord] = await Promise.all([
      readStable(JOURNAL + "/old-" + index + ".bin", 32 * 1024 * 1024),
      readStable(JOURNAL + "/new-" + index + ".bin", 32 * 1024 * 1024),
    ]);
    const target = transaction.manifest.targets[index];
    invariant(
      rawDigest(oldRecord.bytes) === target.oldSha256 &&
        rawDigest(newRecord.bytes) === target.newSha256,
      "TASK-540 terminal rollback payload rejected"
    );
    await replaceTerminalTarget(target, oldRecord.bytes, newRecord.bytes);
  }
  for (const target of transaction.manifest.targets) {
    const current = await readStable(target.path, 32 * 1024 * 1024);
    invariant(
      rawDigest(current.bytes) === target.oldSha256 && fileMode(current.info) === target.mode,
      "TASK-540 terminal rollback target rejected"
    );
  }
  terminalTransaction = null;
  return Object.freeze({ status: "rolled-back" });
}

async function rollbackClosureTransactions() {
  const terminal = await rollbackTerminalClosure();
  const status = await rollbackStatusClosure();
  return Object.freeze({ status: status.status, terminal: terminal.status });
}

async function removeCurrentJournal() {
  const actual = (await readdir(JOURNAL)).sort();
  const expected = [...JOURNAL_FILES].map((path) => basename(path)).sort();
  invariant(
    JSON.stringify(actual) === JSON.stringify(expected),
    "TASK-540 recovery journal inventory rejected"
  );
  for (const path of [...JOURNAL_FILES].reverse()) await unlinkStable(path);
  await rmdir(JOURNAL);
  await syncDirectory(ROOT_AUTHORITY.gitDir);
}

function knownRecoveryJournalName(name) {
  return (
    /^(?:run|run\.prepared)\.json$/u.test(name) ||
    /^ledger-directory\.(?:planned|created|cleanup-started|cleaned)\.json$/u.test(name) ||
    /^(?:request|ledger)-[0-9]{12}\.(?:planned|created|cleanup-started|cleaned)\.json$/u.test(
      name
    ) ||
    /^launch-[0-9]{12}\.(?:planned|armed|cleanup-started|cleaned)\.json$/u.test(name) ||
    /^(?:abort-receipt|abort\.manifest|abort\.prepared|terminal\.manifest|terminal\.prepared|terminal\.rollback-prepared|committed|ledger-cleaned)\.json$/u.test(
      name
    ) ||
    /^(?:old|new)-[0-4]\.bin$/u.test(name)
  );
}

async function optionalRecoveryJson(name) {
  try {
    const record = await readStable(JOURNAL + "/" + name, 32 * 1024 * 1024);
    return Object.freeze({
      ...record,
      value: parseCanonical(
        record.bytes,
        false,
        32 * 1024 * 1024,
        "TASK-540 recovery JSON rejected"
      ),
    });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function loadPreparedTerminalRecovery() {
  const [manifestRecord, preparedRecord] = await Promise.all([
    optionalRecoveryJson("terminal.manifest.json"),
    optionalRecoveryJson("terminal.prepared.json"),
  ]);
  invariant(manifestRecord && preparedRecord, "TASK-540 terminal prepared predecessor missing");
  const manifest = requireJournalEnvelope(
    manifestRecord.value,
    "recovery-manifest",
    "manifestSha256",
    "TASK-540 recovery terminal manifest rejected"
  );
  const prepared = requireJournalEnvelope(
    preparedRecord.value,
    "recovery-prepared",
    "preparedSha256",
    "TASK-540 recovery terminal prepared rejected"
  );
  exactKeys(
    manifest,
    [
      "branchSha256",
      "entries",
      "generation",
      "gitDirSha256",
      "ledgerDirectoryCreatedSha256",
      "ledgerEntryCreatedSha256s",
      "manifestSha256",
      "mode",
      "preClosureCount",
      "preClosureSha256",
      "rootSha256",
      "runSha256",
      "targets",
      "terminalReceipt",
      "transactionId",
      "worktreeSha256",
    ],
    "TASK-540 recovery terminal manifest"
  );
  exactKeys(
    prepared,
    [
      "manifestSha256",
      "newPayloadSha256s",
      "oldPayloadSha256s",
      "preparedSha256",
      "transactionId",
    ],
    "TASK-540 recovery terminal prepared"
  );
  invariant(
    manifest.mode === "terminal" &&
      manifest.branchSha256 === ROOT_AUTHORITY.branchSha256 &&
      manifest.gitDirSha256 === ROOT_AUTHORITY.gitDirSha256 &&
      manifest.rootSha256 === ROOT_AUTHORITY.rootSha256 &&
      manifest.worktreeSha256 === ROOT_AUTHORITY.worktreeSha256 &&
      manifest.runSha256 === runAuthority.runSha256 &&
      HEX_128.test(manifest.transactionId) &&
      Number.isSafeInteger(manifest.generation) &&
      manifest.generation > 0 &&
      prepared.manifestSha256 === manifest.manifestSha256 &&
      prepared.transactionId === manifest.transactionId &&
      Array.isArray(manifest.entries) &&
      manifest.entries.length >= manifest.preClosureCount &&
      Number.isSafeInteger(manifest.preClosureCount) &&
      manifest.preClosureCount > 0 &&
      manifest.preClosureSha256 ===
        digest("ledger-prefix", {
          entries: manifest.entries.slice(0, manifest.preClosureCount),
        }),
    "TASK-540 recovery terminal authority rejected"
  );
  manifest.entries.forEach((entry, index) => validateSafeLedgerEntry(entry, index + 1));
  exactKeys(
    manifest.terminalReceipt,
    ["count", "preClosureCount", "preClosureSha256", "schemaVersion", "sha256"],
    "TASK-540 recovery terminal receipt"
  );
  invariant(
    manifest.terminalReceipt.count === manifest.entries.length &&
      manifest.terminalReceipt.preClosureCount === manifest.preClosureCount &&
      manifest.terminalReceipt.preClosureSha256 === manifest.preClosureSha256 &&
      manifest.terminalReceipt.schemaVersion === 1 &&
      manifest.terminalReceipt.sha256 ===
        digest("terminal-ledger", {
          entries: manifest.entries,
          preClosureCount: manifest.preClosureCount,
          preClosureSha256: manifest.preClosureSha256,
          schemaVersion: 1,
        }),
    "TASK-540 recovery terminal receipt rejected"
  );
  invariant(
    Array.isArray(manifest.targets) &&
      manifest.targets.length === 5 &&
      Array.isArray(prepared.oldPayloadSha256s) &&
      prepared.oldPayloadSha256s.length === 5 &&
      Array.isArray(prepared.newPayloadSha256s) &&
      prepared.newPayloadSha256s.length === 5,
    "TASK-540 recovery terminal target cardinality rejected"
  );
  const oldPayloads = [];
  const newPayloads = [];
  for (let index = 0; index < 5; index += 1) {
    const target = manifest.targets[index];
    exactKeys(
      target,
      ["index", "mode", "newSha256", "oldSha256", "path", "tempPath"],
      "TASK-540 recovery terminal target"
    );
    invariant(
      target.index === index &&
        target.path === ROOT + "/" + TERMINAL_TARGET_RELATIVE_PATHS[index] &&
        target.tempPath ===
          dirname(target.path) +
            "/.task540-" +
            manifest.transactionId +
            "-" +
            index +
            ".tmp" &&
        Number.isSafeInteger(target.mode) &&
        target.mode > 0 &&
        target.mode <= 0o777 &&
        HEX_256.test(target.oldSha256) &&
        HEX_256.test(target.newSha256) &&
        prepared.oldPayloadSha256s[index] === target.oldSha256 &&
        prepared.newPayloadSha256s[index] === target.newSha256,
      "TASK-540 recovery terminal target rejected"
    );
    const [oldRecord, newRecord] = await Promise.all([
      readStable(JOURNAL + "/old-" + index + ".bin", 32 * 1024 * 1024),
      readStable(JOURNAL + "/new-" + index + ".bin", 32 * 1024 * 1024),
    ]);
    invariant(
      fileMode(oldRecord.info) === 0o600 &&
        fileMode(newRecord.info) === 0o600 &&
        rawDigest(oldRecord.bytes) === target.oldSha256 &&
        rawDigest(newRecord.bytes) === target.newSha256,
      "TASK-540 recovery terminal payload rejected"
    );
    oldPayloads.push(oldRecord.bytes);
    newPayloads.push(newRecord.bytes);
  }
  invariant(
    Array.isArray(manifest.ledgerEntryCreatedSha256s) &&
      manifest.ledgerEntryCreatedSha256s.length === manifest.entries.length &&
      manifest.ledgerEntryCreatedSha256s.every((value) => HEX_256.test(value)) &&
      HEX_256.test(manifest.ledgerDirectoryCreatedSha256),
    "TASK-540 recovery terminal ledger authority rejected"
  );
  return Object.freeze({
    manifest,
    newPayloads: Object.freeze(newPayloads),
    oldPayloads: Object.freeze(oldPayloads),
    prepared,
  });
}

async function recoverPreparedTerminalTargets() {
  const recovery = await loadPreparedTerminalRecovery();
  const [rollbackRecord, committedRecord] = await Promise.all([
    optionalRecoveryJson("terminal.rollback-prepared.json"),
    optionalRecoveryJson("committed.json"),
  ]);
  const rollback = rollbackRecord
    ? requireJournalEnvelope(
        rollbackRecord.value,
        "recovery-rollback-prepared",
        "rollbackPreparedSha256",
        "TASK-540 terminal rollback marker rejected"
      )
    : null;
  let committed = committedRecord
    ? requireJournalEnvelope(
        committedRecord.value,
        "recovery-committed",
        "committedSha256",
        "TASK-540 terminal committed marker rejected"
      )
    : null;
  if (rollback) {
    exactKeys(
      rollback,
      ["manifestSha256", "reason", "rollbackPreparedSha256", "transactionId"],
      "TASK-540 terminal rollback marker"
    );
    invariant(
      rollback.manifestSha256 === recovery.manifest.manifestSha256 &&
        rollback.reason === "terminal_verification_failed" &&
        rollback.transactionId === recovery.manifest.transactionId,
      "TASK-540 terminal rollback binding rejected"
    );
  }
  if (committed) {
    exactKeys(
      committed,
      [
        "committedSha256",
        "indexNewSha256",
        "manifestSha256",
        "terminalSha256",
        "transactionId",
      ],
      "TASK-540 terminal committed marker"
    );
    invariant(
      committed.indexNewSha256 === recovery.manifest.targets.at(-1).newSha256 &&
        committed.manifestSha256 === recovery.manifest.manifestSha256 &&
        committed.terminalSha256 === recovery.manifest.terminalReceipt.sha256 &&
        committed.transactionId === recovery.manifest.transactionId,
      "TASK-540 terminal committed binding rejected"
    );
  }
  const index = await readStable(recovery.manifest.targets.at(-1).path, 32 * 1024 * 1024);
  const indexSha256 = rawDigest(index.bytes);
  invariant(
    [
      recovery.manifest.targets.at(-1).oldSha256,
      recovery.manifest.targets.at(-1).newSha256,
    ].includes(indexSha256),
    "TASK-540 terminal index commit state rejected"
  );
  const rollBack = Boolean(rollback) || indexSha256 === recovery.manifest.targets.at(-1).oldSha256;
  invariant(
    !committed || rollback || !rollBack,
    "TASK-540 terminal committed marker contradicts the index"
  );
  const payloads = rollBack ? recovery.oldPayloads : recovery.newPayloads;
  const opposite = rollBack ? recovery.newPayloads : recovery.oldPayloads;
  for (let index = 0; index < 5; index += 1) {
    await replaceTerminalTarget(recovery.manifest.targets[index], payloads[index], opposite[index]);
  }
  if (!rollBack && !committed) {
    committed = await writeJournalRecord(
      "committed.json",
      "recovery-committed",
      "committedSha256",
      {
        indexNewSha256: recovery.manifest.targets.at(-1).newSha256,
        manifestSha256: recovery.manifest.manifestSha256,
        terminalSha256: recovery.manifest.terminalReceipt.sha256,
        transactionId: recovery.manifest.transactionId,
      }
    );
    invariant(committed.committedSha256, "TASK-540 terminal recovery commit failed");
  }
  return Object.freeze({
    action: rollBack ? "rolled-back" : "rolled-forward",
    committed,
    recovery,
  });
}

async function validatePreparedAbortRecovery() {
  const [receiptRecord, manifestRecord, preparedRecord] = await Promise.all([
    optionalRecoveryJson("abort-receipt.json"),
    optionalRecoveryJson("abort.manifest.json"),
    optionalRecoveryJson("abort.prepared.json"),
  ]);
  invariant(
    receiptRecord && manifestRecord && preparedRecord,
    "TASK-540 abort prepared predecessor missing"
  );
  const manifest = requireJournalEnvelope(
    manifestRecord.value,
    "recovery-manifest",
    "manifestSha256",
    "TASK-540 recovery abort manifest rejected"
  );
  const prepared = requireJournalEnvelope(
    preparedRecord.value,
    "recovery-prepared",
    "preparedSha256",
    "TASK-540 recovery abort prepared rejected"
  );
  exactKeys(
    receiptRecord.value,
    ["count", "reason", "schemaVersion", "sha256"],
    "TASK-540 recovery abort receipt"
  );
  exactKeys(
    manifest,
    [
      "abortReceipt",
      "branchSha256",
      "entries",
      "generation",
      "gitDirSha256",
      "ledgerDirectoryCreatedSha256",
      "ledgerEntryCreatedSha256s",
      "manifestSha256",
      "mode",
      "rootSha256",
      "runSha256",
      "transactionId",
      "worktreeSha256",
    ],
    "TASK-540 recovery abort manifest"
  );
  exactKeys(
    prepared,
    ["abortReceiptSha256", "manifestSha256", "preparedSha256", "transactionId"],
    "TASK-540 recovery abort prepared"
  );
  invariant(
    manifest.mode === "abort" &&
      manifest.branchSha256 === ROOT_AUTHORITY.branchSha256 &&
      manifest.gitDirSha256 === ROOT_AUTHORITY.gitDirSha256 &&
      manifest.rootSha256 === ROOT_AUTHORITY.rootSha256 &&
      manifest.worktreeSha256 === ROOT_AUTHORITY.worktreeSha256 &&
      manifest.runSha256 === runAuthority.runSha256 &&
      HEX_128.test(manifest.transactionId) &&
      Number.isSafeInteger(manifest.generation) &&
      manifest.generation > 0 &&
      Array.isArray(manifest.entries) &&
      receiptRecord.value.count === manifest.entries.length &&
      receiptRecord.value.reason === manifest.abortReceipt.reason &&
      receiptRecord.value.schemaVersion === 1 &&
      receiptRecord.value.sha256 ===
        digest("abort-ledger", {
          entries: manifest.entries,
          reason: receiptRecord.value.reason,
          schemaVersion: 1,
        }) &&
      canonicalJson(manifest.abortReceipt) === canonicalJson(receiptRecord.value) &&
      Array.isArray(manifest.ledgerEntryCreatedSha256s) &&
      manifest.ledgerEntryCreatedSha256s.length === manifest.entries.length &&
      manifest.ledgerEntryCreatedSha256s.every((value) => HEX_256.test(value)) &&
      HEX_256.test(manifest.ledgerDirectoryCreatedSha256) &&
      prepared.abortReceiptSha256 === receiptRecord.value.sha256 &&
      prepared.manifestSha256 === manifest.manifestSha256 &&
      prepared.transactionId === manifest.transactionId,
    "TASK-540 recovery abort binding rejected"
  );
  manifest.entries.forEach((entry, index) => validateSafeLedgerEntry(entry, index + 1));
  return Object.freeze({ manifest, prepared, receipt: receiptRecord.value });
}

async function discardUnpreparedModeFiles(names) {
  const terminal = names.filter((name) =>
    /^(?:terminal\.manifest\.json|(?:old|new)-[0-4]\.bin)$/u.test(name)
  );
  const abort = names.filter((name) => /^(?:abort-receipt|abort\.manifest)\.json$/u.test(name));
  const impossible = names.filter((name) =>
    /^(?:terminal\.rollback-prepared|committed|ledger-cleaned)\.json$/u.test(name)
  );
  invariant(impossible.length === 0, "TASK-540 unprepared mode has a terminal marker");
  invariant(
    terminal.length === 0 || abort.length === 0,
    "TASK-540 unprepared mode families are mixed"
  );
  if (terminal.length > 0) {
    invariant(
      terminal.includes("terminal.manifest.json"),
      "TASK-540 terminal payload has no manifest predecessor"
    );
  }
  if (abort.length > 0) {
    invariant(
      abort.includes("abort-receipt.json") &&
        (!abort.includes("abort.manifest.json") || abort.includes("abort-receipt.json")),
      "TASK-540 abort partial predecessors rejected"
    );
  }
  for (const name of [...terminal, ...abort].sort().reverse()) {
    const path = JOURNAL + "/" + name;
    const record = await readStable(path, 32 * 1024 * 1024);
    invariant(fileMode(record.info) === 0o600, "TASK-540 partial mode file mode rejected");
    await unlinkStable(path);
    JOURNAL_FILES.delete(path);
  }
}

async function routeStartupModeRecovery(names) {
  invariant(
    names.every(knownRecoveryJournalName),
    "TASK-540 recovery journal contains an unknown mode entry"
  );
  const terminalPrepared = names.includes("terminal.prepared.json");
  const abortPrepared = names.includes("abort.prepared.json");
  const terminalFamily = names.some((name) =>
    /^(?:terminal\.|committed\.json|(?:old|new)-[0-4]\.bin)/u.test(name)
  );
  const abortFamily = names.some((name) => /^(?:abort-receipt|abort\.)/u.test(name));
  invariant(
    !(terminalPrepared && abortPrepared) &&
      (!terminalPrepared || !abortFamily) &&
      (!abortPrepared || !terminalFamily),
    "TASK-540 recovery journal contains two prepared modes"
  );
  if (terminalPrepared) {
    const outcome = await recoverPreparedTerminalTargets();
    if (outcome.action === "rolled-back") {
      if (statusTransaction) await rollbackStatusClosure();
    } else {
      if (statusTransaction) await verifyStatusClosure();
      invariant(outcome.committed, "TASK-540 recovered terminal commit marker missing");
      terminalTransaction = Object.freeze({
        committed: outcome.committed,
        manifest: outcome.recovery.manifest,
        terminalReceipt: outcome.recovery.manifest.terminalReceipt,
        transactionId: outcome.recovery.manifest.transactionId,
      });
    }
    return;
  }
  if (abortPrepared) {
    await validatePreparedAbortRecovery();
    if (statusTransaction) await rollbackStatusClosure();
    return;
  }
  await discardUnpreparedModeFiles(names);
}

async function requireAbsentPath(path, label) {
  try {
    await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error(label);
}

async function finalizeRecoveredRun() {
  await requireAbsentPath(ledgerPath, "TASK-540 recovered ledger directory remained");
  if (terminalTransaction) {
    await verifyCommittedTerminal(terminalTransaction);
    if (statusTransaction) {
      await verifyStatusClosure();
      await removeStatusJournal(statusTransaction, "new");
    }
  } else if (statusTransaction) {
    await rollbackStatusClosure();
  }
  const names = await readdir(JOURNAL);
  invariant(
    names.every(knownRecoveryJournalName),
    "TASK-540 recovered journal contains an unknown entry"
  );
  for (const name of names) {
    const path = JOURNAL + "/" + name;
    const info = await lstat(path, { bigint: true });
    invariant(
      info.isFile() &&
        !info.isSymbolicLink() &&
        info.uid === BigInt(process.getuid()) &&
        fileMode(info) === 0o600 &&
        info.nlink === 1n,
      "TASK-540 recovered journal entry rejected"
    );
    JOURNAL_FILES.add(path);
    if (/^request-[0-9]{12}\.planned\.json$/u.test(name)) {
      const plan = (await readCanonicalPath(path)).value;
      await requireAbsentPath(plan.path, "TASK-540 recovered request directory remained");
    }
  }
  dispatchFrozen = true;
  workflowFinished = true;
  await removeCurrentJournal();
  hostPhase = "recovered";
}

function validateRecoveryReview(review) {
  exactKeys(review, ["requests", "runSha256", "schemaVersion"], "TASK-540 recovery review");
  invariant(
    Array.isArray(review.requests) &&
      review.requests.length === requestSequence &&
      review.runSha256 === runAuthority.runSha256 &&
      review.schemaVersion === 1,
    "TASK-540 recovery review header rejected"
  );
  const known = new Map(
    LEDGER_RECORDS.map(({ entry }) => [entry.request.sequence, entry.request.requestSha256])
  );
  for (const authority of REQUESTS.values()) {
    known.set(authority.request.sequence, authority.request.requestSha256);
  }
  review.requests.forEach((row, index) => {
    exactKeys(
      row,
      [
        "agentStateAtFinalList",
        "agentStateAtFirstList",
        "dispatchState",
        "interruptAttempted",
        "interruptPreviousState",
        "requestSha256",
        "sequence",
        "taskCorrelationSha256",
      ],
      "TASK-540 recovery review row"
    );
    const inactive =
      ["not_started", "spawn_failed"].includes(row.dispatchState) &&
      row.agentStateAtFirstList === "not_applicable" &&
      row.agentStateAtFinalList === "not_applicable" &&
      row.interruptAttempted === false &&
      row.interruptPreviousState === "not_applicable" &&
      row.taskCorrelationSha256 === null;
    const spawned =
      row.dispatchState === "spawned" &&
      ["live", "not_live"].includes(row.agentStateAtFirstList) &&
      row.agentStateAtFinalList === "not_live" &&
      HEX_256.test(row.taskCorrelationSha256) &&
      (row.agentStateAtFirstList === "live"
        ? row.interruptAttempted === true && ["live", "not_live"].includes(row.interruptPreviousState)
        : row.interruptAttempted === false && row.interruptPreviousState === "not_applicable");
    invariant(
      row.sequence === index + 1 &&
        row.requestSha256 === known.get(row.sequence) &&
        (inactive || spawned),
      "TASK-540 recovery review row rejected"
    );
  });
  return review;
}

async function sealAbortedRun(reason, review) {
  invariant(
    ["agent_dispatch_failed", "agent_result_rejected", "workflow_failed"].includes(reason),
    "TASK-540 abort reason rejected"
  );
  invariant(REQUESTS.size === 0, "TASK-540 abort requires finalized requests");
  validateRecoveryReview(review);
  dispatchFrozen = true;
  const entries = LEDGER_RECORDS.map(({ entry }) => entry);
  const abortCore = { entries, reason, schemaVersion: 1 };
  const abortReceipt = Object.freeze({
    count: entries.length,
    reason,
    schemaVersion: 1,
    sha256: digest("abort-ledger", abortCore),
  });
  const receiptPath = JOURNAL + "/abort-receipt.json";
  await writeExclusive(receiptPath, Buffer.from(canonicalJson(abortReceipt)));
  JOURNAL_FILES.add(receiptPath);
  const transactionId = randomId();
  const manifest = await writeJournalRecord(
    "abort.manifest.json",
    "recovery-manifest",
    "manifestSha256",
    {
      abortReceipt,
      branchSha256: ROOT_AUTHORITY.branchSha256,
      entries,
      generation: await currentClosureGeneration(),
      gitDirSha256: ROOT_AUTHORITY.gitDirSha256,
      ledgerDirectoryCreatedSha256: runAuthority.ledgerCreated.createdSha256,
      ledgerEntryCreatedSha256s: LEDGER_RECORDS.map(({ created }) => created.createdSha256),
      mode: "abort",
      rootSha256: ROOT_AUTHORITY.rootSha256,
      runSha256: runAuthority.runSha256,
      transactionId,
      worktreeSha256: ROOT_AUTHORITY.worktreeSha256,
    }
  );
  await writeJournalRecord("abort.prepared.json", "recovery-prepared", "preparedSha256", {
    abortReceiptSha256: abortReceipt.sha256,
    manifestSha256: manifest.manifestSha256,
    transactionId,
  });
  await cleanupLedgerArtifacts(manifest.manifestSha256, transactionId);
  await removeCurrentJournal();
  controlledAbort = true;
  workflowFinished = true;
  hostPhase = "aborted";
  return Object.freeze({ accepted: true, runSha256: runAuthority.runSha256, status: "aborted" });
}

async function verifyCommittedTerminal(transaction) {
  invariant(transaction?.manifest && transaction?.committed, "TASK-540 terminal commit missing");
  const [manifestRecord, preparedRecord, committedRecord, entries] = await Promise.all([
    readCanonicalPath(JOURNAL + "/terminal.manifest.json"),
    readCanonicalPath(JOURNAL + "/terminal.prepared.json"),
    readCanonicalPath(JOURNAL + "/committed.json"),
    stableLedgerEntries(),
  ]);
  const manifest = requireJournalEnvelope(
    manifestRecord.value,
    "recovery-manifest",
    "manifestSha256",
    "TASK-540 terminal manifest rejected"
  );
  const prepared = requireJournalEnvelope(
    preparedRecord.value,
    "recovery-prepared",
    "preparedSha256",
    "TASK-540 terminal prepared marker rejected"
  );
  const committed = requireJournalEnvelope(
    committedRecord.value,
    "recovery-committed",
    "committedSha256",
    "TASK-540 terminal committed marker rejected"
  );
  exactKeys(
    prepared,
    [
      "manifestSha256",
      "newPayloadSha256s",
      "oldPayloadSha256s",
      "preparedSha256",
      "transactionId",
    ],
    "TASK-540 terminal prepared marker"
  );
  invariant(
    canonicalJson(manifest) === canonicalJson(transaction.manifest) &&
      canonicalJson(committed) === canonicalJson(transaction.committed) &&
      prepared.manifestSha256 === transaction.manifest.manifestSha256 &&
      canonicalJson(prepared.oldPayloadSha256s) ===
        canonicalJson(transaction.manifest.targets.map(({ oldSha256 }) => oldSha256)) &&
      canonicalJson(prepared.newPayloadSha256s) ===
        canonicalJson(transaction.manifest.targets.map(({ newSha256 }) => newSha256)) &&
      committed.manifestSha256 === transaction.manifest.manifestSha256 &&
      committed.terminalSha256 === transaction.terminalReceipt.sha256 &&
      committed.indexNewSha256 === transaction.manifest.targets.at(-1).newSha256 &&
      canonicalJson(entries) === canonicalJson(transaction.manifest.entries) &&
      transaction.terminalReceipt.sha256 ===
        digest("terminal-ledger", {
          entries,
          preClosureCount: transaction.terminalReceipt.preClosureCount,
          preClosureSha256: transaction.terminalReceipt.preClosureSha256,
          schemaVersion: 1,
        }),
    "TASK-540 terminal journal verification rejected"
  );
  for (const target of transaction.manifest.targets) {
    const current = await readStable(target.path, 32 * 1024 * 1024);
    invariant(
      rawDigest(current.bytes) === target.newSha256 && fileMode(current.info) === target.mode,
      "TASK-540 committed terminal target drifted"
    );
    await requireAbsentPath(target.tempPath, "TASK-540 committed terminal temp remained");
  }
  return transaction;
}

async function cleanupRun() {
  invariant(REQUESTS.size === 0, "TASK-540 active requests remain");
  invariant(dispatchFrozen, "TASK-540 terminal cleanup requires frozen dispatch");
  const terminal = await verifyCommittedTerminal(terminalTransaction);
  invariant(statusTransaction, "TASK-540 terminal cleanup requires committed status closure");
  await verifyStatusClosure();
  await removeStatusJournal(statusTransaction, "new");
  await cleanupLedgerArtifacts(terminal.manifest.manifestSha256, terminal.transactionId);
  await removeCurrentJournal();
}

function requireControl(value) {
  exactKeys(
    value,
    ["command", "controlId", "controlOrdinal", "payload", "requestId", "sequence"],
    "TASK-540 control"
  );
  invariant(
    CONTROL_COMMANDS.includes(value.command) &&
      HEX_128.test(value.controlId) &&
      Number.isSafeInteger(value.controlOrdinal) &&
      value.controlOrdinal === controlOrdinal + 1 &&
      !CONTROL_IDS.has(value.controlId),
    "TASK-540 control ordering rejected"
  );
  const nullRequest = value.command === "recover-review" || value.command === "abort";
  invariant(
    nullRequest
      ? value.requestId === null && value.sequence === null
      : HEX_128.test(value.requestId) &&
          Number.isSafeInteger(value.sequence) &&
          value.sequence > 0,
    "TASK-540 control request binding rejected"
  );
  const nullPayload = ["inspect", "status", "wait"].includes(value.command);
  invariant(
    nullPayload ? value.payload === null : isPlainObject(value.payload),
    "TASK-540 control payload rejected"
  );
  invariant(
    hostPhase === "recovery-only"
      ? value.command === "recover-review"
      : value.command !== "recover-review",
    "TASK-540 control phase rejected"
  );
  CONTROL_IDS.add(value.controlId);
  controlOrdinal = value.controlOrdinal;
  return value;
}

async function handleControl(raw) {
  invariant(!controlInFlight, "TASK-540 control pipelining rejected");
  controlInFlight = true;
  try {
    const control = requireControl(raw);
    let authority = null;
    if (control.requestId !== null) {
      authority = REQUESTS.get(control.requestId);
      invariant(
        authority && authority.request.sequence === control.sequence,
        "TASK-540 unknown request control"
      );
    }
    let result;
    if (control.command === "abort") {
      exactKeys(control.payload, ["reason", "review"], "TASK-540 abort payload");
      result = await sealAbortedRun(control.payload.reason, control.payload.review);
    } else if (control.command === "recover-review") {
      invariant(REQUESTS.size === 0, "TASK-540 recovery requires no active request");
      invariant(priorHelperSweep, "TASK-540 recovery sweep missing");
      result = await launchBridge("recover-review", null, control.payload, priorHelperSweep);
      await finalizeRecoveredRun();
    } else {
      result = await launchBridge(control.command, authority, control.payload);
      if (control.command === "respond" && result.status === "accepted") {
        validateValue(control.payload.result, authority.options.schema);
        authority.response = requireSecretSafeResult(control.payload.result);
      }
      if (control.command === "procedure" && result.status === "recorded") {
        authority.procedureRecorded = true;
        if (authority.response === undefined || authority.cancelled) {
          authority.reject(new Error("TASK-540 collaboration request cancelled"));
        } else {
          authority.resolve(authority.response);
        }
      }
      if (control.command === "inspect" && result.status === "cancelled") {
        authority.cancelled = true;
        authority.preclaimTimeout = true;
        authority.reject(new Error("TASK-540 collaboration request timed out before dispatch"));
      }
      if (
        ["inspect", "status", "wait", "respond"].includes(control.command) &&
        (result.status === "cancelled" || result.status === "canceled")
      ) {
        authority.cancelled = true;
      }
    }
    const reply = {
      command: control.command,
      controlId: control.controlId,
      controlOrdinal: control.controlOrdinal,
      requestId: control.requestId,
      result,
      sequence: control.sequence,
      status: "ok",
    };
    if (
      !process.stdout.write(
        frame(reply, control.command === "inspect" ? MAX_PROMPT_BYTES : MAX_STRING_BYTES)
      )
    ) {
      await new Promise((resolveDrain) => process.stdout.once("drain", resolveDrain));
    }
    if (control.command === "abort") process.exit(0);
    return control.command === "abort"
      ? "abort"
      : control.command === "recover-review"
        ? "recovered"
        : "continue";
  } finally {
    controlInFlight = false;
  }
}

async function controlLoop() {
  let buffered = Buffer.alloc(0);
  for await (const chunk of process.stdin) {
    buffered = Buffer.concat([buffered, Buffer.from(chunk)]);
    invariant(buffered.length <= MAX_FRAME_BYTES, "TASK-540 control frame too large");
    const lineEnd = buffered.indexOf(10);
    if (lineEnd < 0) continue;
    invariant(
      lineEnd === buffered.length - 1,
      "TASK-540 control pipelining or trailing bytes rejected"
    );
    const control = parseCanonical(
      buffered,
      true,
      MAX_FRAME_BYTES,
      "TASK-540 control frame rejected"
    );
    buffered = Buffer.alloc(0);
    if (["abort", "recovered"].includes(await handleControl(control))) return;
  }
  invariant(buffered.length === 0, "TASK-540 control EOF left a partial frame");
  if (!controlledAbort && !workflowFinished) {
    rawRootLoss = true;
    for (const pending of REQUESTS.values()) {
      pending.reject(new Error("TASK-540 root control transport lost"));
    }
    throw new Error("TASK-540 raw root loss");
  }
}

async function runAgent(prompt, options) {
  invariant(!dispatchFrozen, "TASK-540 collaboration dispatch is permanently frozen");
  invariant(schemasRegistered, "TASK-540 schemas must be registered before dispatch");
  invariant(REQUESTS.size === 0, "TASK-540 collaboration dispatch must be single-flight");
  exactKeys(options, ["label", "phase", "schema"], "TASK-540 agent options");
  invariant(
    typeof options.label === "string" &&
      options.label.length > 0 &&
      typeof options.phase === "string" &&
      options.phase.length > 0,
    "TASK-540 agent labels rejected"
  );
  const schemaAuthority = requireRegisteredSchema(options.schema);
  const created = await createRequest(prompt, options, schemaAuthority);
  const resultPromise = new Promise((resolveResult, rejectResult) => {
    const authority = {
      ...created,
      options,
      reject: rejectResult,
      resolve: resolveResult,
      response: undefined,
      cancelled: false,
      preclaimTimeout: false,
      procedureRecorded: false,
    };
    REQUESTS.set(created.request.requestId, authority);
  });
  await writeNotification(created);
  return resultPromise;
}

Object.defineProperty(runAgent, "registerSchemas", {
  configurable: false,
  enumerable: false,
  value: registerSchemas,
  writable: false,
});

Object.defineProperty(runAgent, "finalize", {
  configurable: false,
  enumerable: false,
  value: finalizeRequest,
  writable: false,
});

Object.defineProperty(runAgent, "capturePrefix", {
  configurable: false,
  enumerable: false,
  value: captureLedgerPrefix,
  writable: false,
});

Object.defineProperty(runAgent, "commitStatusClosure", {
  configurable: false,
  enumerable: false,
  value: commitStatusClosure,
  writable: false,
});

Object.defineProperty(runAgent, "verifyStatusClosure", {
  configurable: false,
  enumerable: false,
  value: verifyStatusClosure,
  writable: false,
});

Object.defineProperty(runAgent, "rollbackClosureTransactions", {
  configurable: false,
  enumerable: false,
  value: rollbackClosureTransactions,
  writable: false,
});

Object.defineProperty(runAgent, "freeze", {
  configurable: false,
  enumerable: false,
  value: freezeDispatch,
  writable: false,
});

function reportPhase(title) {
  invariant(typeof title === "string" && title.length > 0, "TASK-540 phase title rejected");
  process.stderr.write("[task-540] phase: " + title.replace(/[\r\n]/gu, " ") + "\n");
}

function runTerminalTransformSelfTest() {
  const prefixEntry = Object.freeze({ ledgerEntrySha256: "a".repeat(64), sequence: 1 });
  const terminalEntry = Object.freeze({ ledgerEntrySha256: "b".repeat(64), sequence: 2 });
  const prefixEntries = Object.freeze([prefixEntry]);
  preClosureProjection = deepFreeze({
    entries: prefixEntries,
    preClosureCount: 1,
    preClosureSha256: digest("ledger-prefix", { entries: prefixEntries }),
  });
  preClosureCount = 1;
  const entries = Object.freeze([prefixEntry, terminalEntry]);
  const terminalCore = {
    entries,
    preClosureCount: 1,
    preClosureSha256: preClosureProjection.preClosureSha256,
    schemaVersion: 1,
  };
  const receipt = Object.freeze({
    count: 2,
    preClosureCount: 1,
    preClosureSha256: preClosureProjection.preClosureSha256,
    schemaVersion: 1,
    sha256: digest("terminal-ledger", terminalCore),
  });
  const closureControl = {
    schemaVersion: 1,
    generation: 1,
    boardBaseline: "toDo 0 / inProgress 1 / done 2",
    changelogPath: TERMINAL_TARGET_RELATIVE_PATHS[0],
    gateReceipt: { field: "Targeted Gate Passed", valueSha256: "c".repeat(64) },
    collaborationLedger: {
      preClosureCount: 1,
      preClosureSha256: preClosureProjection.preClosureSha256,
      terminalCount: null,
      terminalSha256: null,
    },
  };
  const evidencePayload = {
    schemaVersion: 1,
    closureControl,
    collaborationLedgerPrefix: prefixEntries,
    terminalCollaborationReceipt: null,
  };
  const evidenceBlock =
    EVIDENCE_BEGIN +
    "\n```json\n" +
    JSON.stringify(evidencePayload, null, 2) +
    "\n```\n" +
    EVIDENCE_END;
  const evidenceSha256 = rawDigest(Buffer.from(evidenceBlock));
  const anchor = {
    schemaVersion: 1,
    evidenceSha256,
    closureControl,
    collaborationLedgerPrefix: prefixEntries,
    terminalCollaborationReceipt: null,
    repairAuthorization: null,
  };
  const anchorLine =
    CLOSURE_ANCHOR_PREFIX + JSON.stringify(anchor) + CLOSURE_ANCHOR_SUFFIX;
  const receiptLine = "**Closure Evidence SHA-256:** " + evidenceSha256;
  const sources = [
    "# Changelog\n\n" + evidenceBlock + "\n",
    "# Root\n\n" + receiptLine + "\n",
    "# Child\n\n" + receiptLine + "\n",
    "# Leaf\n\n" + receiptLine + "\n",
    "# Index\n\n## Index\n" + anchorLine + "\n\n",
  ];
  const snapshots = sources.map((source, index) =>
    Object.freeze({
      bytes: Buffer.from(source),
      exists: true,
      mode: 0o644,
      path: ROOT + "/" + TERMINAL_TARGET_RELATIVE_PATHS[index],
    })
  );
  const transformed = transformTerminalTargetBytes(snapshots, entries, receipt);
  invariant(
    transformed.payloads.length === 5 &&
      transformed.payloads[0].includes(Buffer.from('"terminalCount": 2')) &&
      transformed.payloads[0].includes(Buffer.from('"terminalCollaborationReceipt": {')) &&
      transformed.payloads[1].includes(Buffer.from(transformed.evidenceSha256)) &&
      transformed.payloads[4].includes(Buffer.from(transformed.evidenceSha256)),
    "TASK-540 terminal transform self-test failed"
  );
  let rejections = 0;
  for (const mutant of [
    [...snapshots].reverse(),
    snapshots.map((snapshot, index) =>
      index === 0
        ? { ...snapshot, bytes: Buffer.from(sources[0] + "\n" + evidenceBlock) }
        : snapshot
    ),
    snapshots.map((snapshot, index) =>
      index === 4
        ? { ...snapshot, bytes: Buffer.from(sources[4] + anchorLine + "\n") }
        : snapshot
    ),
  ]) {
    try {
      transformTerminalTargetBytes(mutant, entries, receipt);
    } catch {
      rejections += 1;
    }
  }
  invariant(rejections === 3, "TASK-540 terminal transform mutants failed");
  return Object.freeze({ rejections, targets: transformed.payloads.length });
}

function runStatusTransactionShapeSelfTest() {
  const input = {
    generation: 3,
    targets: STATUS_TARGET_RELATIVE_PATHS.map((path, index) => ({
      path,
      source: "status-target-" + index + "\n",
    })),
  };
  const validated = validateStatusTransactionInput(input);
  const transactionId = "d".repeat(32);
  const targets = validated.targets.map(({ bytes, relativePath }, index) => ({
    index,
    mode: 0o644,
    newSha256: rawDigest(bytes),
    oldSha256: rawDigest(Buffer.from("old-" + index)),
    path: ROOT + "/" + relativePath,
    tempPath:
      dirname(ROOT + "/" + relativePath) +
      "/.task540-status-" +
      transactionId +
      "-" +
      index +
      ".tmp",
  }));
  const manifestCore = {
    branchSha256: ROOT_AUTHORITY.branchSha256,
    generation: 3,
    gitDirSha256: ROOT_AUTHORITY.gitDirSha256,
    mode: "status-close",
    rootSha256: ROOT_AUTHORITY.rootSha256,
    targets,
    transactionId,
    worktreeSha256: ROOT_AUTHORITY.worktreeSha256,
  };
  const manifest = {
    ...manifestCore,
    statusManifestSha256: digest("status-manifest", manifestCore),
  };
  const preparedCore = {
    manifestSha256: manifest.statusManifestSha256,
    newPayloadSha256s: targets.map(({ newSha256 }) => newSha256),
    oldPayloadSha256s: targets.map(({ oldSha256 }) => oldSha256),
    transactionId,
  };
  const prepared = {
    ...preparedCore,
    statusPreparedSha256: digest("status-prepared", preparedCore),
  };
  validateStatusManifest(manifest, prepared);
  let rejections = 0;
  for (const mutation of [
    () => validateStatusTransactionInput({ ...input, targets: [...input.targets].reverse() }),
    () => validateStatusTransactionInput({ ...input, targets: input.targets.slice(0, -1) }),
    () => validateStatusManifest({ ...manifest, targets: [...targets].reverse() }, prepared),
    () =>
      validateStatusManifest(manifest, {
        ...prepared,
        newPayloadSha256s: [...prepared.newPayloadSha256s].reverse(),
      }),
    () =>
      validateStatusManifest(
        { ...manifest, targets: targets.map((target, index) => index === 17 ? { ...target, path: target.path + "-copy" } : target) },
        prepared
      ),
  ]) {
    try {
      mutation();
    } catch {
      rejections += 1;
    }
  }
  invariant(rejections === 5, "TASK-540 status transaction shape mutants failed");
  return Object.freeze({ rejections, targets: validated.targets.length });
}

async function runSelfTest() {
  const resultSchema = {
    type: "object",
    additionalProperties: false,
    required: ["pass"],
    properties: { pass: { type: "boolean" } },
  };
  const auditSchema = {
    type: "object",
    additionalProperties: false,
    required: ["findings"],
    properties: {
      findings: { type: "array", uniqueItems: true, items: { type: "string" } },
    },
  };
  const mutationSchema = {
    type: "object",
    additionalProperties: false,
    required: ["pass", "touchedFiles"],
    properties: {
      pass: { type: "boolean" },
      touchedFiles: { type: "array", items: { type: "string" } },
    },
  };
  const gateSchema = {
    type: "object",
    additionalProperties: false,
    required: ["failedCommand"],
    properties: { failedCommand: { type: ["string", "null"] } },
  };
  registerSchemas({
    audit: auditSchema,
    gate: gateSchema,
    mutation: mutationSchema,
    result: resultSchema,
  });
  invariant(
    requireRegisteredSchema(resultSchema).accessClass === "read-only" &&
      requireRegisteredSchema(auditSchema).accessClass === "read-only" &&
      requireRegisteredSchema(mutationSchema).accessClass === "mutating",
    "TASK-540 schema classification failed"
  );
  let schemaRejections = 0;
  for (const schema of [
    gateSchema,
    { ...resultSchema },
    { ...resultSchema, type: "string" },
  ]) {
    try {
      requireRegisteredSchema(schema);
    } catch {
      schemaRejections += 1;
    }
  }
  validateValue({ pass: true }, resultSchema);
  const terminalTransform = runTerminalTransformSelfTest();
  const statusTransactionShape = runStatusTransactionShapeSelfTest();
  let frameRejections = 0;
  for (const bytes of [
    Buffer.from('{"b":1,"a":2}\n'),
    Buffer.from("{}\r\n"),
    Buffer.from("{}\n{}\n"),
  ]) {
    try {
      parseCanonical(bytes, true, 1024, "TASK-540 frame mutant");
    } catch {
      frameRejections += 1;
    }
  }
  invariant(
    schemaRejections === 3 &&
      frameRejections === 3 &&
      CONTROL_COMMANDS.length === 7 &&
      BRIDGE_COMMANDS.length === 6 &&
      ROOT_AUTHORITY.branch === EXPECTED_BRANCH &&
      Object.getOwnPropertyDescriptor(runAgent, "registerSchemas")?.enumerable === false &&
      Object.getOwnPropertyDescriptor(runAgent, "registerSchemas")?.writable === false &&
      Object.getOwnPropertyDescriptor(runAgent, "capturePrefix")?.enumerable === false &&
      Object.getOwnPropertyDescriptor(runAgent, "capturePrefix")?.writable === false &&
      Object.getOwnPropertyDescriptor(runAgent, "capturePrefix")?.configurable === false &&
      Object.getOwnPropertyDescriptor(runAgent, "commitStatusClosure")?.enumerable === false &&
      Object.getOwnPropertyDescriptor(runAgent, "commitStatusClosure")?.writable === false &&
      Object.getOwnPropertyDescriptor(runAgent, "verifyStatusClosure")?.enumerable === false &&
      Object.getOwnPropertyDescriptor(runAgent, "rollbackClosureTransactions")?.enumerable ===
        false &&
      Object.getOwnPropertyDescriptor(runAgent, "freeze")?.enumerable === false &&
      Object.getOwnPropertyDescriptor(runAgent, "freeze")?.writable === false &&
      freezeDispatch.constructor.name === "AsyncFunction",
    "TASK-540 host self-test failed"
  );
  return Object.freeze({
    pass: true,
    bridgeCommands: 6,
    controlCommands: 7,
    frameRejections,
    rootAuthorityCases: 6,
    schemaRejections,
    schemaRegistrations: 4,
    statusTransactionShape,
    terminalTransform,
  });
}

const mode = requireCli(process.argv.slice(2));
if (mode === "--self-test") {
  process.stdout.write(canonicalJson(await runSelfTest()));
} else {
  await requireRuntimeAuthority(ROOT);
  await prepareRun();
  if (hostPhase === "recovery-only") {
    await controlLoop();
    invariant(hostPhase === "recovered" && workflowFinished, "TASK-540 recovery did not finish");
  } else {
    invariant(!Object.hasOwn(globalThis, "agent"), "TASK-540 global agent already exists");
    invariant(!Object.hasOwn(globalThis, "phase"), "TASK-540 global phase already exists");
    Object.defineProperties(globalThis, {
      agent: { configurable: false, enumerable: false, value: runAgent, writable: false },
      phase: { configurable: false, enumerable: false, value: reportPhase, writable: false },
    });
    const controls = controlLoop();
    let workflowError = null;
    try {
      await import(pathToFileURL(IMPLEMENTER).href);
      workflowFinished = true;
      invariant(REQUESTS.size === 0, "TASK-540 workflow finished with an active request");
      await cleanupRun();
    } catch (error) {
      workflowError = error;
    }
    if (workflowFinished || workflowError) process.stdin.destroy();
    let controlError = null;
    try {
      await controls;
    } catch (error) {
      controlError = error;
    }
    if (workflowError && controlError) {
      throw new AggregateError(
        [workflowError, controlError],
        "TASK-540 workflow and control transport failed"
      );
    }
    if (workflowError) throw workflowError;
    if (controlError) throw controlError;
    invariant(!rawRootLoss, "TASK-540 workflow ended after raw root loss");
  }
}

import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { constants as FS_CONSTANTS, createReadStream } from "node:fs";
// prettier-ignore
import { lstat, link, open, readFile, readdir, realpath, rmdir, unlink } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
const GIT = "/usr/bin/git";
const PROJECT_PARENT = "/home/coder/project";
const EXPECTED_GIT_COMMON_DIR = PROJECT_PARENT + "/Coderso/.git";
const EXPECTED_BRANCH = "feature/tasks-fixes";
const EXPECTED_MODULE_BASENAME = "task-540-codex-agent-bridge.mjs";
const HOST_MODULE_BASENAME = "task-540-local-orchestrator.mjs";
const REQUEST_PREFIX = "/tmp/coderso-task540-request-";
const JOURNAL_BASENAME = "coderso-task540-recovery-v1";
const MAX_FRAME_BYTES = 8_454_144;
const MAX_RESULT_BYTES = 8 * 1024 * 1024;
const MAX_PROMPT_BYTES = 128 * 1024;
const MAX_STRING_BYTES = 4096;
const MAX_ARRAY_ITEMS = 4096;
const MAX_DEPTH = 64;
const WAIT_SLICE_MS = 1000;
const PROCESS_WAIT_MS = 5000;
const ERROR_REJECTED = "task540_bridge_request_rejected";
const ERROR_FAILED = "task540_bridge_failed";
const HASH_DOMAINS = new Set(
  "schema request claim contender-start settlement ack agent-result status-observation procedure transcript request-id run-id recovery-task recovery-review recovery-helper-sweep ledger-entry ledger-prefix terminal-ledger abort-ledger branch-id git-dir-id root-id worktree-id artifact-path run run-prepared artifact-plan artifact-created artifact-cleanup-started artifact-cleaned helper-launch-planned helper-launch-armed helper-launch-cleanup-started helper-launch-cleaned recovery-manifest recovery-prepared recovery-rollback-prepared recovery-committed recovery-ledger-cleaned status-manifest status-prepared status-rollback-prepared status-committed".split(
    " "
  )
);
const HEX_128 = /^[a-f0-9]{32}$/u;
const HEX_256 = /^[a-f0-9]{64}$/u;
const DECIMAL = /^[1-9][0-9]*$/u;
const REQUEST_MODES = Object.freeze(["inspect", "respond", "status", "wait", "procedure"]);
const SPAWNED_MODES = Object.freeze([...REQUEST_MODES, "recover-review"]);
const CLI_MODES = Object.freeze(["self-test", ...SPAWNED_MODES]);
const START_ROLES = Object.freeze(["host", "inspect", "respond", "status", "wait", "procedure"]);
const REQUEST_FILE_INVENTORY = Object.freeze(["request.json", "operator.claim.candidate.json", "timeout.claim.candidate.json", "claim.json", "response.started.json", "cancel.started.json", "response.candidate.json", "cancel.candidate.json", "settlement.json", "response.done.candidate.json", "cancel.done.candidate.json", "response.done.json", "cancel.done.json", "procedure.candidate.json", "procedure.json"]);
const DIRECTORY_AUTHORITIES = new Map();
// prettier-ignore
const ROOT_GIT_ENVIRONMENT = Object.freeze(Object.assign(Object.create(null), { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", HOME: "/nonexistent/task540-bridge-git-home", LANG: "C.UTF-8", LC_ALL: "C.UTF-8", PATH: "/usr/bin:/bin" }));
class BridgeRejectedError extends Error {}
class BridgeFailedError extends Error {}
function invariant(condition, message) {
  if (!condition) throw new BridgeRejectedError(message);
}
function internalInvariant(condition, message) {
  if (!condition) throw new BridgeFailedError(message);
}
function exactKeys(value, keys, label) {
  invariant(isPlainObject(value), label + ": object required");
  const actual = Reflect.ownKeys(value);
  invariant(actual.every((key) => typeof key === "string") && actual.slice().sort().join("\0") === keys.slice().sort().join("\0"), label + ": keys drift");
  for (const key of actual) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    invariant(descriptor?.enumerable === true && Object.hasOwn(descriptor, "value") && !Object.hasOwn(descriptor, "get") && !Object.hasOwn(descriptor, "set"), label + ": data property required");
  }
  return value;
}
function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
function requirePlainData(value, depth = 0, allowRequestPrompt = false) {
  invariant(depth <= MAX_DEPTH, "TASK-540 bridge value depth exceeded");
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    if (typeof value === "string") invariant(Buffer.byteLength(value, "utf8") <= (allowRequestPrompt ? MAX_PROMPT_BYTES : MAX_STRING_BYTES), "TASK-540 bridge string bound exceeded");
    return value;
  }
  if (typeof value === "number") {
    invariant(Number.isFinite(value), "TASK-540 bridge number is not finite");
    return value;
  }
  if (Array.isArray(value)) {
    invariant(value.length <= MAX_ARRAY_ITEMS, "TASK-540 bridge array bound exceeded");
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      invariant(descriptor?.enumerable === true && Object.hasOwn(descriptor, "value"), "TASK-540 bridge array item rejected"); requirePlainData(descriptor.value, depth + 1);
    }
    invariant(Reflect.ownKeys(value).every((key) => key === "length" || (typeof key === "string" && /^(?:0|[1-9][0-9]*)$/u.test(key))), "TASK-540 bridge array has extra properties");
    return value;
  }
  invariant(isPlainObject(value), "TASK-540 bridge custom object rejected");
  for (const key of Reflect.ownKeys(value)) {
    invariant(typeof key === "string", "TASK-540 bridge symbol key rejected");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    invariant(descriptor && descriptor.enumerable && Object.hasOwn(descriptor, "value"), "TASK-540 bridge accessor rejected"); requirePlainData(descriptor.value, depth + 1, allowRequestPrompt && depth === 0 && key === "prompt" && typeof descriptor.value === "string");
  }
  return value;
}
function canonicalJson(value, allowRequestPrompt = false) {
  requirePlainData(value, 0, allowRequestPrompt);
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map((item) => canonicalJson(item)).join(",") + "]";
  return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key], allowRequestPrompt && key === "prompt" && typeof value[key] === "string")).join(",") + "}";
}
function bridgeDigest(kind, core) {
  invariant(HASH_DOMAINS.has(kind), "TASK-540 bridge hash kind is invalid");
  return createHash("sha256").update("coderso.task540.bridge." + kind + ".v1\0" + canonicalJson(core, kind === "request"), "utf8").digest("hex");
}
const rawDigest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const randomId = () => randomBytes(16).toString("hex");
function canonicalFrame(value, allowRequestPrompt = false) {
  const bytes = Buffer.from(canonicalJson(value, allowRequestPrompt) + "\n", "utf8");
  invariant(bytes.length <= MAX_FRAME_BYTES, "TASK-540 bridge frame bound exceeded");
  return bytes;
}
// prettier-ignore
function parseCanonicalBytes(bytes, withLf, maxBytes, label, allowRequestPrompt = false, Failure = BridgeRejectedError) {
  const accept = (condition) => { if (!condition) throw new Failure(label); }; accept(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= maxBytes);
  const body = withLf ? bytes.subarray(0, -1) : bytes;
  accept(!withLf || bytes.at(-1) === 10); accept(!body.includes(0) && !body.includes(13));
  let source; try { source = new TextDecoder("utf-8", { fatal: true }).decode(body); } catch { throw new Failure(label); }
  accept(!source.startsWith("\uFEFF"));
  let value; try { value = JSON.parse(source); } catch { throw new Failure(label); }
  let canonical; try { canonical = canonicalJson(value, allowRequestPrompt); } catch (error) { if (error instanceof BridgeRejectedError) throw new Failure(label); throw error; } accept(canonical === source);
  return value;
}
async function readBoundedStream(stream, maxBytes) {
  const chunks = [];
  let length = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.from(chunk);
    length += bytes.length;
    invariant(length <= maxBytes, "TASK-540 bridge input bound exceeded");
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, length);
}
function requireHashedEnvelope(value, kind, digestKey, label) {
  invariant(isPlainObject(value) && HEX_256.test(value[digestKey]), label);
  // prettier-ignore
  const core = Object.fromEntries(Object.keys(value).filter((key) => key !== digestKey).map((key) => [key, value[key]]));
  invariant(value[digestKey] === bridgeDigest(kind, core), label);
  return Object.freeze({ core: Object.freeze(core), envelope: Object.freeze(value) });
}
const fileMode = (info) => Number(info.mode & 0o777n);
const sameIdentity = (left, right) => left.dev === right.dev && left.ino === right.ino;
const sameStableFile = (left, right) => sameIdentity(left, right) && left.uid === right.uid && fileMode(left) === fileMode(right) && left.nlink === right.nlink && left.size === right.size && left.ctimeNs === right.ctimeNs && left.mtimeNs === right.mtimeNs && left.isFile() === right.isFile();
const sameDirectory = (left, right) => sameIdentity(left, right) && left.uid === right.uid && fileMode(left) === fileMode(right) && left.isDirectory() === right.isDirectory();
// prettier-ignore
async function bindDirectory(path, mode, currentUid = true) {
  const before = await lstat(path, { bigint: true });
  internalInvariant(before.isDirectory() && !before.isSymbolicLink() && (!currentUid || before.uid === BigInt(process.getuid())) && fileMode(before) === mode, "TASK-540 bridge directory authority rejected");
  const handle = await open(path, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_DIRECTORY | FS_CONSTANTS.O_NOFOLLOW);
  try {
    const descriptor = await handle.stat({ bigint: true }); const after = await lstat(path, { bigint: true });
    internalInvariant(sameDirectory(before, descriptor) && sameDirectory(descriptor, after) && !after.isSymbolicLink(), "TASK-540 bridge directory authority drift");
    const retained = DIRECTORY_AUTHORITIES.get(path);
    internalInvariant(!retained || sameDirectory(retained, after), "TASK-540 bridge directory authority replaced");
    DIRECTORY_AUTHORITIES.set(path, after); return after;
  } finally { await handle.close(); }
}
async function requireBoundDirectory(path) {
  const expected = DIRECTORY_AUTHORITIES.get(path);
  internalInvariant(expected, "TASK-540 bridge directory is not bound");
  return bindDirectory(path, fileMode(expected), expected.uid === BigInt(process.getuid()));
}
// prettier-ignore
async function fsyncDirectory(path) {
  const before = await requireBoundDirectory(path);
  const handle = await open(path, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_DIRECTORY | FS_CONSTANTS.O_NOFOLLOW);
  try {
    const descriptor = await handle.stat({ bigint: true });
    internalInvariant(sameDirectory(before, descriptor), "TASK-540 bridge directory changed before fsync");
    await handle.sync(); const after = await lstat(path, { bigint: true });
    internalInvariant(sameDirectory(descriptor, after) && !after.isSymbolicLink(), "TASK-540 bridge directory replaced during fsync");
  } finally { await handle.close(); }
}
// prettier-ignore
async function writeExclusiveFile(path, bytes) {
  invariant(Buffer.isBuffer(bytes), "TASK-540 bridge write bytes missing");
  await requireBoundDirectory(dirname(path));
  const handle = await open(path, FS_CONSTANTS.O_CREAT | FS_CONSTANTS.O_EXCL | FS_CONSTANTS.O_WRONLY | FS_CONSTANTS.O_NOFOLLOW, 0o600);
  let written;
  try {
    const opened = await handle.stat({ bigint: true });
    internalInvariant(opened.isFile() && opened.uid === BigInt(process.getuid()) && fileMode(opened) === 0o600 && opened.nlink === 1n, "TASK-540 bridge created descriptor rejected");
    await handle.writeFile(bytes); await handle.sync(); written = await handle.stat({ bigint: true });
  } finally { await handle.close(); }
  await fsyncDirectory(dirname(path));
  const info = await lstat(path, { bigint: true });
  internalInvariant(info.isFile() && !info.isSymbolicLink() && info.uid === BigInt(process.getuid()) && fileMode(info) === 0o600 && info.nlink === 1n && info.size === BigInt(bytes.length) && sameStableFile(written, info), "TASK-540 bridge created file identity drift");
  return info;
}
// prettier-ignore
async function readStableFile(path, maxBytes = MAX_FRAME_BYTES, mode = 0o600, exactLink = false) {
  await requireBoundDirectory(dirname(path));
  const before = await lstat(path, { bigint: true });
  internalInvariant(before.isFile() && !before.isSymbolicLink() && before.uid === BigInt(process.getuid()) && fileMode(before) === mode && (exactLink ? before.nlink === 1n : before.nlink >= 1n) && before.size <= BigInt(maxBytes), "TASK-540 bridge file identity rejected");
  const handle = await open(path, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
  try {
    const descriptor = await handle.stat({ bigint: true }); internalInvariant(sameStableFile(before, descriptor), "TASK-540 bridge file changed before read");
    const bytes = await handle.readFile(); const after = await handle.stat({ bigint: true }); const pathAfter = await lstat(path, { bigint: true });
    internalInvariant(bytes.length === Number(after.size) && sameStableFile(before, after) && sameStableFile(after, pathAfter), "TASK-540 bridge file changed during read");
    return Object.freeze({ bytes, info: after });
  } finally { await handle.close(); }
}
const readStableModule = (path) => readStableFile(path, MAX_RESULT_BYTES, 0o644, true);
async function readCanonicalFile(path, maxBytes = MAX_FRAME_BYTES, allowRequestPrompt = false) {
  const record = await readStableFile(path, maxBytes);
  return Object.freeze({ bytes: record.bytes, info: record.info, value: parseCanonicalBytes(record.bytes, false, maxBytes, "TASK-540 bridge JSON rejected", allowRequestPrompt, BridgeFailedError) });
}
// prettier-ignore
async function unlinkExact(path, expected) {
  await requireBoundDirectory(dirname(path));
  const current = await lstat(path, { bigint: true });
  internalInvariant(sameStableFile(current, expected), "TASK-540 bridge unlink identity drift");
  const handle = await open(path, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
  try {
    const descriptor = await handle.stat({ bigint: true }); const pathBefore = await lstat(path, { bigint: true });
    internalInvariant(sameStableFile(expected, descriptor) && sameStableFile(descriptor, pathBefore), "TASK-540 bridge unlink target replaced");
    await unlink(path);
  } finally { await handle.close(); }
  await fsyncDirectory(dirname(path));
}
const requireSingleLineGitObservation = (result, label) => (invariant(isPlainObject(result) && typeof result.stdout === "string" && typeof result.stderr === "string" && result.stderr === "" && /^[^\0\r\n]+(?:\r?\n)?$/u.test(result.stdout), label), result.stdout.trim());
async function deriveTask540WorktreeRoot(moduleUrl) {
  const modulePath = fileURLToPath(moduleUrl);
  const root = resolve(dirname(modulePath), "../..");
  invariant(dirname(root) === PROJECT_PARENT && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(basename(root)) && modulePath === root + "/_docs/_workflows/" + EXPECTED_MODULE_BASENAME, "TASK-540 bridge module authority rejected");
  for (const path of [PROJECT_PARENT, root, root + "/_docs", root + "/_docs/_workflows"]) {
    const info = await lstat(path);
    invariant(info.isDirectory() && !info.isSymbolicLink() && (await realpath(path)) === path, "TASK-540 bridge root path rejected");
  }
  const moduleInfo = await lstat(modulePath);
  invariant(moduleInfo.isFile() && !moduleInfo.isSymbolicLink() && (await realpath(modulePath)) === modulePath, "TASK-540 bridge module rejected");
  await bindDirectory(dirname(modulePath), fileMode(await lstat(dirname(modulePath), { bigint: true })));
  const gitOptions = { cwd: root, encoding: "utf8", env: ROOT_GIT_ENVIRONMENT, maxBuffer: 64 * 1024 };
  // prettier-ignore
  const [topResult, dirResult, commonResult, branchResult] = await Promise.all([execFileAsync(GIT, ["rev-parse", "--show-toplevel"], gitOptions), execFileAsync(GIT, ["rev-parse", "--path-format=absolute", "--git-dir"], gitOptions), execFileAsync(GIT, ["rev-parse", "--path-format=absolute", "--git-common-dir"], gitOptions), execFileAsync(GIT, ["branch", "--show-current"], gitOptions)]);
  const top = await realpath(requireSingleLineGitObservation(topResult, "TASK-540 bridge Git top-level rejected"));
  const gitDir = await realpath(requireSingleLineGitObservation(dirResult, "TASK-540 bridge Git directory rejected"));
  const gitCommonDir = await realpath(requireSingleLineGitObservation(commonResult, "TASK-540 bridge Git common directory rejected"));
  const branch = requireSingleLineGitObservation(branchResult, "TASK-540 bridge Git branch rejected");
  invariant(top === root && gitCommonDir === EXPECTED_GIT_COMMON_DIR && gitDir !== gitCommonDir && dirname(gitDir) === gitCommonDir + "/worktrees" && basename(gitDir) === basename(root) && branch === EXPECTED_BRANCH, "TASK-540 bridge dedicated worktree rejected");
  const branchSha256 = bridgeDigest("branch-id", { branch });
  const gitDirSha256 = bridgeDigest("git-dir-id", { gitDir });
  const rootSha256 = bridgeDigest("root-id", { root });
  const worktreeSha256 = bridgeDigest("worktree-id", { branchSha256, gitDirSha256, rootSha256 });
  return Object.freeze({ branch, branchSha256, gitCommonDir, gitDir, gitDirSha256, modulePath, root, rootSha256, worktreeSha256 });
}
function parseProcStat(source, expectedPid) {
  invariant(typeof source === "string", "TASK-540 bridge process stat rejected");
  const close = source.lastIndexOf(")");
  const openBoundary = source.indexOf(" (");
  invariant(close > openBoundary && openBoundary > 0, "TASK-540 bridge process stat rejected");
  const pid = Number(source.slice(0, openBoundary));
  const fields = source.slice(close + 1).trim().split(/\s+/u);
  invariant(pid === expectedPid && fields.length >= 20 && DECIMAL.test(fields[19]), "TASK-540 bridge process identity rejected");
  return Object.freeze({ pid, startTime: fields[19], state: fields[0] });
}
async function readProcessIdentity(pid) {
  invariant(Number.isSafeInteger(pid) && pid > 1, "TASK-540 bridge PID rejected");
  try {
    return parseProcStat(await readFile("/proc/" + pid + "/stat", "utf8"), pid);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ESRCH") return null;
    throw error;
  }
}
async function readVerifiedBridgeProcess(arm, plan, authority) {
  const identity = await readProcessIdentity(arm.core.processId);
  if (!identity) return null;
  try {
    invariant(identity.startTime === arm.core.processStartTime, "TASK-540 bridge recovery PID reuse rejected");
    const proc = "/proc/" + identity.pid;
    const procInfo = await lstat(proc, { bigint: true });
    // prettier-ignore
    const [cwd, executable, commandBytes] = await Promise.all([realpath(proc + "/cwd"), realpath(proc + "/exe"), readFile(proc + "/cmdline")]);
    const after = await readProcessIdentity(identity.pid);
    invariant(after?.startTime === identity.startTime && procInfo.uid === BigInt(process.getuid()) && cwd === authority.root && executable === (await realpath(process.execPath)) && commandBytes.length > 0 && commandBytes.at(-1) === 0, "TASK-540 bridge recovery process identity rejected");
    const command = new TextDecoder("utf-8", { fatal: true }).decode(commandBytes.subarray(0, -1)).split("\0");
    const expected = [authority.modulePath, "--" + plan.core.mode];
    if (plan.core.requestDir !== null) expected.push(plan.core.requestDir);
    invariant(command.slice(1).length === expected.length && command.slice(1).every((value, index) => value === expected[index]), "TASK-540 bridge recovery process command rejected");
    return after;
  } catch (error) {
    if ((error?.code === "ENOENT" || error?.code === "ESRCH") && (await readProcessIdentity(arm.core.processId)) === null) return null;
    throw error;
  }
}
// prettier-ignore
async function signalVerifiedBridgeProcess(arm, plan, authority, signal) { const live = await readVerifiedBridgeProcess(arm, plan, authority); if (!live) return null; try { process.kill(live.pid, signal); } catch (error) { if (error?.code !== "ESRCH") throw error; return null; } return live; }
function requireSchema(schema, depth = 0, gateUnionAllowed = false) {
  invariant(depth <= MAX_DEPTH && isPlainObject(schema), "TASK-540 bridge schema rejected");
  if (depth === 0) requirePlainData(schema);
  const allowed = new Set(["additionalProperties", "enum", "items", "minLength", "properties", "required", "type", "uniqueItems"]);
  invariant(Object.keys(schema).every((key) => allowed.has(key)), "TASK-540 bridge schema keyword rejected");
  if (Object.hasOwn(schema, "type")) {
    const type = schema.type;
    invariant(["object", "array", "string", "boolean", "integer"].includes(type) || (gateUnionAllowed && Array.isArray(type) && type.length === 2 && type[0] === "string" && type[1] === "null"), "TASK-540 bridge schema type rejected");
  }
  if (Object.hasOwn(schema, "enum")) {
    invariant(Array.isArray(schema.enum) && schema.enum.length > 0, "TASK-540 bridge schema enum rejected");
    const canonical = schema.enum.map(canonicalJson);
    invariant(new Set(canonical).size === canonical.length, "TASK-540 bridge schema enum duplicated");
  }
  if (Object.hasOwn(schema, "properties")) {
    invariant(schema.type === "object" && schema.additionalProperties === false && isPlainObject(schema.properties), "TASK-540 bridge schema properties rejected");
    for (const [name, child] of Object.entries(schema.properties)) requireSchema(child, depth + 1, gateUnionAllowed && name === "failedCommand");
  }
  if (Object.hasOwn(schema, "items")) {
    invariant(schema.type === "array", "TASK-540 bridge schema items rejected");
    requireSchema(schema.items, depth + 1, false);
  }
  if (Object.hasOwn(schema, "required")) invariant(Array.isArray(schema.required) && schema.required.every((key) => typeof key === "string") && new Set(schema.required).size === schema.required.length && schema.type === "object" && isPlainObject(schema.properties) && schema.required.every((key) => Object.hasOwn(schema.properties, key)), "TASK-540 bridge schema required rejected");
  if (Object.hasOwn(schema, "additionalProperties")) invariant(schema.additionalProperties === false, "TASK-540 bridge schema openness rejected");
  if (Object.hasOwn(schema, "minLength")) invariant(schema.type === "string" && Number.isSafeInteger(schema.minLength) && schema.minLength >= 0, "TASK-540 bridge schema minLength rejected");
  if (Object.hasOwn(schema, "uniqueItems")) invariant(schema.type === "array" && schema.uniqueItems === true, "TASK-540 bridge schema uniqueness rejected");
  return schema;
}
function validateResult(value, schema, depth = 0) {
  invariant(depth <= MAX_DEPTH, "TASK-540 bridge result depth exceeded");
  requirePlainData(value, depth);
  if (depth === 0) invariant(Buffer.byteLength(canonicalJson(value), "utf8") <= MAX_RESULT_BYTES, "TASK-540 bridge result byte bound exceeded");
  if (schema.enum) invariant(schema.enum.some((item) => canonicalJson(item) === canonicalJson(value)), "TASK-540 bridge result enum rejected");
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  // prettier-ignore
  invariant(types.length === 0 || types.some((type) => type === "null" ? value === null : type === "array" ? Array.isArray(value) : type === "object" ? isPlainObject(value) : type === "integer" ? Number.isSafeInteger(value) : typeof value === type), "TASK-540 bridge result type rejected");
  if (typeof value === "string" && schema.minLength !== undefined) invariant(value.length >= schema.minLength, "TASK-540 bridge result string rejected");
  if (Array.isArray(value)) {
    invariant(value.length <= MAX_ARRAY_ITEMS, "TASK-540 bridge result array rejected");
    if (schema.uniqueItems) invariant(new Set(value.map(canonicalJson)).size === value.length, "TASK-540 bridge result duplicate rejected");
    if (schema.items) value.forEach((item) => validateResult(item, schema.items, depth + 1));
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (schema.additionalProperties === false) invariant(keys.every((key) => Object.hasOwn(schema.properties ?? {}, key)), "TASK-540 bridge result extra key rejected");
    for (const key of schema.required ?? []) invariant(Object.hasOwn(value, key), "TASK-540 bridge result required key missing");
    for (const key of keys) if (schema.properties?.[key]) validateResult(value[key], schema.properties[key], depth + 1);
  }
  return value;
}
const journalFile = (journal, prefix, ordinal, suffix) => journal + "/" + prefix + "-" + String(ordinal).padStart(12, "0") + "." + suffix + ".json";
function requireLaunchPlan(value) {
  const plan = requireHashedEnvelope(value, "helper-launch-planned", "launchPlannedSha256", "TASK-540 bridge launch plan rejected");
  exactKeys(plan.core, ["launchId", "launchOrdinal", "mode", "requestDir", "requestIdSha256", "requestSha256", "runSha256", "sequence"], "TASK-540 bridge launch plan core");
  const normal = REQUEST_MODES.includes(plan.core.mode);
  invariant(HEX_128.test(plan.core.launchId) && Number.isSafeInteger(plan.core.launchOrdinal) && plan.core.launchOrdinal > 0 && SPAWNED_MODES.includes(plan.core.mode) && HEX_256.test(plan.core.runSha256) && (normal ? typeof plan.core.requestDir === "string" && HEX_256.test(plan.core.requestIdSha256) && HEX_256.test(plan.core.requestSha256) && Number.isSafeInteger(plan.core.sequence) && plan.core.sequence > 0 : plan.core.requestDir === null && plan.core.requestIdSha256 === null && plan.core.requestSha256 === null && plan.core.sequence === null), "TASK-540 bridge launch plan fields rejected");
  return plan;
}
function requireLaunchArm(value, plan, root) {
  const arm = requireHashedEnvelope(value, "helper-launch-armed", "launchArmedSha256", "TASK-540 bridge launch arm rejected");
  exactKeys(arm.core, ["launchOrdinal", "launchPlannedSha256", "mode", "moduleSha256", "priorHelperSweepSha256", "processId", "processStartTime", "worktreeSha256"], "TASK-540 bridge launch arm core");
  invariant(arm.core.launchOrdinal === plan.core.launchOrdinal && arm.core.launchPlannedSha256 === plan.envelope.launchPlannedSha256 && arm.core.mode === plan.core.mode && HEX_256.test(arm.core.moduleSha256) && (plan.core.mode === "recover-review" ? HEX_256.test(arm.core.priorHelperSweepSha256) : arm.core.priorHelperSweepSha256 === null) && Number.isSafeInteger(arm.core.processId) && arm.core.processId > 1 && DECIMAL.test(arm.core.processStartTime) && arm.core.worktreeSha256 === root.worktreeSha256, "TASK-540 bridge launch arm fields rejected");
  return arm;
}
function requireLaunchMarker(value, plan, arm, started = null) {
  const cleaned = started !== null;
  const marker = requireHashedEnvelope(value, cleaned ? "helper-launch-cleaned" : "helper-launch-cleanup-started", cleaned ? "launchCleanedSha256" : "launchCleanupStartedSha256", "TASK-540 bridge launch cleanup rejected");
  exactKeys(marker.core, cleaned ? ["launchArmedSha256", "launchCleanupStartedSha256", "launchOrdinal", "launchPlannedSha256"] : ["launchArmedSha256", "launchOrdinal", "launchPlannedSha256"], "TASK-540 bridge launch cleanup core");
  invariant(marker.core.launchArmedSha256 === (arm?.envelope.launchArmedSha256 ?? null) && marker.core.launchOrdinal === plan.core.launchOrdinal && marker.core.launchPlannedSha256 === plan.envelope.launchPlannedSha256 && (!cleaned || marker.core.launchCleanupStartedSha256 === started.envelope.launchCleanupStartedSha256), "TASK-540 bridge launch cleanup binding rejected");
  return marker;
}
// prettier-ignore
async function readPriorLaunch(journal, ordinal, root) {
  const plan = requireLaunchPlan((await readCanonicalFile(journalFile(journal, "launch", ordinal, "planned"))).value);
  const [armRecord, startedRecord, cleanedRecord] = await Promise.all(["armed", "cleanup-started", "cleaned"].map((suffix) => optionalCanonical(journalFile(journal, "launch", ordinal, suffix))));
  const arm = armRecord ? requireLaunchArm(armRecord.value, plan, root) : null;
  const started = startedRecord ? requireLaunchMarker(startedRecord.value, plan, arm) : null;
  internalInvariant(!cleanedRecord || started, "TASK-540 bridge launch cleanup predecessor missing");
  const cleaned = cleanedRecord ? requireLaunchMarker(cleanedRecord.value, plan, arm, started) : null;
  return Object.freeze({ arm, cleaned, plan, started });
}
// prettier-ignore
async function finishRecoveredLaunch(launch, journal) {
  let started = launch.started;
  if (!started) {
    const core = { launchArmedSha256: launch.arm?.envelope.launchArmedSha256 ?? null, launchOrdinal: launch.plan.core.launchOrdinal, launchPlannedSha256: launch.plan.envelope.launchPlannedSha256 };
    const envelope = { ...core, launchCleanupStartedSha256: bridgeDigest("helper-launch-cleanup-started", core) };
    await writeExclusiveFile(journalFile(journal, "launch", launch.plan.core.launchOrdinal, "cleanup-started"), Buffer.from(canonicalJson(envelope))); started = requireLaunchMarker(envelope, launch.plan, launch.arm);
  }
  if (launch.cleaned) return;
  const core = { launchArmedSha256: launch.arm?.envelope.launchArmedSha256 ?? null, launchCleanupStartedSha256: started.envelope.launchCleanupStartedSha256, launchOrdinal: launch.plan.core.launchOrdinal, launchPlannedSha256: launch.plan.envelope.launchPlannedSha256 };
  const envelope = { ...core, launchCleanedSha256: bridgeDigest("helper-launch-cleaned", core) };
  await writeExclusiveFile(journalFile(journal, "launch", launch.plan.core.launchOrdinal, "cleaned"), Buffer.from(canonicalJson(envelope))); requireLaunchMarker(envelope, launch.plan, launch.arm, started);
}
async function authorizeArmedInvocation(mode, bootstrap, go) {
  exactKeys(bootstrap, ["launchOrdinal", "launchPlannedSha256", "mode"], "TASK-540 bridge bootstrap");
  exactKeys(go, ["command", "launchArmedSha256", "launchOrdinal", "launchPlannedSha256", "priorHelperSweep"], "TASK-540 bridge GO");
  invariant(go.command === "GO" && Number.isSafeInteger(bootstrap.launchOrdinal) && bootstrap.launchOrdinal > 0 && bootstrap.mode === mode && go.launchOrdinal === bootstrap.launchOrdinal && go.launchPlannedSha256 === bootstrap.launchPlannedSha256 && HEX_256.test(go.launchArmedSha256), "TASK-540 bridge arm binding rejected");
  const root = await deriveTask540WorktreeRoot(import.meta.url);
  const journal = root.gitDir + "/" + JOURNAL_BASENAME;
  const journalDirectory = await bindDirectory(journal, 0o700);
  const run = requireHashedEnvelope((await readCanonicalFile(journal + "/run.json")).value, "run", "runSha256", "TASK-540 bridge run rejected");
  exactKeys(run.core, ["branchSha256", "gitDirSha256", "ledgerPath", "ledgerPathSha256", "rootSha256", "runIdSha256", "worktreeSha256"], "TASK-540 bridge run core");
  const planned = requireLaunchPlan((await readCanonicalFile(journalFile(journal, "launch", bootstrap.launchOrdinal, "planned"))).value);
  const armed = requireLaunchArm((await readCanonicalFile(journalFile(journal, "launch", bootstrap.launchOrdinal, "armed"))).value, planned, root);
  const processIdentity = await readProcessIdentity(process.pid);
  const moduleSha256 = rawDigest((await readStableModule(root.modulePath)).bytes);
  invariant(run.envelope.runSha256 === planned.core.runSha256 && run.core.branchSha256 === root.branchSha256 && run.core.gitDirSha256 === root.gitDirSha256 && run.core.rootSha256 === root.rootSha256 && run.core.worktreeSha256 === root.worktreeSha256 && planned.envelope.launchPlannedSha256 === bootstrap.launchPlannedSha256 && planned.core.launchOrdinal === bootstrap.launchOrdinal && planned.core.mode === mode && armed.envelope.launchArmedSha256 === go.launchArmedSha256 && armed.core.launchOrdinal === bootstrap.launchOrdinal && armed.core.launchPlannedSha256 === bootstrap.launchPlannedSha256 && armed.core.mode === mode && armed.core.moduleSha256 === moduleSha256 && armed.core.processId === process.pid && armed.core.processStartTime === processIdentity?.startTime && armed.core.worktreeSha256 === root.worktreeSha256, "TASK-540 bridge armed identity rejected");
  const priorLaunches = [];
  if (mode === "recover-review") {
    invariant(go.priorHelperSweep !== null && armed.core.priorHelperSweepSha256 === go.priorHelperSweep.priorHelperSweepSha256, "TASK-540 bridge recovery sweep binding rejected");
    const sweep = requireHashedEnvelope(go.priorHelperSweep, "recovery-helper-sweep", "priorHelperSweepSha256", "TASK-540 bridge recovery sweep rejected");
    exactKeys(sweep.core, ["launches", "runSha256", "schemaVersion"], "TASK-540 bridge recovery sweep core");
    invariant(sweep.core.runSha256 === planned.core.runSha256 && sweep.core.schemaVersion === 1 && Array.isArray(sweep.core.launches) && sweep.core.launches.length === bootstrap.launchOrdinal - 1, "TASK-540 bridge recovery run rejected");
    const launchNames = (await readdir(journal)).filter((name) => name.startsWith("launch-"));
    const ordinals = [...new Set(launchNames.map((name) => Number(name.slice(7, 19))))].sort((left, right) => left - right);
    invariant(launchNames.every((name) => /^launch-[0-9]{12}\.(?:planned|armed|cleanup-started|cleaned)\.json$/u.test(name)) && ordinals.length === bootstrap.launchOrdinal && ordinals.every((ordinal, index) => ordinal === index + 1) && launchNames.filter((name) => Number(name.slice(7, 19)) === bootstrap.launchOrdinal).map((name) => name.slice(20)).sort().join("\0") === "armed.json\0planned.json", "TASK-540 bridge recovery launch inventory rejected");
    for (let index = 0; index < sweep.core.launches.length; index += 1) {
      const row = exactKeys(sweep.core.launches[index], ["launchArmedSha256", "launchOrdinal", "launchPlannedSha256", "state"], "TASK-540 bridge recovery sweep row");
      const launch = await readPriorLaunch(journal, index + 1, root);
      invariant(launch.plan.core.launchOrdinal === index + 1 && launch.plan.core.runSha256 === planned.core.runSha256 && row.launchOrdinal === index + 1 && row.launchPlannedSha256 === launch.plan.envelope.launchPlannedSha256 && row.launchArmedSha256 === (launch.arm?.envelope.launchArmedSha256 ?? null) && row.state === (launch.arm ? "armed_absent" : "planned_unarmed") && (!launch.arm || launch.arm.core.moduleSha256 === moduleSha256 && (await readProcessIdentity(launch.arm.core.processId)) === null), "TASK-540 bridge recovery sweep set rejected");
      priorLaunches.push(launch);
    }
  } else {
    invariant(go.priorHelperSweep === null && armed.core.priorHelperSweepSha256 === null, "TASK-540 bridge normal sweep must be null");
  }
  return Object.freeze({ armed, journal, journalDirectory, planned, priorLaunches, processIdentity, root, run });
}
async function readArmFrames() {
  const stream = createReadStream(null, { autoClose: true, fd: 3 });
  const bytes = await readBoundedStream(stream, 64 * 1024);
  const firstLf = bytes.indexOf(10);
  const secondLf = bytes.indexOf(10, firstLf + 1);
  invariant(firstLf > 0 && secondLf === bytes.length - 1, "TASK-540 bridge arm frame cardinality rejected");
  const secondStart = firstLf + 1;
  invariant(bytes.at(-1) === 10 && secondStart < bytes.length, "TASK-540 bridge GO frame missing");
  return Object.freeze([parseCanonicalBytes(bytes.subarray(0, secondStart), true, 64 * 1024, "TASK-540 bridge bootstrap rejected"), parseCanonicalBytes(bytes.subarray(secondStart), true, 64 * 1024, "TASK-540 bridge GO rejected")]);
}
function requireRequestEnvelope(value) {
  const authority = requireHashedEnvelope(value, "request", "requestSha256", "TASK-540 bridge request rejected");
  exactKeys(authority.core, ["accessClass", "deadlineAtEpochMs", "deadlineMonotonicNs", "label", "orchestratorPid", "orchestratorStartTime", "phase", "policy", "prompt", "requestId", "resultSchema", "runId", "schemaSha256", "sequence", "worktreeSha256"], "TASK-540 bridge request core");
  invariant(["read-only", "mutating"].includes(authority.core.accessClass) && Number.isSafeInteger(authority.core.deadlineAtEpochMs) && authority.core.deadlineAtEpochMs > 0 && DECIMAL.test(authority.core.deadlineMonotonicNs) && typeof authority.core.label === "string" && Number.isSafeInteger(authority.core.orchestratorPid) && authority.core.orchestratorPid > 1 && DECIMAL.test(authority.core.orchestratorStartTime) && typeof authority.core.phase === "string" && typeof authority.core.policy === "string" && typeof authority.core.prompt === "string" && HEX_128.test(authority.core.requestId) && HEX_128.test(authority.core.runId) && HEX_256.test(authority.core.schemaSha256) && HEX_256.test(authority.core.worktreeSha256) && Number.isSafeInteger(authority.core.sequence) && authority.core.sequence > 0, "TASK-540 bridge request fields rejected");
  requireSchema(authority.core.resultSchema);
  return authority;
}
async function readRequest(requestDir, arm) {
  invariant(typeof requestDir === "string" && requestDir.startsWith(REQUEST_PREFIX) && dirname(requestDir) === "/tmp" && HEX_128.test(basename(requestDir).slice("coderso-task540-request-".length)), "TASK-540 bridge request path rejected");
  await bindDirectory("/tmp", 0o777, false);
  const directory = await bindDirectory(requestDir, 0o700);
  const request = requireRequestEnvelope((await readCanonicalFile(requestDir + "/request.json", MAX_FRAME_BYTES, true)).value);
  // prettier-ignore
  invariant(request.core.worktreeSha256 === arm.root.worktreeSha256 && basename(requestDir) === "coderso-task540-request-" + request.core.requestId && arm.planned.core.requestDir === requestDir && arm.planned.core.requestIdSha256 === bridgeDigest("request-id", { requestId: request.core.requestId }) && arm.planned.core.sequence === request.core.sequence && arm.planned.core.requestSha256 === request.envelope.requestSha256, "TASK-540 bridge request launch binding rejected");
  await requireBoundDirectory(requestDir);
  return Object.freeze({ directory, request, requestDir });
}
function requireClaimEnvelope(value, request) {
  const claim = requireHashedEnvelope(value, "claim", "claimSha256", "TASK-540 bridge claim rejected");
  exactKeys(claim.core, ["claimId", "claimOwner", "deadlineAtEpochMs", "deadlineMonotonicNs", "decisionMonotonicNs", "requestId", "requestSha256", "schemaSha256", "sequence"], "TASK-540 bridge claim core");
  const decision = BigInt(claim.core.decisionMonotonicNs);
  const deadline = BigInt(request.request.core.deadlineMonotonicNs);
  // prettier-ignore
  invariant(HEX_128.test(claim.core.claimId) && ["operator", "timeout"].includes(claim.core.claimOwner) && claim.core.deadlineAtEpochMs === request.request.core.deadlineAtEpochMs && claim.core.deadlineMonotonicNs === request.request.core.deadlineMonotonicNs && claim.core.requestId === request.request.core.requestId && claim.core.requestSha256 === request.request.envelope.requestSha256 && claim.core.schemaSha256 === request.request.core.schemaSha256 && claim.core.sequence === request.request.core.sequence && ((claim.core.claimOwner === "operator" && decision < deadline) || (claim.core.claimOwner === "timeout" && decision >= deadline)), "TASK-540 bridge claim relation rejected");
  return claim;
}
async function linkCandidate(candidatePath, destinationPath, candidateInfo, expectedBytes, validateWinner) {
  invariant(Buffer.isBuffer(expectedBytes) && typeof validateWinner === "function", "TASK-540 bridge CAS authority missing");
  internalInvariant(dirname(candidatePath) === dirname(destinationPath), "TASK-540 bridge CAS directory mismatch"); await requireBoundDirectory(dirname(destinationPath));
  try {
    await link(candidatePath, destinationPath);
    await fsyncDirectory(dirname(destinationPath));
    const candidate = await lstat(candidatePath, { bigint: true });
    const destination = await readCanonicalFile(destinationPath);
    internalInvariant(sameIdentity(candidate, destination.info) && sameIdentity(candidate, candidateInfo) && candidate.uid === candidateInfo.uid && fileMode(candidate) === fileMode(candidateInfo) && candidate.size === candidateInfo.size && candidate.mtimeNs === candidateInfo.mtimeNs && candidate.nlink === 2n && destination.info.nlink === 2n && rawDigest(destination.bytes) === rawDigest(expectedBytes), "TASK-540 bridge CAS link graph rejected");
    await validateWinner(destination.value);
    await unlinkExact(candidatePath, candidate);
    const winner = await readCanonicalFile(destinationPath);
    internalInvariant(winner.info.nlink === 1n && sameIdentity(winner.info, destination.info) && rawDigest(winner.bytes) === rawDigest(expectedBytes), "TASK-540 bridge CAS settlement graph rejected");
    await validateWinner(winner.value);
    return true;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const loser = await readStableFile(candidatePath); const candidate = loser.info;
    internalInvariant(sameStableFile(candidate, candidateInfo) && rawDigest(loser.bytes) === rawDigest(expectedBytes), "TASK-540 bridge CAS loser identity drift");
    const winner = await readCanonicalFile(destinationPath);
    await validateWinner(winner.value);
    internalInvariant(!sameIdentity(candidate, winner.info) && candidate.nlink === 1n && winner.info.nlink === 1n, "TASK-540 bridge CAS winner graph rejected");
    await unlinkExact(candidatePath, candidate);
    return false;
  }
}
async function createOrJoinClaim(request, owner) {
  const deadline = BigInt(request.request.core.deadlineMonotonicNs);
  const claimId = randomId();
  invariant(owner === "operator" || owner === "timeout", "TASK-540 bridge claim owner rejected");
  const decisionMonotonicNs = process.hrtime.bigint().toString();
  if (owner === "operator" && BigInt(decisionMonotonicNs) >= deadline) {
    return createOrJoinClaim(request, "timeout");
  }
  invariant(BigInt(decisionMonotonicNs) >= deadline || owner === "operator", "TASK-540 bridge claim eligibility rejected");
  // prettier-ignore
  const core = { claimId, claimOwner: owner, deadlineAtEpochMs: request.request.core.deadlineAtEpochMs, deadlineMonotonicNs: request.request.core.deadlineMonotonicNs, decisionMonotonicNs, requestId: request.request.core.requestId, requestSha256: request.request.envelope.requestSha256, schemaSha256: request.request.core.schemaSha256, sequence: request.request.core.sequence };
  const envelope = { ...core, claimSha256: bridgeDigest("claim", core) };
  const candidatePath = request.requestDir + "/" + owner + ".claim.candidate.json";
  const bytes = Buffer.from(canonicalJson(envelope));
  const candidateInfo = await writeExclusiveFile(candidatePath, bytes);
  const won = await linkCandidate(candidatePath, request.requestDir + "/claim.json", candidateInfo, bytes, (value) => requireClaimEnvelope(value, request));
  return won ? requireClaimEnvelope(envelope, request) : requireClaimEnvelope((await readCanonicalFile(request.requestDir + "/claim.json")).value, request);
}
const readClaim = async (request) => requireClaimEnvelope((await readCanonicalFile(request.requestDir + "/claim.json")).value, request);
function requireStartEnvelope(value, request, claim, kind) {
  const start = requireHashedEnvelope(value, "contender-start", "startSha256", "TASK-540 bridge start rejected");
  exactKeys(start.core, ["claimId", "claimSha256", "contenderId", "contenderKind", "processId", "processRole", "processStartTime", "requestId", "requestSha256", "schemaSha256", "sequence", "startedAtMonotonicNs"], "TASK-540 bridge start core");
  // prettier-ignore
  invariant(start.core.claimId === claim.core.claimId && start.core.claimSha256 === claim.envelope.claimSha256 && HEX_128.test(start.core.contenderId) && start.core.contenderKind === kind && Number.isSafeInteger(start.core.processId) && start.core.processId > 1 && START_ROLES.includes(start.core.processRole) && (kind !== "response" || start.core.processRole === "respond") && DECIMAL.test(start.core.processStartTime) && start.core.requestId === request.request.core.requestId && start.core.requestSha256 === request.request.envelope.requestSha256 && start.core.schemaSha256 === request.request.core.schemaSha256 && start.core.sequence === request.request.core.sequence && DECIMAL.test(start.core.startedAtMonotonicNs), "TASK-540 bridge start binding rejected");
  return start;
}
async function createStart(request, claim, kind, role) {
  invariant(["response", "cancel"].includes(kind) && START_ROLES.includes(role), "TASK-540 bridge start role rejected");
  const processIdentity = await readProcessIdentity(process.pid);
  // prettier-ignore
  const core = { claimId: claim.core.claimId, claimSha256: claim.envelope.claimSha256, contenderId: randomId(), contenderKind: kind, processId: process.pid, processRole: role, processStartTime: processIdentity.startTime, requestId: request.request.core.requestId, requestSha256: request.request.envelope.requestSha256, schemaSha256: request.request.core.schemaSha256, sequence: request.request.core.sequence, startedAtMonotonicNs: process.hrtime.bigint().toString() };
  const envelope = { ...core, startSha256: bridgeDigest("contender-start", core) };
  const path = request.requestDir + "/" + kind + ".started.json";
  try {
    await writeExclusiveFile(path, Buffer.from(canonicalJson(envelope)));
    return Object.freeze({ created: true, envelope: requireStartEnvelope(envelope, request, claim, kind).envelope });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = requireStartEnvelope((await readCanonicalFile(path)).value, request, claim, kind);
    return Object.freeze({ created: false, envelope: existing.envelope });
  }
}
async function requireSettlementEnvelope(value, request, claim) {
  const settlement = requireHashedEnvelope(value, "settlement", "settlementSha256", "TASK-540 bridge settlement rejected");
  const response = settlement.core.status === "response";
  exactKeys(settlement.core, response ? ["agentResultSha256", "claimId", "claimSha256", "decisionMonotonicNs", "requestId", "requestSha256", "responderPid", "responderStartTime", "result", "schemaSha256", "sequence", "startSha256", "status"] : ["agentResultSha256", "claimId", "claimSha256", "decisionMonotonicNs", "error", "requestId", "requestSha256", "schemaSha256", "sequence", "startSha256", "status"], "TASK-540 bridge settlement core");
  const start = requireStartEnvelope((await readCanonicalFile(request.requestDir + "/" + (response ? "response" : "cancel") + ".started.json")).value, request, claim, response ? "response" : "cancel");
  const decision = BigInt(settlement.core.decisionMonotonicNs);
  const deadline = BigInt(request.request.core.deadlineMonotonicNs);
  // prettier-ignore
  invariant(settlement.core.claimId === claim.core.claimId && settlement.core.claimSha256 === claim.envelope.claimSha256 && settlement.core.requestId === request.request.core.requestId && settlement.core.requestSha256 === request.request.envelope.requestSha256 && settlement.core.schemaSha256 === request.request.core.schemaSha256 && settlement.core.sequence === request.request.core.sequence && settlement.core.startSha256 === start.envelope.startSha256 && (response || settlement.core.decisionMonotonicNs === start.core.startedAtMonotonicNs), "TASK-540 bridge settlement binding rejected");
  if (response) {
    validateResult(settlement.core.result, request.request.core.resultSchema);
    invariant(decision < deadline && settlement.core.agentResultSha256 === bridgeDigest("agent-result", { result: settlement.core.result }) && settlement.core.responderPid === start.core.processId && settlement.core.responderStartTime === start.core.processStartTime, "TASK-540 bridge response settlement rejected");
  } else {
    invariant(settlement.core.agentResultSha256 === null && ["deadline_exceeded", "dispatch_failed"].includes(settlement.core.error) && (settlement.core.error === "deadline_exceeded" ? decision >= deadline : decision < deadline && claim.core.claimOwner === "operator"), "TASK-540 bridge cancellation settlement rejected");
  }
  return settlement;
}
async function readSettlement(request, claim = null) {
  try {
    return requireSettlementEnvelope((await readCanonicalFile(request.requestDir + "/settlement.json")).value, request, claim ?? (await readClaim(request)));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}
async function publishSettlement(request, claim, kind, core, start) {
  if (kind === "response") {
    const decisionMonotonicNs = process.hrtime.bigint().toString();
    if (BigInt(decisionMonotonicNs) >= BigInt(request.request.core.deadlineMonotonicNs)) {
      const cancelled = await settleCancellation(request, claim, "respond");
      if (start.created) await publishAck(request, "response", start, cancelled);
      return cancelled;
    }
    core = { ...core, decisionMonotonicNs };
  }
  const envelope = { ...core, settlementSha256: bridgeDigest("settlement", core) };
  const candidatePath = request.requestDir + "/" + kind + ".candidate.json";
  const bytes = Buffer.from(canonicalJson(envelope));
  const candidate = await writeExclusiveFile(candidatePath, bytes);
  const won = await linkCandidate(candidatePath, request.requestDir + "/settlement.json", candidate, bytes, (value) => requireSettlementEnvelope(value, request, claim));
  const settlement = won ? await requireSettlementEnvelope(envelope, request, claim) : await readSettlement(request, claim);
  if (start.created) await publishAck(request, kind, start, settlement);
  return settlement;
}
function requireAckEnvelope(value, request, kind, start, settlement) {
  const ack = requireHashedEnvelope(value, "ack", "ackSha256", "TASK-540 bridge acknowledgement rejected");
  exactKeys(ack.core, ["requestId", "sequence", "settlementSha256", "startSha256", "status"], "TASK-540 bridge acknowledgement core");
  invariant(ack.core.requestId === request.request.core.requestId && ack.core.sequence === request.request.core.sequence && ack.core.settlementSha256 === settlement.envelope.settlementSha256 && ack.core.startSha256 === start.envelope.startSha256 && ack.core.status === kind + "_done", "TASK-540 bridge acknowledgement binding rejected");
  return ack;
}
async function publishAck(request, kind, start, settlement) {
  const core = { requestId: request.request.core.requestId, sequence: request.request.core.sequence, settlementSha256: settlement.envelope.settlementSha256, startSha256: start.envelope.startSha256, status: kind + "_done" };
  const envelope = { ...core, ackSha256: bridgeDigest("ack", core) };
  const candidatePath = request.requestDir + "/" + kind + ".done.candidate.json";
  const bytes = Buffer.from(canonicalJson(envelope));
  const candidate = await writeExclusiveFile(candidatePath, bytes);
  const won = await linkCandidate(candidatePath, request.requestDir + "/" + kind + ".done.json", candidate, bytes, (value) => requireAckEnvelope(value, request, kind, start, settlement));
  const accepted = won ? envelope : (await readCanonicalFile(request.requestDir + "/" + kind + ".done.json")).value;
  requireAckEnvelope(accepted, request, kind, start, settlement);
}
async function settleCancellation(request, claim, role, dispatchFailed = false) {
  const start = await createStart(request, claim, "cancel", role);
  if (!start.created) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const settlement = await readSettlement(request, claim);
      if (settlement) return settlement;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 10));
    }
    throw new Error("TASK-540 bridge cancellation did not settle");
  }
  const decision = BigInt(start.envelope.startedAtMonotonicNs);
  const deadline = BigInt(request.request.core.deadlineMonotonicNs);
  const error = dispatchFailed && decision < deadline ? "dispatch_failed" : "deadline_exceeded";
  // prettier-ignore
  const core = { agentResultSha256: null, claimId: claim.core.claimId, claimSha256: claim.envelope.claimSha256, decisionMonotonicNs: start.envelope.startedAtMonotonicNs, error, requestId: request.request.core.requestId, requestSha256: request.request.envelope.requestSha256, schemaSha256: request.request.core.schemaSha256, sequence: request.request.core.sequence, startSha256: start.envelope.startSha256, status: "cancelled" };
  return publishSettlement(request, claim, "cancel", core, start);
}
async function observeStatus(request, role, wait) {
  const end = process.hrtime.bigint() + BigInt(wait ? WAIT_SLICE_MS : 0) * 1_000_000n;
  let claim = null;
  let settlement = null;
  do {
    settlement = await readSettlement(request);
    try {
      claim = await readClaim(request);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    if (settlement || process.hrtime.bigint() >= BigInt(request.request.core.deadlineMonotonicNs)) break;
    if (!wait) break;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
  } while (process.hrtime.bigint() < end);
  if (!settlement && process.hrtime.bigint() >= BigInt(request.request.core.deadlineMonotonicNs)) {
    claim = claim ?? (await createOrJoinClaim(request, "timeout"));
    settlement = await settleCancellation(request, claim, role);
  }
  const observedAtMonotonicNs = process.hrtime.bigint().toString();
  // prettier-ignore
  const core = { claimOwner: claim?.core.claimOwner ?? null, deadlineRelation: BigInt(observedAtMonotonicNs) < BigInt(request.request.core.deadlineMonotonicNs) ? "before" : "at_or_after", observedAtMonotonicNs, requestId: request.request.core.requestId, sequence: request.request.core.sequence, settlementStatus: settlement?.core.status ?? "pending" };
  return Object.freeze({ ...core, statusSha256: bridgeDigest("status-observation", core) });
}
function requireStatusEnvelope(value, request, settlement) {
  const status = requireHashedEnvelope(value, "status-observation", "statusSha256", "TASK-540 bridge status rejected");
  exactKeys(status.core, ["claimOwner", "deadlineRelation", "observedAtMonotonicNs", "requestId", "sequence", "settlementStatus"], "TASK-540 bridge status core");
  const observed = BigInt(status.core.observedAtMonotonicNs);
  const deadline = BigInt(request.request.core.deadlineMonotonicNs);
  invariant([null, "operator", "timeout"].includes(status.core.claimOwner) && status.core.deadlineRelation === (observed < deadline ? "before" : "at_or_after") && status.core.requestId === request.request.core.requestId && status.core.sequence === request.request.core.sequence && status.core.settlementStatus === settlement.core.status, "TASK-540 bridge status binding rejected");
  return status;
}
function requireProcedureEnvelope(value, core) {
  const procedure = requireHashedEnvelope(value, "procedure", "procedureSha256", "TASK-540 bridge procedure rejected");
  exactKeys(procedure.core, Object.keys(core), "TASK-540 bridge procedure core");
  invariant(canonicalJson(procedure.core) === canonicalJson(core), "TASK-540 bridge procedure binding rejected");
  return procedure;
}
// prettier-ignore
async function executeRequestMode(mode, requestDir, arm, payload) {
  const request = await readRequest(requestDir, arm);
  if (mode === "inspect") {
    const before = process.hrtime.bigint() < BigInt(request.request.core.deadlineMonotonicNs); const claim = await createOrJoinClaim(request, before ? "operator" : "timeout");
    if (claim.core.claimOwner === "timeout") {
      await settleCancellation(request, claim, "inspect"); return { requestId: request.request.core.requestId, status: "cancelled" };
    }
    // prettier-ignore
    return { accessClass: request.request.core.accessClass, claimId: claim.core.claimId, deadlineAtEpochMs: request.request.core.deadlineAtEpochMs, label: request.request.core.label, phase: request.request.core.phase, policy: request.request.core.policy, prompt: request.request.core.prompt, requestId: request.request.core.requestId, resultSchema: request.request.core.resultSchema, sequence: request.request.core.sequence };
  }
  if (mode === "status" || mode === "wait") return observeStatus(request, mode, mode === "wait");
  const claim = await readClaim(request); invariant(claim.core.claimOwner === "operator", "TASK-540 bridge operator claim required");
  if (mode === "respond") {
    const deadline = BigInt(request.request.core.deadlineMonotonicNs); exactKeys(payload, ["agentResultSha256", "claimId", "requestId", "result", "sequence"], "TASK-540 bridge response payload"); validateResult(payload.result, request.request.core.resultSchema);
    invariant(payload.claimId === claim.core.claimId && payload.requestId === request.request.core.requestId && payload.sequence === request.request.core.sequence && payload.agentResultSha256 === bridgeDigest("agent-result", { result: payload.result }), "TASK-540 bridge response binding rejected");
    if (process.hrtime.bigint() >= deadline) {
      await settleCancellation(request, claim, "respond"); return { accepted: false, requestId: payload.requestId, status: "cancelled" };
    }
    const start = await createStart(request, claim, "response", "respond"); invariant(start.created, "TASK-540 bridge duplicate responder rejected");
    // prettier-ignore
    const core = { agentResultSha256: payload.agentResultSha256, claimId: claim.core.claimId, claimSha256: claim.envelope.claimSha256, requestId: payload.requestId, requestSha256: request.request.envelope.requestSha256, responderPid: process.pid, responderStartTime: (await readProcessIdentity(process.pid)).startTime, result: payload.result, schemaSha256: request.request.core.schemaSha256, sequence: payload.sequence, startSha256: start.envelope.startSha256, status: "response" };
    const settlement = await publishSettlement(request, claim, "response", core, start); return { accepted: settlement.core.status === "response", requestId: payload.requestId, status: settlement.core.status === "response" ? "accepted" : "cancelled" };
  }
  exactKeys(payload, ["agentResultSha256", "agentStateAtFinalList", "agentStateAtFirstList", "claimId", "dispatchStatus", "forkTurns", "interruptAttempted", "interruptPreviousState", "requestId", "sequence", "spawned", "status", "transcriptCorrelationSha256"], "TASK-540 bridge procedure payload"); invariant(payload.claimId === claim.core.claimId && payload.requestId === request.request.core.requestId && payload.sequence === request.request.core.sequence, "TASK-540 bridge procedure binding rejected");
  let settlement = await readSettlement(request, claim);
  if (!payload.spawned && payload.dispatchStatus === "spawn_failed") settlement = settlement ?? (await settleCancellation(request, claim, "procedure", true)); invariant(settlement, "TASK-540 bridge procedure settlement missing");
  const status = requireStatusEnvelope(payload.status ?? (await observeStatus(request, "procedure", false)), request, settlement); const response = settlement.core.status === "response";
  const spawned = payload.spawned === true && payload.dispatchStatus === "spawned" && payload.forkTurns === "none" && payload.status !== null && HEX_256.test(payload.transcriptCorrelationSha256);
  const spawnFailed = !response && payload.spawned === false && payload.dispatchStatus === "spawn_failed" && payload.forkTurns === "none" && payload.status === null && payload.agentResultSha256 === null && payload.transcriptCorrelationSha256 === null && payload.agentStateAtFirstList === "not_applicable" && payload.agentStateAtFinalList === "not_applicable" && payload.interruptAttempted === false && payload.interruptPreviousState === "not_applicable";
  invariant(spawned || spawnFailed, "TASK-540 bridge procedure dispatch truth rejected");
  if (spawned && response) invariant(payload.agentResultSha256 === settlement.core.agentResultSha256 && payload.agentStateAtFirstList === "not_applicable" && payload.agentStateAtFinalList === "not_applicable" && payload.interruptAttempted === false && payload.interruptPreviousState === "not_applicable", "TASK-540 bridge response procedure rejected");
  if (spawned && !response) invariant((payload.agentResultSha256 === null || HEX_256.test(payload.agentResultSha256)) && ["live", "not_live"].includes(payload.agentStateAtFirstList) && payload.agentStateAtFinalList === "not_live" && (payload.agentStateAtFirstList === "live" ? payload.interruptAttempted === true && ["live", "not_live"].includes(payload.interruptPreviousState) : payload.interruptAttempted === false && payload.interruptPreviousState === "not_applicable"), "TASK-540 bridge cancellation procedure rejected");
  // prettier-ignore
  const core = { agentResultSha256: payload.agentResultSha256, agentStateAtFinalList: payload.agentStateAtFinalList, agentStateAtFirstList: payload.agentStateAtFirstList, claimSha256: claim.envelope.claimSha256, dispatchStatus: payload.dispatchStatus, forkTurns: payload.forkTurns, interruptAttempted: payload.interruptAttempted, interruptPreviousState: payload.interruptPreviousState, requestId: payload.requestId, requestSha256: request.request.envelope.requestSha256, sequence: payload.sequence, settlementSha256: settlement.envelope.settlementSha256, spawned: payload.spawned, statusSha256: status.envelope.statusSha256, transcriptCorrelationSha256: payload.transcriptCorrelationSha256 };
  const envelope = { ...core, procedureSha256: bridgeDigest("procedure", core) }; const candidatePath = request.requestDir + "/procedure.candidate.json";
  const bytes = Buffer.from(canonicalJson(envelope)); const candidate = await writeExclusiveFile(candidatePath, bytes);
  invariant(await linkCandidate(candidatePath, request.requestDir + "/procedure.json", candidate, bytes, (value) => requireProcedureEnvelope(value, core)), "TASK-540 bridge duplicate procedure rejected");
  return { accepted: true, requestId: payload.requestId, status: "recorded" };
}
// prettier-ignore
export async function sweepPriorBridgeLaunchesForRecovery(caller) {
  exactKeys(caller, ["hostModulePath", "phase", "processId", "processStartTime", "root"], "TASK-540 bridge recovery caller"); const authority = await deriveTask540WorktreeRoot(import.meta.url);
  const self = await readProcessIdentity(process.pid); const hostCommandBytes = await readFile("/proc/self/cmdline"); const hostCommand = new TextDecoder("utf-8", { fatal: true }).decode(hostCommandBytes.subarray(0, -1)).split("\0");
  invariant(hostCommandBytes.at(-1) === 0 && hostCommand.slice(1).join("\0") === caller.hostModulePath + "\0--run" && caller.phase === "recovery-only" && caller.processId === process.pid && caller.processStartTime === self.startTime && caller.root === authority.root && caller.hostModulePath === authority.root + "/_docs/_workflows/" + HOST_MODULE_BASENAME, "TASK-540 bridge recovery caller rejected");
  const journal = authority.gitDir + "/" + JOURNAL_BASENAME; await bindDirectory(journal, 0o700); invariant((await realpath(journal)) === journal, "TASK-540 bridge recovery journal rejected");
  const run = requireHashedEnvelope((await readCanonicalFile(journal + "/run.json")).value, "run", "runSha256", "TASK-540 bridge recovery run rejected");
  exactKeys(run.core, ["branchSha256", "gitDirSha256", "ledgerPath", "ledgerPathSha256", "rootSha256", "runIdSha256", "worktreeSha256"], "TASK-540 bridge recovery run core"); const runId = basename(run.core.ledgerPath).slice("coderso-task540-ledger-".length);
  invariant(run.core.branchSha256 === authority.branchSha256 && run.core.gitDirSha256 === authority.gitDirSha256 && run.core.rootSha256 === authority.rootSha256 && run.core.worktreeSha256 === authority.worktreeSha256 && dirname(run.core.ledgerPath) === "/tmp" && basename(run.core.ledgerPath) === "coderso-task540-ledger-" + runId && HEX_128.test(runId) && run.core.ledgerPathSha256 === bridgeDigest("artifact-path", { path: run.core.ledgerPath }) && run.core.runIdSha256 === bridgeDigest("run-id", { runId }), "TASK-540 bridge recovery run binding rejected");
  const prepared = requireHashedEnvelope((await readCanonicalFile(journal + "/run.prepared.json")).value, "run-prepared", "runPreparedSha256", "TASK-540 bridge recovery prepared rejected"); exactKeys(prepared.core, ["runSha256"], "TASK-540 bridge recovery prepared core"); invariant(prepared.core.runSha256 === run.envelope.runSha256, "TASK-540 bridge recovery prepared binding rejected");
  const names = await readdir(journal); const launchNames = names.filter((name) => name.startsWith("launch-"));
  invariant(launchNames.every((name) => /^launch-[0-9]{12}\.(?:planned|armed|cleanup-started|cleaned)\.json$/u.test(name)), "TASK-540 bridge recovery launch inventory rejected");
  const ordinals = [...new Set(launchNames.map((name) => Number(name.slice(7, 19))))].sort((a, b) => a - b); invariant(ordinals.every((ordinal, index) => ordinal === index + 1), "TASK-540 bridge recovery launch order rejected");
  const launches = []; const runSha256 = run.envelope.runSha256; const moduleSha256 = rawDigest((await readStableModule(authority.modulePath)).bytes);
  for (const launchOrdinal of ordinals) {
    const launch = await readPriorLaunch(journal, launchOrdinal, authority);
    invariant(launch.plan.core.launchOrdinal === launchOrdinal && runSha256 === launch.plan.core.runSha256, "TASK-540 bridge recovery run drift");
    if (launch.arm) {
      invariant(launch.arm.core.moduleSha256 === moduleSha256, "TASK-540 bridge recovery module drift");
      let live = await readVerifiedBridgeProcess(launch.arm, launch.plan, authority);
      if (live) live = await signalVerifiedBridgeProcess(launch.arm, launch.plan, authority, "SIGTERM");
      const termEnd = performance.now() + PROCESS_WAIT_MS;
      while (live && performance.now() < termEnd) { await new Promise((resolveDelay) => setTimeout(resolveDelay, 50)); live = await readVerifiedBridgeProcess(launch.arm, launch.plan, authority); }
      if (live) live = await signalVerifiedBridgeProcess(launch.arm, launch.plan, authority, "SIGKILL");
      const killEnd = performance.now() + PROCESS_WAIT_MS;
      while (live && performance.now() < killEnd) { await new Promise((resolveDelay) => setTimeout(resolveDelay, 50)); live = await readVerifiedBridgeProcess(launch.arm, launch.plan, authority); }
      invariant(!live, "TASK-540 bridge recovery helper remained live");
    }
    launches.push({ launchArmedSha256: launch.arm?.envelope.launchArmedSha256 ?? null, launchOrdinal, launchPlannedSha256: launch.plan.envelope.launchPlannedSha256, state: launch.arm ? "armed_absent" : "planned_unarmed" });
  }
  const core = { launches, runSha256, schemaVersion: 1 };
  return Object.freeze({ ...core, priorHelperSweepSha256: bridgeDigest("recovery-helper-sweep", core) });
}
function requireCli(argv) {
  invariant(Array.isArray(argv) && argv.length >= 1, "TASK-540 bridge CLI rejected");
  const mode = argv[0]?.startsWith("--") ? argv[0].slice(2) : "";
  invariant(CLI_MODES.includes(mode), "TASK-540 bridge CLI rejected");
  invariant((mode === "self-test" || mode === "recover-review") ? argv.length === 1 : argv.length === 2, "TASK-540 bridge CLI cardinality rejected");
  return Object.freeze({ mode, requestDir: argv[1] ?? null });
}
async function runSelfTest() {
  const root = await deriveTask540WorktreeRoot(import.meta.url);
  const core = { a: 1, b: [true, null, "x"] };
  invariant(canonicalJson({ b: core.b, a: 1 }) === canonicalJson(core), "TASK-540 bridge canonical ordering failed");
  const frame = canonicalFrame(core);
  invariant(canonicalJson(parseCanonicalBytes(frame, true, 1024, "frame")) === canonicalJson(core), "TASK-540 bridge frame round trip failed"); canonicalFrame({ prompt: "p".repeat(MAX_PROMPT_BYTES) }, true); bridgeDigest("request", { prompt: "p".repeat(MAX_PROMPT_BYTES) });
  const schema = { type: "object", additionalProperties: false, required: ["pass"], properties: { pass: { type: "boolean" } } };
  validateResult({ pass: true }, requireSchema(schema));
  const accessor = [];
  Object.defineProperty(accessor, "0", { enumerable: true, get: () => true });
  accessor.length = 1;
  let rejected = 0;
  for (const action of [() => parseCanonicalBytes(Buffer.from("{\"b\":1,\"a\":2}\n"), true, 1024, "mutant"), () => parseCanonicalBytes(Buffer.from("{}\r\n"), true, 1024, "mutant"), () => parseCanonicalBytes(Buffer.from("{}\n{}\n"), true, 1024, "mutant"), () => requirePlainData(accessor), () => validateResult({ extra: true }, { type: "object", additionalProperties: false }), () => requireSchema({ type: "string", items: { type: "string" } }), () => bridgeDigest("request", { prompt: "p".repeat(MAX_PROMPT_BYTES + 1) }), () => canonicalJson({ other: "p".repeat(MAX_STRING_BYTES + 1) }, true), () => validateResult("p".repeat(MAX_STRING_BYTES + 1), { type: "string" })]) {
    try {
      action();
    } catch {
      rejected += 1;
    }
  }
  invariant(rejected === 9 && root.branch === EXPECTED_BRANCH && CLI_MODES.length === 7 && (await readStableModule(root.modulePath)).bytes.length > 0, "TASK-540 bridge self-test mutants failed");
  return { pass: true, cliModes: 7, canonicalCases: 5, schemaCases: 8, recoveryExport: "sweepPriorBridgeLaunchesForRecovery" };
}
const artifactRecordPath = (journal, kind, sequence, suffix) => journal + "/" + (kind === "ledger-directory" ? "ledger-directory" : (kind === "request-directory" ? "request" : "ledger") + "-" + String(sequence).padStart(12, "0")) + "." + suffix + ".json";
async function optional(action) {
  try {
    return await action();
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}
const optionalCanonical = (path, prompt = false) => optional(() => readCanonicalFile(path, MAX_FRAME_BYTES, prompt));
const optionalStat = (path) => optional(() => lstat(path, { bigint: true }));
function requireArtifactPlan(value, kind, sequence, run) {
  const plan = requireHashedEnvelope(value, "artifact-plan", "planSha256", "TASK-540 bridge recovery artifact plan rejected");
  exactKeys(plan.core, ["artifactKind", "path", "pathSha256", "requestIdSha256", "runIdSha256", "sequence"], "TASK-540 bridge recovery artifact plan core");
  const requestId = kind === "request-directory" ? basename(plan.core.path).slice("coderso-task540-request-".length) : null;
  const safePath = kind === "ledger-directory" ? plan.core.requestIdSha256 === null && sequence === null && plan.core.path === run.core.ledgerPath : kind === "request-directory" ? dirname(plan.core.path) === "/tmp" && basename(plan.core.path) === "coderso-task540-request-" + requestId && HEX_128.test(requestId) && plan.core.requestIdSha256 === bridgeDigest("request-id", { requestId }) : dirname(plan.core.path) === run.core.ledgerPath && basename(plan.core.path) === "ledger-" + String(sequence).padStart(12, "0") + ".json" && HEX_256.test(plan.core.requestIdSha256);
  invariant(plan.core.artifactKind === kind && plan.core.pathSha256 === bridgeDigest("artifact-path", { path: plan.core.path }) && plan.core.runIdSha256 === run.core.runIdSha256 && plan.core.sequence === sequence && safePath && (kind === "ledger-directory" || Number.isSafeInteger(sequence) && sequence > 0), "TASK-540 bridge recovery artifact plan binding rejected");
  return plan;
}
function requireArtifactCreated(value, plan) {
  const created = requireHashedEnvelope(value, "artifact-created", "createdSha256", "TASK-540 bridge recovery created record rejected");
  exactKeys(created.core, ["artifactKind", "contentSha256", "identity", "pathSha256", "planSha256", "sequence"], "TASK-540 bridge recovery created core");
  const file = plan.core.artifactKind === "ledger-entry";
  exactKeys(created.core.identity, file ? ["ctimeNs", "dev", "ino", "mode", "mtimeNs", "nlink", "size", "type", "uid"] : ["dev", "ino", "mode", "type", "uid"], "TASK-540 bridge recovery artifact identity");
  invariant(created.core.artifactKind === plan.core.artifactKind && created.core.pathSha256 === plan.core.pathSha256 && created.core.planSha256 === plan.envelope.planSha256 && created.core.sequence === plan.core.sequence && ["dev", "ino", "uid"].every((key) => /^(?:0|[1-9][0-9]*)$/u.test(created.core.identity[key])) && created.core.identity.uid === String(process.getuid()) && (file ? HEX_256.test(created.core.contentSha256) && created.core.identity.type === "file" && created.core.identity.mode === 0o600 && created.core.identity.nlink === "1" && ["ctimeNs", "mtimeNs", "size"].every((key) => /^(?:0|[1-9][0-9]*)$/u.test(created.core.identity[key])) && BigInt(created.core.identity.size) <= BigInt(MAX_FRAME_BYTES) : created.core.contentSha256 === null && created.core.identity.type === "directory" && created.core.identity.mode === 0o700), "TASK-540 bridge recovery created binding rejected");
  return created;
}
function identityMatches(info, identity, file) {
  return info.dev.toString() === identity.dev && info.ino.toString() === identity.ino && info.uid.toString() === identity.uid && fileMode(info) === identity.mode && (file ? info.isFile() && info.ctimeNs.toString() === identity.ctimeNs && info.mtimeNs.toString() === identity.mtimeNs && info.nlink.toString() === identity.nlink && info.size.toString() === identity.size : info.isDirectory());
}
// prettier-ignore
const captureIdentity = (info, file) => file ? { ctimeNs: info.ctimeNs.toString(), dev: info.dev.toString(), ino: info.ino.toString(), mode: fileMode(info), mtimeNs: info.mtimeNs.toString(), nlink: info.nlink.toString(), size: info.size.toString(), type: "file", uid: info.uid.toString() } : { dev: info.dev.toString(), ino: info.ino.toString(), mode: fileMode(info), type: "directory", uid: info.uid.toString() };
function requireArtifactMarker(value, kind, plan, created, started = null) {
  const digestKey = kind === "cleanup-started" ? "cleanupStartedSha256" : "cleanedSha256";
  const domain = kind === "cleanup-started" ? "artifact-cleanup-started" : "artifact-cleaned";
  const marker = requireHashedEnvelope(value, domain, digestKey, "TASK-540 bridge recovery artifact marker rejected");
  exactKeys(marker.core, kind === "cleanup-started" ? ["createdSha256", "pathSha256", "sequence"] : ["cleanupStartedSha256", "createdSha256", "pathSha256", "sequence"], "TASK-540 bridge recovery marker core");
  invariant(marker.core.createdSha256 === created.envelope.createdSha256 && marker.core.pathSha256 === plan.core.pathSha256 && marker.core.sequence === plan.core.sequence && (kind === "cleanup-started" || marker.core.cleanupStartedSha256 === started.envelope.cleanupStartedSha256), "TASK-540 bridge recovery marker binding rejected");
  return marker;
}
async function loadRecoveryArtifact(journal, kind, sequence, run) {
  const planRecord = await optionalCanonical(artifactRecordPath(journal, kind, sequence, "planned"));
  if (!planRecord) return null;
  const plan = requireArtifactPlan(planRecord.value, kind, sequence, run);
  const [createdRecord, startedRecord, cleanedRecord, info] = await Promise.all([optionalCanonical(artifactRecordPath(journal, kind, sequence, "created")), optionalCanonical(artifactRecordPath(journal, kind, sequence, "cleanup-started")), optionalCanonical(artifactRecordPath(journal, kind, sequence, "cleaned")), optionalStat(plan.core.path)]);
  const created = createdRecord ? requireArtifactCreated(createdRecord.value, plan) : null;
  const started = startedRecord && created ? requireArtifactMarker(startedRecord.value, "cleanup-started", plan, created) : null;
  const cleaned = cleanedRecord && started ? requireArtifactMarker(cleanedRecord.value, "cleaned", plan, created, started) : null;
  const file = kind === "ledger-entry";
  const permitted = !info || info.uid === BigInt(process.getuid()) && fileMode(info) === (file ? 0o600 : 0o700) && (file ? info.isFile() && info.nlink === 1n && info.size <= BigInt(MAX_FRAME_BYTES) : info.isDirectory());
  internalInvariant(permitted && (!created ? !startedRecord && !cleanedRecord : info ? !cleaned && identityMatches(info, created.core.identity, file) : Boolean(started)), "TASK-540 bridge recovery artifact presence rejected");
  return Object.freeze({ cleaned, created, info, kind, plan, sequence, started });
}
async function adoptRecoveryArtifact(artifact, journal, contentSha256 = null) {
  const file = artifact.kind === "ledger-entry";
  const current = await lstat(artifact.plan.core.path, { bigint: true });
  internalInvariant(file ? sameStableFile(current, artifact.info) : sameDirectory(current, artifact.info), "TASK-540 bridge recovery adoption identity drift");
  const core = { artifactKind: artifact.kind, contentSha256, identity: captureIdentity(current, file), pathSha256: artifact.plan.core.pathSha256, planSha256: artifact.plan.envelope.planSha256, sequence: artifact.sequence };
  const envelope = { ...core, createdSha256: bridgeDigest("artifact-created", core) };
  await writeExclusiveFile(artifactRecordPath(journal, artifact.kind, artifact.sequence, "created"), Buffer.from(canonicalJson(envelope)));
  return Object.freeze({ ...artifact, created: requireArtifactCreated(envelope, artifact.plan), info: current });
}
function validateCasGraph(files, destinationName, candidateNames) {
  const destination = files.get(destinationName);
  const candidates = candidateNames.map((name) => files.get(name)).filter(Boolean);
  const linked = destination ? candidates.filter((candidate) => sameIdentity(candidate.info, destination.info)) : [];
  internalInvariant(linked.length <= 1 && (!destination ? candidates.every((candidate) => candidate.info.nlink === 1n) : linked.length === 1 ? destination.info.nlink === 2n && linked[0].info.nlink === 2n && candidates.filter((candidate) => candidate !== linked[0]).every((candidate) => candidate.info.nlink === 1n) : destination.info.nlink === 1n && candidates.every((candidate) => candidate.info.nlink === 1n)), "TASK-540 bridge recovery CAS graph rejected");
}
async function readRecoveryRequestFiles(path, names, allowPartial) {
  const files = new Map();
  for (const name of names) {
    const record = await readStableFile(path + "/" + name);
    let value = null;
    try {
      value = parseCanonicalBytes(record.bytes, false, MAX_FRAME_BYTES, "TASK-540 bridge recovery request file rejected", name === "request.json");
    } catch (error) {
      if (!allowPartial || !(error instanceof BridgeRejectedError)) throw error;
    }
    files.set(name, Object.freeze({ ...record, value }));
  }
  for (const record of files.values()) internalInvariant(record.info.nlink === BigInt([...files.values()].filter((candidate) => sameIdentity(candidate.info, record.info)).length), "TASK-540 bridge recovery request external link rejected");
  return files;
}
function validateRecoveryProcedure(record, request, claim, settlement, row) {
  const authority = requireHashedEnvelope(record.value, "procedure", "procedureSha256", "TASK-540 bridge recovery procedure rejected");
  exactKeys(authority.core, ["agentResultSha256", "agentStateAtFinalList", "agentStateAtFirstList", "claimSha256", "dispatchStatus", "forkTurns", "interruptAttempted", "interruptPreviousState", "requestId", "requestSha256", "sequence", "settlementSha256", "spawned", "statusSha256", "transcriptCorrelationSha256"], "TASK-540 bridge recovery procedure core");
  const response = settlement.core.status === "response";
  const spawned = authority.core.spawned === true && authority.core.dispatchStatus === "spawned" && authority.core.forkTurns === "none" && HEX_256.test(authority.core.statusSha256) && HEX_256.test(authority.core.transcriptCorrelationSha256);
  const failed = !response && authority.core.spawned === false && authority.core.dispatchStatus === "spawn_failed" && authority.core.forkTurns === "none" && authority.core.agentResultSha256 === null && authority.core.transcriptCorrelationSha256 === null && authority.core.agentStateAtFirstList === "not_applicable" && authority.core.agentStateAtFinalList === "not_applicable" && authority.core.interruptAttempted === false && authority.core.interruptPreviousState === "not_applicable" && HEX_256.test(authority.core.statusSha256);
  invariant(claim && settlement && authority.core.claimSha256 === claim.envelope.claimSha256 && authority.core.requestId === request.core.requestId && authority.core.requestSha256 === request.envelope.requestSha256 && authority.core.sequence === request.core.sequence && authority.core.settlementSha256 === settlement.envelope.settlementSha256 && authority.core.dispatchStatus === row.dispatchState && (spawned || failed), "TASK-540 bridge recovery procedure binding rejected");
  if (spawned && response) invariant(authority.core.agentResultSha256 === settlement.core.agentResultSha256 && authority.core.agentStateAtFirstList === "not_applicable" && authority.core.agentStateAtFinalList === "not_applicable" && authority.core.interruptAttempted === false && authority.core.interruptPreviousState === "not_applicable", "TASK-540 bridge recovery response procedure rejected");
  if (spawned && !response) invariant((authority.core.agentResultSha256 === null || HEX_256.test(authority.core.agentResultSha256)) && ["live", "not_live"].includes(authority.core.agentStateAtFirstList) && authority.core.agentStateAtFinalList === "not_live" && (authority.core.agentStateAtFirstList === "live" ? authority.core.interruptAttempted === true && ["live", "not_live"].includes(authority.core.interruptPreviousState) : authority.core.interruptAttempted === false && authority.core.interruptPreviousState === "not_applicable"), "TASK-540 bridge recovery cancellation procedure rejected");
  return authority;
}
// prettier-ignore
async function validateRecoveryRequest(artifact, row, root, launches) {
  if (!artifact.info) {
    if (!artifact.created) invariant(row.dispatchState === "not_started", "TASK-540 bridge recovery absent uncreated request rejected");
    return Object.freeze({ artifact, files: null, preimages: null });
  }
  await bindDirectory(artifact.plan.core.path, 0o700); const names = (await readdir(artifact.plan.core.path)).sort();
  invariant(names.every((name) => REQUEST_FILE_INVENTORY.includes(name)), "TASK-540 bridge recovery request inventory rejected"); const files = await readRecoveryRequestFiles(artifact.plan.core.path, names, Boolean(artifact.started || !artifact.created || row.dispatchState === "not_started"));
  if (artifact.started) return Object.freeze({ artifact, files, preimages: null });
  const requestRecord = files.get("request.json");
  if ((!artifact.created || row.dispatchState === "not_started") && (!requestRecord?.value || names.some((name) => name !== "request.json"))) {
    invariant(row.dispatchState === "not_started" && names.every((name) => name === "request.json"), "TASK-540 bridge recovery partial request rejected");
    return Object.freeze({ artifact, files, preimages: null });
  }
  internalInvariant(requestRecord?.info.nlink === 1n, "TASK-540 bridge recovery request file missing"); const request = requireRequestEnvelope(requestRecord.value);
  invariant(artifact.plan.core.path === REQUEST_PREFIX + request.core.requestId && artifact.plan.core.requestIdSha256 === bridgeDigest("request-id", { requestId: request.core.requestId }) && artifact.plan.core.runIdSha256 === bridgeDigest("run-id", { runId: request.core.runId }) && request.core.sequence === artifact.sequence && request.core.worktreeSha256 === root.worktreeSha256 && row.requestSha256 === request.envelope.requestSha256, "TASK-540 bridge recovery request binding rejected");
  const claimRecord = files.get("claim.json"); const claim = claimRecord ? requireClaimEnvelope(claimRecord.value, { request }) : null;
  for (const owner of ["operator", "timeout"]) if (files.has(owner + ".claim.candidate.json")) invariant(requireClaimEnvelope(files.get(owner + ".claim.candidate.json").value, { request }).core.claimOwner === owner, "TASK-540 bridge recovery claim candidate rejected");
  validateCasGraph(files, "claim.json", ["operator.claim.candidate.json", "timeout.claim.candidate.json"]); const starts = new Map();
  for (const kind of ["response", "cancel"]) if (files.has(kind + ".started.json")) {
    invariant(claim, "TASK-540 bridge recovery start without claim"); const start = requireStartEnvelope(files.get(kind + ".started.json").value, { request, requestDir: artifact.plan.core.path }, claim, kind);
    const matchingLaunches = launches.filter((launch) => launch.arm && launch.plan.core.requestDir === artifact.plan.core.path && launch.plan.core.mode === start.core.processRole && launch.arm.core.processId === start.core.processId && launch.arm.core.processStartTime === start.core.processStartTime);
    internalInvariant(files.get(kind + ".started.json").info.nlink === 1n && (await readProcessIdentity(start.core.processId)) === null && (start.core.processRole === "host" || matchingLaunches.length === 1), "TASK-540 bridge recovery contender identity rejected");
    starts.set(kind, start);
  }
  const settlementRecord = files.get("settlement.json"); const settlement = settlementRecord ? await requireSettlementEnvelope(settlementRecord.value, { request, requestDir: artifact.plan.core.path }, claim) : null;
  for (const kind of ["response", "cancel"]) if (files.has(kind + ".candidate.json")) await requireSettlementEnvelope(files.get(kind + ".candidate.json").value, { request, requestDir: artifact.plan.core.path }, claim);
  validateCasGraph(files, "settlement.json", ["response.candidate.json", "cancel.candidate.json"]);
  for (const kind of ["response", "cancel"]) {
    const done = files.get(kind + ".done.json"); const candidate = files.get(kind + ".done.candidate.json");
    if (done || candidate) invariant(starts.has(kind) && settlement, "TASK-540 bridge recovery acknowledgement preimage missing");
    if (done) requireAckEnvelope(done.value, { request }, kind, starts.get(kind), settlement); if (candidate) requireAckEnvelope(candidate.value, { request }, kind, starts.get(kind), settlement); validateCasGraph(files, kind + ".done.json", [kind + ".done.candidate.json"]);
  }
  const procedure = files.get("procedure.json"); const procedureCandidate = files.get("procedure.candidate.json"); const procedureAuthority = procedure ? validateRecoveryProcedure(procedure, request, claim, settlement, row) : null;
  if (procedureCandidate) {
    const candidateAuthority = validateRecoveryProcedure(procedureCandidate, request, claim, settlement, row);
    if (procedureAuthority) invariant(canonicalJson(candidateAuthority.envelope) === canonicalJson(procedureAuthority.envelope), "TASK-540 bridge recovery duplicate procedure drift");
  }
  validateCasGraph(files, "procedure.json", ["procedure.candidate.json"]); invariant((!claim && row.dispatchState === "not_started" && names.every((name) => ["request.json", "operator.claim.candidate.json", "timeout.claim.candidate.json"].includes(name))) || claim, "TASK-540 bridge recovery unclaimed request drift");
  return Object.freeze({ artifact, files, preimages: Object.freeze({ claim, procedure: procedureAuthority, request, settlement, starts }) });
}
async function startArtifactCleanup(artifact, journal) {
  if (artifact.started) return artifact.started;
  const core = { createdSha256: artifact.created.envelope.createdSha256, pathSha256: artifact.plan.core.pathSha256, sequence: artifact.plan.core.sequence };
  const envelope = { ...core, cleanupStartedSha256: bridgeDigest("artifact-cleanup-started", core) };
  await writeExclusiveFile(artifactRecordPath(journal, artifact.kind, artifact.sequence, "cleanup-started"), Buffer.from(canonicalJson(envelope)));
  return requireArtifactMarker(envelope, "cleanup-started", artifact.plan, artifact.created);
}
async function finishArtifactCleanup(artifact, journal, started) {
  if (artifact.cleaned) return;
  const core = { cleanupStartedSha256: started.envelope.cleanupStartedSha256, createdSha256: artifact.created.envelope.createdSha256, pathSha256: artifact.plan.core.pathSha256, sequence: artifact.plan.core.sequence };
  const envelope = { ...core, cleanedSha256: bridgeDigest("artifact-cleaned", core) };
  await writeExclusiveFile(artifactRecordPath(journal, artifact.kind, artifact.sequence, "cleaned"), Buffer.from(canonicalJson(envelope)));
  requireArtifactMarker(envelope, "cleaned", artifact.plan, artifact.created, started);
}
async function cleanupRecoveryFileArtifact(artifact, journal) {
  if (!artifact.created || artifact.cleaned) return;
  const started = await startArtifactCleanup(artifact, journal);
  if (artifact.info) await unlinkExact(artifact.plan.core.path, artifact.info);
  await finishArtifactCleanup(artifact, journal, started);
}
async function unlinkRecoveryRequestFile(path, record) {
  const current = await readStableFile(path);
  internalInvariant(sameIdentity(current.info, record.info) && current.info.uid === record.info.uid && fileMode(current.info) === fileMode(record.info) && current.info.size === record.info.size && current.info.nlink >= 1n && current.info.nlink <= record.info.nlink && rawDigest(current.bytes) === rawDigest(record.bytes), "TASK-540 bridge recovery request identity drift");
  await unlinkExact(path, current.info);
}
// prettier-ignore
function validateRecoveryLedger(entry, row, recovered, run, sequence) {
  exactKeys(entry.core, ["accessClass", "claim", "contenders", "dispatch", "disposition", "request", "settlement"], "TASK-540 bridge recovery ledger core"); exactKeys(entry.core.claim, ["claimOwner", "claimSha256"], "TASK-540 bridge recovery ledger claim");
  exactKeys(entry.core.dispatch, ["agentResultSha256", "agentStateAtFinalList", "agentStateAtFirstList", "dispatchStatus", "forkTurns", "interruptAttempted", "interruptPreviousState", "procedureSha256", "spawned", "statusSha256", "transcriptCorrelationSha256"], "TASK-540 bridge recovery ledger dispatch"); exactKeys(entry.core.request, ["deadlineMonotonicNs", "requestIdSha256", "requestSha256", "runIdSha256", "sequence", "worktreeSha256"], "TASK-540 bridge recovery ledger request"); exactKeys(entry.core.settlement, ["agentResultSha256", "decisionMonotonicNs", "error", "settlementSha256", "startSha256", "status"], "TASK-540 bridge recovery ledger settlement");
  invariant(["read-only", "mutating"].includes(entry.core.accessClass) && ["operator", "timeout"].includes(entry.core.claim.claimOwner) && HEX_256.test(entry.core.claim.claimSha256) && ["accepted", "rejected_rolled_back"].includes(entry.core.disposition) && DECIMAL.test(entry.core.request.deadlineMonotonicNs) && HEX_256.test(entry.core.request.requestIdSha256) && entry.core.request.requestSha256 === row.requestSha256 && entry.core.request.runIdSha256 === run.core.runIdSha256 && entry.core.request.sequence === sequence && HEX_256.test(entry.core.request.worktreeSha256) && HEX_256.test(entry.core.settlement.settlementSha256) && HEX_256.test(entry.core.settlement.startSha256) && DECIMAL.test(entry.core.settlement.decisionMonotonicNs) && ["response", "cancelled"].includes(entry.core.settlement.status), "TASK-540 bridge recovery ledger fields rejected");
  const contenderKinds = Array.isArray(entry.core.contenders) ? entry.core.contenders.map((item) => item.contenderKind) : []; invariant(contenderKinds.length > 0 && contenderKinds.length <= 2 && new Set(contenderKinds).size === contenderKinds.length && contenderKinds.join("\0") === contenderKinds.slice().sort((left, right) => ["response", "cancel"].indexOf(left) - ["response", "cancel"].indexOf(right)).join("\0") && entry.core.contenders.every((item) => (exactKeys(item, ["ackSha256", "contenderKind", "startSha256"], "TASK-540 bridge recovery ledger contender"), ["response", "cancel"].includes(item.contenderKind) && HEX_256.test(item.ackSha256) && HEX_256.test(item.startSha256))), "TASK-540 bridge recovery ledger contenders rejected");
  const inactive = row.dispatchState === "not_started" && entry.core.dispatch.agentResultSha256 === null && entry.core.dispatch.agentStateAtFinalList === null && entry.core.dispatch.agentStateAtFirstList === null && entry.core.dispatch.dispatchStatus === "not_started" && entry.core.dispatch.forkTurns === null && entry.core.dispatch.interruptAttempted === false && entry.core.dispatch.interruptPreviousState === null && entry.core.dispatch.procedureSha256 === null && entry.core.dispatch.spawned === false && entry.core.dispatch.statusSha256 === null && entry.core.dispatch.transcriptCorrelationSha256 === null;
  const response = entry.core.settlement.status === "response"; const active = entry.core.dispatch.dispatchStatus === row.dispatchState && ["spawned", "spawn_failed"].includes(row.dispatchState) && entry.core.dispatch.forkTurns === "none" && HEX_256.test(entry.core.dispatch.procedureSha256) && HEX_256.test(entry.core.dispatch.statusSha256) && (row.dispatchState === "spawn_failed" ? !response && entry.core.dispatch.spawned === false && entry.core.dispatch.agentResultSha256 === null && entry.core.dispatch.transcriptCorrelationSha256 === null && entry.core.dispatch.agentStateAtFirstList === "not_applicable" && entry.core.dispatch.agentStateAtFinalList === "not_applicable" && entry.core.dispatch.interruptAttempted === false && entry.core.dispatch.interruptPreviousState === "not_applicable" : response ? entry.core.dispatch.spawned === true && entry.core.dispatch.agentResultSha256 === entry.core.settlement.agentResultSha256 && HEX_256.test(entry.core.dispatch.transcriptCorrelationSha256) && entry.core.dispatch.agentStateAtFirstList === "not_applicable" && entry.core.dispatch.agentStateAtFinalList === "not_applicable" && entry.core.dispatch.interruptAttempted === false && entry.core.dispatch.interruptPreviousState === "not_applicable" : entry.core.dispatch.spawned === true && (entry.core.dispatch.agentResultSha256 === null || HEX_256.test(entry.core.dispatch.agentResultSha256)) && HEX_256.test(entry.core.dispatch.transcriptCorrelationSha256) && ["live", "not_live"].includes(entry.core.dispatch.agentStateAtFirstList) && entry.core.dispatch.agentStateAtFinalList === "not_live" && (entry.core.dispatch.agentStateAtFirstList === "live" ? entry.core.dispatch.interruptAttempted === true && ["live", "not_live"].includes(entry.core.dispatch.interruptPreviousState) : entry.core.dispatch.interruptAttempted === false && entry.core.dispatch.interruptPreviousState === "not_applicable"));
  invariant((inactive || active) && entry.core.claim.claimOwner === (inactive ? "timeout" : "operator") && entry.core.contenders.some((item) => item.startSha256 === entry.core.settlement.startSha256) && (response ? entry.core.settlement.error === null && HEX_256.test(entry.core.settlement.agentResultSha256) && BigInt(entry.core.settlement.decisionMonotonicNs) < BigInt(entry.core.request.deadlineMonotonicNs) : ["deadline_exceeded", "dispatch_failed"].includes(entry.core.settlement.error) && entry.core.settlement.agentResultSha256 === null && (entry.core.settlement.error === "deadline_exceeded" ? BigInt(entry.core.settlement.decisionMonotonicNs) >= BigInt(entry.core.request.deadlineMonotonicNs) : BigInt(entry.core.settlement.decisionMonotonicNs) < BigInt(entry.core.request.deadlineMonotonicNs))), "TASK-540 bridge recovery ledger dispatch rejected");
  if (!recovered.preimages) return;
  const { claim, procedure, request, settlement, starts } = recovered.preimages; invariant(claim && settlement, "TASK-540 bridge recovery ledger preimage missing");
  const contenders = [...starts.entries()].map(([contenderKind, start]) => { const acknowledgement = recovered.files.get(contenderKind + ".done.json"); invariant(acknowledgement, "TASK-540 bridge recovery ledger acknowledgement missing"); return { ackSha256: acknowledgement.value.ackSha256, contenderKind, startSha256: start.envelope.startSha256 }; });
  const dispatch = procedure ? { agentResultSha256: procedure.core.agentResultSha256, agentStateAtFinalList: procedure.core.agentStateAtFinalList, agentStateAtFirstList: procedure.core.agentStateAtFirstList, dispatchStatus: procedure.core.dispatchStatus, forkTurns: procedure.core.forkTurns, interruptAttempted: procedure.core.interruptAttempted, interruptPreviousState: procedure.core.interruptPreviousState, procedureSha256: procedure.envelope.procedureSha256, spawned: procedure.core.spawned, statusSha256: procedure.core.statusSha256, transcriptCorrelationSha256: procedure.core.transcriptCorrelationSha256 } : { agentResultSha256: null, agentStateAtFinalList: null, agentStateAtFirstList: null, dispatchStatus: "not_started", forkTurns: null, interruptAttempted: false, interruptPreviousState: null, procedureSha256: null, spawned: false, statusSha256: null, transcriptCorrelationSha256: null };
  const settlementProjection = { agentResultSha256: settlement.core.agentResultSha256, decisionMonotonicNs: settlement.core.decisionMonotonicNs, error: settlement.core.error ?? null, settlementSha256: settlement.envelope.settlementSha256, startSha256: settlement.core.startSha256, status: settlement.core.status }; const requestProjection = { deadlineMonotonicNs: request.core.deadlineMonotonicNs, requestIdSha256: bridgeDigest("request-id", { requestId: request.core.requestId }), requestSha256: request.envelope.requestSha256, runIdSha256: run.core.runIdSha256, sequence, worktreeSha256: request.core.worktreeSha256 };
  invariant(entry.core.accessClass === request.core.accessClass && canonicalJson(entry.core.claim) === canonicalJson({ claimOwner: claim.core.claimOwner, claimSha256: claim.envelope.claimSha256 }) && canonicalJson(entry.core.contenders) === canonicalJson(contenders) && canonicalJson(entry.core.dispatch) === canonicalJson(dispatch) && canonicalJson(entry.core.request) === canonicalJson(requestProjection) && canonicalJson(entry.core.settlement) === canonicalJson(settlementProjection), "TASK-540 bridge recovery ledger preimage drift");
}
// prettier-ignore
async function validateRecoveryReview(payload, arm) {
  exactKeys(payload, ["requests", "runSha256", "schemaVersion"], "TASK-540 bridge recovery review"); const run = requireHashedEnvelope((await readCanonicalFile(arm.journal + "/run.json")).value, "run", "runSha256", "TASK-540 bridge recovery run rejected");
  exactKeys(run.core, ["branchSha256", "gitDirSha256", "ledgerPath", "ledgerPathSha256", "rootSha256", "runIdSha256", "worktreeSha256"], "TASK-540 bridge recovery run core"); const runId = basename(run.core.ledgerPath).slice("coderso-task540-ledger-".length);
  invariant(payload.runSha256 === arm.planned.core.runSha256 && payload.runSha256 === run.envelope.runSha256 && payload.schemaVersion === 1 && dirname(run.core.ledgerPath) === "/tmp" && basename(run.core.ledgerPath) === "coderso-task540-ledger-" + runId && HEX_128.test(runId) && run.core.ledgerPathSha256 === bridgeDigest("artifact-path", { path: run.core.ledgerPath }) && run.core.runIdSha256 === bridgeDigest("run-id", { runId }), "TASK-540 bridge recovery review rejected");
  await bindDirectory("/tmp", 0o777, false); const names = await readdir(arm.journal);
  internalInvariant(names.every((name) => /^(?:run(?:\.prepared)?|ledger-directory\.(?:planned|created|cleanup-started|cleaned)|(?:request|ledger)-[0-9]{12}\.(?:planned|created|cleanup-started|cleaned)|launch-[0-9]{12}\.(?:planned|armed|cleanup-started|cleaned))\.json$/u.test(name)), "TASK-540 bridge recovery journal inventory rejected"); const requestNames = names.filter((name) => /^request-[0-9]{12}\.planned\.json$/u.test(name)).sort();
  invariant(payload.requests.length === requestNames.length && requestNames.every((name, index) => Number(name.slice(8, 20)) === index + 1), "TASK-540 bridge recovery request set rejected"); const requests = [];
  for (let index = 0; index < requestNames.length; index += 1) {
    const sequence = index + 1; const row = exactKeys(payload.requests[index], ["agentStateAtFinalList", "agentStateAtFirstList", "dispatchState", "interruptAttempted", "interruptPreviousState", "requestSha256", "sequence", "taskCorrelationSha256"], "TASK-540 bridge recovery review row");
    const inactive = ["not_started", "spawn_failed"].includes(row.dispatchState) && row.agentStateAtFirstList === "not_applicable" && row.agentStateAtFinalList === "not_applicable" && row.interruptAttempted === false && row.interruptPreviousState === "not_applicable" && row.taskCorrelationSha256 === null; const spawned = row.dispatchState === "spawned" && ["live", "not_live"].includes(row.agentStateAtFirstList) && row.agentStateAtFinalList === "not_live" && HEX_256.test(row.taskCorrelationSha256) && (row.agentStateAtFirstList === "live" ? row.interruptAttempted === true && ["live", "not_live"].includes(row.interruptPreviousState) : row.interruptAttempted === false && row.interruptPreviousState === "not_applicable");
    invariant(row.sequence === sequence && HEX_256.test(row.requestSha256) && (inactive || spawned), "TASK-540 bridge recovery review truth rejected");
    const artifact = await loadRecoveryArtifact(arm.journal, "request-directory", sequence, run); internalInvariant(artifact, "TASK-540 bridge recovery request plan missing"); requests.push(await validateRecoveryRequest(artifact, row, arm.root, arm.priorLaunches));
  }
  const ledgerNames = names.filter((name) => /^ledger-[0-9]{12}\.planned\.json$/u.test(name)).sort(); invariant(ledgerNames.every((name, index) => Number(name.slice(7, 19)) === index + 1 && index < payload.requests.length), "TASK-540 bridge recovery ledger order rejected");
  const ledgers = []; let ledgerDirectory = await loadRecoveryArtifact(arm.journal, "ledger-directory", null, run); internalInvariant(ledgerDirectory, "TASK-540 bridge recovery ledger directory plan missing");
  if (ledgerDirectory.info) await bindDirectory(run.core.ledgerPath, 0o700);
  for (let index = 0; index < ledgerNames.length; index += 1) {
    const artifact = await loadRecoveryArtifact(arm.journal, "ledger-entry", index + 1, run); internalInvariant(artifact && artifact.plan.core.requestIdSha256 === requests[index].artifact.plan.core.requestIdSha256, "TASK-540 bridge recovery ledger plan missing");
    let entry = null; let record = null;
    if (artifact.info) {
      record = await readStableFile(artifact.plan.core.path); internalInvariant(sameStableFile(record.info, artifact.info), "TASK-540 bridge recovery ledger identity drift");
      try { entry = requireHashedEnvelope(parseCanonicalBytes(record.bytes, false, MAX_FRAME_BYTES, "TASK-540 bridge recovery ledger entry rejected"), "ledger-entry", "ledgerEntrySha256", "TASK-540 bridge recovery ledger entry rejected"); } catch (error) { if (artifact.created || !(error instanceof BridgeRejectedError)) throw error; }
      if (entry) {
        invariant((!artifact.created || rawDigest(record.bytes) === artifact.created.core.contentSha256) && entry.core.request.sequence === index + 1 && entry.core.request.requestSha256 === payload.requests[index].requestSha256, "TASK-540 bridge recovery ledger binding rejected"); validateRecoveryLedger(entry, payload.requests[index], requests[index], run, index + 1);
      }
    }
    ledgers.push({ artifact, entry, record });
  }
  if (ledgerDirectory.info) internalInvariant((await readdir(run.core.ledgerPath)).sort().join("\0") === ledgers.filter(({ artifact }) => artifact.info).map(({ artifact }) => basename(artifact.plan.core.path)).sort().join("\0"), "TASK-540 bridge recovery ledger inventory rejected");
  for (let index = 0; index < requests.length; index += 1) if (requests[index].artifact.info && !requests[index].artifact.created) requests[index] = Object.freeze({ ...requests[index], artifact: await adoptRecoveryArtifact(requests[index].artifact, arm.journal) });
  for (let index = 0; index < ledgers.length; index += 1) if (ledgers[index].artifact.info && !ledgers[index].artifact.created && ledgers[index].entry) ledgers[index] = { ...ledgers[index], artifact: await adoptRecoveryArtifact(ledgers[index].artifact, arm.journal, rawDigest(ledgers[index].record.bytes)) };
  if (ledgerDirectory.info && !ledgerDirectory.created) ledgerDirectory = await adoptRecoveryArtifact(ledgerDirectory, arm.journal);
  if (ledgerDirectory.cleaned) internalInvariant(ledgers.every(({ artifact }) => !artifact.created || artifact.cleaned), "TASK-540 bridge recovery ledger cleaned before child");
  for (const request of requests) if (request.artifact.created && !request.artifact.cleaned) {
    const started = await startArtifactCleanup(request.artifact, arm.journal);
    if (request.files) {
      for (const name of REQUEST_FILE_INVENTORY) if (request.files.has(name)) await unlinkRecoveryRequestFile(request.artifact.plan.core.path + "/" + name, request.files.get(name));
      internalInvariant((await readdir(request.artifact.plan.core.path)).length === 0, "TASK-540 bridge recovery request residue"); await requireBoundDirectory(request.artifact.plan.core.path); await rmdir(request.artifact.plan.core.path); DIRECTORY_AUTHORITIES.delete(request.artifact.plan.core.path); await fsyncDirectory("/tmp");
    }
    await finishArtifactCleanup(request.artifact, arm.journal, started);
  }
  for (const ledger of ledgers) { if (ledger.artifact.info && !ledger.artifact.created) await unlinkExact(ledger.artifact.plan.core.path, ledger.artifact.info); else await cleanupRecoveryFileArtifact(ledger.artifact, arm.journal); }
  if (ledgerDirectory.created && !ledgerDirectory.cleaned) {
    const started = await startArtifactCleanup(ledgerDirectory, arm.journal);
    if (ledgerDirectory.info) {
      internalInvariant((await readdir(run.core.ledgerPath)).length === 0, "TASK-540 bridge recovery ledger residue"); await requireBoundDirectory(run.core.ledgerPath); await rmdir(run.core.ledgerPath); DIRECTORY_AUTHORITIES.delete(run.core.ledgerPath); await fsyncDirectory("/tmp");
    }
    await finishArtifactCleanup(ledgerDirectory, arm.journal, started);
  }
  for (const launch of arm.priorLaunches) await finishRecoveredLaunch(launch, arm.journal);
}
async function runSpawnedMode(cli, markArmed) {
  const [bootstrap, go] = await readArmFrames();
  const arm = await authorizeArmedInvocation(cli.mode, bootstrap, go);
  markArmed();
  const needsPayload = ["respond", "procedure", "recover-review"].includes(cli.mode);
  const input = await readBoundedStream(process.stdin, MAX_FRAME_BYTES);
  invariant(needsPayload ? input.length > 0 : input.length === 0, "TASK-540 bridge mode payload rejected");
  const payload = needsPayload ? parseCanonicalBytes(input, true, MAX_FRAME_BYTES, "TASK-540 bridge payload rejected") : null;
  if (cli.mode === "recover-review") {
    await validateRecoveryReview(payload, arm);
    const reviewSha256 = bridgeDigest("recovery-review", payload);
    return { accepted: true, reviewSha256, runSha256: payload.runSha256, status: "recorded" };
  }
  return executeRequestMode(cli.mode, cli.requestDir, arm, payload);
}
const direct = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (direct) {
  let failureFrame = "rejected";
  try {
    const cli = requireCli(process.argv.slice(2));
    if (cli.mode === "self-test") {
      invariant((await readBoundedStream(process.stdin, 1)).length === 0, "TASK-540 bridge self-test stdin rejected");
      process.stdout.write(canonicalFrame(await runSelfTest()));
    } else {
      failureFrame = "silent";
      const resultPromise = runSpawnedMode(cli, () => {
        failureFrame = "armed";
      });
      process.stdout.write(canonicalFrame(await resultPromise, cli.mode === "inspect"));
    }
  } catch (error) {
    process.exitCode = 1;
    if (failureFrame !== "silent") process.stderr.write(canonicalFrame({ code: error instanceof BridgeRejectedError ? ERROR_REJECTED : ERROR_FAILED }));
  }
}

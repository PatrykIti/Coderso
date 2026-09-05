// TASK-551 private evidence filesystem companion.
// Callers never choose a repository, staging root, file name, or recovery id.
import { randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";

const storageByContext = new WeakMap(),
  testContexts = new WeakMap();
const frozen = (value) => Object.freeze(value),
  noEntry = (error) => error?.code === "ENOENT";
const MAX_EVIDENCE_BYTES = 1_048_576,
  TEMP = /^v1-([0-9]|10)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.tmp$/u;
const QUARANTINE_CATEGORIES = Object.freeze(["stale-temp", "invalid-temp", "conflict-temp"]),
  QUARANTINE_FILE = /^[a-f0-9]{64}\.quarantine$/u;
const FAULT_OPERATIONS = Object.freeze(["open", "stat", "write", "fsync", "link", "unlink"]),
  DIRECTORY_FLAGS = fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW;

function inside(child, parent) {
  const value = relative(parent, child);
  return value === "" || (!value.startsWith("..") && !value.includes("../"));
}
function identity(stats) {
  return frozen({ dev: stats.dev, ino: stats.ino, uid: stats.uid, mode: stats.mode & 0o777 });
}
function sameIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.mode === right.mode
  );
}
function durabilityError() {
  const error = new Error("task551_evidence_test_durability_fault");
  error.code = "EIO";
  return error;
}
function exactOwn(value, keys) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Reflect.ownKeys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    return null;
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      return null;
  }
  return value;
}
async function operation(state, name, callback) {
  const test = testContexts.get(state?.context);
  if (test !== undefined) {
    const index = test.index++,
      occurrence = (test.occurrences[name] ?? 0) + 1;
    test.occurrences[name] = occurrence;
    if (
      test.plan.some(
        (fault) =>
          fault.operationIndex === index &&
          fault.occurrence === occurrence &&
          fault.operation === name
      )
    )
      throw durabilityError();
  }
  return checked(state, callback);
}
async function checked(state, callback) {
  if (state !== undefined) await assertState(state);
  try {
    return await callback();
  } finally {
    if (state !== undefined) await assertState(state);
  }
}
async function entry(state, pathname) {
  try {
    return await operation(state, "stat", () => fs.lstat(pathname));
  } catch (error) {
    if (noEntry(error)) return null;
    throw error;
  }
}
async function directoryStats(state, pathname, code) {
  const before = await entry(state, pathname);
  if (before === null || !before.isDirectory() || before.isSymbolicLink()) throw new Error(code);
  let handle;
  try {
    handle = await operation(state, "open", () => fs.open(pathname, DIRECTORY_FLAGS));
    const current = await operation(state, "stat", () => handle.stat()),
      after = await entry(state, pathname);
    if (
      !current.isDirectory() ||
      !sameIdentity(identity(before), identity(current)) ||
      after === null ||
      !sameIdentity(identity(before), identity(after))
    )
      throw new Error(code);
    return current;
  } finally {
    try {
      await handle?.close();
    } catch {
      /* no descriptor authority escapes */
    }
  }
}
async function privateDirectory(state, pathname, code) {
  const current = await directoryStats(state, pathname, code);
  if (current.uid !== state.ownerUid || (current.mode & 0o777) !== 0o700) throw new Error(code);
  return current;
}
async function createPrivateDirectory(state, pathname, code) {
  if ((await entry(state, pathname)) === null) {
    await checked(state, () => fs.mkdir(pathname, { recursive: true, mode: 0o700 }));
    await checked(state, () => fs.chmod(pathname, 0o700));
  }
  const current = await directoryStats(state, pathname, code);
  if ((current.mode & 0o777) !== 0o700 || (state !== undefined && current.uid !== state.ownerUid))
    throw new Error(code);
  return current;
}
async function captureAncestors(repo, endpoint, code) {
  if (!inside(endpoint, repo)) throw new Error(code);
  const paths = [repo];
  let current = repo;
  for (const segment of relative(repo, endpoint).split("/").filter(Boolean)) {
    current = join(current, segment);
    paths.push(current);
  }
  return frozen(
    await Promise.all(
      paths.map(async (pathname) =>
        frozen({ pathname, identity: identity(await directoryStats(undefined, pathname, code)) })
      )
    )
  );
}
function requirePolicy(policy) {
  const keys = [
    "canonicalRoot",
    "manifest",
    "rowIds",
    "rowByPath",
    "validateBytes",
    "decodeValue",
    "sha256",
  ];
  if (
    policy === null ||
    typeof policy !== "object" ||
    !Object.isFrozen(policy) ||
    Reflect.ownKeys(policy).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(policy, key)) ||
    typeof policy.canonicalRoot !== "string" ||
    !Array.isArray(policy.manifest) ||
    !Array.isArray(policy.rowIds) ||
    policy.rowIds.length !== policy.manifest.length ||
    new Set(policy.rowIds).size !== policy.rowIds.length ||
    policy.rowIds.some((rowId) => typeof rowId !== "string") ||
    !(policy.rowByPath instanceof Map) ||
    typeof policy.validateBytes !== "function" ||
    typeof policy.decodeValue !== "function" ||
    typeof policy.sha256 !== "function"
  )
    throw new Error("task551_evidence_filesystem_policy_invalid");
  return policy;
}

/** Called only by the evidence contract's owner-controlled bootstrap. */
export async function installTask551EvidenceStorageForOwner({ repoRoot, canonicalRoot }) {
  if (typeof repoRoot !== "string" || typeof canonicalRoot !== "string")
    throw new Error("task551_evidence_storage_uninstalled");
  const code = "task551_evidence_storage_uninstalled",
    repo = await fs.realpath(repoRoot).catch(() => {
      throw new Error(code);
    }),
    canonicalInput = resolve(repo, canonicalRoot);
  if (!inside(canonicalInput, repo) || canonicalInput === repo) throw new Error(code);
  await checked(undefined, () => fs.mkdir(canonicalInput, { recursive: true, mode: 0o755 }));
  const canonical = await fs.realpath(canonicalInput).catch(() => {
      throw new Error(code);
    }),
    canonicalStats = await directoryStats(undefined, canonical, code);
  if (!inside(canonical, repo) || (canonicalStats.mode & 0o022) !== 0)
    throw new Error("task551_evidence_storage_rebind");
  const privateInput = resolve(dirname(canonical), ".task551-private-evidence");
  if (!inside(privateInput, repo)) throw new Error("task551_evidence_storage_rebind");
  await createPrivateDirectory(undefined, privateInput, code);
  const privateRoot = await fs.realpath(privateInput).catch(() => {
    throw new Error(code);
  });
  if (!inside(privateRoot, repo)) throw new Error("task551_evidence_storage_rebind");
  await createPrivateDirectory(undefined, join(privateRoot, "quarantine"), code);
  const quarantine = await fs.realpath(join(privateRoot, "quarantine")).catch(() => {
    throw new Error(code);
  });
  const privateStats = await directoryStats(undefined, privateRoot, code),
    quarantineStats = await directoryStats(undefined, quarantine, code);
  if (
    canonicalStats.dev !== privateStats.dev ||
    canonicalStats.uid !== privateStats.uid ||
    privateStats.uid !== quarantineStats.uid
  )
    throw new Error(code);
  const context = frozen({}),
    state = frozen({
      context,
      repo,
      canonical,
      privateRoot,
      quarantine,
      ownerUid: canonicalStats.uid,
      ancestors: await captureAncestors(repo, dirname(canonical), code),
      canonicalIdentity: identity(canonicalStats),
      privateIdentity: identity(privateStats),
      quarantineIdentity: identity(quarantineStats),
    });
  storageByContext.set(context, state);
  return context;
}

/** A disjoint test-only context; it cannot satisfy the production singleton. */
export async function installTask551EvidenceStorageForTests(canonicalRoot) {
  const repo = await fs.mkdtemp(join(tmpdir(), "coderso-task551-evidence-test-"));
  const context = await installTask551EvidenceStorageForOwner({ repoRoot: repo, canonicalRoot });
  testContexts.set(context, { plan: frozen([]), index: 0, occurrences: Object.create(null) });
  return context;
}
export async function restartTask551EvidenceStorageForTests(context) {
  if (!testContexts.has(context)) throw new Error("task551_evidence_test_fault_invalid");
  const state = await requireStorage(context),
    next = await installTask551EvidenceStorageForOwner({
      repoRoot: state.repo,
      canonicalRoot: relative(state.repo, state.canonical),
    });
  testContexts.set(next, { plan: frozen([]), index: 0, occurrences: Object.create(null) });
  return next;
}

/** Closed test-only structure faults; no root, path, or adapter crosses this boundary. */
export async function applyTask551EvidenceTestFault(context, fault) {
  if (
    !testContexts.has(context) ||
    ![
      "ancestor-drift",
      "canonical-directory",
      "canonical-writable-root",
      "canonical-writable-row",
      "foreign-entry",
      "invalid-row",
      "private-category-mode",
      "private-entry",
      "symlink-row",
    ].includes(fault)
  )
    throw new Error("task551_evidence_test_fault_invalid");
  const state = await requireStorage(context),
    row = "l03-initialize.json";
  if (fault === "ancestor-drift") {
    await fs.chmod(dirname(state.canonical), 0o700);
    return true;
  }
  if (fault === "canonical-directory")
    await checked(state, () => fs.mkdir(join(state.canonical, row), { mode: 0o700 }));
  if (fault === "canonical-writable-root") {
    await fs.chmod(state.canonical, 0o775);
    return true;
  }
  if (fault === "canonical-writable-row") {
    await checked(state, () =>
      fs.writeFile(join(state.canonical, row), "{}\n", { flag: "wx", mode: 0o600 })
    );
    await checked(state, () => fs.chmod(join(state.canonical, row), 0o620));
  }
  if (fault === "foreign-entry")
    await checked(state, () =>
      fs.writeFile(join(state.canonical, "foreign.json"), "{}\n", { flag: "wx", mode: 0o600 })
    );
  if (fault === "invalid-row")
    await checked(state, () =>
      fs.writeFile(join(state.canonical, row), "{}\n", { flag: "wx", mode: 0o600 })
    );
  if (fault === "private-category-mode") {
    await fs.chmod(await quarantineDirectory(state, 0, "stale-temp"), 0o750);
    return true;
  }
  if (fault === "symlink-row")
    await checked(state, () => fs.symlink("missing-target", join(state.canonical, row)));
  if (fault === "private-entry")
    await checked(state, () =>
      fs.writeFile(join(state.privateRoot, "sealed.tmp"), "x", { flag: "wx", mode: 0o600 })
    );
  await assertState(state);
}
/** Bounded sorted operation/occurrence faults exercise durability without FS injection. */
export function setTask551EvidenceTestFaultPlan(context, plan) {
  if (!testContexts.has(context) || !Array.isArray(plan) || plan.length > 8)
    throw new Error("task551_evidence_test_fault_invalid");
  let previous = -1;
  const copy = plan.map((value) => {
    const fault = exactOwn(value, ["operationIndex", "occurrence", "operation"]);
    if (
      fault === null ||
      !Number.isSafeInteger(fault.operationIndex) ||
      fault.operationIndex < 0 ||
      fault.operationIndex > 4095 ||
      !Number.isSafeInteger(fault.occurrence) ||
      fault.occurrence < 1 ||
      fault.occurrence > 256 ||
      !FAULT_OPERATIONS.includes(fault.operation) ||
      fault.operationIndex <= previous
    )
      throw new Error("task551_evidence_test_fault_invalid");
    previous = fault.operationIndex;
    return frozen({
      operationIndex: fault.operationIndex,
      occurrence: fault.occurrence,
      operation: fault.operation,
    });
  });
  testContexts.set(context, { plan: frozen(copy), index: 0, occurrences: Object.create(null) });
  return true;
}

/** Test-only sealed staging fixture; the context and row/value remain closed. */
export async function stageTask551EvidenceTestTemp(context, row, value, policyInput, count) {
  const policy = requirePolicy(policyInput);
  if (
    !testContexts.has(context) ||
    ![1, 2].includes(count) ||
    policy.rowByPath.get(row?.path) !== row
  )
    throw new Error("task551_evidence_test_fault_invalid");
  const decoded = policy.decodeValue(row, value);
  if (decoded.error) throw new Error(decoded.error);
  const state = await requireStorage(context),
    index = policy.manifest.indexOf(row),
    bytes = Buffer.from(`${JSON.stringify(decoded.value)}\n`, "utf8");
  for (let number = 0; number < count; number += 1) {
    const temporary = join(state.privateRoot, temporaryName(index, randomUUID()));
    let handle;
    try {
      handle = await operation(state, "open", () => fs.open(temporary, "wx", 0o600));
      await operation(state, "write", () => handle.write(bytes, 0, bytes.byteLength, 0));
      await operation(state, "fsync", () => handle.sync());
    } finally {
      try {
        await handle?.close();
      } catch {
        /* descriptor cleanup */
      }
    }
  }
  await syncDirectory(state, state.privateRoot);
  return true;
}

async function assertState(state) {
  const uncheckedEntry = async (pathname) => {
    try {
      return await fs.lstat(pathname);
    } catch (error) {
      if (noEntry(error)) return null;
      throw error;
    }
  };
  const uncheckedDirectory = async (pathname, code) => {
    const before = await uncheckedEntry(pathname);
    if (before === null || !before.isDirectory() || before.isSymbolicLink()) throw new Error(code);
    let handle;
    try {
      handle = await fs.open(pathname, DIRECTORY_FLAGS);
      const current = await handle.stat(),
        after = await uncheckedEntry(pathname);
      if (
        !current.isDirectory() ||
        !sameIdentity(identity(before), identity(current)) ||
        after === null ||
        !sameIdentity(identity(before), identity(after))
      )
        throw new Error(code);
      return current;
    } finally {
      try {
        await handle?.close();
      } catch {
        /* no descriptor authority escapes */
      }
    }
  };
  const [ancestors, canonical, privateRoot, quarantine] = await Promise.all([
    Promise.all(
      state.ancestors.map(async (item) =>
        frozen({
          item,
          current: await uncheckedDirectory(
            item.pathname,
            "task551_evidence_storage_identity_drift"
          ),
        })
      )
    ),
    uncheckedDirectory(state.canonical, "task551_evidence_storage_identity_drift"),
    uncheckedDirectory(state.privateRoot, "task551_evidence_storage_identity_drift"),
    uncheckedDirectory(state.quarantine, "task551_evidence_storage_identity_drift"),
  ]);
  if (ancestors.some(({ item, current }) => !sameIdentity(identity(current), item.identity)))
    throw new Error("task551_evidence_storage_identity_drift");
  if (
    privateRoot.uid !== state.ownerUid ||
    quarantine.uid !== state.ownerUid ||
    (privateRoot.mode & 0o777) !== 0o700 ||
    (quarantine.mode & 0o777) !== 0o700 ||
    !sameIdentity(identity(canonical), state.canonicalIdentity) ||
    !sameIdentity(identity(privateRoot), state.privateIdentity) ||
    !sameIdentity(identity(quarantine), state.quarantineIdentity) ||
    canonical.uid !== state.ownerUid ||
    (canonical.mode & 0o022) !== 0
  )
    throw new Error("task551_evidence_storage_identity_drift");
}
async function requireStorage(context) {
  const state = storageByContext.get(context);
  if (state === undefined) throw new Error("task551_evidence_storage_uninstalled");
  try {
    await assertState(state);
  } catch (error) {
    if (error?.message === "task551_evidence_storage_identity_drift") throw error;
    throw new Error("task551_evidence_storage_identity_drift");
  }
  return state;
}
async function regularBytes(state, pathname, privateEntry) {
  const before = await entry(state, pathname);
  if (before === null) return null;
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.uid !== state.ownerUid ||
    before.size > MAX_EVIDENCE_BYTES ||
    (privateEntry ? (before.mode & 0o777) !== 0o600 : (before.mode & 0o022) !== 0)
  )
    return false;
  let handle;
  try {
    handle = await operation(state, "open", () =>
      fs.open(pathname, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW)
    );
    const opened = await operation(state, "stat", () => handle.stat());
    if (!opened.isFile() || !sameIdentity(identity(before), identity(opened))) return false;
    const bytes = await checked(state, () => handle.readFile()),
      afterHandle = await operation(state, "stat", () => handle.stat()),
      after = await entry(state, pathname);
    return after === null ||
      !sameIdentity(identity(before), identity(afterHandle)) ||
      !sameIdentity(identity(before), identity(after))
      ? false
      : bytes;
  } finally {
    try {
      await handle?.close();
    } catch {
      /* no descriptor authority escapes */
    }
  }
}
async function syncDirectory(state, pathname) {
  const before = await directoryStats(state, pathname, "task551_evidence_recovery_blocked"),
    handle = await operation(state, "open", () => fs.open(pathname, DIRECTORY_FLAGS));
  try {
    const opened = await operation(state, "stat", () => handle.stat());
    if (!sameIdentity(identity(before), identity(opened)))
      throw new Error("task551_evidence_storage_identity_drift");
    await operation(state, "fsync", () => handle.sync());
    const after = await directoryStats(state, pathname, "task551_evidence_recovery_blocked");
    if (!sameIdentity(identity(before), identity(after)))
      throw new Error("task551_evidence_storage_identity_drift");
  } finally {
    try {
      await handle.close();
    } catch {
      /* descriptor cleanup */
    }
  }
}
async function linkNoReplace(state, source, destination) {
  await assertState(state);
  try {
    return await operation(state, "link", () => fs.link(source, destination));
  } finally {
    await assertState(state);
  }
}
async function quarantineDirectory(state, rowIndex, category) {
  const v1 = join(state.quarantine, "v1"),
    row = join(v1, String(rowIndex)),
    directory = join(row, category);
  await createPrivateDirectory(state, v1, "task551_evidence_recovery_blocked");
  await createPrivateDirectory(state, row, "task551_evidence_recovery_blocked");
  await createPrivateDirectory(state, directory, "task551_evidence_recovery_blocked");
  return directory;
}
function quarantinePath(state, policy, rowIndex, category, sealedStagingId) {
  return join(
    state.quarantine,
    "v1",
    String(rowIndex),
    category,
    `${policy.sha256(Buffer.from(`${rowIndex}\0${category}\0${sealedStagingId}`, "utf8"))}.quarantine`
  );
}
async function finishPrivateCleanup(state, item) {
  const witness = await regularBytes(state, item.witness, true);
  if (!(witness instanceof Uint8Array) || !equalBytes(witness, item.bytes))
    throw new Error("task551_evidence_recovery_blocked");
  if (item.sourceMissing) {
    await syncDirectory(state, state.privateRoot);
    return;
  }
  const source = await entry(state, item.temporary.pathname);
  if (
    source === null ||
    !source.isFile() ||
    source.isSymbolicLink() ||
    source.uid !== state.ownerUid ||
    (source.mode & 0o777) !== 0o600
  )
    throw new Error("task551_evidence_recovery_blocked");
  const witnessEntry = await entry(state, item.witness);
  if (witnessEntry === null || !sameIdentity(identity(source), identity(witnessEntry)))
    throw new Error("task551_evidence_recovery_blocked");
  const bytes = await regularBytes(state, item.temporary.pathname, true);
  if (!(bytes instanceof Uint8Array) || !equalBytes(bytes, item.bytes))
    throw new Error("task551_evidence_recovery_blocked");
  await operation(state, "unlink", () => fs.unlink(item.temporary.pathname));
  await syncDirectory(state, state.privateRoot);
}
function summary(rows, blockers) {
  return frozen({ rows: frozen(rows), blockers: frozen(blockers), clear: blockers.length === 0 });
}
function blocker(scope, code, rowId = undefined) {
  return frozen(rowId === undefined ? { scope, code } : { scope, code, rowId });
}
function recoveryRow(rowId, terminalResult, telemetry) {
  return frozen({ rowId, terminalResult, telemetry });
}
function temporaryName(rowIndex, sealedStagingId) {
  return `v1-${rowIndex}-${sealedStagingId}.tmp`;
}
function equalBytes(left, right) {
  return Buffer.from(left).equals(Buffer.from(right));
}

async function listDirectory(state, pathname) {
  return checked(state, async () => (await fs.readdir(pathname)).sort());
}
async function scanQuarantines(state, rowCount) {
  const categories = Array.from({ length: rowCount }, () => []),
    targets = Array.from({ length: rowCount }, () => []),
    rootNames = await listDirectory(state, state.quarantine);
  if (rootNames.length === 0) return frozen({ categories, targets });
  if (rootNames.length !== 1 || rootNames[0] !== "v1") return null;
  const v1 = join(state.quarantine, "v1");
  await privateDirectory(state, v1, "task551_evidence_recovery_blocked");
  for (const rowName of await listDirectory(state, v1)) {
    if (!/^(?:0|[1-9]|10)$/u.test(rowName) || Number(rowName) >= rowCount) return null;
    const index = Number(rowName),
      rowDirectory = join(v1, rowName);
    await privateDirectory(state, rowDirectory, "task551_evidence_recovery_blocked");
    for (const category of await listDirectory(state, rowDirectory)) {
      if (!QUARANTINE_CATEGORIES.includes(category)) return null;
      const categoryDirectory = join(rowDirectory, category);
      await privateDirectory(state, categoryDirectory, "task551_evidence_recovery_blocked");
      for (const name of await listDirectory(state, categoryDirectory)) {
        const bytes = await regularBytes(state, join(categoryDirectory, name), true);
        if (QUARANTINE_FILE.test(name) && bytes instanceof Uint8Array) {
          categories[index].push(category);
          targets[index].push(frozen({ pathname: join(categoryDirectory, name), category }));
          continue;
        }
        return null;
      }
    }
  }
  return frozen({ categories, targets });
}
async function scanTemps(state, rowCount) {
  const groups = Array.from({ length: rowCount }, () => []);
  for (const name of await listDirectory(state, state.privateRoot)) {
    if (name === "quarantine") continue;
    const match = TEMP.exec(name);
    if (match === null || Number(match[1]) >= rowCount) return null;
    const pathname = join(state.privateRoot, name),
      current = await entry(state, pathname);
    if (
      current === null ||
      !current.isFile() ||
      current.isSymbolicLink() ||
      current.uid !== state.ownerUid ||
      (current.mode & 0o777) !== 0o600
    )
      return null;
    groups[Number(match[1])].push(frozen({ pathname, sealedStagingId: match[2] }));
  }
  return groups;
}
async function quarantineDestination(state, policy, rowIndex, category, sealedStagingId) {
  await quarantineDirectory(state, rowIndex, category);
  return quarantinePath(state, policy, rowIndex, category, sealedStagingId);
}
async function samePrivateTarget(state, sourcePath, targetPath) {
  const [source, target] = await Promise.all([entry(state, sourcePath), entry(state, targetPath)]);
  return (
    source !== null &&
    target !== null &&
    source.isFile() &&
    target.isFile() &&
    !source.isSymbolicLink() &&
    !target.isSymbolicLink() &&
    source.uid === state.ownerUid &&
    target.uid === state.ownerUid &&
    (source.mode & 0o777) === 0o600 &&
    (target.mode & 0o777) === 0o600 &&
    sameIdentity(identity(source), identity(target))
  );
}
async function linkQuarantine(state, policy, pending) {
  const destination = await quarantineDestination(
      state,
      policy,
      pending.index,
      pending.category,
      pending.temporary.sealedStagingId
    ),
    existing = await regularBytes(state, destination, true);
  if (existing instanceof Uint8Array) {
    if (
      !equalBytes(existing, pending.bytes) ||
      !(await samePrivateTarget(state, pending.temporary.pathname, destination))
    )
      return { destination, conflict: true };
    await syncDirectory(state, dirname(destination));
    return { destination, conflict: false, known: true };
  }
  if (existing !== null) return { destination, conflict: true };
  try {
    await linkNoReplace(state, pending.temporary.pathname, destination);
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const raced = await regularBytes(state, destination, true);
    if (
      !(raced instanceof Uint8Array) ||
      !equalBytes(raced, pending.bytes) ||
      !(await samePrivateTarget(state, pending.temporary.pathname, destination))
    )
      return { destination, conflict: true };
  }
  await syncDirectory(state, dirname(destination));
  return { destination, conflict: false, known: false };
}
function rowResult(policy, index, destinationBytes, categories, conflict, durability) {
  const rowId = policy.rowIds[index];
  if (durability)
    return [
      recoveryRow(rowId, "blocked", "durability_blocked"),
      blocker("row", "task551_evidence_recovery_blocked", rowId),
    ];
  if (conflict)
    return [
      recoveryRow(rowId, "blocked", "blocked_quarantine_conflict"),
      blocker("row", "task551_evidence_recovery_blocked", rowId),
    ];
  if (categories.includes("invalid-temp"))
    return [
      recoveryRow(rowId, "blocked", "blocked_invalid_temp"),
      blocker("row", "task551_evidence_recovery_blocked", rowId),
    ];
  if (categories.includes("conflict-temp"))
    return [
      recoveryRow(rowId, "blocked", "blocked_conflict_temp"),
      blocker("row", "task551_evidence_recovery_blocked", rowId),
    ];
  if (categories.filter((category) => category === "stale-temp").length > 1)
    return [
      recoveryRow(rowId, "blocked", "blocked_multiple_stale_temps"),
      blocker("row", "task551_evidence_recovery_blocked", rowId),
    ];
  if (destinationBytes instanceof Uint8Array)
    return [recoveryRow(rowId, "committed", "destination_valid")];
  if (categories.includes("stale-temp"))
    return [recoveryRow(rowId, "discarded_retryable", "temp_discarded")];
  return [recoveryRow(rowId, "empty", "recovery_empty")];
}
function identityDrift(error) {
  return error?.message === "task551_evidence_storage_identity_drift";
}
function recoveryFailure(error) {
  return summary(
    [],
    [
      blocker(
        "global-root",
        identityDrift(error)
          ? "task551_evidence_recovery_blocked_foreign_entry"
          : "task551_evidence_recovery_blocked"
      ),
    ]
  );
}
function quarantineCategory(policy, row, destination, bytes) {
  return destination instanceof Uint8Array
    ? equalBytes(destination, bytes)
      ? "stale-temp"
      : "conflict-temp"
    : policy.validateBytes(row, bytes) === null
      ? "stale-temp"
      : "invalid-temp";
}

/** Rechecks the closed canonical root and only mutates sealed private staging. */
export async function recoverTask551EvidenceFilesystem(context, policyInput) {
  const policy = requirePolicy(policyInput);
  let state;
  try {
    state = await requireStorage(context);
  } catch (error) {
    if (identityDrift(error)) return recoveryFailure(error);
    throw error;
  }
  const permitted = new Set(policy.manifest.map((row) => basename(row.path)));
  let names;
  try {
    names = await listDirectory(state, state.canonical);
  } catch (error) {
    return recoveryFailure(error);
  }
  if (names.some((name) => !permitted.has(name)))
    return summary([], [blocker("global-root", "task551_evidence_recovery_blocked_foreign_entry")]);
  const destinations = [];
  try {
    for (const row of policy.manifest) {
      const bytes = await regularBytes(state, join(state.canonical, basename(row.path)), false);
      if (bytes === false)
        return summary(
          [],
          [blocker("global-root", "task551_evidence_recovery_blocked_foreign_entry")]
        );
      destinations.push(bytes);
    }
  } catch (error) {
    return recoveryFailure(error);
  }
  let quarantines, temps;
  try {
    [quarantines, temps] = [
      await scanQuarantines(state, policy.manifest.length),
      await scanTemps(state, policy.manifest.length),
    ];
  } catch (error) {
    return recoveryFailure(error);
  }
  if (quarantines === null || temps === null)
    return summary([], [blocker("global-root", "task551_evidence_recovery_blocked")]);
  const categories = quarantines.categories.map((items) => [...items]),
    pending = [],
    expectedTargets = new Set(),
    conflicts = new Set(),
    durability = new Set(),
    invalidDestinations = new Set();
  for (let index = 0; index < policy.manifest.length; index += 1)
    if (
      destinations[index] instanceof Uint8Array &&
      policy.validateBytes(policy.manifest[index], destinations[index]) !== null
    )
      invalidDestinations.add(index);
  const claimSource = async (index, temporary) => {
    const row = policy.manifest[index],
      destination = destinations[index];
    if (invalidDestinations.has(index)) return;
    let bytes;
    try {
      bytes = await regularBytes(state, temporary.pathname, true);
    } catch (error) {
      if (identityDrift(error)) throw error;
      durability.add(index);
      return;
    }
    if (!(bytes instanceof Uint8Array)) {
      durability.add(index);
      return;
    }
    const category = quarantineCategory(policy, row, destination, bytes),
      witness = quarantinePath(state, policy, index, category, temporary.sealedStagingId);
    expectedTargets.add(witness);
    pending.push({
      index,
      temporary,
      bytes,
      category,
      witness,
      sourceMissing: false,
      destinationEqual: destination instanceof Uint8Array && equalBytes(destination, bytes),
    });
  };
  try {
    for (let index = 0; index < policy.manifest.length; index += 1)
      for (const temporary of temps[index]) await claimSource(index, temporary);
    for (let index = 0; index < policy.manifest.length; index += 1)
      for (const target of quarantines.targets[index]) {
        if (invalidDestinations.has(index) || expectedTargets.has(target.pathname)) continue;
        let bytes;
        try {
          bytes = await regularBytes(state, target.pathname, true);
        } catch (error) {
          if (identityDrift(error)) throw error;
          durability.add(index);
          continue;
        }
        if (
          !(bytes instanceof Uint8Array) ||
          target.category !==
            quarantineCategory(policy, policy.manifest[index], destinations[index], bytes)
        ) {
          durability.add(index);
          continue;
        }
        pending.push({
          index,
          temporary: null,
          bytes,
          category: target.category,
          witness: target.pathname,
          sourceMissing: true,
          destinationEqual:
            destinations[index] instanceof Uint8Array && equalBytes(destinations[index], bytes),
        });
      }
  } catch (error) {
    return recoveryFailure(error);
  }
  let failure;
  try {
    for (const item of [...pending].sort((left, right) =>
      (left.temporary?.pathname ?? left.witness).localeCompare(
        right.temporary?.pathname ?? right.witness
      )
    )) {
      if (item.sourceMissing) {
        await syncDirectory(state, dirname(item.witness));
        item.ready = true;
      } else {
        const result = await linkQuarantine(state, policy, item);
        if (result.conflict) conflicts.add(item.index);
        else {
          item.witness = result.destination;
          item.ready = true;
          if (!result.known) categories[item.index].push(item.category);
        }
      }
    }
    if (pending.some((item) => item.ready && item.destinationEqual))
      await syncDirectory(state, state.canonical);
  } catch (error) {
    failure = error;
  }
  if (identityDrift(failure)) return recoveryFailure(failure);
  if (failure === undefined) {
    try {
      const sources = pending
        .filter((item) => item.ready)
        .sort((left, right) =>
          (left.temporary?.pathname ?? left.witness).localeCompare(
            right.temporary?.pathname ?? right.witness
          )
        );
      for (const item of sources) await finishPrivateCleanup(state, item);
    } catch (error) {
      failure = error;
    }
  }
  if (identityDrift(failure)) return recoveryFailure(failure);
  if (failure !== undefined) for (const item of pending) durability.add(item.index);
  const rows = [],
    blockers = [];
  for (let index = 0; index < policy.manifest.length; index += 1) {
    if (invalidDestinations.has(index)) {
      const rowId = policy.rowIds[index];
      rows.push(recoveryRow(rowId, "blocked", "destination_invalid"));
      blockers.push(blocker("row", "task551_evidence_recovery_blocked", rowId));
      continue;
    }
    const result = rowResult(
      policy,
      index,
      destinations[index],
      categories[index],
      conflicts.has(index),
      durability.has(index)
    );
    rows.push(result[0]);
    if (result[1] !== undefined) blockers.push(result[1]);
  }
  try {
    await assertState(state);
  } catch (error) {
    return recoveryFailure(error);
  }
  return summary(rows, blockers);
}
function requireClear(summaryValue) {
  if (summaryValue.clear) return;
  const foreign = summaryValue.blockers.some(
    (entry) =>
      entry.scope === "global-root" &&
      entry.code === "task551_evidence_recovery_blocked_foreign_entry"
  );
  throw new Error(
    foreign
      ? "task551_evidence_recovery_blocked_foreign_entry"
      : "task551_evidence_recovery_blocked"
  );
}

/** Writes a policy-selected row through a sealed private no-replace temp. */
export async function writeTask551EvidenceFilesystem(context, row, value, policyInput) {
  const policy = requirePolicy(policyInput);
  if (policy.rowByPath.get(row?.path) !== row)
    throw new Error("task551_evidence_manifest_not_canonical");
  requireClear(await recoverTask551EvidenceFilesystem(context, policy));
  const state = await requireStorage(context);
  const decoded = policy.decodeValue(row, value);
  if (decoded.error) throw new Error(decoded.error);
  const bytes = Buffer.from(`${JSON.stringify(decoded.value)}\n`, "utf8"),
    index = policy.manifest.indexOf(row),
    destination = join(state.canonical, basename(row.path));
  if (!inside(destination, state.canonical)) throw new Error("task551_evidence_write_escape");
  const preexisting = await regularBytes(state, destination, false);
  if (preexisting instanceof Uint8Array && equalBytes(preexisting, bytes))
    return frozen({
      path: row.path,
      phase: row.phase,
      digest: `sha256:${policy.sha256(bytes)}`,
      bytes: bytes.byteLength,
      action: "destination_eexist_race_committed",
    });
  if (preexisting !== null && !(preexisting instanceof Uint8Array))
    throw new Error("task551_evidence_storage_identity_drift");
  const sealedStagingId = randomUUID(),
    temporary = join(state.privateRoot, temporaryName(index, sealedStagingId));
  if (!inside(temporary, state.privateRoot)) throw new Error("task551_evidence_write_escape");
  let handle,
    action = "committed_no_replace";
  try {
    handle = await operation(state, "open", () => fs.open(temporary, "wx", 0o600));
    await operation(state, "write", () => handle.write(bytes, 0, bytes.byteLength, 0));
    await operation(state, "fsync", () => handle.sync());
    await handle.close();
    handle = undefined;
    try {
      await linkNoReplace(state, temporary, destination);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const existing = await regularBytes(state, destination, false);
      if (!(existing instanceof Uint8Array) || !equalBytes(existing, bytes))
        throw new Error("task551_evidence_destination_exists_no_replace");
      action = "destination_eexist_race_committed";
    }
    await syncDirectory(state, state.canonical);
    const cleanup = {
      index,
      temporary: frozen({ pathname: temporary, sealedStagingId }),
      bytes,
      category: "stale-temp",
      sourceMissing: false,
    };
    const result = await linkQuarantine(state, policy, cleanup);
    if (result.conflict) throw new Error("task551_evidence_recovery_blocked");
    cleanup.witness = result.destination;
    await finishPrivateCleanup(state, cleanup);
    await assertState(state);
    return frozen({
      path: row.path,
      phase: row.phase,
      digest: `sha256:${policy.sha256(bytes)}`,
      bytes: bytes.byteLength,
      action,
    });
  } catch (error) {
    if (
      error?.message === "task551_evidence_destination_exists_no_replace" ||
      error?.message === "task551_evidence_storage_identity_drift"
    )
      throw error;
    throw new Error("task551_evidence_write_failed");
  } finally {
    try {
      await handle?.close();
    } catch {
      /* descriptor cleanup */
    }
  }
}

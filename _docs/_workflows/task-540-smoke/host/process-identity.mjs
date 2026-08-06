import {
  deepFreezeExact,
  exactDenseArray,
  exactOrderedDataObject,
  invariant,
} from "./validation.mjs";

export const PORTS = Object.freeze([3000, 5173, 5174]);

export function validateIdentity(identity, label) {
  exactOrderedDataObject(identity, ["pid", "ppid", "pgid", "startTicks"], label);
  invariant(Number.isSafeInteger(identity.pid) && identity.pid > 0, label + " PID drift");
  invariant(Number.isSafeInteger(identity.ppid) && identity.ppid >= 0, label + " PPID drift");
  invariant(Number.isSafeInteger(identity.pgid) && identity.pgid > 0, label + " PGID drift");
  invariant(/^[1-9][0-9]*$/u.test(identity.startTicks), label + " start identity drift");
}

export function sameIdentity(left, right) {
  return (
    left.pid === right.pid &&
    left.ppid === right.ppid &&
    left.pgid === right.pgid &&
    left.startTicks === right.startTicks
  );
}

export function cloneIdentity(identity) {
  validateIdentity(identity, "process identity");
  return deepFreezeExact({
    pid: identity.pid,
    ppid: identity.ppid,
    pgid: identity.pgid,
    startTicks: identity.startTicks,
  });
}

export function parseProcStat(text, expectedPid = null) {
  const close = text.lastIndexOf(")");
  invariant(close > 1, "proc stat comm is malformed");
  const pid = Number(text.slice(0, text.indexOf(" ")));
  const fields = text
    .slice(close + 2)
    .trim()
    .split(/\s+/u);
  invariant(Number.isSafeInteger(pid) && pid > 0 && fields.length >= 20, "proc stat is malformed");
  if (expectedPid !== null) invariant(pid === expectedPid, "proc stat PID mismatch");
  const identity = {
    pid,
    ppid: Number(fields[1]),
    pgid: Number(fields[2]),
    startTicks: fields[19],
  };
  invariant(
    Number.isSafeInteger(identity.ppid) &&
      identity.ppid >= 0 &&
      Number.isSafeInteger(identity.pgid) &&
      identity.pgid > 0 &&
      /^[1-9][0-9]*$/u.test(identity.startTicks),
    "proc identity drift"
  );
  return deepFreezeExact(identity);
}

export async function readIdentity(pid, deps) {
  return parseProcStat(await deps.readFile(`/proc/${pid}/stat`, "utf8"), pid);
}

export function isProcessGoneError(error) {
  return Boolean(
    error && typeof error === "object" && (error.code === "ENOENT" || error.code === "ESRCH")
  );
}

export async function listProcessIdentities(deps) {
  const entries = await deps.readdir("/proc", { withFileTypes: true });
  const identities = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^[1-9][0-9]*$/u.test(entry.name)) continue;
    const pid = Number(entry.name);
    try {
      identities.push(await readIdentity(pid, deps));
    } catch (error) {
      if (!isProcessGoneError(error)) throw error;
      // Processes may disappear between /proc enumeration and stat read.
    }
  }
  return identities;
}

async function listenerInodesByPort(deps) {
  const result = new Map();
  const inodePorts = new Map();
  for (const table of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    const lines = (await deps.readFile(table, "utf8")).trim().split("\n").slice(1);
    for (const line of lines) {
      const columns = line.trim().split(/\s+/u);
      if (columns.length < 10 || columns[3] !== "0A") continue;
      const local = columns[1].split(":");
      const port = Number.parseInt(local.at(-1), 16);
      const inode = columns[9];
      invariant(Number.isSafeInteger(port) && port >= 0 && port <= 65_535, "listener port drift");
      invariant(/^[1-9][0-9]*$/u.test(inode), "listener inode drift");
      const priorPort = inodePorts.get(inode);
      invariant(
        priorPort === undefined || priorPort === port,
        "listener inode maps to multiple ports"
      );
      inodePorts.set(inode, port);
      if (!result.has(port)) result.set(port, new Set());
      result.get(port).add(inode);
    }
  }
  return result;
}

async function socketInodesForPid(pid, deps) {
  const result = new Set();
  let entries;
  try {
    entries = await deps.readdir(`/proc/${pid}/fd`);
  } catch {
    return result;
  }
  for (const entry of entries) {
    try {
      const target = await deps.readlink(`/proc/${pid}/fd/${entry}`);
      const match = /^socket:\[([0-9]+)\]$/u.exec(target);
      if (match) result.add(match[1]);
    } catch {
      // Descriptors may close during the bounded observation.
    }
  }
  return result;
}

export async function provePortsAbsent(deps) {
  const listeners = await listenerInodesByPort(deps);
  return PORTS.every((port) => !listeners.has(port) || listeners.get(port).size === 0);
}

export async function stableStartupProof(children, retainedRunner, deps) {
  const runner = await readIdentity(retainedRunner.pid, deps);
  invariant(sameIdentity(runner, retainedRunner), "host runner start identity drift");
  invariant(runner.pid === runner.pgid, "host runner is not its process-group leader");
  const childRows = [];
  for (const child of children) {
    const identity = await readIdentity(child.process.pid, deps);
    invariant(
      identity.ppid === runner.pid && identity.pgid === runner.pgid,
      child.kind + " process identity drift"
    );
    invariant(
      child.identity && sameIdentity(identity, child.identity),
      child.kind + " retained start identity drift"
    );
    childRows.push({ kind: child.kind, identity });
  }
  const inventory = await listProcessIdentities(deps);
  const retainedChildren = childRows.map(({ identity }) => identity);
  const ownedDescendants = collectOwnedDescendants(runner, retainedChildren, inventory);
  const ownedByPid = identityMap(ownedDescendants, "startup owned descendant");
  const childRoleByPid = new Map(childRows.map((row) => [row.identity.pid, row]));
  const exactOwnedMemberSet =
    ownedByPid.size === childRows.length &&
    childRows.every(({ identity }) => {
      const owned = ownedByPid.get(identity.pid);
      return owned && sameIdentity(owned, identity);
    });
  const listeners = await listenerInodesByPort(deps);
  const listenerOwners = new Map();
  const ownedRows = ownedDescendants.map((identity) => ({
    kind: childRoleByPid.get(identity.pid)?.kind ?? "owned-descendant",
    identity,
  }));
  for (const owner of [{ kind: "runner", identity: runner }, ...ownedRows]) {
    const sockets = await socketInodesForPid(owner.identity.pid, deps);
    for (const inode of sockets) {
      invariant(!listenerOwners.has(inode), "startup socket inode has multiple retained owners");
      listenerOwners.set(inode, owner);
    }
  }
  const ownedListeners = [];
  for (const [port, inodes] of listeners) {
    for (const inode of inodes) {
      const owner = listenerOwners.get(inode);
      if (owner) ownedListeners.push({ port, inode, owner });
    }
  }
  invariant(exactOwnedMemberSet, "host runner descendant lineage contains a missing or extra member");
  invariant(ownedListeners.length === PORTS.length, "host runner or child owns an extra listener");
  const listenerRows = [];
  const retainedListenerInodes = new Set();
  for (const [index, port] of PORTS.entries()) {
    const child = childRows[index];
    const portInodes = listeners.get(port) ?? new Set();
    invariant(
      portInodes.size === 1 &&
        [...portInodes].every((inode) => {
          const owner = listenerOwners.get(inode);
          return owner && owner.kind === child.kind && sameIdentity(owner.identity, child.identity);
        }),
      child.kind + " listener identity drift"
    );
    const [listenerInode] = portInodes;
    invariant(!retainedListenerInodes.has(listenerInode), "startup listener inode is duplicated");
    retainedListenerInodes.add(listenerInode);
    invariant(
      children[index].stdoutState().readyCount === 1,
      child.kind + " readiness marker drift"
    );
    listenerRows.push({ kind: child.kind, port, identity: child.identity });
  }
  return freezeStartupProof({
    schemaVersion: 1,
    runner,
    children: childRows,
    listeners: listenerRows,
    ports: [...PORTS],
  });
}

function validateStartupProof(proof) {
  exactOrderedDataObject(
    proof,
    ["schemaVersion", "runner", "children", "listeners", "ports"],
    "startup proof"
  );
  invariant(proof.schemaVersion === 1, "startup proof schema drift");
  validateIdentity(proof.runner, "startup runner");
  invariant(proof.runner.pid === proof.runner.pgid, "startup runner is not group leader");
  exactDenseArray(proof.children, "startup children");
  exactDenseArray(proof.listeners, "startup listeners");
  exactDenseArray(proof.ports, "startup ports");
  invariant(
    Array.isArray(proof.children) && proof.children.length === 3,
    "startup child cardinality drift"
  );
  invariant(
    Array.isArray(proof.listeners) && proof.listeners.length === 3,
    "startup listener cardinality drift"
  );
  invariant(
    Array.isArray(proof.ports) && JSON.stringify(proof.ports) === JSON.stringify(PORTS),
    "startup port order drift"
  );
  const kinds = ["backend", "admin", "site"];
  const childPids = new Set();
  for (const [index, row] of proof.children.entries()) {
    exactOrderedDataObject(row, ["kind", "identity"], "startup child");
    invariant(row.kind === kinds[index], "startup child order drift");
    validateIdentity(row.identity, "startup child identity");
    invariant(row.identity.pid !== proof.runner.pid, "startup child reuses runner PID");
    invariant(!childPids.has(row.identity.pid), "startup child PID is duplicated");
    childPids.add(row.identity.pid);
    invariant(
      row.identity.ppid === proof.runner.pid && row.identity.pgid === proof.runner.pgid,
      "startup child lineage drift"
    );
  }
  const listenerPids = new Set();
  for (const [index, row] of proof.listeners.entries()) {
    exactOrderedDataObject(row, ["kind", "port", "identity"], "startup listener");
    invariant(
      row.kind === kinds[index] && row.port === PORTS[index],
      "startup listener order drift"
    );
    validateIdentity(row.identity, "startup listener identity");
    invariant(!listenerPids.has(row.identity.pid), "startup listener PID is duplicated");
    listenerPids.add(row.identity.pid);
    invariant(
      sameIdentity(row.identity, proof.children[index].identity),
      "startup listener owner drift"
    );
  }
}

export function freezeStartupProof(proof) {
  validateStartupProof(proof);
  return deepFreezeExact(proof);
}

export function validateReadyProjection(ready) {
  exactOrderedDataObject(
    ready,
    ["schemaVersion", "runnerPid", "children", "ports"],
    "ready projection"
  );
  invariant(ready.schemaVersion === 1, "ready schema drift");
  invariant(Number.isSafeInteger(ready.runnerPid) && ready.runnerPid > 0, "ready runner PID drift");
  exactDenseArray(ready.children, "ready children");
  exactDenseArray(ready.ports, "ready ports");
  invariant(
    Array.isArray(ready.children) && ready.children.length === 3,
    "ready child cardinality drift"
  );
  const retainedPids = new Set([ready.runnerPid]);
  for (const [index, row] of ready.children.entries()) {
    exactOrderedDataObject(row, ["kind", "pid"], "ready child");
    invariant(row.kind === ["backend", "admin", "site"][index], "ready child order drift");
    invariant(Number.isSafeInteger(row.pid) && row.pid > 0, "ready child PID drift");
    invariant(!retainedPids.has(row.pid), "ready runner/child PID is duplicated");
    retainedPids.add(row.pid);
  }
  invariant(
    Array.isArray(ready.ports) && JSON.stringify(ready.ports) === JSON.stringify(PORTS),
    "ready ports drift"
  );
}

export function freezeReadyProjection(ready) {
  validateReadyProjection(ready);
  return deepFreezeExact(ready);
}

export function identityMap(identities, label) {
  invariant(Array.isArray(identities), label + " must be an array");
  const result = new Map();
  for (const identity of identities) {
    validateIdentity(identity, label + " identity");
    invariant(!result.has(identity.pid), label + " repeats a PID");
    result.set(identity.pid, identity);
  }
  return result;
}

export function collectOwnedDescendants(runnerIdentity, retainedIdentities, inventory) {
  validateIdentity(runnerIdentity, "retained runner");
  invariant(runnerIdentity.pid === runnerIdentity.pgid, "retained runner is not group leader");
  const allByPid = identityMap(inventory, "process inventory");
  const currentRunner = allByPid.get(runnerIdentity.pid);
  invariant(
    currentRunner && sameIdentity(currentRunner, runnerIdentity),
    "runner PID/start identity drift"
  );
  const retainedByPid = identityMap(retainedIdentities, "retained descendant");
  for (const retained of retainedByPid.values()) {
    const current = allByPid.get(retained.pid);
    invariant(!current || sameIdentity(current, retained), "descendant PID reuse detected");
  }
  const descendants = [];
  for (const member of allByPid.values()) {
    if (member.pid === runnerIdentity.pid) continue;
    const visited = new Set([member.pid]);
    let cursor = member;
    let owned = false;
    while (cursor.ppid > 0) {
      if (cursor.ppid === runnerIdentity.pid) {
        owned = true;
        break;
      }
      invariant(!visited.has(cursor.ppid), "descendant ancestry cycle");
      visited.add(cursor.ppid);
      const parent = allByPid.get(cursor.ppid);
      if (!parent) break;
      cursor = parent;
    }
    if (owned) descendants.push(cloneIdentity(member));
  }
  const descendantPids = new Set(descendants.map(({ pid }) => pid));
  for (const member of allByPid.values()) {
    if (
      member.pgid === runnerIdentity.pgid &&
      member.pid !== runnerIdentity.pid &&
      !descendantPids.has(member.pid)
    ) {
      invariant(false, "foreign process-group member");
    }
  }
  descendants.sort((left, right) => left.pid - right.pid);
  return deepFreezeExact(descendants);
}

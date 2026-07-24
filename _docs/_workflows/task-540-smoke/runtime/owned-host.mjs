import { spawn } from "node:child_process";
import { readFile, readdir, readlink } from "node:fs/promises";
import path from "node:path";

import { HOST_READY_TIMEOUT_MS } from "../executor/config.mjs";
import {
  deepFreezeExact,
  exactOwnKeys,
  invariant,
} from "../executor/foundation.mjs";
import { deepEqualJson } from "../executor/resource-contracts.mjs";

export function createOwnedHostRuntime({
  PROCESS_ABSENCE_STABILITY_MS,
  appendRetainedGroupMembers,
  delayMilliseconds,
  proveOwnedGroupAbsentStable,
  readFreshProcessIdentityWithRetry,
  readProcIdentity,
  readProcessGroupMembers,
  sameProcessIdentity,
  terminateRetainedProcessGroup,
}) {
  const SMOKE_PORTS = Object.freeze([3000, 5173, 5174]);

  async function portsAreAbsent() {
    const expected = new Set(
      SMOKE_PORTS.map((port) => port.toString(16).toUpperCase().padStart(4, "0"))
    );
    for (const table of ["/proc/net/tcp", "/proc/net/tcp6"]) {
      const rows = (await readFile(table, "utf8")).trim().split("\n").slice(1);
      for (const row of rows) {
        const columns = row.trim().split(/\s+/u);
        if (columns[3] === "0A" && expected.has(columns[1].split(":").at(-1))) return false;
      }
    }
    return true;
  }

  async function proveSmokePortsAbsentTwice() {
    invariant(await portsAreAbsent(), "smoke ports are not absent");
    await delayMilliseconds(PROCESS_ABSENCE_STABILITY_MS);
    invariant(await portsAreAbsent(), "smoke ports reappeared during absence proof");
    return true;
  }

  async function readListenerRowsForSmokePorts() {
    const expectedPorts = new Set(SMOKE_PORTS);
    const listeners = [];
    for (const table of ["/proc/net/tcp", "/proc/net/tcp6"]) {
      const text = await readFile(table, "utf8");
      invariant(!text.includes("\0"), "listener table contains NUL");
      for (const row of text.trim().split("\n").slice(1)) {
        const columns = row.trim().split(/\s+/u);
        if (columns.length < 10 || columns[3] !== "0A") continue;
        const portHex = columns[1]?.split(":").at(-1) ?? "";
        if (!/^[A-Fa-f0-9]{4}$/u.test(portHex)) continue;
        const port = Number.parseInt(portHex, 16);
        if (!expectedPorts.has(port)) continue;
        const inode = columns[9];
        invariant(/^[1-9][0-9]*$/u.test(inode), "listener inode is invalid");
        listeners.push(Object.freeze({ port, inode }));
      }
    }
    listeners.sort((left, right) => left.port - right.port || left.inode.localeCompare(right.inode));
    return listeners;
  }

  async function readProcessSocketInodes(pid) {
    const inodes = new Set();
    const fdRoot = `/proc/${pid}/fd`;
    for (const name of await readdir(fdRoot)) {
      if (!/^[0-9]+$/u.test(name)) continue;
      try {
        const target = await readlink(path.join(fdRoot, name));
        const match = /^socket:\[([1-9][0-9]*)\]$/u.exec(target);
        if (match) inodes.add(match[1]);
      } catch (error) {
        if (!error || !["ENOENT", "ESRCH", "EACCES"].includes(error.code)) throw error;
      }
    }
    return inodes;
  }

  async function proveExactHostListenerMapping(children) {
    invariant(
      Array.isArray(children) && children.length === 3,
      "host listener child inventory is invalid"
    );
    const expected = [
      { kind: "backend", port: 3000 },
      { kind: "admin", port: 5173 },
      { kind: "site", port: 5174 },
    ];
    const listeners = await readListenerRowsForSmokePorts();
    invariant(listeners.length === expected.length, "host listener cardinality drift");
    const socketInodesByPid = new Map();
    for (const child of children) {
      const current = await readProcIdentity(child.identity.pid);
      invariant(sameProcessIdentity(current, child.identity), "host listener owner identity drift");
      socketInodesByPid.set(child.identity.pid, await readProcessSocketInodes(child.identity.pid));
    }
    const projection = [];
    for (const item of expected) {
      const child = children.find(({ kind }) => kind === item.kind);
      invariant(child !== undefined, "host listener kind is missing");
      const candidates = listeners.filter(({ port }) => port === item.port);
      invariant(candidates.length === 1, "host port has a missing or duplicate listener");
      const owners = children.filter(({ identity }) =>
        socketInodesByPid.get(identity.pid).has(candidates[0].inode)
      );
      invariant(
        owners.length === 1 && owners[0].identity.pid === child.identity.pid,
        "host listener inode is not owned by the exact child"
      );
      projection.push(
        Object.freeze({
          kind: item.kind,
          port: item.port,
          pid: child.identity.pid,
          inode: candidates[0].inode,
        })
      );
    }
    return deepFreezeExact(projection);
  }

  async function proveExactHostListenerMappingTwice(children) {
    const first = await proveExactHostListenerMapping(children);
    await delayMilliseconds(PROCESS_ABSENCE_STABILITY_MS);
    const second = await proveExactHostListenerMapping(children);
    invariant(deepEqualJson(first, second), "host listener mapping was not stable");
    return first;
  }

  function readHostReadyLineWithTimerAuthority(child, timerAuthority) {
    return new Promise((resolve, reject) => {
      let bytes = Buffer.alloc(0);
      let settled = false;
      let timer = null;
      const settle = (callback, value) => {
        if (settled) return;
        settled = true;
        bytes = null;
        if (timer !== null) timerAuthority.clearTimer(timer);
        child.off("exit", fail);
        child.stdout.off("data", receive);
        callback(value);
      };
      const fail = () => settle(reject, new Error("host exited before ready"));
      const receive = (chunk) => {
        if (settled) return;
        bytes = Buffer.concat([bytes, Buffer.from(chunk)]);
        if (bytes.length > 64 * 1024) {
          settle(reject, new Error("host ready output exceeded bound"));
          return;
        }
        const newline = bytes.indexOf(10);
        if (newline === -1) return;
        const line = bytes.subarray(0, newline).toString("utf8");
        try {
          settle(resolve, JSON.parse(line));
        } catch {
          settle(reject, new Error("host ready output is malformed"));
        }
      };
      child.once("exit", fail);
      child.stdout.on("data", receive);
      timer = timerAuthority.setTimer(
        () => settle(reject, new Error("host ready timeout")),
        HOST_READY_TIMEOUT_MS
      );
      if (settled) timerAuthority.clearTimer(timer);
    });
  }

  function readHostReadyLine(child) {
    return readHostReadyLineWithTimerAuthority(child, {
      setTimer: (callback, timeoutMs) => setTimeout(callback, timeoutMs),
      clearTimer: (timer) => clearTimeout(timer),
    });
  }

  async function startOwnedHost(state) {
    invariant(state.host === null, "smoke host is already owned");
    await proveSmokePortsAbsentTwice();
    const child = spawn(
      process.execPath,
      [path.join(state.root, "_docs/_workflows/task-540-smoke-host.mjs"), "--serve", state.root],
      {
        cwd: state.root,
        env: state.hostEnvironment,
        shell: false,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    invariant(Number.isSafeInteger(child.pid) && child.pid > 1, "host runner PID is invalid");
    const host = {
      child,
      pid: child.pid,
      identity: null,
      retainedMembers: new Map(),
      retainedChildren: [],
      listeners: null,
      ready: null,
      terminationPromise: null,
    };
    state.host = host;
    let stderrBytes = 0;
    let spawnError = false;
    child.once("error", () => {
      spawnError = true;
    });
    child.stderr.on("data", (chunk) => {
      stderrBytes += Buffer.byteLength(chunk);
    });
    try {
      const initialIdentity = await readFreshProcessIdentityWithRetry(child.pid);
      invariant(!spawnError, "host runner spawn failed");
      invariant(
        initialIdentity.pid === initialIdentity.pgid,
        "host runner is not its process-group leader"
      );
      host.identity = Object.freeze({ ...initialIdentity });
      host.retainedMembers.set(initialIdentity.pid, host.identity);
      const ready = await readHostReadyLine(child);
      exactOwnKeys(
        ready,
        ["schemaVersion", "runnerPid", "children", "ports"],
        "host ready projection",
        { plain: true }
      );
      invariant(
        ready.schemaVersion === 1 &&
          ready.runnerPid === child.pid &&
          deepEqualJson(ready.ports, SMOKE_PORTS) &&
          Array.isArray(ready.children) &&
          ready.children.length === 3 &&
          stderrBytes === 0,
        "host ready projection drift"
      );
      const current = await readProcIdentity(child.pid);
      invariant(sameProcessIdentity(current, host.identity), "host runner ownership drift");
      const expectedKinds = ["backend", "admin", "site"];
      const retainedChildren = [];
      for (const [index, projection] of ready.children.entries()) {
        exactOwnKeys(projection, ["kind", "pid"], "host child ready projection", { plain: true });
        invariant(
          projection.kind === expectedKinds[index] &&
            Number.isSafeInteger(projection.pid) &&
            projection.pid > 1,
          "host child ready order drift"
        );
        const identity = await readProcIdentity(projection.pid);
        invariant(
          identity.ppid === child.pid && identity.pgid === child.pid,
          "host child lineage drift"
        );
        const retainedIdentity = Object.freeze({ ...identity });
        host.retainedMembers.set(identity.pid, retainedIdentity);
        retainedChildren.push(Object.freeze({ kind: projection.kind, identity: retainedIdentity }));
      }
      invariant(host.retainedMembers.size === 4, "host ready PID set drift");
      const observedMembers = await readProcessGroupMembers(child.pid);
      invariant(
        observedMembers.length === host.retainedMembers.size,
        "host process-group cardinality drift"
      );
      appendRetainedGroupMembers(
        { leader: host.identity, retainedMembers: host.retainedMembers },
        observedMembers,
        { requireLeader: true }
      );
      host.retainedChildren = retainedChildren;
      host.listeners = await proveExactHostListenerMappingTwice(retainedChildren);
      host.ready = ready;
      return ready;
    } catch (cause) {
      let cleanupFailure = null;
      try {
        await stopOwnedHost(state);
      } catch (error) {
        cleanupFailure = error;
      }
      if (cleanupFailure !== null)
        throw new AggregateError([cause, cleanupFailure], "host startup cleanup failed");
      throw cause;
    }
  }

  async function stopOwnedHost(state) {
    if (!state.host) return;
    const host = state.host;
    if (host.identity === null) {
      try {
        const identity = await readFreshProcessIdentityWithRetry(host.pid);
        invariant(
          identity.pid === identity.pgid,
          "partial host runner is not a process-group leader"
        );
        host.identity = Object.freeze({ ...identity });
        host.retainedMembers.set(identity.pid, host.identity);
      } catch (error) {
        const members = await readProcessGroupMembers(host.pid);
        invariant(
          members.length === 0 && host.child.exitCode !== null,
          "partial host identity cannot be safely recovered"
        );
      }
    }
    if (host.identity !== null) {
      const observedMembers = await readProcessGroupMembers(host.identity.pgid);
      if (observedMembers.length > 0) {
        const leaderPresent = observedMembers.some(({ pid }) => pid === host.identity.pid);
        appendRetainedGroupMembers(
          { leader: host.identity, retainedMembers: host.retainedMembers },
          observedMembers,
          { requireLeader: host.ready === null && leaderPresent }
        );
        const terminationRecord = {
          leader: host.identity,
          retainedMembers: host.retainedMembers,
          terminationPromise: host.terminationPromise,
          membershipSealed: host.ready !== null,
        };
        await terminateRetainedProcessGroup(terminationRecord);
        host.terminationPromise = terminationRecord.terminationPromise;
      } else {
        await proveOwnedGroupAbsentStable({ leader: host.identity });
      }
    }
    invariant(
      host.identity === null || (await readProcessGroupMembers(host.identity.pgid)).length === 0,
      "owned host process group remains present"
    );
    for (let attempt = 0; attempt < 30 && !(await portsAreAbsent()); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    invariant(await portsAreAbsent(), "owned host ports remain open");
    await new Promise((resolve) => setTimeout(resolve, 100));
    invariant(await portsAreAbsent(), "owned host ports reappeared after cleanup");
    invariant(
      host.identity !== null && host.ready !== null && host.listeners !== null,
      "host finalization source is incomplete"
    );
    const termination =
      host.terminationPromise === null
        ? deepFreezeExact({ termSent: false, killSent: false, absent: true })
        : await host.terminationPromise;
    const children = host.retainedChildren.map(({ kind, identity }) =>
      deepFreezeExact({
        kind,
        pid: identity.pid,
      })
    );
    const listeners = host.listeners.map(({ kind, port, pid }) =>
      deepFreezeExact({ kind, port, pid })
    );
    state.hostFinalization = deepFreezeExact({
      runnerPid: host.identity.pid,
      pgid: host.identity.pgid,
      children: deepFreezeExact(children),
      listeners: deepFreezeExact(listeners),
      ports: deepFreezeExact([...SMOKE_PORTS]),
      listenerOwnershipStableObservations: 2,
      termSent: termination.termSent,
      killSent: termination.killSent,
      processesAbsent: true,
      processAbsenceStableObservations: 2,
      portsAbsent: deepFreezeExact([...SMOKE_PORTS]),
      portAbsenceStableObservations: 2,
    });
    state.host = null;
  }

  return Object.freeze({
    SMOKE_PORTS,
    portsAreAbsent,
    readHostReadyLine,
    readHostReadyLineWithTimerAuthority,
    startOwnedHost,
    stopOwnedHost,
  });
}

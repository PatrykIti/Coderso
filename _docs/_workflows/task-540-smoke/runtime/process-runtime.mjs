import { readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { deepFreezeExact, invariant } from "../executor/foundation.mjs";
import { decodeBoundedUtf8 } from "../executor/output-parser.mjs";
import {
  assertNoSymlinkAncestors,
  readStableArtifactIdentity,
} from "../executor/private-workspace.mjs";
import { createBoundedStreamRuntime } from "./bounded-stream.mjs";
import { createOwnedHostRuntime } from "./owned-host.mjs";

export function createProcessRuntime() {
  const { PROCESS_KILL_GRACE_MS, runRetainedProcessGroup } = createBoundedStreamRuntime({
    delayMilliseconds,
    proveOwnedGroupAbsentStable,
    readFreshProcessIdentityWithRetry,
    terminateRetainedProcessGroup,
  });

  function parseProcIdentity(text, expectedPid) {
    const close = text.lastIndexOf(")");
    invariant(close > 0, "process stat is malformed");
    const pid = Number(text.slice(0, text.indexOf(" ")));
    const fields = text
      .slice(close + 2)
      .trim()
      .split(/\s+/u);
    const value = {
      pid,
      ppid: Number(fields[1]),
      pgid: Number(fields[2]),
      startTicks: fields[19],
    };
    invariant(
      pid === expectedPid &&
        Number.isSafeInteger(value.ppid) &&
        Number.isSafeInteger(value.pgid) &&
        value.pgid > 0 &&
        /^[1-9][0-9]*$/u.test(value.startTicks ?? ""),
      "process identity is invalid"
    );
    return value;
  }

  async function readProcIdentity(pid) {
    return parseProcIdentity(await readFile(`/proc/${pid}/stat`, "utf8"), pid);
  }

  function sameProcessIdentity(left, right) {
    return Boolean(
      left &&
      right &&
      left.pid === right.pid &&
      left.ppid === right.ppid &&
      left.pgid === right.pgid &&
      left.startTicks === right.startTicks
    );
  }

  async function readProcessGroupMembers(pgid) {
    const members = [];
    for (const name of await readdir("/proc")) {
      if (!/^[1-9][0-9]*$/u.test(name)) continue;
      const pid = Number(name);
      try {
        const identity = await readProcIdentity(pid);
        if (identity.pgid === pgid) members.push(identity);
      } catch (error) {
        if (!error || !["ENOENT", "ESRCH"].includes(error.code)) throw error;
      }
    }
    return members.sort((left, right) => left.pid - right.pid);
  }

  const PROCESS_TERM_GRACE_MS = 40_000;
  const PROCESS_ABSENCE_STABILITY_MS = 40;

  const {
    SMOKE_PORTS,
    portsAreAbsent,
    readHostReadyLine,
    readHostReadyLineWithTimerAuthority,
    startOwnedHost,
    stopOwnedHost,
  } = createOwnedHostRuntime({
    PROCESS_ABSENCE_STABILITY_MS,
    appendRetainedGroupMembers,
    delayMilliseconds,
    proveOwnedGroupAbsentStable,
    readFreshProcessIdentityWithRetry,
    readProcIdentity,
    readProcessGroupMembers,
    sameProcessIdentity,
    terminateRetainedProcessGroup,
  });

  function delayMilliseconds(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async function readFreshProcessIdentityWithRetry(pid) {
    let lastError = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        return await readProcIdentity(pid);
      } catch (error) {
        lastError = error;
        await delayMilliseconds(5);
      }
    }
    throw lastError ?? new Error("process identity is unavailable");
  }

  function appendRetainedGroupMembers(record, members, { requireLeader = true } = {}) {
    invariant(
      record && record.leader && record.retainedMembers instanceof Map && Array.isArray(members),
      "retained process-group record is invalid"
    );
    const leader = members.find(({ pid }) => pid === record.leader.pid) ?? null;
    if (requireLeader) {
      invariant(
        sameProcessIdentity(leader, record.leader),
        "owned process-group leader identity drift"
      );
    } else if (leader !== null) {
      invariant(
        sameProcessIdentity(leader, record.leader),
        "owned process-group leader was reused"
      );
    }
    for (const member of members) {
      invariant(
        member.pgid === record.leader.pgid,
        "owned process escaped its retained process group"
      );
      const retained = record.retainedMembers.get(member.pid);
      if (retained === undefined) {
        invariant(requireLeader, "an unretained process appeared after group termination began");
        record.retainedMembers.set(member.pid, Object.freeze({ ...member }));
      } else {
        invariant(sameProcessIdentity(retained, member), "retained process identity was reused");
      }
    }
  }

  async function waitForOwnedGroupAbsence(record, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() <= deadline) {
      const members = await readProcessGroupMembers(record.leader.pgid);
      if (members.length === 0) return true;
      appendRetainedGroupMembers(record, members, { requireLeader: false });
      await delayMilliseconds(25);
    }
    return false;
  }

  async function proveOwnedGroupAbsentStable(record) {
    invariant(
      (await readProcessGroupMembers(record.leader.pgid)).length === 0,
      "owned process group remains present"
    );
    await delayMilliseconds(PROCESS_ABSENCE_STABILITY_MS);
    invariant(
      (await readProcessGroupMembers(record.leader.pgid)).length === 0,
      "owned process group reappeared"
    );
    return true;
  }

  async function terminateRetainedProcessGroup(record) {
    if (record.terminationPromise !== null) return record.terminationPromise;
    record.terminationPromise = (async () => {
      const initialMembers = await readProcessGroupMembers(record.leader.pgid);
      if (initialMembers.length === 0) {
        await proveOwnedGroupAbsentStable(record);
        return deepFreezeExact({ termSent: false, killSent: false, absent: true });
      }
      const leaderPresent = initialMembers.some(({ pid }) => pid === record.leader.pid);
      appendRetainedGroupMembers(record, initialMembers, {
        requireLeader: leaderPresent && record.membershipSealed !== true,
      });
      try {
        process.kill(-record.leader.pgid, "SIGTERM");
      } catch (error) {
        invariant(
          error?.code === "ESRCH" &&
            (await readProcessGroupMembers(record.leader.pgid)).length === 0,
          "owned process group SIGTERM failed"
        );
      }
      if (await waitForOwnedGroupAbsence(record, PROCESS_TERM_GRACE_MS)) {
        await proveOwnedGroupAbsentStable(record);
        return deepFreezeExact({ termSent: true, killSent: false, absent: true });
      }
      const survivors = await readProcessGroupMembers(record.leader.pgid);
      appendRetainedGroupMembers(record, survivors, { requireLeader: false });
      try {
        process.kill(-record.leader.pgid, "SIGKILL");
      } catch (error) {
        invariant(
          error?.code === "ESRCH" &&
            (await readProcessGroupMembers(record.leader.pgid)).length === 0,
          "owned process group SIGKILL failed"
        );
      }
      invariant(
        await waitForOwnedGroupAbsence(record, PROCESS_KILL_GRACE_MS),
        "owned process group survived SIGKILL"
      );
      await proveOwnedGroupAbsentStable(record);
      return deepFreezeExact({ termSent: true, killSent: true, absent: true });
    })();
    return record.terminationPromise;
  }

  async function resolveValidatedBundledPlaywrightRequest(pathValue) {
    invariant(
      typeof pathValue === "string" && !pathValue.includes("\0"),
      "Playwright CLI PATH authority is invalid"
    );
    const directories = pathValue.split(path.delimiter).filter((entry) => path.isAbsolute(entry));
    invariant(
      directories.length > 0 && directories.length <= 128,
      "Playwright CLI PATH search bound drift"
    );
    let cliRealPath = null;
    for (const directory of directories) {
      try {
        cliRealPath = await realpath(path.join(directory, "playwright-cli"));
        break;
      } catch (error) {
        if (!error || !["ENOENT", "ENOTDIR", "EACCES"].includes(error.code)) throw error;
      }
    }
    invariant(
      cliRealPath !== null && path.basename(cliRealPath) === "playwright-cli.js",
      "validated Playwright CLI realpath is absent"
    );
    await assertNoSymlinkAncestors(cliRealPath);
    await readStableArtifactIdentity(cliRealPath, { expectedType: "file" });
    const cliPackageRoot = path.dirname(cliRealPath);
    const cliPackagePath = path.join(cliPackageRoot, "package.json");
    const cliPackage = JSON.parse(
      decodeBoundedUtf8(await readFile(cliPackagePath), "Playwright CLI package", 64 * 1024)
    );
    invariant(
      cliPackage.name === "@playwright/cli" &&
        cliPackage.bin?.["playwright-cli"] === path.basename(cliRealPath) &&
        typeof cliPackage.dependencies?.playwright === "string",
      "Playwright CLI package identity drift"
    );
    const playwrightRoot = await realpath(path.join(cliPackageRoot, "node_modules", "playwright"));
    invariant(
      playwrightRoot.startsWith(cliPackageRoot + path.sep) &&
        path.dirname(playwrightRoot) === path.join(cliPackageRoot, "node_modules"),
      "bundled Playwright package escaped the validated CLI package"
    );
    await assertNoSymlinkAncestors(playwrightRoot);
    const playwrightPackage = JSON.parse(
      decodeBoundedUtf8(
        await readFile(path.join(playwrightRoot, "package.json")),
        "bundled Playwright package",
        64 * 1024
      )
    );
    invariant(
      playwrightPackage.name === "playwright" &&
        playwrightPackage.version === cliPackage.dependencies.playwright &&
        playwrightPackage.exports?.["."]?.import === "./index.mjs",
      "bundled Playwright package identity drift"
    );
    const entryPath = await realpath(path.join(playwrightRoot, "index.mjs"));
    invariant(
      path.dirname(entryPath) === playwrightRoot,
      "bundled Playwright entry escaped its package"
    );
    await readStableArtifactIdentity(entryPath, { expectedType: "file" });
    const playwrightModule = await import(pathToFileURL(entryPath).href);
    invariant(
      playwrightModule.request && typeof playwrightModule.request.newContext === "function",
      "bundled Playwright API request factory is absent"
    );
    return {
      cliRealPath,
      entryPath,
      request: playwrightModule.request,
      version: playwrightPackage.version,
    };
  }

  async function runPrivateProcess({ file, args, cwd, env, stdin, timeoutMs = 90_000 }) {
    const execution = await runRetainedProcessGroup({
      file,
      args,
      cwd,
      env,
      stdinBytes: stdin,
      timeoutMs,
    });
    invariant(
      !execution.timedOut &&
        !execution.spawnError &&
        execution.completion.code === 0 &&
        !execution.stdout.exceeded &&
        !execution.stderr.exceeded &&
        execution.stderr.bytes.length === 0 &&
        execution.termination.absent === true,
      "private child failed"
    );
    return execution.stdout.bytes;
  }

  return Object.freeze({
    PROCESS_ABSENCE_STABILITY_MS,
    PROCESS_KILL_GRACE_MS,
    PROCESS_TERM_GRACE_MS,
    SMOKE_PORTS,
    appendRetainedGroupMembers,
    delayMilliseconds,
    portsAreAbsent,
    readHostReadyLine,
    readHostReadyLineWithTimerAuthority,
    readProcIdentity,
    resolveValidatedBundledPlaywrightRequest,
    runPrivateProcess,
    runRetainedProcessGroup,
    startOwnedHost,
    stopOwnedHost,
  });
}

import { spawn } from "node:child_process";

import { MAX_STREAM_BYTES } from "../executor/config.mjs";
import { invariant } from "../executor/foundation.mjs";

const PROCESS_KILL_GRACE_MS = 3_000;

export function createBoundedStreamRuntime({
  delayMilliseconds,
  proveOwnedGroupAbsentStable,
  readFreshProcessIdentityWithRetry,
  terminateRetainedProcessGroup,
}) {
  function createBoundedStream(maximumBytes = MAX_STREAM_BYTES) {
    invariant(
      Number.isSafeInteger(maximumBytes) && maximumBytes > 0,
      "bounded stream limit is invalid"
    );
    const chunks = [];
    let size = 0;
    let exceeded = false;
    return Object.freeze({
      push(chunk) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        const remaining = maximumBytes - size;
        if (remaining > 0) {
          const retained = bytes.subarray(0, remaining);
          chunks.push(retained);
          size += retained.length;
        }
        if (bytes.length > Math.max(0, remaining)) exceeded = true;
      },
      finish() {
        return Object.freeze({ bytes: Buffer.concat(chunks, size), exceeded });
      },
    });
  }

  async function runRetainedProcessGroup({
    file,
    args,
    cwd,
    env,
    stdinBytes,
    beforeStdinDispatch = null,
    timeoutMs,
    maxStdoutBytes = MAX_STREAM_BYTES,
    maxStderrBytes = MAX_STREAM_BYTES,
  }) {
    invariant(typeof file === "string" && file.length > 0, "retained process executable is invalid");
    invariant(
      Array.isArray(args) && args.every((value) => typeof value === "string"),
      "retained process argv is invalid"
    );
    invariant(
      Buffer.isBuffer(stdinBytes) || stdinBytes === null,
      "retained process stdin is invalid"
    );
    invariant(
      beforeStdinDispatch === null || typeof beforeStdinDispatch === "function",
      "retained process stdin-dispatch observer is invalid"
    );
    invariant(
      Number.isSafeInteger(timeoutMs) && timeoutMs > 0,
      "retained process timeout is invalid"
    );
    invariant(
      Number.isSafeInteger(maxStdoutBytes) &&
        maxStdoutBytes > 0 &&
        Number.isSafeInteger(maxStderrBytes) &&
        maxStderrBytes > 0,
      "retained process stream bounds are invalid"
    );
    const stdout = createBoundedStream(maxStdoutBytes);
    const stderr = createBoundedStream(maxStderrBytes);
    const child = spawn(file, args, {
      cwd,
      env,
      shell: false,
      detached: true,
      stdio: [stdinBytes === null ? "ignore" : "pipe", "pipe", "pipe"],
    });
    const spawnSettlementPromise = new Promise((resolve) => {
      child.once("spawn", () => resolve(true));
      child.once("error", () => resolve(false));
    });
    let spawnError = false;
    child.once("error", () => {
      spawnError = true;
    });
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    const completionPromise = new Promise((resolve) => {
      child.once("close", (code, signal) => resolve({ code, signal }));
    });
    const spawnSucceeded = await spawnSettlementPromise;
    invariant(spawnSucceeded && !spawnError, "retained process spawn failed");
    invariant(Number.isSafeInteger(child.pid) && child.pid > 1, "retained process PID is invalid");
    const leader = await readFreshProcessIdentityWithRetry(child.pid);
    invariant(leader.pid === leader.pgid, "retained process is not its process-group leader");
    const record = {
      child,
      leader: Object.freeze({ ...leader }),
      retainedMembers: new Map([[leader.pid, Object.freeze({ ...leader })]]),
      terminationPromise: null,
      membershipSealed: false,
    };
    if (stdinBytes !== null) {
      if (beforeStdinDispatch !== null) beforeStdinDispatch();
      child.stdin.end(stdinBytes);
    }
    let timer = null;
    const timeoutPromise = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    });
    let completion = await Promise.race([completionPromise, timeoutPromise]);
    const timedOut = completion === null;
    if (timedOut) {
      await terminateRetainedProcessGroup(record);
      completion = await Promise.race([
        completionPromise,
        delayMilliseconds(PROCESS_KILL_GRACE_MS).then(() => null),
      ]);
      invariant(completion !== null, "retained process streams did not close after termination");
    } else {
      await proveOwnedGroupAbsentStable(record);
    }
    if (timer !== null) clearTimeout(timer);
    const stdoutResult = stdout.finish();
    const stderrResult = stderr.finish();
    return Object.freeze({
      completion,
      timedOut,
      spawnError,
      stdout: stdoutResult,
      stderr: stderrResult,
      leader: record.leader,
      termination: timedOut
        ? await record.terminationPromise
        : { termSent: false, killSent: false, absent: true },
    });
  }

  return Object.freeze({
    PROCESS_KILL_GRACE_MS,
    runRetainedProcessGroup,
  });
}

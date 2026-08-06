import {
  cloneIdentity,
  collectOwnedDescendants,
  identityMap,
  isProcessGoneError,
  PORTS,
  sameIdentity,
  validateIdentity,
} from "./process-identity.mjs";
import {
  deepFreezeExact,
  exactDataObject,
  exactDenseArray,
  exactOrderedDataObject,
  invariant,
} from "./validation.mjs";

export function createStopRuntime(configuration) {
  exactOrderedDataObject(
    configuration,
    ["MAX_CHILD_STREAM_BYTES", "STOP_TIMEOUT_MS"],
    "stop-runtime configuration"
  );
  const { MAX_CHILD_STREAM_BYTES, STOP_TIMEOUT_MS } = configuration;
  invariant(
    Number.isSafeInteger(MAX_CHILD_STREAM_BYTES) && MAX_CHILD_STREAM_BYTES > 0,
    "stop-runtime stream bound drift"
  );
  invariant(
    Number.isSafeInteger(STOP_TIMEOUT_MS) &&
      STOP_TIMEOUT_MS >= 100 &&
      STOP_TIMEOUT_MS % 100 === 0,
    "stop-runtime timeout drift"
  );

  function createBoundedDrain(stream, readyMarker) {
    let byteCount = 0;
    let exceeded = false;
    let readyCount = 0;
    let tail = "";
    stream.on("data", (chunk) => {
      byteCount += Buffer.byteLength(chunk);
      if (byteCount > MAX_CHILD_STREAM_BYTES) exceeded = true;
      const text = tail + Buffer.from(chunk).toString("utf8");
      let offset = 0;
      while (true) {
        const found = text.indexOf(readyMarker, offset);
        if (found < 0) break;
        readyCount += 1;
        offset = found + readyMarker.length;
      }
      tail = text.slice(-Math.max(0, readyMarker.length - 1));
    });
    return () => ({ byteCount, exceeded, readyCount });
  }

  function validateStopStage(stage, label) {
    exactOrderedDataObject(stage, ["attempted", "targets", "survivors"], label);
    invariant(typeof stage.attempted === "boolean", label + " attempted drift");
    exactDenseArray(stage.targets, label + " targets");
    exactDenseArray(stage.survivors, label + " survivors");
    invariant(
      Array.isArray(stage.targets) && Array.isArray(stage.survivors),
      label + " identities drift"
    );
    const targetByPid = new Map();
    let priorTargetPid = 0;
    for (const identity of stage.targets) {
      validateIdentity(identity, label + " target");
      invariant(!targetByPid.has(identity.pid), label + " target PID is duplicated");
      invariant(identity.pid > priorTargetPid, label + " target order drift");
      targetByPid.set(identity.pid, identity);
      priorTargetPid = identity.pid;
    }
    let priorTargetIndex = -1;
    const survivorPids = new Set();
    for (const identity of stage.survivors) {
      validateIdentity(identity, label + " survivor");
      invariant(!survivorPids.has(identity.pid), label + " survivor PID is duplicated");
      survivorPids.add(identity.pid);
      const target = targetByPid.get(identity.pid);
      invariant(target && sameIdentity(target, identity), label + " survivor is not an exact target");
      const targetIndex = stage.targets.indexOf(target);
      invariant(targetIndex > priorTargetIndex, label + " survivor order drift");
      priorTargetIndex = targetIndex;
    }
    invariant(stage.attempted === stage.targets.length > 0, label + " attempted/target mismatch");
  }

  function validateStopProof(proof) {
    exactOrderedDataObject(
      proof,
      ["schemaVersion", "reason", "term", "kill", "descendantsAbsent", "portsAbsent"],
      "descendant-stop proof"
    );
    invariant(proof.schemaVersion === 1, "descendant-stop schema drift");
    invariant(
      ["signal", "child_exit", "startup_failure"].includes(proof.reason),
      "descendant-stop reason drift"
    );
    validateStopStage(proof.term, "TERM proof");
    validateStopStage(proof.kill, "KILL proof");
    invariant(
      proof.kill.attempted === proof.term.survivors.length > 0,
      "KILL attempted/TERM-survivor mismatch"
    );
    invariant(
      proof.kill.targets.length === proof.term.survivors.length &&
        proof.kill.targets.every((identity, index) =>
          sameIdentity(identity, proof.term.survivors[index])
        ),
      "KILL targets differ from exact TERM survivors"
    );
    invariant(typeof proof.descendantsAbsent === "boolean", "descendant absence drift");
    exactDenseArray(proof.portsAbsent, "port-absence proof");
    invariant(
      Array.isArray(proof.portsAbsent) &&
        (proof.portsAbsent.length === 0 ||
          JSON.stringify(proof.portsAbsent) === JSON.stringify(PORTS)),
      "port-absence proof drift"
    );
    const finalSurvivors = proof.kill.attempted ? proof.kill.survivors : proof.term.survivors;
    invariant(
      proof.descendantsAbsent === (finalSurvivors.length === 0),
      "descendant survivor/absence mismatch"
    );
  }

  function freezeStopProof(proof) {
    validateStopProof(proof);
    return deepFreezeExact(proof);
  }

  function mergeRetainedIdentities(retained, observed) {
    const merged = new Map();
    for (const identity of [...retained, ...observed]) {
      const prior = merged.get(identity.pid);
      invariant(!prior || sameIdentity(prior, identity), "retained descendant identity changed");
      merged.set(identity.pid, cloneIdentity(identity));
    }
    return [...merged.values()].sort((left, right) => left.pid - right.pid);
  }

  function createDescendantStopController({ runnerIdentity, retainedIdentities, dependencies }) {
    validateIdentity(runnerIdentity, "stop-controller runner");
    invariant(typeof retainedIdentities === "function", "retained identity accessor drift");
    exactDataObject(
      dependencies,
      ["listIdentities", "readIdentity", "signalPid", "portsAbsent", "delay"],
      "stop dependencies"
    );
    let stopPromise = null;

    const inventory = async (retained) =>
      collectOwnedDescendants(runnerIdentity, retained, await dependencies.listIdentities());

    const signalOne = async (identity, signal) => {
      let current;
      try {
        current = await dependencies.readIdentity(identity.pid);
      } catch (error) {
        if (isProcessGoneError(error)) return false;
        throw error;
      }
      invariant(sameIdentity(current, identity), "refusing to signal a reused process identity");
      invariant(current.pid !== runnerIdentity.pid, "refusing to signal the host runner");
      invariant(current.pgid === identity.pgid, "refusing to signal after PGID drift");
      await dependencies.signalPid(identity.pid, signal);
      return true;
    };

    const boundedStage = async (signal, retained, initialTargets) => {
      let owned = mergeRetainedIdentities(retained, initialTargets);
      const signalled = new Map();
      const fixedKillTargets =
        signal === "SIGKILL" ? identityMap(initialTargets, "KILL target") : null;
      for (let attempt = 0; attempt <= STOP_TIMEOUT_MS / 100; attempt += 1) {
        const observed = await inventory(owned);
        owned = mergeRetainedIdentities(owned, observed);
        for (const identity of observed) {
          if (fixedKillTargets !== null) {
            const authorized = fixedKillTargets.get(identity.pid);
            invariant(
              authorized && sameIdentity(authorized, identity),
              "refusing to KILL a descendant outside the exact TERM-survivor set"
            );
          }
          if (!signalled.has(identity.pid)) {
            if (await signalOne(identity, signal)) signalled.set(identity.pid, identity);
          }
        }
        if (observed.length === 0) {
          return {
            targets:
              fixedKillTargets === null
                ? [...signalled.values()].sort((left, right) => left.pid - right.pid)
                : initialTargets.map(cloneIdentity),
            survivors: [],
            retained: owned,
          };
        }
        if (attempt < STOP_TIMEOUT_MS / 100) await dependencies.delay(100);
      }
      const survivors = await inventory(owned);
      return {
        targets:
          fixedKillTargets === null
            ? [...signalled.values()].sort((left, right) => left.pid - right.pid)
            : initialTargets.map(cloneIdentity),
        survivors,
        retained: owned,
      };
    };

    const run = async (reason) => {
      invariant(["signal", "child_exit", "startup_failure"].includes(reason), "stop reason drift");
      let retained = mergeRetainedIdentities([], retainedIdentities());
      const initial = await inventory(retained);
      retained = mergeRetainedIdentities(retained, initial);
      const term = await boundedStage("SIGTERM", retained, initial);
      retained = term.retained;
      const kill = await boundedStage("SIGKILL", retained, term.survivors);
      let portsAbsent = false;
      for (let attempt = 0; attempt < 25; attempt += 1) {
        if (await dependencies.portsAbsent()) {
          await dependencies.delay(100);
          if (await dependencies.portsAbsent()) {
            portsAbsent = true;
            break;
          }
        }
        await dependencies.delay(100);
      }
      return freezeStopProof({
        schemaVersion: 1,
        reason,
        term: {
          attempted: term.targets.length > 0,
          targets: term.targets,
          survivors: term.survivors,
        },
        kill: {
          attempted: kill.targets.length > 0,
          targets: kill.targets,
          survivors: kill.survivors,
        },
        descendantsAbsent: kill.survivors.length === 0,
        portsAbsent: portsAbsent ? [...PORTS] : [],
      });
    };

    return deepFreezeExact({
      stop(reason) {
        if (stopPromise === null) stopPromise = run(reason);
        return stopPromise;
      },
    });
  }

  return Object.freeze({
    createBoundedDrain,
    createDescendantStopController,
    freezeStopProof,
  });
}

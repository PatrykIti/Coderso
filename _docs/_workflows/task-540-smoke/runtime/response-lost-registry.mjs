import path from "node:path";

import {
  MAX_NATURAL_KEY_CANDIDATES,
} from "../executor/config.mjs";
import {
  PROVEN_RESOURCE_ACTIONS,
} from "../executor/action-resources.mjs";
import {
  RESOURCE_DELTA_KEYS,
  deepEqualJson,
} from "../executor/resource-contracts.mjs";
import {
  emptyResourceDelta,
} from "../executor/resource-ledger.mjs";
import {
  assertRecursivelyFrozen,
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "../executor/foundation.mjs";

const PRIVATE_PENDING_ATTEMPTS = new WeakMap();

export function createResponseLostRegistry({
  assertPlainJsonValue,
  runBunBridgeOperation,
}) {
  invariant(
    typeof assertPlainJsonValue === "function",
    "response-lost plain JSON validator is absent"
  );
  invariant(
    typeof runBunBridgeOperation === "function",
    "response-lost Bun bridge authority is absent"
  );

  const RESPONSE_LOST_CREATE_DESCRIPTORS = deepFreezeExact(
    Object.fromEntries(
      Object.values(PROVEN_RESOURCE_ACTIONS).map((descriptor) => [descriptor.origin, descriptor])
    )
  );
  const RESPONSE_LOST_CREATE_ACTION_IDS = deepFreezeExact(
    Object.keys(RESPONSE_LOST_CREATE_DESCRIPTORS).sort()
  );
  const PENDING_ATTEMPT_KEYS = Object.freeze([
    "pendingAttemptKey",
    "actionId",
    "actionOrdinal",
    "kind",
    "semantic",
    "naturalKey",
    "baseline",
    "authoredRequestSha256",
    "failureObservationSha256",
    "intendedParentBlockerKeys",
  ]);
  const FAILURE_DISCOVERY_RESULT_KEYS = Object.freeze([
    "pendingAttemptKey",
    "safeDelta",
    "failure",
    "intendedParentBlockerKeys",
  ]);

  class PendingFailureAttemptRegistry {
    constructor() {
      PRIVATE_PENDING_ATTEMPTS.set(this, {
        active: new Map(),
        consumed: false,
      });
    }

    arm(action, intendedParentBlockerKeys, intent) {
      const descriptor = RESPONSE_LOST_CREATE_DESCRIPTORS[action.id];
      if (descriptor === undefined) return null;
      const state = PRIVATE_PENDING_ATTEMPTS.get(this);
      invariant(
        !state.consumed && !state.active.has(action.id),
        "pending create attempt assignment drift"
      );
      invariant(
        Array.isArray(intendedParentBlockerKeys) &&
          new Set(intendedParentBlockerKeys).size === intendedParentBlockerKeys.length &&
          intendedParentBlockerKeys.every((key) => typeof key === "string" && key.length > 0),
        "pending create intended-parent set is invalid"
      );
      exactOwnKeys(
        intent,
        ["naturalKey", "baseline", "authoredRequestSha256"],
        "pending create intent",
        { plain: true }
      );
      assertRecursivelyFrozen(intent);
      assertPlainJsonValue(intent.naturalKey, "pending create natural key");
      assertPlainJsonValue(intent.baseline, "pending create baseline");
      invariant(
        typeof intent.authoredRequestSha256 === "string" &&
          /^[a-f0-9]{64}$/u.test(intent.authoredRequestSha256),
        "pending create authored request digest is invalid"
      );
      const attempt = deepFreezeExact({
        pendingAttemptKey:
          "pending:" + hashBytes(Buffer.from(action.id + "\0" + action.ordinal)).slice(0, 24),
        actionId: action.id,
        actionOrdinal: action.ordinal,
        kind: descriptor.kind,
        semantic: descriptor.semantic,
        naturalKey: intent.naturalKey,
        baseline: intent.baseline,
        authoredRequestSha256: intent.authoredRequestSha256,
        failureObservationSha256: null,
        intendedParentBlockerKeys: deepFreezeExact([...intendedParentBlockerKeys].sort()),
      });
      exactOwnKeys(attempt, PENDING_ATTEMPT_KEYS, "pending create attempt", { plain: true });
      state.active.set(action.id, attempt);
      return attempt;
    }

    settle(actionId) {
      const state = PRIVATE_PENDING_ATTEMPTS.get(this);
      invariant(
        !state.consumed && state.active.delete(actionId),
        "pending create attempt settlement drift"
      );
    }

    retainPrimaryFailureObservation(cause) {
      const state = PRIVATE_PENDING_ATTEMPTS.get(this);
      invariant(!state.consumed, "pending create failure observation arrived after consumption");
      const observation = deepFreezeExact({
        name:
          typeof cause?.name === "string" && cause.name.length > 0 && cause.name.length <= 128
            ? cause.name
            : "Error",
        code:
          typeof cause?.code === "string" && cause.code.length > 0 && cause.code.length <= 128
            ? cause.code
            : null,
      });
      const digest = hashBytes(Buffer.from(canonicalJson(observation)));
      for (const [actionId, attempt] of state.active) {
        if (attempt.failureObservationSha256 !== null) continue;
        state.active.set(actionId, deepFreezeExact({ ...attempt, failureObservationSha256: digest }));
      }
    }

    takeFrozenOnce() {
      const state = PRIVATE_PENDING_ATTEMPTS.get(this);
      invariant(!state.consumed, "pending create attempts were consumed twice");
      state.consumed = true;
      invariant(
        [...state.active.values()].every(
          ({ failureObservationSha256 }) =>
            typeof failureObservationSha256 === "string" &&
            /^[a-f0-9]{64}$/u.test(failureObservationSha256)
        ),
        "pending create lacks its real failure observation"
      );
      return deepFreezeExact(
        [...state.active.values()].sort((left, right) => left.actionOrdinal - right.actionOrdinal)
      );
    }
  }

  function validateFailureDiscoveryAttemptResult(result, attempt) {
    exactOwnKeys(result, FAILURE_DISCOVERY_RESULT_KEYS, "failure discovery attempt result", {
      plain: true,
    });
    invariant(
      result.pendingAttemptKey === attempt.pendingAttemptKey,
      "failure discovery attempt identity drift"
    );
    exactOwnKeys(result.safeDelta, RESOURCE_DELTA_KEYS, "failure discovery safe delta", {
      plain: true,
    });
    invariant(
      result.failure === null ||
        (Object.getPrototypeOf(result.failure) === Object.prototype &&
          typeof result.failure.code === "string" &&
          result.failure.code.length > 0),
      "failure discovery failure shape drift"
    );
    invariant(
      Array.isArray(result.intendedParentBlockerKeys) &&
        deepEqualJson(
          result.intendedParentBlockerKeys,
          result.failure === null ? [] : attempt.intendedParentBlockerKeys
        ),
      "failure discovery blocker set drift"
    );
    assertRecursivelyFrozen(result);
  }

  async function discoverResponseLostPersistentCreatesNeverThrowPerAttempt(attempts, adapter) {
    invariant(
      Array.isArray(attempts) && Object.isFrozen(attempts),
      "pending attempt batch is mutable"
    );
    invariant(typeof adapter === "function", "failure discovery adapter is absent");
    const attemptResults = [];
    for (const attempt of attempts) {
      let result;
      try {
        result = await adapter(attempt);
      } catch {
        result = deepFreezeExact({
          pendingAttemptKey: attempt.pendingAttemptKey,
          safeDelta: emptyResourceDelta(),
          failure: deepFreezeExact({ code: "failure_discovery_ambiguous" }),
          intendedParentBlockerKeys: attempt.intendedParentBlockerKeys,
        });
      }
      validateFailureDiscoveryAttemptResult(result, attempt);
      attemptResults.push(result);
    }
    return deepFreezeExact({ attemptResults: deepFreezeExact(attemptResults) });
  }

  function intendedParentBlockerKeysForCreate(state, action) {
    const descriptor = RESPONSE_LOST_CREATE_DESCRIPTORS[action.id];
    if (descriptor === undefined) return [];
    const semantics = [];
    if (descriptor.parent) semantics.push(descriptor.parent);
    if (descriptor.kind === "presentation-override")
      semantics.push("screen", "editable-entry", "media");
    if (descriptor.kind === "setting-user-a") semantics.push("user-a");
    if (descriptor.kind === "setting-user-b") semantics.push("user-b");
    return [
      ...new Set(semantics.map((semantic) => state.resourceKeys.get(semantic)).filter(Boolean)),
    ].sort();
  }

  const RESPONSE_LOST_CONTENT_TYPE_ACTIONS = deepFreezeExact({
    "set-016-editable-type-create": "editable",
    "set-018-related-a-type-create": "relatedA",
    "set-020-related-b-type-create": "relatedB",
    "set-021a-related-failure-type-create": "relatedFailure",
  });
  const RESPONSE_LOST_ENTRY_ACTIONS = deepFreezeExact({
    "set-022-related-a1-create": ["a1", "relatedA"],
    "set-024-related-a2-create": ["a2", "relatedA"],
    "set-026-related-b1-create": ["b1", "relatedB"],
    "set-028-related-b2-create": ["b2", "relatedB"],
    "set-029a-related-failure1-create": ["failure1", "relatedFailure"],
  });

  const RESPONSE_LOST_QUERY_OPERATION_BINDINGS = deepFreezeExact({
    "set-012-user-a-create": {
      baselineOperationId: "response-lost/preflight/user-a",
      discoveryOperationId: "response-lost/discovery/user-a",
      inputKeys: ["email"],
    },
    "set-014-user-b-create": {
      baselineOperationId: "response-lost/preflight/user-b",
      discoveryOperationId: "response-lost/discovery/user-b",
      inputKeys: ["email"],
    },
    "set-016-editable-type-create": {
      baselineOperationId: "response-lost/preflight/content-type-editable",
      discoveryOperationId: "response-lost/discovery/content-type-editable",
      inputKeys: ["slug"],
    },
    "set-018-related-a-type-create": {
      baselineOperationId: "response-lost/preflight/content-type-related-a",
      discoveryOperationId: "response-lost/discovery/content-type-related-a",
      inputKeys: ["slug"],
    },
    "set-020-related-b-type-create": {
      baselineOperationId: "response-lost/preflight/content-type-related-b",
      discoveryOperationId: "response-lost/discovery/content-type-related-b",
      inputKeys: ["slug"],
    },
    "set-021a-related-failure-type-create": {
      baselineOperationId: "response-lost/preflight/content-type-related-failure",
      discoveryOperationId: "response-lost/discovery/content-type-related-failure",
      inputKeys: ["slug"],
    },
    "set-022-related-a1-create": {
      baselineOperationId: "response-lost/preflight/entry-related-a1",
      discoveryOperationId: "response-lost/discovery/entry-related-a1",
      inputKeys: ["slug", "typeId"],
    },
    "set-024-related-a2-create": {
      baselineOperationId: "response-lost/preflight/entry-related-a2",
      discoveryOperationId: "response-lost/discovery/entry-related-a2",
      inputKeys: ["slug", "typeId"],
    },
    "set-026-related-b1-create": {
      baselineOperationId: "response-lost/preflight/entry-related-b1",
      discoveryOperationId: "response-lost/discovery/entry-related-b1",
      inputKeys: ["slug", "typeId"],
    },
    "set-028-related-b2-create": {
      baselineOperationId: "response-lost/preflight/entry-related-b2",
      discoveryOperationId: "response-lost/discovery/entry-related-b2",
      inputKeys: ["slug", "typeId"],
    },
    "set-029a-related-failure1-create": {
      baselineOperationId: "response-lost/preflight/entry-related-failure1",
      discoveryOperationId: "response-lost/discovery/entry-related-failure1",
      inputKeys: ["slug", "typeId"],
    },
    "set-030-media-upload": {
      baselineOperationId: "response-lost/preflight/media",
      discoveryOperationId: "response-lost/discovery/media",
      inputKeys: ["mimeType", "originalName", "size"],
    },
    "set-033-entry-create": {
      baselineOperationId: "response-lost/preflight/entry-editable",
      discoveryOperationId: "response-lost/discovery/entry-editable",
      inputKeys: ["slug", "typeId"],
    },
    "set-035-screen-create": {
      baselineOperationId: "response-lost/preflight/screen-main",
      discoveryOperationId: "response-lost/discovery/screen-main",
      inputKeys: ["contentTypeId", "name"],
    },
    "set-037-retry-screen-create": {
      baselineOperationId: "response-lost/preflight/screen-retry",
      discoveryOperationId: "response-lost/discovery/screen-retry",
      inputKeys: ["contentTypeId", "name"],
    },
    "set-039-override-create": {
      baselineOperationId: "response-lost/preflight/override",
      discoveryOperationId: "response-lost/discovery/override",
      inputKeys: ["blockId", "entryId", "propPath", "screenId"],
    },
    "set-041-preference-a": {
      baselineOperationId: "response-lost/preflight/setting-user-a",
      discoveryOperationId: "response-lost/discovery/setting-user-a",
      inputKeys: ["userId"],
    },
    "set-043-preference-b": {
      baselineOperationId: "response-lost/preflight/setting-user-b",
      discoveryOperationId: "response-lost/discovery/setting-user-b",
      inputKeys: ["userId"],
    },
  });

  function validateBoundedNaturalCandidateResult(output, label) {
    exactOwnKeys(output, ["candidates", "overflow"], label, { plain: true });
    invariant(
      Array.isArray(output.candidates) &&
        output.candidates.length <= MAX_NATURAL_KEY_CANDIDATES &&
        typeof output.overflow === "boolean",
      label + " bounded result shape drift"
    );
    invariant(output.overflow === false, label + " overflowed its DB-side limit");
    output.candidates.forEach((candidate) => assertPlainJsonValue(candidate, label + " candidate"));
    return deepFreezeExact({ candidates: deepFreezeExact(output.candidates), overflow: false });
  }

  function responseLostStorageRoot(state) {
    invariant(
      typeof state.storageRootBaseline === "string" && state.storageRootBaseline.length > 0,
      "storage root baseline is absent"
    );
    invariant(
      path.isAbsolute(state.storageRootBaseline) &&
        path.resolve(state.storageRootBaseline) === state.storageRootBaseline,
      "storage root baseline is not a canonical absolute path"
    );
    const absolute = state.storageRootBaseline;
    invariant(
      absolute !== state.root && absolute !== path.parse(absolute).root,
      "storage root resolution drift"
    );
    return absolute;
  }

  async function queryResponseLostNaturalCandidates(state, actionId, naturalKey) {
    const binding = RESPONSE_LOST_QUERY_OPERATION_BINDINGS[actionId];
    invariant(binding !== undefined, "response-lost natural query operation is not registered");
    exactOwnKeys(naturalKey, binding.inputKeys, "response-lost natural key", { plain: true });
    const output = await runBunBridgeOperation(state, binding.discoveryOperationId, naturalKey);
    return validateBoundedNaturalCandidateResult(output, "response-lost natural query");
  }

  return Object.freeze({
    PendingFailureAttemptRegistry,
    RESPONSE_LOST_CONTENT_TYPE_ACTIONS,
    RESPONSE_LOST_CREATE_ACTION_IDS,
    RESPONSE_LOST_CREATE_DESCRIPTORS,
    RESPONSE_LOST_ENTRY_ACTIONS,
    RESPONSE_LOST_QUERY_OPERATION_BINDINGS,
    discoverResponseLostPersistentCreatesNeverThrowPerAttempt,
    intendedParentBlockerKeysForCreate,
    queryResponseLostNaturalCandidates,
    responseLostStorageRoot,
    validateBoundedNaturalCandidateResult,
  });
}

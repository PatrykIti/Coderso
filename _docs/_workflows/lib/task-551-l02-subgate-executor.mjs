// TASK-551-11 private injected L02 subgate executor.
// It is deliberately pure: no host, filesystem, database, or L02 import.

const INVALID = "task551_l02_subgate_executor_invalid";
const PROJECTION_KEYS = Object.freeze(["commandIds", "subgates"]);
const CALLBACK_KEYS = Object.freeze([
  "runClassifierPrefixCommand",
  "runClassifierMaterialization",
  "runReviewedPairTransition",
]);
const CLASSIFIER_AFTER = Object.freeze([
  "projection-static-test",
  "digest-static-test",
  "fixture-target-static-test",
  "reviewed-pair-persistence-static-test",
  "runner-lifecycle-static-test",
]);
const REVIEW_AFTER = Object.freeze([
  ...CLASSIFIER_AFTER,
  "core-lint-types",
  "core-lint",
  "performance-gate",
  "isolated-projection-static-small",
  "isolated-digest-static-small",
  "isolated-projection-static-large",
  "isolated-digest-static-large",
  "freeze-small",
  "freeze-large",
]);

function ownFrozenRecord(value, keys) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    !Object.isFrozen(value)
  )
    throw new Error(INVALID);
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some((key, index) => key !== keys[index]))
    throw new Error(INVALID);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      throw new Error(INVALID);
  }
  return value;
}
function frozenStrings(value) {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    !Object.isFrozen(value) ||
    value.some((item) => typeof item !== "string")
  )
    throw new Error(INVALID);
  return value;
}
function exact(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((item, index) => item === expected[index])
  );
}
function requireSubgate(value, expected) {
  ownFrozenRecord(value, [
    "id",
    "kind",
    "ordinal",
    "ownerTaskId",
    "occurrenceId",
    "afterCommandIds",
    "beforeCommandId",
    "barrier",
  ]);
  if (
    value.id !== expected.id ||
    value.kind !== expected.kind ||
    value.ordinal !== expected.ordinal ||
    value.ownerTaskId !== "TASK-551-11" ||
    value.occurrenceId !== "single" ||
    value.beforeCommandId !== expected.before ||
    !exact(frozenStrings(value.afterCommandIds), expected.after)
  )
    throw new Error(INVALID);
  return value;
}
function requireProjection(value) {
  ownFrozenRecord(value, PROJECTION_KEYS);
  const commandIds = frozenStrings(value.commandIds);
  if (
    !Array.isArray(value.subgates) ||
    !Object.isFrozen(value.subgates) ||
    value.subgates.length !== 2
  )
    throw new Error(INVALID);
  const classifier = requireSubgate(value.subgates[0], {
    id: "l11-classifier-materialization",
    kind: "classifier-materialization",
    ordinal: 1,
    after: CLASSIFIER_AFTER,
    before: "core-lint-types",
  });
  const review = requireSubgate(value.subgates[1], {
    id: "l11-reviewed-pair-transition",
    kind: "reviewed-pair-transition",
    ordinal: 2,
    after: REVIEW_AFTER,
    before: "check-small",
  });
  if (
    !exact(commandIds.slice(0, CLASSIFIER_AFTER.length), CLASSIFIER_AFTER) ||
    commandIds[CLASSIFIER_AFTER.length] !== "core-lint-types" ||
    !exact(commandIds.slice(0, REVIEW_AFTER.length), REVIEW_AFTER) ||
    commandIds[REVIEW_AFTER.length] !== "check-small"
  )
    throw new Error(INVALID);
  return Object.freeze({ commandIds, classifier, review });
}
function requireCallbacks(value) {
  ownFrozenRecord(value, CALLBACK_KEYS);
  for (const key of CALLBACK_KEYS)
    if (typeof value[key] !== "function" || !Object.isFrozen(value[key])) throw new Error(INVALID);
  return value;
}

/**
 * Runs only injected callbacks at the two immutable boundaries. A failed
 * callback leaves the cursor unchanged, so the outer workflow can dispatch no
 * later command (especially no check) after a reviewed-transition failure.
 */
export function createTask551L02SubgateExecutorV2(projection, callbacks) {
  const checked = requireProjection(projection);
  const injected = requireCallbacks(callbacks);
  let completed = [];
  let classifierComplete = false;
  let reviewComplete = false;
  const invoke = async (callback, subgate) => {
    try {
      return await callback(Object.freeze({ ...subgate }));
    } catch {
      return false;
    }
  };
  const api = {
    async runClassifierPrefix() {
      if (classifierComplete || completed.length !== 0) throw new Error(INVALID);
      for (let index = 0; index < CLASSIFIER_AFTER.length;) {
        let outcome;
        try {
          outcome = await injected.runClassifierPrefixCommand(CLASSIFIER_AFTER[index]);
        } catch {
          return false;
        }
        if (outcome === "restart") {
          completed = [];
          index = 0;
          continue;
        }
        if (outcome !== true) return false;
        completed = [...completed, CLASSIFIER_AFTER[index]];
        index += 1;
      }
      return true;
    },
    async runClassifierMaterialization() {
      if (classifierComplete || !exact(completed, CLASSIFIER_AFTER)) throw new Error(INVALID);
      if ((await invoke(injected.runClassifierMaterialization, checked.classifier)) !== true)
        return false;
      classifierComplete = true;
      return true;
    },
    async beforeCommand(commandId) {
      if (typeof commandId !== "string" || checked.commandIds[completed.length] !== commandId)
        throw new Error(INVALID);
      if (commandId === checked.classifier.beforeCommandId && !classifierComplete) return false;
      if (commandId === checked.review.beforeCommandId && !reviewComplete) {
        if (!exact(completed, REVIEW_AFTER)) throw new Error(INVALID);
        if ((await invoke(injected.runReviewedPairTransition, checked.review)) !== true)
          return false;
        reviewComplete = true;
      }
      return true;
    },
    completeCommand(commandId) {
      if (typeof commandId !== "string" || checked.commandIds[completed.length] !== commandId)
        throw new Error(INVALID);
      completed = [...completed, commandId];
      return true;
    },
    requireFinalLeafClosure() {
      if (!classifierComplete || !reviewComplete || !exact(completed, checked.commandIds))
        throw new Error(INVALID);
      return true;
    },
  };
  return Object.freeze(api);
}

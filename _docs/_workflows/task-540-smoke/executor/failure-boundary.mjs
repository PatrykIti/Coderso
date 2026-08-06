import {
  AUTH_SETTLEMENT_ACTION_IDS,
  AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES,
  AUTH_SETTLEMENT_DIAGNOSTIC_FAILURE_CLASSES,
  AUTH_SETTLEMENT_FAILURE_FRAMES,
  DIRTY_NAVIGATION_DIAGNOSTIC_FAILURE_CLASSES,
  DIRTY_NAVIGATION_EXECUTOR_FAILURE_CLASSES,
  DIRTY_NAVIGATION_FAILURE_FRAMES,
  DIRTY_NAVIGATION_REQUEST_ACTION_IDS,
  MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES,
  SAFE_IDENTIFIER_PATTERN,
  TONE_MENU_OPEN_ACTION_IDS,
  TONE_MUTED_ACTION_IDS,
  TONE_OPEN_BROWSER_FAILURE_CLASSES,
  TONE_OPEN_FAILURE_FRAMES,
  TONE_SELECT_BROWSER_FAILURE_CLASSES,
  TONE_SELECT_FAILURE_FRAMES,
  dirtyNavigationBrowserFailureClassesForAction,
  dirtyNavigationDiagnosticFailureClassAllowedForAction,
} from "./config.mjs";
import {
  deepEqualJson,
} from "./resource-contracts.mjs";
import {
  assertRecursivelyFrozen,
  canonicalJson,
  invariant,
} from "./foundation.mjs";

const PRIVATE_FAILURE_ACTION_TRACKERS = new WeakMap();
const PRIVATE_AUTH_SETTLEMENT_FAILURE_CLASSES = new WeakMap();
const PRIVATE_AUTH_SETTLEMENT_FAILURE_DETAILS = new WeakMap();
const PRIVATE_TONE_OPEN_FAILURE_CLASSES = new WeakMap();
const PRIVATE_TONE_OPEN_FAILURE_DETAILS = new WeakMap();
const PRIVATE_TONE_SELECT_FAILURE_CLASSES = new WeakMap();
const PRIVATE_DIRTY_NAVIGATION_FAILURE_CLASSES = new WeakMap();
const PRIVATE_DIRTY_NAVIGATION_FAILURE_DETAILS = new WeakMap();

let PRE_AUTHORITY_FAILURE_COUNT = 0;




function retainOrDiscardPreAuthorityCauseNeverThrow() {
  try {
    PRE_AUTHORITY_FAILURE_COUNT += 1;
  } catch {
    // The null-authority path has no acquired resource and never throws.
  }
}

export function createFailureBoundaryRuntime({
  decodeExactNativeUtf8,
  validateCapabilityResult,
}) {
  function createPrivateAuthSettlementFailure(failureClass, privateDetails = null) {
    invariant(
      AUTH_SETTLEMENT_DIAGNOSTIC_FAILURE_CLASSES.includes(failureClass),
      "auth settlement failure class is invalid"
    );
    const failure = new Error("TASK-540 auth settlement failed");
    PRIVATE_AUTH_SETTLEMENT_FAILURE_CLASSES.set(failure, failureClass);
    if (privateDetails !== null) {
      PRIVATE_AUTH_SETTLEMENT_FAILURE_DETAILS.set(failure, privateDetails);
    }
    return failure;
  }

  function failPrivateAuthSettlementStage(action, failureClass, privateDetails, fallbackMessage) {
    invariant(
      typeof fallbackMessage === "string" && fallbackMessage.length > 0,
      "auth settlement fallback message is invalid"
    );
    if (AUTH_SETTLEMENT_ACTION_IDS.includes(action?.id)) {
      throw createPrivateAuthSettlementFailure(failureClass, privateDetails);
    }
    if (
      DIRTY_NAVIGATION_REQUEST_ACTION_IDS.includes(action?.id) &&
      DIRTY_NAVIGATION_EXECUTOR_FAILURE_CLASSES.includes(failureClass)
    ) {
      throw createPrivateDirtyNavigationFailure(failureClass, privateDetails);
    }
    throw new Error(fallbackMessage);
  }

  function classifyPrivateAuthSettlementFailureFrame(actionId, bytes) {
    if (
      !AUTH_SETTLEMENT_ACTION_IDS.includes(actionId) ||
      !Buffer.isBuffer(bytes) ||
      bytes.length > MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES
    ) {
      return null;
    }
    for (const failureClass of AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES) {
      if (bytes.equals(Buffer.from(AUTH_SETTLEMENT_FAILURE_FRAMES[failureClass], "utf8"))) {
        return failureClass;
      }
    }
    return null;
  }

  function createPrivateToneOpenFailure(failureClass, privateDetails = null) {
    invariant(
      TONE_OPEN_BROWSER_FAILURE_CLASSES.includes(failureClass),
      "tone-open failure class is invalid"
    );
    const failure = new Error("TASK-540 tone-open settlement failed");
    PRIVATE_TONE_OPEN_FAILURE_CLASSES.set(failure, failureClass);
    if (privateDetails !== null) {
      PRIVATE_TONE_OPEN_FAILURE_DETAILS.set(failure, privateDetails);
    }
    return failure;
  }

  function classifyPrivateToneOpenFailureFrame(actionId, bytes) {
    if (
      !TONE_MENU_OPEN_ACTION_IDS.includes(actionId) ||
      !Buffer.isBuffer(bytes) ||
      bytes.length > MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES
    ) {
      return null;
    }
    for (const failureClass of TONE_OPEN_BROWSER_FAILURE_CLASSES) {
      if (bytes.equals(Buffer.from(TONE_OPEN_FAILURE_FRAMES[failureClass], "utf8"))) {
        return failureClass;
      }
    }
    return null;
  }

  function createPrivateToneSelectFailure(failureClass) {
    invariant(
      TONE_SELECT_BROWSER_FAILURE_CLASSES.includes(failureClass),
      "tone-select failure class is invalid"
    );
    const failure = new Error("TASK-540 tone-select settlement failed");
    PRIVATE_TONE_SELECT_FAILURE_CLASSES.set(failure, failureClass);
    return failure;
  }

  function classifyPrivateToneSelectFailureFrame(actionId, bytes) {
    if (
      !TONE_MUTED_ACTION_IDS.includes(actionId) ||
      !Buffer.isBuffer(bytes) ||
      bytes.length > MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES
    ) {
      return null;
    }
    for (const failureClass of TONE_SELECT_BROWSER_FAILURE_CLASSES) {
      if (bytes.equals(Buffer.from(TONE_SELECT_FAILURE_FRAMES[failureClass], "utf8"))) {
        return failureClass;
      }
    }
    return null;
  }

  function createPrivateDirtyNavigationFailure(failureClass, privateDetails = null) {
    invariant(
      DIRTY_NAVIGATION_DIAGNOSTIC_FAILURE_CLASSES.includes(failureClass),
      "dirty-navigation failure class is invalid"
    );
    const failure = new Error("TASK-540 dirty-navigation settlement failed");
    PRIVATE_DIRTY_NAVIGATION_FAILURE_CLASSES.set(failure, failureClass);
    if (privateDetails !== null) {
      PRIVATE_DIRTY_NAVIGATION_FAILURE_DETAILS.set(failure, privateDetails);
    }
    return failure;
  }

  function classifyPrivateDirtyNavigationFailureFrame(actionId, bytes) {
    if (
      !DIRTY_NAVIGATION_REQUEST_ACTION_IDS.includes(actionId) ||
      !Buffer.isBuffer(bytes) ||
      bytes.length > MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES
    ) {
      return null;
    }
    for (const failureClass of dirtyNavigationBrowserFailureClassesForAction(actionId)) {
      if (bytes.equals(Buffer.from(DIRTY_NAVIGATION_FAILURE_FRAMES[failureClass], "utf8"))) {
        return failureClass;
      }
    }
    return null;
  }

  function isExactAuthSettlementSuccessFrame(action, normalizedBytes) {
    if (!AUTH_SETTLEMENT_ACTION_IDS.includes(action?.id) || !Buffer.isBuffer(normalizedBytes)) {
      return false;
    }
    try {
      const text = decodeExactNativeUtf8(normalizedBytes, "auth settlement success frame");
      if (
        !text.endsWith("\n") ||
        text.length <= 1 ||
        text.slice(0, -1).includes("\n") ||
        text.slice(0, -1).includes("\r") ||
        text.includes("\0")
      ) {
        return false;
      }
      const body = text.slice(0, -1);
      const value = JSON.parse(body);
      if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Object.prototype ||
        !deepEqualJson(Object.keys(value), ["url", "userMenuVisible", "userName"])
      ) {
        return false;
      }
      return (
        canonicalJson(value) === body &&
        typeof value.url === "string" &&
        typeof value.userMenuVisible === "boolean" &&
        typeof value.userName === "string"
      );
    } catch {
      return false;
    }
  }

  function buildPrivateBrowserInvocationWithAuthSettlementBoundary(action, buildInvocation) {
    try {
      return buildInvocation();
    } catch (cause) {
      failPrivateAuthSettlementStage(
        action,
        "invocation_boundary_failed",
        { cause },
        "browser invocation failed"
      );
    }
  }

  async function normalizePrivateBrowserOutputWithAuthSettlementBoundary(
    action,
    commandResult,
    normalizeOutput
  ) {
    try {
      return await normalizeOutput();
    } catch (cause) {
      failPrivateAuthSettlementStage(
        action,
        "output_normalization_failed",
        { cause, commandResult },
        "browser output normalization failed"
      );
    }
  }

  function parsePrivateBrowserSuccessWithAuthSettlementBoundary(
    action,
    commandResult,
    normalizedBytes,
    parseOutput
  ) {
    const successContractEligible = isExactAuthSettlementSuccessFrame(action, normalizedBytes);
    try {
      return parseOutput();
    } catch (cause) {
      if (successContractEligible) {
        failPrivateAuthSettlementStage(
          action,
          "success_contract_failed",
          { cause, commandResult },
          "browser success contract failed"
        );
      }
      throw cause;
    }
  }

  function finalizePrivateBrowserResultWithAuthSettlementBoundary(
    action,
    executable,
    plan,
    commandResult,
    buildResult
  ) {
    try {
      const result = buildResult();
      validateCapabilityResult(result, action, executable, plan);
      return result;
    } catch (cause) {
      failPrivateAuthSettlementStage(
        action,
        "receipt_boundary_failed",
        { cause, commandResult },
        "browser result boundary failed"
      );
    }
  }

  function createPrivateFailureActionTracker(plan) {
    assertRecursivelyFrozen(plan);
    invariant(
      Array.isArray(plan.actionManifest) && plan.actionManifest.length > 0,
      "failure action tracker manifest is absent"
    );
    const actionById = new Map();
    for (const [index, action] of plan.actionManifest.entries()) {
      invariant(
        action &&
          typeof action === "object" &&
          Object.isFrozen(action) &&
          typeof action.id === "string" &&
          SAFE_IDENTIFIER_PATTERN.test(action.id) &&
          action.ordinal === index + 1 &&
          !actionById.has(action.id),
        "failure action tracker manifest identity drift"
      );
      actionById.set(action.id, action);
    }
    const tracker = Object.freeze({});
    PRIVATE_FAILURE_ACTION_TRACKERS.set(tracker, {
      actionManifest: plan.actionManifest,
      actionById,
      currentActionId: null,
      failureClass: null,
      nextIndex: 0,
      sealed: false,
    });
    return tracker;
  }

  function beginPrivateFailureAction(tracker, action) {
    const state = PRIVATE_FAILURE_ACTION_TRACKERS.get(tracker);
    invariant(state !== undefined, "failure action tracker is invalid");
    invariant(
      state.sealed === false && state.currentActionId === null,
      "failure action tracker is not ready"
    );
    const expected = state.actionManifest[state.nextIndex];
    invariant(
      expected === action && state.actionById.get(action.id) === action,
      "failure action tracker rejected an unregistered action"
    );
    state.currentActionId = action.id;
  }

  function retainPrivateAuthSettlementFailureClassNeverThrow(tracker, cause) {
    try {
      const state = PRIVATE_FAILURE_ACTION_TRACKERS.get(tracker);
      const failureClass = PRIVATE_AUTH_SETTLEMENT_FAILURE_CLASSES.get(cause);
      if (
        state === undefined ||
        state.sealed !== false ||
        typeof state.currentActionId !== "string" ||
        state.failureClass !== null ||
        !AUTH_SETTLEMENT_ACTION_IDS.includes(state.currentActionId) ||
        !AUTH_SETTLEMENT_DIAGNOSTIC_FAILURE_CLASSES.includes(failureClass)
      ) {
        return false;
      }
      state.failureClass = failureClass;
      return true;
    } catch {
      return false;
    }
  }

  function retainPrivateToneOpenFailureClassNeverThrow(tracker, cause) {
    try {
      const state = PRIVATE_FAILURE_ACTION_TRACKERS.get(tracker);
      const failureClass = PRIVATE_TONE_OPEN_FAILURE_CLASSES.get(cause);
      if (
        state === undefined ||
        state.sealed !== false ||
        typeof state.currentActionId !== "string" ||
        state.failureClass !== null ||
        !TONE_MENU_OPEN_ACTION_IDS.includes(state.currentActionId) ||
        !TONE_OPEN_BROWSER_FAILURE_CLASSES.includes(failureClass)
      ) {
        return false;
      }
      state.failureClass = failureClass;
      return true;
    } catch {
      return false;
    }
  }

  function retainPrivateToneSelectFailureClassNeverThrow(tracker, cause) {
    try {
      const state = PRIVATE_FAILURE_ACTION_TRACKERS.get(tracker);
      const failureClass = PRIVATE_TONE_SELECT_FAILURE_CLASSES.get(cause);
      if (
        state === undefined ||
        state.sealed !== false ||
        typeof state.currentActionId !== "string" ||
        state.failureClass !== null ||
        !TONE_MUTED_ACTION_IDS.includes(state.currentActionId) ||
        !TONE_SELECT_BROWSER_FAILURE_CLASSES.includes(failureClass)
      ) {
        return false;
      }
      state.failureClass = failureClass;
      return true;
    } catch {
      return false;
    }
  }

  function retainPrivateDirtyNavigationFailureClassNeverThrow(tracker, cause) {
    try {
      const state = PRIVATE_FAILURE_ACTION_TRACKERS.get(tracker);
      const failureClass = PRIVATE_DIRTY_NAVIGATION_FAILURE_CLASSES.get(cause);
      if (
        state === undefined ||
        state.sealed !== false ||
        typeof state.currentActionId !== "string" ||
        state.failureClass !== null ||
        !DIRTY_NAVIGATION_REQUEST_ACTION_IDS.includes(state.currentActionId) ||
        !dirtyNavigationDiagnosticFailureClassAllowedForAction(state.currentActionId, failureClass)
      ) {
        return false;
      }
      state.failureClass = failureClass;
      return true;
    } catch {
      return false;
    }
  }

  function completePrivateFailureAction(tracker, action) {
    const state = PRIVATE_FAILURE_ACTION_TRACKERS.get(tracker);
    invariant(state !== undefined, "failure action tracker is invalid");
    invariant(
      state.sealed === false &&
        state.currentActionId === action.id &&
        state.failureClass === null &&
        state.actionManifest[state.nextIndex] === action &&
        state.actionById.get(action.id) === action,
      "failure action tracker completion drift"
    );
    state.nextIndex += 1;
    state.currentActionId = null;
  }

  function sealPrivateFailureActionTracker(tracker) {
    const state = PRIVATE_FAILURE_ACTION_TRACKERS.get(tracker);
    invariant(state !== undefined, "failure action tracker is invalid");
    invariant(
      state.sealed === false &&
        state.currentActionId === null &&
        state.failureClass === null &&
        state.nextIndex === state.actionManifest.length,
      "failure action tracker manifest completion drift"
    );
    state.sealed = true;
  }

  function currentPrivateFailureActionIdNeverThrow(tracker) {
    try {
      const state = PRIVATE_FAILURE_ACTION_TRACKERS.get(tracker);
      if (
        state === undefined ||
        state.sealed !== false ||
        typeof state.currentActionId !== "string"
      ) {
        return null;
      }
      const action = state.actionById.get(state.currentActionId);
      if (
        action === undefined ||
        action !== state.actionManifest[state.nextIndex] ||
        action.id !== state.currentActionId
      ) {
        return null;
      }
      return state.currentActionId;
    } catch {
      return null;
    }
  }

  function currentPrivateAuthSettlementFailureClassNeverThrow(tracker) {
    try {
      const state = PRIVATE_FAILURE_ACTION_TRACKERS.get(tracker);
      if (
        state === undefined ||
        state.sealed !== false ||
        typeof state.currentActionId !== "string" ||
        !AUTH_SETTLEMENT_ACTION_IDS.includes(state.currentActionId) ||
        !AUTH_SETTLEMENT_DIAGNOSTIC_FAILURE_CLASSES.includes(state.failureClass)
      ) {
        return null;
      }
      return state.failureClass;
    } catch {
      return null;
    }
  }

  function currentPrivateToneOpenFailureClassNeverThrow(tracker) {
    try {
      const state = PRIVATE_FAILURE_ACTION_TRACKERS.get(tracker);
      if (
        state === undefined ||
        state.sealed !== false ||
        typeof state.currentActionId !== "string" ||
        !TONE_MENU_OPEN_ACTION_IDS.includes(state.currentActionId) ||
        !TONE_OPEN_BROWSER_FAILURE_CLASSES.includes(state.failureClass)
      ) {
        return null;
      }
      return state.failureClass;
    } catch {
      return null;
    }
  }

  function currentPrivateToneSelectFailureClassNeverThrow(tracker) {
    try {
      const state = PRIVATE_FAILURE_ACTION_TRACKERS.get(tracker);
      if (
        state === undefined ||
        state.sealed !== false ||
        typeof state.currentActionId !== "string" ||
        !TONE_MUTED_ACTION_IDS.includes(state.currentActionId) ||
        !TONE_SELECT_BROWSER_FAILURE_CLASSES.includes(state.failureClass)
      ) {
        return null;
      }
      return state.failureClass;
    } catch {
      return null;
    }
  }

  function currentPrivateDirtyNavigationFailureClassNeverThrow(tracker) {
    try {
      const state = PRIVATE_FAILURE_ACTION_TRACKERS.get(tracker);
      if (
        state === undefined ||
        state.sealed !== false ||
        typeof state.currentActionId !== "string" ||
        !DIRTY_NAVIGATION_REQUEST_ACTION_IDS.includes(state.currentActionId) ||
        !dirtyNavigationDiagnosticFailureClassAllowedForAction(
          state.currentActionId,
          state.failureClass
        )
      ) {
        return null;
      }
      return state.failureClass;
    } catch {
      return null;
    }
  }

  return Object.freeze({
    PRIVATE_DIRTY_NAVIGATION_FAILURE_DETAILS,
    PRIVATE_FAILURE_ACTION_TRACKERS,
    PRIVATE_TONE_OPEN_FAILURE_DETAILS,
    PRIVATE_TONE_SELECT_FAILURE_CLASSES,
    beginPrivateFailureAction,
    buildPrivateBrowserInvocationWithAuthSettlementBoundary,
    classifyPrivateAuthSettlementFailureFrame,
    classifyPrivateDirtyNavigationFailureFrame,
    classifyPrivateToneOpenFailureFrame,
    classifyPrivateToneSelectFailureFrame,
    completePrivateFailureAction,
    createPrivateAuthSettlementFailure,
    createPrivateDirtyNavigationFailure,
    createPrivateFailureActionTracker,
    createPrivateToneOpenFailure,
    createPrivateToneSelectFailure,
    currentPrivateAuthSettlementFailureClassNeverThrow,
    currentPrivateDirtyNavigationFailureClassNeverThrow,
    currentPrivateFailureActionIdNeverThrow,
    currentPrivateToneOpenFailureClassNeverThrow,
    currentPrivateToneSelectFailureClassNeverThrow,
    failPrivateAuthSettlementStage,
    finalizePrivateBrowserResultWithAuthSettlementBoundary,
    isExactAuthSettlementSuccessFrame,
    normalizePrivateBrowserOutputWithAuthSettlementBoundary,
    parsePrivateBrowserSuccessWithAuthSettlementBoundary,
    retainPrivateAuthSettlementFailureClassNeverThrow,
    retainPrivateDirtyNavigationFailureClassNeverThrow,
    retainPrivateToneOpenFailureClassNeverThrow,
    retainPrivateToneSelectFailureClassNeverThrow,
    sealPrivateFailureActionTracker,
  });
}

export {
  PRE_AUTHORITY_FAILURE_COUNT,
  retainOrDiscardPreAuthorityCauseNeverThrow,
};

import { deepFreezeExact, exactKeys, invariant, sameSet } from "./core.mjs";
import {
  AUTH_STATE_TRANSITIONS,
  CAPTURE_INPUTS_BY_EXPRESSION,
  FIXTURE_CAPTURE_BY_ACTION,
  FIXTURE_SUBJECT_CAPTURE,
  PAGE_IDENTITY,
  PAGE_STATE_TRANSITIONS,
  REQUIRED_SCREENSHOT_PATHS,
  ROUTE_STATE_MACHINES,
  RUNTIME_BUILDER_KINDS,
  RUNTIME_CAPTURE_BY_ACTION,
  RUNTIME_CAPTURE_EXPRESSIONS,
  SCENARIO_BY_PREFIX,
  SCREENSHOT_DESCRIPTOR_BY_ACTION_ID,
  THEME_STATE_TRANSITIONS,
} from "./metadata.mjs";
import {
  collectRefDescriptors,
  compileArgumentRef,
  executableRefs,
  literalRef,
  parseAssertionName,
  parseBuilderAst,
  parseBuilderKind,
  repositoryMutationPolicy,
} from "./references.mjs";
import {
  ACTION_KEYS,
  AUTH_RATE_ALWAYS_PRODUCER_BUILDERS,
  AUTH_RATE_ALWAYS_PRODUCER_KINDS,
  AUTH_RATE_CONDITIONAL_CSRF_ACTIONS,
  AUTH_RATE_COSTS_BY_ACTION,
  BROWSER_NATIVE_OPERATION_IDS,
  EXECUTABLE_KEYS_BY_TYPE,
  MAX_PREFERENCE_UNMOUNT_WINDOW_MS,
  REQUIRED_ACTION_COUNT,
  REQUIRED_AUTH_RATE_PLAN,
  REQUIRED_BUILDER_KIND_COUNTS,
  REQUIRED_CAPTURE_NAMES,
  REQUIRED_EXECUTABLE_TYPE_COUNTS,
  REQUIRED_FIXTURE_SUBJECT_KEYS,
  REQUIRED_FLOW_ACTION_COUNT,
  REQUIRED_FLOW_ACTION_COUNTS,
  REQUIRED_GLOBAL_LIST_ACTION_IDS,
  REQUIRED_ISOLATED_API_ACTION_IDS,
  REQUIRED_ISOLATED_API_READ_EXPECTATIONS,
  REQUIRED_METADATA_STATE_VALUES,
  REQUIRED_NATIVE_ACTION_IDS,
  REQUIRED_RUNTIME_BLOCK_CAPTURES,
  REQUIRED_SCENARIOS,
  REQUIRED_SETUP_ACTION_COUNT,
  REQUIRED_SIGNOUT_SETTLEMENT_IDS,
  REQUIRED_SMOKE_ASSERTIONS,
  REQUIRED_TERMINAL_ACTION_COUNT,
  SCREEN_PREFERENCE_SETTLED_RETENTION_MS,
} from "./requirements.mjs";

export function routeOutputSchemaId(key, operation) {
  const machine = ROUTE_STATE_MACHINES[key];
  invariant(machine !== undefined, "route key is not registered: " + key);
  if (operation === "route-setup") return "route-setup";
  if (operation === "unroute") return "route-unroute";
  if (operation === "route-release") {
    return machine.mode === "abort-aware-preference-write"
      ? "route-abort-release"
      : "route-release";
  }
  invariant(operation === "route-hit-read", "route operation is not registered: " + operation);
  if (machine.mode === "malformed") return "route-malformed-hit";
  if (machine.mode === "delayed-preference-read") return "route-preference-read-hit";
  if (key === "related-a-refresh") return "route-related-hit";
  if (machine.mode === "abort-aware-preference-write") return "route-preference-write-hit";
  return "route-delayed-hit";
}

export function commandOutputSchemaId(action, ast) {
  if (action.id === "set-017-editable-type-proof") {
    return "editable-content-type-detail";
  }
  if (action.kind === "assert") return "assertion:" + ast.args[0];
  if (action.kind === "observe") return "observation:" + ast.args[0];
  if (action.kind === "route") return routeOutputSchemaId(ast.args[0], ast.args[1]);
  if (action.kind === "blocksBefore") return "block-id-set";
  if (action.kind === "captureNew") return "new-block";
  if (action.kind === "logs") return "log-channel";
  if (action.kind === "screen") return "screenshot";
  if (action.kind === "media-count-before-release" || action.kind === "media-count-after-release") {
    return "media-count";
  }
  if (action.kind === "dispatchAndCaptureSelectionHandle") return "selection-handle";
  if (action.kind === "authRateWindowBarrier") return "auth-rate-barrier";
  if (action.kind === "cleanup-release-unroute") return "cleanup-routes";
  if (action.kind === "cleanup-route-list") return "cleanup-route-list";
  if (
    action.kind === "cleanup-console-errors" ||
    action.kind === "cleanup-console-warnings" ||
    action.kind === "cleanup-page-errors"
  ) {
    return "cleanup-log-channel";
  }
  if (action.kind === "cleanup-session-absence") return "cleanup-session";
  if (action.kind === "cleanup-close") return "cleanup-close";
  if (RUNTIME_BUILDER_KINDS.includes(action.kind)) return "runtime-safe-projection";
  return "unit";
}

export function referencedCaptures(row) {
  const haystack = row.join("\n");
  const names = REQUIRED_CAPTURE_NAMES.filter((name) => haystack.includes(name));
  for (const [expression, captureName] of Object.entries(RUNTIME_CAPTURE_EXPRESSIONS)) {
    if (haystack.includes(expression) && !names.includes(captureName)) names.push(captureName);
  }
  for (const [expression, captureNames] of Object.entries(CAPTURE_INPUTS_BY_EXPRESSION)) {
    if (!haystack.includes(expression)) continue;
    for (const captureName of captureNames) {
      if (!names.includes(captureName)) names.push(captureName);
    }
  }
  return names;
}

export function resolveDependencyId(token, allIds, currentIndex) {
  const priorIds = allIds.slice(0, currentIndex);
  if (priorIds.includes(token)) return token;
  const matches = priorIds.filter((id) => id.startsWith(token + "-"));
  invariant(matches.length === 1, token + " must resolve to exactly one prior action");
  return matches[0];
}

export function nativeOperationIdForAction(actionId) {
  if (actionId === "set-005-open") return "open-about-blank";
  if (
    [
      "set-009-login-email",
      "set-010-login-password",
      "ru-042-a-password",
      "ru-068-b-password",
      "ru-078-a2-password",
      "ru-092-b2-password",
      "ru-104-a3-password",
    ].includes(actionId)
  ) {
    return "fill-secret";
  }
  if (actionId === "rc-019-related-tab-new") return "tab-new";
  if (actionId === "rc-022-related-tab-origin" || actionId === "rc-045-origin-proof") {
    return "tab-select";
  }
  if (actionId === "rc-044-close-second-tab") return "tab-close";
  if (actionId === "end-002-route-list") return "route-list";
  if (actionId === "end-006-close") return "close";
  invariant(false, "native action is not registered: " + actionId);
}

export function compileExecutable(action, ast) {
  const refs =
    action.kind === "blocksBefore" || action.kind === "captureNew"
      ? ast.args.map((expression, index) => {
          if (index === 0) {
            const captureName = RUNTIME_CAPTURE_EXPRESSIONS[expression];
            invariant(captureName !== undefined, action.id + " runtime capture name drift");
            return literalRef(captureName);
          }
          return compileArgumentRef(expression);
        })
      : ast.args.map(compileArgumentRef);
  if (RUNTIME_BUILDER_KINDS.includes(action.kind)) {
    invariant(
      refs.every(({ op }) => op !== "secret"),
      action.id + " runtime Ref contains a secret"
    );
    return deepFreezeExact({
      type: "runtime-operation",
      operationId: "runtime/" + action.id,
      refs,
    });
  }
  if (REQUIRED_NATIVE_ACTION_IDS.includes(action.id)) {
    return deepFreezeExact({
      type: "browser-native",
      operationId: nativeOperationIdForAction(action.id),
      refs,
    });
  }
  if (action.kind === "screen") {
    invariant(refs.length === 1 && refs[0].op === "literal", action.id + " screenshot Ref drift");
    const descriptor = SCREENSHOT_DESCRIPTOR_BY_ACTION_ID[action.id];
    invariant(descriptor !== undefined, action.id + " screenshot descriptor drift");
    return deepFreezeExact({
      type: "browser-screenshot",
      screenshotId: descriptor.screenshotId,
      fullPage: true,
    });
  }
  if (REQUIRED_GLOBAL_LIST_ACTION_IDS.includes(action.id)) {
    invariant(refs.length === 0, action.id + " global-list Ref drift");
    return deepFreezeExact({ type: "browser-global-list" });
  }
  invariant(
    refs.every(({ op }) => op !== "secret"),
    action.id + " run-code Ref contains a secret"
  );
  return deepFreezeExact({
    type: "browser-run-code",
    sourceId: "run-code/" + action.id,
    refs,
  });
}

export function compileAction(row, index, allRows) {
  invariant(Array.isArray(row) && row.length === 5, "action row must have five cells");
  const [id, page, builder, transition, dependencyAndRoute] = row;
  invariant(
    [id, page, builder, transition, dependencyAndRoute].every((item) => typeof item === "string"),
    "action cells must be strings"
  );
  const prefix = id.split("-", 1)[0];
  const scenario = SCENARIO_BY_PREFIX[prefix];
  const pageIdentity = PAGE_IDENTITY[page];
  invariant(scenario !== undefined, "unknown scenario prefix for " + id);
  invariant(pageIdentity !== undefined, "unknown page identity for " + id);

  const transitionParts = transition.split(" -> ");
  invariant(
    transitionParts.length === 3 && transitionParts.every(Boolean),
    id + " must have exact pre/output/post clauses"
  );
  const dependencyRouteParts = dependencyAndRoute.split(" / ");
  invariant(dependencyRouteParts.length === 2, id + " must have exact dependency/route clauses");
  const dependencyTokens =
    dependencyRouteParts[0] === "-"
      ? []
      : dependencyRouteParts[0].split(",").map((dependency) => dependency.trim());
  const allIds = allRows.map(([candidateId]) => candidateId);
  const dependencies = dependencyTokens.map((dependency) =>
    resolveDependencyId(dependency, allIds, index)
  );
  const routeParts = dependencyRouteParts[1].split(" -> ");
  invariant(
    routeParts.length === 2 && routeParts.every(Boolean),
    id + " must have exact route before/after clauses"
  );

  const auditIdentity = {
    ordinal: index + 1,
    id,
    scenario,
    pageId: pageIdentity.pageId,
    tabIndex: pageIdentity.tabIndex,
    kind: parseBuilderKind(builder),
    builder,
    precondition: transitionParts[0],
    captureInput: referencedCaptures(row),
    captureOutput: transitionParts[1],
    postcondition: transitionParts[2],
    assertionDependencies: dependencies,
    routeStateBefore: routeParts[0],
    routeStateAfter: routeParts[1],
  };
  const ast = parseBuilderAst(builder);
  return deepFreezeExact({
    ...auditIdentity,
    executable: compileExecutable(auditIdentity, ast),
    outputSchemaId: commandOutputSchemaId(auditIdentity, ast),
    repositoryMutationPolicy: repositoryMutationPolicy(auditIdentity, ast),
  });
}

export function expandCleanupActions(acquiredSubjects) {
  invariant(Array.isArray(acquiredSubjects), "cleanup subjects must be an array");
  const seen = new Set();
  const actions = [];
  for (const subject of acquiredSubjects) {
    exactKeys(subject, ["kind", "id"], "cleanup subject");
    invariant(
      REQUIRED_FIXTURE_SUBJECT_KEYS.includes(subject.kind) &&
        typeof subject.id === "string" &&
        subject.id.length > 0 &&
        subject.id.length <= 240,
      "cleanup subject is invalid"
    );
    const subjectKey = subject.kind + ":" + subject.id;
    invariant(!seen.has(subjectKey), "cleanup subject must be unique");
    seen.add(subjectKey);
    for (const operation of ["cleanup-provenance", "cleanup-delete", "cleanup-absence"]) {
      actions.push(
        deepFreezeExact({
          id: operation + ":" + subjectKey,
          operation,
          subjectKind: subject.kind,
          subjectIdentifier: subject.id,
        })
      );
    }
  }
  invariant(actions.length === acquiredSubjects.length * 3, "cleanup expansion drift");
  return Object.freeze(actions);
}

export function assertOrderedActionIds(manifest, ids, label) {
  let prior = -1;
  for (const id of ids) {
    const index = manifest.findIndex((action) => action.id === id);
    invariant(index > prior, label + " action order drift at " + id);
    prior = index;
  }
}


export function validateExecutableShape(action) {
  const executable = action.executable;
  invariant(
    executable && typeof executable === "object" && !Array.isArray(executable),
    action.id + " executable must be an object"
  );
  const expectedKeys = EXECUTABLE_KEYS_BY_TYPE[executable.type];
  invariant(expectedKeys !== undefined, action.id + " executable type is unknown");
  exactKeys(executable, expectedKeys, action.id + " executable");
  const refs = executableRefs(executable);
  invariant(Array.isArray(refs), action.id + " executable refs must be an array");
  if (executable.type === "runtime-operation") {
    invariant(
      executable.operationId === "runtime/" + action.id &&
        RUNTIME_BUILDER_KINDS.includes(action.kind) &&
        refs.flatMap((ref) => collectRefDescriptors(ref)).every(({ op }) => op !== "secret"),
      action.id + " runtime executable drift"
    );
  } else if (executable.type === "browser-run-code") {
    invariant(
      executable.sourceId === "run-code/" + action.id &&
        !RUNTIME_BUILDER_KINDS.includes(action.kind) &&
        !REQUIRED_NATIVE_ACTION_IDS.includes(action.id) &&
        action.kind !== "screen" &&
        !REQUIRED_GLOBAL_LIST_ACTION_IDS.includes(action.id) &&
        refs.flatMap((ref) => collectRefDescriptors(ref)).every(({ op }) => op !== "secret"),
      action.id + " run-code executable drift"
    );
  } else if (executable.type === "browser-native") {
    invariant(
      REQUIRED_NATIVE_ACTION_IDS.includes(action.id) &&
        BROWSER_NATIVE_OPERATION_IDS.includes(executable.operationId) &&
        executable.operationId === nativeOperationIdForAction(action.id),
      action.id + " native executable drift"
    );
    const secretRefs = refs.filter(({ op }) => op === "secret");
    invariant(
      (executable.operationId === "fill-secret" && secretRefs.length === 1 && refs.length === 2) ||
        (executable.operationId !== "fill-secret" && secretRefs.length === 0),
      action.id + " native secret placement drift"
    );
    const recursiveSecrets = refs
      .flatMap((ref) => collectRefDescriptors(ref))
      .filter(({ op }) => op === "secret");
    invariant(
      recursiveSecrets.length === secretRefs.length,
      action.id + " nested native secret Ref drift"
    );
    if (executable.operationId === "fill-secret") {
      const expectedSelector = action.id === "set-009-login-email" ? "loginEmail" : "loginPassword";
      const expectedSecret = action.id === "set-009-login-email" ? "ADMIN_EMAIL" : "ADMIN_PASSWORD";
      invariant(
        refs[0]?.op === "selector" &&
          refs[0].templateId === expectedSelector &&
          refs[0].args.length === 0 &&
          refs[1]?.op === "secret" &&
          refs[1].name === expectedSecret,
        action.id + " native fill selector/secret identity drift"
      );
    }
  } else if (executable.type === "browser-screenshot") {
    invariant(
      action.kind === "screen" &&
        executable.screenshotId === "screenshot/" + action.id &&
        executable.fullPage === true,
      action.id + " screenshot executable drift"
    );
  } else {
    invariant(
      executable.type === "browser-global-list" &&
        REQUIRED_GLOBAL_LIST_ACTION_IDS.includes(action.id),
      action.id + " global-list executable drift"
    );
  }
  invariant(
    typeof action.outputSchemaId === "string" && action.outputSchemaId.length > 0,
    action.id + " output schema ID is invalid"
  );
  exactKeys(
    action.repositoryMutationPolicy,
    ["mode", "paths"],
    action.id + " repository mutation policy"
  );
  invariant(
    (action.repositoryMutationPolicy.mode === "none" &&
      action.repositoryMutationPolicy.paths.length === 0) ||
      (executable.type === "browser-screenshot" &&
        action.repositoryMutationPolicy.mode === "allowlist" &&
        action.repositoryMutationPolicy.paths.length === 1 &&
        REQUIRED_SCREENSHOT_PATHS.includes(action.repositoryMutationPolicy.paths[0])),
    action.id + " repository mutation policy drift"
  );
}

export function canonicalContractJson(value) {
  const normalize = (candidate) => {
    if (candidate === null || typeof candidate !== "object") return candidate;
    if (Array.isArray(candidate)) return candidate.map(normalize);
    return Object.fromEntries(
      Object.keys(candidate)
        .sort()
        .map((key) => [key, normalize(candidate[key])])
    );
  };
  return JSON.stringify(normalize(value));
}

export function deriveAuthRateProducerActionIds(manifest) {
  const conditionalProducerIds = new Set(Object.keys(AUTH_RATE_CONDITIONAL_CSRF_ACTIONS.producers));
  const conditionalCachedIds = new Set(Object.keys(AUTH_RATE_CONDITIONAL_CSRF_ACTIONS.cached));
  const conditionalIds = new Set([...conditionalProducerIds, ...conditionalCachedIds]);
  invariant(
    conditionalIds.size === conditionalProducerIds.size + conditionalCachedIds.size,
    "conditional CSRF classifications must be disjoint"
  );

  const manifestIds = new Set(manifest.map(({ id }) => id));
  invariant(
    conditionalIds.size > 0 && [...conditionalIds].every((id) => manifestIds.has(id)),
    "conditional CSRF classification/manifest drift"
  );

  const producerIds = new Set();
  const seenConditionalIds = new Set();
  for (const action of manifest) {
    const conditionalBuilder =
      AUTH_RATE_CONDITIONAL_CSRF_ACTIONS.producers[action.id] ??
      AUTH_RATE_CONDITIONAL_CSRF_ACTIONS.cached[action.id];
    if (conditionalBuilder !== undefined) {
      invariant(
        action.kind === "click" && action.builder === conditionalBuilder,
        action.id + " conditional CSRF signature drift"
      );
      seenConditionalIds.add(action.id);
    }
    if (action.builder === "click(S.entrySave)" || action.builder === "click(S.metadata)") {
      invariant(
        conditionalBuilder !== undefined,
        action.id + " lacks an explicit conditional CSRF classification"
      );
    }
    if (
      AUTH_RATE_ALWAYS_PRODUCER_KINDS.includes(action.kind) ||
      AUTH_RATE_ALWAYS_PRODUCER_BUILDERS.includes(action.builder) ||
      conditionalProducerIds.has(action.id)
    ) {
      producerIds.add(action.id);
    }
  }
  invariant(
    seenConditionalIds.size === conditionalIds.size,
    "conditional CSRF classification coverage drift"
  );
  return producerIds;
}

export function assertAuthRateProducerCoverage(manifest, costsByAction) {
  const producerActionIds = deriveAuthRateProducerActionIds(manifest);
  const costActionIds = new Set(Object.keys(costsByAction));
  invariant(
    sameSet([...producerActionIds], [...costActionIds]),
    "auth rate producer classification/cost ledger drift"
  );
}

export function computeAuthRatePlan(manifest, costsByAction = AUTH_RATE_COSTS_BY_ACTION) {
  assertAuthRateProducerCoverage(manifest, costsByAction);
  const costActionIds = new Set(Object.keys(costsByAction));
  const seenCostActionIds = new Set();
  const epochs = [];
  let current = new Map();
  const closeEpoch = (endsAtBarrierActionId) => {
    const maximumRequestsByIdentity = Object.fromEntries(
      [...current.entries()].sort(([left], [right]) => left.localeCompare(right))
    );
    invariant(
      Object.keys(maximumRequestsByIdentity).length > 0,
      "auth rate epoch may not be empty"
    );
    epochs.push({ endsAtBarrierActionId, maximumRequestsByIdentity });
    current = new Map();
  };
  for (const action of manifest) {
    const costs = costsByAction[action.id];
    if (costs !== undefined) {
      seenCostActionIds.add(action.id);
      for (const [identity, count] of Object.entries(costs)) {
        invariant(
          Number.isSafeInteger(count) && count >= 1,
          action.id + " auth rate action cost drift"
        );
        current.set(identity, (current.get(identity) ?? 0) + count);
      }
    }
    if (action.kind === "authRateWindowBarrier") closeEpoch(action.id);
  }
  closeEpoch(null);
  invariant(
    costActionIds.size === seenCostActionIds.size &&
      [...costActionIds].every((id) => seenCostActionIds.has(id)),
    "auth rate action cost registry/manifest drift"
  );
  return deepFreezeExact({
    epochs,
    requiredEnabledMaxRequests: 10,
    requiredEnabledWindowSecondsMin: 1,
    requiredEnabledWindowSecondsMax: 60,
  });
}

export function validateManifest(manifest) {
  invariant(manifest.length === REQUIRED_ACTION_COUNT, "expected 496 actions");
  const ids = manifest.map(({ id }) => id);
  invariant(new Set(ids).size === ids.length, "action IDs must be unique");
  const seen = new Set();
  const scenarioCounts = Object.create(null);
  const assertions = [];
  const builderKindCounts = Object.create(null);
  const executableTypeCounts = Object.create(null);
  let routeState = "absent";
  for (const [index, action] of manifest.entries()) {
    exactKeys(action, ACTION_KEYS, action.id);
    validateExecutableShape(action);
    executableTypeCounts[action.executable.type] =
      (executableTypeCounts[action.executable.type] ?? 0) + 1;
    invariant(action.ordinal === index + 1, action.id + " has a non-dense ordinal");
    for (const dependency of action.assertionDependencies) {
      invariant(
        seen.has(dependency),
        action.id + " has a missing or future dependency " + dependency
      );
    }
    seen.add(action.id);
    scenarioCounts[action.scenario] = (scenarioCounts[action.scenario] ?? 0) + 1;
    builderKindCounts[action.kind] = (builderKindCounts[action.kind] ?? 0) + 1;
    const assertion = parseAssertionName(action.builder);
    if (assertion !== null) assertions.push(assertion);
    if (action.routeStateBefore !== "absent" || action.routeStateAfter !== "absent") {
      if (action.routeStateBefore !== "all terminal") {
        invariant(
          action.routeStateBefore === routeState,
          action.id + " route state is discontinuous"
        );
      }
      routeState = action.routeStateAfter;
    }
  }
  invariant(routeState === "absent", "route state must terminate absent");
  invariant(
    canonicalContractJson(computeAuthRatePlan(manifest)) ===
      canonicalContractJson(REQUIRED_AUTH_RATE_PLAN),
    "auth rate action ledger/epoch plan drift"
  );
  invariant(scenarioCounts.setup === REQUIRED_SETUP_ACTION_COUNT, "setup count drift");
  invariant(scenarioCounts.cleanup === REQUIRED_TERMINAL_ACTION_COUNT, "cleanup count drift");
  for (const scenario of REQUIRED_SCENARIOS) {
    invariant(
      scenarioCounts[scenario] === REQUIRED_FLOW_ACTION_COUNTS[scenario],
      scenario + " count drift"
    );
  }
  invariant(
    REQUIRED_SCENARIOS.reduce((total, scenario) => total + scenarioCounts[scenario], 0) ===
      REQUIRED_FLOW_ACTION_COUNT,
    "flow action count drift"
  );
  const requiredAssertions = Object.values(REQUIRED_SMOKE_ASSERTIONS).flat();
  invariant(sameSet(assertions, requiredAssertions), "exact 55-name assertion universe drift");
  invariant(assertions.length === 55, "assertion count drift");
  invariant(
    !assertions.includes("media-get-count-before-release") &&
      !assertions.includes("media-get-count-after-release"),
    "media count operations must not be assertions"
  );
  invariant(
    manifest.some(({ builder }) => builder === "media-count-before-release") &&
      manifest.some(({ builder }) => builder === "media-count-after-release"),
    "media count operations are missing"
  );
  invariant(
    manifest.filter(({ kind }) => kind === "logs").length === 7 * 3 * 2,
    "aggregate/per-page log action cardinality drift"
  );
  invariant(
    sameSet(Object.values(FIXTURE_CAPTURE_BY_ACTION).flat(), REQUIRED_CAPTURE_NAMES),
    "fixture single-assignment capture map drift"
  );
  invariant(
    sameSet(Object.keys(FIXTURE_SUBJECT_CAPTURE), REQUIRED_FIXTURE_SUBJECT_KEYS) &&
      Object.values(FIXTURE_SUBJECT_CAPTURE).every((name) => REQUIRED_CAPTURE_NAMES.includes(name)),
    "fixture subject/capture identity map drift"
  );
  invariant(
    sameSet(Object.values(RUNTIME_CAPTURE_BY_ACTION).flat(), REQUIRED_RUNTIME_BLOCK_CAPTURES),
    "runtime single-assignment capture map drift"
  );
  for (const [id, captureNames] of Object.entries({
    ...FIXTURE_CAPTURE_BY_ACTION,
    ...RUNTIME_CAPTURE_BY_ACTION,
  })) {
    const action = manifest.find((candidate) => candidate.id === id);
    invariant(action !== undefined, "capture owner action is missing: " + id);
    invariant(
      captureNames.length === new Set(captureNames).size,
      id + " capture output is duplicated"
    );
  }
  assertOrderedActionIds(manifest, REQUIRED_ISOLATED_API_ACTION_IDS, "isolated API");
  assertOrderedActionIds(manifest, REQUIRED_SIGNOUT_SETTLEMENT_IDS, "sign-out settlement");
  const authRateBarrierIds = REQUIRED_AUTH_RATE_PLAN.epochs.flatMap(({ endsAtBarrierActionId }) =>
    endsAtBarrierActionId === null ? [] : [endsAtBarrierActionId]
  );
  assertOrderedActionIds(manifest, authRateBarrierIds, "auth rate barrier");
  invariant(
    authRateBarrierIds.every(
      (id) => manifest.find((action) => action.id === id)?.kind === "authRateWindowBarrier"
    ) &&
      REQUIRED_AUTH_RATE_PLAN.epochs.at(-1)?.endsAtBarrierActionId === null &&
      REQUIRED_AUTH_RATE_PLAN.epochs
        .slice(0, -1)
        .every(({ endsAtBarrierActionId }) => typeof endsAtBarrierActionId === "string") &&
      REQUIRED_AUTH_RATE_PLAN.epochs.every(({ maximumRequestsByIdentity }) =>
        Object.values(maximumRequestsByIdentity).every(
          (count) =>
            Number.isSafeInteger(count) &&
            count >= 1 &&
            count <= REQUIRED_AUTH_RATE_PLAN.requiredEnabledMaxRequests
        )
      ),
    "auth rate barrier action kind drift"
  );
  for (const [id, expectedValue] of Object.entries(REQUIRED_METADATA_STATE_VALUES)) {
    const action = manifest.find((candidate) => candidate.id === id);
    invariant(action !== undefined, "metadata-state action is missing: " + id);
    invariant(
      action.captureOutput.includes(String(expectedValue)) ||
        action.postcondition.includes(String(expectedValue)),
      id + " does not bind its required metadata value"
    );
  }
  // The isolated durable reads are the only place the harness states, in code, which boolean the
  // server must hold. The router derives that boolean from REQUIRED_ISOLATED_API_READ_EXPECTATIONS,
  // so the table must agree with the literal each row's capture-output prose states, and every
  // isolated read must be covered. Without this binding the router hardcoded its own opinion and
  // ru-061a-a-durable-bypass-read asserted the negation of its row through four commits.
  const isolatedReadActions = manifest.filter(
    ({ kind }) => kind === "isolatedApiSessionApiReadAs"
  );
  invariant(
    sameSet(
      isolatedReadActions.map(({ id }) => id),
      Object.keys(REQUIRED_ISOLATED_API_READ_EXPECTATIONS)
    ),
    "isolated preference read expectation coverage drift"
  );
  for (const action of isolatedReadActions) {
    const expectedValue = REQUIRED_ISOLATED_API_READ_EXPECTATIONS[action.id];
    const statedValue = /showFieldMetadata:\s*(true|false)/u.exec(action.captureOutput);
    invariant(
      typeof expectedValue === "boolean" && statedValue !== null,
      action.id + " states no showFieldMetadata literal"
    );
    invariant(
      (statedValue[1] === "true") === expectedValue,
      action.id + " contract expectation contradicts the routed expectation"
    );
  }
  invariant(
    MAX_PREFERENCE_UNMOUNT_WINDOW_MS < SCREEN_PREFERENCE_SETTLED_RETENTION_MS,
    "preference remount window must remain below retention"
  );
  invariant(
    sameSet(Object.keys(builderKindCounts), Object.keys(REQUIRED_BUILDER_KIND_COUNTS)) &&
      Object.entries(REQUIRED_BUILDER_KIND_COUNTS).every(
        ([kind, count]) => builderKindCounts[kind] === count
      ),
    "builder registry/count drift"
  );
  invariant(
    sameSet(Object.keys(executableTypeCounts), Object.keys(REQUIRED_EXECUTABLE_TYPE_COUNTS)) &&
      Object.entries(REQUIRED_EXECUTABLE_TYPE_COUNTS).every(
        ([type, count]) => executableTypeCounts[type] === count
      ),
    "executable type/count drift"
  );
}

export function assertOrderedTransitions(manifest, transitions, label) {
  let priorIndex = -1;
  let state = transitions[0]?.from;
  for (const transition of transitions) {
    exactKeys(transition, ["actionId", "from", "to"], label + " transition");
    const index = manifest.findIndex(({ id }) => id === transition.actionId);
    invariant(index > priorIndex, label + " transition order drift at " + transition.actionId);
    invariant(
      transition.from === state,
      label + " transition discontinuity at " + transition.actionId
    );
    priorIndex = index;
    state = transition.to;
  }
  return state;
}

export function validateStateMachines(manifest) {
  const scenarioOrder = [];
  for (const { scenario } of manifest) {
    if (scenarioOrder.at(-1) !== scenario) scenarioOrder.push(scenario);
  }
  invariant(
    sameSet(scenarioOrder, ["setup", ...REQUIRED_SCENARIOS, "cleanup"]) &&
      scenarioOrder.every(
        (scenario, index) => scenario === ["setup", ...REQUIRED_SCENARIOS, "cleanup"][index]
      ),
    "top-level scenario state-machine drift"
  );

  const themeToggles = manifest.filter(
    ({ kind, builder }) => kind === "click" && builder === "click(S.colorMode)"
  );
  invariant(themeToggles.length === THEME_STATE_TRANSITIONS.length, "theme toggle count drift");
  let themeState = "light";
  let priorThemeIndex = manifest.findIndex(({ id }) => id === "bi-001-light-proof");
  invariant(priorThemeIndex >= 0, "initial light proof is missing");
  for (const transition of THEME_STATE_TRANSITIONS) {
    exactKeys(transition, ["actionId", "proofActionId", "from", "to"], "theme transition");
    const actionIndex = manifest.findIndex(({ id }) => id === transition.actionId);
    const proofIndex = manifest.findIndex(({ id }) => id === transition.proofActionId);
    invariant(
      actionIndex > priorThemeIndex && proofIndex > actionIndex,
      "theme proof order drift at " + transition.actionId
    );
    invariant(
      manifest[actionIndex].builder === "click(S.colorMode)" && transition.from === themeState,
      "theme transition drift at " + transition.actionId
    );
    themeState = transition.to;
    priorThemeIndex = proofIndex;
  }
  invariant(themeState === "light", "theme machine must terminate light");

  const pageTerminal = assertOrderedTransitions(manifest, PAGE_STATE_TRANSITIONS, "page");
  invariant(pageTerminal === "closed", "page machine must terminate closed");
  const authTerminal = assertOrderedTransitions(manifest, AUTH_STATE_TRANSITIONS, "auth");
  invariant(authTerminal === "user-a", "auth machine must end in user A before final cleanup");

  for (const [key, machine] of Object.entries(ROUTE_STATE_MACHINES)) {
    const actions = manifest.filter(({ kind, builder }) => {
      if (kind !== "route") return false;
      return parseBuilderAst(builder).args[0] === key;
    });
    invariant(actions.length === machine.operations.length, key + " route operation count drift");
    for (const [index, action] of actions.entries()) {
      const ast = parseBuilderAst(action.builder);
      invariant(ast.args[1] === machine.operations[index], key + " route operation order drift");
      invariant(
        action.routeStateBefore === machine.states[index] &&
          action.routeStateAfter === machine.states[index + 1],
        key + " route transition drift at " + action.id
      );
    }
  }
}

export function createStateMachineRegistry() {
  return deepFreezeExact({
    topLevel: {
      initial: "stopped",
      orderedStates: ["setup", ...REQUIRED_SCENARIOS, "cleanup"],
      terminal: "evidence-sealed",
    },
    page: {
      initial: "closed",
      transitions: PAGE_STATE_TRANSITIONS,
      terminal: "closed",
    },
    auth: {
      initial: "anonymous",
      transitions: AUTH_STATE_TRANSITIONS,
      terminalBeforeCleanup: "user-a",
    },
    theme: {
      initial: "light",
      transitions: THEME_STATE_TRANSITIONS,
      terminal: "light",
    },
    routes: ROUTE_STATE_MACHINES,
  });
}

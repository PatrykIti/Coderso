import { createHash } from "node:crypto";

import { RAW_ACTION_ROWS } from "./task-540-smoke/contract/action-rows.mjs";

import {
  assertClosedDataTree,
  deepFreezeExact,
  exactKeys,
  invariant,
  sameSet,
} from "./task-540-smoke/contract/core.mjs";
import {
  NONCE_PATTERN,
  ACTION_KEYS,
  EXECUTABLE_KEYS_BY_TYPE,
  REQUIRED_EXECUTABLE_TYPE_COUNTS,
  REQUIRED_NATIVE_ACTION_IDS,
  BROWSER_NATIVE_OPERATION_IDS,
  REQUIRED_GLOBAL_LIST_ACTION_IDS,
  REQUIRED_SCENARIOS,
  REQUIRED_FLOW_ACTION_COUNTS,
  REQUIRED_SETUP_ACTION_COUNT,
  REQUIRED_FLOW_ACTION_COUNT,
  REQUIRED_TERMINAL_ACTION_COUNT,
  REQUIRED_ACTION_COUNT,
  REQUIRED_FIXTURE_SUBJECT_KEYS,
  REQUIRED_CAPTURE_NAMES,
  REQUIRED_RUNTIME_BLOCK_CAPTURES,
  REQUIRED_FIXTURE_REF_PATHS,
  REQUIRED_ISOLATED_API_ACTION_IDS,
  REQUIRED_SIGNOUT_SETTLEMENT_IDS,
  REQUIRED_METADATA_STATE_VALUES,
  MAX_PREFERENCE_UNMOUNT_WINDOW_MS,
  SCREEN_PREFERENCE_SETTLED_RETENTION_MS,
  AUTH_RATE_ALWAYS_PRODUCER_KINDS,
  AUTH_RATE_ALWAYS_PRODUCER_BUILDERS,
  AUTH_RATE_CONDITIONAL_CSRF_ACTIONS,
  AUTH_RATE_COSTS_BY_ACTION,
  REQUIRED_AUTH_RATE_PLAN,
  REQUIRED_ROUTE_KEYS,
  REQUIRED_BUILDER_KIND_COUNTS,
  REQUIRED_SMOKE_ASSERTIONS,
} from "./task-540-smoke/contract/requirements.mjs";
import {
  RAW_VISIBLE_ASSERTION_ROWS,
  THEME_STATE_TRANSITIONS,
  PAGE_STATE_TRANSITIONS,
  AUTH_STATE_TRANSITIONS,
  ROUTE_STATE_MACHINES,
  BROWSER_BUILDER_KINDS,
  RUNTIME_BUILDER_KINDS,
  OBSERVATION_OUTPUT_FIELDS,
  REQUIRED_SCREENSHOT_PATHS,
  SCREENSHOT_DESCRIPTOR_BY_ACTION_ID,
  EXECUTABLE_REGISTRY_KEY_SHA256,
  SCENARIO_BY_PREFIX,
  PAGE_IDENTITY,
  FIXTURE_CAPTURE_BY_ACTION,
  FIXTURE_SUBJECT_CAPTURE,
  RUNTIME_CAPTURE_BY_ACTION,
  RUNTIME_CAPTURE_EXPRESSIONS,
  CAPTURE_INPUTS_BY_EXPRESSION,
} from "./task-540-smoke/contract/metadata.mjs";
import {
  schemaLiteral,
  schemaBoolean,
  schemaNull,
  schemaString,
  schemaNumber,
  schemaInteger,
  schemaArray,
  schemaTuple,
  schemaObject,
  schemaUnion,
  outputRef,
  literalPredicateRef,
  deepEqualPredicate,
  andPredicate,
  comparePredicate,
  sameSetPredicate,
  notPredicate,
  withinPredicate,
  everyPredicate,
  varRef,
  lengthRef,
  jsonTransport,
  nativeExactTransport,
  nativeSessionAbsenceTransport,
  outputContract,
  outputEquals,
  outputNonEmpty,
  outputLengthEquals,
  assertExactUnitOutputValue,
  capturePredicateRef,
  fixturePredicateRef,
  priorPredicateRef,
  pathPredicateRef,
  arrayPredicateRef,
  subtractionPredicateRef,
  observationRef,
  observationEquals,
  observationEqualsRef,
  observationNonEmpty,
  observationLengthEquals,
  positiveRectRefPredicate,
  zeroRectRefPredicate,
  everyPositiveObservationRect,
  everyZeroObservationRect,
} from "./task-540-smoke/contract/contract-dsl.mjs";
import {
  parseBuilderAst,
  parseBuilderKind,
  literalRef,
  compileArgumentRef,
  validateRefDescriptor,
  captureNamesRequiredByRef,
  repositoryMutationPolicy,
  parseAssertionName,
  collectTaggedReferences,
  executableRefs,
  collectRefDescriptors,
} from "./task-540-smoke/contract/references.mjs";



import {
  createLogProjectionSchema,
  createCleanLogPredicate,
  captureValueSchema,
  createRuntimeCaptureBindingsSchema,
  materializeEditableContentSchema,
  createBaseOutputSchemas,
  nullableSchema,
  createRectSchema,
  createPreferenceValueSchema,
  createPreferenceResponseSchema,
  createThemeSampleSchema,
  createScreenBindingSchema,
  createObservationFieldSchema,
  positiveRectPredicate,
  successfulStatusPredicate,
  createObservationPredicate,
} from "./task-540-smoke/contract/output-contracts.mjs";




import {
  visibleStringSchema,
  visibleIdSchema,
  visibleUrlSchema,
  visibleUuidSchema,
  visibleStringArraySchema,
  visibleIdArraySchema,
  visibleUuidArraySchema,
  visibleRectArraySchema,
  createVisibleGeometrySampleSchema,
  createVisibleKeyStepSchema,
  createVisibleAriaPairSchema,
  createVisibleAssertionSchemas,
} from "./task-540-smoke/contract/visible-assertion-schemas.mjs";

import {
  visibleAssertionTargetRef,
  visibleTargetPredicate,
  expectedTabIdsRef,
  expectedTabLabelsRef,
  expectedTabTextRef,
  expectedRelatedIdsRef,
  geometrySamplesPredicate,
  createVisibleAssertionPredicate,
} from "./task-540-smoke/contract/visible-assertion-predicates.mjs";

import {
  createSpecialVisibleAssertionContracts,
  createVisibleAssertionTargetRegistry,
  createVisibleAssertionRegistry,
  createObservationRegistry,
} from "./task-540-smoke/contract/assertion-registries.mjs";

function routeOutputSchemaId(key, operation) {
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

function commandOutputSchemaId(action, ast) {
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

function createBuilderRegistry(manifest) {
  const executionClasses = new Set([...BROWSER_BUILDER_KINDS, ...RUNTIME_BUILDER_KINDS]);
  invariant(
    sameSet([...executionClasses], Object.keys(REQUIRED_BUILDER_KIND_COUNTS)),
    "builder execution-class registry set drift"
  );
  const registry = Object.create(null);
  for (const kind of Object.keys(REQUIRED_BUILDER_KIND_COUNTS)) {
    const allowedBuilders = [
      ...new Set(manifest.filter((action) => action.kind === kind).map(({ builder }) => builder)),
    ];
    invariant(allowedBuilders.length > 0, "builder kind has no exact invocations: " + kind);
    const arities = [
      ...new Set(allowedBuilders.map((builder) => parseBuilderAst(builder).args.length)),
    ];
    registry[kind] = deepFreezeExact({
      executionClass: BROWSER_BUILDER_KINDS.includes(kind) ? "browser" : "runtime",
      arities,
      allowedBuilders,
    });
  }
  return deepFreezeExact(registry);
}

function createOutputRegistry(observations, assertions, fixtureBlueprint) {
  const registry = { ...createBaseOutputSchemas(fixtureBlueprint) };
  for (const [name, descriptor] of Object.entries(observations)) {
    registry["observation:" + name] = descriptor;
  }
  for (const [name, descriptor] of Object.entries(assertions)) {
    registry["assertion:" + name] = descriptor;
  }
  return deepFreezeExact(registry);
}

function referencedCaptures(row) {
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

function resolveDependencyId(token, allIds, currentIndex) {
  const priorIds = allIds.slice(0, currentIndex);
  if (priorIds.includes(token)) return token;
  const matches = priorIds.filter((id) => id.startsWith(token + "-"));
  invariant(matches.length === 1, token + " must resolve to exactly one prior action");
  return matches[0];
}

function nativeOperationIdForAction(actionId) {
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

function compileExecutable(action, ast) {
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

function compileAction(row, index, allRows) {
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

import {
  selectorTemplate,
  staticSelector,
  createSelectorRegistry,
} from "./task-540-smoke/contract/selectors.mjs";

import {
  buildFixtureBlueprint,
  validateFixtureBlueprint,
} from "./task-540-smoke/contract/fixtures.mjs";



function expandCleanupActions(acquiredSubjects) {
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

function assertOrderedActionIds(manifest, ids, label) {
  let prior = -1;
  for (const id of ids) {
    const index = manifest.findIndex((action) => action.id === id);
    invariant(index > prior, label + " action order drift at " + id);
    prior = index;
  }
}


function validateExecutableShape(action) {
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

function canonicalContractJson(value) {
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

function deriveAuthRateProducerActionIds(manifest) {
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

function assertAuthRateProducerCoverage(manifest, costsByAction) {
  const producerActionIds = deriveAuthRateProducerActionIds(manifest);
  const costActionIds = new Set(Object.keys(costsByAction));
  invariant(
    sameSet([...producerActionIds], [...costActionIds]),
    "auth rate producer classification/cost ledger drift"
  );
}

function computeAuthRatePlan(manifest, costsByAction = AUTH_RATE_COSTS_BY_ACTION) {
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

function validateManifest(manifest) {
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

function assertOrderedTransitions(manifest, transitions, label) {
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

function validateStateMachines(manifest) {
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

function createRouteRegistry(fixtureBlueprint) {
  const registry = Object.create(null);
  for (const [key, machine] of Object.entries(ROUTE_STATE_MACHINES)) {
    invariant(Object.hasOwn(fixtureBlueprint.routes, key), "fixture route is missing: " + key);
    registry[key] = deepFreezeExact({
      mode: machine.mode,
      method: machine.method,
      operations: machine.operations,
      states: machine.states,
      fixture: fixtureBlueprint.routes[key],
    });
  }
  return deepFreezeExact(registry);
}

function createStateMachineRegistry() {
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

function publicOutputContract(contract, label) {
  exactKeys(contract, ["grammar", "schema", "predicate", "rememberAs"], label);
  return deepFreezeExact({
    grammar: contract.grammar,
    schema: contract.schema,
    predicate: contract.predicate,
    rememberAs: contract.rememberAs,
  });
}

function publicOutputRegistry(registry, label) {
  return deepFreezeExact(
    Object.fromEntries(
      Object.entries(registry).map(([id, contract]) => [
        id,
        publicOutputContract(contract, label + "." + id),
      ])
    )
  );
}

function assertUniqueRegistryEntries(entries, label) {
  invariant(Array.isArray(entries), label + " entries must be an array");
  const keys = entries.map(([key]) => key);
  invariant(new Set(keys).size === keys.length, label + " contains a duplicate key");
}

function validateExecutableRegistryProjection(registries, manifest) {
  exactKeys(
    registries,
    ["runtimeOperations", "browserRunCodeSources", "browserNativeOperations", "screenshotPaths"],
    "executable registries"
  );
  assertClosedDataTree(registries, "executable registries");
  invariant(
    Object.getPrototypeOf(registries) === Object.prototype,
    "executable registry container must be plain"
  );
  for (const registryName of [
    "runtimeOperations",
    "browserRunCodeSources",
    "browserNativeOperations",
    "screenshotPaths",
  ]) {
    invariant(
      [Object.prototype, null].includes(Object.getPrototypeOf(registries[registryName])),
      registryName + " registry prototype drift"
    );
  }
  const expectedKeys = {
    runtimeOperations: manifest
      .filter(({ executable }) => executable.type === "runtime-operation")
      .map(({ executable }) => executable.operationId),
    browserRunCodeSources: manifest
      .filter(({ executable }) => executable.type === "browser-run-code")
      .map(({ executable }) => executable.sourceId),
  };
  for (const registryName of ["runtimeOperations", "browserRunCodeSources"]) {
    const keys = Object.keys(registries[registryName]);
    invariant(sameSet(keys, expectedKeys[registryName]), registryName + " manifest set drift");
    const keySha256 = createHash("sha256").update(JSON.stringify(keys)).digest("hex");
    invariant(
      keySha256 === EXECUTABLE_REGISTRY_KEY_SHA256[registryName],
      registryName + " physical key drift: " + keySha256
    );
  }
  for (const action of manifest) {
    const executable = action.executable;
    if (executable.type === "runtime-operation") {
      const descriptor = registries.runtimeOperations[executable.operationId];
      invariant(
        Object.getPrototypeOf(descriptor) === Object.prototype,
        executable.operationId + " descriptor prototype drift"
      );
      exactKeys(descriptor, ["actionId", "refCount"], executable.operationId);
      invariant(
        descriptor.actionId === action.id && descriptor.refCount === executable.refs.length,
        executable.operationId + " descriptor/action Ref drift"
      );
    } else if (executable.type === "browser-run-code") {
      const descriptor = registries.browserRunCodeSources[executable.sourceId];
      invariant(
        Object.getPrototypeOf(descriptor) === Object.prototype,
        executable.sourceId + " descriptor prototype drift"
      );
      exactKeys(descriptor, ["actionId", "refCount"], executable.sourceId);
      invariant(
        descriptor.actionId === action.id && descriptor.refCount === executable.refs.length,
        executable.sourceId + " descriptor/action Ref drift"
      );
    }
  }
  invariant(
    sameSet(Object.keys(registries.browserNativeOperations), BROWSER_NATIVE_OPERATION_IDS),
    "native registry key drift"
  );
  for (const operationId of BROWSER_NATIVE_OPERATION_IDS) {
    const descriptor = registries.browserNativeOperations[operationId];
    invariant(
      Object.getPrototypeOf(descriptor) === Object.prototype,
      operationId + " native descriptor prototype drift"
    );
    exactKeys(descriptor, ["operationId", "actionIds"], operationId + " native descriptor");
    invariant(
      descriptor.operationId === operationId &&
        JSON.stringify(descriptor.actionIds) ===
          JSON.stringify(
            manifest
              .filter(
                ({ executable }) =>
                  executable.type === "browser-native" && executable.operationId === operationId
              )
              .map(({ id }) => id)
          ),
      operationId + " native action mapping drift"
    );
  }
  invariant(
    JSON.stringify(registries.screenshotPaths) ===
      JSON.stringify(
        Object.fromEntries(
          Object.values(SCREENSHOT_DESCRIPTOR_BY_ACTION_ID).map(({ screenshotId, path }) => [
            screenshotId,
            path,
          ])
        )
      ),
    "screenshot registry literal mapping drift"
  );
}

function createExecutableRegistries(manifest) {
  const runtimeOperations = Object.create(null);
  const browserRunCodeSources = Object.create(null);
  const browserNativeOperations = Object.create(null);
  const screenshotPaths = Object.create(null);
  invariant(
    sameSet(
      manifest
        .filter(({ executable }) => executable.type === "browser-screenshot")
        .map(({ id }) => id),
      Object.keys(SCREENSHOT_DESCRIPTOR_BY_ACTION_ID)
    ),
    "screenshot action/descriptor key drift"
  );
  for (const operationId of BROWSER_NATIVE_OPERATION_IDS) {
    browserNativeOperations[operationId] = deepFreezeExact({
      operationId,
      actionIds: manifest
        .filter(
          ({ executable }) =>
            executable.type === "browser-native" && executable.operationId === operationId
        )
        .map(({ id }) => id),
    });
  }
  for (const action of manifest) {
    const { executable } = action;
    if (executable.type === "runtime-operation") {
      invariant(
        !Object.hasOwn(runtimeOperations, executable.operationId),
        "duplicate runtime operation"
      );
      runtimeOperations[executable.operationId] = deepFreezeExact({
        actionId: action.id,
        refCount: executable.refs.length,
      });
    } else if (executable.type === "browser-run-code") {
      invariant(
        !Object.hasOwn(browserRunCodeSources, executable.sourceId),
        "duplicate run-code source"
      );
      browserRunCodeSources[executable.sourceId] = deepFreezeExact({
        actionId: action.id,
        refCount: executable.refs.length,
      });
    }
  }
  for (const descriptor of Object.values(SCREENSHOT_DESCRIPTOR_BY_ACTION_ID)) {
    invariant(!Object.hasOwn(screenshotPaths, descriptor.screenshotId), "duplicate screenshot ID");
    screenshotPaths[descriptor.screenshotId] = descriptor.path;
  }
  for (const action of manifest.filter(
    ({ executable }) => executable.type === "browser-screenshot"
  )) {
    const descriptor = SCREENSHOT_DESCRIPTOR_BY_ACTION_ID[action.id];
    invariant(
      action.executable.screenshotId === descriptor.screenshotId &&
        action.repositoryMutationPolicy.paths.length === 1 &&
        action.repositoryMutationPolicy.paths[0] === descriptor.path &&
        screenshotPaths[descriptor.screenshotId] === descriptor.path,
      action.id + " screenshot descriptor mapping drift"
    );
  }
  invariant(Object.keys(runtimeOperations).length === 76, "runtime registry cardinality drift");
  invariant(
    Object.keys(browserRunCodeSources).length === 392,
    "run-code registry cardinality drift"
  );
  invariant(Object.keys(browserNativeOperations).length === 7, "native registry cardinality drift");
  invariant(Object.keys(screenshotPaths).length === 13, "screenshot registry cardinality drift");
  invariant(
    sameSet(Object.values(screenshotPaths), REQUIRED_SCREENSHOT_PATHS),
    "screenshot registry path-set drift"
  );
  const registries = deepFreezeExact({
    runtimeOperations,
    browserRunCodeSources,
    browserNativeOperations,
    screenshotPaths,
  });
  validateExecutableRegistryProjection(registries, manifest);
  return registries;
}

function createRegistries(manifest, fixtureBlueprint) {
  const privateObservations = createObservationRegistry(manifest, fixtureBlueprint);
  const visibleAssertionTargets = createVisibleAssertionTargetRegistry();
  const privateVisibleAssertions = createVisibleAssertionRegistry(visibleAssertionTargets);
  const privateOutputs = createOutputRegistry(
    privateObservations,
    privateVisibleAssertions,
    fixtureBlueprint
  );
  const privateBuilders = createBuilderRegistry(manifest);
  const selectors = createSelectorRegistry();
  const executableRegistries = createExecutableRegistries(manifest);
  const builders = deepFreezeExact(
    Object.fromEntries(
      Object.entries(privateBuilders).map(([kind, descriptor]) => [
        kind,
        deepFreezeExact({
          executionClass: descriptor.executionClass,
          arities: descriptor.arities,
          allowedBuilders: descriptor.allowedBuilders,
        }),
      ])
    )
  );
  const observations = publicOutputRegistry(privateObservations, "observations");
  const visibleAssertions = publicOutputRegistry(privateVisibleAssertions, "visible assertions");
  const outputs = publicOutputRegistry(privateOutputs, "outputs");
  const registries = deepFreezeExact({
    selectors,
    paths: fixtureBlueprint.paths,
    builders,
    runtimeOperations: executableRegistries.runtimeOperations,
    browserRunCodeSources: executableRegistries.browserRunCodeSources,
    browserNativeOperations: executableRegistries.browserNativeOperations,
    screenshotPaths: executableRegistries.screenshotPaths,
    observations,
    visibleAssertionTargets,
    visibleAssertions,
    routes: createRouteRegistry(fixtureBlueprint),
    outputs,
    privateProjectionBindings: deepFreezeExact({
      authorityId: "editable-content-type-detail",
      outputSchemaId: "editable-content-type-detail",
      materializerId: "buildDefaultListViewDefinition",
      producerActionIds: ["set-017-editable-type-proof"],
      consumerActionIds: ["set-035-screen-create", "set-037-retry-screen-create"],
    }),
  });
  exactKeys(
    registries,
    [
      "selectors",
      "paths",
      "builders",
      "runtimeOperations",
      "browserRunCodeSources",
      "browserNativeOperations",
      "screenshotPaths",
      "observations",
      "visibleAssertionTargets",
      "visibleAssertions",
      "routes",
      "outputs",
      "privateProjectionBindings",
    ],
    "smoke registries"
  );
  const privateBinding = registries.privateProjectionBindings;
  exactKeys(
    privateBinding,
    ["authorityId", "outputSchemaId", "materializerId", "producerActionIds", "consumerActionIds"],
    "private projection binding"
  );
  invariant(
    privateBinding.authorityId === "editable-content-type-detail" &&
      privateBinding.outputSchemaId === "editable-content-type-detail" &&
      privateBinding.materializerId === "buildDefaultListViewDefinition" &&
      JSON.stringify(privateBinding.producerActionIds) ===
        JSON.stringify(["set-017-editable-type-proof"]) &&
      JSON.stringify(privateBinding.consumerActionIds) ===
        JSON.stringify(["set-035-screen-create", "set-037-retry-screen-create"]),
    "private projection authority drift"
  );
  const privateProducer = manifest.find(({ id }) => id === privateBinding.producerActionIds[0]);
  invariant(
    privateProducer?.outputSchemaId === privateBinding.outputSchemaId,
    "private projection producer schema drift"
  );
  for (const consumerId of privateBinding.consumerActionIds) {
    const consumer = manifest.find(({ id }) => id === consumerId);
    invariant(
      consumer?.executable.type === "runtime-operation" &&
        consumer.ordinal > privateProducer.ordinal,
      consumerId + " private projection consumer drift"
    );
  }
  const refContext = {
    fixtureBlueprint,
    selectors,
    fixtureRefPaths: REQUIRED_FIXTURE_REF_PATHS,
    captureNames: [...REQUIRED_CAPTURE_NAMES, ...REQUIRED_RUNTIME_BLOCK_CAPTURES],
    actionIds: manifest.map(({ id }) => id),
  };
  const captureProducerByName = Object.fromEntries(
    Object.entries({
      ...FIXTURE_CAPTURE_BY_ACTION,
      ...RUNTIME_CAPTURE_BY_ACTION,
    }).flatMap(([actionId, names]) => names.map((name) => [name, actionId]))
  );
  const usedFixturePaths = [];
  const usedRefOperations = [];
  for (const action of manifest) {
    const ast = parseBuilderAst(action.builder);
    const builder = privateBuilders[action.kind];
    invariant(
      builder.allowedBuilders.includes(action.builder),
      action.id + " builder is not allowlisted"
    );
    invariant(
      builder.arities.includes(ast.args.length),
      action.id + " builder arity is not allowlisted"
    );
    invariant(
      commandOutputSchemaId(action, ast) === action.outputSchemaId,
      action.id + " output schema/parser identity drift"
    );
    invariant(registries.outputs[action.outputSchemaId] !== undefined, action.id + " output drift");
    const refs = executableRefs(action.executable);
    const expectedRefs =
      action.kind === "blocksBefore" || action.kind === "captureNew"
        ? ast.args.map((expression, index) =>
            index === 0
              ? literalRef(RUNTIME_CAPTURE_EXPRESSIONS[expression])
              : compileArgumentRef(expression)
          )
        : ast.args.map(compileArgumentRef);
    invariant(
      JSON.stringify(refs) === JSON.stringify(expectedRefs) ||
        action.executable.type === "browser-screenshot" ||
        action.executable.type === "browser-global-list",
      action.id + " executable Ref identity drift"
    );
    refs.forEach((ref, index) => {
      const allowSecret =
        action.executable.type === "browser-native" &&
        action.executable.operationId === "fill-secret" &&
        index === 1;
      validateRefDescriptor(
        ref,
        refContext,
        action.id + ".executable.refs[" + index + "]",
        0,
        allowSecret
      );
      for (const descriptor of collectRefDescriptors(ref)) {
        usedRefOperations.push(descriptor.op);
        if (descriptor.op === "fixture") usedFixturePaths.push(descriptor.path.join("."));
      }
      for (const captureName of captureNamesRequiredByRef(ref, refContext)) {
        const producerId = captureProducerByName[captureName];
        const producerIndex = manifest.findIndex(({ id }) => id === producerId);
        invariant(
          producerId !== undefined,
          action.id + " capture producer is missing: " + captureName
        );
        invariant(
          producerIndex >= 0 && producerIndex < action.ordinal - 1,
          action.id + " capture producer is not earlier: " + captureName
        );
      }
    });
    if (action.kind === "assert") {
      const assertionName = ast.args[0];
      const targetRef = registries.visibleAssertionTargets[assertionName];
      if (targetRef !== undefined) {
        validateRefDescriptor(targetRef, refContext, action.id + ".visibleAssertionTarget");
        for (const captureName of captureNamesRequiredByRef(targetRef, refContext)) {
          const producerId = captureProducerByName[captureName];
          const producerIndex = manifest.findIndex(({ id }) => id === producerId);
          invariant(
            producerId !== undefined && producerIndex >= 0 && producerIndex < action.ordinal - 1,
            action.id + " target capture producer is not earlier: " + captureName
          );
        }
        for (const ref of collectRefDescriptors(targetRef)) {
          usedRefOperations.push(ref.op);
          if (ref.op === "fixture") usedFixturePaths.push(ref.path.join("."));
          if (ref.op !== "capture") continue;
          const producerId = Object.entries({
            ...FIXTURE_CAPTURE_BY_ACTION,
            ...RUNTIME_CAPTURE_BY_ACTION,
          }).find(([, names]) => names.includes(ref.name))?.[0];
          invariant(
            producerId !== undefined,
            action.id + " target capture producer is missing: " + ref.name
          );
          const producerOrdinal = manifest.findIndex(({ id }) => id === producerId);
          invariant(
            producerOrdinal >= 0 && producerOrdinal < action.ordinal - 1,
            action.id + " target capture is not available yet: " + ref.name
          );
        }
      }
    }
  }
  invariant(
    sameSet(
      [...new Set(usedRefOperations)],
      ["literal", "path", "selector", "secret", "capture", "fixture"]
    ),
    "exact Ref operation universe drift"
  );
  invariant(
    sameSet([...new Set(usedFixturePaths)], REQUIRED_FIXTURE_REF_PATHS),
    "fixture leaf registry usage drift"
  );
  return registries;
}

export function buildTask540SmokePlan(input) {
  invariant(arguments.length === 1, "plan builder requires one argument object");
  invariant(
    input !== null &&
      typeof input === "object" &&
      !Array.isArray(input) &&
      Object.getPrototypeOf(input) === Object.prototype,
    "plan input must be a plain object"
  );
  const descriptors = Object.getOwnPropertyDescriptors(input);
  exactKeys(descriptors, ["nonce"], "plan input descriptors");
  const nonceDescriptor = descriptors.nonce;
  invariant(
    Object.hasOwn(nonceDescriptor, "value") &&
      !Object.hasOwn(nonceDescriptor, "get") &&
      !Object.hasOwn(nonceDescriptor, "set") &&
      nonceDescriptor.enumerable === true,
    "plan nonce must be one enumerable data property"
  );
  const nonce = nonceDescriptor.value;
  invariant(
    typeof nonce === "string" && NONCE_PATTERN.test(nonce),
    "nonce must be 12 lowercase hex characters"
  );
  const manifest = RAW_ACTION_ROWS.map(compileAction);
  validateManifest(manifest);
  validateStateMachines(manifest);
  const fixtureBlueprint = buildFixtureBlueprint(nonce);
  validateFixtureBlueprint(fixtureBlueprint);
  const registries = createRegistries(manifest, fixtureBlueprint);
  return deepFreezeExact({
    schemaVersion: 1,
    nonce,
    prefix: fixtureBlueprint.fixturePrefix,
    fixtureBlueprint,
    actionManifest: manifest,
    requiredScenarios: REQUIRED_SCENARIOS,
    requiredAssertions: REQUIRED_SMOKE_ASSERTIONS,
    requiredFixtureSubjectKeys: REQUIRED_FIXTURE_SUBJECT_KEYS,
    requiredCaptureNames: REQUIRED_CAPTURE_NAMES,
    requiredRuntimeBlockCaptures: REQUIRED_RUNTIME_BLOCK_CAPTURES,
    requiredScreenshotPaths: REQUIRED_SCREENSHOT_PATHS,
    requiredBuilderKindCounts: REQUIRED_BUILDER_KIND_COUNTS,
    fixtureCaptureBindings: FIXTURE_CAPTURE_BY_ACTION,
    runtimeCaptureBindings: RUNTIME_CAPTURE_BY_ACTION,
    fixtureSubjectCapture: FIXTURE_SUBJECT_CAPTURE,
    requiredIsolatedApiActionIds: REQUIRED_ISOLATED_API_ACTION_IDS,
    requiredSignoutSettlementIds: REQUIRED_SIGNOUT_SETTLEMENT_IDS,
    requiredMetadataStateValues: REQUIRED_METADATA_STATE_VALUES,
    requiredAuthRatePlan: REQUIRED_AUTH_RATE_PLAN,
    maxPreferenceUnmountWindowMs: MAX_PREFERENCE_UNMOUNT_WINDOW_MS,
    screenPreferenceSettledRetentionMs: SCREEN_PREFERENCE_SETTLED_RETENTION_MS,
    stateMachines: createStateMachineRegistry(),
    registries,
  });
}

function expectContractFailure(callback, label) {
  let failed = false;
  try {
    callback();
  } catch {
    failed = true;
  }
  invariant(failed, label + " must fail closed");
}

function assertRecursivelyFrozen(value, seen = new WeakSet()) {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return;
  if (seen.has(value)) return;
  seen.add(value);
  invariant(Object.isFrozen(value), "plan contains a mutable nested value");
  for (const key of Reflect.ownKeys(value)) assertRecursivelyFrozen(value[key], seen);
}

function assertJsonSerializablePlan(value, path = "$", ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    invariant(Number.isFinite(value), path + " contains a non-finite number");
    return;
  }
  invariant(typeof value === "object", path + " contains a non-JSON value");
  invariant(!ancestors.has(value), path + " contains a cycle");
  const prototype = Object.getPrototypeOf(value);
  invariant(
    Array.isArray(value) || prototype === Object.prototype || prototype === null,
    path + " contains a non-plain object"
  );
  const ownKeys = Object.keys(value);
  const reflectedKeys = Reflect.ownKeys(value);
  if (Array.isArray(value)) {
    invariant(
      ownKeys.length === value.length &&
        ownKeys.every((key, index) => key === String(index)) &&
        reflectedKeys.length === ownKeys.length + 1 &&
        reflectedKeys.at(-1) === "length",
      path + " contains an array hole or custom key"
    );
  } else {
    invariant(
      reflectedKeys.length === ownKeys.length &&
        reflectedKeys.every((key, index) => key === ownKeys[index]),
      path + " contains a non-enumerable or symbol key"
    );
  }
  ancestors.add(value);
  for (const key of ownKeys) {
    assertJsonSerializablePlan(value[key], path + "." + key, ancestors);
  }
  ancestors.delete(value);
}

function assertCanonicalJsonRoundTrip(value) {
  assertJsonSerializablePlan(value);
  const serialized = JSON.stringify(value);
  invariant(typeof serialized === "string", "plan did not serialize to JSON");
  const reparsed = JSON.parse(serialized);
  invariant(
    JSON.stringify(reparsed) === serialized,
    "plan JSON round-trip changed its canonical byte representation"
  );
}

function replaceManifestAction(manifest, index, overrides, extra = null) {
  const values = { ...manifest[index], ...overrides };
  const replacement = Object.fromEntries(ACTION_KEYS.map((key) => [key, values[key]]));
  if (extra) Object.assign(replacement, extra);
  const copy = manifest.slice();
  copy[index] = deepFreezeExact(replacement);
  return Object.freeze(copy);
}


function lookupExecutableRegistryDescriptor(plan, action) {
  const executable = action.executable;
  if (executable.type === "runtime-operation") {
    const descriptor = plan.registries.runtimeOperations[executable.operationId];
    invariant(
      descriptor?.actionId === action.id && descriptor.refCount === executable.refs.length,
      action.id + " runtime registry lookup drift"
    );
    return descriptor;
  }
  if (executable.type === "browser-run-code") {
    const descriptor = plan.registries.browserRunCodeSources[executable.sourceId];
    invariant(
      descriptor?.actionId === action.id && descriptor.refCount === executable.refs.length,
      action.id + " run-code registry lookup drift"
    );
    return descriptor;
  }
  if (executable.type === "browser-native") {
    const descriptor = plan.registries.browserNativeOperations[executable.operationId];
    invariant(
      descriptor?.operationId === executable.operationId &&
        descriptor.actionIds.includes(action.id),
      action.id + " native registry lookup drift"
    );
    return descriptor;
  }
  if (executable.type === "browser-screenshot") {
    const expected = SCREENSHOT_DESCRIPTOR_BY_ACTION_ID[action.id];
    const registeredPath = plan.registries.screenshotPaths[executable.screenshotId];
    invariant(
      expected?.screenshotId === executable.screenshotId &&
        expected.path === registeredPath &&
        action.repositoryMutationPolicy.paths[0] === registeredPath,
      action.id + " screenshot registry lookup drift"
    );
    return registeredPath;
  }
  invariant(
    executable.type === "browser-global-list" && action.id === "end-007-session-absence",
    action.id + " global-list registry lookup drift"
  );
  return true;
}

function runHermeticOneLoopExecutorSelfTest(plan) {
  const completed = new Set();
  const captures = new Map();
  const actionDispatches = [];
  const actionReceipts = [];
  const refContext = { fixtureBlueprint: plan.fixtureBlueprint };
  for (const action of plan.actionManifest) {
    invariant(action.ordinal === completed.size + 1, "one-loop ordinal drift");
    lookupExecutableRegistryDescriptor(plan, action);
    invariant(
      action.assertionDependencies.every((dependency) => completed.has(dependency)),
      action.id + " one-loop dependency drift"
    );
    for (const ref of executableRefs(action.executable)) {
      for (const captureName of captureNamesRequiredByRef(ref, refContext)) {
        invariant(captures.has(captureName), action.id + " resolved an unbound capture");
      }
    }
    actionDispatches.push(deepFreezeExact({ ordinal: action.ordinal, actionId: action.id }));
    for (const captureName of [
      ...(plan.fixtureCaptureBindings[action.id] ?? []),
      ...(plan.runtimeCaptureBindings[action.id] ?? []),
    ]) {
      invariant(!captures.has(captureName), action.id + " rebound a capture");
      captures.set(captureName, "self-test:" + captureName);
    }
    completed.add(action.id);
    actionReceipts.push(
      deepFreezeExact({
        ordinal: action.ordinal,
        actionId: action.id,
        partition: action.ordinal <= 55 ? "setup" : action.ordinal <= 489 ? "flow" : "terminal",
      })
    );
  }
  invariant(completed.size === 496, "one-loop completion drift");
  invariant(captures.size === 26, "one-loop capture binding drift");
  return deepFreezeExact({ actionDispatches, actionReceipts });
}

function createPrivateProjectionSelfTestHarness(plan) {
  const values = new WeakMap();
  const binding = plan.registries.privateProjectionBindings;
  const expectedSchema = materializeEditableContentSchema(
    plan.fixtureBlueprint.contentTypes.editable.fields
  );
  const bind = (authority, actionId, value) => {
    invariant(actionId === binding.producerActionIds[0], "private projection bind owner drift");
    invariant(authority && typeof authority === "object", "private projection authority drift");
    exactKeys(value, ["id", "slug", "name", "schema"], "private projection value");
    invariant(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value.id) &&
        value.slug === plan.fixtureBlueprint.contentTypes.editable.slug &&
        value.name === plan.fixtureBlueprint.contentTypes.editable.name &&
        JSON.stringify(value.schema) === JSON.stringify(expectedSchema),
      "private projection value drift"
    );
    invariant(!values.has(authority), "private projection rebound");
    values.set(authority, deepFreezeExact(structuredClone(value)));
  };
  const read = (authority, actionId, authorityId) => {
    invariant(authorityId === binding.authorityId, "private projection authority ID drift");
    invariant(binding.consumerActionIds.includes(actionId), "private projection reader drift");
    const value = values.get(authority);
    invariant(value !== undefined, "private projection read before bind");
    return value;
  };
  return { bind, read, expectedSchema };
}

export function runTask540SmokeContractSelfTest() {
  const plan = buildTask540SmokePlan({ nonce: "0123456789ab" });
  let negativeCases = 0;
  const negative = (callback, label) => {
    negativeCases += 1;
    expectContractFailure(callback, label);
  };
  invariant(plan.actionManifest.length === 496, "self-test action cardinality");
  invariant(plan.requiredFixtureSubjectKeys.length === 15, "self-test fixture cardinality");
  invariant(plan.requiredCaptureNames.length === 17, "self-test capture cardinality");
  invariant(
    plan.requiredRuntimeBlockCaptures.length === 9,
    "self-test runtime capture cardinality"
  );
  invariant(plan.requiredScreenshotPaths.length === 13, "self-test screenshot cardinality");
  const dirtyFlowHandoff = plan.actionManifest.find(({ id }) => id === "dg-003-builder");
  invariant(
    dirtyFlowHandoff?.precondition === "backend reset proven with browser draft dirty" &&
      dirtyFlowHandoff.captureOutput ===
        "exactly one accepted beforeunload plus exact URL/canvas" &&
      dirtyFlowHandoff.postcondition === "builder visible and Playwright dialog listener restored",
    "self-test dirty-flow beforeunload handoff drift"
  );
  invariant(
    RAW_VISIBLE_ASSERTION_ROWS.length === 48 &&
      RAW_VISIBLE_ASSERTION_ROWS.every((row) => row.length === 3),
    "self-test ordinary assertion metadata drift"
  );
  const assertionContracts = Object.values(plan.registries.visibleAssertions);
  invariant(assertionContracts.length === 55, "self-test visible assertion cardinality");
  for (const contract of assertionContracts) {
    exactKeys(
      contract,
      ["grammar", "schema", "predicate", "rememberAs"],
      "visible assertion contract"
    );
    invariant(
      contract.grammar.encoding === "json" &&
        contract.schema?.type !== undefined &&
        contract.predicate !== null &&
        typeof contract.predicate === "object" &&
        contract.rememberAs === null,
      "self-test visible assertion OutputContract drift"
    );
  }
  invariant(
    assertionContracts.filter(({ schema }) => schema.properties?.assertion !== undefined).length ===
      48,
    "self-test ordinary assertion OutputContract cardinality"
  );
  const canonicalAdminRootUrl = plan.fixtureBlueprint.origins.admin + "/admin/";
  const expectedAuthObservationPredicate = andPredicate([
    outputEquals(["url"], canonicalAdminRootUrl),
    outputEquals(["userMenuVisible"], true),
    outputNonEmpty(["userName"]),
  ]);
  const assertExactAuthObservationPredicate = (predicate, label) => {
    invariant(
      JSON.stringify(predicate) === JSON.stringify(expectedAuthObservationPredicate),
      label + " exact canonical Admin-root predicate drift"
    );
  };
  for (const name of [
    "bootstrap-auth-identity-settled",
    "auth-identity-settled-users-a",
    "auth-identity-settled-users-b",
  ]) {
    assertExactAuthObservationPredicate(plan.registries.observations[name].predicate, name);
  }
  const missingAuthUrlPredicate = structuredClone(expectedAuthObservationPredicate);
  missingAuthUrlPredicate.items.shift();
  negative(
    () => assertExactAuthObservationPredicate(missingAuthUrlPredicate, "missing URL"),
    "auth observation missing exact Admin-root URL"
  );
  const wrongAuthUrlPredicate = structuredClone(expectedAuthObservationPredicate);
  wrongAuthUrlPredicate.items[0].right.value = plan.fixtureBlueprint.origins.admin + "/admin";
  negative(
    () => assertExactAuthObservationPredicate(wrongAuthUrlPredicate, "wrong URL"),
    "auth observation wrong canonical Admin-root URL"
  );
  const expectedUnitContract = outputContract({
    grammar: jsonTransport(),
    schema: schemaObject({ ok: schemaLiteral(true) }),
    predicate: outputEquals([], deepFreezeExact({ ok: true })),
  });
  invariant(
    JSON.stringify(plan.registries.outputs.unit) === JSON.stringify(expectedUnitContract),
    "self-test exact unit OutputContract drift"
  );
  assertExactUnitOutputValue({ ok: true });
  negative(() => assertExactUnitOutputValue(true), "scalar unit output");
  negative(
    () => assertExactUnitOutputValue({ ok: true, unknown: true }),
    "unknown unit output key"
  );
  negative(() => assertExactUnitOutputValue({ ok: false }), "false unit output value");
  assertRecursivelyFrozen(plan);
  assertCanonicalJsonRoundTrip(plan);
  const refs = plan.actionManifest.flatMap(({ executable }) =>
    executableRefs(executable).flatMap((ref) => collectRefDescriptors(ref))
  );
  invariant(
    sameSet(
      [...new Set(refs.map(({ op }) => op))],
      ["literal", "path", "selector", "secret", "capture", "fixture"]
    ),
    "self-test executable Ref discriminant drift"
  );
  invariant(
    refs
      .filter(({ op }) => op === "secret")
      .every(({ name }) => ["ADMIN_EMAIL", "ADMIN_PASSWORD"].includes(name)),
    "self-test secret Ref allowlist drift"
  );
  const mediaFieldOptionActions = plan.actionManifest.filter(({ id }) =>
    ["bi-049-image-bound-media", "bi-054-field-bound-media"].includes(id)
  );
  invariant(
    mediaFieldOptionActions.length === 2 &&
      mediaFieldOptionActions.every(
        ({ executable }) =>
          executable.type === "browser-run-code" &&
          executable.refs.length === 1 &&
          JSON.stringify(executable.refs[0]) ===
            JSON.stringify({
              op: "selector",
              templateId: "fieldOption",
              args: [
                { op: "literal", value: "Media Asset" },
                { op: "literal", value: "media" },
              ],
            })
      ),
    "self-test media field-option rendered label drift"
  );
  const mutationPaths = plan.actionManifest.flatMap(({ repositoryMutationPolicy }) => {
    invariant(
      (repositoryMutationPolicy.mode === "none" && repositoryMutationPolicy.paths.length === 0) ||
        (repositoryMutationPolicy.mode === "allowlist" &&
          repositoryMutationPolicy.paths.length === 1),
      "self-test repository mutation policy drift"
    );
    return repositoryMutationPolicy.paths;
  });
  invariant(
    sameSet(mutationPaths, REQUIRED_SCREENSHOT_PATHS),
    "self-test repository mutation path set drift"
  );
  const executableCounts = Object.fromEntries(
    Object.keys(REQUIRED_EXECUTABLE_TYPE_COUNTS).map((type) => [
      type,
      plan.actionManifest.filter(({ executable }) => executable.type === type).length,
    ])
  );
  invariant(
    JSON.stringify(executableCounts) === JSON.stringify(REQUIRED_EXECUTABLE_TYPE_COUNTS),
    "self-test executable partition drift"
  );
  invariant(
    Object.keys(plan.registries.runtimeOperations).length === 76 &&
      Object.keys(plan.registries.browserRunCodeSources).length === 392 &&
      Object.keys(plan.registries.browserNativeOperations).length === 7 &&
      Object.keys(plan.registries.screenshotPaths).length === 13,
    "self-test executable registry cardinality drift"
  );
  const oneLoopTrace = runHermeticOneLoopExecutorSelfTest(plan);
  invariant(
    oneLoopTrace.actionDispatches.length === 496 &&
      oneLoopTrace.actionReceipts.length === 496 &&
      oneLoopTrace.actionReceipts.every(
        (receipt, index) =>
          receipt.ordinal === index + 1 && receipt.actionId === plan.actionManifest[index].id
      ),
    "self-test one-loop execution/receipt drift"
  );
  invariant(
    oneLoopTrace.actionReceipts.filter(({ partition }) => partition === "setup").length === 55 &&
      oneLoopTrace.actionReceipts.filter(({ partition }) => partition === "flow").length === 434 &&
      oneLoopTrace.actionReceipts.filter(({ partition }) => partition === "terminal").length === 7,
    "self-test one-loop receipt partition drift"
  );
  const acquiredSubjects = REQUIRED_FIXTURE_SUBJECT_KEYS.map((kind, index) => ({
    kind,
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  }));
  const cleanup = expandCleanupActions(acquiredSubjects);
  invariant(cleanup.length === acquiredSubjects.length * 3, "dynamic cleanup cardinality");
  invariant(new Set(cleanup.map(({ id }) => id)).size === cleanup.length, "dynamic cleanup IDs");
  const incompleteAuthRateCosts = { ...AUTH_RATE_COSTS_BY_ACTION };
  delete incompleteAuthRateCosts["dg-029-save-click"];
  negative(
    () => computeAuthRatePlan(plan.actionManifest, incompleteAuthRateCosts),
    "missing auth rate producer cost"
  );
  const conditionalCsrfIndex = plan.actionManifest.findIndex(
    ({ id }) => id === "ru-046-a-metadata-enable"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, conditionalCsrfIndex, {
          builder: "click(S.metadata-unknown)",
        })
      ),
    "conditional CSRF producer signature drift"
  );
  negative(() => buildTask540SmokePlan({ nonce: "bad" }), "invalid nonce");
  negative(
    () => buildTask540SmokePlan({ nonce: "0123456789ab", unknown: true }),
    "unknown plan key"
  );
  let nonceGetterCalls = 0;
  const accessorInput = {};
  Object.defineProperty(accessorInput, "nonce", {
    enumerable: true,
    get() {
      nonceGetterCalls += 1;
      return "0123456789ab";
    },
  });
  negative(() => buildTask540SmokePlan(accessorInput), "accessor plan nonce");
  invariant(nonceGetterCalls === 0, "plan nonce getter was invoked");
  negative(
    () => validateManifest(replaceManifestAction(plan.actionManifest, 0, {}, { unknown: true })),
    "unknown action key"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, 0, {
          executable: { ...plan.actionManifest[0].executable, unknown: true },
        })
      ),
    "unknown executable key"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, 0, {
          executable: { type: "runtime-operation", refs: [] },
        })
      ),
    "missing executable key"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, 0, {
          assertionDependencies: [plan.actionManifest[1].id],
        })
      ),
    "future dependency"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, 1, { id: plan.actionManifest[0].id })
      ),
    "duplicate action ID"
  );
  const routeIndex = plan.actionManifest.findIndex(({ id }) => id === "bi-020-media-route-setup");
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, routeIndex, { routeStateBefore: "hit" })
      ),
    "route state mismatch"
  );
  const malformedRow = RAW_ACTION_ROWS[0].slice();
  malformedRow[3] = "missing -> terminal";
  negative(() => compileAction(malformedRow, 0, [malformedRow]), "malformed transition");
  negative(
    () => expandCleanupActions([{ kind: "media", id: "one", unknown: true }]),
    "unknown cleanup subject key"
  );
  negative(() => assertJsonSerializablePlan({ executable: () => true }), "function-valued plan");
  negative(() => assertJsonSerializablePlan({ missing: undefined }), "undefined-valued plan");
  negative(
    () => assertJsonSerializablePlan({ infinite: Number.POSITIVE_INFINITY }),
    "non-finite plan number"
  );
  const cyclicPlan = {};
  cyclicPlan.self = cyclicPlan;
  negative(() => assertJsonSerializablePlan(cyclicPlan), "cyclic plan");
  negative(() => assertJsonSerializablePlan({ date: new Date(0) }), "non-plain plan value");
  negative(() => compileArgumentRef("$UNREGISTERED_SECRET"), "unknown secret Ref");
  const refContext = {
    fixtureBlueprint: plan.fixtureBlueprint,
    selectors: plan.registries.selectors,
    fixtureRefPaths: REQUIRED_FIXTURE_REF_PATHS,
    captureNames: [...plan.requiredCaptureNames, ...plan.requiredRuntimeBlockCaptures],
    actionIds: plan.actionManifest.map(({ id }) => id),
  };
  negative(
    () => validateRefDescriptor({ op: "unknown" }, refContext, "unknown Ref"),
    "unknown Ref opcode"
  );
  negative(
    () =>
      validateRefDescriptor(
        { op: "fixture", path: ["screen", "id"] },
        refContext,
        "capture bypass Ref"
      ),
    "fixture capture bypass"
  );
  negative(
    () =>
      validateRefDescriptor(
        { op: "selector", templateId: "missing", args: [] },
        refContext,
        "unknown selector Ref"
      ),
    "unknown selector Ref"
  );
  negative(
    () =>
      repositoryMutationPolicy(
        { id: "self-test-screen", kind: "screen" },
        { args: ["unregistered-shot"] }
      ),
    "unregistered screenshot mutation"
  );

  const manifestWithAction = (index, replacement) => {
    const copy = plan.actionManifest.slice();
    copy[index] = deepFreezeExact(replacement);
    return Object.freeze(copy);
  };
  const executableExampleByType = Object.fromEntries(
    Object.keys(REQUIRED_EXECUTABLE_TYPE_COUNTS).map((type) => [
      type,
      plan.actionManifest.findIndex(({ executable }) => executable.type === type),
    ])
  );
  for (const [type, index] of Object.entries(executableExampleByType)) {
    const action = plan.actionManifest[index];
    const requiredKeys = EXECUTABLE_KEYS_BY_TYPE[type];
    const missingKey = requiredKeys.at(-1);
    const missingExecutable = { ...action.executable };
    delete missingExecutable[missingKey];
    negative(
      () =>
        validateManifest(
          replaceManifestAction(plan.actionManifest, index, {
            executable: missingExecutable,
          })
        ),
      type + " missing executable-union key"
    );
    negative(
      () =>
        validateManifest(
          replaceManifestAction(plan.actionManifest, index, {
            executable: { ...action.executable, extra: true },
          })
        ),
      type + " extra executable-union key"
    );
  }
  negative(
    () => validateManifest(Object.freeze(plan.actionManifest.slice(0, -1))),
    "incomplete 495-action mapping"
  );
  const firstActionWithoutOrdinal = { ...plan.actionManifest[0] };
  delete firstActionWithoutOrdinal.ordinal;
  negative(
    () => validateManifest(manifestWithAction(0, firstActionWithoutOrdinal)),
    "missing action key"
  );
  const runtimeIndex = executableExampleByType["runtime-operation"];
  const runCodeIndex = executableExampleByType["browser-run-code"];
  const nativeIndex = executableExampleByType["browser-native"];
  const screenshotIndex = executableExampleByType["browser-screenshot"];
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, runtimeIndex, {
          executable: {
            ...plan.actionManifest[runtimeIndex].executable,
            operationId: "runtime/unknown-action",
          },
        })
      ),
    "unknown runtime operation"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, runCodeIndex, {
          executable: {
            ...plan.actionManifest[runCodeIndex].executable,
            sourceId: "run-code/unknown-action",
          },
        })
      ),
    "unknown run-code source"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, nativeIndex, {
          executable: {
            ...plan.actionManifest[nativeIndex].executable,
            operationId: "unknown-native",
          },
        })
      ),
    "unknown native operation"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, screenshotIndex, {
          executable: {
            ...plan.actionManifest[screenshotIndex].executable,
            screenshotId: "screenshot/unknown-action",
          },
        })
      ),
    "unknown screenshot ID"
  );

  for (const unsupportedOp of [
    "rootPath",
    "array",
    "object",
    "prior",
    "output",
    "var",
    "sub",
    "length",
    "changedKeys",
  ]) {
    negative(
      () => validateRefDescriptor({ op: unsupportedOp }, refContext, unsupportedOp + " Ref"),
      "unsupported Ref discriminant " + unsupportedOp
    );
  }
  for (const invalidLiteral of [null, true, {}, [], "$ADMIN_PASSWORD", "ADMIN_PASSWORD"]) {
    negative(
      () =>
        validateRefDescriptor(
          { op: "literal", value: invalidLiteral },
          refContext,
          "invalid literal Ref"
        ),
      "invalid or secret-shaped literal Ref"
    );
  }
  negative(
    () =>
      validateRefDescriptor(
        { op: "capture", name: "ADMIN_PASSWORD" },
        refContext,
        "secret-shaped capture Ref"
      ),
    "raw secret disguised as capture"
  );
  negative(
    () =>
      validateRefDescriptor(
        { op: "fixture", path: ["users", "bootstrap", "passwordEnv"] },
        refContext,
        "secret-shaped fixture Ref"
      ),
    "raw secret disguised as fixture"
  );
  negative(
    () =>
      validateRefDescriptor(
        {
          op: "selector",
          templateId: "palette",
          args: [{ op: "secret", name: "ADMIN_PASSWORD" }],
        },
        refContext,
        "nested selector secret Ref"
      ),
    "nested selector secret"
  );
  negative(
    () =>
      validateRefDescriptor(
        { op: "secret", name: "ADMIN_PASSWORD" },
        refContext,
        "non-native secret Ref"
      ),
    "secret outside native fill"
  );
  const emailFillIndex = plan.actionManifest.findIndex(({ id }) => id === "set-009-login-email");
  const emailFill = plan.actionManifest[emailFillIndex];
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, emailFillIndex, {
          executable: {
            ...emailFill.executable,
            refs: [emailFill.executable.refs[1], emailFill.executable.refs[0]],
          },
        })
      ),
    "native secret wrong index"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, emailFillIndex, {
          executable: {
            ...emailFill.executable,
            refs: [
              { op: "selector", templateId: "loginPassword", args: [] },
              emailFill.executable.refs[1],
            ],
          },
        })
      ),
    "native secret wrong selector"
  );
  for (const index of [runtimeIndex, runCodeIndex]) {
    const action = plan.actionManifest[index];
    negative(
      () =>
        validateManifest(
          replaceManifestAction(plan.actionManifest, index, {
            executable: {
              ...action.executable,
              refs: [{ op: "secret", name: "ADMIN_PASSWORD" }, ...action.executable.refs],
            },
          })
        ),
      action.executable.type + " secret placement"
    );
  }

  const earlyPathAction = {
    ...plan.actionManifest[6],
    builder: "goto(paths.entry)",
    executable: {
      ...plan.actionManifest[6].executable,
      refs: [{ op: "path", key: "entry" }],
    },
  };
  negative(
    () => createRegistries(manifestWithAction(6, earlyPathAction), plan.fixtureBlueprint),
    "path capture producer after consumer"
  );
  const outputMismatchIndex = plan.actionManifest.findIndex(
    ({ id }) => id === "set-017-editable-type-proof"
  );
  negative(
    () =>
      createRegistries(
        replaceManifestAction(plan.actionManifest, outputMismatchIndex, {
          outputSchemaId: "runtime-safe-projection",
        }),
        plan.fixtureBlueprint
      ),
    "private output schema/parser mismatch"
  );

  for (const registryName of ["runtimeOperations", "browserRunCodeSources"]) {
    const missing = {
      runtimeOperations: { ...plan.registries.runtimeOperations },
      browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
      browserNativeOperations: { ...plan.registries.browserNativeOperations },
      screenshotPaths: { ...plan.registries.screenshotPaths },
    };
    delete missing[registryName][Object.keys(missing[registryName])[0]];
    negative(
      () => validateExecutableRegistryProjection(missing, plan.actionManifest),
      registryName + " missing registry entry"
    );
    const extra = {
      ...missing,
      [registryName]: {
        ...plan.registries[registryName],
        extra: { actionId: "extra", refCount: 0 },
      },
    };
    negative(
      () => validateExecutableRegistryProjection(extra, plan.actionManifest),
      registryName + " extra registry entry"
    );
    const corrupt = {
      runtimeOperations: { ...plan.registries.runtimeOperations },
      browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
      browserNativeOperations: { ...plan.registries.browserNativeOperations },
      screenshotPaths: { ...plan.registries.screenshotPaths },
    };
    const corruptKey = Object.keys(corrupt[registryName])[0];
    corrupt[registryName][corruptKey] = { actionId: "wrong-action", refCount: 999 };
    negative(
      () => validateExecutableRegistryProjection(corrupt, plan.actionManifest),
      registryName + " corrupt descriptor"
    );
  }
  negative(
    () =>
      assertUniqueRegistryEntries(
        [
          ["one", 1],
          ["one", 2],
        ],
        "self-test registry"
      ),
    "duplicate registry key"
  );
  const nativeRegistryDrift = {
    runtimeOperations: { ...plan.registries.runtimeOperations },
    browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
    browserNativeOperations: {
      ...plan.registries.browserNativeOperations,
      "open-about-blank": {
        ...plan.registries.browserNativeOperations["open-about-blank"],
        actionIds: ["wrong-action"],
      },
    },
    screenshotPaths: { ...plan.registries.screenshotPaths },
  };
  negative(
    () => validateExecutableRegistryProjection(nativeRegistryDrift, plan.actionManifest),
    "native descriptor action mapping"
  );
  const cloneExecutableRegistries = () => ({
    runtimeOperations: { ...plan.registries.runtimeOperations },
    browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
    browserNativeOperations: { ...plan.registries.browserNativeOperations },
    screenshotPaths: { ...plan.registries.screenshotPaths },
  });
  const inheritedRegistry = cloneExecutableRegistries();
  inheritedRegistry.runtimeOperations = Object.assign(
    Object.create({ inheritedUnknown: true }),
    inheritedRegistry.runtimeOperations
  );
  negative(
    () => validateExecutableRegistryProjection(inheritedRegistry, plan.actionManifest),
    "inherited runtime registry member"
  );
  const inheritedDescriptorRegistry = cloneExecutableRegistries();
  const inheritedDescriptorKey = Object.keys(inheritedDescriptorRegistry.runtimeOperations)[0];
  inheritedDescriptorRegistry.runtimeOperations[inheritedDescriptorKey] = Object.assign(
    Object.create({ inheritedUnknown: true }),
    inheritedDescriptorRegistry.runtimeOperations[inheritedDescriptorKey]
  );
  negative(
    () => validateExecutableRegistryProjection(inheritedDescriptorRegistry, plan.actionManifest),
    "inherited runtime descriptor member"
  );
  for (const [label, install] of [
    [
      "undefined",
      (registry) => {
        registry.runtimeOperations.unknown = undefined;
      },
    ],
    [
      "symbol",
      (registry) => {
        registry.runtimeOperations[Symbol("unknown")] = true;
      },
    ],
    [
      "non-enumerable",
      (registry) => {
        Object.defineProperty(registry.runtimeOperations, "unknown", { value: true });
      },
    ],
  ]) {
    const registry = cloneExecutableRegistries();
    install(registry);
    negative(
      () => validateExecutableRegistryProjection(registry, plan.actionManifest),
      "registry non-data member: " + label
    );
  }
  let registryAccessorReads = 0;
  const accessorRegistry = cloneExecutableRegistries();
  Object.defineProperty(accessorRegistry.runtimeOperations, "unknown", {
    enumerable: true,
    get() {
      registryAccessorReads += 1;
      return true;
    },
  });
  negative(
    () => validateExecutableRegistryProjection(accessorRegistry, plan.actionManifest),
    "registry accessor member"
  );
  invariant(registryAccessorReads === 0, "registry accessor was invoked");
  const screenshotRegistryDrift = {
    runtimeOperations: { ...plan.registries.runtimeOperations },
    browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
    browserNativeOperations: { ...plan.registries.browserNativeOperations },
    screenshotPaths: { ...plan.registries.screenshotPaths },
  };
  const screenshotIds = Object.keys(screenshotRegistryDrift.screenshotPaths);
  [
    screenshotRegistryDrift.screenshotPaths[screenshotIds[0]],
    screenshotRegistryDrift.screenshotPaths[screenshotIds[1]],
  ] = [
    screenshotRegistryDrift.screenshotPaths[screenshotIds[1]],
    screenshotRegistryDrift.screenshotPaths[screenshotIds[0]],
  ];
  negative(
    () => validateExecutableRegistryProjection(screenshotRegistryDrift, plan.actionManifest),
    "screenshot ID/path swap"
  );

  const mutateBlueprint = (mutator) => {
    const blueprint = structuredClone(plan.fixtureBlueprint);
    mutator(blueprint);
    return blueprint;
  };
  for (const [label, mutator] of [
    [
      "origin",
      (blueprint) => {
        blueprint.origins.unknown = true;
      },
    ],
    [
      "user",
      (blueprint) => {
        blueprint.users.a.unknown = true;
      },
    ],
    [
      "content-type field",
      (blueprint) => {
        blueprint.contentTypes.editable.fields[0].unknown = true;
      },
    ],
  ]) {
    negative(
      () => validateFixtureBlueprint(mutateBlueprint(mutator)),
      "nested blueprint unknown key: " + label
    );
  }
  for (const [label, mutator] of [
    [
      "undefined",
      (blueprint) => {
        blueprint.users.a.unknown = undefined;
      },
    ],
    [
      "symbol",
      (blueprint) => {
        blueprint.users.a[Symbol("unknown")] = true;
      },
    ],
    [
      "non-enumerable",
      (blueprint) => {
        Object.defineProperty(blueprint.users.a, "unknown", { value: true });
      },
    ],
    [
      "custom prototype",
      (blueprint) => {
        Object.setPrototypeOf(blueprint.users.a, { inheritedUnknown: true });
      },
    ],
  ]) {
    negative(
      () => validateFixtureBlueprint(mutateBlueprint(mutator)),
      "nested blueprint non-data key: " + label
    );
  }
  let blueprintAccessorReads = 0;
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          Object.defineProperty(blueprint.users.a, "unknown", {
            enumerable: true,
            get() {
              blueprintAccessorReads += 1;
              return true;
            },
          });
        })
      ),
    "nested blueprint accessor"
  );
  invariant(blueprintAccessorReads === 0, "nested blueprint accessor was invoked");
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.data =
            "jVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        })
      ),
    "altered PNG bytes"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.data = blueprint.media.uploadFixture.data.slice(0, -1);
        })
      ),
    "non-canonical PNG base64 spelling"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.encoding = "hex";
        })
      ),
    "altered PNG encoding"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.sha256 = "0".repeat(64);
        })
      ),
    "altered PNG digest"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.decodedSizeBytes = 67;
        })
      ),
    "altered PNG size"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.unknown = true;
        })
      ),
    "extra PNG fixture key"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.path = "fixture.png";
        })
      ),
    "PNG fixture path authority"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.bytes = [137, 80, 78, 71];
        })
      ),
    "second PNG byte authority"
  );

  const projectionHarness = createPrivateProjectionSelfTestHarness(plan);
  const projectionAuthority = {};
  const projectionValue = {
    id: "00000000-0000-4000-8000-000000000017",
    slug: plan.fixtureBlueprint.contentTypes.editable.slug,
    name: plan.fixtureBlueprint.contentTypes.editable.name,
    schema: projectionHarness.expectedSchema,
  };
  projectionHarness.bind(projectionAuthority, "set-017-editable-type-proof", projectionValue);
  const firstProjectionRead = projectionHarness.read(
    projectionAuthority,
    "set-035-screen-create",
    "editable-content-type-detail"
  );
  invariant(
    firstProjectionRead ===
      projectionHarness.read(
        projectionAuthority,
        "set-037-retry-screen-create",
        "editable-content-type-detail"
      ) && Object.isFrozen(firstProjectionRead),
    "private projection single-bind/read identity drift"
  );
  negative(
    () =>
      projectionHarness.bind(projectionAuthority, "set-017-editable-type-proof", projectionValue),
    "private projection second bind"
  );
  negative(
    () => projectionHarness.bind({}, "set-016-editable-type-create", projectionValue),
    "private projection wrong binder"
  );
  negative(
    () => projectionHarness.read({}, "set-035-screen-create", "editable-content-type-detail"),
    "private projection read before bind"
  );
  negative(
    () =>
      projectionHarness.read(
        projectionAuthority,
        "set-036-screen-proof",
        "editable-content-type-detail"
      ),
    "private projection wrong reader"
  );
  negative(
    () => projectionHarness.read(projectionAuthority, "set-035-screen-create", "wrong-authority"),
    "private projection wrong authority ID"
  );
  negative(
    () =>
      projectionHarness.bind({}, "set-017-editable-type-proof", {
        ...projectionValue,
        schema: { ...projectionValue.schema, additionalProperties: true },
      }),
    "private projection altered schema"
  );

  const reorderedPlan = {
    ...plan,
    actionManifest: Object.freeze([
      plan.actionManifest[1],
      plan.actionManifest[0],
      ...plan.actionManifest.slice(2),
    ]),
  };
  negative(() => runHermeticOneLoopExecutorSelfTest(reorderedPlan), "reordered ordinal loop");
  const corruptLoopRegistries = {
    ...plan.registries,
    runtimeOperations: {
      ...plan.registries.runtimeOperations,
      [plan.actionManifest[runtimeIndex].executable.operationId]: {
        actionId: "wrong-action",
        refCount: 999,
      },
    },
  };
  negative(
    () =>
      runHermeticOneLoopExecutorSelfTest({
        ...plan,
        registries: corruptLoopRegistries,
      }),
    "one-loop corrupt executable registry lookup"
  );
  const replayedPlan = {
    ...plan,
    actionManifest: Object.freeze([
      plan.actionManifest[0],
      plan.actionManifest[0],
      ...plan.actionManifest.slice(2),
    ]),
  };
  negative(() => runHermeticOneLoopExecutorSelfTest(replayedPlan), "replayed ordinal loop");
  return Object.freeze({
    pass: true,
    actions: plan.actionManifest.length,
    setupActions: REQUIRED_SETUP_ACTION_COUNT,
    flowActions: REQUIRED_FLOW_ACTION_COUNT,
    cleanupActions: REQUIRED_TERMINAL_ACTION_COUNT,
    fixtures: plan.requiredFixtureSubjectKeys.length,
    captures: plan.requiredCaptureNames.length,
    screenshots: plan.requiredScreenshotPaths.length,
    assertions: Object.values(plan.requiredAssertions).flat().length,
    expandedCleanupActions: cleanup.length,
    executableTypeCounts: executableCounts,
    oneLoopReceipts: oneLoopTrace.actionReceipts.length,
    negativeCases,
  });
}

if (
  process.argv[1]?.endsWith("/task-540-smoke-contract.mjs") &&
  process.argv.includes("--self-test")
) {
  process.stdout.write(JSON.stringify(runTask540SmokeContractSelfTest()));
}

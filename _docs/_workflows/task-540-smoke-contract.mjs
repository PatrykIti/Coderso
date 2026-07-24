
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

import {
  routeOutputSchemaId,
  commandOutputSchemaId,
  referencedCaptures,
  resolveDependencyId,
  nativeOperationIdForAction,
  compileExecutable,
  compileAction,
  expandCleanupActions,
  assertOrderedActionIds,
  validateExecutableShape,
  canonicalContractJson,
  deriveAuthRateProducerActionIds,
  assertAuthRateProducerCoverage,
  computeAuthRatePlan,
  validateManifest,
  assertOrderedTransitions,
  validateStateMachines,
  createStateMachineRegistry,
} from "./task-540-smoke/contract/manifest.mjs";

import {
  createBuilderRegistry,
  createOutputRegistry,
  createRouteRegistry,
  publicOutputContract,
  publicOutputRegistry,
  assertUniqueRegistryEntries,
  validateExecutableRegistryProjection,
  createExecutableRegistries,
  createRegistries,
} from "./task-540-smoke/contract/registries.mjs";


import {
  selectorTemplate,
  staticSelector,
  createSelectorRegistry,
} from "./task-540-smoke/contract/selectors.mjs";

import {
  buildFixtureBlueprint,
  validateFixtureBlueprint,
} from "./task-540-smoke/contract/fixtures.mjs";







import { buildTask540SmokePlan } from "./task-540-smoke/contract/plan.mjs";
export { buildTask540SmokePlan };

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

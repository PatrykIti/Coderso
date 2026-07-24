import { BUTTON_IMAGE_ACTION_ROWS } from "../actions/button-image.mjs";
import { DIRTY_GUARD_ACTION_ROWS } from "../actions/dirty-guard.mjs";
import { RECOVERY_CACHE_ACTION_ROWS } from "../actions/recovery-cache.mjs";
import { RETENTION_USER_ACTION_ROWS } from "../actions/retention-user.mjs";
import { SETUP_ACTION_ROWS } from "../actions/setup.mjs";
import { SPACE_SELECTION_ACTION_ROWS } from "../actions/space-selection.mjs";
import { TABS_CONTENT_ACTION_ROWS } from "../actions/tabs-content.mjs";
import { TABS_KEYBOARD_ACTION_ROWS } from "../actions/tabs-keyboard.mjs";
import { TERMINAL_ACTION_ROWS } from "../actions/terminal.mjs";
import {
  andPredicate,
  assertExactUnitOutputValue,
  jsonTransport,
  outputContract,
  outputEquals,
  outputNonEmpty,
  schemaLiteral,
  schemaObject,
} from "../contract-dsl.mjs";
import { deepFreezeExact, exactKeys, invariant, sameSet } from "../core.mjs";
import { computeAuthRatePlan, expandCleanupActions, validateManifest } from "../manifest.mjs";
import { RAW_VISIBLE_ASSERTION_ROWS, REQUIRED_SCREENSHOT_PATHS } from "../metadata.mjs";
import { collectRefDescriptors, executableRefs } from "../references.mjs";
import {
  AUTH_RATE_COSTS_BY_ACTION,
  REQUIRED_EXECUTABLE_TYPE_COUNTS,
  REQUIRED_FIXTURE_SUBJECT_KEYS,
} from "../requirements.mjs";
import {
  assertCanonicalJsonRoundTrip,
  assertRecursivelyFrozen,
  replaceManifestAction,
  runHermeticOneLoopExecutorSelfTest,
} from "./helpers.mjs";

export function runPlanContractSelfTestSuite(plan, negative) {
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
  for (const rows of [
    SETUP_ACTION_ROWS,
    BUTTON_IMAGE_ACTION_ROWS,
    TABS_CONTENT_ACTION_ROWS,
    TABS_KEYBOARD_ACTION_ROWS,
    SPACE_SELECTION_ACTION_ROWS,
    DIRTY_GUARD_ACTION_ROWS,
    RECOVERY_CACHE_ACTION_ROWS,
    RETENTION_USER_ACTION_ROWS,
    TERMINAL_ACTION_ROWS,
  ]) {
    assertRecursivelyFrozen(rows);
  }
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
  return { executableCounts, oneLoopTrace, cleanup };
}

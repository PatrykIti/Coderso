# TASK-548-02-L01: Visual Scenario Manifest and Fixture Contract
# FileName: TASK-548-02-L01-Visual-Scenario-Manifest-And-Fixture-Contract.md

**Parent Subtask:** TASK-548-02
**Priority:** Critical
**Category:** Documentation Platform / Visual Contract / Security
**Estimated Effort:** Large
**Dependencies:** TASK-548-01
**Status:** ⏳ To Do

---

## Overview

Define the strict, local-only visual scenario DSL and synthetic fixture
lifecycle. Own new focused files under `scripts/docs/visual/contract/` and
`scripts/docs/visual/fixtures/` plus pure Vitest tests. Do not invoke
`playwright-cli`, capture/promote images, change `.gitignore` or edit CI here.

## Exact Scenario Shape

```ts
type DocsSemanticLocatorV1 =
  | { by: "role"; role: string; name: string; exact: boolean }
  | { by: "label"; name: string; exact: boolean }
  | { by: "text"; text: string; exact: boolean };

type DocsVisualActionV1 =
  | { action: "click"; target: DocsSemanticLocatorV1 }
  | { action: "fill"; target: DocsSemanticLocatorV1; fixtureValueRef: string }
  | { action: "select"; target: DocsSemanticLocatorV1; fixtureValueRef: string }
  | { action: "press"; target: DocsSemanticLocatorV1; key: string };

type DocsVisibleAssertionV1 =
  | { kind: "visible"; target: DocsSemanticLocatorV1 }
  | { kind: "text"; target: DocsSemanticLocatorV1; expected: string }
  | { kind: "aria"; target: DocsSemanticLocatorV1; attribute: string; expected: string }
  | { kind: "computed-style"; target: DocsSemanticLocatorV1; property: string; expected: string }
  | { kind: "geometry"; target: DocsSemanticLocatorV1; minWidth: number; minHeight: number };

type DocsVisualScenarioV1 = {
  schema: "coderso.docs-visual@v1";
  visualId: string;
  docId: string;
  sectionId: string;
  fixtureProfile: string;
  cleanupProfile: string;
  route: string;
  permissionRequirement: DocsPermissionRequirementV1 | null;
  viewport: { width: number; height: number; deviceScaleFactor: 1 };
  theme: "light" | "dark";
  locale: string;
  timezone: "UTC";
  actions: DocsVisualActionV1[];
  assertions: DocsVisibleAssertionV1[];
  captureTarget: DocsSemanticLocatorV1;
  capturePadding: number;
  alt: string;
  caption: string;
  watchPaths: string[];
  consolePolicy: "zero-errors";
};
```

All names and discriminator values above are exact. Unknown fields fail closed
at every level. Locators must be semantic and exact enough to resolve one
visible element; CSS/XPath, element indexes, `evaluate`, `run-code`, arbitrary
URLs and arbitrary shell commands are not manifest capabilities.

`fixtureValueRef` resolves from a code-owned fixture registry after scenario
validation. Manifests never contain passwords, tokens, real emails, free-form
customer data or environment-variable names. `route` must be a canonical local
`/admin...` path and may not include a host, query credentials or fragment.

## Fixture Lifecycle Contract

```ts
type DocsFixtureLease = {
  runId: string;
  profile: string;
  resourceRefs: { kind: string; id: string }[];
  values: Record<string, string>;
};

type DocsFixtureAdapter = {
  acquire(input: {
    runId: string;
    permissionRequirement: DocsPermissionRequirementV1 | null;
  }): Promise<DocsFixtureLease>;
  cleanup(lease: DocsFixtureLease): Promise<void>;
  assertAbsent(lease: DocsFixtureLease): Promise<void>;
};
```

Every fixture ID/name is prefixed with a random task-scoped `runId`. Adapters use
existing domain services or real admin APIs, preserve CSRF/RBAC, record exact
owned IDs and delete only those IDs. Settings are changed only through an
explicit snapshot/restore adapter. Cleanup runs in `finally` and an
`assertAbsent` failure makes the scenario fail.

Scenarios consume the exact TASK-548-01
`DocsPermissionRequirementV1`. Null represents an authenticated Admin route
with no extra catalog permission. `allOf` grants/tests every listed permission;
`anyOf` grants a deterministic canonical member unless the fixture profile
explicitly exercises another valid branch. Empty/malformed requirements and
partial `allOf` authorization fail closed.

## Security Contract

- **Endpoint visibility:** no new endpoint; fixture adapters call existing
  internal admin contracts only.
- **Auth/RBAC:** a scoped test account receives exactly declared permissions;
  wildcard admin is not the default fixture. Null means authenticated with no
  extra permission; `allOf`/`anyOf` use the shared exact semantics.
- **CSRF/rate limit:** existing unsafe-method CSRF and route buckets remain
  active. No direct DB mutation is allowed merely to bypass them in runtime
  scenarios.
- **Validation:** strict schema, canonical route and live permission-catalog
  validation, semantic locator allowlist, BCP-47 locale, fixed UTC timezone,
  bounded viewport/steps/assertions/text/watch paths.
- **Anti-abuse:** no public write, nonce/HMAC or CAPTCHA. No arbitrary JS,
  network host, shell, SQL, upload, redirect or retry loop in the DSL.
- **Privacy:** synthetic fixture registry only; reject secret-like refs/values,
  real-looking personal data and credential-bearing strings.

## Implementation Pseudocode

```ts
export function normalizeDocsVisualScenarioV1(value: unknown): DocsVisualScenarioV1 {
  const scenario = assertStrictSchema(value, docsVisualScenarioV1Schema);
  assertStableVisualIdentity(scenario.visualId, scenario.docId, scenario.sectionId);
  assertCanonicalAdminRoute(scenario.route);
  const permissionRequirement = normalizeDocsPermissionRequirementV1(
    scenario.permissionRequirement
  );
  assertSemanticLocators(scenario.actions, scenario.assertions, scenario.captureTarget);
  assertConfinedWatchPaths(scenario.watchPaths);
  return canonicalizeScenario({ ...scenario, permissionRequirement });
}

export async function withDocsFixtureLease<T>(
  scenario: DocsVisualScenarioV1,
  runId: string,
  run: (lease: DocsFixtureLease) => Promise<T>
) {
  const validatedRunId = assertBoundedDocsVisualRunId(runId);
  const adapter = resolveFixtureAdapter(scenario.fixtureProfile, scenario.cleanupProfile);
  const lease = await adapter.acquire({
    runId: validatedRunId,
    permissionRequirement: scenario.permissionRequirement,
  });
  let value: T | undefined;
  let primaryError: unknown;
  try {
    value = await run(lease);
  } catch (error) {
    primaryError = error;
  }
  const cleanup = await settleLifecycleStep(() => adapter.cleanup(lease));
  const absence = await settleLifecycleStep(() => adapter.assertAbsent(lease));
  const lifecycleError = combineFixtureLifecycleErrors({
    primaryError,
    cleanup,
    absence,
  });
  if (lifecycleError) throw lifecycleError;
  return value as T;
}
```

**Data flow:** unknown manifest → strict normalize/limits → cross-reference
v2 doc/section → validated caller-owned run ID → fixture adapter lookup → scoped
lease/value refs → runner input. The validated ID is passed unchanged through
lease acquisition and session cleanup. Only an explicit CI caller may generate
a random bounded, collision-checked run ID; this helper never replaces one.
No raw manifest value becomes executable code.

**Error handling:** use `docs_visual_scenario_invalid`,
`docs_visual_locator_unsafe`, `docs_visual_route_invalid`,
`docs_visual_permission_invalid`, `docs_visual_fixture_unknown`,
`docs_visual_fixture_acquire_failed`, `docs_visual_cleanup_failed` and
`docs_visual_fixture_residue`. The structured lifecycle diagnostic preserves
primary, cleanup and absence failure codes, while always executing
`assertAbsent`. Errors contain stable IDs and safe field paths, never fixture
values.

**Regression-test shape:** reject every unknown key, unsafe locator/route/key,
unknown permission/profile/value ref, non-UTC timezone, bad locale/viewport,
over-limit array/string and secret/PII-like value. Prove canonicalization,
doc/section referential checks, exact null/empty/partial/full/allOf/anyOf
semantics, unique resource ownership, cleanup after action/assertion/capture
failures, `assertAbsent` execution after cleanup failure and preservation of all
structured lifecycle errors. Prove a supplied bounded run ID round-trips
unchanged, invalid IDs reject before acquire, and only the explicit CI caller
may generate an ID.

## Sub-Tasks

- [ ] Implement the exact types/schema/normalizer and bounded diagnostics.
- [ ] Add a small registry of representative synthetic fixture profiles using
  existing domain contracts and scoped cleanup.
- [ ] Add `tests/vitest/documentation/docs-visual-scenario.test.ts` and
  `docs-visual-fixtures.test.ts`; keep fixtures/support modules independent and
  below 1,000 lines.
- [ ] Add
  `tests/integration/server/docsVisualFixtureLifecycle.test.ts` for real
  internal admin API acquire/use/cleanup/absence behavior with scoped fixtures.

## Testing Requirements

- `bunx vitest run --config vitest.config.ts tests/vitest/documentation/docs-visual-scenario.test.ts tests/vitest/documentation/docs-visual-fixtures.test.ts`
- Before the runtime lane: `set -a && source .env && set +a`
- `bun test tests/integration/server/docsVisualFixtureLifecycle.test.ts` when
  `DATABASE_URL` is reachable; prove real CSRF, scoped RBAC, acquire, cleanup,
  residue detection and owned-row-only deletion
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- touched-file line counts

## Documentation Updates Required

Send the exact DSL, fixture ownership and cleanup rules to the TASK-548 closure
owner. Do not create an alternative visual authoring format.

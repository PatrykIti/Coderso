# TASK-548-02-L01: Visual Scenario Manifest and Fixture Contract
# FileName: TASK-548-02-L01-Visual-Scenario-Manifest-And-Fixture-Contract.md

**Parent Subtask:** TASK-548-02
**Priority:** Critical
**Category:** Documentation Platform / Visual Contract / Security
**Estimated Effort:** Large
**Dependencies:** TASK-548-01
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Define the strict, local-only visual scenario DSL and synthetic fixture
lifecycle. Own new focused files under `scripts/docs/visual/contract/` and
`scripts/docs/visual/fixtures/` plus pure Vitest tests. Do not invoke
`playwright-cli`, capture/promote images, change `.gitignore` or edit CI here.

## Exact Scenario Shape

```ts
type DocsSemanticLocatorV1 =
  | { by: "role"; role: DocsVisualLocatorRoleV1; name: string; exact: boolean }
  | { by: "label"; name: string; exact: boolean }
  | { by: "text"; text: string; exact: boolean };

type DocsVisualActionV1 =
  | { action: "click"; target: DocsSemanticLocatorV1 }
  | { action: "fill"; target: DocsSemanticLocatorV1; fixtureValueRef: string }
  | { action: "select"; target: DocsSemanticLocatorV1; fixtureValueRef: string }
  | { action: "press"; target: DocsSemanticLocatorV1; key: DocsVisualKeyV1 };

type DocsVisibleAssertionV1 =
  | { kind: "visible"; target: DocsSemanticLocatorV1 }
  | { kind: "text"; target: DocsSemanticLocatorV1; expected: string }
  | { kind: "aria"; target: DocsSemanticLocatorV1; attribute: DocsVisualAriaAttributeV1; expected: string }
  | { kind: "computed-style"; target: DocsSemanticLocatorV1; property: DocsVisualComputedStylePropertyV1; expected: string }
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

The exact finite registries and inclusive limits are exported from the same
contract module; schema and executor import these values, never anonymous copies:

```ts
export const DOCS_VISUAL_LOCATOR_ROLES_V1 = [
  "button", "link", "textbox", "combobox", "option", "checkbox", "radio",
  "switch", "slider", "tab", "tabpanel", "dialog", "navigation", "main",
  "heading", "row", "cell", "gridcell", "menuitem", "listitem",
] as const;
export const DOCS_VISUAL_KEYS_V1 = [
  "Enter", "Escape", "Space", "Tab", "Shift+Tab", "ArrowUp", "ArrowDown",
  "ArrowLeft", "ArrowRight", "Home", "End",
] as const;
export const DOCS_VISUAL_ARIA_ATTRIBUTES_V1 = [
  "aria-expanded", "aria-selected", "aria-checked", "aria-pressed",
  "aria-disabled", "aria-current", "aria-hidden", "aria-invalid", "aria-busy",
] as const;
export const DOCS_VISUAL_COMPUTED_STYLE_PROPERTIES_V1 = [
  "display", "visibility", "opacity", "color", "background-color",
  "border-color", "transform", "width", "height", "overflow-x", "overflow-y",
  "pointer-events", "position",
] as const;
export type DocsVisualLocatorRoleV1 = typeof DOCS_VISUAL_LOCATOR_ROLES_V1[number];
export type DocsVisualKeyV1 = typeof DOCS_VISUAL_KEYS_V1[number];
export type DocsVisualAriaAttributeV1 = typeof DOCS_VISUAL_ARIA_ATTRIBUTES_V1[number];
export type DocsVisualComputedStylePropertyV1 =
  typeof DOCS_VISUAL_COMPUTED_STYLE_PROPERTIES_V1[number];
export const DOCS_VISUAL_SCENARIO_LIMITS_V1 = {
  serializedUtf8Bytes: 131_072, locatorTextUtf8Bytes: 256,
  expectedTextUtf8Bytes: 1_024, fixtureValueRefUtf8Bytes: 64,
  routeUtf8Bytes: 512, altUtf8Bytes: 512, captionUtf8Bytes: 1_024,
  actions: 32, assertions: 32, watchPaths: 32, watchPathUtf8Bytes: 256,
  viewportWidth: { min: 320, max: 2_560 },
  viewportHeight: { min: 240, max: 1_600 },
  capturePaddingPx: { min: 0, max: 64 },
} as const;
```

Every string/count in the scenario or recovery union is governed by the closest
named limit above; IDs additionally use their existing exact kebab/hash/run-ID
patterns. The fixture-recovery union's caps come ONLY from the single exported
`DOCS_FIXTURE_RECOVERY_LIMITS_V1` owner (the strict intersection defined once
below): record bytes `recordUtf8Bytes` (65_536), adapter identity
`adapterIdUtf8Bytes` (64), fixture/cleanup profiles `profileIdUtf8Bytes` (64),
resource count `resourceRefs` (64) plus per-ref `resourceKindUtf8Bytes` (64) /
`resourceIdUtf8Bytes` (128), the opaque `adapterRecoveryTokenUtf8Bytes` (256),
and diagnostics safe field paths `diagnosticFieldPathUtf8Bytes` (256). The
competing `DOCS_VISUAL_FIXTURE_RECOVERY_LIMITS_V1` constant is DELETED; no
schema, persistence module, adapter or test may reference it or define a second
fixture-recovery limit authority. `fixtureProfile`, `cleanupProfile`, and
`fixtureValueRef` resolve byte-for-byte in immutable code-owned registries.
Expanding a finite registry requires a schema-version task, security review,
compiler mapping and tests.

All names and discriminator values above are exact. Unknown fields fail closed
at every level. Locators must be semantic and exact enough to resolve one
visible element; CSS/XPath, element indexes, `evaluate`, `run-code`, arbitrary
URLs and arbitrary shell commands are not manifest capabilities.

The sole authored scenario path is
`docs/guide/assets/scenarios/<docId>/<locale>/<visualId>.json`. Its path
segments must agree with the normalized envelope, and `sectionId` must resolve
inside that exact `(docId, locale)` document. `visualId` remains bundle-global,
but neither its uniqueness nor its registry lookup may erase the localized
owner tuple.

`fixtureValueRef` resolves from a code-owned fixture registry after scenario
validation. Manifests never contain passwords, tokens, real emails, free-form
customer data or environment-variable names. `route` must be a canonical local
`/admin...` path and may not include a host, query credentials or fragment.

### Exact DSL-to-shared-browser compiler map

TASK-548-02-L02's thin adapter obtains one bounded snapshot through the shared
`BrowserTransport`, resolves every locator against its finite role/label/text
registry, and requires exactly one visible element reference. The shared
dispatcher is the only `playwright-cli` owner; this compiler never serializes
locator text into JavaScript or a shell.

| DSL member | Exact owned command/probe |
| --- | --- |
| `click` | shared browser action `click <resolved-ref>` in the adapter-owned segment |
| `fill` | registry value → stdin-safe argument → `fill <resolved-ref> <value>` |
| `select` | registry value → stdin-safe argument → `select <resolved-ref> <value>` |
| `press` | `click <resolved-ref>` → owned active-element identity probe → `press <allowed-key>` |
| `visible`/`text`/`aria` | one generated, fixed probe template against `<resolved-ref>` |
| `computed-style` | fixed `getComputedStyle` probe selecting only the allowed property |
| `geometry` | fixed bounding-box/viewport probe with finite numeric comparisons |
| `captureTarget` | `screenshot <resolved-ref>` followed by owned PNG bounds checks |

Generated probe source is selected by discriminator and contains no manifest
code; only already-normalized expected data crosses as bounded JSON. Each action
forces a fresh snapshot/reference resolution, and every assertion re-resolves
after the final action so stale element refs cannot silently pass.

## Fixture Lifecycle Contract

```ts
type DocsFixtureRecoveryBindingV1 = {
  runId: string;
  docId: string;
  locale: string;
  sectionId: string;
  visualId: string;
  scenarioSha256: string;
  fixtureProfile: string;
  cleanupProfile: string;
};

type DocsFixtureRecoveryMaterialV1 =
  | {
      kind: "resource-refs";
      resourceRefs: { kind: string; id: string }[];
    }
  | {
      kind: "opaque-token";
      adapterRecoveryToken: string;
    };

type DocsFixtureRecoveryRecordV1 =
  | {
      schema: "coderso.docs-fixture-recovery@v1";
      state: "acquired";
      binding: DocsFixtureRecoveryBindingV1;
      adapterId: string;
      recovery: DocsFixtureRecoveryMaterialV1;
      recoveryIdentitySha256: string;
    }
  | {
      schema: "coderso.docs-fixture-recovery@v1";
      state: "cleaning";
      binding: DocsFixtureRecoveryBindingV1;
      adapterId: string;
      recoveryIdentitySha256: string;
      acquiredRecordSha256: string;
    }
  | {
      schema: "coderso.docs-fixture-recovery@v1";
      state: "absent";
      binding: DocsFixtureRecoveryBindingV1;
      adapterId: string;
      recoveryIdentitySha256: string;
      acquiredRecordSha256: string;
      cleaningRecordSha256: string;
    };

export type VerifiedDocsFixtureRecoveryV1 = {
  state: "acquired" | "cleaning" | "absent";
  binding: DocsFixtureRecoveryBindingV1;
  adapterId: string;
  recoveryIdentitySha256: string;
  acquiredRecordSha256: string;
  stateRecordSha256: string;
};

type DocsFixtureLease = {
  runId: string;
  profile: string;
  resourceRefs: { kind: string; id: string }[];
  values: Record<string, string>;
};

type DocsFixtureAdapter = {
  readonly id: string;
  prepareRecovery(input: {
    binding: DocsFixtureRecoveryBindingV1;
    permissionRequirement: DocsPermissionRequirementV1 | null;
  }): Promise<DocsFixtureRecoveryMaterialV1>;
  acquirePrepared(input: {
    binding: DocsFixtureRecoveryBindingV1;
    permissionRequirement: DocsPermissionRequirementV1 | null;
    recovery: DocsFixtureRecoveryMaterialV1;
  }): Promise<DocsFixtureLease>;
  cleanupFromRecovery(input: {
    binding: DocsFixtureRecoveryBindingV1;
    recovery: DocsFixtureRecoveryMaterialV1;
  }): Promise<void>;
  assertAbsentFromRecovery(input: {
    binding: DocsFixtureRecoveryBindingV1;
    recovery: DocsFixtureRecoveryMaterialV1;
  }): Promise<void>;
};

export const DOCS_FIXTURE_RECOVERY_LIMITS_V1 = {
  recordUtf8Bytes: 65_536,
  adapterIdUtf8Bytes: 64,
  profileIdUtf8Bytes: 64,
  resourceRefs: 64,
  resourceKindUtf8Bytes: 64,
  resourceIdUtf8Bytes: 128,
  adapterRecoveryTokenUtf8Bytes: 256,
  diagnosticFieldPathUtf8Bytes: 256,
} as const;

export function normalizeDocsFixtureRecoveryRecordV1(
  value: unknown
): DocsFixtureRecoveryRecordV1;

export function buildDocsFixtureRecoveryDirectoryV1(runId: string): string;

export async function loadDocsFixtureRecoveryV1(input: {
  runId: string;
}): Promise<VerifiedDocsFixtureRecoveryV1 | null>;

export async function recoverAndAssertDocsFixtureAbsentV1(input: {
  runId: string;
}): Promise<
  (VerifiedDocsFixtureRecoveryV1 & { state: "absent" }) | null
>;

export async function withDocsFixtureLease<T>(
  input: {
    scenario: DocsVisualScenarioV1;
    scenarioSha256: string;
    runId: string;
  },
  run: (
    lease: DocsFixtureLease,
    fixtureRecovery: VerifiedDocsFixtureRecoveryV1 & { state: "acquired" }
  ) => Promise<T>
): Promise<{
  value: T;
  fixtureRecovery: VerifiedDocsFixtureRecoveryV1 & { state: "absent" };
}>;
```

This leaf owns
`scripts/docs/visual/fixtures/docsFixtureRecoveryV1.ts`. The exact recovery
directory is `.tmp/docs-visuals/<runId>/fixture-recovery-v1/`; its immutable
phase files are `acquired.json`, `cleaning.json`, and the terminal
`absent.json` tombstone. Each phase uses only its same-directory
`.<phase>.json.tmp`, created without replacement, then file-fsynced,
no-replace-renamed and directory-fsynced. The only valid committed inventories
are the ordered prefixes `{acquired}`, `{acquired, cleaning}`, and
`{acquired, cleaning, absent}`. A phase cannot be skipped or replaced. A
same-phase temp left by termination may be removed only after no-follow
validation of the complete preceding committed prefix, followed by directory
fsync; any other file, link, type, path, phase, hash or identity mismatch fails
closed.

Every record is recursively reject-unknown canonical JSON plus one final LF and
is capped before parsing by `recordUtf8Bytes` (65_536). `recoveryIdentitySha256`
hashes the canonical
`coderso.docs-fixture-recovery-identity@v1` envelope containing the exact
binding, `adapterId`, and recovery material. Later records hash-chain the exact
prior phase bytes through `acquiredRecordSha256` and
`cleaningRecordSha256`. All IDs, counts and UTF-8 strings obey the exported
inclusive limits of the single `DOCS_FIXTURE_RECOVERY_LIMITS_V1` owner: the
binding's `fixtureProfile`/`cleanupProfile` are bounded by `profileIdUtf8Bytes`
(64), the `resourceRefs[]` entries by `resourceRefs` (64) with
`resourceKindUtf8Bytes` (64) / `resourceIdUtf8Bytes` (128), the opaque
`adapterRecoveryToken` by `adapterRecoveryTokenUtf8Bytes` (256), and every
bounded diagnostics safe field path by `diagnosticFieldPathUtf8Bytes` (256);
hashes are lowercase SHA-256.

Every adapter exposes one immutable canonical lower-kebab `id`, bounded by
`adapterIdUtf8Bytes` (64). Registry keys and adapter `id` values are unique and must
be byte-identical. Acquisition persists exactly that validated ID; every load,
restart cleanup and absence assertion resolves the binding again and requires
the persisted `adapterId`, registry key and `adapter.id` to be byte-identical.
Unknown, aliased, duplicate, noncanonical or changed adapter identity fails
before an adapter method runs; there is no profile-only or default fallback.

`prepareRecovery` is side-effect-free with respect to fixture resources. It
returns either sorted unique safe `{ kind, id }` refs or one bounded opaque,
non-authorizing adapter token sufficient for deterministic cleanup. The
acquired record is atomically durable before `acquirePrepared` may create or
change any fixture resource. The lease must match the binding and prepared
refs/token; `values` remain memory-only. No record or token may contain fixture
values, credentials, cookies, headers, URLs, PII, environment values, settings
snapshots, or other user content.

`loadDocsFixtureRecoveryV1` derives the path solely from validated `runId`,
lstats without following links, applies byte/count caps before parsing, verifies
the complete state prefix and hashes, and resolves the exact adapter/profile
registry entry. `recoverAndAssertDocsFixtureAbsentV1` is the sole restart and
normal cleanup primitive. A missing recovery directory returns `null` and,
because no adapter may mutate before `acquired` commits, proves fixture
acquisition never started. Otherwise `acquired` first commits `cleaning`; `cleaning`
idempotently calls `cleanupFromRecovery` and always calls
`assertAbsentFromRecovery`; only proven absence commits `absent`. Reopening
`absent` reruns the absence assertion and returns the same tombstone without a
write. A cleanup failure preserves the recoverable prefix and every bounded
primary/cleanup/absence code for the next invocation.

Every fixture ID/name is prefixed with the task-scoped random `runId`. Adapters
use existing domain services or real admin APIs, preserve CSRF/RBAC, and delete
only their durable owned refs. Settings use an explicit recoverable
snapshot/restore token. `withDocsFixtureLease` always invokes the exact recovery
primitive in `finally`; it returns only after the absent tombstone is durable.

This leaf owns the sole generator at
`scripts/docs/visual/contract/docsVisualRunIdV1.ts`:

```ts
type DocsVisualRunScopeV1 = "cli" | "ci" | "migration";

type DocsVisualRunIdDepsV1 = {
  randomBytes: (byteLength: number) => Uint8Array;
  collisionExists: (runId: string) => Promise<boolean>;
};

createDocsVisualRunIdV1(
  input: { scope: DocsVisualRunScopeV1 },
  deps?: DocsVisualRunIdDepsV1
): Promise<string>;
```

Production dependencies use a CSPRNG and check both active leases and confined
`.tmp/docs-visuals` run roots. The exact output is
`<scope>-<32-lowercase-hex>` (128 random bits), bounded by
`assertBoundedDocsVisualRunId`, and retried with fresh entropy at most eight
times on collision before `docs_visual_run_id_collision`. The injected
dependency exists only for deterministic unit tests; production must never use
a seed, timestamp, commit hash, scenario ID or retry counter as entropy.

The public interactive CLI wrapper calls
`createDocsVisualRunIdV1({ scope: "cli" })` internally; users never supply a run
ID. CI and TASK-548-06 migration call the generator directly with their own
exact scopes. Each initiating owner passes its generated value unchanged into
`captureDocsVisual`. That lower capture API validates but never generates,
substitutes or regenerates a run ID. A run ID may appear in task-scoped
temporary/session/privacy evidence, but `DocsVisualReceiptV1`, `DocsVisualV1`
and `DocsDistributionBundleV2` must never serialize it.

## Visual Source Hash Contract

This leaf is the sole owner of
`scripts/docs/visual/contract/docsVisualSourceHashV1.ts` and its exact pure
hash helper:

```ts
type DocsVisualWatchedSourceV1 = {
  path: string; // normalized repository-relative POSIX path
  bytes: Uint8Array;
};

export type DocsVisualToolVersionsV1 = Readonly<{
  playwrightCli: string; browser: string; pngNormalizer: string;
}>;

export type DocsVisualBrowserContractV1 = Readonly<{
  viewport: { width: number; height: number; deviceScaleFactor: 1 };
  theme: "light" | "dark";
  reducedMotion: "reduce" | "no-preference";
  timezone: "UTC";
}>;

export type DocsVisualSourceHashInputV1 = {
  scenario: DocsVisualScenarioV1;
  scenarioSource: DocsVisualWatchedSourceV1;
  fixtureSources: readonly DocsVisualWatchedSourceV1[];
  baseWatchMatches: readonly {
    pattern: DocsVisualBaseWatchPatternV1;
    sources: readonly DocsVisualWatchedSourceV1[];
  }[];
  scenarioWatchMatches: readonly {
    pattern: string;
    sources: readonly DocsVisualWatchedSourceV1[];
  }[];
  documentSectionMetadata: {
    docId: string;
    locale: string;
    sectionId: string;
    canonicalBytes: Uint8Array;
  };
  toolVersions: DocsVisualToolVersionsV1;
  browserContract: DocsVisualBrowserContractV1;
};

export function computeDocsVisualSourceHashV1(
  input: DocsVisualSourceHashInputV1
): string;
```

The mandatory base set is the following exact sorted tuple:

```ts
const DOCS_VISUAL_BASE_WATCH_PATTERNS_V1 = [
  "core/admin/app/AdminApp.tsx",
  "core/admin/styles/globals.css",
  "core/admin/ui/layouts/AdminShell.tsx",
  "core/admin/ui/navigation/sidebarConfig.ts",
  "core/admin/utils/adminPaths.ts",
  "core/admin/utils/adminPrefetch.ts",
  "scripts/docs/capture-visual.ts",
  "scripts/docs/visual/capture/**/*.ts",
  "scripts/docs/visual/contract/**/*.ts",
  "scripts/docs/visual/fixtures/**/*.ts",
] as const;

type DocsVisualBaseWatchPatternV1 =
  (typeof DOCS_VISUAL_BASE_WATCH_PATTERNS_V1)[number];
```

Before calling the helper, the collector strictly normalizes the scenario,
resolves its one canonical scenario file, every code-owned fixture-profile
source, the referenced `(docId, locale, sectionId)` canonical metadata bytes,
every mandatory base pattern and every declared scenario `watchPaths` pattern.
Every pattern must have at least one regular-file match. Absolute/traversing
paths, symlinks, generated/output directories, duplicate normalized patterns,
case collisions and out-of-repository files fail closed.

The helper verifies the base-pattern keys equal the exact tuple and scenario
watch keys equal the normalized scenario array. It merges scenario, fixture,
base and scenario-watch files by path; a duplicate path is deduplicated only
when bytes are identical, otherwise it fails. Entries sort by UTF-8 bytewise
path order. It hashes each file's exact bytes, then canonical-JSON serializes
this exact envelope with LF endings and one final newline:

```ts
{
  schema: "coderso.docs-visual-source-hash@v1",
  scenario: normalizeDocsVisualScenarioV1(input.scenario),
  documentSection: {
    docId,
    locale,
    sectionId,
    metadataSha256: sha256(canonicalBytes),
  },
  toolVersions: input.toolVersions,
  browserContract: input.browserContract,
  files: sortedSources.map(({ path, bytes }) => ({ path, sha256: sha256(bytes) })),
}
```

The hash input and both exact `Readonly` environment types are owned/exported
here. L02 provenance, capture-environment and promotion claims and L03
staleness use type-only imports of `DocsVisualSourceHashInputV1`,
`DocsVisualToolVersionsV1` and `DocsVisualBrowserContractV1` without anonymous
copies. `browserContract` is a required member of the exported hash-input
contract and of the canonical hash envelope. The returned value is lowercase
SHA-256 over the UTF-8 envelope bytes. No
absolute path, timestamp, filesystem metadata, directory enumeration order or
ambient tool version enters the hash. TASK-548-02-L02 imports this helper when
creating receipts; TASK-548-02-L03 imports the same helper for staleness. They
may collect inputs but may not reimplement the algorithm.

Scenarios consume the exact TASK-548-01
`DocsPermissionRequirementV1`. Null represents an authenticated Admin route
with no extra catalog permission. `allOf` grants/tests every listed permission;
`anyOf` grants a deterministic canonical member unless the fixture profile
explicitly exercises another valid branch. Empty/malformed requirements and
partial `allOf` authorization fail closed. Authored requirements always reject
`*`. The runtime evaluator separately treats the exact live ready snapshot
`["*"]` as full access; duplicate/mixed wildcard snapshots and all other
malformed wildcard combinations fail closed.

## Security Contract

- **Endpoint visibility:** no new endpoint; fixture adapters call existing
  internal admin contracts only.
- **Auth/RBAC:** a scoped test account receives exactly declared permissions;
  wildcard admin is not the default fixture. Authored wildcard is invalid;
  exact live ready `["*"]` is full access, while duplicate/mixed wildcard is
  invalid. Null means authenticated with no extra permission; `allOf`/`anyOf`
  use the shared exact semantics.
- **CSRF/rate limit:** existing unsafe-method CSRF and route buckets remain
  active. No direct DB mutation is allowed merely to bypass them in runtime
  scenarios.
- **Validation:** strict schema, canonical route and live permission-catalog
  validation, semantic locator allowlist, BCP-47 locale, fixed UTC timezone,
  bounded viewport/steps/assertions/text/watch paths and strict hashed recovery
  phase records opened without following links.
- **Anti-abuse:** no public write, nonce/HMAC or CAPTCHA. No arbitrary JS,
  network host, shell, SQL, upload, redirect or retry loop in the DSL.
- **Privacy:** synthetic fixture registry only; recovery persists only safe
  owned refs or a non-authorizing opaque token, never values, secrets, cookies,
  settings contents, personal data or credential-bearing strings.

## Implementation Pseudocode

```ts
export function normalizeDocsVisualScenarioV1(value: unknown): DocsVisualScenarioV1 {
  const scenario = assertStrictSchema(value, docsVisualScenarioV1Schema);
  assertStableVisualIdentity({
    visualId: scenario.visualId,
    docId: scenario.docId,
    locale: canonicalizeBcp47(scenario.locale),
    sectionId: scenario.sectionId,
  });
  assertScenarioPathMatchesLocalizedIdentity(scenario);
  assertCanonicalAdminRoute(scenario.route);
  const permissionRequirement = normalizeDocsPermissionRequirementV1(
    scenario.permissionRequirement
  );
  assertSemanticLocators(scenario.actions, scenario.assertions, scenario.captureTarget);
  assertFiniteDslRegistriesAndInclusiveLimitsV1(scenario);
  assertConfinedWatchPaths(scenario.watchPaths);
  return canonicalizeScenario({ ...scenario, permissionRequirement });
}

export async function withDocsFixtureLease<T>(
  input: {
    scenario: DocsVisualScenarioV1;
    scenarioSha256: string;
    runId: string;
  },
  run: (
    lease: DocsFixtureLease,
    fixtureRecovery: VerifiedDocsFixtureRecoveryV1 & { state: "acquired" }
  ) => Promise<T>
): Promise<{
  value: T;
  fixtureRecovery: VerifiedDocsFixtureRecoveryV1 & { state: "absent" };
}> {
  const scenario = normalizeDocsVisualScenarioV1(input.scenario);
  const binding = normalizeDocsFixtureRecoveryBindingV1({
    runId: assertBoundedDocsVisualRunId(input.runId),
    docId: scenario.docId,
    locale: scenario.locale,
    sectionId: scenario.sectionId,
    visualId: scenario.visualId,
    scenarioSha256: input.scenarioSha256,
    fixtureProfile: scenario.fixtureProfile,
    cleanupProfile: scenario.cleanupProfile,
  });
  const adapter = resolveExactFixtureAdapter(binding);
  assertExactFixtureAdapterRegistryIdentityV1(adapter);
  const recovery = normalizeDocsFixtureRecoveryMaterialV1(
    await adapter.prepareRecovery({
      binding,
      permissionRequirement: scenario.permissionRequirement,
    })
  );
  const acquired = await commitDocsFixtureRecoveryAcquiredV1NoReplace({
    binding,
    adapterId: adapter.id,
    recovery,
  }); // durable before acquirePrepared may mutate a fixture
  let value: T | undefined;
  let primaryError: unknown;
  try {
    const lease = await adapter.acquirePrepared({
      binding,
      permissionRequirement: scenario.permissionRequirement,
      recovery,
    });
    assertLeaseMatchesPreparedRecoveryV1(lease, acquired);
    value = await run(lease, acquired);
  } catch (error) {
    primaryError = error;
  }
  const fixtureRecovery = await settleLifecycleStep(() =>
    recoverAndAssertDocsFixtureAbsentV1({ runId: binding.runId })
  );
  const lifecycleError = combineFixtureLifecycleErrors({
    primaryError,
    fixtureRecovery,
  });
  if (lifecycleError) throw lifecycleError;
  return {
    value: value as T,
    fixtureRecovery: requireAbsentFixtureRecovery(fixtureRecovery),
  };
}
```

**Data flow:** unknown manifest → strict normalize/limits → cross-reference
v2 doc/section → validated caller-owned run ID and scenario hash → adapter
lookup → side-effect-free recovery material → durable `acquired` record →
scoped lease/value refs → runner input → durable cleaning/absence proof and
tombstone. The ID is unchanged through acquisition and cleanup. The public CLI
generates its CLI-scoped ID; CI and migration generate their scopes directly.
Fixture and lower capture helpers never replace one. Canonical
scenario/fixture/base/watch bytes plus document metadata and pinned tool
versions flow through the one pure source-hash helper. No raw manifest value
becomes executable code.

**Error handling:** use `docs_visual_scenario_invalid`,
`docs_visual_locator_unsafe`, `docs_visual_route_invalid`,
`docs_visual_permission_invalid`, `docs_visual_fixture_unknown`,
`docs_visual_fixture_recovery_invalid`, `docs_visual_fixture_acquire_failed`,
`docs_visual_cleanup_failed` and `docs_visual_fixture_residue`. The structured
diagnostic preserves primary, recovery, cleanup and absence codes. Errors
contain stable IDs and safe field paths — every path bounded by the exact
`diagnosticFieldPathUtf8Bytes` cap — never fixture values or recovery
material.

**Regression-test shape:** reject every unknown key, unsafe locator/route/key,
unknown permission/profile/value ref, non-UTC timezone, bad locale/viewport,
over-limit array/string and secret/PII-like value. Prove canonicalization,
pin every finite registry member and one-neighbor rejection for every numeric/
UTF-8 limit; execute every command-map branch and prove manifest strings never
become shell/JavaScript while targeted `press` verifies focus identity;
localized path/envelope and `(docId, locale, sectionId)` referential checks,
including two locale rows with the same `docId`/`sectionId`; prove exact
null/empty/partial/full/allOf/anyOf semantics, authored wildcard rejection,
exact live ready `["*"]` full access and duplicate/mixed wildcard rejection,
unique resource ownership,
cleanup after action/assertion/capture
failures, `assertAbsent` execution after cleanup failure and preservation of all
structured lifecycle errors. Pin the recovery schemas, exact directory/files,
canonical hashes, caps and only-valid state prefixes. Negative bounds tests pin
the SINGLE `DOCS_FIXTURE_RECOVERY_LIMITS_V1` owner and one-neighbor rejection
for every exact field: canonical record JSON over `recordUtf8Bytes` (65_536),
`adapterIdUtf8Bytes` (64), `profileIdUtf8Bytes` (64), `resourceRefs` (64) with
per-ref `resourceKindUtf8Bytes` (64) / `resourceIdUtf8Bytes` (128),
`adapterRecoveryTokenUtf8Bytes` (256), and `diagnosticFieldPathUtf8Bytes`
(256); the deleted `DOCS_VISUAL_FIXTURE_RECOVERY_LIMITS_V1` name never appears
in any schema, persistence module, adapter import or test, and no second
fixture-recovery limit authority compiles. Prove side-effect-free
preparation and durable no-replace/fsync `acquired` bytes precede the first
fixture mutation; reject unknown/extra/partial/reordered/tampered records,
unsafe refs/tokens, symlinks and every forbidden persisted value. Reject
noncanonical/oversized/duplicate adapter IDs, registry-key/adapter-ID drift and
prove registry drift blocks `prepareRecovery`, while persisted-ID substitution
blocks cleanup/absence before any adapter method. Real-child termination after
acquired commit, adapter acquire and during cleaning
must restart through `loadDocsFixtureRecoveryV1` plus
`recoverAndAssertDocsFixtureAbsentV1`, leave the exact `absent` tombstone and
prove every owned row/setting/account absent. Repeat recovery from `cleaning`
and `absent` to prove idempotency. Prove a supplied bounded run ID round-trips
unchanged and invalid IDs reject before acquire. With injected entropy, prove
the generator's exact scope/length/encoding, deterministic test vector,
collision retry with fresh bytes, eight-attempt exhaustion, and
production-dependency contract. Unit-test only the generator and pure
`computeDocsVisualSourceHashV1` owner here: exact base tuple, required non-empty
matches, bytewise sort, identical duplicate dedupe, conflicting duplicate/case/
symlink/path rejection, semantic/tool/browser sensitivity and absolute-root/time/order
independence. Compile-time guards pin both exported environment types across
L02/L03 with no anonymous copy. They also type-only import the exported
`DocsVisualSourceHashInputV1`, prove its exact required `browserContract`
member, and reject a locally redeclared or browser-less hash input. The focused
type guard imports all three with `import type` from the exact
`scripts/docs/visual/contract/docsVisualSourceHashV1.ts` owner, uses `satisfies
DocsVisualSourceHashInputV1` for the valid fixture and pins the missing
`browserContract` case with `@ts-expect-error`. CLI caller integration belongs
to L02; CI and migration caller integrations belong to L03 and TASK-548-06.
Those downstream suites prove pass-through and that receipts/bundles contain no
`runId`.

## Sub-Tasks

- [ ] Implement the exact types/schema/normalizer and bounded diagnostics.
- [ ] Implement the durable fixture-recovery journal, restart loader, idempotent
  cleanup/absence primitive and terminal tombstone.
- [ ] Implement the sole CSPRNG run-ID generator and collision checks; keep the
  lower capture API validation-only. Future caller integrations remain in their
  owning leaves.
- [ ] Implement the exact mandatory watch tuple and pure
  `computeDocsVisualSourceHashV1`; export the exact hash-input and `Readonly`
  environment types for downstream type-only imports, and do not add CLI,
  receipt, CI or migration integration in this leaf.
- [ ] Add a small registry of representative synthetic fixture profiles using
  existing domain contracts and scoped cleanup.
- [ ] Add `tests/vitest/documentation/docs-visual-scenario.test.ts` and
  `docs-visual-fixtures.test.ts`; keep fixtures/support modules independent and
  below 1,000 lines.
- [ ] Add
  `tests/integration/server/docsVisualFixtureLifecycle.test.ts` for real
  internal admin API acquire/use/cleanup/absence behavior with scoped fixtures.

## Testing Requirements

- `bunx vitest run --config vitest.config.ts tests/vitest/documentation/docs-visual-scenario.test.ts tests/vitest/documentation/docs-visual-fixtures.test.ts tests/vitest/documentation/docs-visual-source-hash.test.ts`
  The source-hash suite must compile-pin type-only downstream imports of all
  three exported types and the required `browserContract` hash input.
- Before the runtime lane: `set -a && source .env && set +a`
- `bun test tests/integration/server/docsVisualFixtureLifecycle.test.ts` when
  `DATABASE_URL` is reachable; prove real CSRF, scoped RBAC, acquire, cleanup,
  residue detection, child-process restart at every fixture-recovery phase and
  owned-row-only deletion
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- the canonical NUL-safe line-count gate over the leaf write set (identical
  contract in every TASK-548 task file; a file above 1,000 makes the gate fail
  with `exit 1`, including a non-newline final line; the baseline spans the
  full task/family dirty scope and commits/staging do not narrow it):

  ```bash
  # Canonical NUL-safe line-count gate over the leaf write set (identical
  # contract in every TASK-548 task file; a file above 1,000 makes the gate fail
  # with exit 1, including a non-newline final line). The verified pre-family
  # baseline is the pinned commit 963733cae23456622bea1eef1b734723aaab2350;
  # commits/staging cannot narrow the measured scope.
  TASK_FAMILY_BASELINE_SHA="963733cae23456622bea1eef1b734723aaab2350"
  git cat-file -e "${TASK_FAMILY_BASELINE_SHA}^{commit}" || { echo "invalid/missing baseline commit ${TASK_FAMILY_BASELINE_SHA}" >&2; exit 1; }
  failed=0
  while IFS= read -r -d '' f; do
    lines=$(awk 'END { print NR }' "$f")
    if [ "$lines" -gt 1000 ]; then
      printf 'OVER-LIMIT %s %s\n' "$lines" "$f"
      failed=1
    fi
  done < <({ git diff --name-only -z --diff-filter=ACMRT "$TASK_FAMILY_BASELINE_SHA" -- core packages scripts tests _docs/_workflows; git ls-files --others --exclude-standard -z -- core packages scripts tests _docs/_workflows; } | grep -zE '\.(ts|tsx|mjs|cjs|js|jsx|mts|cts)$' | grep -zvE '\.generated\.(ts|tsx|js|jsx|cjs|mjs|mts|cts)$' | sort -zu)
  exit "$failed"
  ```

## Documentation Updates Required

Send the exact DSL, fixture ownership and cleanup rules to the TASK-548 closure
owner. Do not create an alternative visual authoring format.

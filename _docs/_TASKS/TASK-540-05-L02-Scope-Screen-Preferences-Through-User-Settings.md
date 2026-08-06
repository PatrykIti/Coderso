# TASK-540-05-L02: Scope Screen Preferences Through User Settings

# FileName: TASK-540-05-L02-Scope-Screen-Preferences-Through-User-Settings.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-05
**Priority:** Medium
**Category:** User Settings / Custom Screens / Privacy
**Estimated Effort:** Medium
**Dependencies:** TASK-540-05-L01
**Status:** ✅ Done
**Completed:** 2026-08-06
**Started:** 2026-07-14
**Implementation Complete:** 2026-07-17 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Repair Reason:** Final post-audit found the A/B self-scope route proof re-read only user B after the two sessions wrote different values. The existing real-HTTP test now re-reads A with A's authenticated identity and asserts A's exact DB row alongside B, preserving the exact access-log inventory.
**Revalidation Passed:** 2026-07-17 — current post-split owner gate: the exact seven-file Vitest matrix passed 62/62; the exact four-file Bun matrix passed 27/27 with 190 assertions; isolated User Settings route and access-log harness suites passed 2/2 and 8/8; all 39 scanner self-test cases, core/root static checks, split/name/line/workflow gates, and `git diff --check` passed. No clean family post-audit, full validation, smoke, changelog, or closure result is claimed.
**Modularity Repair Revalidated:** 2026-07-17 — cohesive <=1,000-line split and exact owner gate passed.
**Historical Post-Audit:** 2026-07-14 — PASS at that revision; superseded by the 2026-07-16 owner-test repair, so a fresh sequential post-audit remains pending
**Previous Completion:** 2026-07-14
**Previous Targeted Gate:** 2026-07-14 — `core lint:types`, `core lint`, root `tsc`, the exact six-file Vitest matrix (64/64), the exact two-file Bun/DB matrix (20/20), and `git diff --check`
**Reopened:** 2026-07-16 (complete two-session self-scope read and DB proof)
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/services/settings/userSettingsService.ts`
- new Bun-free `core/services/settings/screenEntryPreferencesContract.ts`
- new Bun-free `core/admin/services/adminAuthIdentity.ts`, the route-persistent
  authenticated-identity epoch publisher/subscription boundary
- `core/admin/services/userSettingsClient.ts`
- `core/admin/ui/contexts/AdminAuthContext.tsx`, limited to publishing the
  provider's exact `user.id`/null identity in a publish-only layout effect and
  clearing it from a separate stable-token cleanup-only unmount effect; permission
  behavior and public context shape stay unchanged
- `core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts`
- `core/server/routes/userSettingsRoutes.ts`, limited to the optional
  `X-Coderso-Expected-User-Id` PATCH guard after session auth and before the
  first settings write
- `core/server/httpServer.ts`, limited to the central `errorResponse` mapping for
  `user_settings_key_invalid`, `user_settings_value_invalid`, and
  `user_setting_identity_changed`
- `core/services/settings/securitySettings.ts` and
  `core/server/middleware/cors.ts`, limited to making
  `X-Coderso-Expected-User-Id` a case-insensitive server-required CORS header while
  preserving every configured header and supporting already-persisted settings
- `tests/integration/routes/cors.test.ts`, limited to trusted-origin OPTIONS coverage
  for that backward-compatible required-header union
- compatibility-expectation updates required before this source gate in
  `tests/unit/settings/userSettingsService.test.ts`,
  `tests/vitest/admin/userSettingsClient.test.ts`,
  `tests/vitest/ui/use-screen-entry-preferences.test.ts`, and the retained
  `tests/integration/routes/userSettings.test.ts`, which after the mandatory
  split owns only route registration plus the real HTTP/DB flow
- new test-only Bun support module
  `tests/integration/routes/support/userSettingsAccessLogHarness.ts`
- new Bun regression suite
  `tests/integration/routes/userSettingsAccessLogHarness.test.ts`
- new sole-owner UI integration suite
  `tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx`
- new `tests/vitest/ui/admin-auth-identity.test.tsx`, limited to the
  route-persistent provider publisher's A/B/null/unmount and stale-cleanup
  semantics
- conditional fixture-only modularity group:
  `tests/vitest/ui/assistant-panel-interaction.test.tsx`, new
  `tests/vitest/ui/assistant-panel-conversation.test.tsx`, and new
  `tests/vitest/ui/support/assistantPanelInteractionHarness.tsx`; this group is writable
  only while the new required `UserSettings` key is present in its typed aggregate
  fixture, and every Assistant behavior assertion/name remains read-only

`tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx` is a
read-only compatibility gate here. TASK-540-04-L03 is its sole writer and removes
the stale localStorage-specific assertion before this leaf starts; this leaf must
not edit it. The new persistence suite remains the only UI integration test this leaf
creates or edits. The earlier reopened behavior correction additionally owned only the
narrow CORS route test named above; the later mandatory file-size repair owns exactly
the retained user-settings route suite plus the two new test-only paths listed above.

No new user-settings endpoint or DB schema edit is needed. The existing PATCH route
compares the optional expected-owner header with its already authenticated
`ctx.user.id`; omission preserves every legacy caller, while the Screen transport
always sends it. Keep all three plain machine-readable error mappings at the real
central `httpServer.ts` boundary. Trusted cross-origin Admin deployments must also pass
browser preflight: the CORS middleware unions the expected-owner header into configured
allowed headers case-insensitively at response time, so already-persisted settings work,
and the default settings include it for new/default configurations. Update the named
behavior tests before this leaf's gate; TASK-540-06 owns source-of-truth docs and only
aggregate test additions.

## Mandatory <=1,000-line Bun test split before closure

The `AGENTS.md` **File Size and Modularity** rule counts the complete human-authored
file, including blank lines and comments, caps every production module and test file at
1,000 physical lines, and makes an over-limit result a failed closure gate rather than a
LOW or `TASK-9999` candidate. Family changelog 1252 must record this behavior-neutral
test modularization and its final line-count evidence. Do not mark this leaf or its
parent done until all three paths below pass the hard count independently.

The following historical pre-split dirty-file ranges are audit anchors for responsibility, not
instructions to move arbitrary line spans:

- `userSettings.test.ts:53-354` owns the stateless access-log types, comparison and
  signature helpers, stable inventory/drain/cleanup state machine, and `trackedFetch`.
- `userSettings.test.ts:355-634` owns eight deterministic injected-clock/in-memory
  harness regressions.
- `userSettings.test.ts:20-51,635-1064` owns route registration and the single real
  `startHttpServer`/DB scenario, including the corrected authenticated A/B re-reads and
  exact A/B stored-row assertions.

Split by those cohesive responsibilities as follows:

| Bun test/support file | Final physical lines | Hard maximum |
|---|---:|---:|
| `tests/integration/routes/support/userSettingsAccessLogHarness.ts` | 323 | 1,000 |
| `tests/integration/routes/userSettingsAccessLogHarness.test.ts` | 447 | 1,000 |
| `tests/integration/routes/userSettings.test.ts` | 494 | 1,000 |

1. `tests/integration/routes/support/userSettingsAccessLogHarness.ts` is a test-only,
   stateless support module. It owns `AccessLogIdentity`, `ExpectedAccessLog`,
   `AccessLogCandidate`, `PollDeps`, `AccessLogScope`, `StableAccessLogInventory`, the
   four timing constants, `accessLogSignature`, `expectedAccessLogSignature`,
   `isOwnedAccessLogCandidate`, `observeStableAccessLogInventory`,
   `drainExactAccessLogs`, `validateAndCleanupAccessLogs`, and `trackedFetch`. It may
   import Bun's assertion helper because it is test-only, but it must not own a global
   marker, request ledger, UUID set, DB client, server, timer, or mutable fixture.
   Those named symbols are also its exact export allowlist. The only private runtime
   declarations are the pure `sameArray` and `isSubmultiset` function declarations;
   private types/interfaces remain allowed. Every top-level variable is one of the four
   exported constants and uses `const`; no private/mutable state, expression statement,
   class, enum, side-effect import, or other top-level behavior is allowed. The only
   optional import is the exact same-name value `{ expect }` assertion helper from
   `bun:test`. The module may not export a default, re-export through an indirect
   declaration, or expose an additional value/type such as `mock`.
2. `tests/integration/routes/userSettingsAccessLogHarness.test.ts` owns the local
   `makeCandidate`, `createFakePollDeps`, and `fakeScope` fixtures plus exactly the
   existing eight deterministic regressions: convergence before exact equality;
   compound missing/duplicate-extra/wrong-path/wrong-identity/late/out-of-scope
   classification; late exact-UUID drain including reappearance after initial empty
   polls; two fresh quiet windows whose accumulator includes only the intervals from a
   completed qualifying observation to the start of the next query, with all
   delete/query latency excluded;
   deterministic ordered errors; post-dispatch rejection ownership;
   deadline-crossing final deletion with ordered scope+late+delete/absence signals; and
   declaration/status drift in `trackedFetch`.
   It imports only the support contract, uses no DB, and must run independently in Bun.
3. `tests/integration/routes/userSettings.test.ts` retains the route-registration test
   and the real HTTP/DB test. It imports the support types/functions instead of
   duplicating them. Its marker, completed-request ledger, user UUIDs, session UUIDs,
   server, polling dependencies, behavior errors, and fallback cleanup errors remain
   local to that one real-flow test so running either suite alone cannot inherit state
   from the other.

The split must preserve all ten current user-settings test cases: two in the retained
route suite and eight in the harness suite. Preserve the eight harness test names/count,
but extend their compound fixtures/assertions to cover the complete matrix above; do not
weaken, merge, skip, or re-baseline any existing behavior assertion. Both
`.test.ts` files remain Bun-owned. Do not migrate the deterministic harness tests to
Vitest merely because their dependencies are injected; they are executable proof for
the Bun HTTP/access-log teardown contract and must remain beside that runtime suite.

The executable name/body oracle is intentionally asymmetric so the additive requirements
above do not contradict assertion preservation:

- Pre-split/current mode pins all ten declarations at revision
  `d803bbcfa5b52cb1e5036836592bd92ee2c03b6f` with declaration SHA-256
  `a83b8e25d4a8b06a1591a0f15faf565f562a0b1a6d5fb07dc2c548bba7979996`.
- Final mode pins the two retained route declarations byte-semantically at SHA-256
  `dc303e17e132938d2556ddcba832b913f6a3bacbde3bb04089b3887ab85c5399`.
- For each of the eight harness callbacks, every normalized top-level callback statement
  from that same pinned revision must remain, in the same order, as an exact AST
  prefix. Final mode may append statements after that prefix, but it may not insert a
  bypass before it or edit, replace, reorder, or remove a baseline statement/assertion.
- The additive statements must bind the actual helper result/promise under the exact
  identifiers below and assert that binding through `expect(...)`. These are executable
  result bindings, not comments, string labels, or no-op evidence markers:

| Existing test callback | Required additive result binding → producer → assertion |
|---|---|
| `access-log inventory distinguishes missing, extra, late, and out-of-scope rows` | `duplicateExtraInventory`, `wrongPathInventory`, and `wrongIdentityInventory` → `observeStableAccessLogInventory` → `expect(binding.behaviorError).toBe("access_log_extra")`; `signatureChangedInventory` → the same producer → `expect(binding.behaviorError).toBe("access_log_late")` |
| `exact access-log cleanup drains late owned UUIDs without deleting outsiders` | `postEmptyReappearanceDrain` → `drainExactAccessLogs` → `expect(binding.lateAfterDelete).toBe(true)` |
| `validateAndCleanupAccessLogs proves both quiet windows before fixture cleanup` | `queryLatencyInventory` → `observeStableAccessLogInventory` → `expect(binding.behaviorError).toBe(null)`; `deleteLatencyDrain` → `drainExactAccessLogs` → `expect(binding.cleanupError).toBe(null)` |
| `validateAndCleanupAccessLogs preserves deterministic error ordering while draining exact IDs` | `compoundValidationPromise` → `validateAndCleanupAccessLogs` → `await expect(binding).rejects.toMatchObject(...)`, whose expected object contains the ordered messages `access_log_extra`, `access_log_scope_invalid`, `access_log_late_after_delete`, `access_log_absence_unstable` |
| `deadline-crossing cleanup makes one final exact delete and retains absence failure` | `deadlineCrossingInventory` → `observeStableAccessLogInventory` → `expect(binding.behaviorError).toBe("access_log_unstable")`; `deadlineCrossingDrain` → `drainExactAccessLogs` → `expect(binding.cleanupError?.message).toBe("access_log_absence_unstable")` |

Every result binding and its matcher are direct top-level statements appended after the
exact baseline prefix. A resolved result initializer is exactly
`await producer(...)`; `compoundValidationPromise` is exactly the unawaited
`validateAndCleanupAccessLogs(...)` call consumed by the direct awaited `rejects`
assertion. Each result binding is immutable from its declaration through that assertion:
no intervening reference, alias, assignment/property write, increment/decrement,
`delete`, or call receiver/argument is allowed. Every `toBe` receives exactly one direct
required string/`true`/`null` literal. `toMatchObject` receives exactly one object whose
sole `errors` property is an array of the four exact single-`message` objects in the
required order; extra properties/elements, computed values, and spreads fail closed.
Comma expressions, fabricated object projections, matchers rooted anywhere except the
named binding/property chain, nested functions/control flow, and unreachable `if (false)`
evidence fail the scanner. An early/conditional callback `return` and any
local/module-scope shadow or assignment of the producer names fail too; the three
producers must be exact same-name value imports from
`./support/userSettingsAccessLogHarness`. Independently, the scanner derives a protected
name set from every identifier in the eight pinned baseline callbacks and rejects an
appended callback-scope function, class, enum, direct variable/destructuring binding, or
function-scoped `var` binding from a nested statement when its name intersects that set.
This fail-closed rule protects `expect` plus every imported/module fixture or helper name
used by the retained baseline from declaration hoisting or a temporal-dead-zone shadow.
Its mutation self-test proves each bypass, including hoisted `function expect` and
`function makeCandidate`, `var`, class, and destructuring shadows,
`Object.assign(binding, ...)` before the assertion, a tautological
`toBe({ required: literal, actual: binding.property }.actual)`, and an unawaited
`.rejects` assertion are rejected; `toBeDefined()` is never sufficient evidence for
this additive contract.

The final DB-free harness suite has a closed module boundary. Its imports are exactly:
value `expect`/`test` from `bun:test`; value `accessLogSignature`,
`drainExactAccessLogs`, `observeStableAccessLogInventory`, `trackedFetch`, and
`validateAndCleanupAccessLogs`; and type-only `AccessLogCandidate`, `AccessLogScope`,
`ExpectedAccessLog`, and `PollDeps` from the support module. Every support import is a
same-name named import. Module-scope runtime values are exactly `makeCandidate`,
`createFakePollDeps`, and `fakeScope`; the remaining declarations are types/interfaces
and the eight direct `test(...)` registrations. The scanner also checks the support
module's exact export allowlist from the split ownership above. Unknown imports or
exports, aliases, `mock`, extra hooks/helpers, mutable fixtures, or module-scope producer
replacement fail before execution; the mutation self-test specifically adds a
synthetic support `mock` import/export and proves both boundaries reject it. Separate
mutations prove that a private top-level `let`, an `export let` timing constant, and a
side-effect import also fail the stateless support-module gate.

The remaining three harness callbacks still pass the same exact-prefix proof even when
they need no new binding. The scanner continues to pin the exact ten-name multiset and
the exact `2 + 8` file partition, so this additive exception cannot create a new test,
rename one, or move a route test into the DB-free harness.

### Split pseudocode

```ts
// support/userSettingsAccessLogHarness.ts — no module-global fixture state.
export type AccessLogIdentity = Readonly<{
  userId: string | null;
  sessionId: string | null;
}>;
export type ExpectedAccessLog = Readonly<{
  method: string;
  path: string;
  status: number;
  identity: AccessLogIdentity;
}>;
export type AccessLogCandidate = Readonly<{
  id: string;
  userAgent: string | null;
  method: string;
  path: string;
  status: number;
  userId: string | null;
  sessionId: string | null;
}>;
export type PollDeps = Readonly<{
  query: () => Promise<readonly AccessLogCandidate[]>;
  deleteExactIds: (ids: readonly string[]) => Promise<void>;
  now: () => number;
  wait: (ms: number) => Promise<void>;
}>;
export type AccessLogScope = Readonly<{
  marker: string;
  userIds: ReadonlySet<string>;
  sessionIds: ReadonlySet<string>;
}>;
export type StableAccessLogInventory = Readonly<{
  ids: readonly string[];
  behaviorError:
    | "access_log_missing"
    | "access_log_extra"
    | "access_log_late"
    | "access_log_unstable"
    | null;
  scopeInvalid: boolean;
}>;

export const ACCESS_LOG_POLL_CADENCE_MS = 50;
export const ACCESS_LOG_MIN_QUIET_MS = 250;
export const ACCESS_LOG_POLL_TIMEOUT_MS = 5_000;
export const ACCESS_LOG_REQUIRED_STABLE_POLLS = 3;

export function accessLogSignature(value: AccessLogCandidate): string;
export function expectedAccessLogSignature(value: ExpectedAccessLog): string;
export function isOwnedAccessLogCandidate(
  row: AccessLogCandidate,
  scope: AccessLogScope
): boolean;
export async function observeStableAccessLogInventory(
  deps: PollDeps,
  scope: AccessLogScope,
  expectedSignatures: readonly string[]
): Promise<StableAccessLogInventory>;
export async function drainExactAccessLogs(
  deps: PollDeps,
  scope: AccessLogScope,
  initialIds: readonly string[]
): Promise<{
  lateAfterDelete: boolean;
  scopeInvalid: boolean;
  cleanupError: Error | null;
}>;
export async function validateAndCleanupAccessLogs(
  deps: PollDeps,
  scope: AccessLogScope,
  expectedSignatures: readonly string[],
  cleanupExactSettingsSessionsAndUsers: () => Promise<void>
): Promise<void>;
export async function trackedFetch(
  input: string | URL,
  init: RequestInit,
  expected: ExpectedAccessLog,
  marker: string,
  ledger: ExpectedAccessLog[],
  transport?: typeof fetch
): Promise<Response>;

// userSettingsAccessLogHarness.test.ts — in-memory fixtures stay local here.
const makeCandidate = (...): AccessLogCandidate => ...;
const createFakePollDeps = (...): PollDeps & FakePollInspection => ...;
const fakeScope: AccessLogScope = ...;
// Keep the existing eight test names/count independently runnable; extend their
// compound inputs/assertions where the final cleanup matrix below requires it. Bind
// actual helper results with the exact additive identifiers from the table above, e.g.
// const signatureChangedInventory = await observeStableAccessLogInventory(...);
// expect(signatureChangedInventory.behaviorError).toBe("access_log_late");
// const compoundValidationPromise = validateAndCleanupAccessLogs(...);
// await expect(compoundValidationPromise).rejects.toMatchObject({ errors: [...] });

// userSettings.test.ts — registration + one real server/DB flow only.
test("registerUserSettingsRoutes wires endpoints", ...);
testIfDb("real HTTP user-settings routes preserve self-scope, CSRF, buckets, errors, and exact log ownership", async () => {
  const marker = `wf540-user-settings-${randomUUID()}`;
  const userIds = [randomUUID(), randomUUID()] as const;
  const ledger: ExpectedAccessLog[] = [];
  // Import and call the stateless harness with this suite's exact local scope.
});
```

### Fixture and cleanup invariant

- The real route suite creates unique user and session UUIDs and one unique non-secret
  marker per execution. Candidate queries may use only the exact marker OR those exact
  synthetic user/session UUIDs; every selected row is rechecked by
  `isOwnedAccessLogCandidate`.
- Access-log cleanup deletes only the observed owned access-log UUIDs. It never deletes
  by marker, path, prefix, user/session predicate, or table-wide condition. A mixed
  candidate set leaves every out-of-scope row untouched and fails closed.
- Only after the second quiet-owned-absence window may the route suite delete settings
  rows for its exact synthetic user UUIDs, sessions by their exact session UUIDs, and
  users by their exact user UUIDs. No suite truncates a table or deletes another
  suite's fixtures.
- The harness regression suite is DB-free and cleans only its in-memory local fake
  state. No singleton tracker or mutable support-module state may couple the two test
  files when Bun executes them together.

### Workflow and matrix impact

- Add `tests/integration/routes/userSettingsAccessLogHarness.test.ts` to
  `TARGET_BUN_FILES`, source-owner hashing, named-file isolation metadata, and L02's
  exact Bun command. The support module is an L02 required/allowed file but is not a
  second test target.
- Add both new paths to L02's exclusive `allowedFiles`/`requiredFiles`; retain
  `tests/integration/routes/userSettings.test.ts` under this same sole writer.
- Before the owner stages the new test, the workflow must explicitly union its exact
  path into `TRACKED_TEST_FILES`; do not broaden discovery to every unrelated untracked
  test in the shared tree. Preserve uniqueness/existence checks.
- The reconciled TASK-540 family aggregate is exactly 78 Vitest + 18 Bun = 96 target
  files: 95 source-owner/read-only dependency files and one closure-owned aggregate
  file. This supersedes all earlier partial 51+7 calculations. Update exact cardinality,
  command/isolation self-tests, receipts, and the frozen workflow hash consistently.
- Add a hard physical-line gate for every added or modified production/test file. For
  this split it must inspect all three paths above and fail on `>1000`; a printed count
  without a non-zero failure is not a gate. This failure is not deferrable to
  TASK-9999.

The touched-file set is measured from verified pre-family baseline `e5f15a567` through
the final working tree, including every intermediate commit/checkpoint. Staging or
committing cannot reset or narrow either modularity gate.

## Conditional Assistant interaction test split

The complete `UserSettings` fixture in `assistant-panel-interaction.test.tsx` must include
the required exact key:

```ts
"customScreens.entry.preferences": {
  version: 1,
  showFieldMetadata: false,
},
```

That four-line semantic fixture delta touches a 1,506-line baseline file, so the current
branch resolves the conditional modularity group to **required**. The cohesive split
landed as follows:

| File | Exact responsibility and final test count | Final physical lines | Hard maximum |
|---|---|---:|---:|
| `tests/vitest/ui/support/assistantPanelInteractionHarness.tsx` | Existing shared `mount`, input, `flush`, `findButton`, `basicIntakeSession`, `makeUserSettings`/`mockUserSettings`, and deterministic reset scaffolding only; no Assistant status/plan/execute response builders | 107 | 1,000 |
| `tests/vitest/ui/assistant-panel-interaction.test.tsx` | Retain the first seven CTA, dry-run/execute, needs-input, inspection, Basic intake, Advanced switch, and validation-error tests | 825 | 1,000 |
| `tests/vitest/ui/assistant-panel-conversation.test.tsx` | Retain the final six docs/LLM modes, prior inspection candidates, new conversation, and SPA remount restoration tests | 614 | 1,000 |

The exact `makeUserSettings` helper and its complete typed defaults move to
`tests/vitest/ui/support/assistantPanelInteractionHarness.tsx`; neither retained test
suite may own or duplicate that aggregate fixture. Both suites consume the same exported
factory so the required key is proven once at its type boundary.

The harness owns exactly these function-valued exports:
`basicIntakeSession`, `findButton`, `flush`, `makeUserSettings`, `mockUserSettings`,
`mount`, `resetAssistantPanelTestState`, `setInputValue`, and `setTextareaValue`.
Preserve their existing function-valued `export const` shape during extraction; do not
add runtime module-scope values or a generic helper registry.
`resetAssistantPanelTestState` owns the existing
`clearAssistantRuntimeStateCache()`, `clearAssistantConversationState()`,
`document.body.innerHTML = ""`, and `vi.restoreAllMocks()` teardown. Each suite registers
that imported function directly with `afterEach(resetAssistantPanelTestState)`.

The verifier hashes the normalized initializer AST for the eight existing helpers and
the existing `afterEach` callback at pinned pre-split revision
`d803bbcfa5b52cb1e5036836592bd92ee2c03b6f`; the moved initializers must match those
fixed hashes exactly, with the callback renamed only by its exported binding. This pins
the complete typed `makeUserSettings(overrides: Partial<UserSettings>): UserSettings`
fixture and every default/property, not a raw substring or comment marker, and pins the
reset body exactly rather than checking only that four calls happen somewhere.

The harness import projection is also exact and side-effect-import-free: `React`,
`createRoot`, `vi`, the `userSettingsClient` namespace plus `UserSettings` type,
`clearAssistantRuntimeStateCache`, `clearAssistantConversationState`, and the intake
version/session type from their direct source modules at the correct `../../../../core`
relative depth. No barrel, default substitute, response client, extra import, or
side-effect-only import is accepted.

The interaction partition separately retains the exact same-name namespace import
`* as userSettingsClient` from
`../../../core/admin/services/userSettingsClient` because its existing dry-run/execute
callback directly spies on `setUserSetting`. That token is required only in
`assistant-panel-interaction.test.tsx` and forbidden in the conversation partition.
This is distinct from fixture ownership: the harness namespace import remains the sole
owner of the shared `makeUserSettings`/`mockUserSettings` aggregate fixture and its
`getUserSettings` spy. An alias, barrel/different module, omitted interaction import, or
conversation-side duplicate fails the split verifier.

The current status, plan, execute, inspection, and docs response mocks are inline inside
the 13 existing test callbacks. They stay inline and byte-semantically unchanged; the
harness must not import `assistantStatusClient`/`assistantClient`, build those responses,
or centralize their behavior branches. Moving one would contradict the exact callback
body oracle even if the resulting test happened to pass.

Both suites import `AssistantPanel` directly and only the dedicated harness; neither
imports the other suite. The harness registers no tests, performs no mount/fetch at
module import, exposes no shared mutable conversation/settings state, and provides a
fresh fixture/reset boundary to each caller. It may centralize repeated data and typed
builders, but not expectations or behavior branches.

Each split suite's module scope is closed to: its allowlisted direct imports, the exact
pinned `IS_REACT_ACT_ENVIRONMENT = true` statement, exactly one direct
`afterEach(resetAssistantPanelTestState)`, and its direct `test(...)` registrations.
Unknown/side-effect imports, a second hook, helper declaration, mock/reset call, or any
other top-level executable statement fail the verifier. This keeps response mocks inside
the exact callback-body SHA instead of moving semantic setup just outside that hash.

The mechanically invoked final split verifier enforces that boundary independently of
`fixtureOnlyFiles` (which is intentionally empty during a resumed modularity mutation).
It requires the exact preference property once inside the harness `makeUserSettings`,
rejects either suite duplicating the fixture, pins the exact helper/export and reset
ownership above, rejects test registration/import-time execution/shared mutable state in
the harness, and requires both suites to import `AssistantPanel` and the harness directly
without importing each other. It also invokes the Assistant name/body oracle and requires
the existing declaration SHA-256
`7c4545631fd23c811b5639bc4c27496a18e70d874431df5b8c895757a794eb4e`,
exact 13-name multiset, and exact `7 + 6` partition. A cleared fixture-only projection
therefore cannot turn into a missing split verifier.

Fixture-only ownership is conditional and fail-closed:

- If the final production type still requires the exact key above (the current branch),
  all three paths are required/allowed, the split is mandatory, and the only semantic
  difference from the `e5f15a567` Assistant test contract is that exact fixture member;
  imports/extractions are behavior-neutral.
- If later source work proves the key is no longer required before this leaf lands, the
  workflow forbids the two new paths and requires the original Assistant test file to be
  byte-identical to `e5f15a567`; an untouched legacy over-limit file then falls outside
  this task's touched-file gate. It may not retain an arbitrary formatting/assertion
  edit merely to force ownership.
- In either branch, L02 has no authority to alter Assistant UI behavior, mocks unrelated
  to the typed setting, expected payloads, snapshots, assertions, or test names.

Before extraction, seal the current fully expanded 13-name multiset. The required split
must preserve exact names/multiplicity and run combined for 13 plus independently for
7 and 6. The workflow isolation/fixture-only self-test rejects a missing/duplicate/
renamed/skipped test, cross-suite test registration, any non-extraction semantic diff
other than the exact fixture member, or inconsistent conditional required/allowed path
sets. Add `assistant-panel-conversation.test.tsx` to `TARGET_VITEST_FILES`, owner hashing,
the L02 command, and named isolation metadata; the harness is required but is not a test
target.

During the normal modularity-repair phase, temporarily disable the legacy single-file
fixture-only projection for `assistant-panel-interaction.test.tsx`: the fixture has moved
to the harness, so applying the old projection would either reject the required
extraction or accidentally ignore it. The split-specific verifier replaces that check
for the phase and remains a named L02, closure, and full-validation gate after the split,
sealing the exact 13-name/assertion multiset, helper/reset/import boundary, and exact
`makeUserSettings` fixture member in the harness. Never treat a disabled legacy
projection as permission to change an Assistant assertion.

## Historical pre-implementation grounded anchors

These 2026-07-13 line snapshots are retained as audit provenance. They describe the
pre-implementation source layout; current ownership and validation are anchored by the
named files, symbols, and regression suites in this contract rather than mutable line
numbers.

- Service key/value map, defaults, allowlist, validator:
  `userSettingsService.ts:33-80,99-260`.
- DB rows are already scoped by `userId`: `:263-320`.
- Client typed map/cache/write: `userSettingsClient.ts:12-24,31-85`.
- Current global localStorage-only hook:
  `useScreenEntryPreferences.ts:3-77`.
- Route-persistent provider mount and provider source:
  `AdminApp.tsx:1212-1234`, `AdminAuthContext.tsx:1-47`.
- Existing L03-owned transport-neutral hook call site, read-only in this leaf:
  `CustomScreenEntryEditor.tsx:717-719`. After the TASK-540-04-L03 split that file is a
  49-line facade; the shipped call site is
  `core/admin/ui/custom-screens/CustomScreenEntryRouteSession.tsx:183`, with
  `useScreenEntryPreferences` imported at `:65`.
- Additional exact `UserSettings` fixture which must compile with the new required key:
  `assistant-panel-interaction.test.tsx:81-107`.
- Existing self-scoped routes: `userSettingsRoutes.ts:33-56` and
  strict envelope `settingsSchemas.ts:16-23`. The shipped 59-line route module keeps both
  GETs at `userSettingsRoutes.ts:31-44` and the expected-owner-guarded PATCH at `:46-58`
  (`x-coderso-expected-user-id` compared at `:50-53` before `validate` at `:54` and the
  first write at `:56`); the strict envelope anchor still lands exactly on
  `userSettingsUpdateSchema`.
- Request headers are lower-cased into the shared route context before auth,
  rate-limit, CSRF, and handlers run: `router.ts:1-15`,
  `httpServer.ts:348-428`.
- Central runtime boundary and middleware order: `httpServer.ts:110-170,378-428`; at that
  2026-07-13 snapshot both user-settings service errors missed `errorResponse` and became
  500. Shipped: `errorResponse` spans `httpServer.ts:110-191` and maps
  `user_setting_identity_changed` to 409 at `:136-143` and both
  `user_settings_key_invalid` and `user_settings_value_invalid` to 400 at `:144-156`,
  ahead of the generic 500 fallback at `:190`; the request pipeline still runs
  `attachUserFromSession` at `:401`, rate-limit bucket resolution at `:404-416`, and
  `enforceCsrf` at `:417` before the route handlers at `:419-422`.

## Implementation Pseudocode

Use the key `customScreens.entry.preferences`. The new Bun-free contract module owns the
stored/view shapes, defaults, validation, and conversion without importing DB/admin code:

```ts
export type ScreenEntryPreferencesSettingValue = {
  version: 1;
  showFieldMetadata: boolean;
};

export type ScreenEntryPreferences = {
  showFieldMetadata: boolean;
};

export const DEFAULT_SCREEN_ENTRY_PREFERENCES: ScreenEntryPreferences = {
  showFieldMetadata: false,
};

export const DEFAULT_SCREEN_ENTRY_PREFERENCES_SETTING = {
  version: 1,
  showFieldMetadata: false,
} as const;

// Preserve the pre-existing public view normalizer. It accepts the versionless
// hook/UI shape and keeps its coerce-to-default compatibility behavior.
export function normalizeScreenEntryPreferences(value: unknown): ScreenEntryPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_SCREEN_ENTRY_PREFERENCES;
  }
  const record = value as Record<string, unknown>;
  return {
    showFieldMetadata:
      typeof record.showFieldMetadata === "boolean"
        ? record.showFieldMetadata
        : DEFAULT_SCREEN_ENTRY_PREFERENCES.showFieldMetadata,
  };
}

// Stored transport/service values are a separate strict, versioned contract.
export function normalizeScreenEntryPreferencesSetting(
  value: unknown
): ScreenEntryPreferencesSettingValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("user_settings_value_invalid");
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(
    (key) => key !== "version" && key !== "showFieldMetadata"
  )) {
    throw new Error("user_settings_value_invalid");
  }
  if (record.version !== 1 || typeof record.showFieldMetadata !== "boolean") {
    throw new Error("user_settings_value_invalid");
  }
  return { version: 1, showFieldMetadata: record.showFieldMetadata };
}

export function toScreenEntryPreferencesView(
  value: ScreenEntryPreferencesSettingValue
): ScreenEntryPreferences {
  return { showFieldMetadata: value.showFieldMetadata };
}

export function toScreenEntryPreferencesSetting(
  value: ScreenEntryPreferences
): ScreenEntryPreferencesSettingValue {
  return { version: 1, showFieldMetadata: value.showFieldMetadata };
}

// adminAuthIdentity.ts: the route-persistent provider, not a Screen consumer,
// owns this identity epoch. A publisher token prevents a stale provider cleanup
// from clearing a newer provider instance.
export type AdminAuthIdentitySnapshot = Readonly<{
  userId: string | null;
  epoch: number;
}>;
type AdminAuthIdentityListener = (next: AdminAuthIdentitySnapshot) => void;

let adminAuthIdentity: AdminAuthIdentitySnapshot = { userId: null, epoch: 0 };
let activeAdminAuthPublisher: symbol | null = null;
const adminAuthIdentityListeners = new Set<AdminAuthIdentityListener>();

export function getAdminAuthIdentity(): AdminAuthIdentitySnapshot {
  return adminAuthIdentity;
}

export function subscribeAdminAuthIdentity(
  listener: AdminAuthIdentityListener
): () => void {
  adminAuthIdentityListeners.add(listener);
  return () => adminAuthIdentityListeners.delete(listener);
}

export function publishAdminAuthIdentity(
  publisher: symbol,
  userId: string | null
): AdminAuthIdentitySnapshot {
  if (
    activeAdminAuthPublisher === publisher &&
    adminAuthIdentity.userId === userId
  ) return adminAuthIdentity;
  activeAdminAuthPublisher = publisher;
  adminAuthIdentity = { userId, epoch: adminAuthIdentity.epoch + 1 };
  for (const listener of adminAuthIdentityListeners) listener(adminAuthIdentity);
  return adminAuthIdentity;
}

export function clearAdminAuthIdentity(publisher: symbol): void {
  if (activeAdminAuthPublisher !== publisher) return;
  activeAdminAuthPublisher = null;
  adminAuthIdentity = { userId: null, epoch: adminAuthIdentity.epoch + 1 };
  for (const listener of adminAuthIdentityListeners) listener(adminAuthIdentity);
}

// AdminAuthContext.tsx: AdminApp keeps this provider mounted above route
// elements. Identity publication and provider-unmount cleanup are separate so
// A→B performs exactly one publish/epoch advance and never emits transitional null.
// A Screen hook unmount does not own or clear global auth identity.
const [authIdentityPublisher] = useState(() => Symbol("admin-auth-provider"));
useLayoutEffect(() => {
  publishAdminAuthIdentity(authIdentityPublisher, user?.id ?? null);
}, [authIdentityPublisher, user?.id]);
useLayoutEffect(
  () => () => clearAdminAuthIdentity(authIdentityPublisher),
  [authIdentityPublisher]
);

// userSettingsRoutes.ts: extend its local RouteContext with the already supplied
// shared-router header shape; do not add a new route or request-body field.
type RouteContext = {
  // existing params/query/body/user fields stay byte-identical
  headers?: Record<string, string | undefined>;
};

// headersObj is lower-cased by httpServer. This guard is
// optional for compatibility, but every Screen PATCH sends it. Compare before
// validation/setUserSetting so a stale A owner under session B performs no write.
const expectedUserId = ctx.headers?.["x-coderso-expected-user-id"];
if (expectedUserId !== undefined && expectedUserId !== ctx.user.id) {
  throw new Error("user_setting_identity_changed");
}

// httpServer.ts: keep these narrow mappings at the actual central boundary.
if (error.message === "user_setting_identity_changed") {
  return jsonResponse(
    toErrorResponse(
      new ApiError(
        "user_setting_identity_changed",
        "Authenticated user changed",
        409
      )
    ),
    { status: 409 }
  );
}
if (
  error.message === "user_settings_key_invalid" ||
  error.message === "user_settings_value_invalid"
) {
  const code = error.message;
  const message =
    code === "user_settings_key_invalid"
      ? "Invalid user setting key"
      : "Invalid user setting value";
  return jsonResponse(toErrorResponse(new ApiError(code, message, 400)), {
    status: 400,
  });
}

// userSettingsClient.ts: validate the untrusted JSON envelope before the generic
// return type is allowed to describe it. Value validation remains domain-owned;
// the Screen hook applies normalizeScreenEntryPreferencesSetting below.
function normalizeIsolatedUserSettingResponse<K extends keyof UserSettings>(
  expectedKey: K,
  payload: unknown
): { key: K; value: unknown } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("user_settings_response_invalid");
  }
  const record = payload as Record<string, unknown>;
  if (
    Object.keys(record).length !== 2 ||
    !("key" in record) ||
    !("value" in record) ||
    record.key !== expectedKey
  ) {
    throw new Error("user_settings_response_invalid");
  }
  return { key: expectedKey, value: record.value };
}

// These exact self-scoped transports never inspect, merge, invalidate, or
// populate the process-global aggregate userSettingsReadCache.
export async function getUserSettingIsolated<K extends keyof UserSettings>(
  key: K
): Promise<{ key: K; value: UserSettings[K] }> {
  const payload = await apiRequest<unknown>(
    `/user-settings/${encodeURIComponent(key)}`,
    { method: "GET" }
  );
  const response = normalizeIsolatedUserSettingResponse(key, payload);
  return { key: response.key, value: response.value as UserSettings[K] };
}

export async function setUserSettingIsolated<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K],
  options: Readonly<{ expectedUserId: string; signal?: AbortSignal }>
): Promise<{ key: K; value: UserSettings[K] }> {
  const payload = await apiRequest<unknown>(
    `/user-settings/${encodeURIComponent(key)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Coderso-Expected-User-Id": options.expectedUserId,
      },
      body: JSON.stringify({ value }),
      signal: options.signal,
    },
    { withCsrf: true }
  );
  const response = normalizeIsolatedUserSettingResponse(key, payload);
  return { key: response.key, value: response.value as UserSettings[K] };
}

// securitySettings.ts includes the header in defaults. cors.ts also owns a
// server-required union so older persisted allowedHeaders arrays remain usable.
const REQUIRED_ADMIN_CORS_HEADERS = ["x-coderso-expected-user-id"] as const;

function allowedCorsHeaders(configured: readonly string[]) {
  const byLowerCase = new Map(configured.map((header) => [header.toLowerCase(), header]));
  for (const required of REQUIRED_ADMIN_CORS_HEADERS) {
    if (!byLowerCase.has(required)) byLowerCase.set(required, required);
  }
  return [...byLowerCase.values()];
}

// A trusted-origin OPTIONS response lists content-type, x-csrf-token, and the
// expected-user header even when its supplied config models an older persisted value.
headers.set("Access-Control-Allow-Headers", allowedCorsHeaders(config.allowedHeaders).join(", "));

type PreferenceVersion = Readonly<{
  generation: number;
  pruneEpoch: number;
}>;
type LocalPreferenceView = PreferenceVersion &
  Readonly<{ view: ScreenEntryPreferences }>;
type ScopedPreferenceViews = ReadonlyMap<string, LocalPreferenceView>;
type PreferenceWriteOutcome =
  | Readonly<{ ok: true; preferences: ScreenEntryPreferences }>
  | Readonly<{ ok: false; reason: "identity_changed" | "transport" }>;
type PreferenceCoordinatorSnapshot = LocalPreferenceView &
  Readonly<{
    phase: "pending" | "succeeded" | "failed" | "hydrated";
    tail: Promise<PreferenceWriteOutcome> | null;
  }>;
type CoordinatedPreferenceRead = PreferenceVersion &
  Readonly<{
    authEpoch: number;
    promise: Promise<ScreenEntryPreferences>;
  }>;
type PreferencePruneTombstone = Readonly<{
  epoch: number;
  prunedVersion: PreferenceVersion;
  view: ScreenEntryPreferences;
}>;
type ActivePreferenceTransport = Readonly<{
  userId: string;
  authEpoch: number;
  controller: AbortController;
}>;

// Module-scoped authority is shared by all hook instances. Every value remains
// keyed by authenticated user identity; none enters browser storage or the
// aggregate user-settings cache.
const preferenceStateByUser = new Map<string, PreferenceCoordinatorSnapshot>();
const preferenceGenerationByUser = new Map<string, number>();
const preferenceListenersByUser = new Map<string, Set<() => void>>();
const preferenceReadByUser = new Map<string, CoordinatedPreferenceRead>();
const preferencePruneTimerByUser = new Map<
  string,
  ReturnType<typeof setTimeout>
>();
const preferencePruneEpochByUser = new Map<string, number>();
const preferencePruneTombstoneByUser = new Map<
  string,
  PreferencePruneTombstone
>();
const activePreferenceTransports = new Map<symbol, ActivePreferenceTransport>();
let preferenceAuthIdentity = getAdminAuthIdentity();
// Module-scoped subscription survives the last Screen consumer unmount. The
// route-persistent provider can therefore cancel A work while no Screen hook is
// mounted. App/provider teardown publishes null through the same path.
subscribeAdminAuthIdentity((next) => {
  preferenceAuthIdentity = next;
  for (const transport of activePreferenceTransports.values()) {
    if (
      transport.userId !== next.userId ||
      transport.authEpoch !== next.epoch
    ) transport.controller.abort();
  }
});
export const SCREEN_PREFERENCE_SETTLED_RETENTION_MS = 30_000;

function preferencesEqual(
  left: ScreenEntryPreferences,
  right: ScreenEntryPreferences
): boolean {
  return left.showFieldMetadata === right.showFieldMetadata;
}

function versionsEqual(
  left: PreferenceVersion,
  right: PreferenceVersion
): boolean {
  return (
    left.generation === right.generation &&
    left.pruneEpoch === right.pruneEpoch
  );
}

function getPreferencePruneEpoch(userId: string): number {
  return preferencePruneEpochByUser.get(userId) ?? 0;
}

function getPreferenceGeneration(userId: string): number {
  return preferenceGenerationByUser.get(userId) ?? 0;
}

function isPreferenceAuthIdentityCurrent(
  userId: string,
  authEpoch: number
): boolean {
  return (
    preferenceAuthIdentity.userId === userId &&
    preferenceAuthIdentity.epoch === authEpoch
  );
}

function capturePreferenceAuthIdentity(
  userId: string
): AdminAuthIdentitySnapshot | null {
  return preferenceAuthIdentity.userId === userId
    ? preferenceAuthIdentity
    : null;
}

function cancelPreferencePrune(userId: string): void {
  const timer = preferencePruneTimerByUser.get(userId);
  if (timer !== undefined) clearTimeout(timer);
  preferencePruneTimerByUser.delete(userId);
}

function schedulePreferencePrune(userId: string): void {
  cancelPreferencePrune(userId);
  const expected = preferenceStateByUser.get(userId);
  if (!expected || expected.tail) return;
  const timer = setTimeout(() => {
    if (preferencePruneTimerByUser.get(userId) !== timer) return;
    preferencePruneTimerByUser.delete(userId);
    if (
      (preferenceListenersByUser.get(userId)?.size ?? 0) > 0 ||
      preferenceStateByUser.get(userId) !== expected
    ) return;
    if (preferenceReadByUser.has(userId)) {
      schedulePreferencePrune(userId);
      return;
    }
    const epoch = getPreferencePruneEpoch(userId) + 1;
    preferencePruneEpochByUser.set(userId, epoch);
    // Keep only a tombstone for the exact pruned snapshot. It synchronously
    // rejects an older hook-local fallback with the same generation but a
    // different value. A hook that stayed mounted may carry this exact view
    // across A→B→A; a new remount has no local copy and must read the server.
    preferencePruneTombstoneByUser.set(userId, {
      epoch,
      prunedVersion: {
        generation: expected.generation,
        pruneEpoch: expected.pruneEpoch,
      },
      view: normalizeScreenEntryPreferences(expected.view),
    });
    preferenceStateByUser.delete(userId);
    preferenceGenerationByUser.delete(userId);
  }, SCREEN_PREFERENCE_SETTLED_RETENTION_MS);
  preferencePruneTimerByUser.set(userId, timer);
}

function isLocalPreferenceRetained(
  userId: string,
  local: LocalPreferenceView | undefined
): local is LocalPreferenceView {
  if (!local) return false;
  const shared = preferenceStateByUser.get(userId);
  if (
    shared &&
    versionsEqual(local, shared) &&
    preferencesEqual(local.view, shared.view)
  ) return true;
  const tombstone = preferencePruneTombstoneByUser.get(userId);
  return Boolean(
    tombstone &&
      tombstone.epoch === getPreferencePruneEpoch(userId) &&
      versionsEqual(local, tombstone.prunedVersion) &&
      preferencesEqual(local.view, tombstone.view)
  );
}

function notifyPreferenceSubscribers(userId: string): void {
  for (const listener of preferenceListenersByUser.get(userId) ?? []) listener();
}

function publishPreferenceSnapshot(
  userId: string,
  snapshot: PreferenceCoordinatorSnapshot
): void {
  preferenceStateByUser.set(userId, snapshot);
  notifyPreferenceSubscribers(userId);
}

function subscribePreferenceCoordinator(
  userId: string,
  listener: () => void
): () => void {
  cancelPreferencePrune(userId);
  const listeners = preferenceListenersByUser.get(userId) ?? new Set();
  listeners.add(listener);
  preferenceListenersByUser.set(userId, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    preferenceListenersByUser.delete(userId);
    // Pending work survives navigation. Settled state gets a bounded handoff
    // window before it is reduced to the exact-view prune tombstone above.
    if (preferenceStateByUser.get(userId)?.tail === null) {
      schedulePreferencePrune(userId);
    }
  };
}

function getPreferenceCoordinatorSnapshot(
  userId: string | null
): PreferenceCoordinatorSnapshot | null {
  return userId ? preferenceStateByUser.get(userId) ?? null : null;
}

function getOrCreatePreferenceRead(
  userId: string,
  authEpoch: number
): CoordinatedPreferenceRead {
  const generation = getPreferenceGeneration(userId);
  const pruneEpoch = getPreferencePruneEpoch(userId);
  const existing = preferenceReadByUser.get(userId);
  if (
    existing?.generation === generation &&
    existing.pruneEpoch === pruneEpoch &&
    existing.authEpoch === authEpoch
  ) return existing;

  const promise = isPreferenceAuthIdentityCurrent(userId, authEpoch)
    ? getUserSettingIsolated("customScreens.entry.preferences").then(
        ({ value }) =>
          toScreenEntryPreferencesView(
            normalizeScreenEntryPreferencesSetting(value)
          )
      )
    : Promise.reject(new Error("preference_identity_changed"));
  const read = { generation, pruneEpoch, authEpoch, promise };
  preferenceReadByUser.set(userId, read);
  const removeIfCurrent = (): void => {
    if (preferenceReadByUser.get(userId) !== read) return;
    preferenceReadByUser.delete(userId);
    if ((preferenceListenersByUser.get(userId)?.size ?? 0) === 0) {
      schedulePreferencePrune(userId);
    }
  };
  // Success, transport rejection, malformed envelope, and malformed stored
  // value all evict this exact registry entry. The current mounted effect stays
  // fail-closed and does not spin; a later identity visit or a fully fresh
  // remount creates a fresh GET.
  void promise.then(removeIfCurrent, removeIfCurrent);
  return read;
}

function enqueuePreferenceWrite(
  userId: string,
  authIdentity: AdminAuthIdentitySnapshot,
  view: ScreenEntryPreferences
): PreferenceVersion & Readonly<{ tail: Promise<PreferenceWriteOutcome> }> {
  const generation = getPreferenceGeneration(userId) + 1;
  const pruneEpoch = getPreferencePruneEpoch(userId);
  cancelPreferencePrune(userId);
  preferenceGenerationByUser.set(userId, generation);
  // A new write makes an older coordinated read unjoinable. Its identity-guarded
  // cleanup cannot delete a later read installed in the same slot.
  preferenceReadByUser.delete(userId);
  const previousTail = preferenceStateByUser.get(userId)?.tail;
  const start = previousTail
    ? previousTail.then(() => undefined, () => undefined)
    : Promise.resolve();
  let tail: Promise<PreferenceWriteOutcome>;
  tail = start
    .then(async (): Promise<PreferenceWriteOutcome> => {
      // This check is deliberately after the preceding tail. Capturing A at
      // enqueue time is insufficient because PATCH transport starts later.
      if (!isPreferenceAuthIdentityCurrent(userId, authIdentity.epoch)) {
        return { ok: false, reason: "identity_changed" };
      }
      const controller = new AbortController();
      const token = Symbol("screen-preference-write");
      activePreferenceTransports.set(token, {
        userId,
        authEpoch: authIdentity.epoch,
        controller,
      });
      try {
        if (!isPreferenceAuthIdentityCurrent(userId, authIdentity.epoch)) {
          controller.abort();
          return { ok: false, reason: "identity_changed" };
        }
        const { value } = await setUserSettingIsolated(
          "customScreens.entry.preferences",
          toScreenEntryPreferencesSetting(view),
          { expectedUserId: userId, signal: controller.signal }
        );
        if (!isPreferenceAuthIdentityCurrent(userId, authIdentity.epoch)) {
          return { ok: false, reason: "identity_changed" };
        }
        return {
          ok: true,
          preferences: toScreenEntryPreferencesView(
            normalizeScreenEntryPreferencesSetting(value)
          ),
        };
      } catch {
        return {
          ok: false,
          reason:
            controller.signal.aborted ||
            !isPreferenceAuthIdentityCurrent(userId, authIdentity.epoch)
              ? "identity_changed"
              : "transport",
        };
      } finally {
        const active = activePreferenceTransports.get(token);
        if (active?.controller === controller) {
          activePreferenceTransports.delete(token);
        }
      }
    })
    .then((outcome): PreferenceWriteOutcome => {
      const current = preferenceStateByUser.get(userId);
      if (
        current?.generation !== generation ||
        current.pruneEpoch !== pruneEpoch ||
        current.tail !== tail
      ) return outcome;
      const settled: PreferenceCoordinatorSnapshot = {
        generation,
        pruneEpoch,
        phase: outcome.ok ? "succeeded" : "failed",
        // A failed or malformed PATCH may retain only the captured normalized
        // local intent as unsynced state. No response-derived value is published.
        view: outcome.ok ? outcome.preferences : view,
        tail: null,
      };
      publishPreferenceSnapshot(userId, settled);
      if ((preferenceListenersByUser.get(userId)?.size ?? 0) === 0) {
        schedulePreferencePrune(userId);
      }
      return outcome;
    });
  publishPreferenceSnapshot(userId, {
    generation,
    pruneEpoch,
    phase: "pending",
    view,
    tail,
  });
  return { generation, pruneEpoch, tail };
}

function publishHydratedPreference(
  userId: string,
  version: PreferenceVersion,
  view: ScreenEntryPreferences
): boolean {
  const current = preferenceStateByUser.get(userId);
  if (
    getPreferenceGeneration(userId) !== version.generation ||
    getPreferencePruneEpoch(userId) !== version.pruneEpoch ||
    current?.tail ||
    current?.phase === "failed"
  ) return false;
  publishPreferenceSnapshot(userId, {
    ...version,
    phase: "hydrated",
    view,
    tail: null,
  });
  return true;
}

export function useScreenEntryPreferences(): Readonly<{
  preferences: ScreenEntryPreferences;
  setPreferences: (next: ScreenEntryPreferences) => void;
}> {
  const { user } = useAdminAuth();
  const userId = user?.id ?? null;
  const [observedByUser, setObservedByUser] =
    useState<ScopedPreferenceViews>(() => new Map());
  const [optimisticByUser, setOptimisticByUser] =
    useState<ScopedPreferenceViews>(() => new Map());
  // This state belongs only to this hook mount. It is neither keyed globally nor
  // transported/stored, and a fresh remount therefore starts from OFF again.
  const [noUserPreferences, setNoUserPreferences] =
    useState<ScreenEntryPreferences>(() => DEFAULT_SCREEN_ENTRY_PREFERENCES);
  const requestGeneration = useRef(0);
  const localUnsyncedByUser = useRef(new Map<string, LocalPreferenceView>());
  const currentUserIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const subscribe = useCallback(
    (listener: () => void): (() => void) =>
      userId
        ? subscribePreferenceCoordinator(userId, () => {
            // Layout cleanup wins over the later passive subscription cleanup.
            // A deferred coordinator publish in that window must not call any
            // React setter or notify useSyncExternalStore for this hook.
            if (!mountedRef.current || currentUserIdRef.current !== userId) return;
            const snapshot = getPreferenceCoordinatorSnapshot(userId);
            if (snapshot) {
              const exact: LocalPreferenceView = {
                generation: snapshot.generation,
                pruneEpoch: snapshot.pruneEpoch,
                view: normalizeScreenEntryPreferences(snapshot.view),
              };
              // Mirror generation + prune epoch + exact view before React's
              // render notification. Recording generation alone lets H1 revive
              // its old OFF view after H2 has published ON.
              setObservedByUser((current) => {
                const present = current.get(userId);
                if (
                  present &&
                  versionsEqual(present, exact) &&
                  preferencesEqual(present.view, exact.view)
                ) return current;
                const next = new Map(current);
                next.set(userId, exact);
                return next;
              });
              const localUnsynced = localUnsyncedByUser.current.get(userId);
              if (localUnsynced && !versionsEqual(localUnsynced, exact)) {
                localUnsyncedByUser.current.delete(userId);
                setOptimisticByUser((current) => {
                  if (!versionsEqual(current.get(userId) ?? exact, localUnsynced)) {
                    return current;
                  }
                  const next = new Map(current);
                  next.delete(userId);
                  return next;
                });
              }
            }
            listener();
          })
        : () => undefined,
    [userId]
  );
  const readSnapshot = useCallback(
    (): PreferenceCoordinatorSnapshot | null =>
      getPreferenceCoordinatorSnapshot(userId),
    [userId]
  );
  const sharedSnapshot = useSyncExternalStore(
    subscribe,
    readSnapshot,
    readSnapshot
  );
  const localOptimistic = userId ? optimisticByUser.get(userId) : undefined;
  const localObserved = userId ? observedByUser.get(userId) : undefined;
  const preferences = userId
    ? sharedSnapshot?.view ??
      (isLocalPreferenceRetained(userId, localOptimistic)
        ? localOptimistic.view
        : undefined) ??
      (isLocalPreferenceRetained(userId, localObserved)
        ? localObserved.view
        : undefined) ??
      DEFAULT_SCREEN_ENTRY_PREFERENCES
    : noUserPreferences;

  useLayoutEffect((): (() => void) => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useLayoutEffect((): (() => void) => {
    // This hook tracks only its own render authority. AdminAuthProvider is the
    // sole identity-epoch publisher, so unmounting the final Screen consumer
    // cannot strand queued A work outside future A→B/null notifications.
    currentUserIdRef.current = userId;
    return () => {
      if (currentUserIdRef.current === userId) currentUserIdRef.current = null;
      requestGeneration.current += 1;
    };
  }, [userId]);

  useEffect((): (() => void) => {
    const capturedUserId = userId;
    const request = ++requestGeneration.current;
    const authIdentity = capturedUserId
      ? capturePreferenceAuthIdentity(capturedUserId)
      : null;
    let active = true;
    if (!capturedUserId || !authIdentity) return () => { active = false; };
    void (async (): Promise<void> => {
      // Re-read the tail after every await so a write appended while waiting is
      // also part of the returning identity's barrier.
      while (active) {
        const tail = preferenceStateByUser.get(capturedUserId)?.tail;
        if (!tail) break;
        await tail; // handled outcomes never reject
        if (
          !active ||
          currentUserIdRef.current !== capturedUserId ||
          requestGeneration.current !== request ||
          !isPreferenceAuthIdentityCurrent(
            capturedUserId,
            authIdentity.epoch
          )
        ) return;
      }

      const unsynced = localUnsyncedByUser.current.get(capturedUserId);
      if (
        isLocalPreferenceRetained(capturedUserId, unsynced) ||
        preferenceStateByUser.get(capturedUserId)?.phase === "failed"
      ) return;

      const coordinatedRead = getOrCreatePreferenceRead(
        capturedUserId,
        authIdentity.epoch
      );
      const readVersion: PreferenceVersion = {
        generation: coordinatedRead.generation,
        pruneEpoch: coordinatedRead.pruneEpoch,
      };
      const hydrated = await coordinatedRead.promise;
      const readIsAuthoritative = (): boolean =>
        active &&
        mountedRef.current &&
        currentUserIdRef.current === capturedUserId &&
        requestGeneration.current === request &&
        isPreferenceAuthIdentityCurrent(capturedUserId, authIdentity.epoch) &&
        getPreferenceGeneration(capturedUserId) === readVersion.generation &&
        getPreferencePruneEpoch(capturedUserId) === readVersion.pruneEpoch &&
        !preferenceStateByUser.get(capturedUserId)?.tail &&
        preferenceStateByUser.get(capturedUserId)?.phase !== "failed" &&
        !isLocalPreferenceRetained(
          capturedUserId,
          localUnsyncedByUser.current.get(capturedUserId)
        );
      if (!readIsAuthoritative()) return;
      if (
        !publishHydratedPreference(capturedUserId, readVersion, hydrated) ||
        !readIsAuthoritative()
      ) return;
      setObservedByUser((current) => {
        if (!readIsAuthoritative()) return current;
        const next = new Map(current);
        next.set(capturedUserId, { ...readVersion, view: hydrated });
        return next;
      });
      setOptimisticByUser((current) => {
        if (!readIsAuthoritative()) return current;
        const next = new Map(current);
        next.delete(capturedUserId);
        return next;
      });
    })().catch(() => undefined); // unavailable/invalid response => safe current/default view
    return () => { active = false; };
  }, [userId]);

  const setPreferences = useCallback(
    (next: ScreenEntryPreferences): void => {
      // Normalize both authenticated and no-user actions through the public view
      // contract. No-user actions update only mount-local ephemeral state.
      const normalized = normalizeScreenEntryPreferences(next);
      if (!userId) {
        setNoUserPreferences(normalized);
        return;
      }
      const capturedUserId = userId;
      const authIdentity = capturePreferenceAuthIdentity(capturedUserId);
      if (!authIdentity) return;
      // The public normalizer owns UI compatibility. Boolean(...) would turn an
      // invalid truthy value into an authored true and diverge from that contract.
      const { generation, pruneEpoch, tail } = enqueuePreferenceWrite(
        capturedUserId,
        authIdentity,
        normalized
      );
      const optimistic = { generation, pruneEpoch, view: normalized } as const;
      setOptimisticByUser((current) => {
        const nextByUser = new Map(current);
        nextByUser.set(capturedUserId, optimistic);
        return nextByUser;
      });
      localUnsyncedByUser.current.set(capturedUserId, optimistic);
      void tail.then((outcome): void => {
        const currentVersion: PreferenceVersion = {
          generation: getPreferenceGeneration(capturedUserId),
          pruneEpoch: getPreferencePruneEpoch(capturedUserId),
        };
        if (!versionsEqual(currentVersion, optimistic)) {
          // Drop only this hook's superseded marker/view. A newer generation from
          // this or another instance remains authoritative.
          const marker = localUnsyncedByUser.current.get(capturedUserId);
          if (marker && versionsEqual(marker, optimistic)) {
            localUnsyncedByUser.current.delete(capturedUserId);
            if (mountedRef.current) {
              setOptimisticByUser((current) => {
                const present = current.get(capturedUserId);
                if (!present || !versionsEqual(present, optimistic)) return current;
                const nextByUser = new Map(current);
                nextByUser.delete(capturedUserId);
                return nextByUser;
              });
            }
          }
          return;
        }
        if (!outcome.ok) {
          // Identity cancellation and transport failure are handled unsynced A
          // state. Neither auto-replays under B; a later explicit action while A
          // is current captures A's fresh epoch and safely retries.
          return;
        }
        const marker = localUnsyncedByUser.current.get(capturedUserId);
        if (marker && versionsEqual(marker, optimistic)) {
          localUnsyncedByUser.current.delete(capturedUserId);
        }
        if (!mountedRef.current) return;
        setObservedByUser((current) => {
          const latest: PreferenceVersion = {
            generation: getPreferenceGeneration(capturedUserId),
            pruneEpoch: getPreferencePruneEpoch(capturedUserId),
          };
          if (!versionsEqual(latest, optimistic)) return current;
          const nextByUser = new Map(current);
          nextByUser.set(capturedUserId, {
            ...optimistic,
            view: outcome.preferences,
          });
          return nextByUser;
        });
        setOptimisticByUser((current) => {
          const present = current.get(capturedUserId);
          if (!present || !versionsEqual(present, optimistic)) return current;
          const nextByUser = new Map(current);
          nextByUser.delete(capturedUserId);
          return nextByUser;
        });
      });
    },
    [userId]
  );
  return { preferences, setPreferences };
}
```

Both isolated helpers request `unknown`, reject non-exact `{key,value}` envelopes and
only then expose the requested generic key/value shape. `userSettingsService.ts`,
`UserSettings`, and the hook
import these exact types/helpers; the hook re-exports its pre-existing public view type,
default, and `normalizeScreenEntryPreferences` name from the Bun-free owner for source
compatibility. The public view normalizer remains versionless and coerce-to-default;
it is not an alias of the strict, versioned `normalizeScreenEntryPreferencesSetting`.
Both isolated GET and PATCH responses cross the exact-envelope guard and then the
Screen value crosses its strict stored-value normalizer before the hook may use it; a
TypeScript response generic is not runtime validation. The
PATCH `AbortSignal` is passed in the same `RequestInit` that `apiRequest` reuses for its
PATCH attempts. The existing CSRF-token fetch does not consume that signal and may
finish after identity cancellation; immediately afterward the initial or retry PATCH
still receives the already-aborted signal and emits no PATCH request. Every Screen
PATCH also sends `X-Coderso-Expected-User-Id` from its captured identity. If another
tab changes the cookie to B before this tab observes auth B, the server compares that
captured A header with authenticated B and returns
`user_setting_identity_changed`/409 before writing.
No `JSON_HEADERS`, `DEFAULT_WITHOUT_VERSION_VIEW`, `normalizeView`, `toView`, or `toStored`
placeholder remains.

Remove all reads/writes of
`coderso.screens.entry.preferences.v1`. Do not replace it with another global
browser key. The hook reads `user.id` from the existing `AdminAuthContext`; no caller
prop changes. The route-persistent `AdminAuthProvider` publishes identity before
passive Screen work. Its publish-only layout effect handles A/B/null prop values, while
a separate stable-token cleanup-only effect clears authority on actual provider
unmount; therefore A→B emits exactly one epoch/event and never an intermediate null.
Screen consumer unmount never clears that authority. `getUserSettingIsolated` and
`setUserSettingIsolated` are the only client functions this hook uses. Existing
aggregate-aware `getUserSetting` /
`setUserSetting` keep their legacy transport (or may delegate isolated GET only), and
only those aggregate-aware wrappers may touch `userSettingsReadCache`; they need not
send the optional expected-user header. The isolated Screen setter requires an exact
`expectedUserId` and always emits it. In particular, a delayed isolated PATCH from user
A cannot merge into an aggregate cache populated after a switch to user B. The existing
hook call site remains source-compatible.

## Security Contract

- Existing internal user-settings route family; authenticated session and
  server-derived `ctx.user.id` scope every read/write. This self-service preference
  scope requires no additional RBAC permission beyond the authenticated Admin session;
  there is no API-key mode or API-key scope for this route family.
- PATCH retains CSRF and resolves to the existing `admin_write` rate-limit bucket;
  GET resolves to `admin_read`. Schema rejects unknown envelope keys and service
  rejects unknown setting keys plus unknown value keys/version/type.
- The optional `X-Coderso-Expected-User-Id` header is compared exactly with the
  already authenticated session user before the Screen write. Legacy omission remains
  accepted; every Screen PATCH sends the captured owner. A mismatch performs no write
  and returns machine-readable `user_setting_identity_changed` at HTTP 409.
- The central boundary returns `{error:{code,message}}` with status 400 for the
  exact `user_settings_key_invalid` and `user_settings_value_invalid` codes; it
  returns status 409 for exact `user_setting_identity_changed`. It does not expose
  a stack or turn any of those client errors into 500.
- No public mode, nonce, signature/HMAC, CAPTCHA, secret, entry content, or migration.
  Those anonymous-write anti-abuse controls are inapplicable because this task adds no
  public write; it does not weaken the internal session/CSRF/rate-limit boundary.
- With no authenticated identity, the hook's OFF→toggle behavior is strictly
  hook-mount-local: it makes no user-settings request, browser-storage write, or
  module-scoped publication and resets to OFF on a fresh remount.

## Error/compatibility flow

- Missing row returns server default. Invalid stored row falls back through the
  existing service behavior. A malformed runtime GET or PATCH response is rejected by
  the strict stored-value normalizer and no response-derived value can become hook
  state. For malformed PATCH, the normalized locally authored per-user optimistic view
  remains visible as failed/unsynced state; it is not evidence of response acceptance,
  never auto-replays, and only a later explicit setter action retries it.
- Network/auth failure leaves a functional in-memory default/current value and
  never leaks another user's cache or localStorage value. In the no-user case, the
  functional value is an ephemeral mount-local OFF default that may be toggled locally
  and resets on remount without transport or storage.
- A rejected GET, malformed exact envelope, or malformed Screen value removes only its
  identity-matched read-registry entry on settlement. The same mounted effect remains
  fail-closed and does not auto-loop. Fully unmounting and freshly mounting the Screen
  consumer, or visiting another identity and returning, starts a fresh GET. A failed
  PATCH never self-replays: only a new visible setter action creates one new generation
  and retry attempt; failure followed by that fresh action can succeed.
- PATCH operations are serialized independently per user by a module-scoped
  coordinator shared across hook instances. Each intent captures `{userId, authEpoch}`
  when queued and rechecks it immediately before its delayed PATCH starts. The
  route-persistent provider—not a Screen hook—advances the module epoch for A→B/null
  and provider unmount, then aborts every old-epoch active transport. Consequently this
  still works after the last Screen consumer unmounts. A mere Screen-route navigation
  remount does not change provider identity. CSRF acquisition itself may finish, but
  every subsequent PATCH/retry receives the same already-aborted signal and emits zero
  PATCHes. The server expected-owner comparison independently closes the cross-tab
  cookie-change window. Identity cancellation resolves as handled unsynced A state and
  never auto-replays; a later explicit action while A is current captures the fresh A
  epoch and retries safely.
- A newer same-user toggle waits for the prior handled outcome and is persisted in UI
  order, so a slow ON cannot overwrite a later OFF across rapid actions, same-user
  navigation remounts, or two concurrent consumers. Failure of an earlier PATCH does
  not block the later queued PATCH. Only the current `{generation, pruneEpoch, tail}` may
  settle shared state, and every tail resolves to a handled outcome.
- A transition to a different user immediately derives the default and never exposes
  the prior user's state. Pending state survives the last unsubscribe until settlement.
  Settled state gets one identity-guarded 30-second render/subscription handoff window,
  cancelled by a subscriber or new write. Pruning removes shared state/generation and
  advances a persistent prune epoch while retaining a tombstone of the exact pruned
  `{generation, pruneEpoch, view}`.
- Every subscriber mirrors that exact triple before React's render notification. After
  pruning, the tombstone synchronously rejects any older/superseded hook-local fallback,
  including an H1 OFF value when H2's latest shared value was ON. A hook that remained
  mounted across A→B→A may continue painting only its exact tombstone-matching view while
  a fresh authoritative GET runs, so it need not flash default or stale H1 state. A new
  remount has no hook-local copy and therefore starts from the safe default and server
  GET. Tests must keep those two cases distinct; they must not demand no-default paint
  from a brand-new mount without Suspense or another synchronous durable source.
- Returning to the same user first waits until its shared write tail is stable. A
  replacement instance mounted before settlement renders the coordinator's pending view
  and cannot GET an older durable value. A failed or identity-cancelled latest tail keeps
  only that user's exact optimistic view plus unsynced marker. Superseded markers are
  compared by generation and prune epoch and removed by the shared subscription; mere
  marker presence never suppresses a newer read.
- If the server-side A value changed while B was active and A has no pending/unsynced
  write, the returning A read replaces A's retained exact view. Concurrent consumers
  join one GET only for the same `{userId, authEpoch, generation, pruneEpoch}`; a write
  invalidates that registry entry, and the settled promise is removed with an identity
  guard. GET may commit only while auth identity, request generation, write generation,
  prune epoch, tail absence, and unsynced absence remain unchanged, including inside the
  React state updater. The layout-bound identity guard rejects late A in the
  render(B)→passive-cleanup window, and a newer local A toggle beats delayed refresh.
- The isolated writer has no aggregate-cache side effect. Successful inactive-user
  work can update only its own keyed coordinator state; unmounted hooks never call React
  state setters. An undispatched A intent is cancelled by provider A→B/null even when no
  Screen consumer remains. If a stale tab nevertheless transports expected A with
  session B, the route returns 409 before persistence. Neither path can resurrect or
  mutate B's snapshot or aggregate cache.

## Gate tests owned here; aggregate additions owned by TASK-540-06

- `tests/unit/settings/userSettingsService.test.ts`: exact value schema,
  unknown/type/version rejection, per-user isolation/default; the strict stored
  normalizer rejects the versionless view while the separate public view normalizer
  accepts `{showFieldMetadata:boolean}` and preserves legacy coerce-to-default behavior.
- `tests/vitest/admin/userSettingsClient.test.ts`: exact isolated typed read/write exports;
  both bypass aggregate reads/writes; the setter forwards the exact caller
  `AbortSignal` and captured expected user as
  `X-Coderso-Expected-User-Id` in `RequestInit`, including the request object reused by
  the CSRF retry. Hold CSRF acquisition, abort, then release it and prove the CSRF GET
  may finish while the native/mock transport rejects the already-aborted PATCH before
  a server hit; repeat after a refreshable-CSRF response and prove the retry receives
  the already-aborted signal and produces zero further PATCH network hits.
  Both isolated helpers reject a non-object, missing/extra-key, or wrong-key response
  envelope before returning a value.
  Defer A's PATCH, populate aggregate state for B, resolve/abort A, and prove B's
  aggregate remains byte-identical.
- `tests/integration/routes/cors.test.ts`: a trusted-origin OPTIONS response built from
  an older configured header list still includes the expected-user header exactly once,
  case-insensitive configured duplicates do not duplicate it, and configured custom
  headers plus credentials/origin behavior remain unchanged. A separate assertion reads
  `SECURITY_SETTINGS_DEFAULTS.cors.allowedHeaders` and pins the new expected-user header
  in the default itself.
- `tests/vitest/ui/admin-auth-identity.test.tsx`: render the real
  `AdminAuthProvider`, assert exact A publication, no epoch change for a same-ID prop
  update, exactly one A→B publication/epoch advance with no transitional null, one null
  publication for an actual null prop, provider-unmount cleanup, and a stale old
  provider cleanup that cannot clear a newer publisher token. This suite tests only
  the boundary and does not duplicate the Screen coordinator.
- The conditional 7+6 `tests/vitest/ui/assistant-panel-interaction.test.tsx` and
  `tests/vitest/ui/assistant-panel-conversation.test.tsx` pair: preserve the exact
  13-name Assistant behavior multiset and add only
  `"customScreens.entry.preferences": {version:1, showFieldMetadata:false}` to the
  harness-owned typed complete-`UserSettings` fixture. Do not alter Assistant behavior
  assertions, payloads, or mocks.
- `tests/vitest/ui/use-screen-entry-preferences.test.ts` owns the coordinator matrix:
  async hydrate; no localStorage; no-user mount-local OFF→toggle behavior with zero
  GET/PATCH/storage calls and reset to OFF after full remount; public-view normalization
  versus strict stored-setting normalization; invalid truthy input passed to the setter
  follows the public normalizer rather than `Boolean(...)`; malformed GET and PATCH
  response-derived values never enter state; a malformed PATCH retains the already
  normalized local per-user optimistic intent as failed/unsynced without auto-replay,
  then one later explicit setter action makes exactly one retry; optimistic
  success/failure/unmount; and no unhandled rejection or synchronous effect-body state
  update.
- The same hook suite serializes rapid ON→OFF and two opposite simultaneous same-user
  consumers (one PATCH in flight, deterministic server order, final durable/UI OFF),
  proves an earlier transport failure releases the later queued action, and proves a
  same-user Screen navigation remount under the still-mounted provider neither advances
  the auth epoch nor aborts pending work. Explicitly reject one GET/malformed envelope,
  prove the same mounted effect sends no retry loop, then fully remount (and separately
  visit B→A) and prove exactly one fresh GET succeeds. Reject one PATCH, prove no
  automatic retry, invoke the setter once more, and prove exactly one fresh PATCH
  succeeds. The replacement instance renders the shared pending value, performs no
  early GET, and revalidates only after settlement.
- Add the identity-race test explicitly: queue A ON then A OFF with the first PATCH
  unresolved, unmount the only Screen consumer while keeping the real provider mounted,
  rerender that provider A→B before the first tail releases, and then release it. Assert
  the active A signal is aborted, the queued second PATCH hit count remains zero, no A
  intent is emitted with B's session, and B remains default/unchanged even though no
  Screen consumer existed when identity changed. Both handled results retain only
  A-keyed unsynced state and never auto-replay. After returning to A, one explicit safe
  A action captures the fresh epoch and persists. Switching provider identity while
  CSRF acquisition/retry is waiting may let the CSRF GET finish, but every subsequent
  attempt receives the already-aborted signal and the PATCH hit count remains zero.
  Also reject an A GET/result settling in the render(B)→passive-cleanup window.
- Exercise shared-view retention non-symmetrically: H1 first observes durable OFF, only
  H2 publishes OFF→ON, and the coordinator callback mirrors exact ON plus its generation
  and prune epoch into both mounted consumers. Within the 30-second handoff, A→B→A
  renders ON with no default/old-OFF paint or redundant GET. After fake-timer pruning,
  the exact-view tombstone rejects H1's older OFF fallback; the same still-mounted hooks
  may carry only exact ON while one joined authoritative GET runs and then converge on
  its response. A changed server value replaces retained ON when no write is pending;
  a newer local toggle wins instead. By contrast, fully unmount those hooks after prune,
  create a fresh instance with no local exact view, and assert safe default plus a fresh
  GET before server convergence—do not impose the same-session no-default assertion on
  this new-remount case.
- Finish the hook matrix with an H1 failed write superseded by H2 success, cleanup of
  only the older `{generation, pruneEpoch}` marker/view, one GET shared by concurrent
  same-user hydrations, read-registry identity cleanup, state/generation/timer pruning,
  returning to A while A's tail is pending, failed/identity-cancelled A suppressing an
  older GET, and A/B keyed isolation for every delayed read/write result. Hold a
  coordinator settlement, run the hook's layout unmount cleanup while its passive
  subscription cleanup is still pending, then publish the settlement and prove the
  subscription wrapper observes `mountedRef.current === false`: zero React setters,
  zero listener notification, and no unmounted-update warning.
- `tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx`:
  mount the real entry toolbar under `AdminAuthProvider`, prove default OFF, toggle
  ON through the visible switch, await the isolated PATCH, remount as the same user
  and hydrate ON, then switch A→B and derive OFF immediately without reading or
  writing `coderso.screens.entry.preferences.v1`. On same-mounted-session B→A, render
  only A's exact latest keyed view during authoritative refresh; a changed response
  replaces it only when no newer local action exists. A fresh remount after prune starts
  safely from default and GET. Return while A's PATCH is pending waits for its tail;
  success revalidates durable A, while failure/identity cancellation preserves only A's
  unsynced view. Rapid visible ON→OFF persists in order with no concurrent PATCHes, and
  same-user navigation before settlement preserves pending UI. Deferred/cancelled A
  work cannot alter B and vice versa. This suite asserts visible switch state and owns
  the persistence/UI seam without duplicating the hook algorithm. It also keeps the
  provider mounted, removes the entry-toolbar consumer with A work queued, publishes B
  at the provider boundary, releases A's tail, and visibly proves B remains OFF while
  the queued A PATCH transport count is zero.
- `tests/integration/routes/userSettings.test.ts`: authenticated self-scope,
  strict `{value}` envelope, CSRF, `admin_read`/`admin_write` bucket selection,
  both 400 error mappings, and the expected-owner 409 mapping through the actual
  `startHttpServer` pipeline.
  Retain the route-registration assertion, then perform a DB preflight and start one
  real `startHttpServer({port:0})`. Resolve `adminPath` and the request `Host` from the
  configured `site.adminBaseUrl` with the bound host as fallback. Create two unique
  users and sessions through `createSession`, issue per-session CSRF values with
  `createCsrfToken` + `setCsrfToken`, and send the real session cookie, CSRF header, Host,
  and a suite-unique `User-Agent` marker on every request.
- Reset `resetRateLimitBuckets()` before and after the HTTP suite; pin GET/PATCH bucket
  selection with `resolveRateLimitBucket` and exercise both methods through the real
  middleware pipeline. Write different values through the two sessions and prove each
  GET sees only its server-derived self-scope. Missing authentication is 401;
  missing/invalid CSRF is 403; `{value, extra}` is `validation_error` 400; unknown key
  and invalid preference value retain their exact machine-readable codes at 400. With
  session B authenticated, send expected-user A and a valid B CSRF token, assert exact
  `user_setting_identity_changed`/409, then GET as B and query B's exact settings row to
  prove no write occurred. Omit the header in one legacy PATCH and prove it retains its
  existing authenticated self-scope.
- `tests/integration/routes/userSettingsAccessLogHarness.test.ts`: the eight existing
  deterministic injected-clock/in-memory tests for the stateless support module. This
  suite owns no server or DB fixture and is independently runnable; the retained route
  suite consumes the same helpers in the real HTTP flow without importing this test
  file or causing its tests to execute twice.
- Every HTTP request in this suite goes through one `trackedFetch` helper. The helper
  appends exactly one completed-request expectation only after receiving a response;
  no test may call `fetch` directly. Use this executable shape (names may differ, values
  and invariants may not):

```ts
import {
  expectedAccessLogSignature,
  trackedFetch,
  type ExpectedAccessLog,
} from "./support/userSettingsAccessLogHarness";

testIfDb("real HTTP user-settings routes ...", async () => {
  // Marker and ledger are local to this one real-flow test, never support globals.
  const marker = `wf540-user-settings-${crypto.randomUUID()}`;
  const completedRequestLedger: ExpectedAccessLog[] = [];
  const response = await trackedFetch(
    url,
    requestInit,
    expected,
    marker,
    completedRequestLedger
  );
  expect(response.status).toBe(expected.status);
  const expectedSignatures = completedRequestLedger.map(expectedAccessLogSignature);
  // Pass the same local marker/ledger-derived signatures into cleanup.
});
```

The polling helper is dependency-injected for deterministic failure tests and follows
this state machine; `isSubmultiset` and `sameArray` compare counted sorted strings, not
truthy presence:

```ts
type AccessLogCandidate = Readonly<{
  id: string;
  userAgent: string | null;
  method: string;
  path: string;
  status: number;
  userId: string | null;
  sessionId: string | null;
}>;
type PollDeps = Readonly<{
  query: () => Promise<readonly AccessLogCandidate[]>;
  deleteExactIds: (ids: readonly string[]) => Promise<void>;
  now: () => number;
  wait: (ms: number) => Promise<void>;
}>;
type AccessLogScope = Readonly<{
  marker: string;
  userIds: ReadonlySet<string>;
  sessionIds: ReadonlySet<string>;
}>;
type StableAccessLogInventory = Readonly<{
  ids: readonly string[];
  behaviorError:
    | "access_log_missing"
    | "access_log_extra"
    | "access_log_late"
    | "access_log_unstable"
    | null;
  scopeInvalid: boolean;
}>;

function sameArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isSubmultiset(
  actual: readonly string[],
  expected: readonly string[]
): boolean {
  const remaining = new Map<string, number>();
  for (const value of expected) remaining.set(value, (remaining.get(value) ?? 0) + 1);
  for (const value of actual) {
    const count = remaining.get(value) ?? 0;
    if (count === 0) return false;
    remaining.set(value, count - 1);
  }
  return true;
}

function isOwnedAccessLogCandidate(
  row: AccessLogCandidate,
  scope: AccessLogScope
): boolean {
  return (
    row.userAgent === scope.marker ||
    (row.userId !== null && scope.userIds.has(row.userId)) ||
    (row.sessionId !== null && scope.sessionIds.has(row.sessionId))
  );
}

async function observeStableAccessLogInventory(
  deps: PollDeps,
  scope: AccessLogScope,
  expectedSignatures: readonly string[]
): Promise<StableAccessLogInventory> {
  const deadline = deps.now() + ACCESS_LOG_POLL_TIMEOUT_MS;
  const expected = [...expectedSignatures].sort();
  let stableIds: readonly string[] | null = null;
  let stableSignatures: readonly string[] | null = null;
  let stableQuietMs = 0;
  let stablePolls = 0;
  let previousObservationCompletedAt: number | null = null;
  let everExact = false;
  let changedAfterExact = false;
  let scopeInvalid = false;

  while (deps.now() <= deadline) {
    const queryStartedAt = deps.now();
    const candidateQuietMs =
      previousObservationCompletedAt === null
        ? 0
        : Math.max(0, queryStartedAt - previousObservationCompletedAt);
    const rows = await deps.query();
    const observationCompletedAt = deps.now();
    const ownedRows = rows.filter((row) => isOwnedAccessLogCandidate(row, scope));
    scopeInvalid ||= ownedRows.length !== rows.length;
    const rawIds = ownedRows.map((row) => row.id);
    scopeInvalid ||= new Set(rawIds).size !== rawIds.length;
    const ids = [...new Set(rawIds)].sort();
    const actual = ownedRows.map(accessLogSignature).sort();
    const exact = ownedRows.length === expected.length && sameArray(actual, expected);

    if (!stableIds || !stableSignatures) {
      stableIds = ids;
      stableSignatures = actual;
      stableQuietMs = 0;
      stablePolls = 1;
    } else if (!sameArray(ids, stableIds) || !sameArray(actual, stableSignatures)) {
      if (everExact) changedAfterExact = true;
      stableIds = ids;
      stableSignatures = actual;
      stableQuietMs = 0;
      stablePolls = 1;
    } else {
      stablePolls += 1;
      // Count only the observed inter-poll interval. Time spent inside query()
      // is intentionally excluded and cannot satisfy the quiet window.
      stableQuietMs += candidateQuietMs;
    }
    if (exact) everExact = true;
    if (
      stablePolls >= ACCESS_LOG_REQUIRED_STABLE_POLLS &&
      stableQuietMs >= ACCESS_LOG_MIN_QUIET_MS &&
      observationCompletedAt <= deadline
    ) {
      return {
        ids: stableIds,
        behaviorError: changedAfterExact
          ? "access_log_late"
          : exact
            ? null
            : isSubmultiset(actual, expected)
              ? "access_log_missing"
              : "access_log_extra",
        scopeInvalid,
      };
    }
    previousObservationCompletedAt = observationCompletedAt;
    if (observationCompletedAt >= deadline) {
      return {
        ids: stableIds ?? [],
        behaviorError: "access_log_unstable",
        scopeInvalid,
      };
    }
    await deps.wait(
      Math.max(
        0,
        Math.min(ACCESS_LOG_POLL_CADENCE_MS, deadline - deps.now())
      )
    );
  }
  return {
    ids: stableIds ?? [],
    behaviorError: "access_log_unstable",
    scopeInvalid,
  };
}

async function drainExactAccessLogs(
  deps: PollDeps,
  scope: AccessLogScope,
  initialIds: readonly string[]
): Promise<{
  lateAfterDelete: boolean;
  scopeInvalid: boolean;
  cleanupError: Error | null;
}> {
  const deadline = deps.now() + ACCESS_LOG_POLL_TIMEOUT_MS;
  let pendingIds = [...initialIds];
  let quietElapsedMs = 0;
  let previousEmptyObservationCompletedAt: number | null = null;
  let emptyPolls = 0;
  let lateAfterDelete = false;
  let scopeInvalid = false;
  const cleanupErrors: Error[] = [];
  try {
    while (deps.now() <= deadline) {
      if (pendingIds.length > 0) {
        await deps.deleteExactIds(pendingIds);
        pendingIds = [];
        // Deletion time never counts as observed quiet absence.
        quietElapsedMs = 0;
        previousEmptyObservationCompletedAt = null;
        emptyPolls = 0;
      }
      const queryStartedAt = deps.now();
      const candidateQuietMs =
        previousEmptyObservationCompletedAt === null
          ? 0
          : Math.max(0, queryStartedAt - previousEmptyObservationCompletedAt);
      const rows = await deps.query();
      const observationCompletedAt = deps.now();
      const ownedRows = rows.filter((row) => isOwnedAccessLogCandidate(row, scope));
      scopeInvalid ||= ownedRows.length !== rows.length;
      const rawIds = ownedRows.map((row) => row.id);
      scopeInvalid ||= new Set(rawIds).size !== rawIds.length;
      const ids = [...new Set(rawIds)].sort();
      if (ids.length > 0) {
        // Preserve the validation failure, but still clean only the newly observed
        // exact owned UUIDs before proving absence.
        lateAfterDelete = true;
        pendingIds = ids;
        quietElapsedMs = 0;
        previousEmptyObservationCompletedAt = null;
        emptyPolls = 0;
        continue;
      }
      quietElapsedMs += candidateQuietMs;
      emptyPolls += 1;
      if (
        emptyPolls >= ACCESS_LOG_REQUIRED_STABLE_POLLS &&
        quietElapsedMs >= ACCESS_LOG_MIN_QUIET_MS &&
        observationCompletedAt <= deadline
      ) return { lateAfterDelete, scopeInvalid, cleanupError: null };
      previousEmptyObservationCompletedAt = observationCompletedAt;
      if (observationCompletedAt >= deadline) {
        break;
      }
      await deps.wait(
        Math.max(
          0,
          Math.min(ACCESS_LOG_POLL_CADENCE_MS, deadline - deps.now())
        )
      );
    }
  } catch (error) {
    cleanupErrors.push(
      error instanceof Error ? error : new Error("access_log_drain_failed")
    );
  }
  // A query can cross the deadline after discovering a final late row. Make one
  // last exact-ID deletion attempt before reporting that quiet absence could not
  // be proven. Never widen the delete predicate.
  if (pendingIds.length > 0) {
    try {
      await deps.deleteExactIds(pendingIds);
    } catch (error) {
      cleanupErrors.push(
        error instanceof Error ? error : new Error("access_log_exact_delete_failed")
      );
    }
  }
  cleanupErrors.push(new Error("access_log_absence_unstable"));
  return {
    lateAfterDelete,
    scopeInvalid,
    cleanupError:
      cleanupErrors.length === 1
        ? cleanupErrors[0]
        : new AggregateError(cleanupErrors, "access_log_drain_failed"),
  };
}

async function validateAndCleanupAccessLogs(
  deps: PollDeps,
  scope: AccessLogScope,
  expectedSignatures: readonly string[],
  cleanupExactSettingsSessionsAndUsers: () => Promise<void>
): Promise<void> {
  const deferredErrors: Error[] = [];
  let initialIds: readonly string[] = [];
  try {
    const inventory = await observeStableAccessLogInventory(
      deps,
      scope,
      expectedSignatures
    );
    initialIds = inventory.ids;
    if (inventory.behaviorError) {
      deferredErrors.push(new Error(inventory.behaviorError));
    }
    if (inventory.scopeInvalid) deferredErrors.push(new Error("access_log_scope_invalid"));
  } catch (error) {
    deferredErrors.push(
      error instanceof Error ? error : new Error("access_log_inventory_failed")
    );
  }

  const drained = await drainExactAccessLogs(deps, scope, initialIds);
  if (
    drained.scopeInvalid &&
    !deferredErrors.some(({ message }) => message === "access_log_scope_invalid")
  ) {
    deferredErrors.push(new Error("access_log_scope_invalid"));
  }
  if (drained.lateAfterDelete) {
    deferredErrors.push(new Error("access_log_late_after_delete"));
  }
  if (drained.cleanupError) {
    deferredErrors.push(drained.cleanupError);
  } else {
    try {
      // Exact owned access-log absence is already proven here.
      await cleanupExactSettingsSessionsAndUsers();
    } catch (cleanupError) {
      deferredErrors.push(
        cleanupError instanceof Error ? cleanupError : new Error("access_log_cleanup_failed")
      );
    }
  }

  if (deferredErrors.length === 1) throw deferredErrors[0];
  if (deferredErrors.length > 1) {
    throw new AggregateError(deferredErrors, "access_log_validation_failed");
  }
}
```

- Every call declares its expected method, pathname, status, and identity up front. The
  identity is `{userId,sessionId}` for the exact authenticated synthetic session that
  made the request and `{userId:null,sessionId:null}` only for the intended
  unauthenticated cases. Each request carries the same suite-unique exact User-Agent
  marker. Multiset comparison flattens `expected.identity`, preserves duplicate
  requests, compares sorted signature arrays rather than a `Set`, and requires
  `candidateRows.length === completedRequestLedger.length`. Invoke stable observation
  with `completedRequestLedger.map(expectedAccessLogSignature)`; the helper sorts its
  copy. A fetch rejected after transport dispatch therefore remains an explicit
  `access_log_extra` validation failure if its owned row exists outside the completed
  ledger; cleanup still owns that row by exact UUID.
- Teardown first stops the Bun server and awaits its close so no new synthetic request
  can start. Candidate polling selects rows whose User-Agent equals the exact marker OR
  whose user/session UUID equals one of the exact synthetic UUIDs. Every selected row
  must satisfy at least one of those ownership predicates and carry a unique UUID;
  otherwise fail `access_log_scope_invalid` without a broad delete. Stable observation
  never throws merely because the behavior signature is wrong: after the same sorted
  UUID set is seen in at least three 50 ms-separated polls across 250 ms, it returns the
  exact UUID inventory plus independent deferred behavior (`access_log_missing`,
  `access_log_extra`, `access_log_late`, or `access_log_unstable`) and scope-invalid
  results, so neither can mask the other. Normal pre-equality convergence such as
  `[] -> partial -> exact -> stable` passes; `access_log_late` begins only after the
  first complete ledger equality. Mixed owned/out-of-scope observations retain
  `access_log_scope_invalid` while inventorying only owned UUIDs. Constant churn until
  the 5-second deadline returns `access_log_unstable` together with the latest exact
  owned UUID inventory and any scope-invalid result. Both are retained, not swallowed.
- In a `finally` path, delete only the stable inventory's exact UUID array—never by
  marker, user/session predicate, path, or prefix. Whether validation passed, returned a
  mismatch, or threw after transport, run the same exact-scope query again. Each late
  owned row is recorded as `access_log_late_after_delete`, deleted only by its newly
  observed exact UUID, and resets the quiet window. Require three empty polls separated
  by 50 ms across at least 250 ms before leaving cleanup; failure within 5 seconds is
  `access_log_absence_unstable`. Only after exact absence may teardown delete the suite's
  exact settings rows, sessions, and users. After cleanup completes, rethrow the retained
  validation error so wrong behavior remains a failing test. Failure ordering is exact:
  original inventory/behavior error first, then scope-invalid, then late-after-delete;
  one error is rethrown directly and multiple are one ordered `AggregateError`. If the
  final query crosses the deadline after discovering owned rows, cleanup makes one last
  exact-ID deletion attempt and still reports `access_log_absence_unstable` because the
  quiet window was not proven. The structured drain result retains scope-invalid and
  late-after-delete alongside that cleanup error. A drain or exact-fixture cleanup
  failure is appended after those retained errors; it is never masked. Exact settings,
  session, and user cleanup runs only after the drain proves quiet owned-row absence.
- The dedicated `userSettingsAccessLogHarness.test.ts` suite owns deterministic helper
  tests with injected query/clock/wait:
  an initially incomplete multiset followed by exact rows and a stable UUID ledger
  passes; stable missing, duplicate/extra signature, wrong status/path/identity, changed
  or late UUID, post-dispatch fetch rejection, and a row appearing during the absence
  window each preserve the exact validation error while still deleting only every
  observed owned UUID and proving final owned-scope absence. A mixed owned/out-of-scope
  result deletes every owned exact UUID, retains the out-of-scope row, and reports
  `access_log_scope_invalid`. A deadline-crossing final poll proves the last observed
  owned UUID receives one exact delete attempt and the ordered error contains scope,
  late, and absence/deletion cleanup signals. A `trackedFetch` test rejects a declared method/path/marker mismatch
  before transport and proves a wrong response status still leaves its declared
  completed expectation in the validation ledger. Passing and failing cleanup tests
  assert at least three cadence-separated observations plus a fresh 250 ms quiet
  accumulator. Both inventory and drain add only time from a completed unchanged/empty
  observation to the start of the next query, and commit that interval only when the
  next result remains unchanged/empty. They reset on any UUID/signature change or
  post-delete reappearance. Delayed delete/query work exceeding 250 ms by itself cannot
  consume either window. One compound injected-clock case proves this independently
  for inventory and drain before advancing enough cadence-only time, then introduces a
  same-ID signature change and a post-empty reappearance to prove both accumulators
  reset. The same compound case makes a final unchanged inventory query and a final
  empty drain query cross the absolute deadline after starting in time; neither may
  return success even when its poll count and cadence-only accumulator would otherwise
  qualify,
  zero remaining exact-scope rows, and no broad delete.

TASK-540-04-L03 removes the stale global-localStorage assertion from its sole-owned
restyle suite before this leaf begins. Run that file read-only after the transport
switch to prove the entry-toolbar behavior remains compatible. TASK-540-06 may add
two-user end-to-end coverage later but must not re-baseline the exact no-browser-
storage, per-user, or delayed-request assertions above.

`CustomScreenEntryEditor.tsx` remains byte-identical in this leaf. TASK-540-04-L03 is its
sole writer and has already made the hook-call comment transport-neutral; this leaf only
changes the hook implementation behind that existing call site.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/admin/userSettingsClient.test.ts \
  tests/vitest/ui/admin-auth-identity.test.tsx \
  tests/vitest/ui/assistant-panel-interaction.test.tsx \
  tests/vitest/ui/assistant-panel-conversation.test.tsx \
  tests/vitest/ui/use-screen-entry-preferences.test.ts \
  tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx \
  tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx
./node_modules/.bin/tsc -p tsconfig.json --noEmit
set -a && source .env && set +a
bun test tests/unit/settings/userSettingsService.test.ts \
  tests/integration/routes/userSettings.test.ts \
  tests/integration/routes/userSettingsAccessLogHarness.test.ts \
  tests/integration/routes/cors.test.ts

# Both Bun suites must also pass independently.
bun test tests/integration/routes/userSettingsAccessLogHarness.test.ts
bun test tests/integration/routes/userSettings.test.ts

# Before the split (while the new files are absent), current mode pins the original
# all-10 declaration body. After the split, final mode applies the retained-route hash,
# per-callback AST-prefix proof, additive result bindings, and exact 2+8 partition.
node _docs/_workflows/task-540-test-name-contract.mjs \
  --mode=final --family=userSettingsRoutes

# Conditional Assistant split: both suites must pass independently at 7 and 6 tests.
./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/assistant-panel-interaction.test.tsx
./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/assistant-panel-conversation.test.tsx
node _docs/_workflows/task-540-test-name-contract.mjs \
  --mode=final --family=assistantPanel
node _docs/_workflows/task-540-implement.mjs --check-l02-assistant-split

# Scanner/workflow mutation self-tests remain green before and after extraction.
node _docs/_workflows/task-540-test-name-contract.mjs --mode=self-test
node _docs/_workflows/task-540-implement.mjs --self-test-repair-siblings

# Hard AGENTS.md physical-line gate; every listed file must be <= 1,000.
for file in \
  tests/integration/routes/support/userSettingsAccessLogHarness.ts \
  tests/integration/routes/userSettingsAccessLogHarness.test.ts \
  tests/integration/routes/userSettings.test.ts \
  tests/vitest/ui/support/assistantPanelInteractionHarness.tsx \
  tests/vitest/ui/assistant-panel-interaction.test.tsx \
  tests/vitest/ui/assistant-panel-conversation.test.tsx; do
  lines="$(awk 'END { print NR }' "$file")"
  if [ "$lines" -gt 1000 ]; then
    echo "$file exceeds 1000 physical lines: $lines" >&2
    exit 1
  fi
done
```

Verify DB reachability before DB-backed tests; rerun a named failure once. The
dependency-shaped combined Bun command must retain all ten user-settings cases across
the two suites. The combined Assistant command must retain all 13 cases across its two
suites. Family changelog 1252 records the three Bun split line counts and, while the
fixture condition is active, all three Assistant split line counts.

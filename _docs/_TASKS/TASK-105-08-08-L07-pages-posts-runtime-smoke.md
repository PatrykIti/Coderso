# TASK-105-08-08-L07: Pages and Posts Runtime Smoke
# FileName: TASK-105-08-08-L07-pages-posts-runtime-smoke.md

**Parent Subtask:** TASK-105-08-08
**Priority:** High
**Category:** Runtime Smoke + QA
**Estimated Effort:** Large
**Dependencies:** TASK-105-08-08-L01 validation-complete coverage receipt; TASK-105-08-08-L02 validation-complete combined V8 receipt; fresh shared-runtime registration collision audit
**Status:** ✅ Done (2026-09-01 — r44 `task105-l08-fast-20260901-r44` full PASS; see
the Closure Checklist and the 2026-09-01 amendments below)

---

## Overview

Register the dedicated shared-platform suite `task-105-l08` for five real pages/posts editor
flows. It runs only through:

```bash
bun scripts/runtime-smoke.ts run --suite task-105-l08 --profile fast --session task105l08-fast
```

This leaf runs after L01/L02 and is the runtime acceptance receipt, not a replacement for
their Vitest/V8 contract proof. It uses the existing shared lifecycle, process supervision,
polling, browser transport, evidence session, cleanup, and reporting platform; it must not
create a task-local server, Playwright loop, worker, database cleanup loop, or report format.

The existing `task-105-l05` suite is not a safe extension: it is owned by
`TASK-105-08-05-L04` and covers menus/dashboard/kits. L07 must never edit its adapter,
submodules, tests, evidence sessions, or descriptors. `task-105-l08` is the stable public
suite identity; it is intentionally different from this leaf ID.

## Exact Single-Writer Scope

**Shared registration and adapter writers:**

- `scripts/runtime-smoke/contracts.ts`
- `scripts/runtime-smoke/cli.ts`
- `scripts/runtime-smoke/registry.ts`
- `scripts/runtime-smoke/adapters/task-105-l08.ts` (new)
- `scripts/runtime-smoke/adapters/task-105-l08/descriptors.ts` (new)
- `scripts/runtime-smoke/adapters/task-105-l08/fixture.ts` (new)
- `scripts/runtime-smoke/adapters/task-105-l08/host.ts` (new)
- `scripts/runtime-smoke/adapters/task-105-l08/browser-drivers.ts` (new)
- `scripts/runtime-smoke/adapters/task-105-l08/output-manifest.ts` (new)

**Runtime-smoke test writers:**

- `tests/unit/runtime-smoke/cli-registry.test.ts`
- `tests/unit/runtime-smoke/task105-l08-adapter.test.ts` (new)
- `tests/unit/runtime-smoke/task105-l08-descriptors.test.ts` (new)
- `tests/unit/runtime-smoke/task105-l08-output-manifest.test.ts` (new)
- `tests/bun-lane-manifest.json` (generated registration rows only)

**Evidence writers after a successful run only:**

- `_docs/_workflows/_smoke/evidence/task-105/<session>/report.json`
- `_docs/_workflows/_smoke/evidence/task-105/<session>/screenshots/*.png`

(The recorded fast acceptance session is `task105-l08-fast-20260901-r44` — see the
2026-09-01 amendment; earlier revisions of this contract named a placeholder session.)

Every new human-authored source/test module remains at most 1,000 physical lines. The
collision audit must prove no `scripts/runtime-smoke/adapters/task-105-l05*`,
`tests/unit/runtime-smoke/task105-l05-*`, or existing L04 evidence path is changed. No
product source, route, schema, migration, ordinary Vitest coverage suite, board, or changelog
is writable in L07. If the shared registry is concurrently owned, stop and schedule the
registration in declared land order rather than editing a conflicting file.

## Implementation Pseudocode

```ts
export const TASK105_L08_SCENARIOS = Object.freeze([
  "page-deep-section-insert-visible-layer",
  "page-device-override-reset-publish-front-parity",
  "post-block-inspector-save-publish-front-parity",
  "post-classic-edit-preview-focus-visible",
  "post-richtext-command-slash-transition-visible",
] as const);

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "task-105-l08",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  // no evidenceSessionPolicy — see Contract Amendment (2026-08-31): the exclusive
  // claim is hard-wired to task-105-l05 and rejects every other suite
  evidenceDirectory: task105L08EvidenceDirectory,
  run: runTask105L08Adapter,
});
```

1. Add `task-105-l08` to `SUITE_IDS`, supported profiles, fixed adapter path, descriptor map,
   and the exact CLI/registry test. The adapter rejects another suite/profile at its own
   boundary.
2. The thin adapter provisions only namespaced synthetic page/post/editor fixture data through
   its own shared-platform adapter helpers; it registers every handle with the shared lifecycle
   and fails closed until cleanup/restoration is confirmed.
3. Restart the development host through the shared process supervisor before browser work.
   Poll and prove both the synthetic admin base and public front route respond before scenario
   one; do not use fixed sleeps.
4. Execute five separately checkpointed scenarios, each with pre-navigation console/page-error
   listeners, visible-effect assertions, and one screenshot:

   - Page editor: create deep section/block nesting, select it in Layers, and assert active
     DOM state plus bounded geometry rather than control presence.
   - Page editor: change a device-specific visible style, reset the override, assert computed
     style changes/reverts across desktop/mobile, publish, then assert front-render parity.
   - Block post editor: insert a block, edit it through Inspector, save/publish, and assert the
     visible admin document and public article match.
   - Classic post editor: edit content, open preview, and prove focus/visible preview state
     survives the supported editor transition.
   - Rich-text post editor: invoke a visible formatting/insert command, exercise the slash
     callback-removal rerender transition, and assert rendered editor state rather than a
     handler call.

   At least one page and one post admin scenario run in dark mode as well as light mode. Every
   scenario reports zero console and page errors. The adapter captures no secret, raw URL,
   token, browser body, or user data in receipts.
5. `output-manifest.ts` declares exactly five PNGs under the claimed evidence session, with
   stable IDs, dimensions, no-follow handling, and no replacement of existing evidence.

## Security Contract

This is an internal runtime smoke only. It cannot broaden endpoint visibility, RBAC, CSRF,
rate limits, validation, persistence, publish authorization, cache policy, public-write
anti-abuse, or production fixture behavior. Use a least-privilege synthetic account and
namespaced synthetic content; restore all rows/settings and fail closed on response-unknown
cleanup. Evidence and reports are redacted and must contain no credentials, cookies, tokens,
raw request bodies, private user data, or unbounded logs.

## Testing Requirements and Gates

```bash
bun test \
  tests/unit/runtime-smoke/task105-l08-adapter.test.ts \
  tests/unit/runtime-smoke/task105-l08-descriptors.test.ts \
  tests/unit/runtime-smoke/task105-l08-output-manifest.test.ts \
  tests/unit/runtime-smoke/cli-registry.test.ts
# No stdout redirect: the runner writes the canonical report.json itself (O_EXCL 0600)
# inside the evidence session directory — see Contract Amendment (2026-08-31).
# Fail-closed pre-run guard: the target session directory must not exist.
[[ ! -e _docs/_workflows/_smoke/evidence/task-105/task105l08-fast ]] || { echo "evidence session already exists" >&2; exit 1; }
bun scripts/runtime-smoke.ts run --suite task-105-l08 --profile fast --session task105l08-fast
./node_modules/.bin/eslint --max-warnings=0 \
  scripts/runtime-smoke/contracts.ts \
  scripts/runtime-smoke/cli.ts \
  scripts/runtime-smoke/registry.ts \
  scripts/runtime-smoke/adapters/task-105-l08.ts \
  scripts/runtime-smoke/adapters/task-105-l08/*.ts \
  tests/unit/runtime-smoke/task105-l08-*.test.ts \
  tests/unit/runtime-smoke/cli-registry.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l \
  scripts/runtime-smoke/adapters/task-105-l08.ts \
  scripts/runtime-smoke/adapters/task-105-l08/*.ts \
  tests/unit/runtime-smoke/task105-l08-*.test.ts
```

Run certification once at the appropriate release boundary:

```bash
bun scripts/runtime-smoke.ts run --suite task-105-l08 --profile certification --session task105l08-cert
```

The fast report must declare `pass: true`, `serverUp: true`, exactly five passing scenarios,
five screenshots, zero console errors, host/admin/front readiness receipts, and successful
cleanup. Any line-count result over 1,000, missing screenshot, nonzero console/page error,
or failed restoration blocks L08 closure.

## Closure Checklist

- [x] Static registration uses only `task-105-l08`; no L04 `task-105-l05` path changed.
- [x] Five distinct real flows show visible DOM/computed-style/geometry effects, not controls.
- [x] Admin and front responses were proven after a host restart; dark and light admin states
  were both checked.
- [x] Five screenshots and a redacted passing report exist in the named evidence session.
- [x] Unit registration tests, shared static gates, runtime smoke, cleanup, and line caps pass.

(All five closed by r44 `task105-l08-fast-20260901-r44` on 2026-09-01 — see the
2026-09-01 amendment below for the report facts and the manifest registration.)

## Contract Amendment — 2026-08-31 (orchestrator): evidence session shape

Verified against the live platform (blocker evidence:
`.tmp/receipts-20260831/08-08-l07/phase1-blocker-evidence.log`; independently
re-verified by the orchestrator):

- `scripts/runtime-smoke.ts:292-297` routes every exclusive adapter through
  `claimExclusiveEvidenceSession` for non-L05 suites, and
  `scripts/runtime-smoke/evidence-session.ts:287` implements that as a thin wrapper
  over `claimExclusiveEvidenceReport`, whose first guard (`:197-204`) rejects every
  suite except `task-105-l05`. An exclusive non-L05 adapter therefore cannot run: the
  runner throws `smoke_output_invalid` before `adapter.run()` is ever invoked.
  Generalizing that seam (plus the `claimedTask105L05Report` write/error path) is
  shared-platform surgery outside this leaf's writer scope and is NOT authorized
  mid-wave.
- The original Phase-3 stdout redirect is equally unrunnable: the runner creates
  `report.json` itself with `O_CREAT|O_EXCL` mode 0600 (and `precreateEvidenceReport`
  rejects an existing non-0600 file), while a shell redirect pre-creates the file at
  0644.

Amended shape — the platform-standard one already used by task-487/490/491/492/547/554:

1. The adapter MUST NOT set `evidenceSessionPolicy`. It provides
   `evidenceDirectory(input, root)` (via `resolveInsideRoot`, guard label
   `"task_105_l08_evidence"`) resolving to exactly
   `_docs/_workflows/_smoke/evidence/task-105/<session>`, matching the
   Evidence-writers list above (recorded acceptance session:
   `.../task-105/task105-l08-fast-20260901-r44`).
2. The acceptance command runs WITHOUT any stdout redirect; the runner writes the
   canonical `report.json` (mode 0600) inside the evidence session directory (same
   procedure as TASK-105-08-05-L04 step 6).
3. Runner-side exclusivity is replaced by a mandatory fail-closed pre-run guard,
   recorded in the receipt: before invoking the run, assert the target session
   directory does not exist; evidence remains create-only — never replace or append
   to an existing session.
4. Everything else in this contract (five scenarios, five PNGs, redaction, unit and
   static gates, line caps) is unchanged.

## Contract Amendment — 2026-09-01 (orchestrator): dep-cache isolation and acceptance

Fourth product defect found and fixed while closing this leaf (orchestrator-verified;
probe evidence in `/tmp` was destroyed by a host restart, root cause re-pinned from
`access_logs` + the live configs):

- Symptom: intermittent `s1_open_editor` `OPEN_TIMEOUT` deaths (r8, r26, r33, r38,
  r40, r41). For the dead runs, the shared remote Postgres `access_logs` table shows
  the boot chain completing (`install/status` → `auth/me` → `settings`, all 200,
  sub-second) and then NO `GET /api/pages/<id>` — the request that only fires after
  the page-editor route mounts — localizing the stall to the vite lazy-chunk layer.
- Root cause: the admin vite server (:5173, `core/vite.config.ts`) and the site vite
  server (:5174, `core/vite.site.config.ts`) shared one dep cache,
  `core/node_modules/.vite/deps` (neither config set `cacheDir`). Their config hashes
  differ, so the second server to boot logs "Re-optimizing dependencies" and deletes
  the live cache under the running browser. The browser then requests stale `?v=`
  hashes and gets 504 "Outdated Optimize Dep" (observed for
  `@radix-ui_react-tooltip.js`, `react-dialog.js`), the dynamic import of
  `ui/pages/PageEditor.tsx` throws, `AdminRouteErrorBoundary` renders
  "Admin route failed to load", and `lazyNamedRoute`'s memoized `promise ??=`
  (adminRouteComponents.tsx) never retries — the route never mounts and the canvas
  wait expires. This retro-explains the whole "cold-compile" death family.
- Fix: dedicated dep caches — `cacheDir: "../node_modules/.vite/task105-admin"` in
  `core/vite.config.ts` and `cacheDir: "../node_modules/.vite/task105-site"` in
  `core/vite.site.config.ts` (values resolve relative to each config root; both land
  under the gitignored `core/node_modules/.vite/` that the dev-host supervisor
  clears pre-spawn). Verified pre-fix by a standalone probe reproducing the
  Re-optimizing line + 504s, and post-fix by repeated boots: clean mounts in 2–4 s,
  all dep URLs served from the new cache, distinct `browserHash` per server, zero
  Re-optimizing lines.
- Regression pin: `tests/vitest/tooling/task-105-08-08-vite-cache-dir-split.test.ts`
  (4 tests; mutation-verified in both directions — removing the site `cacheDir` or
  equalizing the two values both fail the suite).

Acceptance run history (fast profile, 2026-09-01):

- r1–r41: repeated s1 deaths per the defect above, plus two documented environmental
  classes (admin vite listen wedge; bootstrap seal stall) handled per the retry
  policy. r42/r43 died at bring-up BEFORE any scenario: the installed `playwright-cli`
  (Microsoft, full CLI; the only Playwright CLI on the machine, invoked exactly as
  AGENTS.md mandates) began printing its once-per-day update advertisement to stderr
  when 0.1.19 published upstream, and the supervisor's allow-stderr policy treats any
  stderr as fatal. Environmental, not suite code; resolved by refreshing the
  installed CLI to 0.1.19 (now equal to upstream latest, so the notice cannot fire).
  No repository code was changed for this.
- **r44 `task105-l08-fast-20260901-r44`: full PASS.** `report.json`: `pass: true`,
  `serverUp: true`, 5/5 scenarios passing, `failures: []`, `consoleErrors: []`,
  cleanup PASS (all five cleanup hooks registered), 89 browser actions,
  5 screenshots with sha256, suite 183.1 s + cleanup 9.7 s, receipt digest
  `8cdfa190217e2ecdaa6cb9a1cb13332087f3cb9800dc4775f4fc1f3fdd51b16c`.
  Evidence: `_docs/_workflows/_smoke/evidence/task-105/task105-l08-fast-20260901-r44/`
  (create-only session, fail-closed guard honored).

Bun-lane manifest: the three `tests/unit/runtime-smoke/task105-l08-*.test.ts` files
are registered in `tests/bun-lane-manifest.json` (bucket A, DB-free) via
`scripts/bun-lane-classify.ts`; the manifest validator suite passes.

## Contract Amendment — 2026-09-01 (orchestrator): admin color-mode composition, post-audit resolution

The 5-lens post-audit (2026-09-01) flagged the scenario-spec sentence "At least one
page and one post admin scenario run in dark mode as well as light mode" as stricter
than the delivered composition (page admin: dark only via s1; post admin: dark s4 +
light s5; front: light s2/s3). Resolution, verified against the program and parent
leaf docs (neither mentions admin color modes — the requirement is leaf-local):

- The contracted, test-pinned invariant is the UNION reading: the five scenarios
  jointly prove BOTH admin color modes across the page and post editor families
  (`tests/unit/runtime-smoke/task105-l08-descriptors.test.ts` pins
  `Set(themes[0]) == {"light", "dark"}`). Admin light is proven end-to-end by s5's
  full rich-text post flow, admin dark by s1's page flow and s4's classic post flow.
- The strict per-kind reading (each editor family in both modes) was considered and
  REJECTED: it conflicts with the frozen five-PNG invariant (2026-08-31 amendment
  pt 4, pinned by the output-manifest test), requires variant-loop surgery in the
  driver and receipt validator, and doubles s1's fast-profile runtime against the
  shared remote DB — to re-assert facts that are contracted as theme-invariant
  (DOM state, bounded geometry, computed style).
- Accordingly, the scenario-spec sentence above is REFINED to: "The five scenarios
  jointly prove both admin color modes across the page and post editor families,
  with every scenario reporting zero console and page errors." The implementation
  comment in `descriptors.ts` is corrected to state the same union claim.
- This is documentation+comment only; no behavior changed, so r44 remains the valid
  acceptance run for the final tree (gates re-run on the final tree cover the edit).

## 5-lens post-audit — 2026-09-01 (orchestrator): outcomes

Two parallel executor audits (evidence/contract/L04-interference + fix-correctness/
test-realness/debris) verified the leaf against live files and live re-runs; every
finding below was independently re-verified by the orchestrator before acting.

- Evidence integrity: CLEAN. All five screenshot sha256 digests recomputed and
  byte-matched against `report.json`; the report is redacted (zero secret-pattern
  hits) with mode 0600; the suiteCleanup receipt digest matches the amendment;
  L04 non-interference holds (`task-105-l08` registered as its own suite id, no
  import from any `task-105-l05` module in the l08 adapter tree).
- MAJOR collateral of the dep-cache split, found and fixed: the task-488 and
  task-490 `admin-spa-warm` readiness probes hardcoded the old
  `node_modules/.vite/deps/` dep-URL layout, while the split cache makes the admin
  vite serve `/@fs/<abs>/…/node_modules/.vite/task105-admin/deps/…` (Vite switches
  to the `/@fs/` form when the deps dir falls outside `root`). Both probes would
  have timed out on their suites' next run. Both `ADMIN_DEP_URL` regexes now
  tolerate the optional middle segment; verified against both URL forms and a
  negative dep-less control. (These two files ride this leaf's diff as collateral
  repair; Phase 5 should attribute them accordingly.)
- Hardened: the cacheDir guard test now also pins both resolved caches under the
  shared gitignored parent `core/node_modules/.vite/` (a future value escaping it
  fails); the slash-insert-chain suite now pins the SlashCommandMenu
  `onMouseDown → preventDefault` fix directly (happy-dom cannot observe the blur
  path, so the chain alone could not catch that regression).
- Verified, no action: the supervised-server pre-spawn wipe of
  `core/node_modules/.vite` is safe (strictly pre-spawn; exactly one supervised
  spawn per adapter) — smoke runs intentionally start from a cold dep cache, which
  is what made the r44 acceptance deterministic.
- Test realness: CLEAN. The three l08 unit suites assert exact scenario identity,
  receipt/digest sensitivity, and fail-closed negatives (not stub-passable); the
  slash chain is a genuine component-level flow; zero diagnostic debris in the
  touched product files.
- Final gates re-run on the final tree: bun registration lane 434/434, vitest
  suites green, eslint `--max-warnings=0` clean (l08 + 488/490 hosts + tests,
  including the two core vite configs), `lint:repo:types` clean, adapter build
  clean, all files under the 1,000-line cap.

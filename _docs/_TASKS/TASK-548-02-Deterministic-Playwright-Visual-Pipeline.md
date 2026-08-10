# TASK-548-02: Deterministic Playwright Visual Pipeline
# FileName: TASK-548-02-Deterministic-Playwright-Visual-Pipeline.md

**Parent Task:** TASK-548
**Priority:** Critical
**Category:** Documentation Platform / Playwright / Visual QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-01
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Create a deterministic, privacy-safe `playwright-cli` pipeline that lets agents
produce reviewed CMS screenshots for the canonical documentation corpus.
Scenario manifests describe real admin flows and visible effects; the runner
creates uniquely scoped synthetic fixtures, captures bounded UI regions, and
promotes only reviewed PNGs with SHA-256 receipts.

Visual sources live only below `docs/guide/assets/`. Raw captures and diffs live
below `.tmp/docs-visuals/` and are never committed. The narrowly scoped
`.gitignore` exception allows only canonical documentation PNGs under
`docs/guide/assets/images/**`; the repository-wide PNG ignore remains intact.

This child consumes the `DocsVisualV1` shape from TASK-548-01 and must not
redefine it. It adds no AI dependency, Help API, public docs API, Designer
canvas or production mutation route.

**Single-writer ownership:** L01 exclusively owns
`scripts/docs/visual/contract/**` and `scripts/docs/visual/fixtures/**`. L02
exclusively owns `scripts/docs/capture-visual.ts`,
`scripts/docs/promote-visual.ts`, `scripts/docs/visual/capture/**`,
`scripts/docs/visual/promotion/**`, `scripts/docs/visual/png/**`, and
`scripts/docs/visual/state/**`; its sole inter-leaf shared wire is exactly
`scripts/docs/visual/capture/docsVisualCaptureRunV1.ts`. L02 does not own either
L01 subtree or L03's `scripts/docs/visual/ci/**` modules. It also owns the thin
shared `task-548` pilot adapter, initial static registration/cookbook recipe,
the five exact pilot triples listed in TASK-548-02-L02, their tests and the scoped
`.gitignore` exception. L03 owns its exact diff/check/recovery/CI tooling,
the PR workflow and focused tests; it consumes the toolchain bytes read-only.
TASK-548-02-L02 also pre-creates and exclusively owns ALL dependency-bearing
toolchain bytes:
`packages/docs-renderer/package.json`, `packages/docs-portal/package.json`,
root/core package manifests, root `bun.lock`, `Dockerfile`, all three
documentation workspace manifests, root docs scripts and dependency pins
(including the exact root devDependency pins `@playwright/cli: 0.1.18` and
`pixelmatch: 7.2.0`), performs the ONE lock-producing `bun install
--lockfile-only` reconciliation (which MAY update `bun.lock`) followed by a
SEPARATE `bun install --frozen-lockfile` verification (the frozen install never
mutates the lock), injects the repo-local-only dispatcher resolver into
`BrowserTransport`/`PlaywrightCliDispatcher`, and installs/verifies the pinned
local Chromium — all BEFORE its own pilots, then completes and gates
terminally. It adds all seven exact root docs scripts, the core
renderer workspace link and all three Docker preinstall manifest copies.
TASK-548-02-L03 is one normal post-pilot leaf that lands after the
post-pilot-generated-bundle-refresh-gate and owns only the staleness/diff/
recovery/CI implementation, PR workflow and focused tests.
TASK-548-06 owns all other production scenario/image/receipt files. Never
extend the existing 5,530-line
`scripts/playwright-widget-contract-smoke.ts`.

## Pipeline Contract

```text
strict scenario + synthetic fixture registry + watched source bytes
  -> task-scoped named playwright-cli session
  -> real route/actions + visible-effect assertions + zero console errors
  -> bounded raw PNG in .tmp
  -> metadata stripping/privacy/dimension/hash checks
  -> human or agent image review
  -> canonical locale-bound docs/guide/assets/images/... PNG + receipt
  -> TASK-548-01 compiler joins DocsVisualV1 into the shared bundle
```

Every scenario fixes route, semantic actions, viewport, theme, BCP-47 locale,
timezone, fixture/cleanup profile, capture target, alt, caption and watch paths.
Scenario, image and receipt paths plus the receipt envelope preserve the exact
`(docId, locale, sectionId, visualId)` owner even though `visualId` remains
bundle-global. The runner never selects a document by bare `docId`.
The runner never accepts arbitrary JavaScript from a manifest. Secrets,
credentials and PII are neither manifest values nor image content.

### Shared runtime host and browser ownership

TASK-548-02-L02 owns no server lease, supervisor, Playwright launcher, polling
loop, worker pool/protocol, DB cleanup loop, runtime lifecycle, checkpoint, or
reporter under `scripts/docs/**`. After terminal TASK-554, it initially
registers the `task-548` suite through the shared static registry and implements
a thin five-flow pilot adapter under `scripts/runtime-smoke/adapters/task-548*`.
That adapter composes terminal `RuntimeLifecycle`,
`startSupervisedServer()`/process supervision, condition polling, a
profile-scoped `WorkerPool`, set-based fixture ledger/helpers,
`BrowserTransport`/`PlaywrightCliDispatcher`, repository guard, redaction,
timing, screenshots, cleanup, and report contracts from
`docs/develop/runtime-smoke-cookbook.md`.

The strict docs-capture request is written below the adapter-owned temporary
session root and selected only by the validated `task-548` session; no arbitrary
path, origin, executable, or module enters through CLI or a content manifest.
The shared worker prepares synthetic fixtures, shared lifecycle resources own
the real hosts/browser, and the adapter writes only task-specific raw PNG and
capture-provenance state for promotion. `scripts/docs/capture-visual.ts`
validates product arguments and invokes the registered shared entry; it never
starts/stops a host, launches Playwright, supervises a process, polls readiness,
or fabricates a runtime report.

This is the first of exactly two TASK-548 suite IDs. This leaf's L02 declares
BOTH fixed suite rows (`task-548` and `task-548-portal`) in the shared
registry/contracts/CLI/cookbook/central test as the sole shared-seam writer;
TASK-548-04-L03 later implements only the focused `task-548-portal`
contribution modules behind that already-landed row. TASK-548-07-L01 later
contributes only the focused final eight-flow scenario module consumed by the
same already-landed `task-548` adapter shell; it never rewrites the shared
registry, adapter shell, or cookbook. No third docs-visual suite or parallel
adapter is allowed.

## Security Contract

- **Endpoint visibility/auth/RBAC:** no new endpoint. Browser flows use existing
  internal admin routes with a task-scoped authenticated test account carrying
  only each scenario's declared permissions.
- **CSRF/rate limit:** all fixture setup and browser writes use existing admin
  CSRF behavior and normal route buckets; tooling does not bypass middleware.
- **Validation:** strict reject-unknown manifests, semantic-locator allowlist,
  local canonical admin routes, confined watch/asset paths, bounded PNG
  dimensions/bytes and exact SHA-256 receipts.
- **Anti-abuse:** no public write, so nonce/HMAC/CAPTCHA is not applicable.
  Limit scenario count, steps, assertions, retries, time, sessions and output
  bytes. Never allow arbitrary shell/JS/URL execution.
- **Privacy:** fixtures are synthetic and uniquely prefixed; forbid real
  emails, tokens, uploads, user content and secrets. Review the image itself,
  not just logs. Strip PNG text/time/EXIF-like chunks before promotion.
- **Cleanup:** delete only resources created by the scenario, restore any
  explicitly owned setting and close the exact named session even on failure.

## Sub-Tasks

| Task | Scope | Single writer | Depends on |
| --- | --- | --- | --- |
| TASK-548-02-L01 | Strict scenario DSL, semantic locator/assertion model and fixture lifecycle | visual contract/fixture modules and pure contract tests | TASK-548-01 |
| TASK-548-02-L02 | shared-runtime `task-548` pilot adapter, raw capture, safe PNG promotion, review and receipts, plus ALL dependency-bearing toolchain bytes and the sole shared runtime-smoke seam registration | exact capture/promotion/PNG/state paths, both fixed TASK-548 suite rows and recipes in the shared registry/contracts/CLI/cookbook/central test, thin adapter/worker/browser files, capture-run wire, `.gitignore`, pilots and runtime tests; root/core package manifests, root bun.lock, Dockerfile, all three docs workspace manifests, root docs scripts, exact root devDependency pins `@playwright/cli: 0.1.18` + `pixelmatch: 7.2.0`, the one lock-producing `bun install --lockfile-only` reconciliation plus the separate `bun install --frozen-lockfile` verification, repo-local-only dispatcher resolver, Chromium install/verify | TASK-548-02-L01; terminal TASK-554 for serialized shared seams |
| TASK-548-02-L03 | Watch-path staleness, pixel/geometry diff, changed-only/full CI and privacy artifact gate | diff/check/recovery scripts, PR workflow and gate tests; consumes the toolchain bytes read-only | TASK-548-02-L01 and TASK-548-02-L02 |

Land L01 → L02 (the sole writer of root/core package
manifests, root lock, Dockerfile, all three documentation workspace manifests,
root scripts and dependency pins; it performs the one lock-producing `bun
install --lockfile-only` reconciliation (may update `bun.lock`) plus the
separate `bun install --frozen-lockfile` verification, injects the
repo-local-only dispatcher resolver, and
installs/verifies the pinned local Chromium BEFORE its pilots, then completes
and gates terminally) → L02 pilots,
then run exactly one post-pilot-generated-bundle-refresh-gate — a
generated-artifact-only invocation of the ALREADY-LANDED compiler CLI (no
agent writer, no human-authored source/task/status edit) with its own gate —
after all five pilot triples exist.
Only after that complete gate passes may `02-L03` land (it consumes the
toolchain bytes read-only and adds only the
staleness/diff/recovery/CI implementation, PR workflow and focused tests).
L02 may capture only
after the task dev server is restarted and admin/front health checks pass. L03
cannot auto-promote a changed baseline. No per-scenario or per-promotion
compiler refresh is valid.

That explicit refresh may leave the linked workspace pair available for the
ongoing authoring run, but the report remains ignored and workspace-only.
L03's read-only `docs:check`, clean-clone CI, Docker contract, and all later
packaged consumers must also pass from the normal tracked-bundle-only state.
Only explicit interrupted-write recovery may mutate workspace transaction
state; no downstream gate recreates the report.

## Acceptance Criteria

- A fresh agent can run one documented command for a scenario and receives a
  structured capture result without writing credentials or arbitrary code into
  the manifest. The exact capture surface is
  `docs:visual:capture --scenario <id>` and the exact review surface is
  `docs:visual:promote --scenario <id> --run-id <bounded-run-id> --raw-reviewed-sha256 <64-lowercase-hex> --reviewed-by <bounded-id> --confirm-alt-caption`.
  The public capture CLI accepts no `--run-id`: it internally obtains one from
  `createDocsVisualRunIdV1({ scope: "cli" })`, passes it unchanged into the
  validation-only lower capture API, and emits bounded JSON containing the
  generated `runId`. Promotion requires that exact returned ID and claims only
  its run; a missing, malformed, unknown or different ID fails closed. CI and
  migration call the generator directly with their own scopes.
- At least five distinct real-flow pilot scenarios prove desktop and narrow
  viewport, light and dark admin, route navigation, an interactive visible
  effect and a restricted-permission state; each finishes with zero console/page
  errors and scoped cleanup.
- Every promoted image is bounded/cropped, visually reviewed, metadata-sanitized
  and tied to localized document/section identity plus scenario/source/image
  hashes in a strict receipt.
- Changed watched code, fixture data, locale/theme/viewport, scenario or image
  bytes makes the visual stale. CI reports a diff and fails; it never approves
  or overwrites the canonical PNG.
- The docs compiler rejects a missing/orphan/tampered scenario, image or receipt.
- Canonical images work offline. No documentation response requires an external
  image host.
- Every touched human-authored production/test file is at most 1,000 physical
  lines.

## Testing Requirements

- `bunx vitest run --config vitest.config.ts tests/vitest/documentation/docs-visual*.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/documentation/docsVisualCapture.test.ts tests/unit/documentation/docsVisualPromotion.test.ts`
- `bun scripts/docs/check-visuals.ts --all`
- exact capture/promote CLI contract tests, including capture-side `--run-id`
  rejection, promotion-side returned-ID requirement and duplicate eligible-run
  selection, plus both profiles of the statically registered shared
  `task-548` pilot with exactly five distinct scenarios, supervised restart/
  health checks, visible effects, screenshots, cleanup, and zero console errors;
  TASK-548-07-L01 later succeeds this same adapter to the final eight flows
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- the canonical NUL-safe line-count gate over every added/modified production
  and test file in the leaf write set (identical contract in every TASK-548
  task file; a file above 1,000 makes the gate fail with `exit 1`, including a
  non-newline final line); the verified pre-family baseline spans all
  intermediate commits and staging and cannot narrow:

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

Provide the authoring, capture, review, privacy, regeneration and CI runbook to
the TASK-548 closure owner. Canonical screenshots belong in product docs;
workflow smoke evidence remains separate under `_docs/_workflows/_smoke/`.

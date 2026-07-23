# TASK-548-02: Deterministic Playwright Visual Pipeline
# FileName: TASK-548-02-Deterministic-Playwright-Visual-Pipeline.md

**Parent Task:** TASK-548
**Priority:** Critical
**Category:** Documentation Platform / Playwright / Visual QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-01
**Status:** ⏳ To Do

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

**Single-writer ownership:** this child owns visual scenario contracts and
fixtures, focused `scripts/docs/*visual*` tooling, the five exact pilot triples
listed in TASK-548-02-L02, visual tests, root docs visual package
scripts/dependencies, the scoped `.gitignore` exception and CI visual gates.
TASK-548-02-L03 also pre-creates and exclusively owns
`packages/docs-renderer/package.json`, `packages/docs-portal/package.json`,
root/core package manifests, root `bun.lock` and `Dockerfile` before the single
lock reconciliation. It adds all seven exact root docs scripts, the core
renderer workspace link and both Docker preinstall manifest copies.
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
| TASK-548-02-L02 | `playwright-cli` runner, raw capture, safe PNG promotion, review and receipts | capture/promotion scripts, `.gitignore`, initial canonical visuals and runtime tests | TASK-548-02-L01 |
| TASK-548-02-L03 | Watch-path staleness, pixel/geometry diff, changed-only/full CI, privacy artifact gate and one workspace/runtime-image lock reconciliation | diff/check/recovery scripts, both docs workspace manifests, root/core package manifests, root lock, Dockerfile, PR workflow and gate tests | TASK-548-02-L02 plus the one same-owner TASK-548-01-L02 post-pilot bundle/report refresh |

Land L01 → L02, then pause this child while the TASK-548-01-L02 owner performs
exactly one post-pilot bundle/report refresh after all five pilot triples exist.
Only after that complete compiler gate passes may L03 land. L02 may capture only
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
  `docs:visual:promote --scenario <id> --raw-reviewed-sha256 <64-lowercase-hex> --reviewed-by <bounded-id> --confirm-alt-caption`.
  The public capture CLI accepts no `--run-id`: it internally obtains one from
  `createDocsVisualRunIdV1({ scope: "cli" })`, passes it unchanged into the
  validation-only lower capture API, and emits bounded JSON containing the
  generated `runId`. CI and migration call the generator directly with their
  own scopes.
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
- `set -a && source .env && set +a && bun test tests/unit/documentation/docsVisualCapture.test.ts`
- `bun scripts/docs/check-visuals.ts --all`
- exact capture/promote CLI contract tests plus task-scoped
  `playwright-cli -s=docs548-...` pilot of at least five distinct
  scenarios, with restart/health checks and zero console errors
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- touched-file line counts

## Documentation Updates Required

Provide the authoring, capture, review, privacy, regeneration and CI runbook to
the TASK-548 closure owner. Canonical screenshots belong in product docs;
workflow smoke evidence remains separate under `_docs/_workflows/_smoke/`.

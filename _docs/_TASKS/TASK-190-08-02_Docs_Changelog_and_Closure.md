# TASK-190-08-02: Docs, Changelog, and Closure
# FileName: TASK-190-08-02_Docs_Changelog_and_Closure.md

**Priority:** High
**Category:** Docs + QA Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-190-08-01, TASK-190-08-03
**Status:** Done (2026-05-10)

---

## Overview

Close TASK-190 after the blueprint composer foundation is implemented and
validated.

## Sub-Tasks

No child task files.

## Closure Checklist

1. Capability manifests exist for current packs.
2. Candidate resolver handles primary + adjunct selection.
3. Composition graph and conflict policy are tested.
4. Schema/facet/card/page/admin merge engines are tested.
5. Action assembly reuses current typed action contracts.
6. Mixed prompt fixture matrix is green.
7. Live provider matrix is recorded.
8. Docs, task board, and changelog are synchronized.

Closure sequencing rule:

- this leaf is the final closure pass after the shared fixture/live-matrix work
  from `TASK-190-08-01` and the authoring-guide / indexing work from
  `TASK-190-08-03`,
- umbrella closure must not be marked complete before `_docs/BLUEPRINT_COMPOSER.md`
  exists and `_docs/README.md` indexes it through the `TASK-190-08-03` owner
  seam.

## Security Contract

- Visibility: docs/QA plus internal diagnostics redaction hardening.
- Auth model: no public or API route behavior change.
- RBAC: docs preserve permission boundaries; diagnostics remain internal
  observability helpers.
- CSRF: no runtime change.
- Rate-limit bucket: no public or API route behavior change.
- Reject-unknown validation: docs state provider composition drafts are strict.
- Anti-abuse: docs preserve review/dry-run/execute requirement.
- Secret handling: no secrets in docs/changelog.

## Testing Requirements

- Run all targeted TASK-190 Vitest suites.
- Run DB-backed Bun composition suites where `DATABASE_URL` is available.
- Run live provider matrix where provider env is configured.
- Run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New changelog entries for completed TASK-190 leaves and umbrella closure.

## Progress Notes

- 2026-05-10: Final closure pass synchronized the architecture/API/site-builder
  docs, acceptance/live matrices, security notes, task board, and changelog for
  the complete TASK-190 blueprint composer foundation.
- 2026-05-10: Validation completed with targeted TASK-190 Vitest
  diagnostics/fixtures/live-matrix coverage (`3` files, `22` tests), Bun
  live-matrix smoke (`1` test, `24` assertions), `bun --cwd core lint`,
  `bun --cwd core lint:types`, `bun run lint`, full `bun run test:vitest`
  (`582` files, `2609` tests), full DB/runtime `bun run test:bun` outside the
  sandbox with `.env` loaded (`755` tests, `2913` assertions), and
  `bun run scan:security:strict` clean. The container image scan remained
  intentionally skipped because `SECURITY_SCAN_IMAGE` was not set.
- 2026-05-10: Post-closure review fixes landed for published detail-template
  draft saves, metadata-backed custom-screen reuse, detail-page editor
  `adminHref`, acceptance-matrix wording, and security-contract precision.
  Follow-up validation passed targeted Vitest detail-template/diagnostics/fixture
  suites (`3` files, `26` tests), targeted Bun action executor coverage (`62`
  tests, `292` assertions), `bun --cwd core lint`, `bun --cwd core lint:types`,
  `bun run lint`, full `bun run test:vitest` (`582` files, `2611` tests), full
  DB/runtime `bun run test:bun` outside the sandbox with `.env` loaded (`756`
  tests, `2921` assertions), and `bun run scan:security:strict` clean. The
  container image scan remained intentionally skipped because
  `SECURITY_SCAN_IMAGE` was not set.
- 2026-05-10: Final no-duplicate follow-up added legacy exact-name custom-screen
  reuse before `collectionRole` / `compositionKey` metadata exists, preserving
  backward compatibility while still preferring metadata-backed canonical
  matches. Same-name screens with different composition metadata stay protected
  by a dependency conflict instead of being overwritten by the fallback.
- 2026-05-10: Final fallback validation passed targeted Bun action executor
  coverage (`64` tests, `307` assertions), `bun --cwd core lint`,
  `bun --cwd core lint:types`, `bun run lint`, full `bun run test:vitest`
  (`582` files, `2611` tests), full DB/runtime `bun run test:bun` outside the
  sandbox with `.env` loaded (`758` tests, `2936` assertions), and
  `bun run scan:security:strict` clean. The container image scan remained
  intentionally skipped because `SECURITY_SCAN_IMAGE` was not set.
- 2026-05-11: Final agent-pass drift fixes landed for catalog-backed LLM
  gating, detail-page runtime SEO/title mappings, metadata-aware custom-screen
  action identity, and source-of-truth legacy fallback wording. Validation
  passed targeted Vitest planner/assembler/renderer coverage (`3` files, `125`
  tests), targeted Bun action executor coverage (`65` tests, `313`
  assertions), targeted DB-backed detail-page runtime coverage outside the
  sandbox (`8` tests, `24` assertions), `bun --cwd core lint`,
  `bun --cwd core lint:types`, `bun run lint`, full `bun run test:vitest`
  (`582` files, `2611` tests), and `bun run precommit`. Final local broad-gate
  rerun confirmed `bun run test:bun` green (`760` tests across `204` files,
  `2946` assertions), full `bun run test:vitest` green (`582` files, `2611`
  tests), and `bun run scan:security:strict` green across Semgrep,
  `bun audit`, Trivy vulnerability/config/secret scans, and Gitleaks
  history/worktree scans. The container image scan remained intentionally
  skipped because `SECURITY_SCAN_IMAGE` was not set.
- 2026-05-11: Second final agent pass found no high TASK-190 drift and closed
  the remaining medium/low validation drift: `setting.content-route.upsert`
  now rejects invalid `detailPageId` values at the assistant schema and route
  boundary, `page.upsert` action-family metadata matches the real strict page
  schema, detail-page route schemas reject unknown top-level document fields
  before service work, and dedicated detail-page preview now has explicit
  title/SEO regression coverage. The Vitest command also forces
  `NODE_ENV=test` after `.env` loading so local production shells cannot disable
  React `act` or test-only blueprint-shadow diagnostics. A post-commit Bun
  gate rerun also stabilized the DB/runtime lane with an explicit `15000ms`
  `test:bun` timeout after multiple real DB-backed tests proved to run above
  Bun's `5000ms` default in the full serial gate. Validation passed
  targeted Bun route/runtime coverage (`42` tests, `178` assertions), targeted
  Vitest assistant schema/contract coverage (`2` files, `54` tests),
  `bun run lint`, full DB/runtime `bun run test:bun` outside the sandbox with
  `.env` loaded (`763` tests across `204` files, `2956` assertions), full
  `bun run test:vitest` (`582` files, `2611` tests), and
  `bun run scan:security:strict` clean across Semgrep, `bun audit`, Trivy
  vulnerability/config/secret scans, and Gitleaks history/worktree scans. The
  container image scan remained intentionally skipped because
  `SECURITY_SCAN_IMAGE` was not set.
- 2026-05-11: The second-pass validation has not rerun
  `bun run test:assistant:live` yet. The local `.env` exposes both OpenAI and
  OpenRouter live-provider pairs, so the TASK-190 live matrix remains applicable,
  but running it would send test prompts and fixture data to external providers
  and is blocked pending explicit approval for that data transfer.

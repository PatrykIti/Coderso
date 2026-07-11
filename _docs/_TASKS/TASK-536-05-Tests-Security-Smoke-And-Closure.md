# TASK-536-05: Tests, Security Smoke, and Closure

# FileName: TASK-536-05-Tests-Security-Smoke-And-Closure.md

**Parent Task:** TASK-536
**Priority:** Critical
**Category:** Tests / Security Validation / Documentation
**Estimated Effort:** Large
**Dependencies:** TASK-536-01 through TASK-536-04
**Status:** ✅ Done
**Completed:** 2026-07-11
**Changelog:** 1248

---

## Scope

Close TASK-536 with the cross-lane regression corpus, security validation, real browser
flows, source-of-truth documentation, task graph updates, and changelog 1248. This
subtask owns additive cross-leaf tests/docs only and must not reopen production source
contracts or re-baseline source-owner assertions, except for the bounded POST-M-07
assistant coverage-policy metadata correction owned by its leaf.

Paths and test names under `core/widgets` / `tests/vitest/widgets` are historical
implementation names only. Closeout language must describe the existing public Form
block/section runtime and must not add or advertise a non-dashboard widget type,
editor, registry entry, preset, or authoring workflow.

## Leaf

TASK-536-05-L01 is the only leaf. Source leaves already own their pre-gate behavior-test
changes; this leaf owns additive cross-contract test changes, smoke evidence,
documentation, task/index status updates, and changelog 1248.

## Required proof

- Byte identity is invariant under filename/declared-MIME changes.
- Upload and replace use canonical identity in local/S3/Azure.
- Local/remote delivery uses persisted safe MIME, disposition, and nosniff.
- Runtime completes upload before submission and handles required/multiple/retry.
- Inspection applies to every access/captcha mode.
- Exactly one public_write charge occurs.
- Unknown keys fail at every fixed nested schema depth.
- Retired Widget compatibility is `legacy-maintenance`: provider guidance advertises no
  create/insert operation, while exact-row update/block-patch/delete maintenance remains.

## Closure gate

- bun --cwd core lint:types
- bun --cwd core lint
- targeted Vitest and Bun suites named in L01;
- targeted Forms/media Semgrep must pass; run `bun run scan:security:strict` and record
  the already-triaged TASK-538 Page `customSvg` source finding and TASK-545-02-L01
  `task-522-author.mjs` prompt finding separately while they remain. Neither is a
  TASK-536 failure or suppressible, and the final program must rerun the full strict scan;
- bun run gates:coderso;
- dependency-shaped post-audit lenses for trust boundary, runtime state, route security,
  legacy delivery, and test integrity;
- at least five Playwright flows with visible assertions and zero console errors.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/forms/fileField.test.ts \
  tests/vitest/forms/validation.test.ts \
  tests/vitest/forms/formSettings.test.ts \
  tests/vitest/forms/formRuntimeResolver.test.ts \
  tests/vitest/forms/submissionAccess.test.ts \
  tests/vitest/forms/submissionNonce.test.ts \
  tests/vitest/server/requestBody.test.ts \
  tests/vitest/widgets/formEmbed.test.tsx \
  tests/vitest/widgets/formRuntimeScript.test.ts \
  tests/vitest/widgets/contact.test.tsx \
  tests/vitest/widgets/newsletter.test.tsx \
  tests/vitest/services/mediaSchemas.test.ts \
  tests/vitest/services/media-file-trust.test.ts \
  tests/vitest/services/mediaUrlProjection.test.ts \
  tests/vitest/admin/mediaUtils.test.ts \
  tests/vitest/ui/media-picker.test.tsx \
  tests/vitest/ui/media-card.test.tsx \
  tests/vitest/ui/media-details.test.tsx \
  tests/vitest/ui/post-editor-canvas-wave.test.tsx
set -a && source .env && set +a && bun test --parallel=1 --timeout=15000 \
  tests/unit/media/mediaService.test.ts \
  tests/unit/media/mediaMeta.test.ts \
  tests/unit/media/localAdapter.test.ts \
  tests/unit/media/s3Adapter.test.ts \
  tests/unit/media/azureAdapter.test.ts \
  tests/unit/backups/backupRemoteStorage.test.ts \
  tests/unit/backups/backupService.test.ts \
  tests/unit/server/publicFormsApi.test.ts \
  tests/unit/server/publicFormsUploadApi.test.ts \
  tests/unit/dashboard/dashboardService.test.ts \
  tests/unit/forms/fileSubmission.test.ts \
  tests/integration/routes/forms.test.ts \
  tests/integration/routes/media.test.ts \
  tests/integration/server/formsWriteMounts.test.ts \
  tests/security/codersoSecurityGate.test.ts
env -u DATABASE_URL bun --no-env-file test --timeout=15000 \
  tests/integration/server/mediaDeliveryAccess.test.ts
./node_modules/.bin/eslint --max-warnings=0 \
  core/widgets/core/formEmbed.tsx core/widgets/core/formRuntimeScript.ts \
  core/widgets/core/contact.tsx core/widgets/core/newsletter.tsx
bun run gates:coderso
bun run scan:security:strict
git diff --check
~~~

TASK-536 may close when its task-scoped scan and security gates pass and the full strict
scan has no finding in the TASK-536 changed-file/trust-boundary scope. Record the current
`pageRendererV2.tsx` `customSvg` finding as the explicit TASK-538 blocker and the current
`task-522-author.mjs` prompt finding as the explicit TASK-545-02-L01 blocker, without an
allowlist, baseline, or scanner-config change. Their owning closures rerun the relevant
scans. The final TASK-536–545 gate must make the full strict scan green.

Smoke screenshots belong under `_docs/_workflows/_smoke/` with the exact
`task-536-` filename prefix. Record scenario/viewport/theme, visible assertions,
console errors, and screenshot paths in TASK-536 closeout evidence; TASK-545's future
manifest/path is not a TASK-536 closure dependency.

After the final metadata edit or drift fix, rerun
`node --check _docs/_workflows/task-536-implement.mjs` and `git diff --check`.
The pre-closure validation result does not cover later task/changelog/index edits.

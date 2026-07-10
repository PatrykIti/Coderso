# TASK-536-05: Tests, Security Smoke, and Closure

# FileName: TASK-536-05-Tests-Security-Smoke-And-Closure.md

**Parent Task:** TASK-536
**Priority:** Critical
**Category:** Tests / Security Validation / Documentation
**Estimated Effort:** Large
**Dependencies:** TASK-536-01 through TASK-536-04
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope

Close TASK-536 with the cross-lane regression corpus, security validation, real browser
flows, source-of-truth documentation, task graph updates, and changelog 1248. This
subtask owns additive cross-leaf tests/docs only and must not reopen production source
contracts or re-baseline source-owner assertions.

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

## Closure gate

- bun --cwd core lint:types
- bun --cwd core lint
- targeted Vitest and Bun suites named in L01;
- targeted Forms/media Semgrep must pass; run `bun run scan:security:strict` and record
  the already-triaged TASK-538 Page `customSvg` source finding separately while it
  remains. It is neither a TASK-536 failure nor suppressible, and the program must rerun
  the full strict scan after TASK-538;
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
  tests/vitest/forms/submissionAccess.test.ts \
  tests/vitest/server/requestBody.test.ts \
  tests/vitest/widgets/formEmbed.test.tsx \
  tests/vitest/widgets/formRuntimeScript.test.ts \
  tests/vitest/services/mediaSchemas.test.ts \
  tests/vitest/services/media-file-trust.test.ts \
  tests/vitest/services/mediaUrlProjection.test.ts
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
  tests/integration/server/mediaDeliveryAccess.test.ts \
  tests/integration/server/formsWriteMounts.test.ts \
  tests/security/codersoSecurityGate.test.ts
./node_modules/.bin/eslint --max-warnings=0 \
  core/widgets/core/formEmbed.tsx core/widgets/core/formRuntimeScript.ts
bun run gates:coderso
bun run scan:security:strict
~~~

TASK-536 may close when its task-scoped scan and security gates pass and the full strict
scan has no finding in the TASK-536 changed-file/trust-boundary scope. Before TASK-538,
record the existing `pageRendererV2.tsx` `customSvg` finding as the explicit external
TASK-538 blocker without an allowlist, baseline, or scanner-config change. TASK-538
closure reruns the full scan and must prove its owned `customSvg` finding absent; any
unrelated finding remains an explicit program blocker. The final TASK-536–545 gate must
make the full strict scan green.

Smoke screenshots belong under `_docs/_workflows/_smoke/` with the exact
`task-536-` filename prefix. Record scenario/viewport/theme, visible assertions,
console errors, and screenshot paths in TASK-536 closeout evidence; TASK-545's future
manifest/path is not a TASK-536 closure dependency.

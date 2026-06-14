# TASK-417-07-L01: Targeted Validation Lanes And Gates
# FileName: TASK-417-07-L01-Targeted-Validation-Lanes-And-Gates.md

**Parent Subtask:** TASK-417-07
**Priority:** High
**Category:** QA / Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-417-02, TASK-417-03, TASK-417-04, TASK-417-05, TASK-417-06
**Status:** ✅ Done

---

## Overview

Run the dependency-shaped validation matrix for the Pages v2 rewrite and record
exact evidence before closure.

---

## Security Contract

- **Endpoint visibility:** no new endpoint.
- **Auth model:** validation proves existing admin session and preview token
  contracts.
- **RBAC:** validation proves Pages and assistant permissions.
- **CSRF:** validation proves write paths remain CSRF-protected.
- **Rate-limit bucket:** validation proves no new unbounded public write path.
- **Validation:** validation proves reject-unknown v2 schemas and legacy Page
  payload rejection.
- **Anti-abuse controls:** validation proves preview token sanitization and
  assistant provider-output hardening.

---

## Sub-Tasks

- [x] Run lint and typecheck.
- [x] Run targeted Vitest document/admin/assistant suites.
- [x] Run targeted Bun route/service/runtime/preview/assistant suites.
- [x] Run existing affected legacy Page/admin/assistant suites that are expected
  to be rewritten by the cutover, not only net-new v2 files.
- [x] Run non-Page widget boundary suites for detail pages, widget templates,
  and custom screens so shared widget-template/runtime contracts remain green.
- [x] Run `bun run gates:coderso`.
- [x] Record skips or DB unavailability explicitly.

---

## Implementation Pseudocode

```sh
bun --cwd core lint
bun --cwd core lint:types

# Pure Pages v2 document/domain and responsive cascade helpers.
bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts

# Admin Pages editor v2 reducer and UI surface.
bun run test:vitest -- tests/vitest/ui/page-editor-v2*.test.tsx
bun run test:vitest -- tests/vitest/ui/page-editor*.test.tsx tests/vitest/ui/page-preview.test.tsx tests/vitest/ui/forms-pages-wave.test.tsx

# Assistant Page action/schema/blueprint cutover.
bun run test:vitest -- tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/blueprint-page-section-composer.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts
bun run test:vitest -- tests/vitest/assistant/page-widget-patch.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/active-surface-hydration.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/action-undo-manifest.test.ts
bun run test:vitest -- tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts tests/vitest/ui/assistant-panel.test.tsx
bun test tests/unit/assistant/actionExecutorService.test.ts

# DB-backed Bun route, service, runtime, preview, and assistant executor lanes.
set -a && source .env && set +a
bun test tests/unit/pages/pageService.test.ts
bun test tests/unit/pages/pageRevisionAutosave.test.ts
bun test tests/unit/pages/validation.test.ts
bun test tests/integration/routes/pages.test.ts
bun test tests/integration/runtime/pages-runtime.test.ts
bun test tests/integration/routes/assistant.test.ts

# Non-Page widget boundary suites must stay green because Pages v2 uses a new
# runtime/template family instead of repurposing widget-template/detail surfaces.
bun test tests/integration/routes/detailPages.test.ts
bun test tests/integration/runtime/detail-page-runtime.test.ts
bun test tests/integration/runtime/detail-page-runtime-lite.test.ts
bun test tests/integration/runtime/detail-page-preview-cache.test.ts
bun test tests/integration/routes/widgetTemplatePreview.test.ts
bun run test:vitest -- tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/ui/widget-template-preview-dialog.test.tsx tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx

# Security lanes touched by preview token/SSRF behavior.
bun test tests/security
bun run scan:security
bun run scan:security:strict

bun run gates:coderso
```

Expected data flow:

- Pure domain/admin/assistant suites run in Vitest.
- Runtime, route, DB-backed, preview, and security flows run in Bun.
- Existing v1 Page/editor/assistant suites must either pass after rewrite or be
  deliberately rewritten/retired with equivalent v2 coverage in the same task.
- Existing detail-page, widget-template, and custom-screen suites must pass
  unchanged unless a focused boundary expectation is added to prove Pages v2 no
  longer shares their legacy `WidgetBlock[]` renderer path.
- Failures are fixed or split into explicit follow-up tasks before closure.

Error handling:

- If DB is unavailable, record the blocked suite and do not claim DB validation.
- If broad legacy suites fail for unrelated reasons, isolate and document them.

Regression-test shape:

- Evidence includes command, result, and any targeted suite names.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts`
- `bun run test:vitest -- tests/vitest/ui/page-editor-v2*.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-editor*.test.tsx tests/vitest/ui/page-preview.test.tsx tests/vitest/ui/forms-pages-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/blueprint-page-section-composer.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts`
- `bun run test:vitest -- tests/vitest/assistant/page-widget-patch.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/active-surface-hydration.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/action-undo-manifest.test.ts`
- `bun run test:vitest -- tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts tests/vitest/ui/assistant-panel.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/pages/pageService.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/pages/pageRevisionAutosave.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/pages/validation.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/assistant.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/detailPages.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/detail-page-runtime.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/detail-page-runtime-lite.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/detail-page-preview-cache.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/widgetTemplatePreview.test.ts`
- `bun run test:vitest -- tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/ui/widget-template-preview-dialog.test.tsx tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
- `bun test tests/security`
- `bun run scan:security`
- `bun run scan:security:strict`
- `bun run gates:coderso`

---

## Documentation Updates Required

- TASK-417 closeout notes.
- Changelog validation section.

---

## Completion Notes

- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- Pages/admin Vitest targeted group - passed, 5 files / 16 tests.
- Assistant Vitest targeted groups - passed, 15 files / 285 tests.
- Pages service/routes/runtime Bun group - passed, 34 tests.
- Assistant executor/full-service public runtime Bun group - passed, 74 tests.
- Assistant executor site-kit smoke - passed, 73 tests.
- Solution Kit catalog/manifest/template seed Bun group - passed, 3 files / 9
  tests.
- Solution Kit installer/site-builder Bun group - passed, 2 files / 9 tests.
- Advanced site-builder Vitest group - passed, 3 files / 17 tests.
- Detail-page/widget-template/custom-screen boundary suites - passed after
  isolating the DB-backed detail runtime file from a combined fixture-conflict
  run.
- `bun run gates:coderso` - passed all gates.
- `bun run scan:security` - clean.
- `bun run scan:security:strict` - clean.

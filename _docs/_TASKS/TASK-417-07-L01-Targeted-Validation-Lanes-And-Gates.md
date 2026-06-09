# TASK-417-07-L01: Targeted Validation Lanes And Gates
# FileName: TASK-417-07-L01-Targeted-Validation-Lanes-And-Gates.md

**Parent Subtask:** TASK-417-07
**Priority:** High
**Category:** QA / Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-417-02, TASK-417-03, TASK-417-04, TASK-417-05, TASK-417-06
**Status:** ⏳ To Do

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

- [ ] Run lint and typecheck.
- [ ] Run targeted Vitest document/admin/assistant suites.
- [ ] Run targeted Bun route/service/runtime/preview/assistant suites.
- [ ] Run `bun run gates:coderso`.
- [ ] Record skips or DB unavailability explicitly.

---

## Implementation Pseudocode

```sh
bun --cwd core lint
bun --cwd core lint:types

# Pure Pages v2 document/domain and responsive cascade helpers.
bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts

# Admin Pages editor v2 reducer and UI surface.
bun run test:vitest -- tests/vitest/ui/page-editor-v2*.test.tsx

# Assistant Page action/schema/blueprint cutover.
bun run test:vitest -- tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/blueprint-page-section-composer.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts

# DB-backed Bun route, service, runtime, preview, and assistant executor lanes.
set -a && source .env && set +a
bun test tests/integration/routes/pages.test.ts
bun test tests/integration/runtime/pages-runtime.test.ts
bun test tests/integration/routes/assistant.test.ts

# Security lanes touched by preview token/SSRF behavior.
bun test tests/security
bun run scan:security
bun run scan:security:strict

bun run gates:coderso
```

Expected data flow:

- Pure domain/admin/assistant suites run in Vitest.
- Runtime, route, DB-backed, preview, and security flows run in Bun.
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
- `bun run test:vitest -- tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/blueprint-page-section-composer.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/assistant.test.ts`
- `bun test tests/security`
- `bun run scan:security`
- `bun run scan:security:strict`
- `bun run gates:coderso`

---

## Documentation Updates Required

- TASK-417 closeout notes.
- Changelog validation section.

# TASK-417-06-L01: Active Surface And Action Schemas Sections
# FileName: TASK-417-06-L01-Active-Surface-And-Action-Schemas-Sections.md

**Parent Subtask:** TASK-417-06
**Priority:** High
**Category:** Assistant / Schemas
**Estimated Effort:** Large
**Dependencies:** TASK-417-02-L02, TASK-417-05-L03
**Status:** ✅ Done

---

## Overview

Replace assistant Page active-surface and action schemas from selected widget
blocks to selected Page sections/atomic blocks. Fresh Page actions must reject
legacy `blocks[]` payloads.

---

## Security Contract

- **Endpoint visibility:** internal assistant admin endpoints.
- **Auth model:** existing admin session and assistant availability gates.
- **RBAC:** existing assistant/content permissions.
- **CSRF:** existing admin write CSRF behavior for execute routes.
- **Rate-limit bucket:** existing assistant/provider quota and admin buckets.
- **Validation:** action schemas accept v2 `sections[]` and reject unknown Page
  fields, v1 Page `blocks[]`, and untrusted active-surface target ids.
- **Anti-abuse controls:** provider output remains bounded by strict schemas,
  redaction, policy gates, and local executor validation.

---

## Sub-Tasks

- [x] Update active Page surface context to section/block summaries.
- [x] Update assistant action types and JSON schemas for Page v2 payloads.
- [x] Retire or re-scope `page.widget.patch` away from Pages.
- [x] Preserve shared widget patch utilities and tests for widget-template,
  custom-screen, and detail-page surfaces; only the Page action contract is
  retired/re-scoped.
- [x] Update dry-run/action review UI labels and summaries.

---

## Implementation Pseudocode

```ts
export type AssistantPageSectionSummary = {
  id: string;
  type: string;
  name: string;
  variant: string;
  blockCount: number;
};

export type PageUpsertV2Input = {
  title: string;
  slug: string;
  data: PageDocumentV2;
};

const pageActiveSurfaceSchema = {
  required: ["kind", "page", "selectedSectionId", "selectedBlockId", "sections", "warnings"],
};
```

Expected data flow:

- PageEditor publishes active surface summaries in v2 terms.
- Assistant schemas accept only v2 Page action data.
- This leaf consumes the active-surface shape published by TASK-417-05-L03; it
  does not own PageEditor UI state or publisher wiring.
- Action review and execution result components label Page sections rather than
  Page widgets.

Error handling:

- Unknown section/block ids from provider output are rejected or gated.
- Legacy Page `blocks[]` action payloads fail normalization.
- `page.widget.patch` no longer mutates Page documents; provider output must use
  Page v2 section/block actions or fail closed.
- Non-Page widget-template/detail-page active surfaces keep their block-based
  contracts.

Regression-test shape:

- Vitest assistant schema tests cover v2 Page action acceptance, v1 Page action
  rejection, active surface summaries, and non-Page widget surface preservation.
- Existing `page-widget-patch` tests are rewritten or re-scoped so shared patch
  helpers remain covered for non-Page widget surfaces.

---

## Testing Requirements

- Targeted Vitest assistant schema/policy tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/CMS_API.md`

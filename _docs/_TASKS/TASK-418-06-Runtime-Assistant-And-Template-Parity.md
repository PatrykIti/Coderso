# TASK-418-06: Runtime Assistant And Template Parity
# FileName: TASK-418-06-Runtime-Assistant-And-Template-Parity.md

**Parent Task:** TASK-418
**Priority:** High
**Category:** Pages / Runtime / Assistant / Templates
**Estimated Effort:** Large
**Dependencies:** TASK-418-03, TASK-418-04, TASK-418-05
**Status:** ⏳ To Do

---

## Overview

Align all Page emitters and consumers with the same Pages v2 contract. A block
type or prop must not be insertable/emitted by PageEditor, assistant, solution
kits, or page templates unless the normalizer preserves it and the runtime can
render it honestly.

---

## Security Contract

- **Endpoint visibility:** Pages admin writes and assistant execute routes
  remain internal; public Pages rendering remains read-only.
- **Auth model:** existing admin session and assistant availability gates.
- **RBAC:** existing content and assistant permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin and assistant/provider buckets.
- **Validation:** assistant/template outputs must use schema-owned Pages v2
  actions and reject unknown fields.
- **Anti-abuse controls:** provider output remains bounded by schemas, policy
  gates, redaction, and local executor validation; no public write endpoint.

---

## Sub-Tasks

- [ ] TASK-418-06-L01: Public runtime real renderers for insertable blocks.
- [ ] TASK-418-06-L02: Assistant surface schema and blueprint alignment.
- [ ] TASK-418-06-L03: Page templates and non-Page widget boundaries.

---

## Testing Requirements

- Bun runtime tests for every insertable block type.
- Vitest assistant schema/policy/blueprint tests for Pages v2 block props and
  nested paths.
- Boundary tests for widget-template, detail-page, and custom-screen surfaces.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` if assistant/admin payloads change.

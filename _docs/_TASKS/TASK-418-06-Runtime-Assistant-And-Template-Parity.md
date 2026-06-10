# TASK-418-06: Runtime Assistant And Template Parity
# FileName: TASK-418-06-Runtime-Assistant-And-Template-Parity.md

**Parent Task:** TASK-418
**Priority:** High
**Category:** Pages / Runtime / Assistant / Templates
**Estimated Effort:** Large
**Dependencies:** TASK-418-03, TASK-418-04, TASK-418-05
**Status:** 🚧 In Progress
**Started:** 2026-06-10

---

## Overview

Align all Page emitters and consumers with the same Pages v2 contract. A block
type or prop must not be insertable/emitted by PageEditor, assistant, solution
kits, or page templates unless the normalizer preserves it and the runtime can
render it honestly. Security-sensitive `collection`, `form`, and `embed`
outputs may remain before TASK-418-06-L04 only when public runtime rendering is
explicitly fail-closed and inert; L04 owns the later scoped binding and
capability flips.

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

- [x] TASK-418-06-L01: Public runtime real renderers for insertable blocks.
  Done (2026-06-10): gallery now renders real static public markup, exposed
  block capabilities require real renderers, and collection/form/embed render
  explicit inert states until L04.
- [x] TASK-418-06-L02: Assistant surface schema and blueprint alignment.
  Done (2026-06-10): Page active surfaces now carry server-revalidated nested
  paths and capabilities, assistant Page schemas gate section/block output by
  owner capabilities, and layout blocks are assistant-emittable.
- [x] TASK-418-06-L03: Page templates and non-Page widget boundaries.
  Done (2026-06-10): Page template input now resolves through a Page v2
  boundary helper, non-Page widget surfaces remain isolated, and TASK-420 tracks
  the Page Templates surface rewrite/removal of the obsolete widget-template
  path.
- [x] TASK-418-06-L04: Collection form embed runtime data binding security.
  Done (2026-06-10): scoped public binding, anonymous section pruning, published
  collection reads, form runtime projection, sanitized embed rendering, no-leak
  tests, direct Playwright CLI smoke, and release gates are complete.

---

## Testing Requirements

- Bun runtime tests for every insertable block type.
- Vitest assistant schema/policy/blueprint tests for Pages v2 block props and
  nested paths.
- Boundary tests for widget-template, detail-page, and custom-screen surfaces.
- Sequence public capability gating so `collection`, `form`, and `embed` are not
  removed from assistant/solution-kit outputs before TASK-418-06-L04 provides a
  real scoped public binding or an explicitly fail-closed inert binding that
  preserves existing blueprint behavior.
- Non-data-bound emitted blocks, including solution-kit `gallery`, must become
  runtime-real or be removed/gated before this parent can close.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` if assistant/admin payloads change.

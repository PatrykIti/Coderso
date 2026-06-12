# TASK-457: Collection Authoring Enablement In Page Editor
# FileName: TASK-457_Collection_Authoring_Enablement_In_Page_Editor.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Content Types
**Estimated Effort:** Large
**Dependencies:** None (consumes TASK-421 widgets, TASK-418-06-L04 runtime binding; amends the TASK-452 catalog freeze deliberately; TASK-456 lands the combobox primitive this family reuses)
**Status:** ⏳ To Do

---

## Overview

Authors cannot place collection/content-type listings from the Page Editor:
the `collection` block is gated `collection-editor-controls-pending` and the
`collection` section is gated `collection-section-boundary`
(`pageDocumentV2.ts`). The public runtime for the collection BLOCK is already
real (TASK-418-06-L04 scoped data binding). For client sites (services list,
portfolio, blog teasers on a page) the block authoring surface is the missing
piece. This family un-gates the `collection` BLOCK with proper editor
controls; the `collection` SECTION stays gated (composite-first: a listing
layout is a section + collection block).

Block props (verify exact keys in `pageBlockDefaultProps`): `contentTypeId`,
`queryId`, `limit` (clamp 1..50 per `blockPropJsonSchemaForType`),
`templateId`. Controls: contentType combobox (content types client), optional
saved-query combobox filtered by content type, limit slider (1..50), listing
template combobox (existing listing templates client) — all through the
shared adapter primitives (combobox primitive lands in TASK-456-02; this
family depends on that leaf if sequenced after, otherwise creates it — the
families coordinate, single owner: TASK-456-02).

TASK-452 guard tests move the catalog to 16 insertable blocks / 3 gated —
updated deliberately in this family (or jointly with TASK-456 if they land in
one wave; the changelog must record the final frozen catalog either way).

---

## Security Contract

- **Endpoint visibility:** no new endpoints; runtime data binding stays the
  TASK-418-06-L04 scoped path (public read of published entries only).
- **Auth model:** admin session for authoring; anonymous public read.
- **RBAC:** existing Pages permissions; content-type/query/template lists via
  their existing admin read clients.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** props stay schema-owned with the existing clamps
  (limit 1..50); dangling ids render the existing fail-closed runtime state;
  reject-unknown preserved.
- **Anti-abuse controls:** not applicable (read-only public surface).

---

## Sub-Tasks

- [ ] TASK-457-01: Collection block controls contract (props/controls/empty
      states; verify runtime fail-closed shapes; capability plan and
      TASK-452 amendment values).
- [ ] TASK-457-02: Registry controls, capability change, palette entry, and
      guard-test update (reuses the TASK-456-02 combobox primitive).
- [ ] TASK-457-03: Validation, live smoke (real content type with published
      entries rendered on a client-style page), and closure.

---

## Implementation Pseudocode

```ts
// Capability: move "collection" into editorInsertableBlockTypes; drop its
// gating reason; palette entry "Collection" with description.
// Registry (Content panel): contentTypeId/queryId/templateId comboboxes with
// dynamic options sources + limit slider via the shared adapter:
//   blockPropControl("collection", "contentTypeId", { input: "select", optionsSource: "contentTypes" })
//   blockPropControl("collection", "queryId", { input: "select", optionsSource: "listingQueries", filterBy: "contentTypeId" })
//   blockPropControl("collection", "limit", { input: "number" })  // adapter -> slider 1..50
//   blockPropControl("collection", "templateId", { input: "select", optionsSource: "listingTemplates" })
// Canvas: editor renders the runtime preview with published entries when
// resolvable, otherwise the "Pick a content type" empty state; interactive
// affordances disabled in canvas mode.
```

Expected data flow: insert -> empty state -> pick content type (+ optional
query/template, limit) -> canvas preview -> publish -> public runtime renders
the bound listing through the existing scoped binding.

Error handling: dangling/unpublished refs fail closed exactly like the
runtime does today (verify and pin the current shape); combobox marks
dangling ids.

Regression-test shape: capability flip + props round-trip (domain); updated
TASK-452 suites with the final frozen catalog; UI tests for the four
controls; Bun runtime listing render (existing binding suites stay green).

---

## Testing Requirements

- `bun run test:vitest` (incl. updated TASK-452 suites).
- Bun: pages runtime + existing collection binding suites (env loaded).
- `bun --cwd core lint`, `bun --cwd core lint:types`, root tsc.
- Live smoke: content type with 3+ published entries -> collection block on a
  page -> publish -> entries render on the front with the chosen template and
  limit.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (catalog change, collection block authoring).
- `_docs/CONTENT_TYPES_SPEC.md` note if the authoring contract is referenced.
- `docs/guide/` user note (listing collection entries on a page).
- `_docs/_TASKS/README.md` + `_docs/_CHANGELOG/` entry on completion.

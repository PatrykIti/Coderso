# TASK-456: Form Authoring Enablement In Page Editor
# FileName: TASK-456_Form_Authoring_Enablement_In_Page_Editor.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Forms
**Estimated Effort:** Large
**Dependencies:** None (consumes TASK-421 widgets, TASK-418-06-L04 runtime binding; amends the TASK-452 catalog freeze deliberately)
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-12

---

## Overview

Authors cannot place forms from the Page Editor today: the `form` block is
gated `form-editor-controls-pending` (`pageDocumentV2.ts:560`) and the
`lead-form` section is gated `form-section-boundary` (`:486`). The PUBLIC
RUNTIME for the form block is already real and hardened (TASK-418-06-L04:
scoped data binding, shared access evaluators, nonce/anti-abuse on submit) —
the only missing piece is the authoring surface. This family un-gates the
`form` BLOCK with proper editor controls so client sites can ship contact and
lead forms built in the existing Forms admin.

Scope decision (binding): un-gate the `form` block only. The `lead-form`
SECTION stays gated — a lead-form layout is just a section composed with the
form block (composite-first product rule), so a separate section type adds
catalog noise; record this in the capability reason when touched.

The TASK-452 guard tests exist precisely to make this change deliberate: the
insertable catalog moves from 14 to 15 blocks and the gated-block set from 5
to 4 — those tests are updated IN THIS FAMILY with the new frozen values (per
their own contract: "Any promoted entry requires an explicit capability
change and follow-on task" — this is that task).

---

## Security Contract

- **Endpoint visibility:** no new endpoints. The form block renders through
  the existing public runtime (TASK-418-06-L04) and submits through the
  existing public form routes with their shared access evaluators,
  nonce/signature hardening, and rate-limit buckets — none of that is
  touched.
- **Auth model:** admin session for authoring; anonymous public read/submit
  unchanged.
- **RBAC:** existing Pages permissions for authoring; forms list read via the
  existing forms read permission in the admin client.
- **CSRF:** unchanged admin writes.
- **Rate-limit bucket:** unchanged (public submit keeps its existing bucket).
- **Validation:** `form` block props stay schema-owned (`formId` nullable
  string, `title` string — verify exact keys in `pageBlockDefaultProps`);
  reject-unknown preserved; a `formId` referencing a missing form renders the
  existing fail-closed runtime state.
- **Anti-abuse controls:** existing nonce/captcha pipeline on submit —
  explicitly re-verified in the closure smoke (live submit).

---

## Sub-Tasks

- [x] TASK-456-01: Form block controls contract and capability plan.
- [x] TASK-456-02: Registry, widgets, capability change, and guard-test
      update.
- [x] TASK-456-03: Validation, live submit smoke, and closure.

---

## Implementation Pseudocode

```ts
// Capability change (pageDocumentV2.ts): move "form" into
// editorInsertableBlockTypes; remove its gating reason; runtimeRenderer is
// already "real". Palette entry gets title "Form" + description.

// Registry (pageEditorControlRegistry.ts): form block Content panel controls:
//   blockPropControl("form", "formId", { input: "select", optionsSource: "forms" })
//   blockPropControl("form", "title", { input: "text" })
// The adapter resolves a DYNAMIC options source: a new uiModel hook feeding
// options from listFormsCached() (id -> name), rendered as a searchable
// select/combobox primitive (segmented is wrong for unbounded lists — add a
// "combobox" model kind to the adapter + a ComboboxControl primitive that
// follows the dark-toolbar chrome).

// Canvas: the editor canvas renders the form block through the shared
// renderer's editor-safe representation (fields preview, submit disabled in
// canvas mode) — verify what the runtime renderer emits in canvas context
// and gate interactivity behind layoutMode !== "canvas".
```

Expected data flow: palette insert -> default props (formId null -> canvas
shows "Pick a form" empty-state) -> combobox writes formId -> canvas preview
renders the form fields -> publish -> public runtime renders the live form
with the existing submit pipeline.

Error handling: missing/deleted form id -> existing runtime fail-closed
placeholder (verify its current shape); editor combobox marks dangling ids.

Regression-test shape:

- Domain: capability flip round-trip; default props.
- TASK-452 suites updated: 15-block catalog, 4 gated blocks, palette title
  "Form" present — updated values asserted exactly (deliberate contract
  change recorded in the changelog).
- UI: combobox options from mocked forms client; insert + pick + save payload.
- Bun runtime: published page renders the real form; submit path untouched
  (existing form submit tests still green).

---

## Testing Requirements

- `bun run test:vitest` (incl. updated TASK-452 suites + new UI tests).
- Bun: pages runtime suite + existing public form submit suites (env loaded).
- `bun --cwd core lint`, `bun --cwd core lint:types`, root tsc.
- Live smoke: build form in Forms admin -> insert form block -> publish ->
  REAL submit on the front (nonce path) -> submission visible in admin.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (catalog change 14->15, form block authoring).
- `_docs/WIDGET_PACK_MATRIX.md` / `_docs/_WIDGETS/*` if pack contracts
  reference the page-block catalog (verify; per AGENTS.md product rules).
- `docs/guide/` user note (adding a form to a page).
- `_docs/_TASKS/README.md` + `_docs/_CHANGELOG/` entry on completion.

---

## Completion Notes

Family completed 2026-06-12. Form block un-gated with real authoring: ComboboxControl primitive + combobox adapter kind (single owner, dynamic optionsSource), formId picker from listFormsCached, canvas-safe inert preview (pick-a-form empty state, disabled fieldset), palette entry "Form"; TASK-452 catalog deliberately amended (16 insertable / gated set reduced) with suites updated; runtime submit pipeline untouched. Live smoke: palette -> combobox -> publish -> REAL nonce submit -> success + payload in submissions API. Post-smoke: read-only Form Submissions admin screen added (commit 7d975441).

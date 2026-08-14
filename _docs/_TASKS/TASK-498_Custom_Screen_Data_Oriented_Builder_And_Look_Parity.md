# TASK-498: Custom-Screen Data-Oriented Builder + Look Parity
# FileName: TASK-498_Custom_Screen_Data_Oriented_Builder_And_Look_Parity.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Custom Screens / Screen Builder
**Estimated Effort:** Large
**Dependencies:** TASK-479 (soft/violet redesign), TASK-496-02 (Screen surfaces on the shared `CanvasEditor` shell), TASK-474 (custom-screen canvas parity)
**Status:** ✅ Done
**Completed:** 2026-07-01

---

## Overview

Turn the Custom-Screen **entry-view builder** into a data-oriented, graphical-schema
editor that matches the prototype look and the Pages editor shell, while keeping the
`ScreenDocumentV1` + `ScreenFieldBinding` model and the V4 definition contract intact
and backward-compatible (no schema-version bump, no DB migration, no route/RBAC change
unless a binding/entries read endpoint is touched).

The screen builder already routes through the shared `core/admin/ui/shared/CanvasEditor.tsx`
shell (the same outer frame as Pages) and the `{{ Field }}` binding mechanism already
exists (`ScreenFieldBinding` resolved by `resolveBlockBinding` + `readBindingPathValue`).
The remaining work is: (A) inner-content look + right-panel parity with Pages, (B) a
data-oriented block/section set with a per-kind `data` schema and inspector, (C) one
genuinely new runtime capability — relation resolution for a Related-list block — and
the entry/published rendering of every new kind.

### Owner refinements (override the plan where they conflict)

1. **Right-panel parity (not just "flatten").** The screen editor's right options
   panel/inspector currently is NOT identical to the Pages editor's shell panel. The
   contract REQUIRES the screen builder's right rail to match the Pages shell right
   rail **exactly** — same look (in-panel grip/hide header + target label + selection
   chip + single scrollable consolidated body) **and** the same show/hide behavior —
   modeled on the Pages `railBody`/`builderRail` (`PageEditor.tsx:3000-3074, 3321,
   3486-3496`), not merely a flattened inspector.
2. **Remove the List-view editor from this surface (non-destructive).** The surface
   that edits the appearance of the published entries-LIST table / row template is
   REMOVED from this screen editor for now (it will be relocated later). The screen
   editor becomes the **entry-view BUILDER only** (+ the entry-content editor). Drop
   the List/Editor view toggle and the list-view row-template editing surface. Keep
   the model + runtime for list rendering (`definition.listView`, `buildDefaultListRowTemplate`,
   `CustomScreenEntriesTable`, and the `ListView*` component files) untouched and
   round-tripped on save — only the EDITOR surface is removed.

### Goals

- The entry-view builder reads as a graphical SCHEMA: corner-tag block cards, muted
  mono `{{ Field }}` tokens in builder mode, a 9-chip `BlockChip` palette, and a single
  consolidated right inspector that is pixel-faithful to the Pages right rail.
- A data-oriented kind set (`heading`, `text`, `stat`, `divider`, `image`,
  `related-list`, `tabs`, `button`; `field` already exists) with a per-kind, schema-first,
  reject-unknown `data` normalization and per-kind inspector controls + bound-field
  filtering.
- Each screen owns its OWN entry layout; entry mode resolves real values, builder mode
  renders binding tokens, and the published list/entry surfaces render every new kind.
- Related-list resolves a relation field's target-entry IDs to real related entries.

### Out of scope

- No `ScreenDocumentV1.schemaVersion` bump (stays `1`); no definition version bump
  (stays `4`); no storage/DB migration; no legacy V1/V2/V3 read-repair regression.
- No List-view row-template editing in THIS surface (removed, not rebuilt).
- No new builder features beyond the kind set + relation resolver below; no change to
  inline write-back semantics (`title`/`slug`/schema fields only).

---

## Child subtasks

| ID | Title | Focus | Depends on |
|---|---|---|---|
| TASK-498-01 | Screen-Editor Look Parity + List-View Removal | Inner-content look (A1–A6), **right-panel parity with Pages**, 9-chip palette, corner-tag cards, builder `{{ }}` tokens, flat consolidated inspector, **remove List/Editor toggle + list-view editor surface** | TASK-496-02 |
| TASK-498-02 | Screen Data Block Kinds + Model | Extend `ScreenBlockKind`/labels/`createScreenBlock`; per-kind `normalizeScreenBlockData` (reject-unknown, NO version bump); inspector per-kind controls + bound-field filtering; runtime branches for `heading/text/stat/divider/image/button/tabs` | TASK-498-01 |
| TASK-498-03 | Related-List Runtime + Entry Rendering | Relation resolver (IDs → `RelatedEntrySummary[]` via `listEntriesCached`); `relatedEntries` prop on `ScreenRuntimeRenderer`; checklist/activity/cards variants; host precompute wiring (entry + preview hosts); entry/preview rendering of every new kind (published native list unchanged) | TASK-498-02 |
| TASK-498-04 | Screens Tests, Docs + Closure | vitest (schemas/ops/renderer/resolver), runtime/front smoke, gates, docs, changelog, optional read-path repair for `actions`/`legacy-widget` | TASK-498-01..03 |

**Sequencing:** 01 (look + removal, no model change) → 02 (model + kinds + inspector +
static runtime branches) → 03 (relation capability + entry/front rendering) → 04 (tests +
docs + closure). Each leaf isolates in a worktree (per the concurrent-drift-agents memory)
and runs ≥5 sequential drift-verify passes before merge. Do **not** commit during planning.

---

## Security Contract (board-level)

The per-kind `data` schema work is **schema-first / reject-unknown / backward-compatible**:
new kinds add per-kind normalization that rejects unknown keys within their own `data`,
while legacy kinds keep their permissive normalization so stored V4 screens read back
identically. **No route, endpoint-visibility, auth, RBAC, CSRF, or rate-limit change**
is introduced by 01/02. The only place a security surface is touched is TASK-498-03's
Related-list resolver: it performs a **read-only** lookup of related entries (a genuinely
new fetch — nothing reads related entries today) and MUST reuse the existing admin
entries-read `listEntriesCached` (`core/admin/services/entriesClient.ts`, the read
`FieldRenderer` already uses) and its existing admin auth + RBAC (no new write path, no new
public endpoint, no new permission). NB: `relationTargets` is a content-TYPE list, not an
entries read, so it is not the read to reuse. If resolution is done server-side in
`customScreenService`, state the internal-visibility + reject-unknown contract there; prefer
host-precomputed resolution (reusing the existing entries read) to keep the renderer pure and
avoid touching any route. See TASK-498-03 for its explicit Security Contract subsection.

---

## Non-destructive guarantees (assert in every leaf)

- `ScreenDocumentV1` (`schemaVersion: 1`) and `ScreenFieldBinding` lineage unchanged;
  definition `schemaVersion` stays `4`.
- Stored V4 screens read back byte-stable; `normalizeCustomScreenEditorViewDefinitionV4`
  still enforces `binding.blockId ∈ document` + `binding.field` root ∈ allow-list.
- `definition.listView` (columns, filters, rowTemplate) is preserved on save/load and the
  published list runtime (`CustomScreenEntriesTable` — a native column table via
  `resolveEntryColumnValue`, not a `ScreenRuntimeRenderer` host) keeps working; only the
  list-view EDITOR surface is removed from this screen. Related-list renders in the entry +
  preview surfaces only, not in the published list.
- No DB migration. No widget write-contract regression on the V4 path.

---

## Status board

| Subtask | Status |
|---|---|
| TASK-498-01 Look Parity + List-View Removal | ✅ Done |
| TASK-498-02 Data Block Kinds + Model | ✅ Done |
| TASK-498-03 Related-List Runtime + Entry Rendering | ✅ Done |
| TASK-498-04 Tests, Docs + Closure | ✅ Done |

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when any subtask changes status.
  **Board-sync requirement (AGENTS.md):** the README board index MUST carry a row for the
  **TASK-498** parent AND each of **TASK-498-01..04** (like the adjacent TASK-497 / TASK-499
  rows), with the **Statistics** counts updated, or a task-graph/board-sync gate can fail on a
  task file with no board row. The initial add is handled by the orchestrator (README is outside
  these TASK-498 contract files); if it is still absent, it MUST be reconciled before closure —
  do not treat "orchestrator-owned" as "optional".
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-498** + the closed subtasks.
- Extend `_docs/CONTENT_TYPES_SPEC.md` (or a dedicated screens contract doc) with the new
  per-kind `data` schemas and the Related-list relation-resolution contract (TASK-498-04).

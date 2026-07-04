# 1214 — TASK-505 Screens Section Columns & Binding Integrity

- **Date:** 2026-07-03
- **Version:** dev
- **Tasks:** TASK-505 (parent), TASK-505-01 (Section Style Model & Binding GC),
  TASK-505-02 (Section Grid Renderer), TASK-505-03 (Section Inspector & Binding
  Recovery UI), TASK-505-04 (Tests, Docs & Closure)
- **Type:** Admin UI/Custom Screens/Screen Builder/Schema/Binding Integrity/QA/Docs/Task Board

Two grounded Custom-Screens gaps landed on the **existing** validated
`PATCH /custom-screens/:id` write path — **no new endpoint, RBAC bucket, or migration,
and NO `schemaVersion` bump** (document `schemaVersion` stays `1`, editor-view definition
stays **v4**, stored-V4 docs round-trip **byte-identically**).

## Item A — Section column layout

- New dedicated `style?: ScreenSectionStyleV1` channel on `ScreenSectionV1`
  (`columns?` preset enum, `columnGap?` clamp 0..64) — precedent: the TASK-503 block
  `style` channel. The dead `section.layout` (`WidgetLayout`) field is left **untouched**
  (retyping it would throw `custom_screen_definition_invalid` on legacy docs).
- `screenSectionColumnPresets` (`"1".."4"`, `"1-1"`, `"1-2"`, `"2-1"`, `"1-3"`, `"3-1"`,
  `"2-3"`, `"3-2"`, `"1-1-1"`, `"1-1-1-1"`) → the exported `screenSectionColumnTemplate`
  fr map (single source of truth in `customScreenSchemas.ts`, imported by the renderer).
  Owner's `3/4 : 1/4` = `"3-1"` → `3fr 1fr`.
- `normalizeScreenSectionStyle` mirrors `normalizeScreenBlockStyle`: coerce-not-throw
  VALUES, **reject-unknown KEY throws**, prune-empty → `undefined`; mirrored in the Ajv
  `screenSectionV1Schema` `style` sub-schema (`additionalProperties:false`). Added to the
  `normalizeScreenSection` allow-list and `ScreenSectionPatch`.
- Renderer emits `display:grid` with `gridTemplateColumns` = the preset template and
  `gap` = `columnGap ?? 16`px on the one shared block-list container. **Block assignment is
  AUTO-FLOW** — each block = one cell in DOM order, zero new per-block state. The builder's
  **inter-block** insert-gap interleave is **suppressed** when gridded; only the
  section-start/end insert-gaps remain, each a **full-row** `grid-column: 1 / -1` affordance
  that never steals a cell. The gridded-builder branch still passes per-card `dropTargets`,
  so card-midpoint DnD (TASK-500) survives.
- **Absent `section.style` = byte-identical `space-y-4` DOM** (no grid channel injected,
  no `style` key on normalize). TASK-503 per-block `width` stays a **within-cell** fraction.
- Section inspector (Inspect enabled for a selected section; "Section layout" group renders
  only when `selectedSectionId && !selectedBlockId`) with a Columns `EnumRow` +
  clamped column-gap input; `buildSectionLayoutPatch` prunes an empty style to `undefined`.
  The **Bathrooms: 2** recipe = section `"3-1"` + Text "Bathrooms" (503 clearable label) +
  bound value → label-left / value-right on one row.

## Item B — Binding-integrity GC (the un-saveable dead-end fix)

- **Decision:** a binding to a **deleted content-type field** (field-orphan) or a **removed
  block** (block-orphan) is now **PRUNED + per-field-flagged (recoverable)**, NOT a hard 400.
  Field-orphans are collected into a mutable sink in `normalizeScreenFieldBinding` and pruned;
  block-orphans are pruned **inline** in both `normalizeCustomScreenEditorViewDefinitionV4`
  and the separate `normalizeCustomScreenListRowTemplate` (the SECOND, list-row binding
  dead-end). The `ForRead` twins prune silently via a discard sink (preserve the authored doc).
- The pruned field name(s) surface on the PATCH **200** response body as a transient
  `warnings` array (`binding_field_removed` / `binding_block_removed`), computed at normalize
  time and **never persisted**. The editor renders a clear per-field recovery notice. The
  `custom_screen_definition_invalid` 400 branch and `mapCustomScreenError`'s exact-message
  switch stay **byte-unchanged** — the residual 400 fires only for structurally-malformed
  bindings (which carry no field name).
- `reconcileScreenBindings` (`screenDocumentOps.ts`) — pure/deterministic/idempotent/
  non-destructive block-orphan GC, shipped as an available helper; **delete-site wiring is
  DEFERRED** (the normalize-time write safety-net is the saveability guarantee). Not imported
  into `customScreenSchemas.ts` (avoids a `schemas→ops→schemas` circular import); the narrow
  `removeScreenBindingsForBlockTree` helper is retained.
- **Sink-only signature discipline:** `normalizeCustomScreenDefinitionForWrite` and
  `normalizeCustomScreenEditorViewDefinitionV4` keep their existing return types (optional sink
  parameter, no widening) so the three assistant callers + the internal caller compile
  unchanged — verified by a root `tsc -p tsconfig.json --noEmit`.

## Tests, gates & docs

- Vitest (Bun-free custom-screens suites): section-style normalize + Ajv + field-orphan
  prune, `ScreenSectionPatch` `style` + `reconcileScreenBindings` GC, grid emission +
  full-row insert-gap + absent-style DOM identity, drop-zones inside a gridded section
  (TASK-500 no-regress), section-inspector unit suite, host wiring + binding-recovery notice,
  authoring-boundary scan, and the normalize-time GC write safety-net (mocked-db lane).
- Bun lane (`tests/integration/routes/customScreensRoutes.test.ts`): section-style PATCH
  round-trip byte-stable, unknown section-style KEY → 400, field-orphan recovery (saveable
  200 + field name), **list-row block- AND field-orphan recovery**, malformed-binding-still-400,
  and no-style/orphan-free byte-stable round-trip.
- Regression pins green: stored-V4 byte-stability, `removeScreenBindingsForBlockTree`,
  TASK-498 presentation-override surface, TASK-500 insertion/drop, TASK-503 block-style/
  clearable labels, PaletteChip dead-code guard, Bun-free authoring boundary.
- Gates: `bun --cwd core lint`, `bun --cwd core lint:types`, root `bunx tsc -p tsconfig.json
  --noEmit`, `bun run test:vitest`, `bun run test:bun`, `bun run gates:coderso` — all green.

## Deferred residuals (recorded, not silent gaps)

Per-block `columnSpan`/`columnStart`; a visual column-ratio picker / SegmentedControl (v1
uses the plain `EnumRow`); custom (non-preset) fr ratios; responsive per-breakpoint column
counts; nested-section grids; `reconcileScreenBindings` delete-site wiring.

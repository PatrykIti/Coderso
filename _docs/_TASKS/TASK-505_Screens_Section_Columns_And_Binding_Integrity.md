# TASK-505: Screens Section Columns & Binding Integrity

# FileName: TASK-505_Screens_Section_Columns_And_Binding_Integrity.md

**Parent Task:** TASK-505 (board umbrella)
**Priority:** High
**Category:** Custom-Screens — schema/service + editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-498 (data-oriented builder, presentation-override surface, Bun-free boundary), TASK-500 (sections first-class, `ScreenInsertTarget`, insertion targeting), TASK-503 (block `style` channel, clearable labels). Rides the existing validated `PATCH /custom-screens/:id` write path.
**Status:** ✅ Done
**Completed:** 2026-07-03

---

## Overview

Two grounded Custom-Screens gaps, both landing on the **existing** validated custom-screen write path — **NO new endpoint/RBAC/migration, NO `schemaVersion` bump** (document `schemaVersion` stays `1`, definition stays v4, stored-V4 byte-stable).

### Item A — Section column layout (owner ask)

> "sections have no side-panel options; I want N columns to split the view 3/4..1/4, e.g. a Bathrooms: 2 label-left/value-right composition."

Today a `<section>` renders its blocks as a single vertical `space-y-4` stack, and a selected section has **no inspector at all**. Add a **new** dedicated `style?: ScreenSectionStyleV1 = { columns?: preset-enum, columnGap?: clamp }` channel on `ScreenSectionV1` (naming/precedent parallel to the TASK-503 block `style` channel), a preset→`grid-template-columns` fr-ratio map, a grid emission on the one shared renderer container, and a **section inspector** with a Columns control + gap input. `3/4 : 1/4` = preset `"3-1"` → `3fr 1fr`. The "Bathrooms: 2" composition = section `"3-1"` + a Text block ("Bathrooms", a 503 clearable label) + the bound field-value block; auto-flow places them label-left / value-right. **Absent `style` = today's vertical stack, byte-identical DOM.**

**Do NOT reuse the dead `section.layout` field.** `layout` is declared `WidgetBlock["layout"]` = `WidgetLayout` (Pages container/padding tokens) and is a permissive dead pass-through (`normalizeScreenSection` copies it verbatim; the V4 renderer never reads it). Retyping it to an enum-validated reject-unknown shape would throw `custom_screen_definition_invalid` on any legacy doc that carries a `WidgetLayout` object — **not byte-safe**. TASK-503 added a *new* block `style` channel for exactly this reason; follow that precedent for sections.

### Item B — Binding-integrity GC on save (bug-hunt HIGH — the un-saveable dead-end)

A screen whose bindings reference a **deleted content-type field** becomes **permanently un-saveable**:

- `normalizeScreenFieldBinding` (`customScreenSchemas.ts:826-829`) computes `getAllowedBindingFieldRoots(context)` from the live content-type schema and **throws `custom_screen_definition_invalid`** when a binding's `field` root is not in the schema. Delete a field on the content type and every screen still binding it fails to save.
- The route maps that to an **opaque static 400** — `custom_screen_definition_invalid` / "Custom screen definition is invalid" (`customScreenRoutes.ts:44-49`) — with **no field name**, so the user cannot diagnose which field died.
- Deleting the *referencing blocks* does **not** rescue it — there are two distinct orphan classes with two distinct EXISTING behaviours, and neither "silently survives":
  - **Field-orphan** (block still present, but its `field` root was deleted from the content type): throws at `normalizeScreenFieldBinding` (`customScreenSchemas.ts:827-829`) as above.
  - **Block-orphan** (the referencing block was removed, so `blockId` matches no live block): this does **NOT** merely survive — it **HARD-THROWS `custom_screen_definition_invalid`** via an EXISTING, previously-uncited gate `assertScreenFieldBindingsTargetDocument` (`customScreenSchemas.ts:1263-1270`, invoked at `:1281` for the list-row template) and the two inline copies of the same guard — `if (blockIds.size > 0 && bindings.some((b) => !blockIds.has(b.blockId))) throw` — at `customScreenSchemas.ts:1452` (WRITE path, inside `normalizeCustomScreenEditorViewDefinitionV4`) and `:1484` (READ path, inside `normalizeCustomScreenEditorViewDefinitionV4ForRead`). `removeScreenBindingsForBlockTree` (`screenDocumentOps.ts:996-1003`) only drops bindings whose `blockId` is in the *removed subtree*, so a block-orphan produced by any delete path the caller didn't feed through this helper reaches save and HARD-400s at `:1452`. There is **no UI to remove orphaned bindings**.

**Fix (recommended, owner needs a recovery path):** a deterministic, non-destructive **reconcile/GC pass** that (1) prunes bindings whose `blockId` matches **no live block** in the document (orphaned), delivered as a normalize-time safety net **INSIDE `normalizeCustomScreenEditorViewDefinitionV4`** (the `reconcileScreenBindings` ops helper also ships for a future delete-site adopter, but delete-**site** wiring is DEFERRED — adopted by no 505 subtask; the write safety-net is the actual saveability guarantee, see TASK-505-01 §B2) — between the binding-normalize (`customScreenSchemas.ts:1450`) and the EXISTING block-orphan assert (`:1452`) — so the `:1452`/`:1484` assert passes on a pruned set instead of hard-throwing** `custom_screen_definition_invalid`; (2) **prunes-with-warning** a binding whose `field` is missing from the content-type schema instead of the opaque throw, and **surfaces the offending field name(s)** in the error/warning so the user can diagnose and the screen becomes saveable again. Prefer **prune-orphaned + a clear per-field warning** over an opaque 400. **The READ path is ALREADY non-fatal (empirically verified — see TASK-505-01 §B4 / §Verified-current):** although the ForRead V4 normalizer (`normalizeCustomScreenEditorViewDefinitionV4ForRead`) and the list-row ForRead variant (`normalizeCustomScreenListRowTemplateForRead`) *can* throw on a field-/block-orphan when a content-type context is passed, `normalizeCustomScreenDefinitionForRead`'s multi-layer read-repair **swallows** it — the final fallback `normalizeCustomScreenDefinition(input)` (`customScreenSchemas.ts:1920`) re-normalizes **WITHOUT** the content-type context, so `getCustomScreen` returns **200** and the editor loads the broken screen, and `updateCustomScreen`'s base read of the existing stored bytes (`customScreenService.ts:227`) **never 400s** — the write normalizer at `:239` (and its B3/B4 prune) **IS** reached. Recovery of **saveability** therefore rests on the **WRITE-path prune (B3/B4) only** — the base read never 400s, so a write-path prune alone makes the field-orphan screen saveable. The **read-path** change is a distinct **correctness improvement, not a 400-prevention**: its real purpose is to PRESERVE the authored document while pruning orphans. Concretely, the field-orphan read RETAINS the orphan (via the no-context `:1920` fallback, document intact), but a **block-orphan** read currently RECOVERS by **discarding the whole `editorView` into an empty V1-migrated document** (`:1921-1929` → `migrateV1DefinitionToV4` over the absent top-level `blocks`), and `normalizeCustomScreenListRowTemplateForRead` similarly swallows→fallback — silent data loss. Making the ForRead normalizers prune orphans in-place fixes that silent-discard and the stale-retention; it does **NOT** gate saveability recovery (the write-path prune already does). See TASK-505-01 §B4 and §Verified-current.

---

## Security Contract

**UI/client-state + schema-first document contract extension; the binding-GC runs in the existing definition normalize/save path — no new route/RBAC/endpoint/migration.**

Verified (Read + `grep -an`):

- **Route (existing).** `router.patch("/custom-screens/:id", requirePermission("content:write"), …)` — `customScreenRoutes.ts:115`. The definition-invalid branch — `customScreenRoutes.ts:44-49` — maps `custom_screen_definition_invalid` → `ApiError(…, 400)` today with a static message and stays as-is for *structurally-malformed* bindings. Item B carries the offending field name(s) on the **200 success** response instead (field-orphans are pruned, not fatal — see Item B), via a transient `warnings`/`prunedFields` body field; it adds **no** route, RBAC bucket, or method. Item A adds only document keys under the existing PATCH envelope.
- **Save/normalize path (existing).** `updateCustomScreen` → `normalizeCustomScreenDefinitionForWrite` (`customScreenService.ts:239`, which today returns ONLY the normalized `definition`) with the content-type `context`. There is **NO seam "in `ForWrite` before binding validation"**: `normalizeCustomScreenDefinitionForWrite` (`customScreenSchemas.ts:1707`) invokes `normalizeCustomScreenEditorViewDefinitionV4` (`:1431`) as its **LAST statement** (`:1764`), and the field-orphan throw (`:827`) plus the block-orphan assert (`:1452`) both fire DEEP inside that editor-view normalizer before `ForWrite` ever regains control; the inline block-orphan prune also needs the normalized `ScreenDocumentV1`/`blockIds` that only exist at `:1449-1451`. The GC/reconcile safety-net therefore runs **INSIDE `normalizeCustomScreenEditorViewDefinitionV4`**: after `const document = normalizeScreenDocumentV1(...)` (`:1449`), `const bindings = normalizeScreenFieldBindings(..., sink)` (`:1450`), and the EXISTING `const blockIds = collectScreenBlockIds(document)` (`:1451`), and BEFORE the `:1452` block-orphan assert, **prune block-orphans INLINE** — filter `bindings` to those whose `blockId ∈ blockIds`, collecting the dropped `field` names into `removedBlockOrphans` — so the `:1452` assert runs on the pruned set instead of hard-throwing. **Do NOT import the ops-level `reconcileScreenBindings` into the schema file:** `customScreenSchemas.ts` has ZERO imports from `screenDocumentOps.ts`, which imports FROM it (`screenDocumentOps.ts:7-8`) — pulling the VALUE up would invert the established layering and create a runtime circular import (schemas→ops→schemas) with a TDZ/partial-init `undefined` risk; the schema file already holds the exact live-block-id set at `:1451`, so the prune is a one-line inline filter (mirror it in the `...ForRead` twin at `:1483-1484`). field-orphans are collected+pruned via a mutable sink inside `normalizeScreenFieldBinding`/`normalizeScreenFieldBindings` (`customScreenSchemas.ts:814-852`) — no new service surface. To carry pruned-field names on a **successful** save WITHOUT any return-type ripple, thread an **optional caller-supplied mutable sink** object down: `normalizeCustomScreenEditorViewDefinitionV4` **keeps its `CustomScreenEditorViewDefinitionV4` return type** (`:1434`) and `normalizeCustomScreenDefinitionForWrite` **keeps its `CustomScreenDefinition` return type** (`:1717`) — both take an optional final `sink?: { removedFieldOrphans: string[]; removedBlockOrphans: string[] }` parameter into which pruned field-/block-orphan names are pushed. **NO return-type widening of either function is permitted:** returning `{ definition, removedFieldOrphans, removedBlockOrphans }` from `ForWrite` would break its three assistant call sites that consume the return value AS the definition — `core/services/assistant/actionPlanSchema.ts:843`, `core/services/assistant/cmsOperationActionMapper.ts:697`, `core/services/assistant/blueprints/catalogFamilyBlueprint.ts:198` (all `definition: normalizeCustomScreenDefinitionForWrite({...})`, none in 505-01's Affected Files) — and widening the editor-view normalizer's return would break the internal `normalizeCustomScreenDefinition` caller at `customScreenSchemas.ts:1703` (which assigns `editorView: normalizeCustomScreenEditorViewDefinitionV4(...)` expecting the plain `CustomScreenEditorViewDefinitionV4`, on READ + assistant paths); all four are OUTSIDE 505-01's single-writer ownership, and per the repo typecheck-scope gotcha a root `tsc` would fail and block the owner's commit. Only the service **update** call-site (`customScreenService.ts:239`) passes/reads the sink; the **create** call-site (`:177`) and the three assistant sites pass **no** sink (their unchanged return type is preserved). The service attaches the sink's `removedFieldOrphans` to the returned screen record as a **transient** `warnings`/`prunedFields` field (computed at normalize time, NEVER persisted → stored-V4 bytes unaffected). No new route/response contract beyond that transient field. **The ForRead normalizers are ALREADY non-fatal** (`normalizeCustomScreenEditorViewDefinitionV4ForRead` + `normalizeCustomScreenListRowTemplateForRead`): although their inner V4 validators *can* throw on a field-/block-orphan when a content-type context is passed, `normalizeCustomScreenDefinitionForRead`'s multi-layer read-repair swallows it — the final fallback `normalizeCustomScreenDefinition(input)` (`customScreenSchemas.ts:1920`) re-normalizes **WITHOUT** context, so `getCustomScreen` returns 200 and `updateCustomScreen`'s base read of the existing stored bytes at `customScreenService.ts:227` **never 400s**, and the write normalizer at `:239` (with its B3/B4 prune) **IS** reached. The write-path safety-net therefore delivers **saveability** recovery on its own. The ForRead prune is a distinct **correctness improvement, not a 400-prevention or a saveability prerequisite:** its real purpose is to PRESERVE the authored document — a field-orphan read currently RETAINS the stale orphan (no-context `:1920` fallback, document intact), and a **block-orphan** read currently RECOVERS by **discarding the whole `editorView` into an empty V1-migrated document** (`:1921-1929` over the absent top-level `blocks`), which is silent data loss; the ForRead prune fixes that silent-discard and the stale-retention. (See TASK-505-01 §B4 and §Verified-current.)
- **Section-style write.** `normalizeScreenSectionStyle` is coerce-not-throw with `rejectUnknownKeys` + Ajv `additionalProperties:false`; it persists nothing when absent (byte-stable). No new persisted table/column; `schemaVersion` unchanged.
- **No migration.** Absent `section.style` and orphan-free bindings are the universal existing state; the GC is pure over the in-memory document, and stored-V4 docs round-trip byte-identically.

No auth/nonce/HMAC/reCAPTCHA change: the write is already `content:write`-gated with the app's CSRF/session envelope; this task neither loosens nor adds an auth path.

---

## Sub-Tasks

| ID | Title | File | Status |
|----|-------|------|--------|
| TASK-505-01 | Section Style Model & Binding GC | `TASK-505-01-Section-Style-Model-And-Binding-GC.md` | ✅ Done |
| TASK-505-02 | Section Grid Renderer | `TASK-505-02-Section-Grid-Renderer.md` | ✅ Done |
| TASK-505-03 | Section Inspector & Binding Recovery UI | `TASK-505-03-Section-Inspector-And-Binding-Recovery-UI.md` | ✅ Done |
| TASK-505-04 | Screens Columns Tests, Docs & Closure | `TASK-505-04-Screens-Columns-Tests-Docs-Closure.md` | ✅ Done |

### Land order & single-writer ownership

Strictly sequential — each stage lands green before the next opens:

1. **505-01 (model + GC)** — sole writer of `core/services/customScreens/customScreenSchemas.ts` + `core/services/customScreens/screenDocumentOps.ts`. Ships the type, normalizer, Ajv mirror, patch-type extension, and the binding reconcile/GC + field-name error plumbing. Nothing renders it yet.
2. **505-02 (renderer)** — sole writer of `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx`. Consumes `section.style` to emit the grid; auto-flow with the **inter-block** insert-gap interleave **suppressed when gridded** (only the section-start/end gaps remain, each full-row `grid-column: 1 / -1`; grid-agnostic card + section-end drop targets carry DnD).
3. **505-03 (editor)** — sole writer of `core/admin/ui/custom-screens/ScreenBlockInspector.tsx` + `ScreenAuthoringCanvas.tsx` + `CustomScreenEditorPage.tsx`. Section inspector + `handlePatchSection` wiring + the binding-recovery affordance surfacing 505-01's warning.
4. **505-04 (closure)** — tests (Vitest + Bun), docs, changelog, board/Statistics.

Single-writer map: **schemas/ops = 505-01**, **`ScreenRuntimeRenderer.tsx` = 505-02**, **inspector/canvas/editor-page = 505-03**. No file has two owners.

---

## Item A — Section column contract (execution-ready shapes)

### Types & constants (`customScreenSchemas.ts`, near the TASK-503 block-style block)

```ts
export const screenSectionColumnPresets = [
  "1", "2", "3", "4",
  "1-1", "1-2", "2-1", "1-3", "3-1", "2-3", "3-2",
  "1-1-1", "1-1-1-1",
] as const;
export type ScreenSectionColumnPreset = (typeof screenSectionColumnPresets)[number];

export const SCREEN_SECTION_COLUMN_GAP_CLAMP = { min: 0, max: 64 } as const;

export type ScreenSectionStyleV1 = {
  columns?: ScreenSectionColumnPreset; // absent → vertical stack (unchanged)
  columnGap?: number;                  // clamped int px 0..64
};

const screenSectionStyleAllowedKeys = ["columns", "columnGap"] as const;
```

`ScreenSectionV1` gains `style?: ScreenSectionStyleV1` (a NEW channel; `layout` untouched).

### Normalizer (mirror `normalizeScreenBlockStyle` exactly — coerce-not-throw, reject-unknown KEYS, prune-empty)

```ts
const normalizeScreenSectionStyle = (value: unknown): ScreenSectionStyleV1 | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) return undefined;
  rejectUnknownKeys(value, screenSectionStyleAllowedKeys); // unknown KEY throws
  const style: ScreenSectionStyleV1 = {
    ...(value.columns !== undefined
      ? { columns: coerceScreenEnum(value.columns, screenSectionColumnPresets, "1") }
      : {}),
    ...(value.columnGap !== undefined
      ? { columnGap: clampScreenInt(
            value.columnGap,
            SCREEN_SECTION_COLUMN_GAP_CLAMP.min,
            SCREEN_SECTION_COLUMN_GAP_CLAMP.min,
            SCREEN_SECTION_COLUMN_GAP_CLAMP.max,
          ) }
      : {}),
  };
  return Object.keys(style).length > 0 ? style : undefined;
};
```

- Reuses `coerceScreenEnum` + `clampScreenInt`. Junk `columns` coerces to `"1"` (single column = stack) → bad input degrades harmlessly; `{}` / all-junk prunes to `undefined` → **never persists** for existing screens.
- Wire into `normalizeScreenSection`: add `...(style ? { style } : {})` and add `"style"` to that function's `rejectUnknownKeys([... "blocks"])` allowlist.
- **Ajv mirror.** `screenSectionV1Schema` gains a `style` sub-schema with `additionalProperties:false`, `columns` = enum of `screenSectionColumnPresets`, `columnGap` = integer 0..64.
- **`ScreenSectionPatch`** (`screenDocumentOps.ts:30-32`) gains `"style"`: `Partial<Pick<ScreenSectionV1, "label" | "data" | "layout" | "visibility" | "style">>`. `updateScreenSection` (`screenDocumentOps.ts:634`) already spreads the patch.

### Preset → grid-template-columns map (EXPORTED by 505-01 in `customScreenSchemas.ts`; imported by the renderer)

The map is the single source of truth **owned by 505-01** (schemas = single-writer), not redeclared in the renderer. 505-02 imports it (`import { screenSectionColumnTemplate } from customScreenSchemas`) and emits `gridTemplateColumns: screenSectionColumnTemplate[preset]`:

```ts
// customScreenSchemas.ts (505-01) — exported single source of truth:
export const screenSectionColumnTemplate: Record<ScreenSectionColumnPreset, string> = {
  "1": "1fr", "2": "1fr 1fr", "3": "1fr 1fr 1fr", "4": "1fr 1fr 1fr 1fr",
  "1-1": "1fr 1fr", "1-2": "1fr 2fr", "2-1": "2fr 1fr",
  "1-3": "1fr 3fr", "3-1": "3fr 1fr", "2-3": "2fr 3fr", "3-2": "3fr 2fr",
  "1-1-1": "1fr 1fr 1fr", "1-1-1-1": "1fr 1fr 1fr 1fr",
};
```

Owner's `3/4 : 1/4` = `"3-1"` → `3fr 1fr`; `1/4 : 3/4` = `"1-3"`.

### Renderer emission (single conditional on the shared block-list container div)

The block-list container (`ScreenRuntimeRenderer.tsx`, the one `space-y-4` div shared by builder/preview/entry) becomes:

```ts
const cols = section.style?.columns;
const tpl = cols ? screenSectionColumnTemplate[cols] : undefined;
// className: cols ? "grid" : "space-y-4"   (+ existing sectionDragHover ring, unchanged)
// style:     cols ? { gridTemplateColumns: tpl, gap: section.style?.columnGap ?? 16 } : undefined
```

- **Unset `columns` keeps `space-y-4` exactly → byte-identical DOM to today.**
- **Block assignment = AUTO-FLOW.** Each block is one grid cell filled left-to-right by DOM order — zero new per-block state, the owner's exact mental model.
- **Insert-gap fix — suppress only the INTER-BLOCK gaps when gridded; keep the section-start/end gaps as full-row (canonical design, TASK-505-02 §5).** In the builder the block-list container is a **single** element that also holds the interleaved `renderInsertGap` gaps: a leading gap before **every** block plus a trailing one (`ScreenRuntimeRenderer.tsx:1728-1755`), all inside the one grid container (`:1708`). Under `display:grid; grid-auto-flow:row`, a `grid-column: 1 / -1` gap occupies a WHOLE row and cannot be back-filled, so an INTER-BLOCK full-row gap forces the following block onto the next row — in a `"2"`/`"3-1"` section every block would end up isolated on its own row and STACK, defeating the columns **in the builder**. Therefore, when `section.style?.columns` is set in **builder** mode, add a **NEW gridded-builder branch** — and do **NOT** reuse the existing gap-free else-branch at `:1757-1759`, which calls `renderBlock(block, { sectionId, suppressed: false })` **WITHOUT any `dropTargets`** and would silently kill card-midpoint DnD. The new branch maps `section.blocks` **WITH the same** per-card `dropTargets: { before/after section-index }` the interleaved branch passes (`:1739-1746`), and renders **only the section-start (index 0) and section-end (index N) `renderInsertGap(...)` gaps, each as a full-row `grid-column: 1 / -1` affordance** (`:1731`, `:1750`), **suppressing the inter-block gaps**. The two full-row gaps sit on their own rows at top/bottom and never steal a cell; each block is a clean grid cell that *also* carries its own before/after-midpoint drop surface, so auto-flow yields the intended left-to-right columns in builder + preview + entry alike **and** DnD stays intact. (See TASK-505-02 §5 for the exact `renderInsertGap({ fullRow })` helper + call-site conditional — this is the canonical design that 505-04's smoke encodes.)
- **TASK-503 per-block `width` (`w-1/2` etc.) stays a WITHIN-CELL fraction.** A grid cell simply *is* the block's container, so `w-1/2` = half the cell; it composes with zero reinterpretation. Do **not** overload block `width` into a column-span (that is the double-meaning trap). Per-block `columnSpan`/`columnStart` is **DEFERRED** (a later `ScreenBlockStyleV1.span`/`start`).
- **Drop-zones (TASK-500) are grid-agnostic and carry DnD in a gridded section — but ONLY if the new branch still feeds `dropTargets` per card.** `cardDropTargets` is `canDrag && !ctx.suppressed ? ctx.dropTargets : undefined` (`:650`), and the card drag-over/drop handlers (`:676-691`) **no-op when it is `undefined`** — so the per-card before/after-midpoint surface exists ONLY when the render passes `dropTargets`. The NEW gridded-builder branch above therefore MUST pass the same `{ before/after section-index }` `dropTargets` (`:1739-1746`) the interleaved branch does, just without the `renderInsertGap` gaps. Given that, the per-card midpoint targets (`cardDropTargets` + `resolveCardDropTarget`) and the section-end `data-screen-section-dropzone` (`:1720`, on the container div, already grid-agnostic) both survive, so suppressing the gaps loses no insertion capability. (Falling back to the gap-free else-branch at `:1757-1759`, which passes NO `dropTargets`, would silently drop card-midpoint insertion.)

### Editor (505-03)

- Today the Inspect category is `disabled: !selectedBlock` and shows "Select a block" with no block. Enable it for sections: `disabled: !selectedBlock && !selectedSectionId`.
- New "Section layout" group rendered when `selectedSectionId && !selectedBlockId`:
  - a **Columns** control via the existing `EnumRow` over `screenSectionColumnPresets` (a visual ratio-picker is deferred);
  - a **column gap** number input reusing the 503 clamped-numeric pattern.
- `buildSectionLayoutPatch(current, edit)` mirrors `buildStylePatch`: read `section.style`, apply the edit, **prune to `undefined` when empty** (keeps absent-style docs byte-stable).
- Host wiring: `handlePatchSection` in `CustomScreenEditorPage.tsx` → `updateScreenSection(document, id, { style: buildSectionLayoutPatch(...) })`.

### The "Bathrooms: 2" composition

Set section `columns: "3-1"` (label-left emphasis) or `"1-1"` (equal); block 1 = a Text block "Bathrooms" (503 clearable label), block 2 = the bound field-value block. Auto-flow places them label-left / value-right. **No new block kind, no binding change** — needs only columns + shipped 503 block style + 503 clearable labels.

---

## Item B — Binding-integrity GC (execution-ready shapes)

### Reconcile/GC helper (`screenDocumentOps.ts`, sole writer 505-01)

```ts
export type ScreenBindingReconcileResult = {
  bindings: ScreenFieldBinding[];   // pruned, deterministic order (source order preserved)
  removedBlockOrphans: string[];    // fieldName[] whose blockId had no live block
};
// NOTE: field-orphans (field missing from the content type) are NOT reported here —
// they are collected by the separate normalizeScreenFieldBindings sink (Item B below),
// not by reconcileScreenBindings. This helper is block-orphans only.

// Prune bindings whose blockId matches NO live block in the document.
// NON-destructive to valid bindings; deterministic (stable order); pure.
export function reconcileScreenBindings(
  document: ScreenDocumentV1,
  bindings: ScreenFieldBinding[],
): ScreenBindingReconcileResult {
  const liveIds = new Set(
    document.sections.flatMap((s) => s.blocks.flatMap((b) => collectScreenBlockIds(b))),
  );
  const kept: ScreenFieldBinding[] = [];
  const removedBlockOrphans: string[] = [];
  for (const binding of bindings) {
    if (liveIds.has(binding.blockId)) kept.push(binding);
    else removedBlockOrphans.push(binding.field);
  }
  return { bindings: kept, removedBlockOrphans };
}
```

- **Shipped as an available helper — delete-SITE wiring is fully DEFERRED (adopted by NO 505 subtask).** `reconcileScreenBindings` is the broader superset of `removeScreenBindingsForBlockTree` (prunes ANY no-live-block binding, not just an explicitly-fed removed subtree) that a future adopter MAY wire at a delete call site; but neither 505-01, 505-02, nor 505-03 wires it there (505-03's editor recovery uses a client-side `detectScreenBindingOrphans` + a bindings-only `.filter`; the assistant `actionExecutorService` sites are out of scope). The **saveability guarantee is the normalize-time write safety-net below** — it prunes block-orphans on every Save regardless of which delete handler ran, so no delete-site wiring is required for recovery. See TASK-505-01 §B2.
- Run as a **normalize-time safety net INSIDE `normalizeCustomScreenEditorViewDefinitionV4`** (`customScreenSchemas.ts:1431`), positioned between the binding-normalize (`:1450`)/the EXISTING `blockIds` collection (`:1451`) and the block-orphan assert (`:1452`): **prune block-orphans INLINE** — filter `bindings` to those whose `blockId ∈ blockIds` (the set already computed at `:1451`), collecting the dropped `field` names into `removedBlockOrphans` — so the `:1452` assert (and its `:1484` read-path twin) passes on the pruned set instead of hard-throwing `custom_screen_definition_invalid`. **The `:1281` list-row `assertScreenFieldBindingsTargetDocument` is a SEPARATE binding set that this editor-view prune does NOT cover** — it lives in `normalizeCustomScreenListRowTemplate` (`:1273-1283`), which normalizes its OWN independent `rowTemplate` binding set (`input.bindings` at `:1280`) and hard-throws at `:1281`, reached on the WRITE path via `normalizeCustomScreenListViewDefinition` (`:1359`, invoked at `:1763`). The editor-view prune never touches those bindings, so a **list-row block-orphan** would still hard-400 `custom_screen_definition_invalid` — the exact un-saveable dead-end class this task removes. Therefore add the **same inline block-orphan prune between `:1280` and `:1281`** inside `normalizeCustomScreenListRowTemplate` (filter `bindings` to those whose `blockId ∈ collectScreenDocumentBlockIds(document)`, collecting the dropped `field` names into `removedBlockOrphans`) so `:1281` runs on the pruned set, and **mirror it in its ForRead twin `normalizeCustomScreenListRowTemplateForRead`** (`:1285-1295`). Also **thread the field-orphan sink into the `:1280` `normalizeScreenFieldBindings` call** so list-row field-orphan names surface in the same 200 `warnings`/`prunedFields` array (list-row field-orphans do NOT hard-throw once `normalizeScreenFieldBindings` is prune-not-throw — but their names must still bubble up). **Do NOT import the ops-level `reconcileScreenBindings` into the schema file:** `customScreenSchemas.ts` has ZERO imports from `screenDocumentOps.ts` (which imports FROM it, `screenDocumentOps.ts:7-8`), so pulling the VALUE up would invert the layering and create a runtime circular import (schemas→ops→schemas) with a TDZ/partial-init risk; the schema file already holds the exact live-block-id set at `:1451`, making the prune a one-line inline filter. (Alternatively, relocate the shared reconcile helper DOWN into `customScreenSchemas.ts` and have `screenDocumentOps.ts` import it, preserving the existing ops→schemas direction.) There is **NO usable seam in `normalizeCustomScreenDefinitionForWrite` itself** — it calls the editor-view normalizer as its last statement (`:1764`), so validation has already thrown before `ForWrite` regains control. Thread an **optional caller-supplied mutable sink** (NOT a return-shape change) into `normalizeCustomScreenEditorViewDefinitionV4` to bubble `removedBlockOrphans` (+ the field-orphan sink) out through `ForWrite` to the service → PATCH 200 body; `ForWrite` **keeps its `CustomScreenDefinition` return type** and the editor-view normalizer **keeps its `CustomScreenEditorViewDefinitionV4` return type**. **No return-type widening is permitted** — it would break `actionPlanSchema.ts:843`, `cmsOperationActionMapper.ts:697`, `catalogFamilyBlueprint.ts:198` (all consume the return value AS the definition) and the internal `:1703` caller, all OUTSIDE 505-01's ownership, and would fail a root `tsc`.

### Field-orphan handling in the binding validator (`customScreenSchemas.ts`)

`normalizeScreenFieldBinding` (`:826-829`) currently throws when `fieldRoot ∉ allowedFieldRoots`. Change the array-level `normalizeScreenFieldBindings` (`:843-852`) so a missing-content-field binding is **collected + pruned**, not fatal, and the offending field name(s) bubble up:

```ts
// pass a mutable sink into the per-item normalizer; on missing fieldRoot,
// push binding.field into removedFieldOrphans and SKIP the binding instead of throwing.
// Genuinely-malformed bindings (non-record, no blockId, bad source/mode) still throw.
```

Then thread `removedFieldOrphans` (+ block-orphans) to the error/warning surface:

- **Channel (pinned — this reconciles the prune-to-success vs 400-with-fields contradiction).** Because field-orphans are **pruned to a 200 success**, their names CANNOT ride a 400 — the residual 400 fires only for *structurally-malformed* bindings, which carry no field name. So the two paths split cleanly:
  - **Success path (pruned field-orphans → the field-name channel).** `normalizeScreenFieldBinding` pushes each missing `field` root into a mutable sink instead of throwing; the array-level `normalizeScreenFieldBindings` collects them into the threaded sink; `normalizeCustomScreenDefinitionForWrite` bubbles them via the **optional caller-supplied sink** (NOT a widened return — its `CustomScreenDefinition` return type is unchanged); the service reads the sink and surfaces them on the PATCH **200** response body as a transient `warnings`/`prunedFields` array (505-01 owns this plumbing; 505-03 renders it). **This is the sole data path** for the field name(s) required by 505-03's recovery affordance, Acceptance #5, and SMOKE #4.
  - **Hard-400 path (unchanged shape, no field name).** Genuinely-malformed bindings (non-record, no `blockId`, bad `source`/`mode`) still `throw` → the route branch (`customScreenRoutes.ts:44-49`) maps to `ApiError(…, 400)` with today's static message. It carries **no** field name (there is none), so the previously-drafted `ApiError("… references missing field(s): bathrooms", 400, { fields })` is **dropped** as unreachable — the pruned case never reaches a 400.
- **Decision (recommended):** a missing-CONTENT-TYPE-FIELD binding is **pruned + flagged** (recoverable), not a hard-fail. The owner needs a recovery path from the dead-end; prune-orphaned + a clear per-field warning beats an opaque 400. Document this decision in the closure.

### Determinism / non-destructiveness guards

- The GC is **pure** over the in-memory document, **preserves source order** of surviving bindings, and touches **only** bindings with no live block / no live field — valid bindings are byte-identical through the pass. Idempotent: running it twice yields the same result.

### Editor recovery affordance (505-03)

Read the transient `warnings`/`prunedFields` array off the PATCH **200** response (the channel pinned in "Field-orphan handling" above) and surface it per field on save — e.g. an inline notice "Removed bindings for deleted field(s): bathrooms" — so the user can diagnose the previously-opaque dead-end and knows why the binding vanished. No new response contract beyond that transient field, and nothing is read back from the store.

---

## Acceptance Criteria (measured live)

1. **2-column + 3-1 sections with visible-effect grid.** In the builder, set a section to `"2"` and another to `"3-1"`; the block-list container carries class `grid` and its **inline** `style.gridTemplateColumns` attribute holds the literal `"1fr 1fr"` / `"3fr 1fr"` set by the renderer. **Do NOT assert `getComputedStyle('grid-template-columns')` against the fr-string** — browsers resolve `fr` tracks to px (e.g. `"600px 200px"`), so that assertion always false-fails; assert the inline attribute, or assert the resolved track widths hold the ratio (track0 ≈ 3× track1 within tolerance). Blocks sit **side-by-side** left-to-right into cells (only the section-start/end insert-gaps remain, each full-row `grid-column: 1 / -1`; the inter-block insert-gap interleave is suppressed when gridded, so no inter-block full-row gap forces them to stack), and the effect is visible in builder + preview + published entry (one code path).
2. **Bathrooms: 2 composition.** A `"3-1"` section with a Text "Bathrooms" block + the bound field-value block renders label-left / value-right on one row.
3. **Auto-flow ordering.** Adding/reordering blocks re-flows cells in DOM order; in a gridded section only the section-start/end insert-gaps remain (full-row `grid-column: 1 / -1`) and the **inter-block** insert-gap interleave is **suppressed** (each block is a clean cell that never gets pushed onto its own row), and DnD is served by the grid-agnostic card-midpoint + section-end drop targets.
4. **Drop-zones still work in a gridded section.** Card before/after-midpoint and the section-end dropzone insert correctly inside a gridded section.
5. **Binding-GC recovery.** Create a screen bound to a content-type field, delete that field on the content type, then Save: the screen **saves** (orphan pruned) and the PATCH **200** response body carries the field name(s) in its transient `warnings`/`prunedFields` array, which the editor renders as a **clear message naming the field** — no opaque 400 dead-end. (A stored **field-orphan** screen already `GET`s/loads **today**: `getCustomScreen` returns **200** with the orphan retained via `normalizeCustomScreenDefinitionForRead`'s no-context fallback (`customScreenSchemas.ts:1920`), and `updateCustomScreen`'s base read of the existing bytes at `customScreenService.ts:227` **never 400s** — so the **WRITE-path prune is the recovery mechanism**; a ForRead prune is a separate correctness improvement, not required for this criterion.)
6. **Absent-style byte-stability.** A stored-V4 screen with no `section.style` round-trips byte-identically and its DOM is unchanged (`space-y-4`, no `grid`).
7. **No regressions.** TASK-498/500/503 surfaces intact (presentation-override surface, Bun-free boundary — no `@/ui/pages` import in custom-screens UI, `ScreenDocumentV1` schemaVersion 1 + definition v4, PaletteChip dead-code guard, insertion-targeting/section-CRUD, the 503 block style channel). No new route/RBAC/migration; no schemaVersion bump. The Item-B plumbing is **sink-only** — `normalizeCustomScreenDefinitionForWrite` and `normalizeCustomScreenEditorViewDefinitionV4` keep their existing return types — so the three assistant callers (`actionPlanSchema.ts:843`, `cmsOperationActionMapper.ts:697`, `catalogFamilyBlueprint.ts:198`) and the internal `:1703` caller compile unchanged.
8. **Root-`tsc` clean (mandatory 505-01 gate).** A **root `tsc -p tsconfig.json --noEmit`** (not just `bun --cwd core lint:types`, which misses `tests/` and other packages per the repo typecheck-scope gotcha) passes after 505-01 — catching any accidental return-type ripple into the four out-of-ownership callers above. This gate is REQUIRED in 505-01's closure.

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md`.

### Vitest — Bun-free custom-screens suites (run together, green)

- **`customScreenSchemas`** — `normalizeScreenSectionStyle`: enum coerce (junk `columns`→`"1"`), `columnGap` clamp 0..64, **reject-unknown KEY throws**, prune-empty → `undefined`, **absent `style` byte-stable** through normalize; Ajv `screenSectionV1Schema` accepts a valid `style` and rejects unknown keys.
- **`screenDocumentOps`** — `ScreenSectionPatch` `style` prune (empty→undefined); `reconcileScreenBindings` **prunes block-orphans, preserves valid-binding order, is idempotent, non-destructive** (valid set byte-identical); `reconcileScreenBindings` run over a document *after* `removeScreenBlock`/`removeScreenSection` prunes exactly the now-dead subtree's bindings (helper-level assertion — no delete handler is wired to it in this task; the normalize-time write safety-net is the guarantee, see TASK-505-01 §B2).
- **`ScreenRuntimeRenderer`** — grid class + **inline** `gridTemplateColumns`/`gap` emission per preset (assert the inline `style` attribute — the literal `"3fr 1fr"` — NOT `getComputedStyle`, which resolves `fr` tracks to px); **inter-block** `renderInsertGap` interleave **suppressed** when gridded (builder-mode gridded section renders blocks as clean adjacent cells; only the section-start/end gaps remain, each full-row `grid-column: 1 / -1`, no inter-block full-row gap) **while the new gridded-builder branch still passes per-card `dropTargets` (before/after section-index)** so `cardDropTargets` is defined and card-midpoint DnD survives — assert the card drag-over/drop handlers are wired in the gridded builder section (i.e. NOT the gap-free `:1757-1759` else-branch); **absent-style DOM identity** (still `space-y-4`, no inline grid style).
- **Inspector** — section inspector renders only when `selectedSectionId && !selectedBlockId`; `buildSectionLayoutPatch` reads current `style` then prunes; Columns/gap writes round-trip.
- **Boundary** — the authoring-boundary scan (no `@/ui/pages` import) extended to any new custom-screens UI file.

### Bun — custom-screen route/integration suite (save/error path)

- Section-`style` PATCH round-trips byte-stable; unknown `style` KEY rejected `400` at the route edge with the store untouched.
- **Binding-GC save/error path:** a PATCH whose definition binds a field absent from the content-type schema **saves** (orphan pruned) and the **200** response body carries the **field name(s)** in a transient `warnings`/`prunedFields` array; a genuinely-malformed binding still `400`s (with no field name). Stored-V4 no-style + orphan-free doc round-trips byte-stable. **A PATCH whose `listView.rowTemplate` carries a block-orphan binding (blockId matching no live block in the row-template document) also SAVES (pruned inline in `normalizeCustomScreenListRowTemplate`, not hard-throwing at `:1281`), and a list-row field-orphan binding likewise saves with its field name(s) surfaced in the transient `warnings`/`prunedFields` array — the list-row template is NOT left as a residual hard-400 dead-end.**

### SMOKE (owner mandate — ≥5 DISTINCT real-flow scenarios, assert VISIBLE EFFECT)

Real-input playwright against the running admin (`coderso-a.localhost:5173`), each asserting a **visible effect**, not just a passing call:

1. **Build a 2-col + a 3-1 section** — set one section to `"2"`, another to `"3-1"`; assert the **inline** `style.gridTemplateColumns` holds the literal `1fr 1fr` / `3fr 1fr` (or the resolved track widths hold the ratio within tolerance — `getComputedStyle` returns px, never the fr-string), and that blocks sit **side-by-side in the builder**; then build the **Bathrooms: 2** composition (Text "Bathrooms" + bound value) and assert label-left / value-right.
2. **Auto-flow ordering** — reorder blocks in a gridded section; assert cells re-flow in DOM order (screenshot diff / cell positions).
3. **Insertion / drop-zones in a gridded section** — drop a block via a card-midpoint zone and via the section-end zone; assert it lands at the intended position and that blocks stay **side-by-side in their cells** (only the section-start/end insert-gaps remain, each full-row `grid-column: 1 / -1`; the inter-block insert-gap interleave is suppressed when gridded, so no inter-block gap pushes a block onto its own row).
4. **Binding-GC recovery** — create a screen bound to a field, delete that field on the content type, Save; assert the screen is **STILL saveable** (orphan pruned) and a **clear message naming the field** appears (recovery from the dead-end).
5. **Absent-style byte-stability spot-check** — open a stored screen with no `section.style`; assert the container is `space-y-4` with no inline grid style and the DOM is unchanged from baseline.

**Named guards:** schema-first + reject-unknown (section-style unknown KEY throws / Ajv `additionalProperties:false`); stored-V4 byte-stability (absent `style`, orphan-free bindings round-trip identical); binding-GC determinism + non-destructiveness; Bun-free boundary; PaletteChip dead-code guard; no schemaVersion bump; **sink-only signature discipline** — no return-type widening of `normalizeCustomScreenDefinitionForWrite`/`normalizeCustomScreenEditorViewDefinitionV4`, verified by a **root `tsc -p tsconfig.json --noEmit`** so the three assistant callers + the internal `:1703` caller stay compiling.

---

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md` — a **Section style channel** section (`ScreenSectionStyleV1`, preset enum → fr ratios, auto-flow cell assignment, absent-style byte-stability) + a **Binding-integrity GC** section (orphan reconcile on delete + normalize-time safety net, prune-with-warning field-orphan decision, field-name error surfacing).
- `_docs/_CHANGELOG/` — a new changelog entry listing TASK-505 and every closed leaf (505-01..04), the recovery-path decision, and the deferred residuals (per-block `columnSpan`/`columnStart`, visual ratio picker, custom fr ratios, responsive per-breakpoint columns, nested-section grids).
- `_docs/_TASKS/README.md` — parent + 4 child rows added to **To Do**; **Statistics** To Do +5; move to **Done** at closure.

---

## Deferred (not in this task)

Per-block `columnSpan`/`columnStart`; a visual column-ratio picker / SegmentedControl (v1 uses the plain `EnumRow`); custom (non-preset) fr ratios; responsive per-breakpoint column counts; nested-section grids.

---

## Affected Files (grounded)

- `core/services/customScreens/customScreenSchemas.ts` — new type + `normalizeScreenSectionStyle`; wire into `normalizeScreenSection` + allowlist; Ajv `screenSectionV1Schema` `style` sub-schema; field-orphan prune + field-name error via a mutable sink in `normalizeScreenFieldBinding`/`normalizeScreenFieldBindings` (`:814-852`); **and — the mandatory binding-GC touch-point — `normalizeCustomScreenEditorViewDefinitionV4` (`:1431`): prune block-orphans INLINE (filter `bindings` against the EXISTING `blockIds` set at `:1451`, collecting the dropped `field` names) between the binding-normalize (`:1450`) and the block-orphan assert (`:1452`) so block-orphans are pruned instead of hard-throwing — do NOT import the ops-level `reconcileScreenBindings` (that would invert the schemas←ops layering / create a circular import); mirror the same inline prune in the `...ForRead` twin at `:1483-1484`. **AND add the SAME inline block-orphan prune between `:1280` and `:1281` in the SEPARATE `normalizeCustomScreenListRowTemplate` (`:1273-1283`) + its `...ForRead` twin `normalizeCustomScreenListRowTemplateForRead` (`:1285-1295`)** — whose independent `rowTemplate` binding set (`input.bindings` at `:1280`, asserted at `:1281`, reached on the write path via `normalizeCustomScreenListViewDefinition` `:1359`/`:1763`) is NOT covered by the editor-view prune and otherwise still hard-throws `custom_screen_definition_invalid` on a list-row block-orphan; thread the field-orphan sink into its `:1280` `normalizeScreenFieldBindings` call so list-row field-orphan names also surface. Thread an **optional caller-supplied mutable sink** (NOT a return-shape change) to bubble `removedFieldOrphans`+`removedBlockOrphans` up through `normalizeCustomScreenDefinitionForWrite` (`:1707`, invokes it at `:1764`) to the service and the PATCH 200 body — **both `normalizeCustomScreenEditorViewDefinitionV4` and `normalizeCustomScreenDefinitionForWrite` KEEP their existing return types** (`CustomScreenEditorViewDefinitionV4` / `CustomScreenDefinition`); NO return-type widening is permitted (it would break `actionPlanSchema.ts:843`, `cmsOperationActionMapper.ts:697`, `catalogFamilyBlueprint.ts:198` and the internal `:1703` caller — all outside 505-01's ownership — and fail a root `tsc`)**. (505-01)
- `core/services/customScreens/screenDocumentOps.ts` — `ScreenSectionPatch` gains `"style"`; `reconcileScreenBindings` GC helper (block-orphans) shipped as an **available helper for a future delete-site adopter — delete-site wiring itself is DEFERRED (adopted by no 505 subtask; the normalize-time write safety-net in `customScreenSchemas.ts` is the saveability guarantee)**; it stays in ops and is NOT imported by `customScreenSchemas.ts` (the normalize-time prune is done inline in the schema file to preserve the schemas←ops layering). (505-01)
- `core/services/customScreens/customScreenService.ts` — normalize-time GC safety net in the write path; the **update** call-site (`:239`) passes an **optional mutable sink** object into `normalizeCustomScreenDefinitionForWrite` (whose `CustomScreenDefinition` return type is UNCHANGED) and threads the sink's `removedFieldOrphans` onto the returned record as a transient `warnings`/`prunedFields` field; the **create** call-site (`:177`) passes no sink (call site only). (505-01)
- `core/server/routes/customScreenRoutes.ts` — the transient `warnings`/`prunedFields` ride the PATCH 200 response body; the `custom_screen_definition_invalid` 400 branch stays for structurally-malformed bindings only (no field-name payload). (505-01)
- `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` — `screenSectionColumnTemplate` + grid emission + suppress the per-block insert-gap interleave when gridded. (505-02)
- `core/admin/ui/custom-screens/ScreenBlockInspector.tsx` — section inspector + `buildSectionLayoutPatch`. (505-03)
- `core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx` — render section inspector + enable Inspect for sections. (505-03)
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` — `handlePatchSection` + binding-recovery warning surface. (505-03)

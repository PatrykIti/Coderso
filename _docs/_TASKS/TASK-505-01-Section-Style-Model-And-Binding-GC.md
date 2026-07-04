# TASK-505-01: Section Style Model & Binding GC
# FileName: TASK-505-01-Section-Style-Model-And-Binding-GC.md

**Parent Task:** TASK-505
**Priority:** High
**Category:** Services / Custom Screens / Schema
**Estimated Effort:** Medium
**Dependencies:** TASK-498-02 (`coerceScreenEnum`/`clampScreenInt`, `isRecord`, `rejectUnknownKeys`, per-kind reject-unknown `data` allow-lists), TASK-500 (sections first-class, `ScreenInsertTarget`, `removeScreenSection`/`removeScreenBlock`, `removeScreenBindingsForBlockTree`), TASK-503-01 (`ScreenBlockStyleV1` + `normalizeScreenBlockStyle` + `screenBlockStyleV1Schema` precedent — this subtask mirrors it exactly for sections)
**Status:** ✅ Done
**Completed:** 2026-07-03

---

## Overview

The **model keystone** of TASK-505 — service side only, both items A and B. Nothing renders or wires a control yet; 505-02 (renderer) and 505-03 (editor) consume what this subtask exports.

Two additive channels on the **existing** validated V4 write path — **NO new endpoint/RBAC/migration, NO `schemaVersion` bump** (screen document stays `schemaVersion: 1`, definition stays v4, stored-V4 docs round-trip byte-identically):

1. **Item A — `ScreenSectionStyleV1`** = `{ columns?: preset-enum, columnGap?: clamp }` — a **NEW** `style` channel on `ScreenSectionV1` (naming/precedent = the TASK-503 block `style` channel). A `normalizeScreenSectionStyle` mirroring `normalizeScreenBlockStyle` (coerce-not-throw, reject-unknown KEYS, prune-empty → byte-stable); wired into `normalizeScreenSection`'s allow-list, the Ajv `screenSectionV1Schema`, and `ScreenSectionPatch`; plus the exported `screenSectionColumnTemplate` preset→`grid-template-columns` map consumed by 505-02.
2. **Item B — Binding-integrity GC** — a deterministic, non-destructive `reconcileScreenBindings` helper (prunes bindings whose `blockId` matches no live block), run on block/section delete AND as a normalize-time safety net; plus a **prune-with-warning** field-orphan policy in the write-path binding validator that surfaces the offending field name(s) instead of the opaque throw, so a screen bound to a deleted content-type field is **still saveable** (recovery from the dead-end). **Scope (explicit):** this recovery covers **BINDINGS only** (editor-view `normalizeScreenFieldBindings` + list-view row-template bindings). A deleted content-type field that is ALSO a list-view **column / filter / `defaultSort.field`** remains a **hard-400 by design (unchanged)** — `normalizeCustomScreenListViewDefinition` (ForWrite) still throws `custom_screen_definition_invalid` via `assertFieldAllowed` (`customScreenSchemas.ts:293`, from `normalizeListColumn:1190` / `normalizeListFilter:1218`) and the `defaultSort` field gate (`:1335-1336`). So a field used ONLY as a binding is recovered; a field used as a column/filter/sort is NOT in scope here (that list-view column/filter/sort orphan class is deferred, see Deferred).

**Owned files (sole writer):**
- `core/services/customScreens/customScreenSchemas.ts` — type + normalizer + allow-list + Ajv mirror + preset map export; field-orphan prune + field-name carry in the binding validator; block-orphan safety-net at the write normalizer.
- `core/services/customScreens/screenDocumentOps.ts` — `ScreenSectionPatch` gains `"style"`; `reconcileScreenBindings` GC helper (helper only — delete-**site** wiring is fully DEFERRED, adopted by NO 505 subtask; the B4 write safety-net is the saveability guarantee; see B2).
- `core/services/customScreens/customScreenService.ts` — call-site only: thread the reconcile/warning sink through `normalizeCustomScreenDefinitionForWrite` and surface warnings on the returned record. (The base read-of-existing at `:227` is **already non-fatal** today — `normalizeCustomScreenDefinitionForRead`'s legacy read-repair fallback at `:1920` re-normalizes WITHOUT context so no field-orphan check runs and it returns 200 with the orphan intact; the ForRead silent-prune in B4 is **optional cleanup**, not required for recovery.)
- `core/server/routes/customScreenRoutes.ts` — `mapCustomScreenError` reads optional field-name detail off the error for the residual hard-400 case (malformed only).

**Do NOT** edit `ScreenRuntimeRenderer.tsx` (505-02), the inspector/canvas/editor-page (505-03), README, or any other task file.

---

## Security Contract

**UI/client-state + schema-first document contract extension; the binding-GC runs in the existing definition normalize/save path — no new route/RBAC/endpoint/migration.**

Verified (Read + `grep -an`):

- **Route (existing).** `router.patch("/custom-screens/:id", requirePermission("content:write"), …)` — `customScreenRoutes.ts:115`. The definition-invalid branch — `mapCustomScreenError` `customScreenRoutes.ts:44-49` — maps `custom_screen_definition_invalid` → `ApiError(…, 400)` with a static string today. Item B extends **this** mapping to read an optional field-name detail off the error; it adds **no** route, RBAC bucket, or method. Item A adds only document keys under the existing PATCH envelope.
- **Save/normalize path (existing).** `updateCustomScreen`/`createCustomScreen` → `normalizeCustomScreenDefinitionForWrite` (`customScreenService.ts:177,239`) → `normalizeCustomScreenEditorViewDefinitionV4` → `normalizeScreenFieldBindings` (`customScreenSchemas.ts:1428…1461`, `843`). The GC/reconcile safety-net + field-orphan prune run **here** — no new service surface.
- **Section-style write.** `normalizeScreenSectionStyle` is coerce-not-throw with `rejectUnknownKeys` (`customScreenSchemas.ts:237`) + Ajv `additionalProperties:false`; it persists nothing when absent (byte-stable). No new persisted table/column; `schemaVersion` unchanged.
- **Warnings are transient.** Pruned-field warnings are **computed at normalize time, never persisted** — they ride back on the response record only. Stored-V4 bytes are unaffected (byte-stability preserved).
- **No migration.** Absent `section.style` and orphan-free bindings are the universal existing state; the GC is pure over the in-memory document; stored-V4 docs round-trip byte-identically.

No auth/nonce/HMAC/reCAPTCHA change: the write is already `content:write`-gated with the app's CSRF/session envelope; this task neither loosens nor adds an auth path.

---

## Item A — Section style model (execution-ready shapes)

### A1. Types & constants (`customScreenSchemas.ts`, immediately AFTER the TASK-503 block-style block near `:441-449`)

```ts
// TASK-505-01: section-level style channel — a NEW additive channel on ScreenSectionV1
// (does NOT reuse the dead `layout` field; retyping `layout` to an enum-validated shape
// would THROW on legacy WidgetLayout docs — not byte-safe). Mirrors ScreenBlockStyleV1
// exactly: enums coerce, ints clamp (coerce-not-throw), only unknown KEYS throw.
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

// Preset → grid-template-columns fr-ratio map. EXPORTED as the single source of truth;
// 505-02 renderer emits `gridTemplateColumns: screenSectionColumnTemplate[preset]`.
// Owner's `3/4 : 1/4` = "3-1" → "3fr 1fr"; `1/4 : 3/4` = "1-3" → "1fr 3fr".
export const screenSectionColumnTemplate: Record<ScreenSectionColumnPreset, string> = {
  "1": "1fr", "2": "1fr 1fr", "3": "1fr 1fr 1fr", "4": "1fr 1fr 1fr 1fr",
  "1-1": "1fr 1fr", "1-2": "1fr 2fr", "2-1": "2fr 1fr",
  "1-3": "1fr 3fr", "3-1": "3fr 1fr", "2-3": "2fr 3fr", "3-2": "3fr 2fr",
  "1-1-1": "1fr 1fr 1fr", "1-1-1-1": "1fr 1fr 1fr 1fr",
};
```

`ScreenSectionV1` (the type declaration alongside `ScreenBlockV1` near `:121`) gains `style?: ScreenSectionStyleV1` — a NEW channel; **`layout` untouched**.

### A2. Normalizer (mirror `normalizeScreenBlockStyle` `:471-498` exactly)

```ts
// absent/null/non-record → undefined (no throw, byte-stable); unknown style KEY throws;
// values coerce/clamp; empty ({} / all-junk) prunes to undefined so it NEVER persists.
const normalizeScreenSectionStyle = (value: unknown): ScreenSectionStyleV1 | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) return undefined;
  rejectUnknownKeys(value, screenSectionStyleAllowedKeys); // unknown KEY → "custom_screen_definition_invalid"
  const style: ScreenSectionStyleV1 = {
    ...(value.columns !== undefined
      ? { columns: coerceScreenEnum(value.columns, screenSectionColumnPresets, "1") }
      : {}),
    ...(value.columnGap !== undefined
      ? { columnGap: clampScreenInt(
            value.columnGap,
            SCREEN_SECTION_COLUMN_GAP_CLAMP.min, // fallback = min (junk → 0)
            SCREEN_SECTION_COLUMN_GAP_CLAMP.min,
            SCREEN_SECTION_COLUMN_GAP_CLAMP.max,
          ) }
      : {}),
  };
  return Object.keys(style).length > 0 ? style : undefined;
};
```

- Reuses the existing `coerceScreenEnum` (`:416`) + `clampScreenInt` (`:422`). Junk `columns` coerces to `"1"` (single column = stack → harmless); `{}` / all-junk prunes to `undefined` → never persists for existing screens.

### A3. Wire into `normalizeScreenSection` (`:691-716`)

- **Add `"style"` to the allow-list** (`:693`):
  ```ts
  rejectUnknownKeys(value, ["id", "type", "label", "data", "layout", "visibility", "style", "blocks"]);
  ```
- Compute + **spread-emit-only-when-present** (place beside the existing `layout` spread `:706-708`, BEFORE `blocks`):
  ```ts
  const style = normalizeScreenSectionStyle(value.style);
  // …
  ...(style ? { style } : {}),   // absent → key omitted → byte-identical to today
  ```

### A4. Ajv mirror — `screenSectionV1Schema` (`:2278-2295`)

Add a `screenSectionStyleV1Schema` const (mirror `screenBlockStyleV1Schema` `:2231-2245`, same exported constants → zero drift) and reference it in the section schema `properties`:

```ts
const screenSectionStyleV1Schema = {
  type: "object",
  properties: {
    columns: { enum: screenSectionColumnPresets },
    columnGap: {
      type: "integer",
      minimum: SCREEN_SECTION_COLUMN_GAP_CLAMP.min,
      maximum: SCREEN_SECTION_COLUMN_GAP_CLAMP.max,
    },
  },
  additionalProperties: false, // reject-unknown at the route edge
} as const;

// in screenSectionV1Schema.properties (leave required + additionalProperties:false as-is):
  style: screenSectionStyleV1Schema,
```

### A5. `ScreenSectionPatch` (`screenDocumentOps.ts:30-32`)

```ts
export type ScreenSectionPatch = Partial<
  Pick<ScreenSectionV1, "label" | "data" | "layout" | "visibility" | "style">
>;
```

`updateScreenSection` (`screenDocumentOps.ts:631-634`) already spreads the patch verbatim — no body change needed; the new key rides through. The renderer emission + the `screenSectionColumnTemplate` **consumption** is 505-02; the inspector `buildSectionLayoutPatch` + `handlePatchSection` is 505-03. This subtask only ships the shapes.

---

## Item B — Binding-integrity GC (execution-ready shapes)

### Verified current behavior (the dead-end)

- `normalizeScreenFieldBinding` (`customScreenSchemas.ts:825-829`): `fieldRoot = field.split(".")[0]`; `allowedFieldRoots = getAllowedBindingFieldRoots(context)` (`:826`, `:274`); **throws `custom_screen_definition_invalid`** when `allowedFieldRoots && !allowedFieldRoots.has(fieldRoot)` (`:827-829`). Delete a content-type field → every screen still binding it fails to save.
- The throw is **NOT fatal on READ** (empirically verified). The V4 ForRead validator *does* throw at `:1483`/`:827-829` on a field-orphan when a `contentType` context is passed, but `normalizeCustomScreenDefinitionForRead`'s multi-layer read-repair **swallows** it: the V4 try/catch (`:1783-1796`) falls through, `normalizeCustomScreenDefinition(input, context)` (`:1801`) throws again and is caught (`:1802`), and the final fallback `normalizeCustomScreenDefinition(input)` (`:1920`) re-normalizes **WITHOUT context** → `getAllowedBindingFieldRoots` returns `null` → no field-orphan check → the read returns **200 with the orphan binding INTACT**. The list-view read is likewise non-fatal via its own try/catch (`normalizeCustomScreenListRowTemplateForRead` `:1290-1294`). Consequently `getCustomScreen`→`mapRow`→`normalizeCustomScreenDefinitionForRead(…, { contentType })` (`customScreenService.ts:106,167`) returns 200, the editor **loads** the broken screen, and `updateCustomScreen`'s base read `baseDefinition = normalizeCustomScreenDefinitionForRead(…, { contentType })` at `customScreenService.ts:227` (BEFORE the write normalizer at `:239`) **succeeds** — so the write-path prune at `:239` **IS reachable**. The dead-end is therefore **WRITE-ONLY**: only the write normalizer (`normalizeCustomScreenEditorViewDefinitionV4` `:1431`, invoked WITH context) hard-throws on a field-orphan, blocking Save. The write-path prune (B3/B4) is the load-bearing fix; no read change is required for recovery (see B4).
- A SECOND write-path binding validator exists: `normalizeCustomScreenListRowTemplate` (`:1273-1283`) validates the list-view row template's bindings (`:1280`) + block-orphan gate (`:1281`); it hard-throws on the same field-/block-orphans, so the list-view row template is an independent dead-end (see B4).
- The block-orphan gate in the V4 write path — `normalizeCustomScreenEditorViewDefinitionV4` (`:1428…`), `blockIds = collectScreenBlockIds(document)` (schemas-local Set variant), `if (blockIds.size > 0 && bindings.some((b) => !blockIds.has(b.blockId))) throw` (`:1451-1453`) — is currently **fatal**, not a prune.
- `removeScreenBindingsForBlockTree` (`screenDocumentOps.ts:996-1003`) only drops bindings whose `blockId` is in the **removed subtree**; a binding orphaned some other way survives.
- The route (`customScreenRoutes.ts:44-49`) maps the throw to a **static 400 with no field name** → user cannot diagnose.

### B1. Reconcile/GC helper (`screenDocumentOps.ts`, near `removeScreenBindingsForBlockTree` `:996`)

```ts
export type ScreenBindingReconcileResult = {
  bindings: ScreenFieldBinding[];   // pruned, source order preserved (deterministic)
  removedBlockOrphans: string[];    // binding.field[] whose blockId had no live block
};

// Prune bindings whose blockId matches NO live block in the document.
// Non-destructive to valid bindings; deterministic (stable order); pure; idempotent.
export function reconcileScreenBindings(
  document: ScreenDocumentV1,
  bindings: ScreenFieldBinding[]
): ScreenBindingReconcileResult {
  // ops-local collectScreenBlockIds(block: ScreenBlockV1): string[]  (screenDocumentOps.ts:784)
  const liveIds = new Set(
    document.sections.flatMap((s) => s.blocks.flatMap((b) => collectScreenBlockIds(b)))
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

> NOTE: two same-named `collectScreenBlockIds` exist — `screenDocumentOps.ts:784` `(block) => string[]` (use THIS one here), and a schemas-local `(document) => Set<string>`. Do not cross them.

### B2. Reconcile helper scope (delete-**site** wiring is deferred)

This subtask **defines** `reconcileScreenBindings` (B1) and relies on the **normalize-time write safety-net** (B4) as the actual guarantee that orphaned bindings are pruned on Save — regardless of which caller performed the delete. It does **NOT** wire reconcile at any delete call site, because the delete FUNCTIONS in this owned file — `removeScreenSection` (`:702`) and `removeScreenBlock` (`:771`) — do **not** touch bindings at all (they return `{ document, removed }`; binding pruning is done by callers). The real delete→prune call sites are `CustomScreenEditorPage.tsx:498,546` (OFF-LIMITS — owned by 505-03) and `services/assistant/actionExecutorService.ts:1701,4437` (not in any 505 owned-files list). So: keep `removeScreenBindingsForBlockTree` for its callers (non-breaking); `reconcileScreenBindings` is the broader superset (prunes ANY no-live-block binding, not just an explicitly-fed removed subtree) that callers MAY adopt. **Delete-site adoption is fully DEFERRED — NO subtask in TASK-505 wires `reconcileScreenBindings` at a delete call site.** 505-03 does NOT adopt it (its editor recovery uses a client-side `detectScreenBindingOrphans` + a bindings-only `.filter`, not `reconcileScreenBindings`), and the assistant `actionExecutorService` call sites (`:1701,4437`) are a **separate, later touch** out of every 505 owned-files list. `reconcileScreenBindings` ships in this subtask as an available helper (tested at the helper level) for a future adopter. What this subtask actually guarantees on Save is the **B4 normalize-time write safety-net** (which prunes on every write no matter which delete handler ran) — that is the sole saveability guarantee; do NOT claim any delete-site wiring is delivered.

### B3. Field-orphan prune-with-warning (`customScreenSchemas.ts` binding validator)

Change the field-orphan case from **fatal throw** to **collect + prune** whenever a sink is threaded. The WRITE path threads a **warning-carrying** sink (surfaced to the user, B5). The **ForRead** variants MAY thread a **discarded** sink to prune **silently** as **OPTIONAL cleanup** (so the loaded editor doesn't carry a stale orphan that reappears until the next Save) — this is **NOT** required for recovery, since the read is already non-fatal (see B4). Do NOT change the arity for existing callers that don't pass it; the bare `throw` fallback below survives only for any caller that passes NO sink (deep internal validators with no recovery affordance). Genuinely-malformed shapes still throw regardless.

```ts
// per-item normalizer (:814) — add optional sink; genuinely-malformed bindings STILL throw.
const normalizeScreenFieldBinding = (
  value, index, context,
  sink?: { removedFieldOrphans: string[] }
): ScreenFieldBinding | null => {          // null = "prune me"
  if (!isRecord(value)) throw new Error("custom_screen_definition_invalid"); // malformed → 400
  rejectUnknownKeys(value, ["id","blockId","widgetId","propPath","source","field","mode"]);
  const blockId = normalizeText(value.blockId) ?? normalizeText(value.widgetId);
  if (!blockId) throw new Error("custom_screen_definition_invalid");           // malformed → 400
  // …propPath/field/fieldRoot as today…
  const allowedFieldRoots = getAllowedBindingFieldRoots(context);
  if (allowedFieldRoots && !allowedFieldRoots.has(fieldRoot)) {
    if (sink) { sink.removedFieldOrphans.push(field); return null; }  // PRUNE + record (write=warn / ForRead=discarded sink, both non-fatal)
    throw new Error("custom_screen_definition_invalid");              // only when NO sink is threaded
  }
  // …source/mode checks (still throw on bad source/mode)…
  return { id, blockId, propPath, source: "entry", field, mode };
};

// array-level (:843) — accept + thread the sink, drop nulls:
export function normalizeScreenFieldBindings(
  value, context,
  sink?: { removedFieldOrphans: string[] }
): ScreenFieldBinding[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("custom_screen_definition_invalid");
  return normalizeUniqueIds(
    value
      .map((item, index) => normalizeScreenFieldBinding(item, index, context, sink))
      .filter((b): b is ScreenFieldBinding => b !== null)
  );
}
```

### B4. Write-path safety net — ONE mechanism: an optional mutable sink threaded TOP-DOWN (no validator return-shape change)

The **only** warning-propagation mechanism is a single OPTIONAL mutable sink object, created by the caller (`customScreenService.ts`, B5) and threaded **top-down** through `normalizeCustomScreenDefinitionForWrite` into BOTH validated sub-paths. **NO `normalize*` validator changes its return type** — every one still returns exactly its current shape; orphan names accumulate by side-effect into the shared sink (an out-param), which the service reads AFTER the call:

```ts
type ScreenBindingWarningSink = { removedFieldOrphans: string[]; removedBlockOrphans: string[] };
```

- **`normalizeCustomScreenDefinitionForWrite` (`:1707`) gains an optional `sink?: ScreenBindingWarningSink` param** and passes the SAME object down **both** branches at `:1763-1764`: `normalizeCustomScreenListViewDefinition(rawInput.listView, context, sink)` **and** `normalizeCustomScreenEditorViewDefinitionV4(rawInput.editorView, context, sink)`. It still returns `CustomScreenDefinition` unchanged — the sink is the out-param.
- **Editor-view path.** `normalizeCustomScreenEditorViewDefinitionV4` (`:1431`) gains a trailing `sink?` and threads it into `normalizeScreenFieldBindings(input.bindings, context, sink)` (field-orphans → `sink.removedFieldOrphans`, per B3). Replace the **fatal** block-orphan check (`:1451-1453`) with an **inline prune** using the already-computed schemas-local `blockIds` Set (`const blockIds = collectScreenBlockIds(document)` `:1451`): keep `bindings.filter((b) => blockIds.size === 0 || blockIds.has(b.blockId))` and, **when `sink` is present**, push each dropped binding's `field` to `sink.removedBlockOrphans`. There is **no** `reconcile` object in this scope — the block-orphan prune is an inline `.filter`, **not** a `reconcileScreenBindings` call. Do this **in-file** — the schemas write path must **NOT** import `reconcileScreenBindings` from `screenDocumentOps.ts`: that file already imports FROM `customScreenSchemas.ts` (`screenDocumentOps.ts:1-8`), so importing an ops function back would create a `schemas → ops → schemas` cycle. `reconcileScreenBindings` (B1) stays reserved for ops-file / editor-page callers (which have no such cycle).
- **List-view row-template write path (SECOND binding dead-end — must be covered too).** Thread the **same** shared `sink` down this path (not a separate `rowSink`): `normalizeCustomScreenListViewDefinition` (`:1297`) gains a trailing `sink?` and forwards it into its `normalizeCustomScreenListRowTemplate(input.rowTemplate, context, sink)` call (`:1359`); `normalizeCustomScreenListRowTemplate` (`:1273-1283`) in turn gains `sink?` and threads it into `normalizeScreenFieldBindings(input.bindings, context, sink)` (`:1280`, field-orphans → `sink.removedFieldOrphans`) and **replaces** its block-orphan gate `assertScreenFieldBindingsTargetDocument(document, bindings)` (`:1281`, throws at `:1267-1270`) with an **inline** block-orphan prune using its already-computed schemas-local Set (`collectScreenDocumentBlockIds(document)` `:1267`), pushing each dropped `field` to `sink.removedBlockOrphans` — again with **no** import from `screenDocumentOps.ts`. Without this, a screen whose LIST-VIEW row template binds a deleted content-type field stays permanently un-saveable and Item B is only half addressed.
- **Callers that pass NO sink keep the throw (preserved on write-internals / swallowed on read).** The base `normalizeCustomScreenDefinition` (editor `:1703`, list-view `:1702`/`:1693`) and every `*ForRead` variant call these validators with **no `sink`** → the `if (sink) …` prune branch (B3) is skipped and the bare `throw` fires. This matters because `normalizeCustomScreenEditorViewDefinitionV4` and `normalizeCustomScreenListViewDefinition`/`normalizeCustomScreenListRowTemplate` are **SHARED** across the read/fallback path (`:1702-1703`, `normalizeCustomScreenListRowTemplateForRead` `:1291`) and the write path (`:1763-1764`); the optional `sink?` param leaves the no-sink read/fallback behavior byte-identical (throw fires, then is **swallowed** on read by `normalizeCustomScreenDefinitionForRead`'s no-context fallback `:1920`, or by the list-view ForRead try/catch `:1290-1294`). **OPTIONAL cleanup (not required):** the ForRead variants MAY instead pass a **discard** sink (a fresh `ScreenBindingWarningSink` whose contents are thrown away) to prune orphans **silently** — see the read bullet below.
- **Read-of-existing is ALREADY non-fatal — no read change is REQUIRED for recovery (the earlier "read is fatal / GET 400s" claim was wrong; verified false).** The read path passes a content-type context — `getCustomScreen`→`mapRow`→`normalizeCustomScreenDefinitionForRead(…, { contentType })` (`customScreenService.ts:106,167`) and `updateCustomScreen`'s `baseDefinition = normalizeCustomScreenDefinitionForRead({ definition: existing.definition, schemaVersion: existing.schemaVersion }, { contentType })` at `customScreenService.ts:227` (before the write normalizer at `:239`) — and the inner V4 validator *does* throw at `:827-829` on a field-orphan. **But** `normalizeCustomScreenDefinitionForRead` swallows that throw: the V4 try/catch (`:1783-1796`) and the `normalizeCustomScreenDefinition(input, context)` catch (`:1801-1802`) both fall through to the final fallback `normalizeCustomScreenDefinition(input)` (`:1920`), which re-normalizes **WITHOUT context** → no field-orphan check → returns **200 with the orphan retained**. So today: (1) `GET /custom-screens/:id` returns 200 and the editor (`getCustomScreenCached`, `CustomScreenEditorPage.tsx:312`) loads the broken screen; (2) the `:227` base read **succeeds**, so the PATCH proceeds to the write normalizer at `:239` and the B4 write-path prune **IS reached**. Recovery happens **on WRITE** (the reachable path), not on read. **OPTIONAL cleanup (not required):** you MAY additionally make `normalizeCustomScreenEditorViewDefinitionV4ForRead` (`:1463…`) and the list-view ForRead variant (`normalizeCustomScreenListRowTemplateForRead` `:1285-1295`) prune field-/block-orphans **silently** by passing a **discard** `ScreenBindingWarningSink` whose contents are ignored (no warning surfaced on read) so the loaded editor doesn't carry a stale orphan binding that reappears until the next Save — this is cleanup only, NOT the recovery mechanism. Genuinely-malformed bindings (non-record, missing `blockId`, bad `source`/`mode`, unknown KEY) still throw on both read and write paths.

### B5. Warning surfacing to the route (transient, non-persisted)

There is **no return-shape carry**: the service (`customScreenService.ts:177,239`) **creates** the sink (`{ removedFieldOrphans: [], removedBlockOrphans: [] }`), passes it into `normalizeCustomScreenDefinitionForWrite(input, context, sink)`, and — AFTER the call returns the normal `CustomScreenDefinition` — reads the sink and maps its two accumulated lists to `CustomScreenBindingWarning[]` (field names → `code: "binding_field_removed"`, block-orphan field names → `code: "binding_block_removed"`; each `fields[]` de-duped, source order), attaching them to the returned record as a transient field (NOT stored). **`CustomScreenBindingWarning` is DECLARED + EXPORTED from `core/services/customScreens/customScreenSchemas.ts`** (this subtask's owned file) so consumers can import it: 505-03 imports `type CustomScreenBindingWarning` from there (the UI-component files via `../../../services/customScreens/customScreenSchemas`, the admin client via its own two-level `../../services/customScreens/customScreenSchemas`). `customScreenService.ts` only re-exposes it on the returned record — it does **not** re-declare the type.

```ts
// EXPORTED from core/services/customScreens/customScreenSchemas.ts (single declaring file):
export type CustomScreenBindingWarning = {
  code: "binding_field_removed" | "binding_block_removed";
  fields: string[]; // offending content-type field name(s), source order, de-duped
};
// service returns: { ...screen, warnings?: CustomScreenBindingWarning[] }  // transient
```

Because field-/block-orphans are now **pruned**, the PATCH **SUCCEEDS** and the field names ride back as a **warning** (200), not a hard 400. The 505-03 editor surfaces it ("Removed bindings for deleted field(s): bathrooms"). The hard 400 remains ONLY for genuinely-malformed input (non-record binding, missing `blockId`, bad `source`/`mode`, unknown KEY).

### B6. Residual field-name on the hard-400 DETAIL (`customScreenRoutes.ts:44-49`)

For the residual malformed-input 400, the ApiError **user-message string stays byte-frozen** (`"Custom screen definition is invalid"`) — the offending field name(s), WHEN a residual hard-fail happens to know one, ride the response **`details`** (`{ fields }`, `ApiError`'s 4th ctor arg `details`, `errorHandler.ts:14`, serialized as `error.details`, `errorHandler.ts:29`), NOT the message string. Do **NOT** enrich the message: `mapCustomScreenError` switches on the exact thrown `error.message` and the pinned `tests/integration/routes/customScreensRoutes.test.ts:103-108` asserts the static string; mutating it would break both.

```ts
// lightweight carrier (throw where a field name is known):
export class CustomScreenDefinitionError extends Error {
  constructor(public fields?: string[]) { super("custom_screen_definition_invalid"); }
}
// mapCustomScreenError case "custom_screen_definition_invalid":
const fields = error instanceof CustomScreenDefinitionError ? error.fields : undefined;
return new ApiError(
  "custom_screen_definition_invalid",
  "Custom screen definition is invalid", // BYTE-FROZEN user message — field names ride error.details, never this string
  400,
  fields?.length ? { fields } : undefined // 4th ctor arg `details` → serialized as error.details.fields; offending field name(s) only
);
```

`mapCustomScreenError` still keys on the thrown `error.message` (`"custom_screen_definition_invalid"`), so the subclass matches the existing branch and the returned user-message string is **byte-identical to today** — the pinned `customScreensRoutes.test.ts:103-108` test stays green with no edit. The field name(s) ride `ApiError.details.fields` (the `ApiError` ctor's 4th arg is `details`, `errorHandler.ts:14`, serialized as `error.details`, `errorHandler.ts:29` — NOT `detail`), which **505-03 reads (`err.details.fields`)** for its error `Alert` — never `err.message`. In practice genuinely-malformed bindings carry no field name, so the details are usually absent.

### Decision (recommended, document in closure)

A **missing-content-type-field** binding is **pruned + flagged** (recoverable warning, save succeeds), NOT a hard 400 — on **both** the editor-view and list-view row-template write paths. A **block-orphaned** binding is likewise pruned. The dead-end is **WRITE-ONLY**: the stored-orphan screen already **loads** (`GET`/editor return 200 with the orphan retained — `normalizeCustomScreenDefinitionForRead`'s no-context fallback at `:1920`) and `updateCustomScreen`'s base read-of-existing (`:227`) already succeeds, so the write-path prune runs and recovers the screen on Save. Optionally the ForRead variants may prune the same orphans silently so the loaded editor carries no stale binding. This gives the owner a real recovery path from the previously-permanent (write-side) **binding** dead-end. Only genuinely-malformed binding shapes keep the hard 400 (now with field-name detail when known).

**Scope boundary (document in closure):** the recovery is **BINDING-scoped only**. A deleted content-type field that is ALSO referenced as a list-view **column / filter / `defaultSort.field`** stays a **hard-400 by design (unchanged)** — `normalizeCustomScreenListViewDefinition` (ForWrite path) throws via `assertFieldAllowed` (`customScreenSchemas.ts:293`) for columns/filters and the `defaultSort` field gate (`:1335-1336`), and those are **NOT** touched by this subtask. Therefore the "screen is saveable after deleting a bound field" guarantee holds **only** when the deleted field is used purely as a binding; if it is also a column/filter/sort, Save still 400s (that column/filter/sort orphan class is out of scope — see Deferred). Do NOT claim a universal recovery in the closure.

### Determinism / non-destructiveness guards (named)

- `reconcileScreenBindings` is **pure**, **preserves source order** of survivors, touches **only** no-live-block bindings, is **idempotent** (twice = once), and valid bindings are **byte-identical** through the pass.
- Field-orphan prune is deterministic + order-preserving; a fully-valid binding set is unchanged (byte-stable) whether or not a sink is passed.

---

## Acceptance Criteria (this subtask)

1. `normalizeScreenSectionStyle`: enum coerce (junk `columns` → `"1"`), `columnGap` clamp 0..64 (float floors, over-max → 64, junk → 0), **reject-unknown KEY throws**, prune-empty → `undefined`, absent `style` byte-stable through `normalizeScreenSection`.
2. `screenSectionColumnTemplate` exports all 13 presets → correct fr strings (`"3-1"` → `"3fr 1fr"`).
3. Ajv `screenSectionV1Schema` accepts a valid `style`, rejects an unknown `style` key and out-of-range `columnGap` (`additionalProperties:false`).
4. `ScreenSectionPatch` carries `style`; `updateScreenSection` round-trips it; an empty style patch (from 505-03) prunes to absent.
5. `reconcileScreenBindings` prunes block-orphans, preserves valid-binding order, is idempotent + non-destructive; the **normalize-time write safety-net** (B4) prunes any no-live-block binding on Save regardless of which caller ran the delete (delete-**site** wiring itself is fully DEFERRED — adopted by NO 505 subtask; a later `actionExecutorService`/editor touch — see B2, not asserted here).
6. Bind a field (and reference it **only** as a binding — NOT as a list-view column/filter/`defaultSort.field`) → delete it on the content type → a subsequent write (editor-view **or** list-view row template) **succeeds (200)** with the orphan pruned from the stored bytes and the field name(s) returned as a warning. **Scope caveat:** if the deleted field is ALSO a list-view column/filter/sort, Save still returns **400 by design** (`normalizeCustomScreenListViewDefinition` `assertFieldAllowed`/`defaultSort` gate is unchanged — out of scope, see Deferred); this criterion asserts recovery for the **binding-only** case, not the column/filter/sort case. The stored-orphan screen **already** `GET`s/loads 200 today (read is non-fatal — the orphan is retained on read via the no-context fallback) and `updateCustomScreen`'s base read at `:227` **already** succeeds, so the write prune is reachable — **do NOT assert a pre-fix GET-400** (there is none); assert GET already returns 200. A genuinely-malformed binding still `400`s (now with field-name detail when known).
7. Stored-V4 no-style + orphan-free doc round-trips **byte-identically**; no `schemaVersion` bump; TASK-498/500/503 surfaces intact (Bun-free boundary, PaletteChip dead-code guard, block `style` channel).

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md`.

### Vitest — Bun-free custom-screens suites (run together, green)

- **`customScreenSchemas` (section style):** `normalizeScreenSectionStyle` — enum coerce (junk `columns` → `"1"`), `columnGap` clamp/floor 0..64, **reject-unknown KEY throws `custom_screen_definition_invalid`**, prune-empty → `undefined`, absent `style` byte-stable through `normalizeScreenSection`; `screenSectionColumnTemplate` = expected fr strings for all 13 presets; Ajv `screenSectionV1Schema` accepts valid `style`, rejects unknown key + out-of-range gap.
- **`customScreenSchemas` (binding GC):** the editor-view **and** list-view row-template write-path binding validators each prune a field-orphan (with a `context` whose content type lacks the field) and record the field name in the sink; the list-view block-orphan gate prunes (not throws); a fully-valid binding set is unchanged (byte-stable) with/without a sink; malformed binding (non-record / no `blockId`) still throws; a stored-orphan doc **already** READS/loads non-fatally with NO read change (`normalizeCustomScreenDefinitionForRead` returns 200 with the orphan retained via its no-context fallback `:1920`) and `updateCustomScreen`'s base read (`:227`) does not throw; **if** the OPTIONAL ForRead silent-prune is implemented, additionally assert the loaded doc carries no orphan binding.
- **`screenDocumentOps`:** `ScreenSectionPatch` `style` round-trip + empty-prune; `reconcileScreenBindings` prunes block-orphans, preserves valid-binding order, is **idempotent + non-destructive** (valid set byte-identical); `reconcileScreenBindings` run over a document *after* `removeScreenBlock`/`removeScreenSection` prunes exactly the now-dead subtree's bindings (helper-level assertion — no delete handler is wired in this subtask; see B2); `removeScreenBindingsForBlockTree` still behaves for its callers.
- **Boundary guard:** no `@/ui/pages` import introduced (this subtask touches services only — assert the authoring-boundary scan stays green).

### Bun — custom-screen route/integration suite (save/error path — this subtask's direct concern)

- Section-`style` PATCH round-trips **byte-stable**; an unknown `style` KEY is rejected `400` at the route edge with the store untouched; out-of-range `columnGap` rejected `400`.
- **Binding-GC save/error path:** a PATCH whose definition binds a field absent from the content-type `context` schema **saves (200)** — orphan pruned, stored bindings no longer contain it — for **both** an editor-view binding and a list-view row-template binding, and the response carries the **field name(s)** (warning/detail); crucially, a screen whose STORED bytes already reference a since-deleted field **already `GET`s 200 / loads** today (read is non-fatal, orphan retained) so `updateCustomScreen`'s `:227` base read does not 400 and Save is reachable — **do NOT assert a pre-fix GET-400** (there is none); the recovery is exercised on the **WRITE** (PATCH 200, stored bytes no longer contain the binding, field name surfaced); a genuinely-malformed binding still `400`s with the field-name detail when known. Stored-V4 no-style + orphan-free doc round-trips byte-stable (no warning, bytes identical).
- **Named guards asserted:** schema-first + reject-unknown (unknown `style` KEY throws / Ajv `additionalProperties:false`); stored-V4 byte-stability (absent `style`, orphan-free bindings round-trip identical); binding-GC determinism + non-destructiveness; warnings are transient (not re-read from the store); no `schemaVersion` bump.

### SMOKE

Full ≥5-scenario real-flow playwright smoke (2-col + 3-1 visible grid, Bathrooms:2 composition, auto-flow ordering, drop-zones-in-grid, binding-GC recovery naming the field, absent-style byte-stability) requires the 505-02 renderer + 505-03 editor and is executed at **TASK-505-04 closure** against the running admin (`coderso-a.localhost:5173`). This model keystone renders nothing; its live-observable slice — the **binding-GC recovery** (bind a field → delete it on the content type → Save still succeeds, field name surfaced) — is exercised here via the Bun route/integration save/error path above and re-asserted with a visible message in the 505-04 smoke.

---

## Deferred (not in this task)

**List-view column/filter/`defaultSort.field` field-orphan recovery** — a deleted content-type field that is also a list-view column, filter, or default sort still hard-400s on Save via `normalizeCustomScreenListViewDefinition`'s `assertFieldAllowed` (`customScreenSchemas.ts:293`) / `defaultSort` gate (`:1335-1336`); this subtask GCs **bindings only** and leaves that column/filter/sort orphan class as a hard-400 by design (a later prune-with-warning could fold it in). Per-block `columnSpan`/`columnStart` (a later `ScreenBlockStyleV1.span`/`start`); custom (non-preset) fr ratios; responsive per-breakpoint column counts; nested-section grids. All renderer/editor/UI work (grid emission, section inspector, binding-recovery affordance) is 505-02/505-03.

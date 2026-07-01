# TASK-498-03: Related-List Runtime + Entry Rendering
# FileName: TASK-498-03-Related-List-Runtime-And-Entry-Rendering.md

**Priority:** Medium
**Category:** Custom Screens / Screen Runtime / Relations / Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-498-02 (kind set + `related-list` factory/inspector)
**Status:** ⏳ To Do
**Parent Task:** TASK-498

---

## Overview

Add the one genuinely new runtime capability — resolving a relation field's target-entry
IDs into real related entries — and render the `related-list` block plus every other new
data kind in the **entry** and **published** surfaces. Relation fields store arrays of
target-entry IDs (`xFieldConfig.relation.target` + multiple → array,
`_docs/CONTENT_TYPES_SPEC.md:71-72, 92`); the screen runtime currently has no resolver for
this — `readBindingPathValue` only walks a single entry's own `values`
(`core/services/utils/bindingPath.ts`), and the existing `relationTargets` prop on
`ScreenRuntimeRenderer` (`:27, :188, :432`) only labels a single relation's TYPE via
`FieldRenderer`, it does not fetch related entries.

- **Goal:** a `related-list` block resolves `relation field value (ID[]) → RelatedEntrySummary[]`
  and renders checklist/activity/cards variants in entry/preview; the renderer stays pure
  (host precomputes); the entry-view + published list/entry surfaces render every new kind;
  inline write-back is unaffected (still `title`/`slug`/schema fields only).
- **Owning module/service:**
  new resolver in `core/services/customScreens/` (e.g. `relatedEntryResolver.ts`), reusing
  the existing admin entries read `listEntriesCached`
  (`core/admin/services/entriesClient.ts:253`) — the same entries-read that `FieldRenderer`
  already uses for relation pickers (`core/admin/ui/entries/FieldRenderer.tsx:13,:79`) under
  the existing session auth + RBAC;
  `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` (new `relatedEntries` prop +
  `related-list` render branch);
  host wiring in `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx`,
  `CustomScreenEntryEditor.tsx`, and `CustomScreenPreview.tsx` /
  `CustomScreenWorkspacePreviewDialog.tsx`. **NOT** `CustomScreenEntriesTable.tsx` — it
  renders a NATIVE HTML table (`resolveEntryColumnValue` per column, `:35,:178`), is not a
  `ScreenRuntimeRenderer` host, and the published list is out of scope for related-list (see
  B3.4 / C).
- **Source-of-truth / anchors:** `ScreenRuntimeRenderer` props `:20-39`, `relationTargets`
  usage `:27, :188, :432`, render branches `:230-528`, section render `:539-608`;
  `CustomScreenEntryCanvas` (`mode="entry"` feed `:38-56`); `CustomScreenEntryEditor`
  `relationTargets` load `:372` + renderer use `:1231`/`:1237` (editable `canEditInScreen` true)
  AND `:1253` (read-only `CustomScreenPreview` fallback, `canEditInScreen` false `:389`);
  `ContentField.relation.target`
  (`SchemaBuilder.tsx:176`); prototype related variants
  (`CustomScreenEntryEditorPreview.tsx:195-212` checklist, `:214-235` activity) + builder
  skeleton (`CustomScreenEditorPreview.tsx:164-183`).
- **Out of scope:** No write-back from related-list (display-only). No new block kinds. No
  schema-version bump. No change to the binding allow-list.

---

## Security Contract

**Read-only relation resolution that REUSES the existing admin entries-read endpoint + its
auth — a genuinely new fetch, not a no-op pass-through.** Resolving related ENTRIES is new to
the screen runtime (nothing fetches related entries today — `relationTargets` is a
content-TYPE list, built from `getCachedContentTypes()`/`listContentTypesCached`
[`CustomScreenEntryEditor.tsx:372-374,:696`], so it cannot be the read to reuse). The
resolver looks up related entries by the relation field's target slug + the ID[] stored on
the current entry, and it MUST reuse the **existing admin entries read**
`listEntriesCached(targetSlug, …)` (`core/admin/services/entriesClient.ts:253`) — the same
endpoint + the same session auth + RBAC that `FieldRenderer` already uses for relation
pickers (`FieldRenderer.tsx:79`). **No new public endpoint, no new write path, no new
permission, no RBAC change** — the fetch is new but the endpoint/auth surface is the existing
entries-read. Strict reject-unknown applies to the `related-list` `data` shape (already
enforced by TASK-498-02's `normalizeScreenBlockData`). The relation `field` root is already
allow-listed by `normalizeScreenFieldBinding`.

- **Preferred (host-precomputed):** resolve in the admin host using `listEntriesCached`
  (the existing entries-read endpoint), pass results in as a prop — the renderer stays a pure
  function and **no route is touched** (the only new thing is a read against the existing
  entries endpoint).
- **Alternative (server-side):** if resolution is added to `customScreenService`, mark the
  endpoint `internal`, session-authenticated, RBAC-gated to the entries-read permission,
  reject-unknown on inputs (screenId/entryId/blockId/relation field), and rate-limit under
  the existing admin read bucket. State this explicitly if taken.

---

## Implementation Pseudocode

### B3.1 — relation resolver

```ts
// core/services/customScreens/relatedEntryResolver.ts (or reuse customScreenService)
export type RelatedEntrySummary = {
  id: string;
  title: string;
  status?: string;
  displayValue?: string;        // value of displayField, stringified for the row
  updatedAt?: string;           // row.updatedAt (top-level on EntrySummary, entriesClient.ts:23-24);
                                // feeds the activity variant's "time" column (B3.3) — without it the
                                // activity feed has no time source and would fabricate/placeholder it
};

export async function resolveRelatedEntries(input: {
  ids: string[] | string | null | undefined;  // relation value on the current entry: ID[] for a
                                               // multiple relation, a bare ID string for a single
                                               // relation (relation.multiple falsy), or null/empty
  target: string;              // content-type slug — DERIVED BY THE HOST from the bound relation
                               // field's relation.target (the same field the `ids` come from);
                               // stored data.target is only a fallback. See B3.4 invariant.
  displayField?: string;       // optional field to surface per row
  limit?: number;              // clamp rows
  // injected read dependency = the EXISTING admin entries read. The adapter is the PLAIN
  // `listEntriesCached(target)` reuse — it takes NO id argument and returns ALL entries of the
  // target type (entriesClient.ts:253-268), NOT the related subset; the FILTER + ORDER happens
  // in this resolver (below), never in the adapter. Rows are EntrySummary-shaped
  // (entriesClient.ts:14-28): id/title/slug/status are TOP-LEVEL, SCHEMA fields live under
  // `.data` (Record<string,unknown>).
  readEntries: (target: string) => Promise<Array<Record<string, unknown>>>;
}): Promise<RelatedEntrySummary[]> {
  // 1. COERCE the relation value to an ID[] FIRST. A single (relation.multiple falsy) relation
  //    arrives as a bare string ID, not an array — bailing on `!Array.isArray` would render the
  //    empty state for a perfectly valid single relation. (FieldRenderer.tsx:100-104 coerces the
  //    same way.) null/undefined/"" → [].
  const ids = (Array.isArray(input.ids) ? input.ids : input.ids == null ? [] : [input.ids])
    .map(String)
    .filter((id) => id.length > 0);
  if (!input.target || ids.length === 0) return [];
  const limited = ids.slice(0, Math.max(0, input.limit ?? ids.length));
  // 2. FETCH the whole target list, then FILTER to the requested ids + PRESERVE the relation's
  //    stored order. listEntriesCached returns EVERY entry of the type (updatedAt-desc etc), so
  //    the resolver MUST index rows by id and walk `limited` — do NOT `rows.map(...)`, which would
  //    render every entry of the type in list order instead of just the linked, user-ordered ones.
  const rows = await input.readEntries(input.target);
  const byId = new Map(rows.map((row) => [String(row.id ?? ""), row]));
  return limited
    .map((id) => byId.get(id))                  // unknown id → undefined → skipped on the next line
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row) => {
      // displayField is usually a SCHEMA field → resolve against row.data; fall back to the
      // top-level summary (so a system field like `title`/`status` still resolves).
      const scope = (row.data && typeof row.data === "object" ? row.data : row) as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        title: String(row.title ?? row.name ?? row.id ?? ""),   // title is top-level on EntrySummary
        status: typeof row.status === "string" ? row.status : undefined,
        displayValue: input.displayField
          ? stringify(readBindingPathValue(scope, input.displayField) ?? readBindingPathValue(row, input.displayField))
          : undefined,
        updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : undefined, // top-level on EntrySummary; activity "time" source
      };
    });
}
// Handle (ALL enforced inside the resolver, never deferred to the adapter): empty/null ids → [];
// a single scalar id is coerced to [id]; missing/empty target → []; ids beyond limit dropped;
// unknown id → skipped; rows returned in the relation's STORED ID order, NOT the list's read order.
// (Alternatively the host's readEntries adapter may pre-flatten each row to
//  { ...entry.data, id, title, slug, status } — if so, resolve displayField against the row
//  directly; pick ONE convention and pin it in the resolver test below.)
```

### B3.2 — `relatedEntries` prop on `ScreenRuntimeRenderer`

```tsx
// Add an optional, precomputed-by-host prop (keeps the renderer pure):
//   relatedEntries?: Record<string /* blockId */, RelatedEntrySummary[]>
// Builder mode: ignore relatedEntries → render the skeleton rows
//   (prototype CustomScreenEditorPreview.tsx:164-183), NO tokens.
// Entry/preview mode: render resolved rows from relatedEntries[block.id]; when undefined
//   (not yet resolved) render the skeleton/loading rows.
```

### B3.3 — `related-list` render branch + variants

```tsx
// In renderBlock, add `if (block.type === "related-list")`:
//   const rows = mode === "builder" ? null : relatedEntries[block.id];
//   variant = data.variant ('checklist' | 'activity' | 'cards'):
//     checklist → bordered list of rows w/ Checkbox + title + StatusBadge
//                 (prototype CustomScreenEntryEditorPreview.tsx:195-212)
//                 row mapping: title=summary.title, status=summary.status, checkbox is decorative
//     activity  → avatar + "<name> <action>" + time rows (`:214-235`)
//                 row mapping (PINNED to RelatedEntrySummary — no fabricated fields):
//                   name   = summary.title
//                   action = summary.displayValue (the bound displayField, e.g. a status/verb field)
//                   time   = summary.updatedAt (formatted; the ONLY time source — added to
//                            RelatedEntrySummary in B3.1). When updatedAt is absent, omit the time
//                            column rather than synthesizing one.
//     cards     → grid of cards (title + status chip + displayValue)
//   header = data.label; empty rows → "No related <target>" muted state;
//   rows == null (unresolved/builder) → skeleton rows (`:164-183`).
// Display-only: no onFieldChange/onTitleChange wiring from this branch.
```

### B3.4 — host precompute + wiring (every consuming surface)

```tsx
// Each host that renders ScreenRuntimeRenderer in entry/preview precomputes relatedEntries
// for all related-list blocks in the document, then passes it in:
//   1. collect related-list blocks (collectScreenDocumentBlocks) + their bindings (items → field)
//   2. for each, read the current entry's relation value via readBindingPathValue(values, field).
//      This is ID[] for a multiple relation but a BARE ID string for a single (relation.multiple
//      falsy) relation — pass it RAW to the resolver, which coerces scalar→[id] (B3.1 step 1).
//      Do NOT pre-bail when it is not an array (that would render a valid single relation empty).
//   3. DERIVE `target` AUTHORITATIVELY from the bound relation field — do NOT trust stored
//      data.target as the primary source. The `ids` come from binding.field's relation value
//      (step 2), so the content-type to look them up in MUST be that SAME field's relation.target;
//      otherwise ids-from-field-X are looked up in field-Y's entry list, every byId.get(id) misses,
//      and the related-list renders a SILENT perpetual empty state with no error. Every renderer
//      host already holds `fields: ContentField[]` (CustomScreenEntryCanvas.tsx:15/43,
//      CustomScreenPreview.tsx:14/49, CustomScreenWorkspacePreviewDialog.tsx:41/135 →
//      ContentField.relation.target, SchemaBuilder.tsx:176), so resolve:
//        const target = fields.find((f) => f.name === binding.field)?.relation?.target
//          ?? data.target ?? "";   // fall back to stored data.target only when the field is absent
//      resolveRelatedEntries({ ids, target, displayField, limit, readEntries })
//   4. build Record<blockId, RelatedEntrySummary[]> and pass as relatedEntries
//
// INVARIANT (pinned — an implementer MUST ship this, not the drift-prone variant): `ids` and
// `target` are BOTH derived from the SAME `binding.field`, so a rebind to a different relation
// field can NEVER desync them. 498-02 B4 ALSO resyncs data.target on rebind (belt-and-suspenders),
// but the runtime treats the bound field's relation.target as the source of truth and uses stored
// data.target only as a fallback. Regression-covered by the rebind→resolve assertion in the shape.
//
// ── EXECUTION-READY host-precompute skeleton (the OWNER hosts run this verbatim;
//    CustomScreenEntryCanvas/CustomScreenPreview are FORWARD-ONLY — they declare the prop, no state) ──
//   const [relatedEntries, setRelatedEntries] =
//     useState<Record<string, RelatedEntrySummary[]>>({});
//   useEffect(() => {
//     let cancelled = false;
//     const blocks = collectScreenDocumentBlocks(document)              // screenDocumentOps.ts:347
//       .filter((b) => b.type === "related-list");
//     if (blocks.length === 0) { setRelatedEntries({}); return; }       // block-GUARD: zero fetch when none
//     (async () => {
//       const pairs = await Promise.all(blocks.map(async (block) => {   // batch all related-list blocks
//         const binding = bindings.find((bd) => bd.blockId === block.id && bd.propPath === "items");
//         if (!binding) return [block.id, [] as RelatedEntrySummary[]] as const;
//         const ids = readBindingPathValue(values, binding.field);      // ID[] OR bare id — passed RAW
//         const data = (block.data ?? {}) as { displayField?: string; limit?: number; target?: string };
//         const target = fields.find((f) => f.name === binding.field)?.relation?.target
//           ?? data.target ?? "";                                       // DERIVE (Issue-1 invariant)
//         const rows = await resolveRelatedEntries({
//           ids, target, displayField: data.displayField, limit: data.limit,
//           readEntries: (t) => listEntriesCached(t),                   // EXISTING entries-read; memoize by t
//         });
//         return [block.id, rows] as const;
//       }));
//       if (!cancelled) setRelatedEntries(Object.fromEntries(pairs));
//     })();
//     return () => { cancelled = true; };
//   }, [document, bindings, values, fields]);                           // re-resolve on doc/value/field change
//   // pass relatedEntries to ScreenRuntimeRenderer; while the effect is pending the map is {} →
//   // the renderer shows the skeleton (B3.2), NEVER a crash. Do NOT call the async resolver in render.
//   // PREVIEW DIALOG variant: `values` = previewRecordState.data and document/bindings/fields are the
//   // dialog's props; otherwise the body is byte-identical.
//
//   // ── STABLE `values` SOURCE — MANDATORY in the OWNER hosts (do NOT feed the effect a per-render
//   //    fresh object) ── The effect keys on `values`. In CustomScreenEntryEditor the correct value
//   //    source is the MERGED payload (non-editable relation IDs live in `originalData`, merged only
//   //    inside buildPayloadData — the stable `values` state alone is insufficient), BUT buildPayloadData
//   //    (:765) and buildCanvasFieldValues (:775) are PLAIN non-memoized arrow functions that return a
//   //    FRESH object every render (unlike the memoized runtimeDocument/runtimeBindings :390-391). If the
//   //    effect's `values` maps to that fresh object, the effect re-runs EVERY render → setRelatedEntries
//   //    yields a new object ref → re-render → new `values` → effect re-runs: an UNBOUNDED
//   //    resolve/setState loop, not a one-shot resolve. So the owner host MUST feed the effect a STABLE
//   //    value source: either `const canvasFieldValues = useMemo(() => ({ ...buildPayloadData(), title,
//   //    slug, ... }), [originalData, values, title, slug, entry?.status, entry?.updatedAt, ...])` (memoize
//   //    the merged payload over its real inputs) OR key the effect on `entryId` + a SERIALIZED relation-ID
//   //    signature (JSON of just the related-list fields' ids) instead of the whole object. AND guard the
//   //    setState — only `setRelatedEntries(next)` when `next` actually differs from the current map (shallow
//   //    per-block compare / serialized-signature compare), so an unchanged resolve never triggers a
//   //    re-render. The PREVIEW DIALOG owner is ALREADY SAFE (its value source `previewRecordState.data` is
//   //    stable React state, not a per-render object) — this trap is SPECIFIC to the entry-editor owner host.
//
// Wire in (entry + preview hosts ONLY) — OWNERSHIP of the useState/useEffect skeleton above:
//   OWNER hosts (RUN the skeleton, hold the state): CustomScreenEntryEditor (ONE map fed to BOTH
//     canEditInScreen branches) and CustomScreenWorkspacePreviewDialog/its owner (its OWN map from
//     previewRecordState.data). FORWARD-ONLY (declare the prop, NO state): CustomScreenEntryCanvas,
//     CustomScreenPreview.
//   - CustomScreenEntryCanvas.tsx (mode="entry", :38-56) — accept + forward relatedEntries
//   - CustomScreenEntryEditor.tsx — precompute ONCE via listEntriesCached (a NEW read against the
//     EXISTING entries-read endpoint), separate from the content-TYPE relationTargets load
//     (:372 builds relationTargets from content types, NOT entries). This file renders TWO
//     ScreenRuntimeRenderer hosts gated on `canEditInScreen` (:389), and BOTH must receive the
//     SAME precomputed relatedEntries map:
//       (a) canEditInScreen TRUE  → CustomScreenEntryCanvas (forward prop, :1231 / :1237 region)
//       (b) canEditInScreen FALSE → the in-file read-only CustomScreenPreview (:1253) — the
//           read-only fallback (canEditInScreen is false EXACTLY when the screen has NO writable
//           bindings → display-heavy, the surface MOST likely to host a display-only related-list);
//           without it a related-list there shows a PERPETUAL skeleton (relatedEntries[blockId]
//           undefined). Feed it the same map. (Degrades gracefully — skeleton, no crash — but the
//           wiring step must enumerate it, not just the canvas.)
//   - CustomScreenPreview.tsx (the component) — add the forward-only `relatedEntries` prop so BOTH
//     its in-file :1253 use here AND CustomScreenWorkspacePreviewDialog's preview path can forward
//     resolved rows into its inner ScreenRuntimeRenderer. (CustomScreenPreview is a pure forwarder
//     — it does NOT precompute; its owner supplies the map.)
//   - CustomScreenWorkspacePreviewDialog.tsx — the preview (editor-view) path. This dialog OWNS its
//     preview record (`previewRecordState.data`, passed as `data={previewRecordState.data}`,
//     CustomScreenWorkspacePreviewDialog.tsx:134) and NOTHING upstream precomputes related rows for
//     it, so the dialog (or its owner) MUST precompute its OWN relatedEntries map from
//     previewRecordState.data's relation IDs via the SAME resolver + `listEntriesCached` reuse
//     (mirroring the entry-editor precompute (b) above), then forward it through CustomScreenPreview.
//     previewRecordState.data carries the FIRST REAL ENTRY's relation IDs
//     (buildPreviewRecordStateFromEntry spreads `...entry.data`, customScreenPreviewData.ts:70-88),
//     which ARE resolvable. When NO entries exist the schema fallback relation value is the literal
//     string "Related item" (customScreenPreviewData.ts:38) — the resolver coerces it (scalar→[id])
//     + looks it up → no match → empty state (graceful, not a crash). Do NOT just forward `undefined`
//     (that would leave a perpetual skeleton in the preview dialog even though the first entry's IDs
//     are right there in previewRecordState.data). "forwards relatedEntries via CustomScreenPreview"
//     is the LAST hop, NOT a no-op pass-through — the precompute step is required here too.
// OUT OF SCOPE: CustomScreenEntriesTable.tsx (the published list) — it is a native HTML table
//   (resolveEntryColumnValue per column, :35,:178), not a ScreenRuntimeRenderer host, and
//   buildDefaultListRowTemplate emits only `field` cells (customScreenSchemas.ts:861-873) so a
//   related-list can't appear in a list row anyway. Do NOT convert it to a renderer host or
//   pass relatedEntries here (that would violate the owner's "list rendering stays as-is"
//   refinement). Related-list renders in the entry + preview surfaces only.
// The resolver's readEntries adapter is the PLAIN `listEntriesCached(target)` reuse —
// (entriesClient.ts:253-268, the read FieldRenderer:79 already uses) — with NO id argument; it
// returns the WHOLE target-type list and the resolver (B3.1 step 2) filters to the entry's ids +
// preserves relation order. Batch by target where possible. This is a new fetch, but against the
// existing entries endpoint + its existing session auth/RBAC (no new route).
```

### C — entry/preview rendering of every new kind

The entry view (`CustomScreenEntryCanvas` → `ScreenRuntimeRenderer mode="entry"`) and the
preview surfaces (`CustomScreenPreview` / `CustomScreenWorkspacePreviewDialog` editor-view)
feed the single entry's `values` and resolve every binding to real values (existing path
`:292-306`). Read-only new kinds (`stat`/`divider`/`image`/`related-list`/`tabs`/`button`/
`heading`) render values but do not write back — the existing write path only writes
`title`/`slug`/schema fields, so this is unchanged. Confirm each screen owns its OWN entry
layout via `ScreenDocumentV1.sections` (different screens present the same content type
differently) — no shared/global layout is introduced.

> Published LIST scope: `CustomScreenEntriesTable` (the entries list) renders native columns
> via `resolveEntryColumnValue` (it does NOT route blocks through `ScreenRuntimeRenderer`), so
> the new block kinds — and `related-list` in particular — render only in the entry + preview
> surfaces. The published list stays the existing column table, unchanged (owner refinement:
> list rendering stays as-is; the list EDITOR was removed in 498-01).

**Data flow:** host loads entry `values` + (new) precomputes `relatedEntries` from the
relation IDs via the existing entries read → `ScreenRuntimeRenderer` resolves field bindings
+ materializes related rows → inline edits for `field`/`title`/`slug` flow back through the
existing `commitBindingValue` path; related-list/stat/etc are display-only.

**Error handling:** resolver returns `[]` on empty/missing target/unknown id (renders the
empty state); a failed entries read renders the skeleton/loading rows, never throws into the
renderer; keep existing entry-editor error banners.

**Regression-test shape:** resolver: ID[] → `RelatedEntrySummary[]`, `limit` clamps rows,
missing/empty target → `[]`, empty/null ids → `[]`; given a `readEntries` stub returning the
WHOLE target list in a different order, ONLY the `ids` rows are returned and in the `ids`' stored
order (not the list's read order), an unknown id is skipped, and a single-value relation passed
as a bare string id resolves to its one row (scalar coerced to `[id]`); `displayValue` resolves a
**schema** field (under `row.data`, not just a top-level summary field — guards the
EntrySummary-shape pitfall); `updatedAt` is surfaced from `row.updatedAt` onto each
`RelatedEntrySummary` (the activity-variant time source);
renderer: `related-list` renders resolved rows for each variant + skeleton when
`relatedEntries[blockId]` is undefined, builder mode renders skeleton (no tokens, no fetch);
the **activity** variant renders name=title, action=displayValue and time=updatedAt from the
resolved summary (no fabricated time);
entry/preview render real values for all new kinds; inline write-back unaffected for
`field`/`title`/`slug`; host wiring passes `relatedEntries` to BOTH `canEditInScreen` branches of
`CustomScreenEntryEditor` — the editable `CustomScreenEntryCanvas` (`:1231`) AND the read-only
in-file `CustomScreenPreview` (`:1253`) — plus the preview-dialog path: assert
`CustomScreenWorkspacePreviewDialog` precomputes its OWN `relatedEntries` from
`previewRecordState.data`'s relation IDs (the first entry's IDs, customScreenPreviewData.ts:70-88)
via the same resolver and resolves a related-list — NOT a no-op `undefined` pass-through / perpetual
skeleton — and that the no-records fallback relation value ("Related item",
customScreenPreviewData.ts:38) coerces + looks up to the empty state without crashing;
**target-derivation invariant (rebind→resolve):** assert the host precompute derives the
resolver `target` from the bound relation field's `relation.target` (via the `fields` prop), NOT
from stored `data.target` — bind/rebind a related-list to a relation field whose `relation.target`
is `"tasks"` while stored `data.target` is stale/empty, and the precompute MUST still call
`resolveRelatedEntries` with `target: "tasks"` (so the entry's ids resolve, never a silent empty
state); the
entries list still renders (native columns, unaffected — related-list is NOT expected in the
published list).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/customScreens/customScreenService.test.ts tests/vitest/customScreens/bindingResolver.test.ts tests/vitest/customScreens/relatedEntryResolver.test.ts tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx tests/vitest/ui/custom-screen-authoring-boundary.test.ts`
- **Boundary suite must stay green:** `tests/vitest/ui/custom-screen-authoring-boundary.test.ts`
  guards `ScreenRuntimeRenderer.tsx`, `CustomScreenEntryCanvas.tsx`, `CustomScreenEntryEditor.tsx`
  and `CustomScreenPreview.tsx` (all edited in this leaf) against `@/ui/pages` / `ui/pages/builder`
  / `@/ui/widgets` / `WidgetRenderer` imports (`:53-75`). The `related-list` render branch + the
  host `relatedEntries` precompute must use local soft-token markup + the existing
  `listEntriesCached` entries-read only — do NOT pull a Pages widget/list renderer to render the
  checklist/activity/cards rows. Running it in the per-leaf gate catches a forbidden import here,
  not only at 498-04's full-dir run.
- Add a resolver unit suite `tests/vitest/customScreens/relatedEntryResolver.test.ts` (ID[] →
  `RelatedEntrySummary[]`, limit clamp, missing/empty target → `[]`, `displayValue` from a
  schema field under `row.data`). MUST also assert, against a `readEntries` stub that returns the
  WHOLE target list (more rows than `ids`, in a DIFFERENT order — e.g. updatedAt-desc): (a) ONLY
  the rows whose id is in `ids` are returned (the rest of the type list is filtered out), (b) the
  returned rows are in the `ids`' STORED order, not the list's read order, (c) an unknown id in
  `ids` is skipped, (d) a SINGLE-value relation passed as a bare string id (not an array)
  resolves to that one row (scalar coerced to `[id]`, NOT the empty state), and (e) `updatedAt`
  is surfaced onto each `RelatedEntrySummary` from `row.updatedAt` (the activity-variant time
  source) — and is `undefined` when the row carries no `updatedAt`.
- Extend the `ScreenRuntimeRenderer` suite
  `tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx` (created in 498-02)
  with the `related-list` cases: resolved rows per variant (checklist/activity/cards) from
  `relatedEntries[blockId]`, skeleton when undefined, and builder-mode skeleton (no fetch). The
  **activity** case asserts the row renders name=`title`, action=`displayValue` and time=`updatedAt`
  from the resolved summary (and that an absent `updatedAt` omits the time column rather than
  rendering a fabricated/placeholder time).
- Extend the preview-dialog suite
  `tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx` (the ONLY suite that mounts
  `CustomScreenWorkspacePreviewDialog`, edited in this leaf for its OWN `relatedEntries`
  precompute + forward through `CustomScreenPreview`) — this is the home for the required
  dialog-precompute assertion. Extend its existing `CustomScreenWorkspacePreviewDialog renders
  editor preview from screen bindings` test (`:100`, `mode="editor-view"` — the exact path being
  modified): assert the dialog precomputes its OWN `relatedEntries` from `previewRecordState.data`'s
  relation IDs and resolves a related-list (NOT a no-op `undefined` pass-through / perpetual
  skeleton); assert the `target` is derived from the bound field's `relation.target` (via the
  `fields` prop), not stored `data.target`; and assert the no-records fallback relation value
  (`"Related item"`, customScreenPreviewData.ts:38) coerces + looks up to the empty state without
  crashing. Because the precompute newly calls `listEntriesCached`, also confirm it is
  block-guarded (no fetch when the document has no related-list block) and does not regress the
  existing Editor View preview render. Gating this at the leaf (not only 498-04's full-dir run)
  surfaces a forbidden import / no-op pass-through here.
- All other `tests/vitest/customScreens/*` and `tests/vitest/ui*/custom-screen*` suites must
  stay green.
- Runtime/front smoke (`coderso-dev-core-host` + `playwright-cli` per MEMORY): an entry view
  with a related-list renders resolved related entries; the entries list renders.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf changes status.
- Document the relation-resolution contract (read-only, reuses entries read, host-precomputed
  `relatedEntries` prop, `RelatedEntrySummary` shape) in `_docs/CONTENT_TYPES_SPEC.md` or a
  screens contract doc (finalized in TASK-498-04).
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-498** + **TASK-498-03**, noting
  the read-only relation resolver reuses existing entries-read auth/RBAC (no new route).

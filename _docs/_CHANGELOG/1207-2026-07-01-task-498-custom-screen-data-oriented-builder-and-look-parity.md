# 1207. TASK-498 Custom-Screen Data-Oriented Builder & Look Parity

**Date:** 2026-07-01
**Version:** Unreleased
**Tasks:** TASK-498 (01 + 02 + 03 + 04); builds on TASK-479 (soft/violet redesign),
TASK-496-02 (Screens on the shared `CanvasEditor` shell), TASK-474 (custom-screen canvas parity)

## Summary

Turned the Custom-Screen **entry-view builder** into a data-oriented, graphical-schema editor
that matches the prototype (`_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEditorPreview.tsx`)
and the Pages editor shell, while keeping the `ScreenDocumentV1` + `ScreenFieldBinding` model and
the V4 definition contract intact and backward-compatible. **No `ScreenDocumentV1` schemaVersion
bump (stays `1`), no definition version bump (stays `4`), no DB migration, no route/RBAC change**
— the only new fetch is the read-only Related-list resolver, which reuses the existing admin
entries-read (`listEntriesCached`) under its existing session auth + RBAC. The TASK-496-02
per-record presentation-override editing surface (Text size / Emphasis / Tone / Media override)
is **PRESERVED**, not replaced by the decorative palette/toolbar chrome.

## Key Changes

### Screen-editor look parity + List-View removal (TASK-498-01)
- The entry-view builder reads as a graphical SCHEMA: a **9-chip `PaletteChip` palette** (local
  chip component named `PaletteChip`, NOT `BlockChip` — the standing dead-code guard stays green),
  corner-tag block cards, and muted mono `{{ Field }}` tokens in builder mode.
- The right rail is brought to **Pages shared-shell parity**: an in-panel hide/grip head with the
  target label + selection chip + a relocated block-action cluster (move/duplicate/delete) + the
  command-palette Search trigger; a four-icon category row (**Settings / Insert / Layers /
  Inspect**) with Settings always-enabled (screen-level settings stay reachable) and Inspect
  disabled with no selection; and a single flat consolidated `panel="all"` inspector. The
  fabricated `Layout`/`Spacing`/`Visible` prototype rows are intentionally NOT shipped (no backing
  model this leaf); the binding-mode "Interaction" Select and the "Advanced style" modal are
  dropped (variant edited inline in the Background row).
- The **List/Editor toggle + list-view row-template editor surface are removed
  non-destructively**: `definition.listView`, `buildDefaultListRowTemplate`,
  `CustomScreenEntriesTable`, and the `ListView*` component files are retained and round-tripped on
  save. Boundary + dead-code guards stay green (retained `ListView*` files allow-listed).

### Data block kinds + model (TASK-498-02)
- Extended `ScreenBlockKind` with `heading / text / stat / divider / image / related-list / tabs /
  button` (the dead `actions` placeholder is promoted to `button`), plus `screenBlockLabels` and
  per-kind `createScreenBlock` factories.
- Added per-kind, **schema-first, reject-unknown `normalizeScreenBlockData`** layered into
  `normalizeScreenBlock` (permissive legacy fall-through; enum/int coercion). Stored V4 screens
  read back byte-stable; **no schemaVersion bump**.
- Per-kind inspector controls + bound-field filtering (stat→number, image→media,
  related-list→relation). Display kinds bind `mode:"read"`; only `field` / editable header bind
  `readwrite`. `related-list` binds on propPath **`items`** (not `value`) and the control syncs
  `data.target` from the relation field's `relation.target`. Static runtime branches for
  heading/text/stat/divider/image/button/tabs.

### Related-list runtime + entry rendering (TASK-498-03)
- New `core/services/customScreens/relatedEntryResolver.ts` — `resolveRelatedEntries` coerces the
  relation value (`ID[]` or a bare scalar id) to an id list, fetches the whole target list via an
  injected `readEntries`, then **filters to the requested ids in stored order** (unknown skipped,
  `limit` clamped) and returns `RelatedEntrySummary[]` (`id/title/status?/displayValue?/updatedAt?`;
  `displayValue` from `row.data`, `updatedAt` = activity time source).
- `ScreenRuntimeRenderer` gains a pure, host-precomputed `relatedEntries` prop + the `related-list`
  render branch (checklist / activity / cards variants; skeleton when unresolved or in builder).
- Host precompute wired into the entry + preview surfaces (`CustomScreenEntryEditor` — both
  `canEditInScreen` branches — `CustomScreenEntryCanvas`, `CustomScreenPreview`,
  `CustomScreenWorkspacePreviewDialog`), each deriving `target` authoritatively from the bound
  field's `relation.target`, using a stable/memoized value source + a diff-guarded
  `setRelatedEntries` (`relatedEntriesMapEqual`) — no setState loop. Read-only, reuses
  `listEntriesCached`; the published native list is unchanged.

### Tests, docs & closure (TASK-498-04)
- Full vitest matrix green across `tests/vitest/customScreens`,
  `tests/vitest/admin/custom-screen-schemas.test.ts`, `tests/vitest/ui`,
  `tests/vitest/ui-integration`: schemas/ops/renderer/resolver/look-parity/list-view-removal.
  The coupled 01/02/03 re-points are landed — `custom-screen-binding-panel` (`panel="all"`,
  display-kind bind → `mode:"read"`), `custom-screen-editor-binding-flow` (style modal dropped;
  related-list → propPath `items` + `data.target` sync), the presentation-override guard
  `custom-screen-record-interactions` kept UNWEAKENED (textSize/textEmphasis/tone/mediaAssetId
  still render + persist), and `custom-screen-authoring-boundary` with
  `CustomScreenWorkspacePreviewDialog` in the guarded array.
- **Read-path `actions`→button repair** in `customScreenSchemas.ts`
  (`normalizeScreenDocumentV1ForRead` only) — a stored `actions` block reads back as a usable
  `button` (data intersected with the button allow-list), while the write path leaves `actions`
  permissive/untouched. New schema test, disjoint from the byte-stability + legacy-widget fixtures.
- Docs: `_docs/CONTENT_TYPES_SPEC.md` gains the per-kind `data` schema table + the Related-list
  relation-resolution contract. README board + Statistics closure; this changelog.

## Validation

- `bun --cwd core lint` — PASS (`--max-warnings=0`).
- `bun --cwd core lint:types` — PASS.
- Custom-screen vitest surface (`tests/vitest/customScreens`,
  `tests/vitest/admin/custom-screen-schemas.test.ts`, `tests/vitest/ui`,
  `tests/vitest/ui-integration`) — GREEN (see the closure run; 421 files, and the
  `custom-screen-schemas` suite gains the read-path-repair case).
- `bun run gates:coderso` — 5/5 (functional / ux / performance / security / reliability).

## Contract note

Schema-first / reject-unknown / backward-compatible. **No `ScreenDocumentV1` schema-version bump,
no definition version bump, no DB migration, no route/RBAC/CSRF/rate-limit change** — the
Related-list resolver is a read-only reuse of the existing entries-read auth/RBAC. The List-view
EDITOR surface was removed non-destructively (model + runtime + `ListView*` files retained). The
presentation-override editing surface (`screenEntryPresentationOverrideContract.ts` allow-list) is
preserved. Contract docs updated: `_docs/CONTENT_TYPES_SPEC.md` (per-kind `data` schemas +
relation-resolution contract). Cross-links: [[admin-ui-redesign-prototype]],
[[match-prototype-faithfully]], [[prototype-source-over-screenshots]].

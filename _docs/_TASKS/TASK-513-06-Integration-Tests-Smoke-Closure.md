# TASK-513-06: Integration Tests, Gates, Playwright Smoke & Closure

# FileName: TASK-513-06-Integration-Tests-Smoke-Closure.md

**Parent Task:** TASK-513
**Priority:** High
**Category:** Content (Engine) / Tests / Smoke / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-513-01, -02, -03, -04, -05 (all land first)
**Status:** ⏳ To Do

---

## Scope (single-writer)

**513-06 writes only NEW/owned test files + this task's closure docs.** It does NOT edit source
owned by 01–05 (any source bug found is fixed by that file's owner, or noted as a residual).
Adds cross-cutting integration tests, the downstream-consumer guard, runs all gates, performs the
Playwright smoke (≥5 real-flow scenarios), and writes the closure summary.

**Land order (strict):** …→ 513-05 → 513-06 (this, LAST).

---

## Security Contract

**Tests + docs only — no route/DB/RBAC/migration.** Verifies (not introduces) that
`content_type_config_invalid` returns 400, reject-unknown holds for config + permissions keys, and
the config round-trips through create/update/duplicate without privilege change. Confirms no new
endpoint/RBAC bucket was added beyond the existing `content:read`/`content:write` buckets.

---

## What this subtask ships

### 1. Integration / cross-cutting tests
- **End-to-end config round-trip (Bun route lane)**: `POST /content-types` with `config` +
  `date`/`slug` fields → `GET` → `PATCH` (change config + reorder fields) → `GET` asserts config
  present-only, field order preserved, schema `format:"date"`/`xFieldType:"slug"` intact.
  Reject-unknown: `config.bogus` and `permissions.editor.bogus` → 400. Unique-slug per test +
  teardown (shared-DB safety; self-isolate to avoid the smoke-DB-pollution transient).
- **Downstream-consumer guard (Vitest pure)**: feed a schema with `date`/`slug` fields to the
  entry-facing consumers that map `ContentField` (`entries/entryChecklist.ts`,
  `entries/EntryEditor` type-narrowing, `custom-screens` field consumers) and assert no throw /
  sensible passthrough — proves the `FieldType` union widening (513-02) did not break non-owned
  consumers.
- **countSchemaFields / list summary** still correct with date/slug fields.

### 2. Gates (all must be green)
- `bun --cwd core lint:types` AND root `tsc -p tsconfig.json --noEmit` (prop/type ripple).
- `lint`, full `bun test` (re-run named files if the glob shows spurious timeout flakes),
  Vitest suites, `gates:coderso`.

### 3. Playwright smoke — ≥5 distinct real-flow scenarios (session `-s=wf513smoke`, screenshots to `_docs/_workflows/_smoke/`)
Gate on `http://coderso-a.localhost:5173/admin/` == 200 (start `coderso-dev-core-host` if white).
1. **Prototype-fidelity side-by-side**: open the rebuilt editor vs `:5180/#/advanced/engine/sample`
   — verify breadcrumb `Engine › {name}`, Boxes icon, underline tabs incl. Permissions,
   `[1fr_300px]` grid, Fields rows (grip + type badge + `…`), Type-settings card. Light AND dark.
2. **Type-settings persist**: set Singular/Plural, toggle Enable drafts off + Versioning on, Save,
   reload → values persist (config round-trip through the UI).
3. **Field lifecycle**: add a **Date** field and a **Slug** field, reorder via drag, duplicate a
   field, delete a field (with Undo), Save → reopen shows the new order/types; open an **Entry**
   of the type and confirm the date input + slug input render (513-02 renderer).
4. **Permissions tab**: toggle several role×capability cells, Reset to defaults, re-toggle, Save,
   reload → matrix persists (present-only).
5. **Visual schema builder (Open schema)**: from the editor header open `/schema`, add a field via
   the palette, edit its inspector, reorder, Save → returns to a persisted schema; Discard reverts.
6. (bonus) **Cross-device**: repeat scenario 1 at a mobile viewport — field details Sheet + preview
   drawer behave; publish→front parity where a content route exists.

### 4. Closure
- Update `TASK-513*` subtask **Status** fields to ✅ Done with completion dates and truthful
  closure notes (what shipped, residuals, gate results, smoke pass counts).
- Do NOT edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*` (orchestrator adds board rows;
  closure changelog **1225** is pinned and owner/orchestrator-driven).
- Record any residuals + confirm the parent Open Questions' resolutions taken during impl.

---

## UI/UX-fidelity & max-config-flexibility notes

Smoke is the fidelity bar: measured light+dark side-by-side vs the prototype, all controls
exercised with real input (owner mandate: ≥5 distinct real-flow scenarios; acceptance-checklist-
only smoke is insufficient). Confirm every new control (API ID, singular, plural, drafts,
versioning, permissions matrix, date/slug fields, drag reorder, visual builder Save) is functional
end-to-end, not a shell.

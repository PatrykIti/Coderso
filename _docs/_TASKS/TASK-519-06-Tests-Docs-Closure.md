# TASK-519-06: Alpha Color Input — Tests, Docs & Closure

# FileName: TASK-519-06-Tests-Docs-Closure.md

**Parent Task:** TASK-519
**Priority:** High
**Category:** Docs / Tests / Closure
**Estimated Effort:** Small
**Dependencies:** 519-01..519-05 (all landed).
**Status:** ⏳ To Do

---

## Scope (single-writer)

Closure subtask. **Sole writer of `_docs/DESIGN_TOKENS.md`** (color-authoring section)
and any relevant editor-control doc. Does NOT edit `_docs/_TASKS/README.md` or
`_docs/_CHANGELOG/*` (orchestrator owns those) — only PINS the changelog number.

## Work

1. **Docs — `_docs/DESIGN_TOKENS.md`:** document that admin color controls now author +
   round-trip alpha-capable values (8-digit hex `#rrggbbaa`, `rgba()`, `hsla()`) via a
   base-color picker + opacity slider + text field, while keeping transparent / palette
   / `var(--color-*)` token UX; that the accepted-value set is the authoritative
   whitelist (`resolveClearableCssColorValue` / `normalizeMenuColorValue`) and the admin
   `colorValue.ts` helper is a read-only subset of it; and that storage is jsonb with NO
   migration. Cross-link the two shared controls (`ColorSwatchControl`,
   `SharedColorControl`) + the helper (`core/admin/ui/shared/colorValue.ts`).
2. **Cross-subtask reconcile pass (per Authoring-loop memory):** RETURN findings, not
   just counts — confirm the enum/format vocabulary in `colorValue.ts` matches what
   `ColorSwatchControl`/`SharedColorControl` consume and what the server/render boundary
   accepts; confirm the 519-04/05 verification results (editors round-tripping; widening
   count) are consistent; if any unowned legacy test (`clearable-fields.test.tsx`,
   `shared-color-control.test.tsx`, `menu-design-editor.test.tsx`,
   `page-editor-control-primitives.test.tsx`) asserts the OLD alpha-dropping behavior,
   name it here so its owner reconciles it (do NOT edit from this subtask).
3. **Gate sweep:** run root `tsc -p tsconfig.json --noEmit`, `bun --cwd core lint:types`,
   the named new/extended vitest files, `bun test`, `gates:coderso`. Record results.
4. **Playwright smoke (≥5 scenarios, light + dark, 0 console errors):** execute the
   parent Acceptance scenarios (menu alpha round-trip; widget alpha round-trip; base-edit
   keeps alpha; transparent/palette/token preserved; publish→front alpha render matching
   the prototype header tokens `#0812209e` / `rgba(8,17,31,.84)` family). Screenshots to
   `_docs/_workflows/_smoke/`.
5. **Changelog PIN:** closure documented under **1232** (verify next-free at closure —
   511=1229/517=1230/518=1231 precede; if the orchestrator has consumed 1232, bump to the
   next free and note the actual number). Board rows for 519 + all subtasks/leaves are
   added by the orchestrator, not here.

## Definition of done (roll-up)

Both shared controls author + round-trip alpha with a slider (HI-1/HI-2); transparent /
palette / token UX preserved (HI-3); 27 widget editors + 10 menu usages verified
schema-valid + round-tripping (519-04/05), widening count reported (expected 0); no
schema/DDL/migration (HI-4); Security Contract satisfied — UI helper is a read-only
subset of the authoritative whitelist, server/render boundary unchanged (HI-5);
single-writer holds (HI-6); all gates green; ≥5-scenario smoke passes light + dark;
`DESIGN_TOKENS.md` updated; closure under changelog 1232.

# TASK-532-02: Tests, Docs & Closure

# FileName: TASK-532-02-Tests-Docs-Closure.md

**Parent Task:** TASK-532
**Parent Subtask:** (closure — sibling of TASK-532-01)
**Priority:** High
**Category:** Testing / Documentation
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Closure-only subtask. Owns tests aggregation confirmation, the changelog entry, the
`_docs/_TASKS/README.md` rows/statistics, and the task-status flips. It does NOT
re-open any source contract (all source is owned by 532-01's leaves).

## Responsibilities

1. **Gates green (final).** Confirm all targeted lanes pass after 532-01 lands:
   - `bun --cwd core lint:types` AND root `tsc -p tsconfig.json --noEmit` (the latter
     covers `tests/` — a prop-signature/enum change can trip an excess-prop error there
     that the core-only typecheck misses).
   - `bun --cwd core lint`.
   - Vitest: `tests/vitest/pages/page-authoring-sanitizers.test.ts`,
     `page-document-v2.test.ts`, `page-renderer-v2.test.tsx`,
     `page-editor-control-registry.test.ts`, `page-editor-control-ui-model.test.ts`
     (name the files; the full glob has spurious timeout flakes — re-run named files).
   - `bun test` (page contract paths) + `gates:coderso`.
2. **Runtime smoke (mandatory).** ≥5 distinct real-flow scenarios on the live admin +
   front (see parent Acceptance) with `playwright-cli`, light + dark, 0 console errors,
   screenshots to `_docs/_workflows/_smoke/`. Assert VISIBLE computed styles
   (`font-size`, `font-weight`, `text-transform`, the gradient rule, the rich body
   `color`), NOT control presence: (a) fluid font-size scaling across desktop/tablet/
   mobile; (b) extrabold/black weight; (c) uppercase text-transform; (d) gradient
   eyebrow rule vs legacy `<hr>`; (e) textColor on a RICH text block; (f) a security
   negative (`fontSizeCustom:"expression(1)"` omitted; bad enum rejected) + publish→front
   parity. Restart the Bun server before smoke (no hot-reload); verify admin + front
   respond first.
3. **Changelog.** Add the entry under the then-current next-free number — grep
   `_docs/_CHANGELOG/` for the highest and use +1 (highest on disk 1242 at authoring;
   Bundle B is one of 531–534 taking 1243+; read the changelog dir FRESH immediately
   before writing so parallel bundles do not collide). Add the matching
   `_docs/_CHANGELOG/README.md` row.
4. **Board.** Edit `_docs/_TASKS/README.md` (row + statistics delta) — read it FRESH
   immediately before editing and touch ONLY TASK-532's rows/statistics. Flip all
   TASK-532 files ✅ Done.
5. **Report commit scope.** Report the file set + the assigned changelog number.

## Coordination

- 532/531/533/534 run on parallel worktrees. This closure reads
  `_docs/_TASKS/README.md` + `_docs/_CHANGELOG/README.md` FRESH right before editing and
  touches ONLY TASK-532's rows + statistics delta so a sibling bundle's closure cannot
  collide. Never revert/checkout uncommitted edits authored by the owner or a sibling
  bundle.
- Do NOT re-open `pageDocumentV2.ts` / `pageAuthoringSanitizers.ts` /
  `pageRendererV2.tsx` / `pageEditorControlRegistry.ts` — 532-01 owns all source.

## Security note

Closure adds no code. It VERIFIES the security regression net exists (532-01-L06's
grammar accept/reject corpus, fail-closed enum `throws`, color-whitelist fail-soft,
byte-identity) is green before flipping Done — a closure that flips Done with a missing
round-trip/reject-unknown assertion would let a forgotten allowlist entry silently empty
stored docs. The smoke's security-negative scenario (item 2f) is a required gate.

## Hard Invariants

1. Closure owns tests-confirmation + docs + statuses only; no source contract change.
2. Changelog + board numbers grepped FRESH at closure; only TASK-532 rows touched.
3. All final gates green; ≥5-scenario smoke passes light + dark, 0 console errors.
</content>

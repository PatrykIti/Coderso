# TASK-512-07: Tests, Docs, Smoke & Closure

# FileName: TASK-512-07-Tests-Docs-Smoke-Closure.md

**Parent Task:** TASK-512
**Priority:** High
**Category:** Testing / Docs / Smoke / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-512-01..06 all landed green.
**Status:** ⏳ To Do

---

## Scope (single-writer)

**512-07 owns:** the ≥5-scenario Playwright SMOKE, the closure regression sweep, the docs
updates, the changelog entry (**pinned 1224**), and the board update (README rows are
owner/orchestrator-managed — do NOT hand-edit here per task rules). Adds cross-cutting tests
NOT owned by a specific earlier subtask. **Land order:** LAST.

---

## A. Full regression gate sweep

Run and record green:
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- root `tsc -p tsconfig.json --noEmit` (catches test-file excess-prop breaks the core-only lint
  misses — per MEMORY typecheck-scope gotcha).
- root `bun run test:bun` (route/DB lanes — this is a ROOT script; `test:bun` does NOT exist in
  `core/package.json`, so keep `--cwd core` only on `lint`/`lint:types` which ARE core scripts).
  Re-run named media/folder files if the full glob shows the known smoke-DB-pollution transient
  (see MEMORY).
- full Vitest (`bun run test:vitest` / vitest glob).
- `bun run gates:coderso` (5/5).

**DB-test glob reconcile (cross-subtask, 07 owns the sweep):** the root `test:bun` glob
(`package.json:26`) is `tests/unit tests/integration/{routes,runtime,server,store,plugins,analytics}
tests/perf tests/security` — it does NOT include `tests/integration/db` (and no such dir exists).
512-01 already accounts for this: its DB/migration test lands at
`tests/integration/server/media-schema-0066.test.ts` (512-01 §Tests, "Bun lane (DB)"), an
already-globbed dir where DB-touching media tests already sit
(e.g. `tests/integration/server/mediaDeliveryAccess.test.ts`), so it runs in the standard lane —
no relocation needed here (do NOT chase a `tests/integration/db` move; 512-01 handled the path).
Section A's guard is therefore a POSITIVE assertion at closure: confirm this exact file is
enumerated by the `test:bun` glob AND that its cases (folder-delete-un-files, tags backfill,
slug-uniqueness) actually EXECUTED in the `test:bun` output — not merely that the suite is green.
If any subtask ever proposes a DB test under a NON-globbed dir, either relocate it under a globbed
dir or extend the glob — but that would edit root `package.json` (a shared file NOT owned by
TASK-512, so assign ownership explicitly if ever chosen).

## B. SMOKE — ≥5 DISTINCT real-flow scenarios (owner mandate)

Playwright against LIVE `:5173/admin/media` (session unique, e.g. `-s=wf512smoke`; screenshots to
`_docs/_workflows/_smoke/`). Each asserts VISIBLE/persisted effect (computed styles, geometry,
persisted rows on reload) — NOT control presence. Compare structure to `:5180/#/media`.

1. **Storage quota card, data-backed + degrade:** set quota (plan label + total GB) in Media
   settings → reload → storage card shows a progress bar with correct `%` width (used/total) +
   "N% used"/"available" footer + Manage plan; THEN clear the quota → card degrades to count-only
   (no bar). Assert bar width geometry both states. Light AND dark.
2. **Folder lifecycle + un-file-on-delete:** create folder → rename → create a nested child →
   reorder → assign an asset to it (drawer) → filter grid by folder (only that asset shows) →
   delete the folder → assert the asset SURVIVES (still in "All files", `folderId` null), folder
   gone. Reload to confirm persistence.
3. **Tags add/remove/filter:** open an asset → add 3 tags (dedupe a dup, hit the cap gracefully) →
   remove one → save → reload asset (tags persisted) → use Filters panel to filter by a tag (grid
   narrows). Assert persisted rows + filtered grid.
4. **Focal point:** open an image → drag the focal marker off-center → save → reload → the
   preview/card `object-position` reflects the focal coords (assert computed style ≈ set %).
5. **Richer metadata round-trip:** set description + credit on an asset → save → reload → both
   persist and render in the drawer.
6. **Prototype-fidelity parity (deep visual):** side-by-side `:5173` vs `:5180/#/media` — grid
   card has TYPE badge top-left + tone chip bottom-right + aspect-square preview; Filters button
   present; rail tokens match; in BOTH light and dark. Assert key computed tokens/classes.
7. **Cross-consumer regression:** open a Page/Screen editor MediaPicker → confirm it still lists
   media + picks (MediaGrid back-compat unbroken).

(Deliver ≥5; the list above is 7 for margin, covering deep nesting, override/reset cycles,
every-new-control-visible-effect, cross-device light/dark, and publish/consumer parity per the
MEMORY smoke mandate.)

## C. Documentation

- Media feature/model spec (`_docs/MEDIA_SPEC.md` — the dedicated media spec; sections: Content
  fields, Admin UI behavior (v1), Admin usage read model, Security): document folders (nesting,
  slug uniqueness, `onDelete:set null` un-file semantics), tags, focal (`focalX/Y` clamped
  `[0,1]`), `description`/`credit`, storage-quota settings keys
  (`storage.quota.totalBytes`/`.planLabel`), and the reject-unknown / present-only / clamp
  contract. (NOT `CONTENT_TYPES_SPEC.md` — its `media` references are field-type entries,
  `media.accept`/`media.maxItems`, not the asset-table model.)
- Schema doc (`_docs/DATA_MODEL.md`, `## Media` section, the `media` table at ~L200-216): add the
  new `media` columns (`folderId`, `tags`, `focalX/Y`, `description`, `credit`) and the new
  `media_folders` table (nesting/parent ref, slug uniqueness, `onDelete:set null`).
- Getting-started / admin docs: note the new folder + quota + focal features if a media section
  exists.
- **Changelog:** new entry **pinned 1224** (VERIFY 1224 still free at closure; if taken, take the
  next free and note it). Summarize prototype-fidelity + schema extension + full functionality.

## D. Closure

- Flip parent + all child `Status:` to ✅ Done with `**Completed:**` dates once gates + smoke green.
- Leave README/CHANGELOG/README-board row edits to the orchestrator per task rules (report the
  changelog number + rows needed in the closure summary).

## Security Contract (closure verification)

- Re-confirm: no new RBAC bucket; all writes `media:write`, reads `media:read`; reject-unknown 4xx
  on every new key (media PATCH + folder routes); folder-delete un-files (never cascades); focal
  clamped `[0,1]`; tag/text caps enforced; CSRF on all client writes; quota display-only by
  default. Run `security-review` on the diff; record findings resolved.

## Acceptance Criteria

1. All gates green (lint, lint:types, root tsc, test:bun, full vitest, gates:coderso 5/5).
2. ≥5 smoke scenarios pass with asserted visible/persisted effects, light + dark; screenshots
   saved. Prototype parity confirmed side-by-side.
3. Docs + changelog (1224) written; parent + 7 children flipped to Done; closure summary lists
   board rows for the orchestrator.

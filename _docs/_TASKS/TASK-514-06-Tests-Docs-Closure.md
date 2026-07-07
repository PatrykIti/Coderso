# TASK-514-06: Tests, Docs & Closure

# FileName: TASK-514-06-Tests-Docs-Closure.md

**Parent Task:** TASK-514
**Priority:** High
**Category:** QA / Docs / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-514-01, -02, -03, -04, -05 (all landed)
**Status:** ✅ Done (2026-07-06)

---

## Overview

Closure subtask for TASK-514: the combined gate run, the mandatory ≥5-scenario
runtime smoke, the data-model doc note for the new `visibility`/`access_password`
columns, and the changelog closure (**pinned 1227**). This subtask owns DOCS +
the smoke script only; it does NOT modify feature source (any regression found is
fixed in the owning subtask's file, not here).

**Owned files (sole writer):**
- `_docs/DATA_MODEL.md` — add the `content_entries.visibility` /
  `access_password` note (enum values, hashed secret, never-returned rule).
- `_docs/_workflows/_smoke/wf514-*.png` + the smoke script under
  `_docs/_workflows/` (if the orchestrator wants a committed script).

**Do NOT** edit any feature source, `_docs/_TASKS/README.md`, or
`_docs/_CHANGELOG/*` (the orchestrator adds board rows + the changelog file).
The changelog **number is pinned 1227** — reference it, do not allocate another.

---

## Combined Gate (deferred, ONE run after all streams land)

Per the parallel-streams discipline (AGENTS.md), run once after 514-01..05:

1. `bun run test` (full) — entry route/integration + admin UI suites green;
   re-run any flaky named file in isolation before declaring a real failure
   (known smoke-DB-pollution transient — see settings-test isolation precedent).
2. Root `tsc -p tsconfig.json --noEmit` (INCLUDES tests — the typecheck-scope
   gotcha: `bun --cwd core lint:types` alone misses excess-prop errors in tests
   after the prop-signature changes in 514-02/03/04).
3. `bun --cwd core lint:types` + `bun --cwd core lint`.
4. `gates:coderso` (5/5).
5. Migration check: fresh `bun run db:migrate` applies the 514 visibility
   migration clean on the resettable local DB; `db:seed:admin` still works.
   **Do NOT assert a fixed number here** — the migration number is REALLOCATED at
   land time per strict cross-task land order (see 514-01: `0066` is already
   taken by `dashboard_layouts`, and TASK-512-01 and TASK-513-01 BOTH also
   target `0067`, so 514 — contending for the same slot and landing after both —
   is very likely `0068`/`0069`). Read the real filename in `core/db/migrations/` at closure and
   confirm the snapshot + `_journal.json` entry match it.

## Runtime Smoke (mandatory — ≥5 distinct real-flow scenarios)

Owner mandate: implementation smoke = ≥5 distinct real-flow scenarios per area
with VISIBLE-EFFECT assertions (computed styles/geometry/DOM state, never mere
control presence). Restart `coderso-dev-core-host` first; verify
`http://coderso-a.localhost:5173/admin/` is 200 (white page = server down,
re-run helper). `playwright-cli` named session; light + dark; 0 console errors;
screenshots to `_docs/_workflows/_smoke/`.

1. **Editor layout fidelity** — open an entry; assert the PageHeader breadcrumbs +
   title render, the `grid-template-columns` computes to `1fr 320px` at `lg`, the
   Content `SectionCard` + right panel geometry match `wf514-proto-editor.png`
   side-by-side (light + dark).
2. **Visibility round-trip** — set Visibility public→private→password, type a
   password, Save metadata; assert the network response has `hasPassword:true` and
   NO `accessPassword`; reload → visibility persisted, password field placeholder
   shows the "keep current" state.
3. **Visibility clear** — set back to public; Save; reload → `hasPassword:false`.
4. **Metadata card** — assert Created/Updated/Author/Entry ID show REAL values
   (not placeholders) and Entry ID matches the URL id.
5. **List list↔grid toggle** — toggle to grid; assert grid cards render across ≥2
   content types with correct type/status; toggle to list; reload → the stored
   view is restored. This asserts the localStorage persistence 514-05 MANDATES
   (the `entries.view` key, mirroring the existing `entries.metadataHelpCollapsed`
   pattern at `EntryMetadataPanel.tsx:120-123,222`) — assert the key value AND the
   restored DOM view after reload. (Grounded: 514-05 §1/§Acceptance-1 build this;
   NOT new persistence invented by the smoke.)
6. **Publish/checklist regression** — publish flow still works in the new layout
   (checklist blocks when required field missing; publishes when satisfied);
   taxonomy quick-add + runtime preview still function.

## Docs

- `_docs/DATA_MODEL.md`: document the two new columns, the enum, the hashed
  write-only `access_password` (never selected/returned; `hasPassword` boolean
  surfaced instead), and the duplicate-entry visibility rule.
- **Migration number re-verification at land (do NOT hard-code a literal).**
  `0066` is already taken by `dashboard_layouts`; TASK-512-01 and TASK-513-01
  BOTH also target the next free slot `0067`, so 514's ACTUAL migration number is
  reallocated at land time per the strict cross-task land order (likely
  `0068`/`0069` if 512/513 land first — see 514-01 §2). At closure, read the real
  filename in `core/db/migrations/` and ensure EVERY migration-number reference —
  the `DATA_MODEL.md` note, the changelog **1227** entry, and the smoke/gate notes
  (step 5 above) — uses the number 514 actually received, NOT the `0066` literal.
- Confirm the parent + subtask files' final Status flips to ✅ Done with completion
  dates (orchestrator/owner action per board convention).

## Acceptance Criteria

1. All gates green (test / root tsc incl. tests / core types + lint / gates:coderso
   / migration).
2. All ≥6 smoke scenarios pass with visible-effect assertions, light + dark, 0
   console errors, screenshots saved.
3. `DATA_MODEL.md` note added.
4. Changelog closure recorded under the pinned number **1227** (by orchestrator).

## Deferred / Follow-ups to note in closure

- Public-front visibility ENFORCEMENT (private auth-gate / password prompt) —
  parent open question; likely a separate task touching the content render path.
- TASK-487 revision drawer + SEO extra fields slot into the seams 514 left.

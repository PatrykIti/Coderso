# TASK-479 Full Implementation — Execution Plan (2026-06-28)

Goal: deliver ALL of TASK-479 (migrate the prototype look into `core/admin`) with tests +
runtime server smoke, every scope by a FRESH agent that reads its full context. TASK-480 is
the user's (off-limits). Worktree: `/home/coder/project/Coderso-task-479` (branch
`feature/task-479`, off `feature/visual`@e0467480 which already has 478 merged + 479 spec fixes).

## Granularity & fresh-agent rule
- **Foundations (05 tokens, 06 shell):** ONE fresh agent PER LEAF, run SEQUENTIALLY (contract
  chains). Each agent reads: its leaf spec, the subtask file, the prototype (`_docs/_PROTOTYPE/`),
  the cited core code, AGENTS rules, AND the prior leaves' actual worktree changes.
- **Screens (07-29):** fresh agent PER SUBTASK (a screen = a coherent scope), run in BATCHES of
  ~3-4 clearly-disjoint screens. Each agent implements all that subtask's leaves + tests.
- A leaf/subtask agent never works outside the worktree; never touches TASK-480 / dashboard code;
  never commits (the main loop commits after gating).

## Per-agent gate (static, in the worktree — no server)
`bun --cwd core lint` + `bun --cwd core lint:types` + the targeted Vitest suites for what it
touched. Must be green before the chain advances. DB migrations (e.g. 05-L04 theme template, if
needed) use the NEXT FREE migration index at impl time + full artifacts (SQL + snapshot + journal).

## Per-area flow (main loop): implement → DRIFT-VERIFY → gate → commit → restart+smoke
1. **Implement** (per-leaf/subtask workflow).
2. **Implementation drift-verify-and-fix: >=5 FRESH agents, ONE AT A TIME (sequential, never
   concurrent — shared worktree).** Agent 1 hunts implementation drift + FIXES it + validates;
   then a NEW fresh agent re-examines the now-fixed code and fixes whatever remains; repeat
   >=5 passes (later passes should come up dry => convergence). Each pass checks: spec<->code
   fidelity (every leaf requirement actually met), AGENTS rules (token-driven NOT hardcoded
   colors; no new `any`; ESLint-9 react-hooks; adminPaths/AdminLink/prefetch; schema-first +
   normalize; cache/dirty-state; tests in correct lane), prototype fidelity, completeness/dead
   code, a11y, and regressions. Each pass leaves lint/types/vitest green.
3. **Integration gate** (me): re-run lint + lint:types + the area's Vitest; main tree untouched.
4. **Commit** the area (impl + drift fixes) in the worktree (hook = lint/types/root-tsc).
5. **RUNTIME SMOKE — RESTART the server first** (large multi-file swaps need a full restart, not
   HMR; the backend bun process never reloads): kill ports 5173/5174/3000, relaunch
   `CODERSO_WORKDIR=<worktree> coderso-dev-core-host`, wait-for-ready + white-page check, then
   `playwright-cli` the area's screens. ALWAYS pass CODERSO_WORKDIR=worktree (never bare). Front
   :3000. Creds in `.env`; `set -a && source .env` before DB tests. A full `bun test` resets the
   setup wizard — so the FULL bun runtime suite is the FINAL gate (end of 479), not per-wave.

> 479-05 was committed (d7d17764) + smoked before this >=5-agent rule was added; it gets a
> retroactive drift-verify pass together with the foundations after 479-06 lands.

## Waves (dependency order)
- **F1 — 479-05 tokens** (L01→L07 sequential). Gate + smoke (admin still renders w/ new tokens) + commit.
- **F2 — 479-06 shell** (L01→L07 sequential): primitives→patterns→sidebar→topbar→shells→CanvasEditor→tests.
  Gate + smoke (sidebar/topbar/shell render) + commit.
- **S-waves — screens, after 05+06 merged into branch.** Batches (respect cross-deps:
  13 entries←12 content-types; 23 templates←08 page-editor canvas; 08-L02 canvas reuses the
  478 PageAuthoringCanvas + the known "click-the-glyph to edit" quirk):
  - S1: 07 dashboard(shell-only; widgets=480/user), 08 pages, 09 posts, 10 menus
  - S2: 11 media, 12 engine/content-types, 13 entries, 14 custom-screens
  - S3: 15 forms, 16 listings/filters/search, 17 booking, 18 reviews
  - S4: 19 commerce, 20 popups, 21 solution-kits, 22 widget-library
  - S5: 23 page-templates, 24 plugin-store, 25 admin-ui-theme, 26 tools
  - S6: 27 admin-screens, 28 settings, 29 auth
  Each batch: per-subtask fresh agents (parallel, disjoint files) → I merge/gate/smoke/commit.
- **Final gate:** full `bun --cwd core lint` + `lint:types` + full `vitest` + full `bun test`
  (runtime; resets wizard) + `bun run gates:coderso` + full server playwright click-through;
  then task status/README/changelog closure; merge `feature/task-479` → `feature/visual`.

## Status
- 478: DONE (merged to feature/visual @7b7975d3; green + runtime-smoked).
- 479 specs: drift-fixed + committed @e0467480.
- 479 worktree: created. **F1 (tokens) firing now.**

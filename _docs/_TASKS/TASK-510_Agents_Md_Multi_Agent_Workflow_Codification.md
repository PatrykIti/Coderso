# TASK-510: AGENTS.md Multi-Agent Workflow Codification

# FileName: TASK-510_Agents_Md_Multi_Agent_Workflow_Codification.md

**Priority:** Medium
**Category:** Docs / Process
**Estimated Effort:** Small
**Dependencies:** none (codifies the process practiced in TASK-497..509)
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-04

## Overview

The multi-agent delivery process practiced across TASK-497..509 (evidence: the
23 workflow scripts in `_docs/_workflows/`) had evolved well beyond what
`AGENTS.md` codified. A gap analysis (owner-requested, 2026-07-04) compared the
de-facto process model extracted from those scripts against the written rules
and found the core covered but ~7 practiced areas missing, plus one divergence
(the worktree-preference rule vs the practiced in-place parallel streams with
collision guards). This task closes the gap by extending `AGENTS.md` so the
written rules fully cover the practiced process.

## Scope (what was added to AGENTS.md)

1. **Repo Index** — added the `_docs/_workflows/` entry (workflow scripts +
   `_smoke/` evidence directory).
2. **Task Workflow** — amended the branch/worktree bullet with the sanctioned
   alternative: in-place parallel streams under collision guards.
3. **New section `## Multi-Agent Workflow Process`** covering:
   - the standing agent-driven delivery mandate (agents author task contracts
     and implement code; orchestrator authors the workflow script and stays the
     final reviewer; agent claims verified against local files),
   - the canonical pipeline (research → author → drift-audit loop → sequential
     implement → post-audit → smoke → closure),
   - research grounding rules (seed hints are verify-only),
   - the drift-audit loop: ≥5 sequential rounds, per-file audits + ONE
     cross-subtask reconcile per round, false-clean guard, the reconcile
     check-list (single-writer ownership, identical shared shapes/enums/clamps/
     selectors/helper names/per-device representation/test names/land order/
     pinned changelog), and the oscillation protocol (surgical residual fixes +
     one final fresh reconcile; implementation only from PASS),
   - the implementation pipeline: strict sequential land order, single-writer
     file ownership, read-current-disk-state, per-subtask targeted gates with a
     ≤3-round fix loop, closure subtask owns docs only, ~5-lens post-audit with
     fix-once + re-gate,
   - **Runtime smoke (mandatory for UI/editor work)**: ≥5 distinct real-flow
     scenarios per area (owner mandate), VISIBLE-EFFECT assertions (computed
     styles/geometry/DOM state, never control presence or CSS-string presence),
     `playwright-cli` named sessions, server restart first, screenshots to
     `_docs/_workflows/_smoke/`, 0 console errors, light + dark,
   - **Parallel streams and collision guards**: disjoint file ownership,
     forbidden-paths lists, pinned changelog numbers, read-README-fresh +
     own-rows-only, never revert others' uncommitted edits, owner commits,
   - **Operational discipline**: the rg-binary misdetection trap (`Read`/
     `grep -an` on the large editor/menu files), schema-validated structured
     outputs for gate/audit/smoke agents.
4. **Implementation Rules** — two generalized contract rules: every new schema
   key must consciously join its reject-unknown allowlist AND ship a round-trip
   persistence test (fail-closed READ trap); new optional styling/config fields
   are present-only with byte-identity guards for no-override/legacy documents.
5. **Validation Rules** — deferred combined mandatory gate for parallel streams
   (full `bun run test` + `precommit:check` + `gates:coderso` + security scan
   in ONE run after all streams land) and the flake discipline (re-run the
   named failing file in isolation before declaring a real failure; fix flake
   root causes).

## Security Contract

Docs/process-only change; no route, RBAC, endpoint, schema, or migration
change. No security-sensitive behavior touched.

## Validation

- Documentation-only review: section structure verified (`## Multi-Agent
  Workflow Process` with three `###` subsections lands between Task Workflow
  and Implementation Rules; all pre-existing sections intact).
- `git diff --check` for whitespace on the touched docs.

## Evidence

- Workflow inventory: read-only analysis of all 23 `_docs/_workflows/*.mjs`
  scripts (author-audit family 500-508, implement family 497-509, fix/security
  one-offs 507/509), extracting the recurring phases, gates, guards, and owner
  mandates with per-script evidence.
- Gap matrix: covered (task files, pre/post drift passes, validation minimums,
  closure rules) vs missing (smoke mandate, authoring-loop mechanics,
  single-writer implementation pipeline, collision guards, deferred combined
  gates, fail-closed key-list rule, operational gotchas) vs divergent
  (worktree rule vs in-place + guards).

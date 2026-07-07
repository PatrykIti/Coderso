# 1219 - TASK-510 AGENTS.md Multi-Agent Workflow Codification

**Date:** 2026-07-04
**Version:** Unreleased
**Tasks:** TASK-510
**Type:** Docs/Process/Task Board

## Overview

Docs/process-only. An owner-requested gap analysis compared the de-facto
multi-agent delivery process practiced across TASK-497..509 (extracted from the
23 workflow scripts in `_docs/_workflows/`) against the written rules in
`AGENTS.md`. The core was covered, but ~7 practiced areas were missing and one
rule diverged from practice. This change codifies them so `AGENTS.md` fully
covers the practiced process.

## Changes

- `AGENTS.md` — new `## Multi-Agent Workflow Process` section:
  - standing agent-driven delivery mandate (fresh-context agents author task
    contracts and implement code; the orchestrator authors the workflow script
    and stays the final reviewer; agent claims verified against local files),
  - canonical pipeline: research → author → drift-audit loop → sequential
    implement → post-audit → smoke → closure,
  - drift-audit loop: ≥5 sequential rounds, parallel per-file audits + ONE
    cross-subtask reconcile per round, false-clean guard, the reconcile
    checklist, and the oscillation protocol (surgical residual fixes + one
    final fresh read-only reconcile; implementation only from PASS),
  - implementation pipeline: strict sequential land order, single-writer file
    ownership, read-current-disk-state rule, per-subtask targeted gates with a
    ≤3-round fix loop, docs-only closure subtask, ~5-lens evidence-backed
    post-audit with fix-once + re-gate,
  - `### Runtime smoke (mandatory for UI/editor work)`: ≥5 distinct real-flow
    scenarios per area (owner mandate), VISIBLE-EFFECT assertions (computed
    styles/geometry/DOM state — never control presence or CSS-string
    presence), `playwright-cli` named sessions, server restart first,
    screenshots to `_docs/_workflows/_smoke/`, 0 console errors, light + dark,
  - `### Parallel streams and collision guards`: disjoint file ownership +
    forbidden-paths lists, pinned changelog numbers, read-README-fresh +
    own-rows-only closure edits, never revert others' uncommitted edits, the
    owner creates git commits,
  - `### Operational discipline`: the rg-binary misdetection trap (use
    `Read`/`grep -an` on the large editor/menu files) and schema-validated
    structured outputs for gate/audit/smoke agents.
- `AGENTS.md` Repo Index — added the `_docs/_workflows/` entry (workflow
  scripts + `_smoke/` evidence directory).
- `AGENTS.md` Task Workflow — the branch/worktree bullet now names the
  sanctioned alternative: in-place parallel streams under the collision-guard
  rules (resolves the practice-vs-rule divergence).
- `AGENTS.md` Implementation Rules — two generalized contract rules: every new
  schema key must consciously join its reject-unknown allowlist AND ship a
  round-trip persistence test (fail-closed READ trap); new optional
  styling/config fields are present-only with byte-identity guards for
  no-override/legacy documents.
- `AGENTS.md` Validation Rules — parallel streams may defer the full mandatory
  gate set to ONE combined run (full `bun run test` + `precommit:check` +
  `gates:coderso` + security scan); flake discipline (re-run the named failing
  file once in isolation before declaring a real failure; fix flake root
  causes).
- `_docs/_TASKS/TASK-510_Agents_Md_Multi_Agent_Workflow_Codification.md` —
  board task (Done) with the gap matrix and evidence.

## Validation

- Documentation-only review; section structure verified (new section lands
  between Task Workflow and Implementation Rules; all pre-existing sections
  intact); `git diff --check` clean on touched docs.

## Security

No route, RBAC, endpoint, schema, or migration change; no security-sensitive
behavior touched.

# 1110 - AGENTS task workflow alignment

Date: 2026-06-04
Version: Unreleased
Tasks: TASK-408

## Key Changes

### Agent Workflow

- Expanded `AGENTS.md` task workflow rules with Coderso-local source docs,
  physical child task hierarchy, zero-padded numbering, canonical task statuses,
  read-only pre-implementation audits, post-implementation drift passes, and
  explicit egress handling for approved Claude/subagent consultation.
- Clarified parent/child closure rules so parent tasks only move to Done after
  all physical descendants are Done, Superseded, or Cancelled.

### Task Board

- Updated `_docs/_TASKS/README.md` to match the new task hierarchy, status,
  implementation pseudocode, security-contract, and drift-pass rules.
- Replaced the foreign Blender/Python/MCP `EXAMPLE_TASK.md` with a Coderso
  Bun/React/TypeScript task template.
- Corrected changelog next-number guidance after 1096 was already consumed.

### QA

- Ran a read-only Claude pre-audit with `--permission-mode plan --effort xhigh`
  after explicit user approval and verified actionable findings against local
  files before editing.
- Recorded the material audit findings in the TASK-408 closeout, including the
  final low-only drift polish for the Coderso example template and placeholder
  consistency.

## Validation

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

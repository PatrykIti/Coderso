# TASK-220-01: Baseline, Rule Policy, and Contributor Guardrails
# FileName: TASK-220-01_Baseline_Rule_Policy_and_Contributor_Guardrails.md

**Priority:** High
**Category:** Tooling + Process + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-220
**Status:** Done (2026-04-29)

---

## Overview

Lock the ESLint 9 / React Hooks Compiler baseline before code cleanup starts.
This subtask owns the rule inventory, remediation policy, and contributor
guardrails so later leaves fix implementation patterns instead of weakening lint.

## Sub-Tasks

- [ ] TASK-220-01-01: Lint Inventory and Rule Ownership
- [ ] TASK-220-01-02: React Hooks Compiler Remediation Patterns and AGENTS Guidance

## Security Contract

- Visibility: local and CI lint/tooling quality gate.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse: do not disable React Hooks Compiler rules globally; do not hide
  state/request amplification risks behind blanket lint comments.
- Secret handling: no secrets are involved.

## Testing Requirements

- Capture `bun --cwd core lint --format json` or equivalent grouped output.
- Verify `bun --cwd core lint:types` and `bun run lint:repo` remain green before
  implementation leaves begin.
- `git diff --check`

## Documentation Updates Required

- `AGENTS.md`
- `_docs/_TASKS/TASK-220_ESLint_9_React_Hooks_Compiler_Cleanup.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. TASK-220 has an actionable rule inventory with counts and root cause.
2. Contributor guidance states that the full React Hooks recommended preset
   remains enabled.
3. Later leaves can reference concrete remediation patterns and file owners.

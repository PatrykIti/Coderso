# TASK-220-01-01: Lint Inventory and Rule Ownership
# FileName: TASK-220-01-01_Lint_Inventory_and_Rule_Ownership.md

**Priority:** High
**Category:** Tooling + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-220-01
**Status:** In Progress (2026-04-27)

---

## Overview

Keep a reproducible inventory of the ESLint 9 failures so implementers can work
from the current checked-out baseline and avoid stale assumptions.

## Sub-Tasks

- [ ] Run `bun --cwd core lint --format json --output-file /tmp/nextless-eslint-report.json "{admin,server,services,ui,db,plugins,store}/**/*.{ts,tsx}"`.
- [ ] Group failures by rule, file, and remediation family.
- [ ] Confirm whether `bun --cwd core lint:types` and `bun run lint:repo` are
  clean at the start of the implementation run.
- [ ] Update this task family if counts change before implementation starts.

## Files to Change

- `_docs/_TASKS/TASK-220_ESLint_9_React_Hooks_Compiler_Cleanup.md`
- `_docs/_TASKS/TASK-220-*.md`
- `_docs/_TASKS/README.md`

## Security Contract

- Visibility: local lint evidence only.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse: the inventory must distinguish direct security findings from
  resilience/correctness risks such as request amplification and dirty-state
  overwrites.
- Secret handling: do not persist environment values or browser credentials in
  lint artifacts.

## Pseudocode

```bash
bun --cwd core lint --format json \
  --output-file /tmp/nextless-eslint-report.json \
  "{admin,server,services,ui,db,plugins,store}/**/*.{ts,tsx}"

node scripts-or-oneoff-summary.js /tmp/nextless-eslint-report.json
```

## Testing Requirements

- `bun --cwd core lint` still reports only the tracked React Hooks Compiler
  failures before code cleanup begins.
- `bun --cwd core lint:types`
- `bun run lint:repo`
- `git diff --check`

## Documentation Updates Required

- TASK-220 umbrella rule table and file grouping if the baseline changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Every current lint failure is assigned to exactly one implementation leaf as
   its primary owner.
2. Counts are recorded by rule and file family.
3. No code behavior is changed by this inventory leaf.

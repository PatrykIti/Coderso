# TASK-220-01-02: React Hooks Compiler Remediation Patterns and AGENTS Guidance
# FileName: TASK-220-01-02_React_Hooks_Compiler_Remediation_Patterns_and_AGENTS_Guidance.md

**Priority:** High
**Category:** Process + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-220-01
**Status:** To Do

---

## Overview

Document the repo policy for the new React Hooks Compiler lint surface. The
goal is to keep `eslint-plugin-react-hooks` recommended rules enabled while
giving implementers clear patterns for fixing `set-state-in-effect`,
`preserve-manual-memoization`, and `refs` findings.

## Sub-Tasks

- [ ] Update `AGENTS.md` with React Hooks Compiler cleanup guidance.
- [ ] State that Vite 8 did not introduce the behavior change; the new findings
  come from the upgraded hooks lint preset.
- [ ] Ban blanket rule downgrades and production fallbacks that only satisfy
  tests/lint.
- [ ] Document preferred patterns: lazy initializers, render-time derivation,
  reducers, event handlers, subscription callbacks, and async result boundaries.

## Files to Change

- `AGENTS.md`
- `_docs/_TASKS/TASK-220_ESLint_9_React_Hooks_Compiler_Cleanup.md`
- `_docs/_TASKS/README.md`

## Security Contract

- Visibility: contributor/process guidance only.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse: explicitly preserve lint rules that detect request amplification,
  stale refs, dirty-state overwrite, and render repair loops.
- Secret handling: not applicable.

## Pseudocode

```md
For admin React/UI work under ESLint 9 and React Hooks Compiler rules:
- do not weaken the full hooks recommended preset,
- do not use effects to repair state derived from props/state,
- keep external-system synchronization in subscriptions or async callbacks,
- preserve cache hydration and dirty-state contracts.
```

## Testing Requirements

- `git diff --check`
- No runtime tests required for guidance-only edits.

## Documentation Updates Required

- `AGENTS.md`
- TASK-220 umbrella notes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. The contributor rules explain why the findings must be fixed rather than
   suppressed.
2. The guidance remains implementation-neutral and does not require a specific
   one-off workaround.
3. Later code leaves can reference the policy directly.

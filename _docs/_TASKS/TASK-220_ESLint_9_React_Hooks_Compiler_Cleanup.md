# TASK-220: ESLint 9 React Hooks Compiler Cleanup
# FileName: TASK-220_ESLint_9_React_Hooks_Compiler_Cleanup.md

**Priority:** High
**Category:** Tooling + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-219
**Status:** To Do

---

## Overview

Finish the source cleanup required by the full `eslint-plugin-react-hooks` recommended preset enabled during the ESLint 9 upgrade. The new baseline keeps file scope broad through the existing core lint script:

```bash
bun --cwd core lint
```

Current state after enabling the full preset on 2026-04-27: the command reports 113 errors. Most findings are React Hooks/Compiler rules such as:

- `react-hooks/set-state-in-effect`
- `react-hooks/preserve-manual-memoization`

This task is intentionally separate from `TASK-219`: dependency CVEs are already remediated and scanners are clean, while this task owns the broader React hook and memoization cleanup surfaced by the stricter lint policy.

## Sub-Tasks

- [ ] Group failures by rule and component family before editing.
- [ ] Fix `react-hooks/set-state-in-effect` cases by moving derived state to render-time derivation, lazy initializers, reducers, or event/subscription boundaries where appropriate.
- [ ] Fix `react-hooks/preserve-manual-memoization` cases by narrowing dependency arrays to the exact values read inside memo callbacks or removing unnecessary manual memoization.
- [ ] Keep existing admin cache hydration behavior intact while refactoring effects.
- [ ] Add or update focused Vitest coverage for any behavior-sensitive admin/UI changes.

## Files to Change

- `core/admin/**/*.tsx`
- `core/admin/**/*.ts`
- `tests/vitest/**` for focused UI/admin coverage where behavior changes.
- `_docs/_TASKS/README.md` and changelog on completion.

## Security Contract

- Visibility: local and CI lint/tooling quality gate.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - do not disable the new React Hooks/Compiler recommended rules to make lint pass,
  - do not replace behavior with production fallbacks only to satisfy lint,
  - preserve admin cache hydration, background refresh, dirty-state, and route behavior while refactoring effects.
- Secret handling: no secrets or privileged settings may be moved into browser-visible caches or debug output.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`
- Focused Vitest suites for touched admin/UI surfaces.
- `bun run test:vitest` after broad shared-hook or shared-admin changes.
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. `bun --cwd core lint` passes with the full `eslint-plugin-react-hooks` recommended preset enabled.
2. No new rule disable is added without a narrow code comment explaining an unavoidable React contract exception.
3. Admin/UI behavior affected by effect and memoization refactors has focused test coverage.
4. Existing typecheck and relevant Vitest lanes pass.

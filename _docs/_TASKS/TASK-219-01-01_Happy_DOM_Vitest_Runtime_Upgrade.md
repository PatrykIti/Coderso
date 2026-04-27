# TASK-219-01-01: Happy DOM Vitest Runtime Upgrade
# FileName: TASK-219-01-01_Happy_DOM_Vitest_Runtime_Upgrade.md

**Priority:** High
**Category:** Security + Test Infrastructure
**Estimated Effort:** Medium
**Dependencies:** TASK-219-01
**Status:** To Do

---

## Overview

Upgrade the direct `happy-dom` devDependency used by the Vitest lane so the lockfile no longer resolves vulnerable `happy-dom@17.6.3`.

Scanner findings to close:
- `happy-dom <20.0.0`: critical VM context escape.
- `happy-dom <20.8.8`: high JavaScript expression injection.
- `happy-dom <20.8.9`: high cookie/fetch information disclosure.

Target policy: use `^20.8.9` or a newer stable fixed line. Do not downgrade scanner coverage or keep the old version through an allowlist.

## Sub-Tasks

- [ ] Confirm current owner with `bun pm why happy-dom`.
- [ ] Update root `package.json` `devDependencies.happy-dom` to a fixed version.
- [ ] Refresh `bun.lock`.
- [ ] Fix Vitest setup/helpers only if happy-dom 20 behavior requires it.
- [ ] Prove the Vitest lane still passes.

## Files to Change

- `package.json`
- `bun.lock`
- `tests/setup/vitest.ts` only if happy-dom behavior changes require it.
- `tests/vitest/**` only for legitimate test compatibility fixes.

## Security Contract

- Visibility: test-only DOM runtime.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - do not keep `happy-dom@17.x`,
  - do not replace happy-dom with a weaker or unmaintained DOM shim,
  - do not silence failing tests if happy-dom 20 reveals a real DOM contract issue.
- Secret handling: no secrets or registry tokens may be committed.

## Pseudocode

```bash
bun pm why happy-dom
# patch package.json:
# "happy-dom": "^20.8.9"
bun update happy-dom@^20.8.9
rg -n '"happy-dom": \\["happy-dom@17\\.' bun.lock
bun run test:vitest
```

If Vitest fails after the upgrade:

```ts
// Fix test setup/helpers at the contract boundary.
// Prefer updating tests/setup/vitest.ts or focused test expectations over
// changing production code for test-runner-only behavior.
```

## Testing Requirements

- `bun pm why happy-dom`
- `rg -n '"happy-dom": \\["happy-dom@17\\.' bun.lock` returns no rows.
- `bun audit --audit-level high`
- `bun run test:vitest`
- `bun run lint:repo:types`
- `git diff --check`

## Documentation Updates Required

- Parent `TASK-219` progress note on completion.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `happy-dom` is resolved to `20.8.9` or newer fixed stable version.
2. `happy-dom` no longer appears in `bun audit --audit-level high`.
3. Vitest passes or any failures are fixed in the owning test/setup files.
4. No production runtime code changes are made only to satisfy happy-dom.

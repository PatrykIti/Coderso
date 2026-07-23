# TASK-539-07: Per-Root Idempotent Effects Runtime

# FileName: TASK-539-07-Per-Root-Idempotent-Effects-Runtime.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / Browser Runtime / Reliability
**Estimated Effort:** Large
**Dependencies:** TASK-539-04, TASK-539-05, TASK-539-06
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Goal

Replace the global one-shot initializer with a reusable global runtime state whose
initializer rescans the supplied document/root and binds each discovered element once.
This lets a later-parsed footer initialize after main without duplicating document
listeners or element handlers.

## Leaves

| Leaf | Scope | Status |
|---|---|---|
| TASK-539-07-L01 | Sole runtime-source implementation | ⏳ To Do |
| TASK-539-07-L02 | Main/footer parser-order and idempotence proof | ⏳ To Do |

## Ownership

L01 solely owns `core/services/pages/pageEffectsRuntime.ts` and compatibility/
changed-behavior updates in all three named runtime/shell suites before its source gate.
L02 owns only additive parser-order/idempotence cases, reruns L01 assertions read-only,
and cannot re-baseline them. No renderer/site-shell source is changed.

## Security Contract

The emitted runtime remains a static literal. It uses no eval, Function, dynamic code,
author-data HTML, network request, or storage. Selectors are fixed literals. Motion
still obeys reduced-motion and pointer capability, while accessibility interactions
remain available without motion.

## Acceptance

- Main then footer both bind in parser order.
- Repeated initialization never duplicates listeners/actions.
- Tilt and magnetic write only their transform custom properties.
- No global all-or-nothing early return remains.
- Footer-only/main-only and no-effect pages retain behavior.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/pageEffectsRuntime.test.ts tests/vitest/content/task-534-interactivity-runtime.test.tsx tests/vitest/site/page-runtime-shell-branch.test.tsx
git diff --check
```

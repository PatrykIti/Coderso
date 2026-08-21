# TASK-542-04-L01: Six Cross-Device Publish-Front Flows and Closure

# FileName: TASK-542-04-L01-Six-Cross-Device-Publish-Front-Flows-And-Closure.md

**Parent Task:** TASK-542
**Parent Subtask:** TASK-542-04
**Priority:** High
**Category:** Testing / Documentation / Smoke / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-542-01-L01, TASK-542-02-L01, TASK-542-03-L01..L03
**Status:** ✅ Done
**Completed:** 2026-08-21
**Changelog:** 1319 (pinned; closure only)

---

## Exclusive ownership

- read-only rerun of L01-owned
  `tests/vitest/services/public-navigation-projection.test.ts`
- additive TASK-542 consumer/integration changes to the other existing test files listed
  in the Required test matrix below; do not edit or rebaseline any source-leaf-owned test
- relevant menu model/runtime/developer/user docs
- `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`
- TASK-542 task-scoped screenshots under the currently supported
  `_docs/_workflows/_smoke/` path
- TASK-542 statuses, board/statistics, pinned changelog 1319 at closure

## Implementation Pseudocode

```text
assert all source leaves and their direct changed-behavior tests landed in order after TASK-541 and TASK-539
rerun the read-only pure projection owner suite
add table-driven model/CSS/front/editor consumer and integration regressions only in
  closure-owned existing files
run targeted Vitest and Bun lanes; rerun each named failure once
return real defects to the exclusive source owner and repeat gates
restart Bun server, publish synthetic menus, exercise all device/depth/reset flows
record computed-style/geometry/ARIA assertions, console errors, screenshot paths and
hashes in TASK-542 closeout evidence using the current workflow contract
update declared docs/cache maps
create changelog 1319 and close all physical descendants only after graph/gates pass
```

## Required test matrix

```text
tests/vitest/services/menu-document-v2.test.ts
tests/vitest/services/public-navigation-projection.test.ts
tests/vitest/site/menu-document-css-542.test.ts
tests/vitest/site/siteShell.test.tsx
tests/vitest/ui/menu-design-editor.test.tsx
tests/vitest/admin/menusClient.test.ts
tests/vitest/validation/menuSchemas.test.ts
tests/unit/menus/menuService.test.ts
tests/unit/site/menu-document-render.test.tsx
tests/integration/routes/menus.test.ts
tests/integration/runtime/site-shell-runtime.test.ts
```

The named public-projection file is the pure owner suite landed by TASK-542-03-L01; this
closure leaf has no write authority over it and reruns it unchanged. Pin write rejection
paths and untouched persistence, repeated-read deterministic
IDs, every OFF/reset combination, zero-byte unauthored cases, exact one current
identity, responsive-only scroll gate, cache no-clobber, and narrow structure
navigation guard.

## Real browser smoke

Restart the Bun server and use a task-scoped Playwright CLI session. Minimum
distinct flows, each with light/dark coverage where applicable and zero console
errors:

1. Reject malformed write; repeatedly open a missing-ID legacy fixture and prove
   stable resulting identities without persistence rewrite.
2. Publish desktop effects ON and tablet explicit OFF; assert computed divider,
   indicator, underline, caret, transform/transition, and flyout reachability.
3. Set L1 ON and L2 OFF in a deep menu; assert L2 computed styles do not inherit.
4. Author padding X-only then Y-only; assert the other computed axis is 6 px and
   no-authored-padding remains baseline.
5. Author responsive iconColor and responsive-only sticky scrolled surface;
   resize/scroll and assert computed color/header state.
6. Compare Design anonymous projection to published front, including hidden/dead
   branches and duplicate href; assert exactly one `aria-current="page"`.
7. At 320/390/480 px assert usable canvas/panel geometry and dirty Structure
   cancel/confirm; inject a remote cache update and prove draft no-clobber.

Use visible-effect assertions, not mere selector text. TASK-545 lands later and governs
future durable manifests; TASK-542 must not depend on its not-yet-landed schema,
validator, or `.gitignore` exception, and TASK-545 must not fabricate retroactive
TASK-542 evidence.

## Validation and closure

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx tsc -p tsconfig.json --noEmit
bunx vitest run tests/vitest/services/menu-document-v2.test.ts \
  tests/vitest/services/public-navigation-projection.test.ts \
  tests/vitest/site/menu-document-css-542.test.ts \
  tests/vitest/site/siteShell.test.tsx \
  tests/vitest/ui/menu-design-editor.test.tsx \
  tests/vitest/admin/menusClient.test.ts \
  tests/vitest/validation/menuSchemas.test.ts
set -a && source .env && set +a
bun test tests/unit/menus/menuService.test.ts \
  tests/unit/site/menu-document-render.test.tsx \
  tests/integration/routes/menus.test.ts \
  tests/integration/runtime/site-shell-runtime.test.ts
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
bun run gates:coderso
git diff --check
```

Create exactly
`_docs/_CHANGELOG/1319-{YYYY-MM-DD}-task-542-menu-determinism-responsive-runtime-parity.md`
using the actual UTC closure date, update fresh indexes/statistics,
then close every TASK-542 descendant. No closure with deferred smoke.

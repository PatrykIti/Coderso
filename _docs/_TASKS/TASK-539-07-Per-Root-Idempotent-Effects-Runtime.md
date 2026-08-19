# TASK-539-07: Per-Root Idempotent Effects Runtime

# FileName: TASK-539-07-Per-Root-Idempotent-Effects-Runtime.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / Browser Runtime / Reliability
**Estimated Effort:** Large
**Dependencies:** TASK-539-04 through TASK-539-06
**Status:** ⏳ To Do
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Goal

Replace the all-or-nothing flag guard with one reusable
`window.__codersoPageEffectsV2` controller. Every emitted script calls
`init(root)`, later main/footer markup is discovered, global listeners are installed
once, and each element is bound once through binder-specific `WeakSet` ownership.

TASK-539 may start only after TASK-540 is terminal and a fresh read-only audit passes
against the post-TASK-540 HEAD and complete dirty state.

## Leaves

| Leaf | Scope | Status |
|---|---|---|
| TASK-539-07-L01 | Sole runtime source and focused compatibility tests | ⏳ To Do |
| TASK-539-07-L02 | New focused rescan/parser-order suite only | ⏳ To Do |

## Ownership

L01 solely owns `core/services/pages/pageEffectsRuntime.ts`, the four existing focused
runtime suites named in its leaf. It may not change site-shell source or renderer
source/comments. Renderer commentary and emit predicates belong to TASK-539-05.

L02 creates only
`tests/vitest/pages/task-539-page-effects-runtime-rescan.test.tsx`. It treats L01
source/tests and every renderer/site-shell file as read-only.

## Security Contract

The emitted runtime remains one static dependency-free literal. It uses fixed
selectors and validated DOM data/custom properties only: no interpolation of stored
data, `eval`, `Function`, `innerHTML`, network, or storage. There is no route, auth,
RBAC, CSRF, rate-limit, nonce, captcha, or public-write change. Functional
switcher/gallery behavior remains available under reduced motion; motion behavior
remains reduced-motion and pointer-capability gated.

## Acceptance

- Every script reuses or installs `window.__codersoPageEffectsV2` and invokes
  `init(document)`; the old exported flag is observation-only and is never read to
  skip work.
- Every binder owns a `WeakSet`, marks only after successful binding, and isolates
  per-binder/per-element failures.
- Document/window globals bind once; the controller retains no strong element arrays.
- Main then footer and footer then main both bind; repeated scripts and explicit init
  calls do not duplicate actions.
- Switcher/gallery bind before the reduced-motion branch; all motion binders run only
  after it.
- Spotlight queries the exact `[data-page-spotlight]` Page-root hook inside the
  supplied scan root and writes only `--spotlight-x`/`--spotlight-y` on that matched
  root. `[data-page-spotlight-overlay]` is a painted consumer, never a binder
  candidate. Main and footer owners remain root-local and coexist without cross-write.
- All seven binders import and honor the shared marquee-replica selector, excluding
  replica-self and replica descendants before setup while preserving primary
  behavior. The renderer emits that replica only for the recursively safe subtree
  defined by TASK-539-05; form/listing/embed/video or nested-marquee subtrees take
  the one-segment path, so this runtime does not widen into their global binders.
- Tilt and magnetic write/reset only their fixed transform custom properties, never
  the whole `transform`.
- Existing no-effect, main-only, and footer-only behavior fails soft with zero console
  errors.

## Validation

Run both leaves' exact Vitest inventories, then:

```bash
bun --cwd core lint:types
bun --cwd core lint
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

Rerun a named failing file once in isolation before classifying it.

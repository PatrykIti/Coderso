# TASK-539-08: Tests, Docs, Smoke, and Closure

# FileName: TASK-539-08-Tests-Docs-Smoke-And-Closure.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / Validation / Documentation / Closure
**Estimated Effort:** Large
**Dependencies:** TASK-539-01 through TASK-539-07
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only here after implementation validation)

---

## Goal and ownership

Close the landed Page changes with one new focused Bun runtime suite, current
source-of-truth/user documentation, exact aggregate gates, about five fresh
post-audit lenses, nine visible-effect browser flows, and synchronized TASK-539
closure artifacts. This subtask must not reopen production source contracts.

TASK-539 cannot begin merely because TASK-540 source is present: TASK-540 must be
terminal, then a fresh read-only TASK-539 start audit must pass against the
post-TASK-540 HEAD, complete dirty state, task graph, source/tests/docs, and diff.
Before the first TASK-539 source edit, `task-539-implement.mjs` pins that verified
baseline for the family line gate.

## Leaves

| Leaf | Scope | Status |
|---|---|---|
| TASK-539-08-L01 | Runtime parity suite, docs, aggregate gates, audits, smoke, closure | ⏳ To Do |

## Ownership

L01 creates only
`tests/integration/runtime/task-539-page-parity-runtime.test.ts`; it must not edit the
legacy oversized `tests/integration/runtime/pages-runtime.test.ts` and runs that suite
read-only. Existing `site-shell-runtime.test.ts` is also read-only.

L01 owns only the five named Page docs, TASK-539 status/board/changelog artifacts,
changelog 1251, and `task-539-*` smoke screenshots. It may not edit production source,
another task family, or TASK-545 artifacts. In the current concurrent tree it must
also preserve `_docs/_TASKS/TASK-548*.md`, `_docs/_workflows/task-548-*.mjs`,
`_docs/_CHANGELOG/1261-*`, the changelog-1261 index row, and the TASK-548 board
row/statistics bytes. `_docs/SECURITY_SPEC.md` and
`docs/guide/screens/page-editor-preview-settings-and-history.md` are shared future
writer paths with TASK-548-07-L01 and TASK-548-06-L01. TASK-539 must land both
document edits before either of those TASK-548 writer leaves starts; then TASK-548
reads the landed bytes and owns its final compiler/report/coverage sequence. The task
board is the reciprocal ordering authority:
`TASK-539-08-L01 → TASK-548-06-L01/TASK-548-07-L01`. Immediately before the shared
edits, both TASK-548 leaves must still be `⏳ To Do`; otherwise TASK-539
documentation/closure hard-blocks pending a new explicit cross-family coordination
contract. TASK-539 never edits the guide after TASK-548 starts its migration.

## Security Contract

No endpoint or source behavior changes. The new suite validates existing internal
`/admin/api/*` Page paths through real requests to
`startHttpServer({port:0})`, never a directly invoked route handler. It uses the
resolved Admin prefix, configured `site.adminBaseUrl` Host, three uniquely owned
reader/writer/publisher role assignments, real session cookies, and real CSRF tokens.
It exactly snapshots/restores raw `security.settings`, forces an enabled canonical
CSRF, bounded `admin_write`, and bot-disabled Form fixture with cache resets, and
sends one unique owned allowlisted `/32` through `X-Forwarded-For` without touching
foreign allowlist rows.
Create/update/autosave require `content:write`, publish requires
`content:publish`, and PageDocumentV2 validation rejects unknown fields. The suite
proves the expected 401/403/400 failures produce zero owned
Page/revision/autosave/audit mutation before proving authorized
create/update/autosave/publish.

TASK-539 does not claim or add API-key authentication. Public Page render is
read-only and no public write is introduced, so nonce/HMAC/captcha policy is not
applicable to a new endpoint. CSS stays allowlisted; the effects runtime stays a
static literal; and an unsafe marquee subtree cannot duplicate the existing
nonce-bearing form surface. The suite creates and exactly cleans one published public
Form plus fields and one saved listing query filtered to an exact owned actor; a
paired `filters` block owns the resolved count/filter-form surface while a `collection`
block sharing that query ID owns the visible actor row, with exactly one
document-level listing-runtime script. A
nonlogged test-local form nonce secret is restored in unconditional cleanup. No raw
exploit payload, credential, token, nonce, log, user data, or scanner exception is
recorded. `tests/integration/routes/pages.test.ts` remains direct
route/schema/service proof only and is never cited as HTTP middleware evidence.
Footer-template and shell-setting setup/cleanup follow the existing direct-service
fixture pattern. If changed to handler coverage, they additionally require
`content:write` and `settings:write` respectively, with the same session, CSRF,
`admin_write`, and strict-schema enforcement.

## Acceptance

- Every source leaf and its exact targeted lane passes.
- The exhaustive DB preflight covers the named legacy runtime suites plus public
  route/theme/SEO resolution and the new Page/Form/listing/security fixtures before
  the route/runtime suites; a skip, missing table, or unreachable DB blocks closure
  and is rerun after recovery.
- Workflow syntax/self-tests and the baseline-through-final family line gate pass with
  every touched human-authored production/test file at no more than 1,000 lines.
- Admin/site builds, admin checks, full test/coverage/precommit/release/security gates,
  and diff check pass.
- About five fresh audit lenses return no unresolved finding. A LOW may be deferred
  only through a concrete execution-ready TASK-9999 leaf with exact proof of zero
  user-visible/accessibility effect and zero data/security/privacy/auth/RBAC/API/
  persistence/migration/performance/reliability/test-integrity impact.
- Nine real flows cover the complete visible contract in light/dark where applicable,
  save/publish/front parity, screenshots, and zero console errors. At tablet and
  mobile, a real approved two-segment marquee must show equal computed
  frame/element/text styling and hoisted tilt/layer geometry in primary and replica
  while retaining isolated identity hooks. Its outer authored group alone owns the
  singular canonical legal grid span outside both segments; duplicated descendants
  show no grid hook/alias/span CSS. Browser smoke uses the product-reachable
  main→footer order and later-node rescans; the reverse parser order remains an exact
  fixed-DOM TASK-539-07-L02 Vitest proof and is not fabricated in Playwright.
- All five docs, descendants, board statistics/indexes, and changelog 1251 are
  synchronized without a TASK-545 exception.

## Validation

The executable leaf contains the exact ordered command and closure contract.

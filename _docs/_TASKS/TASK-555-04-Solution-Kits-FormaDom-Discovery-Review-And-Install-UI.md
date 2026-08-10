# TASK-555-04: Solution Kits FormaDom Discovery Review and Install UI
# FileName: TASK-555-04-Solution-Kits-FormaDom-Discovery-Review-And-Install-UI.md

**Parent Task:** TASK-555
**Priority:** High
**Category:** Admin UI / Solution Kits / Cache / Accessibility
**Estimated Effort:** Large
**Dependencies:** landed TASK-555-03-L03 receipt; terminal TASK-489 UI;
landed TASK-551-09-L04 FINAL cache-authority receipt
**Status:** ⏳ To Do

---

## Overview

Adopt the shared curated-starter DTO in the Admin client/cache and build the
FormaDom discovery, detail, preview, reviewed confirmation, apply result, and Open
site components consumed by the Solution Kits page. Preserve terminal TASK-489
history/rollback behavior. Remove the false implication that a fixed starter must be
installed through LLM Guide; natural-language bespoke creation remains Designer-only.

TASK-555-06-L03, not this child, is the sole writer that composes these components
and installed-status UI into `SolutionKitsPage.tsx`.
Components are host-neutral and expose explicit additive `discovery`, `review`, and
`lifecycle` host regions; they do not import `SolutionKitsPage`, Setup, or TASK-489 UI.

## Sub-Tasks

| Order | Leaf | Scope | Status |
|---|---|---|---|
| 1 | TASK-555-04-L01 | shared client/cache/catalog identity and valid sixth legacy ID | ⏳ To Do |
| 2 | TASK-555-04-L02 | FormaDom card/detail/resources/residuals/preview components | ⏳ To Do |
| 3 | TASK-555-04-L03 | reviewed confirmation/apply/result/Open site components and provider-free copy | ⏳ To Do |

## UX Invariants

- All seven registry entries render from API data; no local kit tuple duplicates the
  server registry.
- FormaDom clearly shows `Full-site package`, version, compatibility, locale,
  resource counts, and all seven residuals before apply.
- Apply is unavailable until a successful current preview exists and the explicit
  settings-takeover confirmation completes.
- `ConfirmActionDialog` owns the high-impact confirmation. No `window.confirm` or
  inert button is allowed.
- Success shows run ID, effective name/locale, warnings/validation state, and a real
  Open site action. Failure retains preview/retry state safely.
- No package, preview proof, raw run snapshot, or validation internals enter browser
  persistence. Safe list/options/detail/status summaries use only the pinned
  identity/user/auth-epoch-scoped TASK-555 keys and TTLs from L01, with no negative
  caching and dirty-safe background revalidation.
- Provider-offline state does not disable or relabel fixed starter controls.

## Security Contract

- **Visibility:** browser consumes only internal TASK-555 routes.
- **Auth/RBAC:** server is authoritative; UI hides/disables writes without
  `solution-kits:write` and `settings:write` as defense in depth.
- **CSRF/rate limit:** shared client uses CSRF for POST; GET uses normal Admin reads.
- **Validation:** shared strict normalizers reject malformed/unknown response shapes.
- **Anti-abuse:** no public flow, nonce, or CAPTCHA; no raw fetch or arbitrary URL.
- **Privacy:** no package/snapshot/raw idempotency/provider data is cached or logged.

## Collision Guard

TASK-489 must be terminal before these files are edited. Its history/rollback labels
and safe DTO are preserved, not reimplemented. TASK-554 and any shared Admin writer
must be terminal/disjoint. TASK-414/489/545/547/548/551/554 task files, assistant UI, foreign
changelogs, and indexes are forbidden.

## Testing Requirements

- Vitest client/cache/strict-normalizer and happy-dom component tests.
- Complete apply/validate/rollback invalidation matrix tests include terminal TASK-489
  global/package pages and exact source/result details through its exported helper.
- Light/dark, keyboard/focus, permission gating, stale preview, confirm, successful
  response, warnings, retry, and no-provider-state coverage.
- Core lint/types, admin boundary, focused tests, line counts, diff check.

## Documentation Updates Required

Closure updates Solution Kits user/developer docs and Admin cache maps. This child
does not edit documentation or indexes.

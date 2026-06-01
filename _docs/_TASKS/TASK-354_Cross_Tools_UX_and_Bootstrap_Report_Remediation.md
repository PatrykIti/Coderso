# TASK-354: Cross Tools UX and Bootstrap Report Remediation
# FileName: TASK-354_Cross_Tools_UX_and_Bootstrap_Report_Remediation.md

**Priority:** High
**Category:** Admin Tools + UX Consistency + Auth Bootstrap + Playwright + QA + Docs
**Estimated Effort:** Very Large
**Dependencies:** TASK-347, TASK-348, TASK-349, TASK-350, TASK-351, TASK-352, TASK-353
**Status:** To Do

---

## Overview

Close the cross-cutting findings from:

- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_CLAUDE_UX_REVIEW.md`

The six per-tool families own their local fixes. This family owns shared
consistency and drift prevention:

- A visible control must either do real work or be disabled/removed with
  accessible explanation.
- Empty states across Tools must name cause and next action.
- Long-running or async states must explain queued/running/failed/no-data
  status.
- Checkbox/option groups must be controlled and must change submitted payloads,
  or be removed/disabled as static explanatory copy.
- Admin-saved data must be proven against its runtime effect where the product
  claims a runtime effect.
- The local `db:seed:admin` path must hash passwords through the same
  pepper-aware helper used by login.
- A reusable Playwright/report matrix must prevent the next Tools audit from
  missing clickable controls, no-op buttons, or stale report classifications.

This planning wave creates **28 execution leaf tasks** across TASK-348 through
TASK-354, satisfying the requested minimum of 20 refinements.

## Cross-Report Finding Matrix

| Finding | Primary family | Cross-tools owner |
|---|---|---|
| UI-only buttons | TASK-349, TASK-350, TASK-352, TASK-353 | TASK-354-01 defines and verifies the shared action-availability rule. |
| Controlled option groups / payload truthfulness | TASK-349-02, TASK-351-01, TASK-352-01 | TASK-354-01 adds the shared rule that toggles must affect payloads or become unavailable/static. |
| Weak/ambiguous empty states | TASK-348, TASK-349, TASK-350, TASK-352, TASK-353 | TASK-354-01 standardizes cause + next action. |
| Long-running queued/progress states | TASK-349, TASK-351, TASK-352 | TASK-354-02 standardizes queued/running/failed/no-data treatment. |
| Persisted admin data not reaching runtime | TASK-349, TASK-351, TASK-353 | TASK-354-04 requires matrix evidence for SEO public HTML, Backups worker/artifact boundary, and Redirect public responses. |
| Seed admin unusable with `AUTH_PASSWORD_PEPPER` | No per-tool family | TASK-354-03 owns the bootstrap credential fix. |
| Report drift and shallow first pass | All tool families | TASK-354-04 owns durable Playwright matrix and report drift guard. |

## Sub-Tasks

- [ ] TASK-354-01: Admin Tools Empty State and Action Availability Standard
- [ ] TASK-354-02: Admin Tools Long-Running Operation Feedback Standard
- [ ] TASK-354-03: Seed Admin Pepper-Aware Bootstrap Credentials
- [ ] TASK-354-04: Tools Playwright Regression Matrix and Report Drift Guard
- [ ] TASK-354-05: Cross Tools QA, Docs, and Closure

## Implementation Order

1. Land shared UX standards after at least one per-tool family starts
   implementation, so the standard is grounded in actual components.
2. Fix seed-admin independently; it is a bootstrap/auth correctness issue and
   does not depend on UI work.
3. Add the Playwright/report drift guard after per-tool fixes expose stable
   expected states.
4. Close only when the six per-tool families either finish or publish explicit
   residual evidence.

## Security Contract

This umbrella may touch auth bootstrap and admin UI standards:

- Endpoint visibility: no new public write endpoints.
- Auth model: seed-admin remains local/server-side tooling; admin Tools routes
  keep existing session auth.
- RBAC/CSRF/rate-limit: unchanged unless a leaf explicitly adds a route and
  documents it.
- Reject-unknown validation: shared standards must preserve strict schemas in
  each tool family.
- Anti-abuse: no nonce/HMAC/reCAPTCHA changes except preserving existing public
  write rules.
- Secret handling: seed-admin must never log plaintext passwords, pepper values,
  session tokens, or provider/storage secrets.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/tools/packageScripts.test.ts`
- New Bun/Vitest tests named by leaves for seed-admin and shared UI standards
- Focused Playwright pass across Search, SEO Manager, Analytics, Backups,
  Import / Export, and Redirects after per-tool remediation
- `bun run precommit` or configured commit hook before closure commits

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_CLAUDE_UX_REVIEW.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md`
- Per-tool reports only when cross-family standards alter their classification
- Local setup docs for seed-admin if behavior changes
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Cross-tools UX standards are executable through tests, not only prose.
- Seed-admin credentials work with and without `AUTH_PASSWORD_PEPPER`.
- Future Tools Playwright audits have a matrix that checks route reachability,
  no-op controls, controlled payload options, runtime-effect evidence, empty
  states, async states, and report classifications.
- No per-tool finding remains hidden under a generic cross-tools bucket.

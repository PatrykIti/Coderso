# TASK-546-03: Server Smoke, Docs, and Closure

# FileName: TASK-546-03-Server-Smoke-Docs-And-Closure.md

**Parent Task:** TASK-546
**Priority:** High
**Category:** Runtime Validation / Security / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-546-04-L03
**Status:** ✅ Done
**Completed:** 2026-07-22
**Changelog:** 1259 (pinned; closure only)

---

## Scope

Validate the final integrated graph after TASK-546-04, start the built Bun
server, smoke the literal `/peri` request, run the complete quality/security
gate set, and close TASK-546 with exact evidence. `/peri` is not an invented
health route: if no route is registered, a controlled non-5xx `404` is the
expected successful smoke outcome.

## Leaf

| ID | Title | Status |
|---|---|---|
| TASK-546-03-L01 | Validate Build, Security, and Peri Smoke | ✅ Done |

## Ownership

The executable leaf owns final validation/smoke evidence, changelog 1259, the
ten TASK-546 descendant statuses (four children plus six leaves), the TASK-546
parent status, and exact
TASK-546-only board/changelog-index deltas after fresh reads. It does not reopen
manifests, locks, Docker/CI pins, production compatibility code, TASK-546-04
workflow/test remediation, or L01's version-specific docs/tests.

## Security Contract

- No route, endpoint visibility, auth, RBAC, CSRF, rate-limit, nonce/HMAC,
  captcha, validation, or anti-abuse behavior changes during closure.
- The smoke uses only local requests and records no cookies, authorization
  headers, credentials, environment values, or response bodies containing
  sensitive data.
- Strict security gates must pass without allowlists, suppressions, or ignores.
  The separate TASK-545-owned TASK-522 workflow finding must already be
  remediated in the shared final tree; this closure leaf must not edit it or any
  TASK-546-04 source/test file to obtain a pass.
- Record exact local CodeQL-regression commands/results for the TASK-540,
  TASK-543, and Forms fixes and the complete `scan:security:strict` result. A PR
  CodeQL rerun against the pushed commit is authoritative for remote alert
  state. When the final tree has not been pushed, record that rerun as **NOT
  RUN** and never claim that GitHub closed the alerts from local evidence alone.

## Validation and acceptance

All full gates pass, both locks remain frozen, the exact owned server process is
stopped, `/peri` is non-5xx (controlled `404` when absent), and closure records
all limitations without false claims. Local CodeQL regressions and the strict
scan must be green; remote CodeQL status is reported only for the exact pushed
commit, or explicitly **NOT RUN** when no push occurred. If no authorized Docker
host exists, static Dockerfile validation is required and the image build is
explicitly reported **NOT RUN**; closure must not describe the image itself as
passing.

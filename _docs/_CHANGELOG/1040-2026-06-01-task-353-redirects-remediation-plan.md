# 1040 - TASK-353 Redirects remediation plan

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-353

## Key Changes

### Planning

- Added the TASK-353 Redirects remediation family from the Tools Playwright
  report and Claude UX review.
- Split Redirects work into leaves for public runtime execution, drawer
  accessibility and table empty/pagination UX, delete UI, and final QA/docs
  closure.
- Captured the bridge security contract between internal redirect CRUD and
  public read redirect execution, including loop/open-redirect hardening.
- Refined Redirects leaves after drift audit to require visited-set/max-hop
  chain loop handling, route error mapping, cache-contract decisions, and
  current source references.

## Validation

- Planning was based on the Redirects report, Tools overview report, Claude UX
  addendum, current Redirects UI/client/route/service/public-runtime files,
  current tests, and the repo task/changelog format rules.
- Follow-up drift audit checked current redirect service/routes, runtime
  routing, and admin cache policy.

# 1279 - TASK-491 Integrations Runtime Wiring (GA / Slack / Zapier / Sentry)

**Date:** 2026-08-15
**Version:** Unreleased
**Tasks:** TASK-491, TASK-491-01, TASK-491-01-L01, TASK-491-01-L02, TASK-491-02, TASK-491-02-L01, TASK-491-02-L02, TASK-491-03, TASK-491-03-L01, TASK-491-04, TASK-491-04-L01, TASK-491-04-L02

## Key Changes

### Integrations (runtime wiring)
- Google Analytics GA4 tag injected into the public head (both renderDocument variants, page + entry) from the configured measurement id (sanitized, fail-closed unconfigured, no cache-busting seam).
- Slack/Zapier event dispatch for entry.published / page.published / form.submission (post-commit emission; behavior-preserving retryPost with per-attempt delivery logs + signature headers; no PII in payloads).
- Sentry server init (`@sentry/node` 10.69.0, 16 days old — past the 7-day release-age policy; DSN backend-only, never in browser DOM; captureServerError reuses the loaded module ref).
- Integration health service + admin UI: real health checks, Test connection, status display (unknown on config change per audit M1), secret_master_key_missing → 400 mapping.
- Docs: CMS_API integrations section (+ error codes incl. backup-style consistency), ARCHITECTURE emission notes.

## Validation
- Post-implementation audit (v4-pro-max) → 1 HIGH + 2 MEDIUM + 4 LOW all fixed; re-audit (GLM 5.2) PASS 7/7: publicSite.tsx split to 918 lines, missing 02-L02 test suites added, test-DB cleanup ownership snapshot+restore, master-key guards.
- Bun suites (event dispatch, health route, delivery, publicSiteAnalytics, sentry init, security gates) + Vitest (slackFormat, analyticsRuntime, payload, health UI) green; lint + types green.
- Runtime smoke (wf491smoke, 5 scenarios): login, Integrations page health states, Connect GA drawer → PATCH 200 (status connected, health unknown), GA gtag script injected in public page HTML (G-WF491SMOKE verified), dark-mode parity; 0 feature-related console errors. Screenshot `_docs/_workflows/_smoke/491-01-integrations-dark.png`.

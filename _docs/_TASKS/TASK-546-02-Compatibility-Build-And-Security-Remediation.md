# TASK-546-02: Compatibility, Build, and Security Remediation

# FileName: TASK-546-02-Compatibility-Build-And-Security-Remediation.md

**Parent Task:** TASK-546
**Priority:** High
**Category:** Compatibility / Build / Regression Testing
**Estimated Effort:** Medium
**Dependencies:** TASK-546-01-L01
**Status:** ✅ Done
**Completed:** 2026-07-22
**Changelog:** 1259 (pinned; closure only)

---

## Scope

Consume the frozen dependency graph from TASK-546-01-L01, prove Node 26 and Bun
runtime compatibility, and repair only evidence-backed source/config/test
regressions caused by the selected upgrades. Validate native Argon2, ESM
canonicalization, cloud storage adapters, React/Radix/Lucide, and the
Vite/Tailwind/Vitest/compiler stack without changing product behavior.

## Leaf

| ID | Title | Status |
|---|---|---|
| TASK-546-02-L01 | Fix Node 26 and Dependency Regressions | ✅ Done |

## Ownership

The executable leaf is the sole TASK-546 writer for compatibility source,
compiler/linter configuration, and focused regression tests that are necessary
after L01. It may not re-resolve manifests/locks, change CI/Docker/version-pin
docs or their hardcoded tests, edit TASK-545 workflows, or perform closure.

## Security Contract

- No endpoint, route visibility, auth, RBAC, CSRF, rate-limit, nonce/HMAC,
  captcha, or public-write contract changes.
- Existing strict schemas, reject-unknown allowlists, fail-closed normalizers,
  secret redaction, canonical bytes, password hashing, and signature verification
  remain behaviorally identical.
- Compatibility repairs must not add fallback production paths, scanner ignores,
  broad casts, `any`, disabled lint rules, or weakened assertions.

## Validation and acceptance

All root/core/SDK/store/prototype compilation lanes, production builds, focused
dependency-shaped suites, and bundle boundaries pass on the landed graph. Any
named failure is rerun alone before classification. TASK-546-03-L01 receives a clean,
unchanged manifest/lock set and no unresolved compatibility regression.

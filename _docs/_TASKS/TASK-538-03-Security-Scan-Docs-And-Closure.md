# TASK-538-03: Security Scan, Docs, and Closure

# FileName: TASK-538-03-Security-Scan-Docs-And-Closure.md

**Parent Task:** TASK-538
**Priority:** Critical
**Category:** Security Validation / Documentation / Closure
**Estimated Effort:** Small
**Dependencies:** TASK-538-02
**Status:** ⏳ To Do
**Changelog:** 1250 (pinned; create only at implementation closure)

---

## Scope

Correct the security/Page documentation, run final scans and post-audits, create
changelog 1250, and close the family. No production source or tests are edited here.

## Leaf

TASK-538-03-L01 owns documentation, final scan records, task/index statuses, and
changelog 1250 only.

## Closure requirements

- Targeted SVG Semgrep reports no author-data raw-markup finding.
- bun run scan:security:strict is executed; unrelated program findings are routed to
  their owning task and cannot be suppressed here.
- Fresh lenses cover sanitizer policy, safe-tree completeness, renderer sink removal,
  geometry/click evidence, and test integrity.
- No tracked exploit payload, class allowlist, scanner ignore, or rule weakening.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/pages/svg-sanitizer.test.ts \
  tests/vitest/pages/svg-safe-tree.test.ts \
  tests/vitest/pages/page-renderer-v2.test.tsx \
  tests/vitest/pages/page-document-v2.test.ts
semgrep --error --timeout 120 --timeout-threshold 0 \
  --config .semgrep.yml --config p/owasp-top-ten --config p/security-audit \
  --config p/nodejs --config p/typescript \
  core/services/pages/svgSanitizerPolicy.ts \
  core/services/pages/svgSanitizer.ts \
  core/services/pages/svgSafeTree.ts \
  core/services/pages/pageRendererV2.tsx
bun run scan:security:strict
bun run gates:coderso
~~~

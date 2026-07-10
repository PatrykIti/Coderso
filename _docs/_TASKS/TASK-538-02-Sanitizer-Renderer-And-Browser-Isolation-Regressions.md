# TASK-538-02: Sanitizer, Renderer, and Browser Isolation Regressions

# FileName: TASK-538-02-Sanitizer-Renderer-And-Browser-Isolation-Regressions.md

**Parent Task:** TASK-538
**Priority:** Critical
**Category:** Page Renderer / Browser Security / Tests
**Estimated Effort:** Medium
**Dependencies:** TASK-538-01
**Status:** ⏳ To Do
**Changelog:** 1250 (pinned; create only at implementation closure)

---

## Scope

Replace the customSvg raw-markup sink with React elements created from the safe tree,
then prove sanitizer/render behavior and real geometry/click isolation. Static trusted
CSS/runtime strings elsewhere in the renderer are out of scope; the invariant is that
author-controlled SVG never reaches dangerouslySetInnerHTML.

## Leaves

| Leaf | Scope | Ownership |
|---|---|---|
| TASK-538-02-L01 | Integrate safe tree, containment, and draw-in stamping; update renderer compatibility assertions before its gate | pageRendererV2.tsx + staged renderer-test expectations |
| TASK-538-02-L02 | Additive cross-seam regressions and five-flow browser isolation proof | test/smoke files only; no re-baseline |

## Security Contract

No HTTP/auth/database change. Stored author SVG is sanitized at write, sanitized and
parsed again at render, and emitted as React nodes from closed tags/props. There is no
author-data dangerouslySetInnerHTML, scanner allowlist, suppression, or exploit payload.
The renderer-owned wrapper/root replace author root layout authority, clamp the trusted
CSS viewport ratio to `1/8..8`, cap block size at `1024px`, clip painting, and are
pointer-transparent. The neutral placeholder remains the fail-closed public result.

## Compatibility and land order

Land L01 after both 538-01 leaves, then L02. Draw-in, label/aria, geometry, gradients,
local references, and safe presentation remain. TASK-539 must read the resulting
pageRendererV2.tsx and cannot run concurrently.

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
~~~

Run at least five browser flows with computed geometry/click assertions.

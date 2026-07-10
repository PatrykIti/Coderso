# TASK-538-02-L02: Prove Geometry and Click-Through Isolation

# FileName: TASK-538-02-L02-Prove-Geometry-And-Click-Through-Isolation.md

**Parent Task:** TASK-538
**Parent Subtask:** TASK-538-02
**Priority:** Critical
**Category:** Security Tests / Browser Smoke
**Estimated Effort:** Medium
**Dependencies:** TASK-538-02-L01
**Status:** ⏳ To Do
**Changelog:** 1250 (pinned; create only at implementation closure)

---

## Scope and ownership

Tests/smoke-only leaf. Source leaves have already created/updated their required suites
before their gates. This leaf owns only additive cross-seam TASK-538 cases in
tests/vitest/pages/svg-sanitizer.test.ts, page-renderer-v2.test.tsx,
page-document-v2.test.ts, the exact new
`tests/vitest/pages/svg-safe-tree.test.ts`, and task-prefixed screenshots named
`_docs/_workflows/_smoke/task-538-*`. It must not edit production source, docs,
scanner config, task/index status, or changelog files.
It must not weaken or re-baseline source-owner assertions; the safe-tree path already
exists from TASK-538-01-L02.

## Implementation Pseudocode

~~~ts
describe sanitizer:
  remove class/style on root and every descendant;
  preserve safe geometry/presentation/local refs;
  keep full prior XSS/mXSS corpus and idempotence.

describe safe tree:
  parse nested defs/gradient/use/text into closed nodes;
  reject malformed/unconsumed/unknown tokens;
  reject node/depth/text overflow at exact exported boundaries;
  decode the closed XML entity set once and reject malformed/unsafe references;
  map hyphen/xlink attributes to exact React props;
  prove class/style/on*/remote href cannot appear.

describe renderer:
  render valid customSvg and inspect actual SVG DOM;
  assert draw-in pathLength, label semantics, one-pass text escaping, and cap fallback;
  render invalid input and assert neutral placeholder;
  static/source guard: customSvg branch contains no author-data DSIH.
  assert root x/y/width/height/transform cannot survive as layout authority;
  assert exact trusted boundary/root containment and pointer styles.
~~~

Do not store a weaponized payload in tracked fixtures. Use redacted capability-oriented
inputs containing harmless class names and geometry assertions.

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

The targeted scan must report zero author-data raw-markup findings. Re-run each named
failing test once in isolation.

## Runtime smoke

Restart the server and use a TASK-538 Playwright session. Run at least five distinct
flows:

1. safe presentation SVG preserves computed fill/stroke and stays inside block bounds;
2. root/nested class-bearing SVG with harmless oversized/root-layout attributes and
   extreme tall/wide viewBox ratios renders without class or author root layout
   authority; computed wrapper/root geometry respects ratio `1/8..8` and max block size
   `1024px` without viewport expansion;
3. deeply nested defs/gradient/use remains visible and bounded;
4. draw-in stamps normalized path length and visibly animates while reduced-motion is
   static;
5. for narrow and wide hosts, wrapper/root bounding rectangles remain within the trusted
   inline/ratio/block-size bounds; computed overflow/paint containment plus screenshots
   prove oversized descendant paint is clipped, while a control immediately
   outside/behind the block remains the result of elementFromPoint and receives a real
   click because the wrapper/root are pointer-transparent. Do not require a descendant's
   raw `getBoundingClientRect()` to shrink when its paint is clipped.

Cover narrow/wide viewports and light/dark surfaces. Assert bounding rectangles,
computed styles, DOM attributes, click result, and zero console errors. Save screenshots
under `_docs/_workflows/_smoke/` with the exact `task-538-` prefix, without exposing an
exploit payload. Record scenario IDs, theme/viewport, visible assertions, console-error
results, and screenshot paths in TASK-538 closeout evidence. TASK-545's future manifest
and evidence directory are not prerequisites for TASK-538.

## Acceptance criteria

- Unit/render tests prove the closed representation.
- Browser geometry never escapes the block.
- Outside clicks reach the intended element.
- The targeted scanner is clean without suppression.

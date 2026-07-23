# TASK-538-02-L02: Prove Geometry and Click-Through Isolation

# FileName: TASK-538-02-L02-Prove-Geometry-And-Click-Through-Isolation.md

**Parent Task:** TASK-538
**Parent Subtask:** TASK-538-02
**Priority:** Critical
**Category:** Security Tests / Browser Smoke
**Estimated Effort:** Medium
**Dependencies:** TASK-538-02-L01
**Status:** ✅ Done
**Started:** 2026-07-11
**Completed:** 2026-07-11
**Automated Gate:** ✅ Passed (423/423 Vitest, named Bun runtime executed 1/1,
full runtime 19/19, targeted Semgrep 0, lint, typecheck, final test audit 0 H/M/L,
and real browser smoke 6/6 with zero console/page errors)
**Changelog:** 1250

---

## Scope and ownership

Tests/smoke-only leaf. Source leaves have already created/updated their required suites
before their gates. This leaf owns only additive cross-seam TASK-538 cases in
tests/vitest/pages/svg-sanitizer.test.ts, page-renderer-v2.test.tsx,
page-document-v2.test.ts, the exact new
`tests/vitest/pages/svg-safe-tree.test.ts`, and task-prefixed screenshots named
`_docs/_workflows/_smoke/task-538-*`. It must not edit production source, docs,
scanner config, task/index status, or changelog files. It also owns additive TASK-538
coverage in `tests/vitest/pages/page-editor-xss-guards.test.tsx` and the Bun-owned
`tests/integration/runtime/pages-runtime.test.ts`; existing unrelated assertions in
those suites remain unchanged.
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
  prove sanitizeSvg -> tree -> renderer parity for bare/single/double values and
    spaces/tabs/newlines on both sides of `=`;
  reject malformed/unconsumed/unknown tokens;
  reject node/depth/text overflow at exact exported boundaries;
  decode the closed XML entity set once and reject malformed/unsafe references;
  map hyphen/xlink attributes to exact React props;
  prove class/style/on*/remote href cannot appear.

describe renderer:
  render valid customSvg through React SSR and inspect semantic SVG output;
  assert draw-in pathLength, label semantics, one-pass text escaping, and cap fallback;
  render invalid input and assert neutral placeholder;
  static/source guard: customSvg branch contains no author-data DSIH.
  assert root x/y/width/height/transform cannot survive as layout authority;
  assert exact trusted boundary/root containment and pointer styles.

describe public/preview runtime:
  publish a uniquely scoped Page fixture and render both public front and token preview;
  assert both paths omit class/style, retain safe-tree SVG semantics and trusted root
    geometry, and use the neutral placeholder for rejected input;
  clean up only the fixture created by this suite.
~~~

Do not add a new weaponized payload to tracked fixtures. Use redacted
capability-oriented inputs containing harmless class names and geometry assertions;
preserve the existing internal audit evidence and security regression corpus.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/pages/svg-sanitizer.test.ts \
  tests/vitest/pages/svg-safe-tree.test.ts \
  tests/vitest/pages/page-renderer-v2.test.tsx \
  tests/vitest/pages/page-document-v2.test.ts \
  tests/vitest/pages/page-editor-xss-guards.test.tsx
set -a && source .env && set +a
bun test tests/integration/runtime/pages-runtime.test.ts
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

Restart the server with the literal `coderso-dev-core-host` command; verify
`http://coderso-a.localhost:5173/admin/` and `http://coderso-a.localhost:3000/`.
Load credentials only from `.env` without printing them. Every browser operation must
use the full `playwright-cli -s=wf538smoke <command>` form. Create one uniquely scoped
Page through the real builder, save it, publish it, verify the public front, and remove
only that fixture after evidence capture. Run at least five distinct flows:

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
   prove oversized descendant paint is clipped, while a real control immediately outside
   the complete Page block frame—at a point that escaped SVG paint could previously
   cover—remains the result of `elementFromPoint` and receives a real click. Do not claim
   click-through to an element geometrically behind the outer `PageBlockFrame`, which is
   intentionally a normal layout element, and do not require a descendant's raw
   `getBoundingClientRect()` to shrink when its paint is clipped.

Cover narrow/wide viewports and light/dark surfaces. Assert bounding rectangles,
computed styles, DOM attributes, click result, and zero console errors. Save screenshots
under `_docs/_workflows/_smoke/` with the exact `task-538-` prefix, without exposing an
exploit payload. Record scenario IDs, theme/viewport, visible assertions, console-error
results, and screenshot paths in TASK-538 closeout evidence. TASK-545's future manifest
and evidence directory are not prerequisites for TASK-538.
Close the browser with `playwright-cli -s=wf538smoke close` and stop the task-scoped
server processes after cleanup. Because `*.png` is globally ignored today, the owner
must include the exact `task-538-*` screenshots intentionally at commit time; TASK-545
owns the future path-level ignore exception.

## Acceptance criteria

- Unit/render tests prove the closed representation.
- Wrapper/root layout geometry and painted/hit-testable output never escape the trusted
  block boundary; an oversized descendant raw bounding box may extend beyond it only
  while clipped and non-interactive.
- Outside clicks reach the intended element.
- The targeted scanner is clean without suppression.

## Completion evidence

The cross-seam Vitest and Bun public/preview parity coverage passed. The real builder
smoke used the literal `coderso-dev-core-host` helper and full
`playwright-cli -s=wf538smoke ...` commands: six distinct light/dark and wide/narrow
scenarios passed, including both wide and narrow clipped-paint/outside-click proofs,
with zero console/page errors and scoped fixture cleanup.

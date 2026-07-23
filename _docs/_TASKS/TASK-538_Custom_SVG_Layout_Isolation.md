# TASK-538: Custom SVG Layout Isolation

# FileName: TASK-538_Custom_SVG_Layout_Isolation.md

**Priority:** Critical
**Category:** Pages / SVG Sanitization / Security
**Estimated Effort:** Large
**Dependencies:** TASK-522, TASK-535
**Status:** ✅ Done
**Started:** 2026-07-11
**Completed:** 2026-07-11
**Changelog:** 1250

---

## Overview

The `customSvg` allowlist removes raw `style` but still preserves arbitrary
author-controlled `class`. Public utility CSS can therefore give sanitized SVG
markup page-level positioning and interaction behavior. This is a confirmed
layout/click-isolation vulnerability at the existing
`dangerouslySetInnerHTML` seam.

The fix removes `class` from author SVG at both write and render sanitization,
converts sanitized markup to a sanitizer-owned safe render tree rather than an
author-data `dangerouslySetInnerHTML` sink, keeps descendant geometry/presentation
attributes needed for drawings, replaces root layout authority with a bounded
renderer-owned viewport/wrapper, proves the SVG stays inside its
block and cannot intercept outside clicks, and corrects the inaccurate security
documentation. There is no class-value allowlist, scanner suppression, or
detailed attack payload repeated in this public task family, source-of-truth docs,
changelog, or smoke evidence. Existing internal audit evidence and security regression
tests remain intact.

## Hard invariants

- `class` and `style` never survive author SVG sanitization.
- Closed-name-allowlisted geometry, paint, transform, local-fragment references,
  accessibility attributes, and namespaces remain supported under the existing byte,
  tree, and reference limits.
- Author root `x`, `y`, `width`, `height`, and `transform` never control page layout.
  The renderer replaces them with a trusted 100%-width SVG root, clamps the CSS
  viewport ratio to `1/8..8`, caps both root and wrapper block size at `1024px`, and
  places the result inside a layout/paint-contained, overflow-clipped,
  pointer-transparent wrapper. The author viewBox and descendant drawing geometry
  remain intact inside that trusted viewport but cannot size the page without bound.
  A missing/invalid viewBox may contribute only a bounded ratio derived from positive,
  finite unitless/`px` root width and height; those author attributes are still removed
  from the rendered root and never become direct layout values.
- The same sanitizer runs on write and immediately before render.
- Rendering consumes only the sanitizer-owned element/attribute token tree; no
  raw author string reaches `dangerouslySetInnerHTML`.
- A rejected/empty SVG retains the neutral placeholder. Sanitizer output and
  stored canonical bytes remain idempotent; the React safe-tree renderer must
  preserve equivalent DOM semantics, accessibility, paint, and geometry, but is
  not required to reproduce raw SSR attribute order/spelling byte-for-byte.
- No utility-class allowlist is introduced: the public stylesheet is an
  evolving ambient capability and cannot be a stable security boundary.

## Security Contract

This task changes no HTTP route, auth, RBAC, CSRF, rate limit, nonce, captcha,
or database contract. The trust boundary is stored author markup rendered into a
public page. Sanitization is fail-closed at write and render, and the Semgrep
finding is resolved by removing the user-data sink—not by suppressing it or
weakening the scanner.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-538-01 | Remove author-controlled SVG class | TASK-538-01-L01, L02 | ✅ Done |
| TASK-538-02 | Sanitizer, renderer, and browser isolation regressions | TASK-538-02-L01, L02 | ✅ Done |
| TASK-538-03 | Security scan, docs, and closure | TASK-538-03-L01 | ✅ Done |

## Finding coverage matrix

| Finding | Owner | Required proof |
|---|---|---|
| H-04 author class escapes the block layout/interaction boundary | 538-01/L01 | sanitizer output contains no class at normalize or render |
| H-04 browser geometry/click interception | 538-02/L01 + L02 | safe-tree renderer integration plus bounding-box and outside `elementFromPoint`/click proof |
| II-P-HIGH-01 Semgrep sink corresponds to a real weakness | 538-01/L02 + 538-02/L01 + 538-03/L01 | safe tree integration and strict scan rerun, no allowlist/suppression |

## Ownership and land order

Land `538-01 → 538-02 → 538-03`. The remediation dependency map is
`538 → 536 → 541 → 537 → 544 → 543 → 540 → 539 → 542 → 545`.
TASK-536 has already closed, so TASK-538 lands now, before the remaining TASK-541 and
TASK-537 streams. TASK-539 later builds on this renderer seam.
Only 538-01/L01 writes the sanitizer and immutable `svgSanitizerPolicy.ts`;
538-01/L02 owns the safe tree and consumes that read-only policy;
538-02/L01 alone integrates it in `pageRendererV2.tsx`. Each source leaf updates its
changed-behavior/compatibility assertions before its own gate; 538-02/L02 adds only
cross-seam proof and browser evidence without re-baselining them. TASK-539 later owns
other Page renderer changes and must build on this result.

## Testing Requirements

- `bun --cwd core lint:types`
- `bun --cwd core lint`
- Targeted `svg-sanitizer`, safe-tree, Page document, renderer, and XSS-guard Vitest
  suites plus the Bun-owned public/preview Page runtime integration suite.
- `bun run scan:security:strict` plus the exact Semgrep command when available.
- At least five real flows covering valid presentation SVG, class stripping,
  nested SVG, block geometry, and click-through in light/dark and narrow/wide
  viewports with zero console errors.

## Documentation Updates Required

Correct `_docs/SECURITY_SPEC.md` and `_docs/PAGE_MODEL.md` so they no longer claim
that dropping `style` alone closes layout escape. At closure create changelog
1250 and close every descendant.

## Completion evidence

All three children and five executable leaves are complete. The Page `customSvg`
boundary now strips author `class`/`style`, builds a bounded closed node tree, renders
without an author-data raw-markup sink, replaces root layout authority with a trusted
clamped viewport, and clips/pointer-isolates the result. Invalid input retains the
neutral placeholder. This remains a Page block within Page sections; configurable
product widgets remain exclusive to the Admin Dashboard.

Automated closure evidence:

- `bun --cwd core lint:types` and `bun --cwd core lint` passed;
- targeted Vitest passed 423/423;
- the named TASK-538 Bun runtime case executed (not skipped), and the full Page runtime
  suite passed 19/19;
- targeted Semgrep reported zero findings, release gates passed 5/5, both workflow
  scripts passed `node --check`, and `git diff --check` passed;
- five fresh post-audit lenses are clean after one Low stale renderer-leaf grounded
  source anchor was corrected and freshly re-audited;
- `bun run scan:security:strict` ran without a TASK-538 finding or tooling failure. Its
  non-zero exit is solely the unchanged TASK-545-owned finding in
  `_docs/_workflows/task-522-author.mjs`; no suppression or scanner change was added.

Real runtime smoke used the literal `coderso-dev-core-host` helper, complete
`playwright-cli -s=wf538smoke ...` commands, credentials read only from `.env`, and the
canonical admin/front hosts. One unique Blank Page was created through the real Page
builder, saved, published, verified on the public front, and deleted through the UI.
The public URL returned 404 after cleanup; the browser session closed and the scoped
server stopped. All six scenarios produced zero console/page errors:

| Scenario | Theme / viewport | Visible proof | Screenshot |
|---|---|---|---|
| 538-smoke-01 safe presentation | Light / wide | Safe paint and bounded geometry remained visible | `_docs/_workflows/_smoke/task-538-safe-presentation-wide-light.png` |
| 538-smoke-02 root isolation | Dark / wide | Author layout hooks were absent and trusted bounds held | `_docs/_workflows/_smoke/task-538-class-root-isolation-wide-dark.png` |
| 538-smoke-03 nested SVG | Light / narrow | Nested references rendered visibly inside the boundary | `_docs/_workflows/_smoke/task-538-nested-svg-narrow-light.png` |
| 538-smoke-04 draw / reduced motion | Dark / narrow | Draw state and reduced-motion behavior were visibly distinct | `_docs/_workflows/_smoke/task-538-draw-reduced-motion-narrow-dark.png` |
| 538-smoke-05 clipped paint / outside click | Light / wide | Paint stayed clipped and the adjacent real control received the click | `_docs/_workflows/_smoke/task-538-clip-outside-click-wide-light.png` |
| 538-smoke-06 clipped paint / outside click | Dark / narrow | Narrow geometry stayed bounded and the adjacent real control received the click | `_docs/_workflows/_smoke/task-538-clip-outside-click-narrow-dark.png` |

All six screenshot files are non-empty and have distinct paths, inodes, and SHA-256
hashes. TASK-545 retains ownership of the future durable smoke-manifest contract.

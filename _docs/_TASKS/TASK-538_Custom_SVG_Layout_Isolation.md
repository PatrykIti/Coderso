# TASK-538: Custom SVG Layout Isolation

# FileName: TASK-538_Custom_SVG_Layout_Isolation.md

**Priority:** Critical
**Category:** Pages / SVG Sanitization / Security
**Estimated Effort:** Large
**Dependencies:** TASK-522, TASK-535, TASK-537 (program order)
**Status:** ⏳ To Do
**Changelog:** 1250 (pinned; create only at implementation closure)

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
detailed attack payload in tracked docs.

## Hard invariants

- `class` and `style` never survive author SVG sanitization.
- Safe geometry, paint, transform, local-fragment references, accessibility
  attributes, namespaces, and the existing byte cap remain supported.
- Author root `x`, `y`, `width`, `height`, and `transform` never control page layout.
  The renderer replaces them with a trusted 100%-width SVG root, clamps the CSS
  viewport ratio to `1/8..8`, caps both root and wrapper block size at `1024px`, and
  places the result inside a layout/paint-contained, overflow-clipped,
  pointer-transparent wrapper. The author viewBox and descendant drawing geometry
  remain intact inside that trusted viewport but cannot size the page without bound.
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
| TASK-538-01 | Remove author-controlled SVG class | TASK-538-01-L01, L02 | ⏳ To Do |
| TASK-538-02 | Sanitizer, renderer, and browser isolation regressions | TASK-538-02-L01, L02 | ⏳ To Do |
| TASK-538-03 | Security scan, docs, and closure | TASK-538-03-L01 | ⏳ To Do |

## Finding coverage matrix

| Finding | Owner | Required proof |
|---|---|---|
| H-04 author class escapes the block layout/interaction boundary | 538-01/L01 | sanitizer output contains no class at normalize or render |
| H-04 browser geometry/click interception | 538-02/L01 + L02 | safe-tree renderer integration plus bounding-box and outside `elementFromPoint`/click proof |
| II-P-HIGH-01 Semgrep sink corresponds to a real weakness | 538-01/L02 + 538-02/L01 + 538-03/L01 | safe tree integration and strict scan rerun, no allowlist/suppression |

## Ownership and land order

Land `538-01 → 538-02 → 538-03`; TASK-538 follows TASK-537 and precedes TASK-539
in the remediation program.
Only 538-01/L01 writes the sanitizer and immutable `svgSanitizerPolicy.ts`;
538-01/L02 owns the safe tree and consumes that read-only policy;
538-02/L01 alone integrates it in `pageRendererV2.tsx`. Each source leaf updates its
changed-behavior/compatibility assertions before its own gate; 538-02/L02 adds only
cross-seam proof and browser evidence without re-baselining them. TASK-539 later owns
other Page renderer changes and must build on this result.

## Testing Requirements

- `bun --cwd core lint:types`
- `bun --cwd core lint`
- Targeted `svg-sanitizer`, Page document, renderer, and XSS-guard Vitest suites.
- `bun run scan:security:strict` plus the exact Semgrep command when available.
- At least five real flows covering valid presentation SVG, class stripping,
  nested SVG, block geometry, and click-through in light/dark and narrow/wide
  viewports with zero console errors.

## Documentation Updates Required

Correct `_docs/SECURITY_SPEC.md` and `_docs/PAGE_MODEL.md` so they no longer claim
that dropping `style` alone closes layout escape. At closure create changelog
1250 and close every descendant.

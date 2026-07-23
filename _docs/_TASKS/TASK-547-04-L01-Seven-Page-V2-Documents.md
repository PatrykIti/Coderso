# TASK-547-04-L01: Seven Page v2 Documents
# FileName: TASK-547-04-L01-Seven-Page-V2-Documents.md

**Parent Subtask:** TASK-547-04
**Priority:** High
**Category:** Pages / Reference Example
**Estimated Effort:** Very Large
**Dependencies:** TASK-547-03
**Status:** ⏳ To Do

## Overview

Split the homepage generator and own seven bounded Page builders. Use typed refs
only at package-allowlisted ID fields; do not normalize ref-bearing Pages natively
until installer substitution.

## Security Contract

No endpoint. Safe Page primitives/SVG only; no raw JS/HTML/CSS or outbound URL.

## Implementation Pseudocode

```ts
export const buildFormaDomPages = (refs) => [
  buildHome(), buildOffer(), buildProjects(refs.query, refs.template),
  buildProcess(), buildPricing(), buildAbout(), buildContact(refs.form),
].map(validatePackageAwarePageSeed);
```

Data flow: page-specific builders → package-aware validation → native normalization
after ref resolution. Fail if route/anchor/SEO/ref/capability requirement is absent.

Regression tests in `tests/vitest/kits/projekty-domow-pages.test.ts`: seven routes,
modern switcher/scrollHint/magnetic/layout effects; Oferta deep anchors/comparison;
projects collection/filter/listing-template refs; five-step process; highlighted
pricing package; values/team; contact form/map approximation; CTA targets and
desktop/tablet/mobile overrides.

## Sub-Tasks

- [ ] Extract shared helpers and seven cohesive builders.
- [ ] Add per-page golden/contract tests.

## Testing Requirements

Targeted Page/generator Vitest; renderer/responsive suites; core lint/types; line counts.

## Documentation Updates Required

Send page/resource map and visual residuals to TASK-547-06.

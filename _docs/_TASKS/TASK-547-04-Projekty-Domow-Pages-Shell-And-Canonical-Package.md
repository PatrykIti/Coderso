# TASK-547-04: Projekty Domów Pages, Shell and Canonical Package
# FileName: TASK-547-04-Projekty-Domow-Pages-Shell-And-Canonical-Package.md

**Parent Task:** TASK-547
**Priority:** High
**Category:** Reference Example / Pages / Menu / Design
**Estimated Effort:** Very Large
**Dependencies:** TASK-547-03
**Status:** ⏳ To Do

---

## Overview

Replace the stale homepage-only generator with bounded modules that produce all
seven static Page v2 documents, the Page-v2 footer template, primary
MenuDocumentV2, SEO, safe design settings, shell refs and the final canonical
`_docs/_DEMO/projekty-domow.site.json`.

Use current CMS capabilities rather than retaining stale `capabilityGaps`:
switcher, filterable gallery, scrollHint, magnetic, multi-layer gradients, glow,
fluid typography, asymmetric columns, spans and per-edge borders.

**Single-writer ownership:** `scripts/demo-projekty-domow.tsx`,
`scripts/projekty-domow/pages/*`, shell/design package builders, and the generated
site JSON. Split every human-authored module below 1,000 lines.

## Required Pages And Shell

- `/`: full premium home, including functional style switcher and scroll hint.
- `/oferta`: service cards, deep anchors and comparison panel.
- `/projekty`: filters + collection bound through refs from TASK-547-03.
- `/proces`: five-step timeline.
- `/cennik`: three packages with highlighted middle package.
- `/o-nas`: approach, values and team.
- `/kontakt`: real Form block bound to `project-brief` plus direct contact/map
  approximation.
- published primary menu with seven links and CTA; responsive MenuDocumentV2.
- published Page Template footer, shell refs and `site.name`.
- explicit `site.homepageId` typed ref to `pages.home`, installed/restored with
  settings last.
- `site.locale:"pl"` drives `<html lang="pl">` on Page and dynamic-entry routes.
- per-page SEO plus safe `design.tokens`/page settings.

## Security Contract

- No endpoint; deterministic local generator only.
- Ref-free Page/Menu/template payloads pass native strict write normalizers during
  generation. Ref-bearing documents pass package-aware validation first; the
  installer substitutes refs and only then calls native strict write normalizers.
- Inline SVG uses the current sanitizer; no raw HTML/JS/CSS or remote fetch URL.
- Settings use TASK-547-01 allowlist and contain no secrets.
- `compatibility.unresolvedVisuals[]` is non-persisted audit metadata, not an
  escape hatch into render code.

## Implementation Pseudocode

```ts
export function buildFormaDomSitePackage(): FullSitePackageV1 {
  const data = buildFormaDomContentResources();
  const pages = [
    buildHomePage(),
    buildOfferPage(),
    buildProjectsPage(data.refs),
    buildProcessPage(),
    buildPricingPage(),
    buildAboutPage(),
    buildContactPage(data.refs),
  ];
  const shell = buildFormaDomShell(pages);
  return normalizeFullSitePackageForWrite({
    schemaVersion: 1,
    key: "formadom-studio",
    metadata: FORMA_DOM_METADATA,
    resources: mergeSlices(data, pages, shell, buildDesignSettings()),
    compatibility: buildVerifiedVisualResiduals(),
    verification: buildFormaDomVerificationPlan(),
  });
}
```

**Data flow:** cohesive Page builders → package-aware validation for ref-bearing
documents (native normalization for ref-free documents) → shell/menu/footer
builders → package graph normalizer → deterministic pretty JSON write. Apply
resolves refs before native write normalization.

**Error handling:** fail generation if any required route, menu target, form/query
ref, SEO item or verification scenario is missing. Never write a partial artifact.

**Regression-test shape:** byte-stable regeneration; seven unique Page routes plus
dynamic Aurora route; all links/anchors/ref paths close; expected modern block
capabilities are actually used; no deprecated widget template; JSON equals
generator output and passes all embedded schemas.

## Sub-Tasks

- [ ] **TASK-547-04-L01** — split generator and build seven Page v2 documents.
- [ ] **TASK-547-04-L02** — shell/settings/SEO/package assembly and canonical
  artifact tests.
- [ ] **TASK-547-04-L03** — public Page/entry locale propagation and tests.

## Testing Requirements

- targeted Vitest Page/Menu/package/generator suites
- existing Page renderer, responsive CSS, Menu document/CSS and site-shell suites
- generator run followed by zero `git diff` on canonical JSON
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- touched-file line counts

## Documentation Updates Required

Provide the demo-guide delta and visual residual evidence to TASK-547-06, the
sole shared-doc writer.

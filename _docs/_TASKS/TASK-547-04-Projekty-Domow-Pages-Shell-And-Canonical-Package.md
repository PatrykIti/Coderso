# TASK-547-04: Projekty Domów Pages, Shell and Canonical Package
# FileName: TASK-547-04-Projekty-Domow-Pages-Shell-And-Canonical-Package.md

**Parent Task:** TASK-547
**Priority:** High
**Category:** Reference Example / Pages / Menu / Design
**Estimated Effort:** Very Large
**Dependencies:** TASK-547-03
**Status:** 🚧 In Progress
**Validation:** Round-one read-only audit findings are being corrected. This
contract remains open until the complete family passes the fresh five-round
drift loop, implementation gates and final runtime acceptance on one working
tree.

---

## Overview

Install one native-CMS FormaDom site package that reproduces the seven static
pages in the pinned `projekty-domow-wow-site` prototype. The package must use
Pages, Page Templates, Menus, Forms, content types, entries, listing/query/detail
resources and Settings already owned by Coderso. It must not become a static-app
escape hatch, a new widget surface, or a collection of invented marketing copy.

TASK-547-03 owns the project data, listing/detail resources and contact form.
This subtask owns the seven Page v2 documents, shell, design settings, canonical
package assembly and public locale propagation. Aurora remains a dynamic content
entry at `/projekty/aurora`, not an eighth static Page.

The contact Form's present-only `theme.submit.supportingText` is owned and
normalized by TASK-547-03-L03. L01 binds that Form and must not duplicate the
same note as a sibling Page text block. The bound Page Form block authors
`props.successBehavior:"show-message-keep-form"`, which L01 maps to
`FormEmbedData.submitBehavior.successBehavior`: a successful native
submission keeps the form controls visible, hides/replaces only the supporting
note and exposes the exact installed action message in the existing live region.

## Reference Authority And Fidelity Rule

The only visual/content authority is the read-only directory
`/home/coder/project/Coderso/_docs/projekty-domow-wow-site`, whose allowlisted
files and hashes are pinned and checked by TASK-547-07. References below name
files inside that directory; the legacy homepage-only demo artifact is not
source evidence.

- Preserve source section order, Polish copy, numeric facts, lists, labels,
  hrefs, public anchors and visible state changes. Convert prototype filenames
  to canonical CMS paths (`index.html` → `/`, `projekt-aurora.html` →
  `/projekty/aurora`) without changing their meaning.
- Do not add people names, years in business, project counts, ratings, response
  promises, prices, address details, transport/parking facts or other public
  claims absent from the prototype.
- Native accessibility and security hardening is allowed when it does not make a
  marketing claim: semantic tab/disclosure state, keyboard behavior, escaped
  attributes, real form validation, consent, nonce, rate limiting and optional
  captcha remain native Coderso behavior.
- Prototype CSS/SVG artwork is a content-and-layout reference, not evidence of
  missing photography. This package seeds no media resource and must not claim
  that real project/team imagery was present in the source.

## Resource And Ownership Contract

Every resource is a strict `{ key, desired }` seed with no database ID. Target
publication state and complete ordered children/document/appearance snapshots
live in `desired`; TASK-547-02 stages lifecycle-capable resources as drafts and
publishes only after their children and documents are complete.

- **TASK-547-04-L01** is the sole writer for
  `scripts/projekty-domow/pages/{home,offer,projects,process,pricing,about,contact,index,shared}.ts`
  plus the exact Page document/renderer/editor split modules and focused tests
  listed in its leaf, including the present-only switcher accessible-name
  contract. It owns all seven static Page documents, their static SEO and that
  bounded generic Page-core correction.
  It also owns the exact FormaDom Page palette and the reject-stale-token tests;
  L02 may consume those exported values but must not invent a second palette.
- **TASK-547-04-L02** is the sole writer for
  `scripts/demo-projekty-domow.tsx`, `scripts/projekty-domow/shell.ts`,
  `scripts/projekty-domow/package.ts`,
  `_docs/_DEMO/projekty-domow.site.json` and
  `tests/vitest/kits/projekty-domow-package.test.ts`. It consumes L01 and
  TASK-547-03 exports read-only.
- **TASK-547-04-L03** owns only the public-runtime paths and named render tests
  listed in its leaf. It consumes TASK-547-02-L02-owned `settingsService.ts` and
  pure `siteLocale.ts` exports read-only for escaped document language and the
  present-only listing/filter chrome. It does not edit settings contracts,
  package builders, authored Page copy or entry content.

No file or symbol changes writer between leaves. All human-authored production
and test files must remain cohesive and at most 1,000 physical lines; a file at
the limit is closed to append-only changes and must be split by responsibility
before further behavior is added.

## Required Native Site

The installed static routes are `/`, `/oferta`, `/projekty`, `/proces`,
`/cennik`, `/o-nas` and `/kontakt`. L01 freezes their complete copy/order matrix.
Required cross-page behavior is:

- home style switcher with the three source states and exact accessible name
  `Wybór stylu domu`, one real visible Page link to `#intro`, magnetic CTAs and
  responsive Page composition;
- projects Page collection/filter binding to TASK-547-03, with source-visible
  reset/category order and source card order/copy. The whole project card is the
  semantic link; L01's present-only `props.showCta:false` maps to native
  `fields.showCta:false`, so no visible per-card CTA is authored because the
  source has none;
- contact Page bound to the real `project-brief` form, with its source initial
  supporting note replaced by the exact success state after a real submission
  while all controls remain visible. L01 authors five textarea rows, no
  synthetic select prompt, Polish loading copy and keep-form behavior as
  present-only Page props; none is persisted in the Form resource;
- exactly seven primary menu items in source order, current-route state (the
  Projects item also wins for `/projekty/aurora`), mobile disclosure, and a
  scrolled header state;
- source desktop CTA `Zacznij projekt`, source mobile CTA `Umów konsultację`,
  complete footer/contact/demo copy, `site.name:"FormaDom Studio"`, and safe
  source-derived design tokens. Page builders consume the exact L01 palette
  (`#07111f`, `#0b1628`, `#f7fbff`, `#a8b5c7`, `#7e8ba0`, the pinned line
  alpha, `#8ee8ff`, `#adffd8`, `#c7b7ff`, `#ffd7a8`, `#ff9fba`) and reject the
  stale legacy palette;
- `site.locale:"pl"` producing `<html lang="pl">` for Page and dynamic-entry
  document shells.

The seven static SEO title/description pairs are owned by L01; L02 must preserve
and assert them during assembly, never regenerate or overwrite them. L02 must
also preserve TASK-547-03's dynamic Aurora detail SEO and `site.contentRoutes`.

## Native Interactions Versus Verified Residuals

The following are required native behavior, not residuals: Page switcher state,
exact Polish accessible name and ARIA, one focusable Page-link scroll target,
magnetic pointer effect, collection facets with an absent-parameter `Wszystkie`
reset state,
published collection/detail rendering, active menu matching, mobile disclosure,
scrolled menu state, responsive device overrides, real form submission whose
supporting note yields to success without hiding the controls, and Polish
document language.

`compatibility.unresolvedVisuals` must contain exactly these seven IDs, each as a
complete normalized residual object with source evidence, CMS constraint,
installed approximation, visible difference, all required no-impact flags and a
post-install/future remediation:

1. `favicon-not-installed`
2. `theme-color-not-installed`
3. `header-brand-and-floating-frame-approximated`
4. `native-form-heading-approximated`
5. `prototype-css-art-and-motion-approximated`
6. `portfolio-filter-and-card-chrome-approximated`
7. `exact-breakpoints-approximated`

The header residual is limited to the prototype's custom two-line house mark,
fixed floating-pill geometry, CTA placement and exact 20 px scroll threshold;
it does not excuse wrong CTA/menu-item labels or inert disclosure/scrolled
behavior. Exact-source-label assertions apply to source-visible or natively
configurable labels; do not invent a source `aria-label` where the prototype did
not define one. Coderso uses one shared navigation landmark across responsive
states, so its exact authored label `Główna nawigacja`, native Polish `Menu`
disclosure name and visible `FormaDom` brand name are accessibility-equivalent
to the prototype's separate desktop/mobile landmarks; this is not a residual
and must remain keyboard/screen-reader operable. The form-heading residual
covers the native Form block's required visible heading, not form-field/copy/
state drift. CSS-art/motion covers exact handcrafted SVG/CSS shapes, clipping,
keyframes, reveal/tilt/ticker timing and cursor glow while the corresponding
bounded native effects remain functional. It also records that the source's
icon-only scroll anchor/pill/dot becomes one visible text Page link and no
separate native `scrollHint`: the current hint has no href and exposes its own
screen-reader text, so composing both would create a false second cue.
Portfolio chrome covers exact card art plus the source chips versus the native
reset link, radio facet and explicit apply control. It explicitly includes the
native localized heading `Filtruj wyniki`, description `Zawęź wyniki za pomocą
dostępnych filtrów.`, legend `Kategoria`, resolved option counts, and the active
summary/clear UI (`1 aktywny filtr`, `Wyczyść wszystko`, `Kategoria: <wybrana
etykieta>`). Those bounded source-absent labels do not excuse an `all` query
value, wrong source option label/order, wrong derived count, broken reset,
unsafe query or wrong results. Breakpoint drift is only prototype
`1060px`/`700px` versus Coderso canonical device branches.

The same portfolio residual also records two bounded source-absent native
adaptations: visitor-safe empty-state copy `Brak wyników` /
`Zmień filtry, aby zobaczyć inne projekty.` and suppression of native/template
CTA text while the whole card remains the semantic link. It never permits a
publish instruction in public empty state, a visible `Zobacz szczegóły` label,
or a broken card destination.

Do not emit an imagery residual, a generic catch-all residual or evidence from
the legacy homepage-only demo artifact.

## Security Contract

- **Visibility:** existing public-read Page, listing and detail routes plus the
  existing public Form submission route; this task adds no endpoint.
- **Authentication and RBAC:** public rendering and the existing public Form
  submission remain unauthenticated; no permission or privilege changes.
- **CSRF and anti-abuse:** reads do not require CSRF protection. Contact
  submission retains the Forms access evaluator, signed nonce, `public_write`
  rate bucket, required consent and optional reCAPTCHA v3 policy; no weaker
  package-specific path is introduced.
- **Validation:** Page, Menu, Form, content-route, setting and package payloads
  remain strict reject-unknown documents normalized by their native owners.
  Package references are resolved only at allowlisted paths before native
  persistence.
- **Output sinks:** links use the existing safe-link policy, inline SVG remains
  sanitizer-owned, and the normalized locale is escaped exactly once by the
  shared public string shell. No raw HTML, CSS, script, remote media, secret or
  untrusted setting value is emitted.

## Implementation Pseudocode

```ts
export function buildFormaDomPackage(): FullSitePackageV1 {
  const content = buildFormaDomContentResources();
  const pages = buildFormaDomPages({
    contentType: { ref: "content_type", key: HOUSE_PROJECT_RESOURCE_KEY },
    listingQuery: { ref: "listing_query", key: PROJECT_LISTING_QUERY_KEY },
    listingTemplate: { ref: "listing_template", key: PROJECT_LISTING_TEMPLATE_KEY },
    form: { ref: "form", key: PROJECT_BRIEF_FORM_KEY },
  }); // keys come from TASK-547-03 owner exports

  const pkg = normalizeFullSitePackageForWrite({
    schemaVersion: 1,
    key: "formadom-studio",
    metadata: FORMA_DOM_METADATA,
    resources: mergeResourceSlices(content, {
      pages,
      pageTemplates: [buildFooterTemplate()],
      menus: [buildPrimaryMenu()],
      settings: buildShellSettings(),
    }),
    compatibility: { unresolvedVisuals: buildFormaDomResiduals() },
    verification: { scenarioIds: FORMA_DOM_SCENARIO_IDS },
  });
  assertExactStaticSeo(pkg.resources.pages);
  assertDynamicDetailSeoPreserved(content.detailPages, pkg.resources.detailPages);
  assertSingleContentRoutesSetting(pkg);
  buildReferencePlan(pkg);
  return pkg;
}
```

**Data flow:** source-backed Page builders → package-aware validation of
ref-bearing documents → shell/menu/footer/settings builders → package normalizer
and closed reference graph → deterministic pretty JSON. Native strict
normalization runs after installer ref substitution where a document contains a
`PackageRef`.

**Error handling:** fail before writing the canonical artifact on missing or
extra route/section/menu item/footer element, copy mismatch, unsafe href, absent
SEO pair, unclosed ref, duplicate setting, unknown residual ID, or missing smoke
scenario. Never write a partial artifact.

**Regression shape:** exact source-copy and order tables, native interactivity,
seven static routes plus Aurora, menu/footer/settings shape, exact SEO, exact
residual ID set, package schema/ref closure, byte-stable generation and zero
artifact diff.

## Leaf Land Order

`TASK-547-04-L01 → TASK-547-04-L02 → TASK-547-04-L03`.

## Sub-Tasks

- [ ] **TASK-547-04-L01** — correct seven Page v2 documents and static SEO.
- [ ] **TASK-547-04-L02** — correct shell/settings/package and canonical artifact.
- [ ] **TASK-547-04-L03** — validate public Page/entry locale propagation.

## Testing Requirements

- L01/L02 named Vitest suites, L01's focused switcher accessible-name and module-
  boundary suites, plus the read-only legacy Page renderer/schema/editor,
  responsive CSS, Menu document/CSS and site-shell suites;
- L03 named Vitest and Bun runtime suites from its leaf contract;
- canonical generator run followed by zero diff on
  `_docs/_DEMO/projekty-domow.site.json`;
- `bun --cwd core lint`, `bun --cwd core lint:types`, and touched-file line-count
  gate after every leaf;
- runtime smoke appropriate to each UI/runtime leaf and final TASK-547 smoke.

## Documentation Updates Required

Send the final page/resource map, shell/design mapping and honest seven-residual
evidence to TASK-547-06, the sole shared-doc/changelog/board closure writer.

# TASK-547-04-L02: Site Shell, Settings and Canonical Artifact
# FileName: TASK-547-04-L02-Site-Shell-Settings-And-Canonical-Artifact.md

**Parent Subtask:** TASK-547-04
**Priority:** High
**Category:** Menu / Page Templates / Generator
**Estimated Effort:** Large
**Dependencies:** TASK-547-04-L01
**Status:** 🚧 In Progress
**Validation:** Current shell/package output does not match the pinned prototype;
corrective implementation, zero-diff generation and fresh gates are pending.

## Overview

Assemble the corrected Page/content slices into one deterministic package, build
the published-target primary Menu and footer Page Template, install safe
source-derived settings and emit the canonical JSON.

This leaf is the sole writer for:

- `scripts/demo-projekty-domow.tsx`
- `scripts/projekty-domow/shell.ts`
- `scripts/projekty-domow/package.ts`
- `_docs/_DEMO/projekty-domow.site.json`
- `tests/vitest/kits/projekty-domow-package.test.ts`

It consumes L01 `buildFormaDomPages`, L01 static SEO and TASK-547-03 content
resources read-only. It must not rebuild Page copy, mutate
`site.contentRoutes`, or edit public runtime/locale code.

Every Menu, Page Template and Setting seed is exactly `{ key, desired }` with no
DB ID. The desired Menu includes target status, complete ordered items,
normalized document and normalized appearance before publish. Shell Settings
remain the final reversible installer stage.

## Primary Menu Contract

Source authority is the repeated header in all eight prototype HTML documents,
plus `assets/styles.css` and `assets/app.js`. Filename hrefs normalize to CMS
paths and all labels remain literal.

### Items

The `primary` Menu has public/native name `Główna nawigacja`, target
`status:"published"` and exactly seven root items, with no children, in this
order:

| `orderIndex` | Label | Page ref |
| ---: | --- | --- |
| 0 | `Start` | `{ ref:"page", key:"home" }` |
| 1 | `Oferta` | `{ ref:"page", key:"oferta" }` |
| 2 | `Projekty` | `{ ref:"page", key:"projekty" }` |
| 3 | `Proces` | `{ ref:"page", key:"proces" }` |
| 4 | `Cennik` | `{ ref:"page", key:"cennik" }` |
| 5 | `O nas` | `{ ref:"page", key:"o-nas" }` |
| 6 | `Kontakt` | `{ ref:"page", key:"kontakt" }` |

Each item has a deterministic package-local child ID, `href:null`,
`parentId:null` and empty native settings unless a documented native menu field
requires otherwise. Current-route matching must stamp one `aria-current="page"`:
exact matches win, and the Projects item wins the longest-prefix match for
`/projekty/aurora`.

### MenuDocumentV2

Use one deterministic `menu-bar` section and stable block IDs. Required blocks
and device behavior are:

1. native brand link to `/`, visibly `FormaDom`; the source also shows subline
   `Studio projektów domów` and accessible label `FormaDom Studio — strona
   główna`. Use the closest safe native house icon/text combination and
   `site.name` fallback;
2. native `nav-items`, horizontal on desktop and
   `mobileMode:"disclosure"` for the responsive mobile branch;
3. desktop CTA `Zacznij projekt` → `/kontakt`, visible on desktop and hidden on
   tablet/mobile;
4. responsive CTA `Umów konsultację` → `/kontakt`, hidden on desktop and visible
   on tablet/mobile.

The disclosure must begin closed, expose native `<details>`/summary state, show
the seven links when opened and remain keyboard-operable. The source button's
accessible label is `Otwórz menu`; Coderso's native summary remains an accessible
`Menu` disclosure. The exact prototype hamburger glyph/overlay, two-line brand
and placement of its CTA are visual/geometry differences covered by
`header-brand-and-floating-frame-approximated`; wrong CTA labels/targets, missing
navigation items or an inert disclosure are not residuals.

The Menu document/appearance must author native scrolled-state variants so the
front runtime toggles `data-scrolled="true"` and visibly changes the frame after
scroll. Use source values where the schema can represent them:

- base surface `rgba(8,17,31,.62)`, scrolled surface
  `rgba(8,17,31,.84)`;
- base border `1px solid rgba(255,255,255,.12)`, scrolled border color
  `rgba(255,255,255,.18)`;
- base padding `12px 16px`, `alignment:"space-between"`, `sticky:true`;
- native radius `40` (the schema maximum) and custom shadow
  `0 18px 50px rgba(0,0,0,.24)`;
- nav link color `#a8b5c7`, hover text `#f7fbff`, hover/active surface matching
  the source translucent white treatment, pill-shaped link chrome, source-like
  gap and system typography. Native `aria-current` plus active surface is exact
  behavior; the schema's lack of a distinct active-text-color key is a bounded
  header-chrome difference.

The prototype uses a fixed `999px` floating pill at top 18/10 px and scroll
threshold 20 px, whereas the native bounded frame uses radius clamp 40, sticky
placement and its owned threshold. Those exact geometric differences belong
only to `header-brand-and-floating-frame-approximated`. The source-state change
itself must remain visible and tested.

Coderso applies `mobileMode:"disclosure"` only in its canonical mobile branch
(`<=639px`); the pinned prototype collapses already at `1060px`. Therefore the
canonical tablet branch (`640–1023px`) may retain an adapted visible nav instead
of the prototype overlay, but it must keep all seven links reachable, avoid
overflow and show the source mobile CTA. That bounded structural trigger
difference belongs to `exact-breakpoints-approximated`; tests must not falsely
claim tablet disclosure parity. Canonical mobile still requires the real native
disclosure behavior.

Keep `desired.appearance` and the appearance encoded by `desired.document`
semantically consistent. Both are complete before the Menu is published.

## Footer Page Template Contract

The `footer` Page Template has target `status:"published"` and a Page v2
document reproducing the common prototype footer in this order:

1. **Brand column:** a sanitizer-owned `customSvg` reproduces the source footer
   house mark (`viewBox="0 0 48 48"` and its two source paths; no media/remote
   asset), followed by `FormaDom`; subline `Domy z charakterem`; copy
   `Nowoczesne projekty domów jednorodzinnych, adaptacje, koncepcje premium i
   wizualizacje, które pomagają podjąć dobrą decyzję jeszcze przed budową.` The
   brand links to `/`.
2. **Menu column:** heading `Menu`; `Oferta` → `/oferta`; `Projekty` →
   `/projekty`; `Proces` → `/proces`; `Cennik` → `/cennik`.
3. **Kontakt column:** heading `Kontakt`;
   `kontakt@formadom.studio` → `mailto:kontakt@formadom.studio`;
   `+48 500 100 200` → `tel:+48500100200`; text
   `Warszawa / praca zdalna w całej Polsce`.
4. **Start projektu column:** heading `Start projektu`; copy `Masz działkę,
   inspiracje albo tylko ogólną wizję? Przekujemy to w konkretny plan.`;
   `Wyślij brief` → `/kontakt`.
5. **Bottom row:** `© 2026 FormaDom Studio. Projekt demo.` followed by
   `Minimalizm · komfort · nowoczesność`.

Do not replace this with a short generic footer, `Wszystkie prawa zastrzeżone`,
different contact data or an invented legal/public claim. The safe Page
`customSvg` means the footer house mark is representable and is not waived by the
header residual; all visible footer text and links remain exact.

## Settings And Design Mapping

Emit one seed for each key below and no duplicate shell/content-route setting:

- `site.name` → `{ value:"FormaDom Studio" }`
- `site.locale` → `{ value:"pl" }`
- `site.homepageId` → `{ value:{ ref:"page", key:"home" } }`
- `site.navigationMenuId` → `{ value:{ ref:"menu", key:"primary" } }`
- `site.footerTemplateId` → `{ value:{ ref:"page_template", key:"footer" } }`
- `design.tokens` → the safe token mapping below

TASK-547-03 owns the single `site.contentRoutes` seed. Assembly preserves it
byte-for-byte and fails on a second instance. L01 owns all static Page SEO; L02
does not emit separate SEO settings or mutate Page documents.

The source palette in `assets/styles.css` is:

- background `#07111f`, secondary background `#0b1628`;
- translucent surface `rgba(255,255,255,.075)`, strong surface
  `rgba(255,255,255,.12)`, glass `rgba(11,22,40,.72)`;
- text `#f7fbff`, muted `#a8b5c7`, quieter muted `#7e8ba0`, line
  `rgba(255,255,255,.14)`;
- aqua `#8ee8ff`, mint `#adffd8`, violet `#c7b7ff`, warm `#ffd7a8`, danger
  `#ff9fba`.

The strict `design.tokens` subset maps that source without invented colors:

```ts
{
  colors: {
    primary: "#8ee8ff",
    secondary: "#c7b7ff",
    accent: "#adffd8",
  },
  neutrals: {
    bg: "#07111f",
    surface: "#0b1628",
    border: "rgba(255,255,255,.14)",
    text: "#f7fbff",
  },
  radius: { sm: "18px", md: "18px", lg: "28px", xl: "28px" },
  typography: {
    sans: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
    display: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  },
}
```

The doubled radius values consciously map the prototype's only two root radius
tokens (`--radius-sm:18px`, `--radius:28px`) into Coderso's four-slot scale.
L01 Page styles may use the other source values explicitly through strict native
style fields. Do not load IBM Plex Sans/Space Grotesk or introduce old lime/
purple values absent from the source.

## Canonical Package And Residual Contract

Package metadata is deterministic: key `formadom-studio`, name `FormaDom
Studio`, metadata locale `pl-PL`; the installed document-language setting is
intentionally `site.locale:"pl"`.

`compatibility.unresolvedVisuals` is an exact set, not an extensible scratchpad:

| Residual ID | Source evidence | Bounded difference |
| --- | --- | --- |
| `favicon-not-installed` | `assets/favicon.svg` and each HTML `<link rel="icon">` | package has no asset/media resource kind; existing favicon remains |
| `theme-color-not-installed` | each HTML `<meta name="theme-color" content="#08111f">` | package contract does not install this document-head setting |
| `header-brand-and-floating-frame-approximated` | repeated HTML header, `assets/styles.css`, `assets/app.js` | native safe icon + `FormaDom`, accessible `Menu` disclosure and bounded radius/sticky/threshold/CTA placement approximate the custom mark, `Studio projektów domów` subline, hamburger overlay and fixed frame |
| `native-form-heading-approximated` | `kontakt.html:40,48-62` | native Form block requires an extra visible title; installed title uses TASK-547-03's `PROJECT_BRIEF_FORM_TITLE` (`Zacznij projekt`) |
| `prototype-css-art-and-motion-approximated` | `index.html`, detail/page art, `assets/styles.css`, `assets/app.js` | bounded SVG/gradients/effects approximate exact clipping, keyframes, cursor/reveal/tilt/ticker timing; the source icon-only scroll anchor/pill/dot becomes one visible `Przewiń do treści` Page link, with no second non-linking `scrollHint` cue |
| `portfolio-filter-and-card-chrome-approximated` | `projekty.html`, project-card/filter CSS | source chips are represented by a native `Wszystkie` reset link, four radio options and explicit `Pokaż projekty` apply control; native chrome also shows `Filtruj wyniki`, its localized description, `Kategoria`, exact resolved option counts, selected-filter summary/clear UI and the source-absent visitor copy `Brak wyników` / `Zmień filtry, aby zobaczyć inne projekty.`; the whole card remains the semantic link with no visible CTA label; card/control/empty-state chrome differs while source labels/order, derived counts, reset, filtering and results stay functional and exact |
| `exact-breakpoints-approximated` | CSS media queries at `1060px` and `700px` | canonical Coderso tablet/mobile branches preserve intent at owned breakpoints |

Every object must include normalized `prototypeEvidence`, `cmsConstraint`,
`installedApproximation`, `userVisibleDifference`, full required impact flags and
`postInstallRemediation`. No residual may waive functional, accessibility, data,
security or test-integrity behavior. There is no imagery residual because the
prototype deliberately uses CSS/SVG abstract artwork rather than photographs.

The verification plan retains exactly these final scenario IDs:

`home-desktop-effects`, `all-routes-desktop-shell`, `tablet-responsive`,
`mobile-navigation`, `portfolio-facets`, `aurora-detail`, `contact-form`,
`publish-rollback`.

## Security Contract

No endpoint. Settings are limited to TASK-547-01's allowlist; no secrets,
remote media or raw code. Menu and Page Template documents pass their strict
reject-unknown normalizers. Package refs occur only at TASK-547-01 allowlisted
paths and are substituted before native normalization/persistence. All shell
hrefs pass the existing authoring-link sanitizer.

## Implementation Pseudocode

```ts
export function buildPrimaryMenu(): ResourceSeed {
  const document = normalizeMenuDocumentV2ForWrite(
    buildExactFormaDomMenuDocument({
      desktopCta: ["Zacznij projekt", "/kontakt"],
      mobileCta: ["Umów konsultację", "/kontakt"],
      mobileMode: "disclosure",
      scrolledState: FORMA_DOM_SCROLLED_FRAME,
    }),
  );
  return {
    key: "primary",
    desired: {
      name: "Główna nawigacja",
      location: "primary",
      status: "published",
      items: buildExactMenuItems(),
      document,
      appearance: normalizeMenuAppearance(FORMA_DOM_MENU_APPEARANCE),
    },
  };
}

export function buildFormaDomPackage(): FullSitePackageV1 {
  const content = buildFormaDomContentResources();
  const pages = buildFormaDomPages({
    contentType: { ref: "content_type", key: HOUSE_PROJECT_RESOURCE_KEY },
    listingQuery: { ref: "listing_query", key: PROJECT_LISTING_QUERY_KEY },
    listingTemplate: { ref: "listing_template", key: PROJECT_LISTING_TEMPLATE_KEY },
    form: { ref: "form", key: PROJECT_BRIEF_FORM_KEY },
  });
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
  assertExactStaticSeo(pkg.resources.pages); // preserve L01 ownership
  assertSingleContentRoutesSetting(pkg);
  buildReferencePlan(pkg);
  return pkg;
}
```

**Data flow:** fresh L01/TASK-547-03 slices → normalized Menu/footer/settings →
package normalizer/ref plan → deterministic Prettier serialization → atomic
canonical-artifact write by the CLI/generator boundary.

**Error handling:** throw before writing on missing/extra menu/footer element,
copy/style/token mismatch, duplicate setting, missing/altered static or dynamic
detail SEO, unknown or incomplete residual, ref-graph failure, schema failure or
scenario-set drift.
Never leave a partial canonical file.

## Regression Tests

`tests/vitest/kits/projekty-domow-package.test.ts` must remain cohesive and at
most 1,000 physical lines; split by shell/package concern before growth beyond
that boundary. It asserts:

- exact public Menu name `Główna nawigacja` (and explicit rejection of stale
  `Menu główne FormaDom`), exact item order/refs, two CTA labels/targets/device
  visibility, active prefix behavior, canonical-mobile disclosure, reachable
  non-overflowing tablet navigation and authored scrolled frame;
- complete literal footer order/copy/contact/demo row plus the safe source house
  `customSvg`;
- exact settings/ref values, source token mapping and no duplicate
  `site.contentRoutes`;
- preservation of all seven L01 static SEO pairs and TASK-547-03 dynamic Aurora
  detail SEO plus its content route;
- contact Form block title equal to imported `PROJECT_BRIEF_FORM_TITLE`
  (`Zacznij projekt`), never a retyped, invented or fallback heading; no sibling
  Page copy of `PROJECT_BRIEF_INITIAL_NOTE`; and the referenced Form owns that
  exact note at `theme.submit.supportingText`;
- exact seven residual IDs/complete objects, no imagery residual and no stale
  legacy homepage-only demo-artifact citation; scroll/filter residual objects
  enumerate every bounded native difference above rather than hiding it behind
  generic `chrome` or `motion` wording;
- no media/widget-template resource, schema/ref closure, deterministic output,
  canonical JSON equality and generator zero diff.

## Sub-Tasks

- [ ] Build the exact primary Menu document, ordered items, responsive CTAs,
  disclosure and scrolled appearance.
- [ ] Build the complete footer Page Template and strict source-derived shell
  settings/design-token seeds.
- [ ] Assemble the corrected content/Page slices, exact residual objects and
  verification scenarios without duplicating SEO or content routes.
- [ ] Regenerate the canonical artifact twice, require byte stability/zero diff,
  and pass the package, Menu, shell and line-count gates.

## Testing Requirements

- named package Vitest suite plus relevant MenuDocumentV2/Menu CSS/site-shell,
  Page Template and design-token suites;
- run the generator twice and require identical bytes plus zero git diff on the
  canonical JSON after the second run;
- `bun --cwd core lint`, `bun --cwd core lint:types` and touched-file line counts;
- runtime menu/footer/responsive states are handed to TASK-547-06 smoke and must
  be observed through DOM/ARIA/computed geometry, not serialized props alone.

## Documentation Updates Required

Send the exact shell/settings/footer/token/residual mapping to TASK-547-06; do
not edit shared docs, board or changelog from this leaf.

# TASK-547-04-L02: Site Shell, Settings and Canonical Artifact
# FileName: TASK-547-04-L02-Site-Shell-Settings-And-Canonical-Artifact.md

**Parent Subtask:** TASK-547-04
**Priority:** High
**Category:** Menu / Page Templates / Generator
**Estimated Effort:** Large
**Dependencies:** TASK-547-04-L01
**Status:** ⏳ To Do

## Overview

Own primary MenuDocumentV2, Page-v2 footer template, safe design/site settings,
SEO, full package assembly and canonical site JSON.

## Security Contract

No endpoint. Settings restricted to safe allowlist; Menu/Page Template native
schemas; no widget-template seed or secrets.

## Implementation Pseudocode

```ts
export function assembleFormaDomPackage(slices) {
  return normalizeFullSitePackageForWrite({
    schemaVersion:1, key:"formadom-studio",
    metadata:{name:"FormaDom Studio",locale:"pl-PL",description:FORMA_DOM_DESCRIPTION},
    resources: merge(slices, buildMenu(), buildFooterPageTemplate(), [
      setting("site.name", "FormaDom Studio"),
      setting("site.locale", "pl"),
      setting("site.homepageId", ref("page","home")),
      setting("site.navigationMenuId", ref("menu","primary")),
      setting("site.footerTemplateId", ref("page_template","footer")),
      ...buildSafeDesignSettings(),
    ]),
    compatibility:buildVerifiedVisualResiduals([
      visualResidual({
        id:"favicon-not-installed",
        prototypeEvidence:"_docs/projekty-domow-wow-site/assets/favicon.svg",
        cmsConstraint:"TASK-547 excludes binary/media installation",
        installedApproximation:"site keeps its existing favicon",
        userVisibleDifference:"prototype brand favicon is not installed",
        postInstallRemediation:"upload/configure the approved brand favicon",
      }),
      visualResidual({
        id:"real-project-and-team-imagery-not-installed",
        prototypeEvidence:"_docs/projekty-domow-wow-site/*.html visual surfaces",
        cmsConstraint:"TASK-547 seeds no CMS media IDs",
        installedApproximation:"safe SVG/gradient/card artwork",
        userVisibleDifference:"abstract artwork replaces photography",
        postInstallRemediation:"replace placeholders through Media Library",
      }),
      ...buildCssFidelityResiduals(), // pseudo-elements, clip-path, keyframes, 1060/700 breakpoints
    ]),
    verification:buildFormaDomVerificationPlan(),
  });
}
```

`metadata.locale:"pl-PL"` describes package/content metadata. The installed
`site.locale:"pl"` is the normalized public document-language tag consumed by
TASK-547-04-L03; tests pin this intentional distinction.

Data flow: normalized slices → shell/settings refs → package normalize → atomic
pretty JSON. Fail before write on missing route/link/ref/SEO/verifier scenario.

Regression tests in `tests/vitest/kits/projekty-domow-package.test.ts`: byte-stable
generation, zero diff after rerun, required metadata, exact `site.name` and shell
refs/counts, exact `site.locale:"pl"` and public shell brand, seven
static + dynamic Aurora route, exactly one `site.contentRoutes` SettingSeed
(assembly never rewrites it), no legacy widget templates or media refs. DB
second-apply/rollback assertions remain owned by TASK-547-02-L03/06-L01.
Tests require full residual objects for favicon, imagery, pseudo-elements/
clip-path/keyframes and exact-breakpoint deltas; bare codes or any non-false impact
flag fail normalization.

## Sub-Tasks

- [ ] Build menu/footer/settings/SEO/package assembler.
- [ ] Emit and test canonical `_docs/_DEMO/projekty-domow.site.json`.

## Testing Requirements

Targeted Menu/Site Shell/Page Template/package tests; generator zero-diff; lint/types/line counts.

## Documentation Updates Required

Send generator/shell/design guidance to TASK-547-06.

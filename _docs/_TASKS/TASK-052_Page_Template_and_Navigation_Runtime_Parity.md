# TASK-052: Page Template and Navigation Runtime Parity
# FileName: TASK-052_Page_Template_and_Navigation_Runtime_Parity.md

**Priority:** High  
**Category:** CMS/Pages + CMS/Themes + CMS/Menus + Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-008-03, TASK-044, TASK-045, TASK-046, TASK-050-06, TASK-051  
**Status:** To Do

---

## Overview

Close the remaining front/runtime gaps so public rendering and runtime preview are truly complete:

1. `page.data.settings.template` is currently stored but not used by page runtime rendering.
2. `page.data.settings.showInNav` is currently stored but not used to build any runtime navigation source.
3. Page settings UI uses hardcoded template options instead of active-theme driven options.

Goal:
- deterministic page template resolution in runtime (public + preview),
- deterministic navigation source that can use pages flagged with `showInNav`,
- full admin/runtime parity with clear, user-friendly controls.

---

## Current Gap (verified)

- `Template and navigation` settings are saved in page data (`template`, `showInNav`) but runtime page renderer uses only blocks + layout.
- Runtime page rendering path does not resolve `type: "page"` templates via theme resolver.
- Navigation widget supports `manual` and `menu` sources only; no first-class page-index source using page settings.

---

## Sub-Tasks

1. **TASK-052-01** Page Template Contract and Resolver
2. **TASK-052-02** Page Runtime Template Wiring
3. **TASK-052-03** Navigation Runtime Pages Source and `showInNav`
4. **TASK-052-04** Admin UI Template and Navigation Source Wiring
5. **TASK-052-05** Regression Tests and Documentation Parity

---

## Architecture Target

### Runtime page rendering stack

1) Page request resolves page data (`publishedData` or preview `currentData`).
2) Page template key is normalized from `settings.template` (fallback rules).
3) Template component path is resolved through existing template resolver order:
- theme template
- plugin view fallback
- core template fallback
4) Template receives normalized runtime props (title, blocks, layout, preview metadata).
5) If template is missing/invalid, fallback renderer still produces deterministic HTML.

### Navigation source stack

Navigation link source order (deterministic):
- `manual`: use widget items.
- `menu`: use selected menu (or location fallback) then normalize.
- `pages`: build links from published pages with `settings.showInNav=true`.

---

## Pseudocode (high-level)

```ts
// publicSite.tsx (page branch)
const pageModel = options.preview ? page.currentData : page.publishedData;
const pageSettings = resolvePageSettings(pageModel);
const templateKey = normalizePageTemplateKey(pageSettings.template);

const html = await renderPublicPageRuntimeHtml({
  themeName,
  templateKey,
  title: page.title,
  blocks: hydratedBlocks,
  layoutSettings: getPageLayoutSettingsFromData(pageModel),
  isPreview,
  previewDevice,
  styles,
});
```

```ts
// navigationRuntimeResolver.ts
if (data.linksSource === "pages") {
  const pages = await listPublishedPagesForNavigation();
  return pages.map((page) => ({ label: page.title, href: page.slug }));
}
if (data.linksSource === "menu") {
  const menu = await resolveMenuByKeyOrLocation(data.menuKey, "primary");
  return normalizeMenuItems(menu?.items ?? []);
}
return normalizeManualItems(data.items);
```

---

## Acceptance Criteria

1. Runtime page rendering uses `settings.template` in both public and preview paths.
2. Runtime fallback remains safe when template is missing or import fails.
3. Navigation widget supports `pages` source based on `showInNav=true` pages.
4. Admin page settings show active-theme template options (no hardcoded list).
5. Canvas vs runtime preview contract remains explicit and unchanged.
6. Lint/types + focused test suites pass.

---

## Testing Requirements

- Unit:
  - page template key normalization and fallback
  - page template resolver path selection
  - navigation runtime resolver (`manual/menu/pages`) ordering and fallback
- Integration:
  - page preview endpoint includes template-aware runtime output
  - widget-template preview remains unaffected
- UI:
  - page settings template select loads dynamic options
  - navigation editor exposes `pages` source semantics

Run at minimum:
- `bun test tests/unit/site/publicRenderer.test.tsx`
- `bun test tests/unit/widgets/navigation.test.tsx`
- `bun test tests/unit/themes/resolver.test.ts`
- `bun test tests/integration/routes/pages.test.ts tests/integration/routes/widgetTemplatePreview.test.ts`
- `bun --cwd core lint && bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_SPEC.md` (runtime template + navigation source semantics)
- `_docs/PAGE_MODEL.md` (`settings.template`, `settings.showInNav` runtime behavior)
- `_docs/WIDGETS.md` (navigation `linksSource=pages` contract)
- `_docs/THEMES_SPEC.md` (page template resolution contract)
- `_docs/PREVIEW_SPEC.md` (template-aware page preview pipeline)
- `_docs/CMS_API.md` (new/updated endpoints for template options and runtime contracts)
- `_docs/_TASKS/README.md` (board status updates)

---

## Changelog Entry (planned after completion)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-page-template-and-navigation-runtime-parity.md`

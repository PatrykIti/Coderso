# TASK-052-02: Page Runtime Template Wiring
# FileName: TASK-052-02_Page_Runtime_Template_Wiring.md

**Priority:** High  
**Category:** CMS/Runtime + CMS/Pages  
**Estimated Effort:** Medium  
**Dependencies:** TASK-052-01, TASK-044, TASK-046-02  
**Status:** To Do

---

## Overview

Wire page template resolution into real runtime output for both:
- public page rendering,
- page preview rendering.

This task ensures `settings.template` changes actual front output, not only stored JSON.

---

## Scope

1. Extend page runtime render pipeline to load optional template component.
2. Keep current fallback shell behavior when no template is available.
3. Preserve current CSS/dev-script injection and preview banner behavior.
4. Keep widget-template preview and content preview unaffected.

---

## Pseudocode

```ts
// core/server/publicSite.tsx
const sourceData = isPreview ? page.currentData : page.publishedData;
const settings = resolvePageSettings(sourceData);
const templateKey = settings.template;

return renderPublicPageHtmlInternal({
  title: page.title,
  blocks,
  layoutSettings,
  themeName,
  templateKey,
  isPreview,
  previewDevice,
  stylePayload,
});
```

```tsx
// core/site/renderPublicPage.tsx
const templatePath = await resolvePageTemplatePath({ themeName, templateKey, cache });
const Template = templatePath ? await loadTemplateComponent<PageTemplateProps>(templatePath) : null;

const body = (
  <PageRuntimeRoot {...props}>
    {Template ? <Template {...templateProps} /> : <DefaultPageTemplate {...templateProps} />}
  </PageRuntimeRoot>
);
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/site/renderPublicPage.tsx` | refactor | add template-aware render branch + loader |
| `core/server/publicSite.tsx` | update | pass `themeName` + normalized `templateKey` into page renderer |
| `core/services/pages/layoutSettings.ts` | optional helper | expose shared settings resolver if needed |
| `tests/unit/site/publicRenderer.test.tsx` | update | assert template key affects output markers |
| `tests/unit/site/publicSite.test.tsx` | new/update | page preview uses template path and fallback behavior |

---

## Acceptance Criteria

1. Public page render path uses resolved page template when present.
2. Preview page render path uses the same template resolution logic.
3. Missing template never crashes runtime output.
4. Existing preview links and site CSS injection remain unchanged.

---

## Testing Requirements

- `bun test tests/unit/site/publicRenderer.test.tsx`
- `bun test tests/unit/site/publicSite.test.tsx`
- `bun test tests/integration/routes/pages.test.ts`
- `bun --cwd core lint && bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md` (page preview now template-aware)
- `_docs/CMS_API.md` (page preview/runtime notes)
- `_docs/ARCHITECTURE.md` (page runtime render flow)

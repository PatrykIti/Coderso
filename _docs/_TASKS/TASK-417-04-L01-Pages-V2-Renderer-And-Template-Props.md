# TASK-417-04-L01: Pages V2 Renderer And Template Props
# FileName: TASK-417-04-L01-Pages-V2-Renderer-And-Template-Props.md

**Parent Subtask:** TASK-417-04
**Priority:** High
**Category:** Pages / Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-417-02-L02, TASK-417-03-L01
**Status:** ✅ Done

---

## Overview

Add the Pages v2 React SSR renderer for sections and atomic blocks and introduce
a separate Pages v2 template boundary. The legacy `PageTemplateProps.blocks`
and `page-landing.tsx` path remain available for non-Page widget surfaces until
a future template migration task replaces them.

---

## Security Contract

- **Endpoint visibility:** public read-only render path.
- **Auth model:** no auth for published pages; preview token for preview.
- **RBAC:** not applicable at render time.
- **CSRF:** not applicable to read-only render paths.
- **Rate-limit bucket:** existing public/preview bucket behavior.
- **Validation:** renderer normalizes through the Pages v2 owner and never
  invokes the v1 Page widget renderer for Page data.
- **Anti-abuse controls:** no public write endpoint is introduced.

---

## Sub-Tasks

- [x] Add `PageTemplatePropsV2` with `document: PageDocumentV2`.
- [x] Add a separate v2 template resolver/family, for example
  `page-v2-${key}.tsx` and `page-v2.tsx`, so v2 Pages do not repurpose the
  legacy `page-${key}.tsx` widget-block template contract.
- [x] Introduce the v2 Page renderer boundary in `core/site/renderPublicPage.tsx`
  without removing widget rendering paths used by non-Page surfaces.
- [x] Render sections with layout/style/spacing/visibility and responsive
  cascade applied for preview device.
- [x] Render every atomic block safely.
- [x] Preserve SEO/meta/document shell behavior.

---

## Implementation Pseudocode

```tsx
export type PageTemplatePropsV2 = {
  title: string;
  templateKey: string;
  document: PageDocumentV2;
  isPreview?: boolean;
  previewDevice?: PageBreakpoint;
};

export async function renderPublicPageRuntimeHtmlV2(options: PageV2RenderOptions) {
  const templatePath = await resolvePageTemplatePathV2({
    themeName: options.themeName,
    templateKey: options.templateKey,
  });
  const Template = templatePath ? await loadTemplateComponentV2(templatePath) : null;
  return renderDocumentWithPageShellV2(
    Template ? <Template {...options} /> : <DefaultRuntimePageShellV2 {...options} />
  );
}

export function DefaultRuntimePageShellV2(props: PageTemplatePropsV2) {
  const breakpoint = toPageBreakpoint(props.previewDevice ?? "desktop");
  return (
    <main data-page-schema-version="2">
      {props.document.sections.map((section) => (
        <PageSectionRuntime
          key={section.id}
          section={resolvePageSectionForBreakpoint(section, breakpoint)}
          breakpoint={breakpoint}
        />
      ))}
    </main>
  );
}
```

Expected data flow:

- Public Page render calls receive a normalized v2 document.
- v2 template loaders pass `document` to v2 Page templates only.
- Existing `renderPublicPageRuntimeHtml` and legacy `PageTemplateProps.blocks`
  remain scoped to detail pages, widget-template preview, and other non-Page
  widget surfaces.
- `toPageBreakpoint` adapts the existing runtime `DeviceTarget` vocabulary so
  preview device handling does not fork into two unrelated models.
- Non-Page widget template/detail rendering remains outside this prop contract.

Error handling:

- Invalid v2 data yields the domain error before render.
- Empty documents render an empty safe Page state.
- Unsafe URLs in button/image/embed props are omitted or rendered as inert
  fallback content.

Regression-test shape:

- Bun/SSR tests assert sections and all atomic blocks render, responsive device
  output changes only overridden fields, and no `WidgetRenderer` is used for
  Pages.
- Tests assert legacy `page-landing.tsx`/`PageTemplateProps.blocks` still render
  non-Page widget surfaces while Pages use the v2 template family.

---

## Testing Requirements

- Targeted Bun public runtime tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/PREVIEW_SPEC.md`

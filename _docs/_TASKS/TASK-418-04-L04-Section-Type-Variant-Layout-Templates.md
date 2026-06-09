# TASK-418-04-L04: Section Type Variant Layout Templates
# FileName: TASK-418-04-L04-Section-Type-Variant-Layout-Templates.md

**Parent Subtask:** TASK-418-04
**Priority:** High
**Category:** Pages / Runtime / Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-418-04-L01, TASK-418-02-L04
**Status:** ⏳ To Do

---

## Overview

Make `section.type` and `section.variant` meaningful in the shared renderer.
Today they are mostly metadata: the runtime emits `data-page-section` but
renders every section as a generic grid, and `variant` does not drive layout.
This leaf adds bounded layout templates for supported section type/variant
combinations and makes unsupported combinations explicit.

---

## Implementation Pseudocode

```tsx
type PageSectionTemplateDefinition = {
  type: PageSectionType;
  variants: readonly PageSectionVariant[];
  render: (section: PageSectionV2, context: PageRenderContext) => ReactNode;
};

export const pageSectionTemplateRegistry = defineSectionTemplates({
  hero: {
    variants: ["default", "split", "centered", "full-width"],
    render: renderHeroSection,
  },
  "feature-grid": {
    variants: ["default", "cards", "grid"],
    render: renderFeatureGridSection,
  },
});

function renderPageSection(section, context) {
  const template = resolveSectionTemplate(section.type, section.variant);
  return (
    <section data-page-section={section.type} data-page-variant={section.variant}>
      {template.render(section, context)}
    </section>
  );
}
```

Expected data flow:

- Section template registry defines supported variants per section type.
- Control registry uses the same registry to expose valid variant choices.
- Runtime, preview, and admin canvas render through the same section template.

Error handling:

- Unsupported section type/variant pairs normalize to a documented fallback or
  are hidden from insertable catalogs.
- Missing optional block content renders a safe empty state without breaking the
  section template.

Regression-test shape:

- `hero:split` and `hero:centered` render different markup/classes.
- Runtime emits `data-page-section` and `data-page-variant`.
- Variant controls only show supported variants for the selected section type.
- Admin canvas and public runtime use the same section template output excluding
  editor chrome.

---

## Security Contract

- **Endpoint visibility:** public rendering remains read-only; admin writes use
  existing internal Pages routes.
- **Auth model:** existing admin session for writes; public reads unchanged.
- **RBAC:** existing Pages permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin/public buckets.
- **Validation:** section type/variant values remain strict enum-normalized and
  reject unknown fields on write.
- **Anti-abuse controls:** no public write endpoint; templates must preserve
  sanitizer and media trust boundaries for child blocks.

---

## Testing Requirements

- Vitest registry tests for section type/variant coverage.
- Bun runtime tests for distinct section template output and `data-page-variant`.
- Vitest UI test that variant controls are type-scoped.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
- `_docs/PAGE_EDITOR_V2_AUDIT_REPORT.md`

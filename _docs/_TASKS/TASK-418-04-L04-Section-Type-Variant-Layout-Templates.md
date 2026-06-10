# TASK-418-04-L04: Section Type Variant Layout Templates
# FileName: TASK-418-04-L04-Section-Type-Variant-Layout-Templates.md

**Parent Subtask:** TASK-418-04
**Priority:** High
**Category:** Pages / Runtime / Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-418-04-L01, TASK-418-02-L04
**Status:** ✅ Done
**Started:** 2026-06-10
**Completed:** 2026-06-10

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
  fallbackVariant: PageSectionVariant;
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
    <section data-page-section={section.type} data-page-variant={template.variant}>
      {template.definition.render(template.section, context)}
    </section>
  );
}
```

Supported section template matrix:

| Section type | Supported variants | Fallback variant | Template behavior |
|---|---|---|---|
| `hero` | `default`, `split`, `centered`, `full-width` | `default` | centered/split/full-width hero arrangements for heading, text, action, and media blocks |
| `content` | `default`, `compact` | `default` | linear content flow with compact density option |
| `feature-grid` | `default`, `cards`, `grid` | `default` | block grid/card grouping for feature content |
| `media-split` | `split`, `horizontal`, `default` | `split` | media-like blocks and copy blocks are arranged as split or horizontal groups |
| `timeline` | `default`, `horizontal`, `compact` | `default` | timeline/list rhythm for statistic/card/text blocks |
| `gallery` | `grid`, `cards`, `default` | `grid` | gallery/image/card block grouping |
| `comparison` | `default`, `grid`, `cards` | `default` | comparison cards/table-like grouping |
| `faq` | `default`, `compact` | `default` | question/content blocks with compact list option |
| `testimonials` | `cards`, `grid`, `default` | `cards` | quote/card blocks as testimonial cards |
| `cta` | `centered`, `full-width`, `default` | `centered` | focused CTA flow for heading/text/button blocks |
| `custom` | `default`, `compact`, `grid` | `default` | safe generic passthrough for custom sections |

Stored but non-insertable section types (`template`, `navigation`, `collection`,
`filters`, `lead-form`, `embed`) must keep universal section controls in
PageEditor, but they use a documented generic fallback template and type-scoped
variant choices only when a registry entry exists. Insertability gates the
command palette, not editing of valid stored sections.

Expected data flow:

- Section template registry defines supported variants per section type.
- Control registry uses the same registry to expose valid variant choices; the
  generic host is introduced in TASK-418-03-L01, while the concrete
  type/variant registry is owned here.
- Variant editing uses the existing root `PageSectionV2.variant` field only.
  `variant` is not breakpoint-aware in this leaf; responsive overrides continue
  to cover only section `layout`, `style`, `spacing`, and `visibility`.
- Runtime, preview, and admin canvas render through the same section template.

Error handling:

- Unsupported section type/variant pairs render through the documented fallback
  variant at render/control time without mutating stored data. Fresh writes still
  strict-normalize enum values through the Pages owner.
- Missing optional block content renders a safe empty state without breaking the
  section template.

Regression-test shape:

- `hero:split` and `hero:centered` render different markup/classes.
- Runtime emits `data-page-section` and `data-page-variant`.
- Variant controls only show supported variants for the selected section type.
- Stored non-insertable sections keep universal controls while command-palette
  insertion remains capability-gated.
- Admin canvas and public runtime use the same shared section template/content
  output excluding editor chrome.

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

---

## Closeout Notes

- Added `core/services/pages/pageSectionTemplates.ts` as the Pages-owned
  section type/variant matrix with fallback variants and base-only variant
  semantics.
- Updated the shared renderer to resolve section templates, emit
  `data-page-section-template`, use resolved `data-page-variant`, and apply
  variant-specific layout classes for public runtime and admin canvas.
- Added type-scoped section variant controls through
  `pageEditorControlRegistry`; PageEditor renders the control as base-only and
  keeps stored non-insertable sections on universal controls.
- Replaced hardcoded section palette insertion with `pageSectionCapabilities`
  so deferred non-insertable section types remain hidden from the command
  palette while stored rows still render/edit through fallback behavior.
- Pre-implementation audits `019eaf1a-a91d-7402-8cff-68f340693b1c` and
  `019eaf1e-359e-73f3-9224-4a9932968548` found contract drift around the
  supported matrix, base-only variant editing, and non-insertable fallback
  scope. The task/report contract was corrected, then audit
  `019eaf22-2407-7f01-aa2f-0bc10fb83ae7` reported no High, Medium, or Low
  drift before source edits.
- Validation passed:
  `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx`
  (59 tests),
  `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts`
  (10 tests), `bun --cwd core lint:types`, and `bun --cwd core lint`.
  Focused post-type-fix validation also passed:
  `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/page-editor-control-registry.test.ts`
  (15 tests).

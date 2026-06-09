# TASK-418-04-L02: Section Layout Style Spacing Visibility Feedback
# FileName: TASK-418-04-L02-Section-Layout-Style-Spacing-Visibility-Feedback.md

**Parent Subtask:** TASK-418-04
**Priority:** High
**Category:** Admin UI / Pages
**Estimated Effort:** Medium
**Dependencies:** TASK-418-04-L01
**Status:** ⏳ To Do

---

## Overview

Apply section layout, style, spacing, background, visibility, and responsive
state to the admin canvas. The current canvas uses static rounded white cards,
so many toolbar changes either do not appear or appear unrelated to public
runtime.

---

## Implementation Pseudocode

```tsx
function SectionCanvas({ section, selection, breakpoint }) {
  const resolved = resolvePageSectionForBreakpoint(section, breakpoint);
  const renderProps = toPageSectionRenderProps(resolved);
  return (
    <section
      id={resolved.visibility.anchor ?? undefined}
      data-page-editor-section={resolved.type}
      data-overridden={hasSectionOverride(section, breakpoint) || undefined}
      className={joinClasses("relative", renderProps.className, selectionClass(selection))}
      style={{
        ...renderProps.style,
        paddingTop: resolved.spacing.paddingTop,
        paddingBottom: resolved.spacing.paddingBottom,
        paddingLeft: resolved.spacing.paddingLeft,
        paddingRight: resolved.spacing.paddingRight,
        gap: resolved.spacing.gap
      }}
    >
      <SectionEditorChrome />
      <SectionBlocks section={resolved} />
    </section>
  );
}
```

Expected data flow:

- Toolbar changes update base/responsive section values.
- Canvas resolves the selected breakpoint and applies the same values.
- Hidden sections show editor chrome/ghost state in admin, but public runtime
  omits them.

Error handling:

- Clamp numeric values through the domain owner.
- Invalid colors/backgrounds normalize or show bounded validation copy.
- Date/auth visibility states should be represented safely in admin preview.

Regression-test shape:

- Background, radius, shadow, padding, columns, align, justify, and visibility
  changes produce visible canvas state.
- Mobile override changes only mobile canvas state.

---

## Security Contract

- **Endpoint visibility:** no new endpoint.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** section style/spacing/visibility remains schema-owned.
- **Anti-abuse controls:** background image/media values must preserve existing
  media trust rules.

---

## Testing Requirements

- Vitest UI tests for section visual style changes.
- Vitest UI tests for hidden section admin ghost vs public omission where
  covered by runtime tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`

# TASK-418-04-L02: Section Layout Style Spacing Visibility Feedback
# FileName: TASK-418-04-L02-Section-Layout-Style-Spacing-Visibility-Feedback.md

**Parent Subtask:** TASK-418-04
**Priority:** High
**Category:** Admin UI / Pages
**Estimated Effort:** Medium
**Dependencies:** TASK-418-04-L01
**Status:** ✅ Done
**Started:** 2026-06-09
**Completed:** 2026-06-09

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
  return (
    <section
      data-page-editor-section={resolved.type}
      data-overridden={hasSectionOverride(section, breakpoint) || undefined}
      data-page-editor-visibility={resolved.visibility.visible ? "visible" : "hidden"}
      className={joinClasses("relative", selectionClass(selection))}
    >
      <SectionEditorChrome />
      <PageSectionContent section={resolved} layoutMode="canvas-device" />
    </section>
  );
}
```

Expected data flow:

- Toolbar changes update base/responsive section values.
- Section toolbar controls render from the shared control registry for all
  registry-owned section fields, including `justify`, `shadow`, and `authOnly`,
  instead of relying on the older hard-coded subset.
- Existing selected sections use `pageUniversalSectionControls` directly rather
  than insertability-gated section lookup, so valid stored non-insertable
  sections such as navigation/collection/filter sections do not become
  read-only in the toolbar.
- Supplemental section controls must preserve the current `anchor` edit path and
  add bounded representation for `backgroundImage`, `startsAt`, and `endsAt`
  when the registry does not yet own those fields.
- Canvas resolves the selected breakpoint and applies the same values.
- Admin canvas must not let Tailwind viewport breakpoints decide simulated
  mobile/tablet columns. The shared renderer should expose or accept a
  canvas-device layout mode that applies the resolved section columns directly
  for editor canvas rendering, while public runtime keeps its existing viewport
  classes.
- `PageSectionContent` remains the single owner of section padding/background/
  radius/shadow/gap style application. `SectionCanvas` stays neutral editor
  chrome and must not duplicate shared section style on the wrapper.
- Hidden sections show editor chrome/ghost state in admin, but public runtime
  omits them.

Error handling:

- Clamp numeric values through the domain owner.
- Invalid colors/backgrounds normalize or show bounded validation copy.
- Date/auth visibility states should be represented safely in admin preview.

Regression-test shape:

- Background, radius, shadow, padding, columns, align, justify, and visibility
  changes produce visible canvas state.
- Section registry controls round-trip through PageEditor for the fields that
  were not wired during TASK-418-03, including at least `justify`, `shadow`, and
  `authOnly`.
- Non-insertable stored section types still receive the universal section
  controls in the toolbar.
- Anchor, background image, and date visibility fields remain visible or safely
  represented as supplemental controls.
- Mobile override changes only mobile canvas state.
- Mobile/tablet canvas column classes derive from resolved device state rather
  than from the outer browser viewport.
- Hidden sections render an admin ghost/chrome state, while shared renderer or
  public runtime coverage proves `visibility.visible=false` is omitted outside
  admin chrome.

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
- Vitest shared renderer tests in `tests/vitest/pages/page-renderer-v2.test.tsx`
  for canvas-device column behavior and default public/runtime omission behavior.
- Bun public runtime smoke (`tests/integration/runtime/pages-runtime.test.ts`)
  when public handler output is changed or explicitly asserted.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`

---

## Closeout

- PageEditor now renders selected-section controls from
  `pageUniversalSectionControls` directly, so existing stored non-insertable
  sections still receive universal layout/style/spacing/visibility editing.
- Supplemental section fields preserve `anchor` and add bounded editing for
  `backgroundImage`, `startsAt`, and `endsAt`.
- Admin canvas uses `PageSectionContent` with `layoutMode="canvas-device"` so
  resolved mobile/tablet columns are reflected by direct grid classes rather
  than browser viewport media classes. Public runtime keeps the default
  responsive classes.
- Hidden sections render editor chrome/ghost state in the admin canvas while
  shared renderer coverage proves hidden sections are omitted outside admin
  chrome.
- Pre-implementation audit `019eaeda-96bf-7742-b15f-12fdd19c26e0` found real
  medium contract drift; the task contract was corrected before source edits.
- Follow-up audit `019eaee0-1798-72c1-9e1b-2abf9bfa53d5` found stale report
  prose and an under-specific validation list; both were corrected before
  implementation.
- Fresh pre-implementation audit `019eaee4-f4b2-7951-8950-40348156f3fe`
  reported no High, Medium, or Low drift before source edits.
- Post-implementation drift audit `019eaef1-667c-7e72-8971-0ea75a368d05`
  found one medium issue: `SectionCanvas` still applied rounded card chrome.
  The wrapper now uses neutral outline chrome only; shared `PageSectionContent`
  remains the owner of section padding/background/radius/shadow/gap.
- Covered by changelog `1150`.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx` (35 tests)
- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts` (10 tests)
- Drift fix rerun: `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/pages/page-renderer-v2.test.tsx` (30 tests)
- Drift fix rerun: `bun --cwd core lint:types`
- Drift fix rerun: `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core lint`

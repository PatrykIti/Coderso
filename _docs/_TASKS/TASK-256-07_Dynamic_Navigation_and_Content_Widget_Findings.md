# TASK-256-07: Dynamic Navigation and Content Widget Findings

# FileName: TASK-256-07_Dynamic_Navigation_and_Content_Widget_Findings.md

**Priority:** High
**Category:** Widgets + Dynamic Content + Navigation + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-04
**Status:** To Do

---

## Overview

Repair report drift in dynamic/operational widgets covered by the current
Playwright audit:

- `content-list`
- `navigation`

The main shared pattern is truthful controls: editor fields that are visible
must either affect runtime output or clearly explain why they are unavailable
for the active variant/source.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md:77,147,160,269-280` reports
  columns/gap controls visible for variants where they do not apply and missing
  `textColor` clear behavior.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:117-119,179,281,329,380-391,401,450`
  reports `logo.href` not rendered, hash href validation drift, and sticky
  behavior blocked by section overflow.

## Scope Decision Matrix

| Finding | TASK-256 action | Owner | Follow-up policy |
|---|---|---|---|
| Content-list columns/gap controls visible for variants that ignore them | Fix here | `ContentListEditors.tsx` | None |
| Content-list `textColor` clear gap | Fix here through TASK-256-02 helpers | `ContentListEditors.tsx` | None |
| Content-list pagination, view-all, section-title, duplicate content-type dropdowns, empty-state copy, and disabled-toggle styling | Classify during implementation; fix only if current controls are broken/misleading | `ContentListEditors.tsx`, `contentList.tsx` | TASK-256-08 creates product follow-up for expansions |
| Content-list canvas preview communication | Fix here only if report shows stale preview for a current control | Page-builder preview owner plus content-list editor | Otherwise defer via TASK-256-08 |
| Navigation `logo.href` not rendered | Fix here with safe href normalization | `navigation.tsx`, `NavigationEditors.tsx` | None |
| Navigation hash validation differs from runtime safe href support | Fix here and menu validation tests | `NavigationEditors.tsx`, menu validation owner | None |
| Navigation sticky blocked by section overflow | Decide wrapper ownership and either fix section/layout wrapper or document a physical follow-up | Section/layout wrapper owner | TASK-256-08 must create follow-up if not fixed |
| Navigation broader menu IA/product requests | Future product scope unless needed for broken current behavior | Navigation future task | TASK-256-08 records deferral |

## Sub-Tasks

- [ ] Hide or disable content-list layout controls that do not affect the active
  variant.
- [ ] Add missing content-list clear behavior for `textColor`.
- [ ] Align navigation editor hash validation with runtime safe-href behavior.
- [ ] Render `logo.href` safely when configured.
- [ ] Decide sticky navigation ownership with the section/layout wrapper and
  either fix it or document the constraint.

## Files to Change

| Widget | Files and line refs | Required change |
|---|---|---|
| `content-list` | `core/widgets/core/contentList.tsx:145-156,256-267`; `core/admin/ui/widgets/editors/ContentListEditors.tsx` | Hide/disable columns and gap where variants ignore them; add `textColor` clear; keep resolved content data unchanged. |
| `navigation` | `core/widgets/core/navigation.tsx:25-32,391-405`; logo render around `navigation.tsx:506-516`; `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Render normalized `logo.href`; align editor URL validation with `normalizeWidgetSafeHref`/hash support; expose behavior constraints truthfully. |
| `section/layout wrapper` | owner around section overflow behavior | Fix or document `overflow-hidden` conflict when sticky navigation is nested inside a section. |
| `menu editor validation` | `tests/vitest/ui/menu-editor-validation.test.ts` | Ensure `#` menu links are valid where runtime permits hash links. |

## Implementation Pseudocode

```tsx
function ContentListStyleControls({ variant, value, onChange }: Props) {
  const supportsGridLayout = variant === "cards";

  return (
    <WidgetEditorSection id="content-list.style" title="Style">
      {supportsGridLayout ? (
        <ColumnsAndGapControls value={value} onChange={onChange} />
      ) : (
        <ReadOnlyControlHint control="Columns" reason="List and compact variants use one column." />
      )}
      <ClearableInputField
        label="Text color"
        value={value.style?.textColor}
        onChange={(textColor) => updateStyle({ textColor })}
        onClear={() => clearStyleField("textColor")}
      />
    </WidgetEditorSection>
  );
}
```

Navigation logo shape:

```tsx
function renderNavigationLogo(logo: NavigationLogo) {
  const content = logo.type === "image" ? <img src={logo.value} alt={logo.alt ?? ""} /> : <span>{logo.value}</span>;
  const href = normalizeNavigationHref(logo.href);

  if (!href) return content;

  return (
    <a href={href} aria-label={logo.alt ?? logo.value}>
      {content}
    </a>
  );
}
```

Error handling:

- Do not break existing pages where content-list style values are saved for
  non-card variants; preserve the payload but hide/disable irrelevant controls.
- Navigation hash links must match the same safe-href policy in editor and
  runtime.
- Sticky behavior should not be faked if the wrapper prevents CSS sticky from
  working.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve content-list/navigation schemas.
- Anti-abuse: navigation/logo/CTA hrefs must use existing safe-href
  normalization and must not allow script/data URL injection.
- Secret handling: no secrets in navigation/content-list payloads or debug
  reports.

## Testing Requirements

- Update `tests/vitest/ui/content-list-editor-wave.test.tsx`.
- Update `tests/unit/widgets/contentList.test.tsx` for runtime/widget behavior.
- Update `tests/vitest/ui/navigation-editor-wave.test.tsx`.
- Update `tests/vitest/widgets/navigation.test.tsx`.
- Update `tests/vitest/ui/menu-editor-validation.test.ts` covering `href="#"`
  where applicable.
- Update `tests/unit/widgets/validator.test.ts`,
  `tests/unit/widgets/registry.test.ts`, or
  `tests/unit/widgets/runtimeRegistry.test.ts` if schema/default/registration
  behavior changes.
- Add a focused sticky-wrapper regression test if section wrapper behavior
  changes.
- Run targeted Vitest suites, `bun --cwd core lint`, and
  `bun --cwd core lint:types`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTENT_LIST.md` and `_docs/_WIDGETS/NAVIGATION.md`
  if editor/runtime behavior changes.
- Update Playwright reports with fixed/deferred evidence.
- Update `_docs/WIDGETS.md` only if a shared href/control-visibility contract
  changes.

## Acceptance Criteria

- Content-list controls are truthful for the active variant.
- `textColor` clear behavior matches shared clear semantics.
- Navigation logo links render when configured and remain safe.
- Editor hash validation matches runtime hash support.
- Sticky navigation is either fixed with tests or documented as a layout
  ownership constraint with a follow-up task.

# TASK-288-01: Tabs Visual Color Parity and Editor IA

# FileName: TASK-288-01_Tabs_Visual_Color_Parity_and_Editor_IA.md

**Priority:** High
**Category:** Widgets + Admin UI + Design Tokens + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-288
**Status:** To Do

---

## Overview

Repair Tabs-specific Visual editor parity from
`_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` rows C1, U2, U7, and U8.

The current Tabs data model already contains `style.inactiveTextColor`, but the
Visual editor exposes no matching control. This makes inactive tab text editable
only through non-Visual channels even though Visual already owns the rest of the
Tabs color surface.

## Scope Boundary

This leaf owns Tabs editor IA and Tabs field exposure only.

It must not reimplement TASK-256-02 generic clear/none token behavior, generic
color-picker semantics, or shared contrast tooling. If TASK-256-02 has landed a
shared color-control helper by implementation time, this leaf must consume that
helper instead of adding another Tabs-only color widget.

## Sub-Tasks

- [ ] Split the current mixed `tabs.layout` editor section into clear Tabs
  sections for layout choices and color choices, while preserving existing
  persisted data.
- [ ] Expose `style.inactiveTextColor` in Visual and Advanced editors beside
  `activeTextColor`.
- [ ] Keep clearability aligned with TASK-256-02: only fields that the final
  shared contract marks as clearable should render `Clear`.
- [ ] Render alignment and orientation labels as user-facing labels
  (`Start`, `Center`, `End`, `Horizontal`, `Vertical`) while persisting the same
  enum values.
- [ ] Add a bounded Tabs-local contrast warning or consume the shared warning
  helper when active foreground/background or inactive foreground/surface pairs
  are visibly identical.
- [ ] Preserve the existing `visualOwnsVariantSelection = true` contract.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TabsEditors.tsx` | Expose inactive text color, split section labels, title-case select copy, and add a local contrast-hint helper unless TASK-256-02 has already shipped a shared helper. |
| `tests/vitest/ui/tabs-editor-wave.test.tsx` | Add editor assertions for inactive text color, label copy, section split, and contrast warning behavior. |
| `tests/vitest/widgets/tabs.test.tsx` | Add or update SSR/normalization assertions only if field defaults or clearability change. |

## Implementation Pseudocode

```tsx
const alignmentOptions = [
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
] as const;

function resolveTabsContrastWarning(
  pairs: Array<[label: string, foreground: string | undefined, background: string | undefined]>
) {
  const unreadable = pairs.find(([, foreground, background]) => foreground && foreground === background);
  return unreadable ? `${unreadable[0]} foreground matches its background.` : null;
}

function TabsColorsSection({ value, onChange }: TabsSectionProps) {
  const normalized = normalizeTabsData(value);
  const style = normalized.style ?? tabsDefaults.style ?? {};
  const contrastWarning = resolveTabsContrastWarning([
    ["Active tab", style.activeTextColor, style.activeBackgroundColor],
    ["Inactive tab", style.inactiveTextColor, style.surfaceColor],
  ]);

  return (
    <WidgetEditorSection id="tabs.colors" title="Colors">
      <div className="space-y-2">
        <p className="text-sm font-medium">Inactive text color</p>
        <Input
          value={style.inactiveTextColor ?? tabsDefaults.style?.inactiveTextColor ?? ""}
          onChange={(event) =>
            updateStyle(value, onChange, { inactiveTextColor: event.target.value })
          }
          placeholder={tabsDefaults.style?.inactiveTextColor ?? "var(--color-text)"}
        />
      </div>
      <ClearableFieldHeader
        label="Surface color"
        value={style.surfaceColor}
        onClear={() => clearStyleField(value, onChange, "surfaceColor")}
      />
      {contrastWarning ? <p className="text-xs text-warning">{contrastWarning}</p> : null}
    </WidgetEditorSection>
  );
}
```

Error handling:

- Empty `inactiveTextColor` follows the existing `normalizeTabsData()` fallback
  unless TASK-256-02 changes the clearable policy for this exact field.
- Unknown alignment/orientation values still normalize to the current safe
  defaults.
- Contrast guidance is advisory only; it must not block saving existing widget
  data or mutate persisted colors silently.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless clearability/schema changes.
- Anti-abuse: do not allow raw CSS declarations, scripts, or arbitrary HTML in
  color fields; keep values as bounded strings processed by existing style
  helpers.
- Secret handling: no secrets or private tokens in editor diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx` if defaults or
  clearability change
- `bun test tests/unit/widgets/validator.test.ts` if schema changes
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`

## Documentation Updates Required

- Update `_docs/_WIDGETS/TABS.md` with the final Visual sections and color
  fields.
- Update `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` rows C1, U2, U7, and U8 with
  fixed/deferred evidence after validation.

## Changelog Policy

- Covered by the TASK-288 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Visual and Advanced editors expose every Tabs color field that the data model
  makes user-editable.
- Select labels are readable while persisted enum values remain stable.
- Layout and color controls are no longer mixed under one vague section.
- Contrast guidance is present without weakening the shared design-token
  contract from TASK-256-02.

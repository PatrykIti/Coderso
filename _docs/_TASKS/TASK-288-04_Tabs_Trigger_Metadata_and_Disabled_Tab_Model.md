# TASK-288-04: Tabs Trigger Metadata and Disabled Tab Model

# FileName: TASK-288-04_Tabs_Trigger_Metadata_and_Disabled_Tab_Model.md

**Priority:** High
**Category:** Widgets + Schema + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-288-02, TASK-288-03, TASK-288
**Status:** To Do

---

## Overview

Add Tabs trigger metadata and disabled-tab behavior from
`_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` rows W1, W7, W10, and U3.

The current `TabsItem` model only stores `id`, `label`, and `description`.
The editor copy suggests the description belongs to the tab, but runtime renders
it as panel intro text. Tabs also cannot show a bounded icon/emoji beside the
trigger label or mark a future/unavailable tab as disabled.

## Scope Boundary

This leaf owns Tabs item schema only. It must not add arbitrary HTML, arbitrary
icon libraries, plugin-provided scripts, or a generic cross-widget metadata
contract.

If disabled-tab keyboard behavior requires a shared interactive-widget helper,
that helper belongs in TASK-256-04. This leaf can consume the shared helper but
must keep Tabs item data and editor controls local.

## Sub-Tasks

- [ ] Preserve legacy `description` as `panelIntro` during normalization and
  rename the editor field to `Panel intro text`; add a separate optional
  `triggerDescription` rendered as plain-text subtitle copy near the trigger.
- [ ] Add a bounded trigger icon/emoji field with schema/defaults/normalizer,
  editor controls, runtime rendering, and tests.
- [ ] Add `disabled` as a persisted boolean on `TabsItem` with editor controls,
  runtime `aria-disabled`, keyboard/click exclusion, and a deterministic safe
  fallback that re-enables the first item if external data disables every tab.
- [ ] Preserve backward compatibility for existing payloads that only contain
  `description`.
- [ ] Keep item IDs stable and continue rejecting unknown item fields through
  `tabsSchema`.
- [ ] Document whether disabled panels are still renderable to screen readers
  or fully skipped by the activation model.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/tabs.tsx` | Extend `TabsItem`, schema, defaults if needed, normalizer, runtime trigger render, and active-tab resolution for disabled items. |
| `core/admin/ui/widgets/editors/TabsEditors.tsx` | Add item controls for icon/emoji, panel intro/trigger subtitle decision, and disabled state. |
| `tests/vitest/widgets/tabs.test.tsx` | Add schema, normalization, SSR, disabled fallback, and trigger metadata render coverage. |
| `tests/vitest/ui/tabs-editor-wave.test.tsx` | Add editor coverage for item metadata controls and disabled-state copy. |
| `tests/unit/widgets/validator.test.ts` | Run and update only if the widget schema assertions need explicit Tabs coverage. |

## Implementation Pseudocode

```ts
type TabsItem = {
  id?: string;
  label?: string;
  description?: string; // legacy panel intro
  panelIntro?: string;
  triggerDescription?: string;
  icon?: string;
  disabled?: boolean;
};

function normalizeTabsItem(raw: TabsItem, index: number, used: Set<string>): NormalizedTabsItem {
  const legacyDescription = toTrimmedString(raw.description);
  return {
    id: normalizeItemId(raw.id, index, used),
    label: toTrimmedString(raw.label) ?? `Tab ${index + 1}`,
    panelIntro: toTrimmedString(raw.panelIntro) ?? legacyDescription ?? undefined,
    triggerDescription: toTrimmedString(raw.triggerDescription) ?? undefined,
    icon: normalizeBoundedIcon(raw.icon),
    disabled: raw.disabled === true,
  };
}

function resolveActiveTab(items: NormalizedTabsItem[], requestedId: string | undefined) {
  const enabled = items.filter((item) => item.disabled !== true);
  if (requestedId && enabled.some((item) => item.id === requestedId)) {
    return requestedId;
  }
  return enabled[0]?.id ?? items[0]?.id ?? "1";
}
```

Runtime flow:

```ts
function handleTriggerActivation(trigger: HTMLElement) {
  if (trigger.getAttribute("aria-disabled") === "true") return;
  const activeId = trigger.getAttribute("data-coderso-tabs-id");
  if (activeId) syncState(root, activeId);
}
```

Error handling:

- If all tabs are disabled, normalization re-enables the first item and
  resolves active/default state to it so the widget never becomes unreachable.
- Disabled default tabs fall back to the first enabled tab without deleting the
  user's saved default choice until the user edits it. Disabled panels stay
  hidden and out of the activation model until their trigger is re-enabled.
- Icon/emoji input must be bounded and rendered as text or from a safe enum; do
  not support raw SVG/HTML.

## Regression Test Shape

- `tests/vitest/widgets/tabs.test.tsx`: assert legacy `description` becomes
  panel intro, trigger subtitle/icon render as plain text only, disabled tabs
  are skipped by click/keyboard activation, and external all-disabled payloads
  normalize back to one enabled tab.
- `tests/vitest/ui/tabs-editor-wave.test.tsx`: assert item controls for panel
  intro, trigger subtitle, icon, and disabled state plus truthful helper copy.
- `tests/unit/widgets/validator.test.ts`: extend schema coverage for new item
  keys and unknown-field rejection.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update `tabsSchema` and validator coverage for all
  new item fields, preserving `additionalProperties: false`.
- Anti-abuse: icons are safe bounded strings/enums only; no raw HTML, SVG
  markup, inline event handlers, or user-authored scripts.
- Secret handling: no secrets in item metadata, DOM attributes, diagnostics, or
  reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`

## Documentation Updates Required

- Update `_docs/_WIDGETS/TABS.md` with item metadata, disabled behavior, and
  description compatibility.
- Update `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` rows W1, W7, W10, and U3
  after validation.

## Changelog Policy

- Covered by the TASK-288 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Trigger metadata is schema-backed, editor-owned, normalized, rendered, and
  tested.
- Existing `description` payloads still render predictably after the final
  description semantics are chosen.
- Disabled tabs are announced, skipped by activation, and cannot become the only
  unreachable active panel because normalization always preserves one enabled
  fallback tab.
- No unsafe HTML/script path is introduced through item metadata.

# TASK-275-02: Navigation Mobile Drawer and Minimal Mode

# FileName: TASK-275-02_Navigation_Mobile_Drawer_and_Minimal_Mode.md

**Priority:** High
**Category:** Widgets + Navigation + Mobile Runtime + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-275, TASK-275-01
**Status:** To Do

---

## Overview

Make Navigation mobile behavior truthful and accessible. The current docs define
`drawer` and `minimal` together as hidden mobile links plus a compact trigger;
this leaf intentionally changes the Navigation product contract so `minimal`
becomes a real minimal header and `drawer` owns the interactive panel.

This leaf owns Navigation runtime markup/script and Navigation editor copy only.
It must not introduce a shared offcanvas framework or global focus-trap utility
unless TASK-256 creates that shared owner first.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:80-84` - `minimal` and `drawer`
  are rendered identically.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:159-169` - mobile panel lacks
  animation, hamburger/close icon, and explicit action label.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:196-200,212-214` - mobile mode
  and toggle accessibility issues.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:301-315,327-328` - mobile CTA
  duplication and unchanged "Menu" state are confirmed in browser tests.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:404,414,416,441,453-456` -
  prioritized mobile fixes.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/navigation.tsx` | Split mobile branches: `expanded` shows links, `drawer` renders the toggle/panel, and `minimal` renders logo/right actions without link toggle/panel. Render CTA once on mobile for drawer mode. Add toggle icon/state markup, `aria-label`, panel state data attributes, and reduced-motion-friendly animation classes. |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Clarify mobile-mode descriptions so `minimal`, `drawer`, and `expanded` explain their actual output. Clarify CTA mobile placement and hide policy. |
| `tests/vitest/widgets/navigation.test.tsx` | Assert drawer vs minimal SSR output, no duplicate mobile CTA in drawer mode, toggle labels/icons/state attributes, and panel hidden/open contract. |
| `tests/vitest/ui/navigation-editor-wave.test.tsx` | Assert mobile mode options and helper copy remain visible and updates persist. |
| `_docs/_WIDGETS/NAVIGATION.md` | Update mobile mode behavior and CTA placement notes. |
| `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md` | Record fixed/deferred evidence for mobile mode, CTA duplication, toggle state, animation, and focus behavior. |

## Implementation Pseudocode

```tsx
const isDrawerMode = mobileMode === "drawer";
const isMinimalMode = mobileMode === "minimal";
const showMobileToggle = isDrawerMode;
const linksVisibleOnMobile = mobileMode === "expanded";
const renderHeaderCtaOnMobile = !isDrawerMode && !behavior.hideCtaOnMobile;
const renderPanelCta = isDrawerMode && !behavior.hideCtaOnMobile;

<button
  type="button"
  data-navigation-mobile-toggle
  data-state="closed"
  aria-expanded="false"
  aria-controls={mobilePanelId}
  aria-label="Open navigation menu"
>
  <span data-navigation-icon="menu" aria-hidden="true" />
  <span data-navigation-icon="close" aria-hidden="true" hidden />
</button>

function setNavigationPanelState(trigger: HTMLElement, open: boolean) {
  const panel = resolveControlledPanel(trigger);
  trigger.setAttribute("aria-expanded", open ? "true" : "false");
  trigger.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
  trigger.dataset.state = open ? "open" : "closed";
  panel?.toggleAttribute("hidden", !open);
}
```

Error handling:

- Missing panel or malformed root should no-op instead of throwing in public
  runtime.
- The script must remain idempotent when multiple Navigation widgets render on
  the same page.
- Focus containment applies only while drawer mode panel is open. Minimal mode
  must not bind drawer behavior.

## Data Flow

1. Admin chooses `behavior.mobileMode` and CTA mobile visibility in the
   Navigation editor.
2. `normalizeNavigationData()` keeps existing payloads backward-compatible while
   mapping `drawer`, `minimal`, and `expanded` to explicit renderer branches.
3. `navigation.tsx` emits root-scoped toggle/panel IDs, mobile CTA placement,
   state attributes, and reduced-motion classes for drawer mode only.
4. `navigationRuntimeClientScript` binds only roots that expose
   `data-navigation-mobile-toggle`, toggles DOM state, and no-ops on malformed
   roots.
5. Widget and editor tests assert SSR branch differences, state markup, CTA
   duplication policy, and persisted editor copy.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged unless behavior fields change.
- Anti-abuse: no raw HTML/script data from widget fields may be injected into
  the client script. Keep state in static attributes and DOM APIs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if script
  injection or renderer assumptions change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- Targeted accessibility and reliability release gates for the public
  interactive runtime change.
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md`
- `_docs/_TASKS/TASK-275-02_Navigation_Mobile_Drawer_and_Minimal_Mode.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- `minimal` no longer renders the drawer toggle or mobile panel.
- Drawer mode renders one mobile CTA path, not duplicated header and panel CTAs.
- The mobile toggle exposes an explicit action label, open/closed state, and
  visible hamburger/close affordance.
- Drawer open/close animation respects reduced-motion expectations.
- Keyboard users can open, close, and interact with the drawer according to the
  documented focus policy.

# TASK-540-03: Accessible Tabs and Selection Semantics

# FileName: TASK-540-03-Accessible-Tabs-And-Selection-Semantics.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Runtime UI / Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01, TASK-540-02
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Scope

Turn the decorative Tabs branch into a functional, accessible component in all
Screen modes and remove composite-wrapper button semantics that contain links,
controls, and contenteditable fields. Selection remains reachable through real
authoring controls without swallowing Space or link/input activation.

## Leaf

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-540-03-L01 | Functional Tabs and no nested-interactive Space trap | `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` | ⏳ To Do |

## Acceptance

- Tabs expose `tablist`, `tab`, `tabpanel`, unique relationships, roving
  `tabIndex`, `aria-selected`, one visible panel, and Arrow/Home/End behavior.
- Mouse and keyboard activation show a visible content change in builder,
  preview, and entry modes.
- Block/section composite roots have no `role=button`, focusability, or blanket
  Enter/Space cancellation. Real authoring selection buttons are siblings of
  interactive content, not ancestors.
- Typing Space into contenteditable inserts a space. Links, inputs, tab buttons,
  and selection handles perform only their own action.
- Button href is re-sanitized at the DOM seam; absent/unsafe/legacy-disabled href
  renders an `aria-disabled` non-anchor affordance.
- Presentation image overrides remain media UUIDs. The pure renderer consumes an
  explicit host-resolved UUID→URL map only for direct image blocks and sanitizes that
  final URL candidate; media FieldRenderer keeps UUID identity for MediaPicker.

## Security Contract

Render-only/admin UI change, no endpoint. Stored strings are trusted only after
TASK-540-01 normalization, and URL policy is repeated at the final DOM sink.
Static DOM IDs derive only from validated block/tab IDs. No HTML injection or
dynamic script is added.

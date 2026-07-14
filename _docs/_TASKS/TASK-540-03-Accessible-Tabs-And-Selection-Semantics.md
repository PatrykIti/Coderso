# TASK-540-03: Accessible Tabs and Selection Semantics

# FileName: TASK-540-03-Accessible-Tabs-And-Selection-Semantics.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Runtime UI / Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01, TASK-540-02
**Status:** ✅ Done
**Started:** 2026-07-13
**Completed:** 2026-07-13
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
| TASK-540-03-L01 | Functional Tabs and no nested-interactive Space trap | `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` | ✅ Done |

## Acceptance

- Tabs expose `tablist`, `tab`, `tabpanel`, unique relationships, roving
  `tabIndex`, `aria-selected`, one visible panel, and Arrow/Home/End behavior.
- Mouse and keyboard activation show a visible content change in builder,
  preview, and entry modes. Builder activation writes the tab's slot-end
  `insertPoint`, and its visible active panel derives from a direct target for that
  block or from the ancestor tab slot containing a descendant target. Activating a
  nested Tab inside a non-first outer panel must therefore keep every ancestor panel
  visible. Builder never consults preview/entry local state; preview and entry modes
  use renderer-instance local state only.
- Block/section composite roots have no `role=button`, focusability, or blanket
  Enter/Space cancellation. Real authoring selection buttons are siblings of
  interactive content, not ancestors.
- Typing Space into contenteditable inserts a space. Links, inputs, tab buttons,
  and selection handles perform only their own action.
- Button href is re-sanitized at the DOM seam. Builder mode always renders a
  non-anchor, non-navigating affordance, even for a safe link; preview and entry render
  an anchor only when `mode !== "builder"` and the href is safe. An absent, unsafe, or
  legacy-disabled href renders an `aria-disabled` non-anchor affordance in every mode.
- Presentation image values remain media UUIDs. The pure renderer consumes an
  explicit host-resolved UUID→URL map only for direct image blocks. An active override
  is UUID-only and wins absolutely: resolve it through the map or show a placeholder,
  never fall back. Without an override, an existing binding accepts a scalar UUID or
  the first valid UUID in an array and likewise resolves to a URL or placeholder;
  malformed and URL-shaped bound values are never interpreted as URLs and never fall
  back. Only the absence of both override and binding permits sanitized static
  `data.src`. Media FieldRenderer keeps scalar/array UUID identity for MediaPicker.
  UUID recognition imports TASK-540-01's `isScreenMediaAssetUuid`; this leaf does not
  define another pattern or wait for TASK-540-04's later override normalizer.

## Security Contract

Render-only/admin UI change, no endpoint. Stored strings are trusted only after
TASK-540-01 normalization, and URL policy is repeated at the final DOM sink.
Static DOM IDs derive only from validated block/tab IDs. No HTML injection or
dynamic script is added.

## Completion

The renderer now owns functional, instance-isolated Tabs; passive block and section
containers with explicit authoring selection controls; final Button URL enforcement;
and fail-closed UUID-to-host-URL image provenance while media fields retain asset
identity. A fresh post-audit exposed nested builder-panel collapse, preview/entry
state leaking into builder, and unrelated markup drift. The implementation and task
contract were corrected with recursive ancestor-slot resolution, strict mode-owned
state, and builder-only section grouping. The final fresh audit reported zero HIGH,
MEDIUM, or LOW findings. Targeted Vitest passed 82/82; typecheck, lint, diff-check,
staging, and Page collision guards passed.

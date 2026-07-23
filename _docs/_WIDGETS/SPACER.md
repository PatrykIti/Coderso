# Spacer Widget (v1)

> **Historical compatibility boundary:** this file documents a retained renderer/read-
> compatibility contract. Configurable widgets exist only on the Admin Dashboard;
> active editors own their sections and blocks. Do not add or expand a non-Dashboard
> editor, registry entry, preset, or module-pack surface from this file.

## Purpose

Lightweight layout primitive for explicit vertical rhythm control without
placeholder content blocks.

## Widget ID

`spacer`

## Variants (v1)

- `responsive`: independent desktop/tablet/mobile heights
- `fixed`: desktop height reused for all breakpoints

## Slots

None.

## Editor Modes

### Wizard
- read-only spacer mode summary
- read-only rhythm summary
- read-only desktop height summary with explicit fixed-mode guidance when `fixed` is active

Wizard is a one-time setup surface. Completed widgets use Visual for daily
rhythm changes and can explicitly re-enter setup through `Run setup again`.

### Visual
Sections:
1. Variant and responsive behavior
2. Responsive heights
3. Editor guide

Notes:
- Spacer owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Responsive heights now include transient named rhythm presets before direct height editing.
- Height controls explain desktop, tablet, and phone preview behavior without
  exposing framework breakpoint labels.
- Visual exposes friendly rhythm labels and saved-custom state instead of
  asking authors to type CSS lengths or inspect technical tokens.

### Advanced
- read-only runtime desktop/tablet/mobile spacing summaries
- read-only support summary for fixed/responsive mode and saved responsive fallbacks
- no raw JSON payload snapshot, hidden mutators, custom CSS/length text entry,
  or writable height controls

## Runtime Behavior Notes

- Renders an empty structural block with responsive height values.
- Spacer remains intentionally vertical-only. The shared row-flow child
  shell from `TASK-328` is now available for future nested layout work, but
  Spacer still has no widget-local horizontal authoring contract and therefore
  stays a vertical rhythm primitive in v1.
- Named presets are editor-only shortcuts that write concrete `height` values; Spacer does not persist a separate `preset` field or emit preset-specific DOM markers.
- Runtime still normalizes legacy/custom height payloads for backward compatibility: bare numbers such as `48` normalize to `48px`, explicit `48px` remains valid, viewport values accept `vh`, `dvh`, `svh`, and `vw`, and fluid values accept canonical `clamp(min, preferred, max)` with `px|rem` boundaries and a viewport-unit preferred segment. These are compatibility inputs, not normal beginner-facing authoring fields.
- Rejects unsafe custom strings such as standalone `rem`, `calc(...)`, CSS variables, URLs, semicolons, malformed `clamp()`, and unsupported units like `lvh` by falling back to deterministic defaults before runtime output.
- Shows optional guide label only in preview and editor-preview contexts.
- The guide remains decorative inside the `aria-hidden` Spacer shell and does not expose a separate ARIA role or label.
- Exposes deterministic runtime markers:
  - `data-spacer`
  - `data-spacer-variant`
  - `data-spacer-desktop`
  - `data-spacer-tablet`
  - `data-spacer-mobile`
  - `data-spacer-show-guide`
  - `data-spacer-preview-height`
- The 31-05 audit regression guard asserts these SSR markers and CSS variables
  for responsive, fixed, unsafe-length fallback, guide-on, guide-off, and
  invalid-variant fail-closed paths. Browser computed-height evidence remains
  recorded in the Playwright audit report.

## Data Model (summary)

```json
{
  "height": {
    "desktop": "16",
    "tablet": "12",
    "mobile": "8"
  },
  "showGuideInEditor": true
}
```

## Authoring Notes

- `fixed` reuses the desktop height for tablet and mobile at runtime.
- Horizontal Spacer behavior is not available in v1. Authors should use the
  existing row/column layout widgets for structural horizontal spacing; the
  shared nested row-flow child shell from `TASK-328` is now landed, but Spacer
  still needs its own truthful horizontal product contract before reopening BF-05.
- If `showGuideInEditor` is turned off, Spacer intentionally returns to a
  minimal invisible block in editor-preview surfaces; there is no separate
  always-on outline.
- Available named presets are `Card gap` (`8/6/4`), `Section gap` (`16/12/8`), and `Hero gap` (`24/20/16`).
- In `responsive`, applying a preset writes the full desktop/tablet/mobile triplet. In `fixed`, presets update desktop only and preserve the saved tablet/mobile heights until the user switches back to `responsive`.
- Manual height edits clear the derived active-preset state without changing the runtime schema or adding a persisted preset field.
- Desktop height applies to desktop previews and wide screens, tablet height
  applies before desktop takes over, and mobile height applies below tablet
  layouts. The editor intentionally describes these as product preview
  contexts instead of framework breakpoint labels.
- Saved custom heights remain compatible and can be replaced by selecting a
  friendly rhythm preset.
- Invalid variants fail closed through the shared widget renderer fallback and
  do not emit Spacer runtime markers.

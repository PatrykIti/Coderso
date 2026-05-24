# Spacer Widget (v1)

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

## Editor Modes (current after TASK-050-15-06)

### Wizard
- spacer mode (fixed/responsive)
- named rhythm presets for quick vertical spacing choices
- desktop height token preset with explicit fixed-mode guidance when `fixed` is active
- editor guide toggle

### Visual
Sections:
1. Variant and responsive behavior
2. Responsive heights
3. Editor guide

Notes:
- Spacer owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Responsive heights now include transient named rhythm presets before direct height editing.
- Height controls explain the active Tailwind breakpoint ranges for desktop, tablet, and mobile.

### Advanced
- read-only computed desktop/tablet/mobile height summaries
- raw payload snapshot
- no visible custom CSS/length text entry; Visual owns daily height presets/tokens

## Runtime Behavior Notes

- Renders an empty structural block with responsive height values.
- Spacer remains intentionally vertical-only. The shared row-flow child
  shell from `TASK-328` is now available for future nested layout work, but
  Spacer still has no widget-local horizontal authoring contract and therefore
  stays a vertical rhythm primitive in v1.
- Named presets are editor-only shortcuts that write concrete `height` values; Spacer does not persist a separate `preset` field or emit preset-specific DOM markers.
- Runtime still normalizes legacy/custom height payloads for backward compatibility: bare numbers such as `48` normalize to `48px`, explicit `48px` remains valid, viewport values accept `vh`, `dvh`, `svh`, and `vw`, and fluid values accept canonical `clamp(min, preferred, max)` with `px|rem` boundaries and a viewport-unit preferred segment.
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
- Desktop height applies at `lg` (`1024px+`), tablet height applies from `md` until desktop takes over, and mobile height applies below the tablet breakpoint.
- Custom height inputs use explicit helper text and ARIA descriptions instead of relying on placeholder-only context.
- The accepted custom-height examples are `48`, `48px`, `10vh`, `5dvh`, `5svh`, `12vw`, and `clamp(2rem, 5vw, 8rem)`.

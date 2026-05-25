# Split Layout Widget (v2)

## Purpose

Two-pane layout primitive for left/right compositions with explicit breakpoint
ratio ownership, truthful mobile-collapse behavior, and preview-only empty-pane
guidance.

## Widget ID

`split-layout`

## Variants

- `50-50`: balanced panes
- `40-60`: narrower left pane
- `60-40`: wider left pane

## Slots

- `left` (fixed)
- `right` (fixed)

## Editor Modes

### Wizard

- one-time starter split selection
- builder guidance for moving to Visual and adding widgets to the left/right
  panes

### Visual

Sections:
1. Pane layout
2. Phone behavior
3. Spacing and alignment
4. Pane content

Notes:

- Visual owns variant selection (`visualOwnsVariantSelection = true`).
- Selecting a preset re-syncs the current desktop/tablet/mobile ratios through
  the landed shared atomic block-patch path.
- Variant cards include bounded graphical miniatures plus a beginner-facing
  device-layout summary that states the effective desktop/tablet/phone split.
- Desktop and tablet ratios remain directly editable.
- Mobile ratio appears only when `collapseMobile = "keep"`; otherwise Visual
  shows explicit stacked-phone copy instead of an inactive control.
- Gap controls expose friendly labels and canonicalize legacy `"0"` payloads
  to the `none` control state while keeping backward compatibility.

### Advanced

- read-only responsive diagnostics for starter layout, desktop, tablet, phone,
  pane spacing, and content-height alignment
- read-only saved layout summary
- no duplicate editable ratio/gap/align controls
- no visible developer-facing saved-data snapshots, implementation labels, or
  webdeveloper-specific diagnostics

## Runtime Behavior

- renders fixed `left` and `right` pane slots
- keeps `ratio.desktop`, `ratio.tablet`, and optional `ratio.mobile`; missing
  mobile ratio falls back to the normalized tablet ratio for backward
  compatibility
- supports mobile collapse modes:
  - `stack`: single-column on phones, split on tablet/desktop
  - `keep`: split preserved on phones using the normalized mobile ratio
- supports optional phone-only pane-order reversal (`reverseOnMobile`) with
  truthful editor copy for both `stack` and `keep`
- keeps empty-pane helper copy gated to editor/admin preview surfaces; public
  runtime does not render admin-only placeholder instructions
- exposes deterministic markers:
  - `data-split-layout-variant`
  - `data-split-ratio-desktop`
  - `data-split-ratio-tablet`
  - `data-split-ratio-mobile`
  - `data-split-collapse-mobile`
  - `data-split-reverse-mobile`
  - `data-split-gap`
  - `data-split-vertical-align`
  - `data-split-side` (`left` / `right`)
  - `data-split-items-left`
  - `data-split-items-right`
  - `data-split-empty-pane` (`left` / `right`) on preview-only empty states

## Bounded Token Sets

- ratios: `50-50`, `40-60`, `60-40`
- mobile collapse: `stack`, `keep`
- gap tokens: `none`, `0`, `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`
  - editor controls surface one canonical zero-gap option while runtime keeps
    legacy `"0"` payload compatibility
- vertical alignment: `start`, `center`, `end`, `stretch`

## Data Model (summary)

```json
{
  "ratio": {
    "desktop": "50-50",
    "tablet": "50-50",
    "mobile": "50-50"
  },
  "collapseMobile": "stack",
  "reverseOnMobile": false,
  "gap": "6",
  "verticalAlign": "stretch"
}
```

## Validation Notes

- `ratio.mobile` is optional in persisted data, bounded by schema validation,
  and normalizes to the resolved tablet ratio when omitted.
- `splitLayoutSchema` stays strict (`additionalProperties: false`) and rejects
  unknown ratio keys.
- Gap labels and diagnostics are derived from static owner metadata instead of
  arbitrary classes or user-supplied text.
- Arbitrary ratios, arbitrary class strings, raw HTML, and public admin-only
  placeholder copy remain out of scope.
- Advanced summaries are human-readable and do not expose saved-data snapshots
  or runtime implementation labels.

## Explicit Non-Scope

- arbitrary custom split ratios or raw class overrides
- public runtime placeholder instructions for empty panes
- widget-local reimplementation of shared variant atomic updates or shared
  `none`/`0` token semantics

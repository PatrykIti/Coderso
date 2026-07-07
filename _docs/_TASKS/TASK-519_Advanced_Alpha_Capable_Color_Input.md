# TASK-519: Advanced (Alpha-Capable) Color Input Across All Admin Editors

# FileName: TASK-519_Advanced_Alpha_Capable_Color_Input.md

**Priority:** High
**Category:** Admin UI / Editor Controls / Design (color authoring) / Security (CSS-value validation)
**Estimated Effort:** Large
**Dependencies:** None on other feature tasks — this is a shared-UI-control upgrade + rollout that rides existing validated write paths (menu `PATCH`/`PUT` menu-document routes; widget page-region PATCH). The STORAGE and RENDER layers ALREADY accept alpha-capable colors (see Overview) — no server/route change. Land-order-precedes the rollout subtasks (see Land order).
**Status:** ⏳ To Do
**Closure changelog (pinned):** 1232 (verify next-free at closure; 511=1229 / 517=1230 / 518=1231 precede — highest committed today is 1227, so 1228–1231 are pinned-not-yet-written and 1232 is this task's slot).

---

## Overview

Everywhere a color is authored in the admin — the menu/page swatch control
(`core/admin/ui/pages/editorControls/ColorSwatchControl.tsx`) and the widget-editor
color control (`core/admin/ui/widgets/editors/SharedColorControl.tsx` +
`core/admin/ui/widgets/editors/ClearableFields.tsx`) — the authoring UI is capped at
**opaque 3/6-digit hex** and **cannot round-trip alpha**. The goal: everywhere a
color is authored, the user can enter AND round-trip **alpha-capable** values
(8-digit hex `#rrggbbaa` like `#0812209e`, `rgba()`, `hsla()`) with an explicit
**alpha/opacity channel**, keep the **transparent** option, and NOT lose the
token/palette swatch UX.

**The storage and render layers already accept these formats** — this is a
UI-authoring gap, not a persistence gap:

- **Storage (menu):** `normalizeMenuColorValue`
  (`core/services/menus/normalizeMenuAppearance.ts:182` → `normalizeColor` :167-171,
  pattern `MENU_APPEARANCE_COLOR_PATTERN` :152-165) accepts
  `#rgb/#rgba/#rrggbb/#rrggbbaa` (3/4/6/8-digit hex), `rgb()/rgba()` (with alpha
  incl. leading-dot `.06`), `hsl()/hsla()`, `var(--color-*)`, and `transparent`.
- **Render (widgets + menu):** `resolveClearableCssColorValue`
  (`core/widgets/core/clearableStyle.ts:66`) whitelists `#…{3,4}|{6}|{8}` hex
  (`cssHexColorPattern` :15), `rgb[a]()` with alpha (`cssRgbColorPattern` :17-18),
  `hsl[a]()` (:19), `var(--color-*)` (:16), and safe keywords; it REJECTS
  `url()`/`expression()`/`javascript:`/`data:`/`;{}<>`.

So the fix is a **shared authoring-control upgrade** (alpha slider + hex8/rgba text
+ round-trip parse/compose) plus a **consistent, verified rollout** across the ~123
color-control usages (2 shared controls → 27 widget editors + 2 menu editor files),
with **no schema widening** wherever the existing normalize already accepts alpha
(verified per-editor; any genuine exception is called out and gets a present-only
widening + round-trip test).

## Grounded gap analysis (file:line, verified against live code)

**GAP-1 — `ColorSwatchControl` (menu/page) rejects alpha at BOTH the picker and the
hex text field.**
- `HEX_COLOR_PATTERN` (`ColorSwatchControl.tsx:33`) = `^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$` — 3/6-digit ONLY; `isHexColor` (:35) gates `commitHexDraft` (:86-94), so typing `#0812209e` is rejected and the field **reverts to the prior value** (:93 `input.value = value`). Alpha hex is un-typable.
- `toSafeHexColor` (:38-46) clamps any non-3/6-hex to `#000000`; an 8-digit stored value feeds the native `<input type="color">` (:144-152) as black — no round-trip display.
- Native `<input type="color">` cannot represent alpha at all (HTML limitation).
- Transparent swatch emits `null` (:99-117, :113-114) — KEEP.
- Palette swatches (:118-140) — KEEP.

**GAP-2 — `SharedColorControl` + `ClearableFields` (widgets) STORE alpha but cannot
AUTHOR or round-trip it through the picker.**
- `hexColorPattern` (`ClearableFields.tsx:10`) = `^#(?:[0-9a-fA-F]{3}){1,2}$` — 3/6-digit only. `rgbColorPattern` (:11-12) accepts `rgba(…, alpha)`.
- `resolveColorPickerValue` (:18-30) **discards alpha**: when an rgba value has an alpha component it returns the `fallback` (:27 `if (typeof alpha === "string" && alpha.length > 0) return fallback;`), and it has NO hex8 branch — an 8-digit hex fails `isHexColorValue` (:14-16) and (lacking a `#rgb`/`#rrggbb` shape and not matching rgba) returns the fallback (:24). So an alpha value shows the picker as the fallback color.
- `isPickerRepresentableColorValue` (:36-45) returns `false` when rgba HAS alpha (:44) → `applySharedColorPickerChange` (:47-66) will only overwrite via the picker when the current value is empty/representable, so an alpha value gets stuck.
- The free-text value `<Input>` (`SharedColorControl.tsx:203-208`) already lets a user TYPE `rgba(…)`/`#rrggbbaa`, and `onChange` stores the raw string — so alpha PERSISTS today (confirmed: `normalizeMenuColorValue`/widget render both accept it). The gap is: no alpha SLIDER, the swatch preview (`resolveColorSwatchValue` :32-34 → `resolveColorPickerValue`) shows the fallback not the real color, and picker edits silently drop alpha.
- `'Use transparent'` sets literal `"transparent"` (:219-227) — KEEP.
- `describeSharedColorControlState` (:51-124) classifies values (`selected_swatch`/`saved_custom`/`transparent`/`theme_token`/`cleared`) — an alpha value currently falls to `saved_custom` (:118-123) because `isPickerRepresentableColorValue` is false; after the fix it should classify as `selected_swatch`.

**GAP-3 — breadth / consistency.** ~123 color-control usages across 31 editor
files consume these two shared controls. `ColorSwatchControl` → `MenuDesignEditor.tsx`
(import :134; **9 literal JSX sites** at :990, :1000, :1383, :1526, :1924, :2193, :2207,
:2221, :2236 — :1622 is a `swatch()` HELPER call, not a literal site — plus the `swatch()`
wrapper at :1525 rendered from ~8 call-sites) + `MenuAppearancePanel.tsx`.
`SharedColorControl` → **27** widget-editor files (verified
`grep -rln "SharedColorControl" core/admin/ui/widgets/editors/` = 28 incl. the control
itself): Accordion, AppointmentForm, BookingCalendar, CompareTimeline, ContentList,
Divider, EntryTeaser, FeatureGrid, Footer, FormEmbed, GridColumns, ListingFilters,
LogoCloud, Navigation, Newsletter, PostsFeed, PricingPlans, ProductCompare,
ProductGallery, ProductTable, RichTextSection, SearchBox, Tabs, Team, Testimonials,
Timeline, ToggleBlock Editors. **Because these consume the SHARED controls, upgrading
the two controls propagates alpha authoring automatically** — the rollout subtasks are
therefore primarily **per-editor VERIFICATION** (author an alpha value, confirm it
persists schema-valid and round-trips in the swatch/picker) plus any surgical additive
prop fix; they are NOT 27 re-implementations.

## Schema-extension plan (NONE — verify only)

**No new schema keys. No DDL. No migration.** Color values are existing `string`
fields on the menu document (`jsonb`) and per-widget props (`jsonb` page regions).
The accepted-value SET at the storage/render boundary ALREADY includes alpha
(`normalizeMenuColorValue` / `resolveClearableCssColorValue`, cited above). This task
widens only the **authoring UI**, so:

- **Migration:** **NONE.** jsonb columns; legacy documents stay byte-identical (an
  opaque `#0d6efd` normalizes to `#0d6efd` unchanged; nothing is rewritten on read).
- **Reject-unknown allowlist:** unchanged — the existing menu/widget normalizers ARE
  the allowlist and already accept the alpha formats the UI will now emit. No new key
  joins any allowlist.
- **Round-trip tests:** even though no key is added, each control upgrade + each
  rollout cluster ships a round-trip assertion that an authored **alpha** value
  (`#0812209e`, `rgba(8,17,31,.84)`) survives the relevant normalize UNCHANGED (the
  UI must not emit a value the boundary would drop).
- **Genuine widening exception (per-editor, expect NONE):** if a rollout-verification
  leaf finds a widget whose OWN normalizer is stricter than
  `resolveClearableCssColorValue` (e.g. a bespoke hex-only regex that drops alpha),
  that is the ONLY case that gets a present-only widening + a round-trip test; it is
  called out explicitly in that leaf. Spot-check confirms the common widgets route
  colors through `resolveClearableCssColorValue`/`resolveClearableStyleValue`
  (`navigation.tsx:15-16`) which already accept alpha, so NONE is expected.

## Subtask breakdown (single-writer file ownership; strict land order)

| # | Subtask | Sole-writer production file(s) | Depends on |
|---|---------|--------------------------------|------------|
| 519-01 | Shared admin color-value normalize/parse helper (+ unit tests) | `core/admin/ui/shared/colorValue.ts` (NEW) | — (foundation) |
| 519-02 | Upgrade `ColorSwatchControl` (menu/page): alpha slider + hex8/rgba text + round-trip | `core/admin/ui/pages/editorControls/ColorSwatchControl.tsx` | 519-01 |
| 519-03 | Upgrade `SharedColorControl` + `ClearableFields` (widgets): fix `isPickerRepresentableColorValue`/`resolveColorPickerValue`, add alpha slider | `core/admin/ui/widgets/editors/ClearableFields.tsx`, `core/admin/ui/widgets/editors/SharedColorControl.tsx` | 519-01 |
| 519-04 | Menu rollout verification (9 direct `MenuDesignEditor` sites + `swatch()` wrapper + `MenuAppearancePanel`) | `core/admin/ui/menus/MenuDesignEditor.tsx`, `core/admin/ui/menus/MenuAppearancePanel.tsx` (verify; additive prop only if needed) | 519-02 |
| 519-05 | Widget-editor rollout verification (27 editors, 5 leaf clusters) | the 27 `core/admin/ui/widgets/editors/*Editors.tsx` files (verify; surgical additive fix only if an editor suppresses alpha) | 519-03 |
| 519-06 | Tests / docs (`DESIGN_TOKENS.md`) / closure + board rows | `_docs/DESIGN_TOKENS.md`, closure changelog 1232 (pin only) | 519-01..05 |

**Land order (strict):** 519-01 (helper) → 519-02 + 519-03 (the two shared controls,
independent of each other, both import 519-01) → 519-04 → 519-05 → 519-06. The
helper (`colorValue.ts`) lands first because both controls import it read-only; the
rollout-verification subtasks land after their respective control ships so the
propagated alpha behavior actually exists to verify.

## Coordination / collision guards

- **Disjoint single-writer ownership** per the table: no two leaves write the same
  production file. `colorValue.ts` is written ONLY by 519-01 and imported read-only
  by 519-02/03 (and, indirectly, exercised by 519-04/05 through the controls).
- **519-02 vs 519-03 are independent** (different control files in different dirs) and
  may land in either order after 519-01; neither imports the other.
- **519-04/519-05 are VERIFICATION-first.** They make NO code change where the shared
  control upgrade already delivers alpha (the expected case). A leaf touches its owned
  editor file ONLY for a surgical additive fix (e.g. an editor that passes a
  `pickerFallback`/`onSwatchChange` that would suppress alpha, or a hex-only prop) —
  and then it is the sole writer of that file. Document any such fix in the leaf.
- **Do NOT edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*`** — the orchestrator
  owns board rows and changelog files. This contract only PINS 1232.
- `MenuDesignEditor.tsx` / large `*.tsx` read as **binary** to `rg` — use `grep -an`
  or `Read`, never trust an empty `rg`.
- **Parallel drift-fixer safety:** the owner runs their own drift agents editing
  `_docs/_TASKS` in the shared tree; scope commits to only files this task authored;
  never revert their uncommitted leaf edits.

## Security Contract (color-value validation IS security here)

No API route is added or modified by this task — but per the TASK-519/520 mandate,
**color-value validation is treated as a security surface** (stored color strings
reach inline `style`/CSS-var on public render paths, so they are attacker-influenceable
content and a CSS/`javascript:`-injection vector).

1. **The UI helper does NOT relax the boundary.** The new `colorValue.ts`
   parse/compose helper (519-01) may ONLY emit values already inside the
   authoritative whitelist — i.e. its `compose`/normalize output is a subset of what
   `resolveClearableCssColorValue` (`clearableStyle.ts:66`) and
   `normalizeMenuColorValue` (`normalizeMenuAppearance.ts:182`) accept: 3/4/6/8-digit
   hex, bounded `rgb[a]()`/`hsl[a]()`, `var(--color-*)`, `transparent`. It MUST NOT
   construct or pass through `url(`, `expression(`, `javascript:`, `data:`, or any of
   `;{}<>`. The helper's accepted-set is a **read-only mirror** of the server set,
   documented as such in 519-01, with a test asserting parity **on the canonical emit**
   (any string the helper EMITS via `normalizeAdminColorValue` is accepted by
   `resolveClearableCssColorValue`). NOTE the render boundary is STRICTER than the menu
   write boundary on alpha syntax: it rejects leading-dot `.84`; the helper therefore
   canonicalizes `.84`→`0.84` on emit so both boundaries accept it (see 519-01).
2. **The server/render boundary stays authoritative (defence in depth).** The
   normalize-on-write (`normalizeMenuColorValue`) and resolve-on-render
   (`resolveClearableCssColorValue`) remain the security boundary and are NOT changed
   or weakened. The UI helper is a convenience layer; even if it had a bug, an unsafe
   value is still dropped at write and at render. No leaf may route a theme/menu color
   to an inline `style` bypassing `resolveClearableCssColorValue`.
3. **Alpha bounds.** The composed alpha channel is clamped to `[0,1]` (2-digit hex
   `00`–`ff`, or `0`–`1` decimal); an out-of-range/NaN alpha falls back to fully
   opaque (`ff`/`1`), never emits a malformed token.
4. **Transparent stays first-class.** Clearing/transparent still emits `null`
   (ColorSwatchControl) or `"transparent"` (SharedColorControl) — never a bare empty
   string that would read as an unknown value.

## Hard Invariants

- **HI-1 — round-trip.** A stored alpha value (`#0812209e`, `rgba(8,17,31,.84)`,
  `hsla(210,60%,8%,.84)`) is displayed by the control as itself (swatch base color +
  alpha slider position reflect it). No clamp-to-`#000000`, no alpha loss. Emit is
  **canonical**: hex round-trips byte-identically; a leading-dot `rgba(…,.84)`/`hsla(…,.84)`
  input is re-emitted as the render-safe `…,0.84)` form (the ONLY normalization, required
  because the render boundary rejects leading-dot alpha — see 519-01 asymmetry note).
- **HI-2 — no silent narrowing.** Editing the base color via the native picker keeps
  the current alpha; editing alpha keeps the base color; neither drops the other.
- **HI-3 — transparent + palette + token UX preserved.** Transparent swatch, palette
  swatches, `var(--color-*)` token display, and the clear/reset affordances behave
  exactly as before (regression-tested).
- **HI-4 — no schema/DDL/migration.** Legacy documents normalize byte-identically;
  no new key joins any allowlist.
- **HI-5 — security boundary intact.** The UI never emits a value outside the
  authoritative whitelist; the server/render normalize is unchanged.
- **HI-6 — single-writer.** Every production file has exactly one owning leaf.

## Acceptance Criteria (measured LIVE)

- **Gates:** root `tsc -p tsconfig.json --noEmit`, `bun --cwd core lint:types`,
  full `vitest`, `bun test`, `gates:coderso` all green (note the typecheck-scope
  gotcha: run BOTH `bun --cwd core lint:types` AND root `tsc` after prop-signature
  changes to the controls, since tests live outside `core/`).
- **Playwright smoke — ≥5 distinct real-flow scenarios (light + dark, 0 console
  errors, screenshots to `_docs/_workflows/_smoke/`):**
  1. Menu bar surface color: author `#0812209e` via `ColorSwatchControl` (base picker
     + alpha slider) → swatch preview shows the semi-transparent color → save → reopen
     → value round-trips (slider + text still `#0812209e`).
  2. Widget editor (e.g. Footer background via `SharedColorControl`): type the owner's
     leading-dot `rgba(8,17,31,.84)` → swatch preview matches (not fallback) → alpha
     slider reflects `.84` → save → reopen → the emitted/stored value is the CANONICAL
     `rgba(8,17,31,0.84)` (leading `0`) that `resolveClearableCssColorValue` accepts, and
     the slider/preview still reflect `.84`. (Verified: raw `rgba(8,17,31,.84)` is dropped
     by the render boundary; `normalizeAdminColorValue` canonicalizes it at the admin
     write — see 519-01.)
  3. Edit the base color of an existing alpha value via the native picker → alpha is
     preserved (HI-2).
  4. Transparent + palette + `var(--color-*)` token still work unchanged (HI-3) across
     both controls.
  5. Publish → front (menu bar + a widget) renders the authored alpha color (real
     computed `background-color` has the expected alpha), matching the prototype's
     header tokens (`#0812209e` normal / the scrolled family authored as `.84` but
     stored/rendered as the canonical `rgba(8,17,31,0.84)`). Assert the front computed
     style actually shows the alpha — proving the emitted value passed
     `resolveClearableCssColorValue` (a raw leading-dot `.84` would have rendered as no
     color).
- **Per-editor verification** (519-04/05): every one of the 27 widget editors + the 9
  direct menu `<ColorSwatchControl>` sites + the `swatch()` wrapper persists an authored
  alpha value as schema-valid and round-trips it; any editor requiring a schema widening
  is named (expected: none).

## Definition of done

All 6 subtasks landed in order; both shared controls author + round-trip alpha
(8-digit hex / rgba / hsla) with an alpha slider while keeping transparent/palette/token
UX; the 27 widget editors + 9 direct menu sites + the `swatch()` wrapper verified schema-valid + round-tripping; no
schema/DDL/migration; Security Contract satisfied (UI helper is a read-only subset of
the authoritative whitelist, server/render boundary unchanged); every gate green; the
≥5-scenario Playwright smoke passes light + dark with 0 console errors; `DESIGN_TOKENS.md`
+ relevant editor docs updated; closure documented under changelog 1232.

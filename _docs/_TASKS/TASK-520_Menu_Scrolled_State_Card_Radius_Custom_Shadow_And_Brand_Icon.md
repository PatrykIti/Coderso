# TASK-520: Menu Design — Scrolled/Floating-State Colors, Menu-Bar Card Radius, Custom Shadow & Brand Icon/Graphic-With-Text

# FileName: TASK-520_Menu_Scrolled_State_Card_Radius_Custom_Shadow_And_Brand_Icon.md

**Priority:** High
**Category:** Admin UI / Content (Menus) / Navigation / Site Render / Schema (JSON model)
**Estimated Effort:** Large
**Dependencies:**
- **TASK-519 (alpha color input)** — the owner acceptance tokens for the scrolled-state and brand-icon colors are `hex8`/`rgba()` with alpha (e.g. header bg normal `#0812209e`, scrolled `rgba(8,17,31,.84)`, border `#ffffff1f`). The SCHEMA layer already accepts these (`normalizeMenuColorValue`, `normalizeMenuAppearance.ts:152-165` — `#rrggbbaa`/`rgba()`/`hsla()`/`var()`/`transparent`), so 520 can PERSIST alpha today; TASK-519 is required only so the ADMIN swatch controls can AUTHOR + round-trip alpha (today `ColorSwatchControl` clamps to 3/6-digit hex and rejects alpha — `ColorSwatchControl.tsx:33,38-46`). 520 admin controls (520-03) consume whatever alpha-capable control 519 ships; if 519 has not landed, the color controls fall back to the existing hex-only control and the alpha tokens must be entered via the raw text field (no schema block).
- TASK-499 (menuDocumentV2 model + `MenuDocumentError` reject-unknown), TASK-501 (per-device `responsive.{tablet,mobile}`), TASK-504 (`BrandStyle`, per-device brand override, `NavLevelStyle`), TASK-506/507/508 (level-0 `NavChromeStyle`, `resolveMenuControlDefault{value,sourceLabel}`, `ControlDefaultHint` `value===undefined ⇒ null` guard, unified submenu direction/accordion — the modern-styling substrate this task extends).
**Status:** ⏳ To Do
**Closure changelog (pinned):** 1233 (highest present on disk 2026-07-07 = 1227; highest pinned in `_TASKS` = 1228 (TASK-516); TASK-519 will take an intermediate number — **re-verify next-free at closure** and do NOT edit `_CHANGELOG/*` or `_TASKS/README.md`, the orchestrator owns those).

---

## Overview

The Menu Design system (`core/admin/ui/menus/MenuDesignEditor.tsx`, model
`core/services/menus/menuDocumentV2.ts`, CSS `core/site/menuDocumentCss.ts`,
public render `core/site/siteShell.tsx`) is already deeply granular after
504/506/508: per-level + per-device link/typography/container styling, modern
bundles (separators, indicators, caret+flyout, pill padding), unified submenu
direction + accordion. This task closes **three owner-reported gaps** that the
existing granularity does NOT cover:

1. **Scrolled/floating-state colors.** A `sticky` menu paints ONE fixed
   appearance (`surfaceColor`/`borderColor`/`shadow`) whether at rest or
   scrolled. The owner wants a *floating header* effect: a different (usually
   more opaque / shadowed) bg + border + shadow once the page is scrolled past a
   threshold — the classic "transparent-on-hero → solid-on-scroll" header. There
   is **no scroll-state machine** today (`sticky` is a pure `position:sticky`
   gate — `menuDocumentCss.ts:210,221`; no `scrolled` class, no observer).
2. **Menu-bar card radius + custom shadow.** The level-0 menu bar has **no
   border-radius** (`NavLevelStyle.radius` exists for submenus level ≥1 only —
   `menuDocumentV2.ts:186`), so a *floating card* header is impossible; and
   `shadow` is a fixed 3-preset enum (`none|sm|md` — `normalizeMenuAppearance.ts:52`)
   with no way to author a custom `0 18px 50px rgba(0,0,0,.24)` drop shadow.
3. **Brand icon + graphic-with-text.** `BrandProps.mode` is an **exclusive**
   `"text" | "image"` enum (`menuDocumentV2.ts:298-312`); there is (c) **no named
   icon mode** (no lucide icon field / picker) and (d) **no image+text combo**
   (a logo mark beside a wordmark). text-only and image-only already work end to
   end (`BrandRender`, `siteShell.tsx:490-536`).

All three land as **present-only, additive, jsonb-only** extensions (no DDL, no
`MENU_DOCUMENT_SCHEMA_VERSION` bump) reusing the existing reject-unknown /
fail-soft / per-device machinery, so every legacy menu document parses and
renders **byte-identical**.

## Gap analysis (grounded — anchors verified fresh 2026-07-07)

### G1 — scrolled/floating-state colors (MISSING)

- `MENU_BAR_LAYOUT_KEYS` (`menuDocumentV2.ts:114-123`) = `surfaceColor`,
  `paddingX`, `paddingY`, `alignment`, `borderColor`, `borderWidth`, `shadow`
  (`MenuAppearanceShadow` enum), `sticky`. **No `*Scrolled` variants.**
- `MenuBarLayout = Pick<MenuAppearance, (typeof MENU_BAR_LAYOUT_KEYS)[number]>`
  (`:145`) — a pure `Pick`, and `normalizeMenuBarLayout` (`:445-446`) delegates
  entirely to `normalizeAppearanceSubset` (`:421-443`) which reject-throws any key
  outside `MENU_BAR_LAYOUT_KEYS` and validates through the strict
  `normalizeMenuAppearance`. So the new keys are NOT `MenuAppearance` members and
  MUST NOT be added to `MenuAppearance` (that would touch `SHELL_APPEARANCE_DEFAULTS`
  / `buildSiteShellCss(null)` byte-identity). They join `MenuBarLayout` as an
  **intersection extension with their OWN reject-unknown allowlist + sub-normalizer**,
  exactly the pattern `NavItemsProps` uses for `levelStyles`/`navChrome`
  (`:148-151`) and `NavChromeStyle` uses for its own family (508-01).
- The CSS header-frame group (`menuDocumentCss.ts:201-223`) emits
  `background`/`border-bottom`/`box-shadow`/`position:sticky` at rest ONLY. No
  `[data-scrolled="true"]` selector exists.
- `SiteHeaderMenuDocumentRender` (`siteShell.tsx:555-621`) is pure SSR — it emits
  `<header data-site-menu-doc="true">` + a `<style>` tag and NO client script. A
  scroll-state machine needs a **tiny front-only inline script** (precedent: the
  `window.addEventListener("load", …)` inline scripts in
  `renderPublicPage.tsx:166-169` / `renderPublicEntry.tsx:215-218`) that toggles
  `data-scrolled` on the header past a threshold.

### G2 — menu-bar card radius + custom shadow (MISSING)

- No `radius` on the menu bar (`MENU_BAR_LAYOUT_KEYS` has none; `NavLevelStyle.radius`
  `:186` is submenu-only). Add a present-only `radius?` (per-device via the
  existing `section.responsive[bp].layout` channel — `resolveMenuSectionAppearanceForDevice`
  merges `{ ...section.layout, ...(override?.layout ?? {}) }`, `:1555`).
- `shadow` is the fixed `menuAppearanceShadows = ["none","sm","md"]` enum
  (`normalizeMenuAppearance.ts:52`) mapped by `MENU_SHADOW_CSS`
  (`menuDocumentCss.ts:86`). Add a present-only `shadowCustom?: string` (a
  validated raw `box-shadow` value) that, when present, OVERRIDES the enum
  `shadow` at emission — so the enum stays the quick-preset default and the
  custom value is the escape hatch (owner token `0 18px 50px rgba(0,0,0,.24)`).
- Everything else the owner might expect (per-level/per-device link + container
  styling, pill padding, alignment) is ALREADY granular from 504/506/508 — this
  task does **NOT** re-spec it.

### G3 — brand icon + graphic-with-text (MISSING)

- `BrandProps.mode: "text" | "image"` (`menuDocumentV2.ts:299`) is exclusive;
  `normalizeBrandProps` (`:1044-1091`) rejects any `mode` other than those two
  (`:1057`). `BRAND_PROP_KEYS = ["mode","href","image","text","style"]` (`:628`).
- `BrandStyle` (`:158-168`) styles text (`fontSize`/`fontWeight`/`color`/
  `textTransform`/`letterSpacing`) or sizes the image (`height`/`maxWidth`) — no
  icon field.
- `BrandRender` (`siteShell.tsx:490-536`) renders `<img>` (image mode + resolved
  src) XOR text — never an icon, never both.
- **(a) icon mode:** add `mode:"icon"` + a validated `icon?` (kebab lucide name,
  pattern + resolve-against-lucide allowlist — mirrors `resolveTimelineDotIconValue`,
  `timeline.tsx:494-501`, and reuses the SSR-renderable `lucideKebabIconComponents`
  from `core/widgets/core/timelineLucideIcons.ts`) + icon `color`/`size` on
  `BrandStyle` (color via the 519 alpha input; validated by `normalizeMenuColorValue`).
- **(d) combo:** the exclusive `mode` cannot express "image AND text" or
  "icon AND text". Introduce `showText?: boolean` (present-only; when a graphic
  mode `"image"|"icon"` ALSO sets `showText:true`, render the graphic + the text
  wordmark side by side). This keeps `mode` the *primary* surface and back-compat
  intact (unset `showText` = today's exclusive behavior).

## Schema-extension plan (JSON model — NO DDL, NO schemaVersion bump)

`menus.settings` is freeform jsonb (`normalizeMenuAppearance.ts:114`); the
document rides the validated `PATCH /menus/:id` `document` envelope. All additions
are **present-only** (emitted only when authored), join a **reject-unknown
allowlist**, and ship a **round-trip persistence test**. Legacy docs without the
new keys normalize **byte-unchanged**. **NO migration** (jsonb) — stated
explicitly; **NO `MENU_DOCUMENT_SCHEMA_VERSION` bump** (`menuDocumentV2.ts:91`
stays `1`).

**MenuBarLayout (`menuDocumentV2.ts` — intersection extension, NOT `MenuAppearance` keys):**

```ts
export type MenuBarLayout = Pick<MenuAppearance, (typeof MENU_BAR_LAYOUT_KEYS)[number]> & {
  // G2 — floating-card menu bar (per-device via section.responsive[bp].layout):
  radius?: number;               // 0..40 px  (local MENU_BAR_LAYOUT_NUMBER_RANGES.radius)
  shadowCustom?: string;         // validated box-shadow value; OVERRIDES the `shadow` enum when present
  // G1 — scrolled/floating-state variants (present-only; fall back to the base key when unset):
  surfaceColorScrolled?: string; // normalizeMenuColorValue (alpha OK)
  borderColorScrolled?: string;  // normalizeMenuColorValue
  borderWidthScrolled?: number;  // reuses menuAppearanceNumberRanges.borderWidth [0,8]
  shadowScrolled?: MenuAppearanceShadow;   // none|sm|md
  shadowCustomScrolled?: string;           // validated box-shadow; OVERRIDES shadowScrolled when present
};
```

- `MENU_BAR_LAYOUT_KEYS` stays the **appearance-subset** allowlist (unchanged);
  a NEW sibling `MENU_BAR_EXTRA_KEYS` allowlists the 6 non-appearance keys.
  `normalizeMenuBarLayout` is **split**: appearance keys → `normalizeAppearanceSubset`
  (over `MENU_BAR_LAYOUT_KEYS` only), extra keys → a new local sub-normalizer
  (`normalizeMenuColorValue` for colors, `clampLocalNumber` for `radius`/
  `borderWidthScrolled`, `normalizeEnumLocal(menuAppearanceShadows, …)` for
  `shadowScrolled`, and the NEW `normalizeMenuBoxShadowValue` for the two
  `shadowCustom*`). Reject-unknown = a key in NEITHER allowlist throws
  `MenuDocumentError(path.key)`. Bad VALUES fail-soft (omit).

**BrandProps + BrandStyle (`menuDocumentV2.ts`):**

```ts
export type BrandProps = {
  mode: "text" | "image" | "icon";  // + "icon"
  href: string;
  image?: Record<string, unknown>;
  text?: string;
  icon?: string;                    // validated kebab lucide name (pattern + lucide-set allowlist)
  showText?: boolean;               // combo: graphic ("image"|"icon") + text wordmark when true
  style?: BrandStyle;
};
export type BrandStyle = {
  /* …existing text/image keys… */
  iconColor?: string;               // normalizeMenuColorValue (alpha OK via 519)
  iconSize?: number;                // 12..64 px (BRAND_STYLE_NUMBER_RANGES.iconSize)
};
```

- `BRAND_PROP_KEYS` (`:628`) gains `"icon"`, `"showText"`; `BRAND_STYLE_KEYS`
  (`:632`) gains `"iconColor"`, `"iconSize"`; `BRAND_STYLE_NUMBER_RANGES`
  (`:689`) gains `iconSize:{min:12,max:64}`. `normalizeBrandProps` accepts
  `mode:"icon"`, validates `icon` (pattern + length cap, fail-soft omit),
  accepts `showText` boolean.

## Subtask breakdown (single-writer file ownership; strict land order)

| # | Subtask | Sole-writer file(s) | Leaves | Depends on |
|---|---------|---------------------|--------|------------|
| 520-01 | Menu-bar + brand MODEL (types, allowlists, normalizers, box-shadow + icon-name validators; new bar keys are present-only with NO seeded resolver default) | `core/services/menus/menuDocumentV2.ts` | L01 bar scrolled/radius keys, L02 custom box-shadow validator, L03 brand icon+combo | — (foundation) |
| 520-02 | Menu-bar CSS emission (radius, custom shadow, `[data-scrolled]` scrolled variants) | `core/site/menuDocumentCss.ts` | — | 520-01 |
| 520-03 | Design Editor controls (bar scrolled group + radius + custom shadow; brand icon picker/style + combo toggle + preview scrolled toggle) | `core/admin/ui/menus/MenuDesignEditor.tsx` | L01 bar controls, L02 brand controls | 520-01, 520-02 |
| 520-04 | FRONT render (brand icon/combo in `BrandRender`; scroll-state machine inline script) | `core/site/siteShell.tsx` | L01 brand icon/combo render, L02 scroll-state machine script | 520-01, 520-02 |
| 520-05 | Tests, docs, closure | test files (own) + `_docs/*.md` | — | 520-01..04 |

**Land order (strictly sequential):** 520-01 (model) → 520-02 (CSS) → 520-03
(admin editor) → 520-04 (front render) → 520-05 (closure). 520-03 and 520-04 are
independent of EACH OTHER (both depend only on 520-01 + 520-02) but are ordered
admin-before-front per the workflow convention; the CSS (520-02) is the shared
emission consumed by BOTH the admin preview canvas (via `buildMenuDocumentCss`)
and the front, so it lands immediately after the model.

## Coordination / collision guards

- **Disjoint single-writer per file.** `menuDocumentV2.ts` = **520-01 only**
  (its three leaves L01/L02/L03 edit DISJOINT symbol regions of the same file in
  strict intra-subtask order — menu-bar layout region, box-shadow validator
  helper, brand region — declared as an additive intra-subtask seam in 520-01;
  no OTHER subtask writes this file). `menuDocumentCss.ts` = 520-02 only.
  `MenuDesignEditor.tsx` = 520-03 only (L01 bar-control region, L02
  brand-control region — disjoint). `siteShell.tsx` = 520-04 only (L01
  `BrandRender`, L02 header script — disjoint).
- **Shared vocabulary defined once (520-01):** the new enum sets
  (`MENU_BAR_EXTRA_KEYS`, `MENU_BAR_LAYOUT_NUMBER_RANGES`, the box-shadow
  validator, the brand-icon validator) are owned by 520-01 and imported read-only by
  520-02 (CSS reads `layout.radius`/`shadowCustom`/`*Scrolled` off
  `resolveMenuSectionAppearanceForDevice(...).layout`), 520-03 (bar controls +
  static helper text — the new bar keys are held out of
  `MENU_BAR_LAYOUT_KEYS`/`SHELL_APPEARANCE_DEFAULTS`, so `resolveMenuControlDefault`
  returns `value===undefined` and NO `ControlDefaultHint` renders for them), 520-04
  (render resolves `icon` against `lucideKebabIconComponents`).
  Any drift in these between subtasks is a reconcile failure.
- **`buildSiteShellCss(null)` byte-identical (HARD INVARIANT):** none of the new
  keys are `MenuAppearance` members — they stay out of `SHELL_APPEARANCE_DEFAULTS`,
  so `siteShellCss.ts` is UNTOUCHED and its byte-identity guard is inviolable.
- **No-override docs byte-identical:** all new fields are present-only (zero
  bytes emitted when unauthored); the scroll-state script is emitted ONLY when a
  scrolled variant is authored AND the bar is sticky (see 520-04) — a legacy doc
  emits no script.
- rg misdetects `MenuDesignEditor.tsx` / `siteShell.tsx` / `menuDocumentV2.ts`
  as binary — use `Read` / `grep -an`, never trust an empty `rg`.
- Do NOT edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*` (orchestrator
  owns them). Closure changelog pinned **1233** (re-verify next-free at closure).

## Security Contract

**No new route, RBAC bucket, method, or endpoint.** All additions ride the
existing validated `PATCH /menus/:id` `document` write path (already gated by the
menus write permission) and the SSR render path. Confirmed: **no route surface
is added** by any subtask. The attacker-influenceable surfaces are (1) the new
COLOR strings, (2) the new custom BOX-SHADOW strings, and (3) the brand ICON
NAME — each is constrained at BOTH the write (normalize) boundary and the render
boundary (defence in depth):

1. **Color values (whitelist, no CSS injection).** `surfaceColorScrolled`,
   `borderColorScrolled`, `iconColor` run through `normalizeMenuColorValue`
   (exported `normalizeMenuAppearance.ts:182`; pattern `:152-165`) at write — the
   SAME token-backed policy
   every menu color uses: allows `#rgb`/`#rrggbb`/`#rrggbbaa`/8-digit hex,
   `var(--color-*)`, bounded `rgb[a]()`/`hsl[a]()`, and `transparent`; rejects
   anything else (invalid → dropped, present-only). Alpha (`#0812209e`,
   `rgba(8,17,31,.84)`) is a first-class accepted format. Raw stored input never
   reaches CSS — only validated values.
2. **Custom box-shadow (NEW whitelist validator — security-critical, 520-01-L02).**
   `shadowCustom`/`shadowCustomScrolled` are raw CSS `box-shadow` values that reach
   an inline/`<style>` declaration. `normalizeMenuBoxShadowValue` (NEW, `menuDocumentV2.ts`)
   accepts ONLY a bounded box-shadow grammar: an optional `inset`, up to 4
   length values (`-?\d+(px|rem|em)`), and ONE color token validated via
   `normalizeMenuColorValue`, optionally comma-repeated up to a small cap (≤4
   layers), total length ≤200 chars. It **rejects** any `url(`, `expression(`,
   `javascript:`, `image-set(`, `/*`, `<`, `>`, `{`, `}`, `;`, `@`, backslash, or
   any token not matching the length/color grammar. Invalid → dropped
   (present-only, fail-soft). This is the parent-mandated "color-value validation
   as security" extended to shadow values.
3. **Brand icon name (allowlist).** `icon` is validated at write by a pattern
   (`^[a-z0-9-]{1,64}$`) AND, at render, resolved against `lucideKebabIconComponents`
   (the lucide icon set = the effective allowlist) — an unknown/unresolvable name
   falls through to the text/site-name fallback and renders NOTHING injectable.
   `brand.href` continues through `sanitizeAuthoringLinkHref` (`:1073`) unchanged.
4. **Render-boundary defence in depth.** 520-02 (CSS) emits scrolled colors +
   custom shadow only from the validated stored values; 520-04 (render) resolves
   the icon name to a component (never interpolates the name into markup) and
   emits icon color via the validated `iconColor`. No new raw-color seam is
   widened.
5. **Allowlist + round-trip (fail-closed READ trap).** Every new key joins its
   reject-unknown allowlist (`MENU_BAR_EXTRA_KEYS` / `BRAND_PROP_KEYS` /
   `BRAND_STYLE_KEYS`) AND ships a persistence round-trip test — a forgotten
   allowlist entry silently degrades every stored doc carrying that key to empty
   on read. No new key ships without its round-trip assertion.

## Hard Invariants

1. **No DDL / no migration** — jsonb only (stated explicitly).
2. **No `MENU_DOCUMENT_SCHEMA_VERSION` bump** (`menuDocumentV2.ts:91` stays `1`).
3. **`buildSiteShellCss(null)` byte-identical** — new keys never join
   `MenuAppearance`/`SHELL_APPEARANCE_DEFAULTS`; `siteShellCss.ts` untouched.
4. **No-override / legacy docs byte-identical** — all fields present-only; the
   scroll-state script emits only when a scrolled variant is authored on a sticky
   bar.
5. **Fail-closed READ trap** — each new key joins its allowlist + exactly one
   value normalizer + a round-trip test; bad values fail-soft (omit), never throw.
6. **`shadowCustom` overrides `shadow`; `shadowCustomScrolled` overrides
   `shadowScrolled`** — the enum stays the quick preset, the custom string is the
   escape hatch. An unset scrolled variant falls back to the corresponding BASE
   key (back-compat: a sticky bar with no scrolled variant looks identical
   scrolled and at rest — today's behavior).
7. **Back-compat brand** — unset `showText` = today's exclusive text-XOR-image
   behavior; `mode:"icon"` with an unresolvable/absent icon falls through to the
   text/site-name chain (never an empty/broken mark).

## Acceptance Criteria (measured LIVE — owner mandate: ≥5 real-flow scenarios)

Verified against the live prototype convention (localhost:5180) + live admin
(`coderso-dev-core-host`, `http://coderso-a.localhost:5173/admin/`) with
`playwright-cli`, light + dark, 0 console errors, screenshots to
`_docs/_workflows/_smoke/`. Assert VISIBLE effects (computed styles / DOM state),
not acceptance-checklist ticks:

1. **Floating-header scroll transition (owner tokens).** A sticky menu with base
   `surfaceColor:#0812209e`, `borderColor:#ffffff1f`, `shadowCustom` unset and
   scrolled `surfaceColorScrolled:rgba(8,17,31,.84)`,
   `borderColorScrolled:rgba(255,255,255,.18)`,
   `shadowCustomScrolled:0 18px 50px rgba(0,0,0,.24)`: on the FRONT, at scrollTop
   0 the header shows the base colors; after scrolling past the threshold the
   header `data-scrolled="true"` toggles and computed `background-color`/
   `border-color`/`box-shadow` change to the scrolled values; scrolling back
   reverts. No layout shift.
2. **Menu-bar card radius.** Setting `radius:18` yields a computed
   `border-radius:18px` on the header on the front AND in the admin preview canvas,
   per-device (mobile override honored).
3. **Custom shadow beats the enum.** With `shadow:"sm"` + `shadowCustom:0 18px 50px
   rgba(0,0,0,.24)`, the computed `box-shadow` is the custom value (not the
   preset); clearing `shadowCustom` reverts to the `sm` preset.
4. **Brand icon mode.** Selecting `mode:"icon"` + icon `house` + `iconColor`
   (alpha) + `iconSize:28` renders a lucide `<svg>` in the header (front + canvas)
   with the authored color/size; an invalid icon name falls through to the site
   name (no broken mark).
5. **Graphic-with-text combo.** `mode:"image"` (or `"icon"`) + `showText:true`
   renders the logo/icon AND the wordmark side by side on the front and canvas;
   unset `showText` renders graphic-only (byte-identical to today).
6. **Cross-device + publish→front parity.** The scrolled variant, radius, custom
   shadow, and brand combo authored in the editor match after `publish` on the
   real front at desktop/tablet/mobile.
7. **Security negatives.** `shadowCustom:"0 0 10px red;} body{display:none"` and
   `surfaceColorScrolled:"url(x)"` and `icon:"../../etc"` are all DROPPED on
   write; the stored doc round-trips without them.

## Definition of done

All 5 subtasks landed in order; scrolled variants + radius + custom shadow + brand
icon/combo persist, round-trip, reject unknown keys, and fail-soft on bad values;
legacy/no-override docs byte-identical; `buildSiteShellCss(null)` byte-identical;
no schemaVersion bump / no migration / no route; scroll-state machine drives
`data-scrolled` on the front only; Security Contract satisfied (color +
box-shadow whitelist at write and render, icon-name allowlist); every gate green
(root `tsc -p tsconfig.json --noEmit`, `bun --cwd core lint:types`, vitest, `bun
test`, `gates:coderso`); ≥6-scenario Playwright smoke passes light + dark with 0
console errors; closure documented under changelog **1233** (re-verify next-free).

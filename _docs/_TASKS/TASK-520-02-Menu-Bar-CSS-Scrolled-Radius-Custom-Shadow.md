# TASK-520-02: Menu-Bar CSS — Card Radius, Custom Shadow & Scrolled-State Variants

# FileName: TASK-520-02-Menu-Bar-CSS-Scrolled-Radius-Custom-Shadow.md

**Parent Task:** TASK-520
**Priority:** High
**Category:** Site Render / CSS emission
**Estimated Effort:** Medium
**Dependencies:** TASK-520-01 (model — `MenuBarLayout` extra keys). TASK-501 (per-device delta machinery).
**Status:** ✅ Done

---

## Scope (single-writer)

**520-02 is the SOLE WRITER of `core/site/menuDocumentCss.ts`.** It emits the CSS
for the new menu-bar keys 520-01 landed: `radius` (border-radius on the header),
`shadowCustom` (overrides the enum `shadow`), and the scrolled-state variants
(`surfaceColorScrolled`/`borderColorScrolled`/`borderWidthScrolled`/`shadowScrolled`/
`shadowCustomScrolled`) under a `[data-scrolled="true"]` scoped selector. This
subtask makes ZERO edits to `menuDocumentV2.ts`, `siteShell.tsx`,
`MenuDesignEditor.tsx`, or `siteShellCss.ts`. It consumes the model read-only.

## Grounded anchors

`menuDocScope = [data-site-menu-doc="true"]` @163; the header-frame `MENU_RULE_GROUPS`
entry @201-223 (base @205-215 emits `background`/`border-bottom`/`box-shadow`/
`position:sticky`; delta @216-222); `MENU_SHADOW_CSS` @86; `shadowCss` @96;
`resolveMenuAppearanceForDevice`/`ResolvedMenuAppearance` @139-146;
`collectMenuAppearanceForDevice` @129-137 (casts `{...layout, ...navProps}` to
`MenuAppearance`, DROPPING the extra bar keys); `resolveMenuSectionAppearanceForDevice`
@1528 returns `{ layout: MenuBarLayout; navProps }` — this is the source for the
extra keys (they survive on `layout`, per-device merged @1555);
`buildMenuDocumentCss(doc)` @1279.

## Key architectural note (why a separate read path)

`ResolvedMenuAppearance` is `MenuAppearance`-typed, so the extra bar keys (`radius`,
`shadowCustom`, `*Scrolled`) are STRIPPED by `collectMenuAppearanceForDevice`'s
`{...layout, ...navProps}` cast (@136) — the existing header-frame group CANNOT
see them. 520-02 reads them **separately** from
`resolveMenuSectionAppearanceForDevice(doc.sections[0], device).layout` (per-device
aware), mirroring how `levelStyles`/`navChrome` are read via a separate path
(`@990`, `@1110`). Emit present-only: a key that is `null`/absent emits ZERO bytes
(no-override byte-identity).

## Implementation pseudocode

```ts
// New helper — reads the EXTRA bar keys off the layout (NOT ResolvedMenuAppearance):
const barExtra = (doc: MenuDocumentV2, device: MenuDeviceKind): MenuBarLayout | null => {
  const section = doc.sections[0];
  if (!section) return null;
  return resolveMenuSectionAppearanceForDevice(section, device).layout;
};

// 1) RADIUS + custom-shadow override on the base header-frame declarations.
//    Extend the header group (@205-215) — but since MENU_RULE_GROUPS is typed over
//    ResolvedMenuAppearance which lacks these keys, emit them as a SEPARATE rule block
//    appended after the header-frame group (present-only), keyed on menuDocScope:
const menuBarExtraRules = (layout: MenuBarLayout): string[] => {
  const decls: string[] = [];
  if (layout.radius != null) decls.push(`border-radius:${layout.radius}px`);
  // shadowCustom OVERRIDES the enum `shadow` (Hard Invariant): if present, its box-shadow
  // wins. Emit AFTER the header-frame group so cascade order (later wins) makes it override.
  if (layout.shadowCustom) decls.push(`box-shadow:${layout.shadowCustom}`);
  return decls.length ? [`${menuDocScope}{${decls.join(";")}}`] : [];
};

// 2) SCROLLED-STATE variants — a [data-scrolled="true"] scoped block. Each variant falls
//    back to the corresponding BASE key when unset (present-only ⇒ we only emit the ones set;
//    an unset scrolled key inherits the base rule already on menuDocScope, which is exactly
//    "looks identical scrolled" back-compat).
const scrolledScope = `${menuDocScope}[data-scrolled="true"]`;
const menuBarScrolledRules = (layout: MenuBarLayout): string[] => {
  const decls: string[] = [];
  if (layout.surfaceColorScrolled) decls.push(`background:${layout.surfaceColorScrolled}`);
  if (layout.borderColorScrolled != null || layout.borderWidthScrolled != null) {
    const w = layout.borderWidthScrolled;
    const c = layout.borderColorScrolled;
    // emit only the axes authored; if only color set, keep base width via longhand:
    if (c != null && w != null) decls.push(`border-bottom:${w}px solid ${c}`);
    else if (c != null) decls.push(`border-bottom-color:${c}`);
    else if (w != null) decls.push(`border-bottom-width:${w}px`);
  }
  // shadowCustomScrolled overrides shadowScrolled overrides base:
  if (layout.shadowCustomScrolled) decls.push(`box-shadow:${layout.shadowCustomScrolled}`);
  else if (layout.shadowScrolled != null) decls.push(`box-shadow:${shadowCss(layout.shadowScrolled)}`);
  return decls.length ? [`${scrolledScope}{${decls.join(";")}}`] : [];
};

// 3) In buildMenuDocumentCss (@1279): after the base MENU_RULE_GROUPS output, append
//    the desktop extra + scrolled rules, and per-device (tablet/mobile) variants inside
//    the SAME @media wrappers the existing tablet/mobile deltas already use — so a mobile
//    radius override re-emits inside @media. Read via barExtra(doc, device) per device.
//    DESKTOP (no media): menuBarExtraRules(barExtra(doc,"desktop")) + menuBarScrolledRules(...)
//    TABLET  (@media …): only re-emit keys that DIFFER from desktop (delta discipline, like
//                        MENU_RULE_GROUPS.delta) to preserve byte-identity when unchanged.
//    MOBILE  (@media …): same, vs desktop base.
```

**Delta discipline (byte-identity):** follow the existing tablet/mobile delta
pattern (`tabletDelta`/`mobile` in `MenuRuleSets` @148-161) — a device branch
emits an extra/scrolled rule ONLY when the resolved per-device `layout` value
DIFFERS from desktop. When no device override exists, `barExtra(doc,"tablet")`
equals `barExtra(doc,"desktop")` and nothing is emitted for that device (zero
byte drift vs pre-520).

**Cascade/override correctness:** `menuBarExtraRules` (with `shadowCustom`) is
appended AFTER the header-frame group so its `box-shadow` wins over the enum
`shadow` emitted at @209. The `[data-scrolled]` block is more specific than the
base `menuDocScope`, so scrolled variants win only when the attribute is present.

## Regression-test shape (Bun lane — `tests/unit/site/menu-document-render.test.tsx` / css test)

> Lane note: `tests/unit/site/menu-document-render.test.tsx` runs on `bun:test` +
> `renderToString` (SSR render), so per `_docs/TESTING_STRATEGY.md` (`tests/unit/*`
> = Bun; `tests/vitest/*` = Vitest) it is the **Bun** lane, NOT Vitest. Add these
> CSS assertions there (or, if kept truly Bun-free, in a `tests/vitest/*` file).

- **Radius:** a doc with `layout.radius:18` → CSS contains `border-radius:18px` on
  `menuDocScope`.
- **Custom shadow overrides enum:** `shadow:"sm"` + `shadowCustom:"0 18px 50px
  rgba(0,0,0,.24)"` → the emitted `box-shadow` for the header is the custom value,
  appearing AFTER the preset in source order (cascade wins).
- **Scrolled block:** `surfaceColorScrolled`/`borderColorScrolled`/
  `shadowCustomScrolled` → a `[data-site-menu-doc="true"][data-scrolled="true"]{…}`
  rule with the scrolled values; unset scrolled keys emit no scrolled decl.
- **No-override byte-identity:** a doc with NO extra bar keys emits CSS
  byte-identical to pre-520 (golden/snapshot).
- **Per-device:** `responsive.mobile.layout.radius:8` → the mobile `@media` block
  re-emits `border-radius:8px`; a doc with equal desktop/mobile radius emits it
  only once (desktop), no mobile duplication.

## Hard Invariants (owned by this subtask)

1. `siteShellCss.ts` UNTOUCHED; `buildSiteShellCss(null)` byte-identical.
2. Present-only: unset extra/scrolled keys emit ZERO bytes; legacy docs
   byte-identical.
3. `shadowCustom` overrides enum `shadow`; `shadowCustomScrolled` overrides
   `shadowScrolled` overrides base — enforced by source order / specificity.
4. Scrolled variants scoped to `[data-scrolled="true"]` — inert until 520-04's
   scroll-machine sets the attribute (a sticky bar with a scrolled variant but no
   script would just never enter the scrolled state; the script is required for
   the effect and is 520-04's job).
5. Per-device via the existing delta machinery (byte-identity when unchanged).

## Testing Requirements

Bun CSS/render lane (`tests/unit/site/menu-document-render.test.tsx`): the 5 cases
above. The ≥6-scenario Playwright
smoke (scroll transition, radius, custom shadow, brand, combo, cross-device) is
authored in 520-05.

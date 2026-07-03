# TASK-508-04: Design Editor — Align, Direction & Accordion Controls

# FileName: TASK-508-04-Design-Editor-Align-Direction-Accordion-Controls.md

**Parent Task:** TASK-508
**Priority:** High
**Category:** Admin UI / Content (Menus) / Navigation / Page Builder / Responsive
**Estimated Effort:** Medium
**Dependencies:** TASK-508-01 (model keystone — `NavLevelStyle.linkAlign`, `NavChromeStyle.submenuDirection`/`submenuMode`, the `NAV_LINK_ALIGNS`/`SUBMENU_DIRECTIONS`/`SUBMENU_MODES` enum arrays + allowlists + `NAV_CHROME_DEFAULTS` hint entries, and the R1(a) `resolveNavKeyThemeDefault` container-default fix — ALL land before this subtask opens), TASK-508-02 (CSS — this subtask's in-canvas preview consumes 508-02's `buildMenuDocumentPreviewCss` / `previewForceOpenLevel` `visibility:visible` update for the direction/accordion/animation preview). Rides the existing validated `PATCH /menus/:id` write path.
**Status:** ⏳ To Do

---

## Scope (single-writer)

**Sole writer of the PRODUCTION source file `core/admin/ui/menus/MenuDesignEditor.tsx`;
co-author of `tests/vitest/ui/menu-design-editor.test.tsx`** bounded to the @1762/@1771 edits
+ the new R1(b)/R3a/R3b/force-open assertions per the byte-introducer split in §2b/Testing (the
R1(a) @2069-2078 loop and the L1/L2 force-open `toContain`s @1768/@1777/@1780 — plus the
depth-2 @2197 in the separate `…styled sublist is revealed` test — are NOT this subtask's;
they are 508-01/508-02-owned per the splits below). Land order (from the parent board): 508-01 → 508-02 → 508-03 → **508-04** →
508-05. This subtask opens only after 508-01 (model) and 508-02 (CSS builder API +
`previewForceOpenLevel` update) are green, because:

- The `linkAlign` / `submenuDirection` / `submenuMode` model fields, their enum partitions,
  and the R1(a) corrected `resolveNavKeyThemeDefault` container defaults are shipped by
  **508-01** — this subtask only *renders controls* against them.
- The in-canvas preview (`buildMenuDocumentPreviewCss` force-open) that must SHOW the new
  direction/accordion/animation is emitted by **508-02**; 508-04 flips the same
  `navLevel`/`forceOpenLevel` and per-device props that already drive the canvas.

This subtask delivers three editor changes:

- **R1(b)** — a per-level link **alignment** segmented control (`left|center|right`) in
  `NavLevelControls` (dropdown levels 1/2).
- **R3a/R3b** — two nav-global SegmentedControls (`submenuDirection` right/down/up/left,
  `submenuMode` Flyout/Accordion) in the **level-0** nav-base panel, rendered as **base-only,
  device-DEFINING** unwrapped controls (mirror `dropdownDirection` @2344 — write the BASE
  `navChrome` regardless of the active device, NO per-device fork / no `chromeControl` shell /
  no badge/Reset), because flyout↔accordion + open-direction are structural ≥640 axes with NO
  tablet-delta emitter (see §2 justification — avoids dead tablet override data).
- **R2 canvas force-open (level-0)** — 508-04 EDITS `forceOpenLevel` @2639-2640 so that a
  nav-items selection on the **Level-0 tab** also sim-opens the first dropdown, otherwise the
  R3a/R3b direction/accordion/animation effects are invisible in the canvas while the author is
  operating those very controls (§2b).
- **R1(a)** — **no new hint/slider LOGIC; ONE forced mechanical edit in this subtask's SOURCE
  file**: the 508-01 `resolveNavKeyThemeDefault` fix auto-fixes BOTH the `ControlDefaultHint`
  (now renders "Default 180px"/"Default 6px" since the resolved `value !== undefined`, satisfying
  the 507 `value===undefined ⇒ null` guard) AND the slider thumb
  (`resolved ?? providerValue ?? range.min`) with ZERO new render code. Because 508-01 removes
  `containerPaddingX`/`containerPaddingY` from `MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS`
  (verified present @2205-2208 of `menuDocumentV2.ts`), the `ControlDefaultHint` comment @593-598
  in this subtask's SOURCE file becomes factually wrong and MUST be corrected here:
  - **Comment fix (sole-writer file):** the `ControlDefaultHint` comment @593-598 currently
    lists `containerPaddingX/Y` among the intentionally-hidden "Not applied" numerics — after
    R1(a) they render "Default 6px", so that is factually wrong. Drop `containerPaddingX/Y`
    from that comment's list; keep `navPillRadius/PaddingX/PaddingY`.
  The PAIRED test amendment — removing `containerPaddingX/Y` from the named "TASK-507 FIX B: gated
  present-only numerics render NO default hint when unset" hint-hidden loop
  (`tests/vitest/ui/menu-design-editor.test.tsx` @2069-2078) and authoring the positive "Default
  6px"/"Default 180px" assertion — is **owned by 508-01**, NOT this subtask. 508-01 lands FIRST and
  its resolver change is what turns that assertion red, so 508-01 amends it green in the SAME commit
  (in-scope per 508-01 "Pre-existing test amendments"). Because land order is strictly 01→…→04, by
  the time 04 opens those two keys are already gone from that loop; 508-04 does NOT touch that test
  region (a second write would be a stale/duplicate collision). So R1(a)'s ONLY 508-04 edit is the
  source comment above. (508-04's own force-open test edits @1755-1784 — the level-0 @1762
  inversion + the depth-2-at-L1 `not.toContain` @1771-1773 re-string — are SEPARATE, unique edits;
  the Level-1/2 `toContain` re-strings are 508-02-owned per §2b/Testing.)

**Security Contract note:** UI/client-state + schema-first document-contract extension; **no
new route/RBAC/endpoint/migration.** This subtask is pure client-side editor wiring over the
existing `updateDoc` → `patchMenuNavChromeForDevice` / `setLevel` write helpers, which ride
the already-`content:write`-gated `PATCH /menus/:id` envelope (service-side strict
`menuUpdateSchema` validation of the `document`). No auth/nonce/HMAC/reCAPTCHA change; no
`schemaVersion` bump; `menus.settings` is already freeform jsonb (no migration). The editor
NEVER bypasses the 508-01 normalizers — every control writes a validated enum token or
`undefined` (clear ⇒ present-only), and unknown keys can never originate here.

---

## Verified anchors (Read + grep, `feature/visual`, this run)

`core/admin/ui/menus/MenuDesignEditor.tsx` (2883 lines):

- **Label/option maps** — `@300-331`: `dropdownDirectionLabels` @303, `mobileModeLabels` @304;
  the 506 B1–B5 block `ITEM_DIVIDER_STYLE_OPTIONS` @308, `NAV_INDICATOR_OPTIONS` @314,
  `FLYOUT_ANIMATION_OPTIONS` @320 + `flyoutAnimationLabels` @321, `SUBMENU_PLACEMENT_OPTIONS`
  @326 + `submenuPlacementLabels` @327. **New option arrays + label maps slot here (@331+).**
- **`NavLevelControls`** (levels 1/2): `slider` helper @1509-1525 (thumb fallback
  `resolved ?? fallback ?? NAV_LEVEL_NUMBER_RANGES[key].min` @1517, `fallback` from
  `resolveMenuControlDefault(section, device, level, key).value` @1512); `seg` helper
  @1529-1542 (three-state, `"inherit"` sentinel ⇒ writes `undefined`, `optionLabels={{inherit:"Default", ...labels}}`);
  `toggle` @1543-1553; `levelControl` wrapper (badge/reset/hint shell) used throughout the
  return @1554+.
- **Dropdown-container group** — `@1588-1620`: heading "Dropdown container" @1588-1590;
  `minWidth` slider @1610; `containerPaddingX` @1611-1615; `containerPaddingY` @1616-1620.
  **`linkAlign` seg slots immediately after @1620, before the `level === 2` "Nested submenu"
  block @1621-1637** (which holds the existing level-2-only `submenuPlacement` seg @1626-1635).
- **Level-0 nav-base / navChrome panel**: `resolveMenuNavChrome` @1836; `setChromeField`
  @1845-1856 (`patchMenuNavChromeForDevice(current, target.id, device, {[key]:value})`);
  `resetChrome`/`resetChromeBase` @1857-1868; `chromeControl` shell @1869-1889 (wraps in
  `MenuResponsiveControlShell` + `ControlDefaultHint … level={0} propKey={key}`);
  `chromeSeg` helper @1915-1928; `chromeToggle` @1929-1939. The navChrome controls render in
  the level-0 branch: Divider/Indicator/Caret groups @2280-2343; `dropdownDirection`
  unwrapped `SegmentedControl` (device-DEFINING, `device !== "mobile"`, no shell) @2344-2361;
  `mobileMode` (mobile-only) @2362-2375; the level-1/2 `NavLevelControls` mount @2378-2384.
  **The `submenuDirection` + `submenuMode` controls slot as a new "Submenu" group right after
  the `dropdownDirection`/`mobileMode` cluster (@2375), still inside the level-0 branch.**
- **`forceOpenLevel` canvas gate** — `navLevelActive` @2638, `forceOpenLevel` @2639-2640
  (`navLevelActive >= 1 ? navLevelActive : undefined`). This derivation (in THIS file — the
  subtask's sole writer) is the sim-open seam that drives 508-02's preview. It is `undefined`
  whenever `navLevel === 0`, so on the Level-0 tab NO dropdown is force-open in the canvas.
  **508-04 EDITS it** so a level-0 nav selection previews the first dropdown open (§2b).

`core/site/menuDocumentCss.ts` (from 508-02, consumed here read-only, cited for the §2 fork
decision): `collectChromeDeltaRules` @993-1002 re-runs `navChromeRules` for the tablet/mobile
delta but `navChromeRules` @966+ emits ONLY link/pill/divider/indicator/caret CSS — NOT the
`submenuDirection` structural rule nor the accordion rule (separate desktopShared emitters,
e.g. dropdown-direction @328/@1047); `NAV_CHROME_COMPARE_KEYS` @927-945; the B5 standalone
`submenuPlacementDeltaRule` @1012-1022 is the carve-out precedent for a structural key that
lives OUTSIDE `navChromeRules`.

`core/services/menus/menuDocumentV2.ts` (from 508-01, consumed here read-only):
`resolveMenuControlDefault` @2341-2393; `resolveNavKeyThemeDefault` @2241-2277 (the R1(a) fix
target); `NAV_CHROME_DEFAULTS` @731-741 (`submenuDirection:"down"`, `submenuMode:"flyout"`
hint entries added by 508-01).

---

## Execution-ready pseudocode

### 0. New option arrays + label maps (`@331+`, beside `submenuPlacementLabels`)

```ts
// core/admin/ui/menus/MenuDesignEditor.tsx  (module scope, after @331)

// R1(b) — per-level link alignment (dropdown levels 1/2). STORED tokens only;
// the seg helper prepends the "inherit"⇒"Default" sentinel.
const LINK_ALIGN_OPTIONS = ["left", "center", "right"] as const;
const linkAlignLabels: Record<string, string> = {
  left: "Left",
  center: "Center",
  right: "Right",
};

// R3a — nav-global submenu DIRECTION (governs EVERY flyout depth).
const SUBMENU_DIRECTION_OPTIONS = ["right", "down", "up", "left"] as const;
const submenuDirectionLabels: Record<string, string> = {
  right: "Right",
  down: "Down",
  up: "Up",
  left: "Left",
};

// R3b — nav-global submenu MODE (flyout overlay vs in-flow accordion).
const SUBMENU_MODE_OPTIONS = ["flyout", "accordion"] as const;
const submenuModeLabels: Record<string, string> = {
  flyout: "Flyout",
  accordion: "Accordion",
};
```

> Token/enum byte-parity: `LINK_ALIGN_OPTIONS` MUST equal 508-01's `NAV_LINK_ALIGNS`,
> `SUBMENU_DIRECTION_OPTIONS` == `SUBMENU_DIRECTIONS`, `SUBMENU_MODE_OPTIONS` ==
> `SUBMENU_MODES` — same ORDER and same string literals, so the segmented tokens the editor
> writes are byte-identical to the model's accepted enum and never fail-soft-dropped on read
> (508-05 asserts each written token round-trips through `menuDocumentV2` unchanged).

### 1. R1(b) — `linkAlign` per-level seg in `NavLevelControls` (`@1620`)

The generic `seg` helper (@1529) already keys off `keyof NavLevelStyle`, writes via `setLevel`
(clearing on the `"inherit"` sentinel), and `levelControl` supplies the badge/reset/hint shell
with `ControlDefaultHint level={level}`. So the whole control is ONE `levelControl(seg(...))`
call — NO new plumbing. Insert immediately after the `containerPaddingY` control (@1620),
before the `level === 2` "Nested submenu" block (@1621):

```tsx
// …@1616-1620 containerPaddingY…
{levelControl(
  "linkAlign",
  "Link alignment",
  seg("linkAlign", "Link alignment", LINK_ALIGN_OPTIONS, linkAlignLabels)
)}
{level === 2 ? ( /* …existing "Nested submenu" submenuPlacement block @1621-1637… */ ) : null}
```

- Rendered for **levels 1 and 2** (NavLevelControls only mounts for non-0 `navLevel`, @2378);
  level-0 top-bar centering is **out of scope** (deferred — not requested).
- `seg` value = `(levelStyle.linkAlign) ?? "inherit"`; options `["inherit","left","center","right"]`;
  `optionLabels={{inherit:"Default", left:"Left", center:"Center", right:"Right"}}`. Selecting
  "Default" writes `undefined` (present-only ⇒ zero bytes ⇒ the `ControlDefaultHint` shows the
  resolved default). The hint resolves via 508-01's `resolveNavKeyThemeDefault` `NAV_CHROME_DEFAULTS`
  branch (level-agnostic) → reads `linkAlign` default if 508-01 adds one, else `sourceLabel:"Not set"`;
  per parent, no numeric hint needed here (enum control).
- **Default-hint data flow:** `levelControl` → `ControlDefaultHint(section, device, level=1|2, propKey="linkAlign", isSet=levelIsSet("linkAlign"))`. Because `linkAlign` is an enum (not in `NAV_LEVEL_NUMBER_RANGES`), the `slider` path is untouched; the hint text is whatever 508-01's provider returns for `linkAlign`.
- **Per-device:** `setLevel` writes base on Desktop, sparse override on Tablet/Mobile via the
  existing device-fork; the `MenuResponsiveControlShell` badge/Reset appears automatically on
  override devices (identical to every other `levelControl`).

### 2. R3a/R3b — nav-global `submenuDirection` + `submenuMode` in the level-0 panel (`@2375`)

These are `NavChromeStyle` keys but they are **structural, nav-GLOBAL, ≥640 axes with NO
tablet-delta emitter** (see the fork decision below), so they are rendered as **base-only,
device-DEFINING unwrapped `SegmentedControl`s** — the SAME shape as `dropdownDirection` @2344-2360
(NO `chromeControl` shell, NO badge/Reset, NO device fork). They always write the BASE
`navChrome`, regardless of the active device. Insert a new "Submenu" group in the **level-0
branch**, right after the `dropdownDirection`/`mobileMode` device-defining cluster closes (@2375),
before the branch's `</>`:

```tsx
// …@2362-2375 mobileMode…
// A base-only writer: hardcode device:"desktop" so the BASE navChrome record is
// written on ANY active device (NOT the device-forked `setChromeField` @1845,
// which would write a tablet/mobile OVERRIDE the CSS never reads). Clearing to
// "inherit" writes `undefined` ⇒ present-only ⇒ ZERO bytes.
const setChromeBaseField = <K extends keyof NavChromeStyle>(
  key: K,
  value: NavChromeStyle[K] | undefined
) =>
  updateDoc((current) => {
    const target = current.sections[0];
    return target
      ? patchMenuNavChromeForDevice(current, target.id, "desktop", {
          [key]: value,
        } as Partial<NavChromeStyle>)
      : current;
  });
const chromeBaseSeg = (
  key: keyof NavChromeStyle,
  label: string,
  options: readonly string[],
  labels: Record<string, string>
) => (
  <SegmentedControl
    label={label}
    value={(section ? readMenuNavChromeBaseValue(section, key) : undefined) ?? "inherit"}
    options={["inherit", ...options]}
    optionLabels={{ inherit: "Default", ...labels }}
    onChange={(next) => setChromeBaseField(key, next === "inherit" ? undefined : (next as never))}
  />
);

{device !== "mobile" ? (
  // Structural / nav-GLOBAL, base-only. Dropdowns + the flyout↔accordion choice
  // only apply >=640px (sublists collapse inline on mobile), so — exactly like
  // Dropdown direction @2344 — these are Desktop/Tablet-only AND both edit the
  // BASE navChrome (the CSS `submenuDirection`/accordion emitters read baseNavChrome
  // in desktopShared; there is NO tablet-delta emitter for these keys).
  <>
    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Submenu
    </p>
    {chromeBaseSeg("submenuDirection", "Open direction", SUBMENU_DIRECTION_OPTIONS, submenuDirectionLabels)}
    {chromeBaseSeg("submenuMode", "Submenu mode", SUBMENU_MODE_OPTIONS, submenuModeLabels)}
  </>
) : null}
```

- **Why level-0 / nav-global (not per-level):** the owner's goal is a SINGLE switch so
  "everything opens down" (or "everything is an accordion") is one obvious menu-level toggle,
  not a per-level chore. `navChrome` is the nav-wide sub-record.
- **Why base-only device-DEFINING and NOT the `chromeControl` device-fork:** the CSS emitters
  (508-02) read `baseNavChrome` in `desktopShared`, and — unlike the 506/507 pill/divider/
  indicator/caret keys — there is **NO tablet-delta emitter** for `submenuDirection`/`submenuMode`.
  `collectChromeDeltaRules` (`menuDocumentCss.ts` @993-1002) re-runs `navChromeRules` for the
  tablet delta, but `navChromeRules` @966+ emits ONLY link/pill/divider/indicator/caret CSS —
  it contains NO direction rule and NO accordion rule (those are separate desktopShared
  emitters). So if these keys rode `chromeControl` + `NAV_CHROME_COMPARE_KEYS`, a Tablet
  override would make `shallowEqualChrome` detect a diff and re-emit `navChromeRules` — which
  carries ZERO direction/accordion bytes → the tablet override is **DEAD DATA behind a
  misleading badge/Reset** (exactly the B5 gap that forced the standalone
  `submenuPlacementDeltaRule` carve-out @1012-1022). Rather than add a second carve-out for two
  more keys, 508-04 renders them **base-only** (like `dropdownDirection`, `minWidth`→structural
  axes) — one authored value drives every device ≥640. Mobile is gated OUT (`device !== "mobile"`)
  because flyout/accordion are ≥640-only (mobile is already an inline column), mirroring the
  `dropdownDirection` `device !== "mobile"` guard @2344. **Cross-subtask contract:** 508-02
  therefore does NOT add `submenuDirection`/`submenuMode` to `NAV_CHROME_COMPARE_KEYS` and emits
  NO tablet-delta carve-out for them (base-only, like `dropdownDirection`); if a future subtask
  wants a real per-device fork it MUST first ship dedicated standalone tablet-delta emitters
  (mirroring `submenuPlacementDeltaRule`) for BOTH keys before the editor may device-fork them.
- **Default display (no separate hint):** the base-only unwrapped `SegmentedControl` shows the
  authored base token, or the "Default" (`inherit`) segment when unset — matching
  `dropdownDirection` (no `ControlDefaultHint` shell). 508-01 still adds
  `submenuDirection:"down"` / `submenuMode:"flyout"` to `NAV_CHROME_DEFAULTS` (@731) for the
  CSS resolver; selecting "Default" writes `undefined` ⇒ present-only ⇒ ZERO direction/accordion
  bytes ⇒ byte-identity (the resolver falls back to the model default).

### 2b. R2 canvas force-open for the level-0 nav-global controls (`forceOpenLevel` @2639-2640)

The R3a/R3b controls live on the **Level-0 tab**, but `forceOpenLevel` is derived in THIS file as
`navLevelActive >= 1 ? navLevelActive : undefined` (@2639-2640) — it is `undefined` for
`navLevel === 0`. So while the author is on Level-0 operating `submenuDirection`/`submenuMode`,
NO dropdown is force-open in the canvas and the reposition / accordion push-down / flyout
animation are ALL invisible — the exact "no visible difference" class Req2 exists to kill.
508-04 fixes this in its own file: force-open the first dropdown (level 1) whenever a nav-items
block is selected, even on the Level-0 tab, so the nav-global effects are statically visible
while editing them:

```tsx
// @2638-2640 — was: navLevelActive >= 1 ? navLevelActive : undefined
const navLevelActive: 0 | 1 | 2 = selectedBlock?.type === "nav-items" ? navLevel : 0;
const forceOpenLevel: NavLevelStyleLevel | undefined =
  selectedBlock?.type === "nav-items"
    ? // Level 0 has no sublist of its own; preview-open the FIRST dropdown so the
      // nav-global submenuDirection/submenuMode/animation effects are visible while
      // the author edits them on the Level-0 tab. Levels 1/2 keep opening their own depth.
      ((navLevelActive >= 1 ? navLevelActive : 1) as NavLevelStyleLevel)
    : undefined;
```

- This is the ONLY canvas-code change 508-04 makes; it stays inside the subtask's sole file
  (`MenuDesignEditor.tsx`) and only widens WHEN the existing preview force-opens — it consumes
  508-02's `previewForceOpenLevel` `visibility:visible` update unchanged (no CSS edit here).
- Levels 1 and 2 are unaffected (still open their own depth); only the previously-`undefined`
  level-0 case now previews depth-1. Non-nav selections still yield `undefined` (nothing forced).
- **Stale comment + existing-test updates (split by byte-introducer):** the explanatory comment
  @2634-2637 ("`forceOpenLevel` sim-opens the canvas ONLY for a nav level >= 1") becomes
  factually wrong and MUST be rewritten HERE to say a level-0 nav selection now sim-opens depth-1.
  The existing named test "canvas force-open threads the selected level" (@1755-1784) then splits
  its assertion ownership by WHICH subtask introduces each byte change — the SAME
  byte-introducer-owns-the-amendment principle R1(a) applies to the @2069-2078 loop (508-01 owns
  it because 508-01's resolver change is what turns it red):
  - **508-04 owns (its own §2b break + the guard 508-02's fold silently degrades):** two `expect`
    edits only — (a) the **Level-0 @1762-1764** assertion asserts today that **Level 0 ⇒ NO
    force-open rule (byte-identical preview)**; §2b INVERTS that, so 508-04 flips it from
    `not.toContain` to `toContain` the depth-1 open rule
    (`.site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}`)
    at level 0; (b) the **Level-1 depth-2 `not.toContain` @1771-1773** (the "depth-2 absent at
    level 1" guard) currently pins the SHORT pre-Req2 substring
    `.site-nav-sublist .site-nav-sublist{display:grid;opacity:1;transform:none}` — after 508-02
    folds `visibility:visible` that exact substring can never be emitted by any level, so the guard
    silently degrades to a tautology (it would pass even if depth-2 wrongly opened at level 1);
    508-04 re-strings it to the visibility-inclusive ANCHORED depth-2 form 508-02 emits @1263
    (`.site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}`)
    so it stays a meaningful `not.toContain`. The level-0 canvas preview is intentionally NO LONGER
    byte-identical to the unforced preview (see Testing).
  - **508-02 owns (its own `visibility:visible` fold-in):** across TWO named tests, FOUR
    `toContain`s pin the pre-Req2 bytes verbatim — in "canvas force-open threads the selected
    level (cumulative)" (@1755-1784): the **Level-1 @1768** and **Level-2 @1777/@1780**; AND in the
    SEPARATE test "canvas force-open threads the selected level so the styled sublist is revealed"
    (@2187-2201): the depth-2 **@2197** at Nesting level 2 (same short unanchored form as @1780).
    508-02's `previewForceOpenLevel`
    change (menuDocumentCss.ts @1256/@1263 → `display:grid;visibility:visible;opacity:1;transform:none`)
    turns ALL FOUR RED. Because land order is 01→02→03→04 and **508-03 gates BETWEEN 508-02 and
    508-04**, 508-02 MUST re-string these FOUR `toContain`s (@1768, @1777, @1780, @2197) to the
    visibility-inclusive form in the
    SAME atomic unit that changes `previewForceOpenLevel` (alongside the goldens it already resyncs
    in `tests/vitest/site/menu-document-css.test.ts`), so BOTH editor tests are GREEN when 508-03
    gates. If 508-04 owned them instead, the editor tests would sit RED across 508-03's gate —
    violating the each-subtask-green invariant. **Cross-subtask note (RESOLVED):** 508-02 extends its
    paired-golden carve-out to include these FOUR `menu-design-editor.test.tsx` force-open
    `toContain`s (@1768 L1 depth-1, @1777 L2 depth-1, @1780 L2 depth-2, @2197 L2 depth-2 in the
    second test) as the fourth carve-out file
    in its "Paired golden-test resync (MANDATORY)" block, so the force-open re-string is pinned
    to EXACTLY 508-02 (no red window, no double-write collision). (Board may instead land
    508-02+508-04 atomically; either way ONE subtask owns it.)
- 508-05 SMOKE asserts the Level-0 canvas actually shows the open dropdown reacting to
  Open direction (Down/Up/Left/Right) and Submenu mode (Flyout↔Accordion).

### 3. R1(a) — corrected container hints: NO new render code (forced comment + test edits)

The 508-01 `resolveNavKeyThemeDefault` fix (real `minWidth→180`, `containerPaddingX/Y→6`
defaults + removal of `containerPaddingX/Y` from `MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS`)
is consumed unchanged by BOTH existing editor seams with ZERO edits here:

- **Hint:** `ControlDefaultHint` (already wrapped around the `minWidth`/`containerPaddingX/Y`
  `levelControl`s @1610-1620) now receives a resolved `value !== undefined` from the provider,
  so its 507 `value===undefined ⇒ null` early-return no longer fires → the hint renders
  "Default 180px" / "Default 6px" instead of being hidden.
- **Slider thumb:** `slider` @1509-1525 computes `fallback = resolveMenuControlDefault(...).value`
  @1512 and shows `resolved ?? fallback ?? range.min` @1517 → the unset thumb now sits at
  180 / 6 instead of `range.min` (80 / 0).

508-04 writes NO new hint/slider render code for R1(a), and makes ONE forced mechanical edit in
its SOURCE file, because 508-01's removal of `containerPaddingX/Y` from
`MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS` (@2205-2208) inverts the prior "hidden" behavior:

- **Comment @593-598 (sole-writer file):** drop `containerPaddingX/Y` from the
  intentionally-hidden "Not applied" list (keep `navPillRadius/PaddingX/PaddingY`) — they now
  render "Default 6px", so leaving them listed is factually wrong.

The PAIRED test amendment — removing `containerPaddingX/Y` from the "TASK-507 FIX B" hint-hidden
loop @2069-2078 of `tests/vitest/ui/menu-design-editor.test.tsx`, and authoring the positive
"Default 6px"/"Default 180px" assertion — is **owned by 508-01**, which lands FIRST and whose
resolver change turns that assertion red (it amends it green in the same commit). 508-04 does NOT
touch that test region.

### Error handling / invariants

- **No editor-originated invalid state.** Every control writes either a validated enum token
  from the option arrays or `undefined` (clear). Bad values cannot originate in the editor;
  the 508-01 normalizers remain the fail-soft/reject-unknown authority on the write path.
- **Reject-unknown safety net (verify at land):** the three new keys must ALREADY be in their
  508-01 allowlists (`NAV_LEVEL_STYLE_KEYS` for `linkAlign`; `NAV_CHROME_KEYS` for
  `submenuDirection`/`submenuMode`) + enum partitions + (for chrome keys) `NAV_CHROME_DEFAULTS`
  before this subtask renders them. If 508-01 forgot one, the seg writes it but the next
  stored-doc READ **silently drops the whole record** (fail-closed READ trap) — 508-04's
  editor test that writes then re-resolves the value MUST catch this (asserts the written
  token survives a normalize round-trip via `section`), turning a silent model gap into a
  loud editor-test failure.
- **No setState-in-effect / render-loop regressions.** All writes go through the existing
  `updateDoc`/`setLevel`/`setChromeField` on user `onChange` only — no derived-state effects
  added. Verified against the 506/507 pattern (same helpers).
- **Canvas preview (level-0 blind-spot FIXED here):** the author SEES the effect because
  `submenuDirection`/`submenuMode` change the BASE `navChrome` on `section` → the canvas
  re-renders with 508-02's `buildMenuDocumentPreviewCss`, whose `previewForceOpenLevel` emits
  `visibility:visible` so the animated flyout is open-but-VISIBLE and the accordion push-down /
  direction anchor are visible while authoring. **But** these controls live on the Level-0 tab,
  where the existing `forceOpenLevel` derivation (@2639-2640) is `undefined` → nothing would be
  open, so the effects would be invisible exactly when the author is tuning them. 508-04 makes
  the ONE required canvas change in its own file (§2b): force-open the first dropdown for a
  level-0 nav selection. This subtask therefore does edit `forceOpenLevel` (canvas gating seam);
  it adds no *CSS/preview-builder* code — that stays 508-02's.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free — pure UI; `tests/vitest/ui/menu-design-editor.test.tsx`):**

- **R1(a) corrected container hints (508-01-OWNED test region)** — the positive assertion that an
  UNSET `minWidth`/`containerPaddingX`/`containerPaddingY` renders **"Default 180px"** / **"Default
  6px"** (NOT hidden/"Not applied"/"Not set") with the slider thumb at **180 / 6 / 6** (NOT
  `range.min` 80 / 0 / 0), AND the paired REMOVAL of `containerPaddingX`/`containerPaddingY` from
  the named "TASK-507 FIX B: gated present-only numerics render NO default hint when unset"
  hint-hidden loop (@2069-2078; the remaining gated numerics —
  `itemDividerWidth`/`indicatorThickness`/`transitionMs`/`hoverLift` — stay hidden and unchanged),
  are **authored by 508-01** in `tests/vitest/ui/menu-design-editor.test.tsx`. 508-01 lands FIRST
  and its `resolveNavKeyThemeDefault` change is what turns that region red, so it amends it green in
  the same commit (see 508-01 "Pre-existing test amendments"). 508-04 does NOT edit that test
  region — a duplicate write after 508-01 already removed those two keys would collide. 508-04's
  ONLY R1(a) edit is the `ControlDefaultHint` comment @593-598 in its SOURCE file (drop
  `containerPaddingX/Y` from the intentionally-hidden list; keep `navPillRadius/PaddingX/PaddingY`).
- **R1(b) `linkAlign`** — the "Link alignment" segmented control renders in the Dropdown
  container group for levels 1 AND 2; selecting **Center** writes `levelStyles[level].linkAlign
  === "center"` on Desktop (base) and a sparse `responsive.mobile` override on Mobile; selecting
  **Default** clears it to `undefined`; the written token survives a `resolveMenuNavLevelStyle`/
  normalize round-trip (READ-trap safety net). Assert it is ABSENT from the level-0 chrome panel.
- **R3a `submenuDirection` (base-only)** — the "Open direction" SegmentedControl renders in the
  level-0 nav-base panel with options `Right/Down/Up/Left` (incl. **Up**) plus the `Default`
  (`inherit`) segment; selecting **Down** writes `navChrome.submenuDirection === "down"` on the
  BASE record; the unset control shows the `Default` segment selected (base-only — NO
  `MenuResponsiveControlShell` badge/Reset, mirroring Dropdown direction); hidden on Mobile
  (`device !== "mobile"` guard). Round-trip survives normalize.
- **R3b `submenuMode` (base-only)** — the "Submenu mode" SegmentedControl renders in the level-0
  panel with options `Flyout/Accordion` plus `Default`; selecting **Accordion** writes
  `navChrome.submenuMode === "accordion"` on the BASE record; Default clears it to `undefined`;
  hidden on Mobile; no badge/Reset shell. Round-trip.
- **Base-only, NO dead tablet data (fork-correctness guard)** — with the active device set to
  **Tablet**, editing `submenuDirection`/`submenuMode` mutates the BASE `navChrome` (asserts the
  write lands on `props.navChrome`, NOT a `responsive.tablet` override) and renders NO badge/Reset
  shell — proving these structural keys are not device-forked (no tablet-delta emitter exists for
  them, so a tablet override would be dead data). Mobile never renders them.
- **Per-device fork (`linkAlign` only)** — on Tablet, `linkAlign` writes a tablet override (badge
  + Reset visible via `MenuResponsiveControlShell`), Mobile never inherits Tablet.
- **R2 level-0 canvas force-open** — with a nav-items block selected on the **Level-0 tab**
  (`navLevel === 0`), assert the derived `forceOpenLevel` resolves to **1** (not `undefined`), so
  508-02's preview force-opens the first dropdown while the author tunes the nav-global
  direction/mode; levels 1/2 still resolve to their own depth; a non-nav selection yields
  `undefined`. (Perceptible open-dropdown reaction to Down/Accordion is asserted by 508-05 SMOKE.)
- **Existing force-open test update (§2b regression + 508-02 visibility fold-in — split by
  byte-introducer)** — the named test "canvas force-open threads the selected level" (@1755-1784)
  TODAY (pre-508-02) has FIVE `expect` calls: FOUR match the pre-Req2 depth-1/2 substring
  `…{display:grid;opacity:1;transform:none}` (@1762 `not.toContain` depth-1 at level 0; @1768
  `toContain` depth-1 at level 1; @1777 `toContain` depth-1 at level 2; @1780 `toContain` depth-2
  at level 2), and the FIFTH — @1771 `not.toContain` — pins the SHORT depth-2 form
  `.site-nav-sublist .site-nav-sublist{display:grid;opacity:1;transform:none}` (the "depth-2 absent
  at level 1" guard). A SIXTH pre-Req2 reference lives in a SEPARATE named test "canvas force-open
  threads the selected level so the styled sublist is revealed" (@2187-2201): the depth-2 `toContain`
  @2197 (`.site-nav-sublist .site-nav-sublist{display:grid;opacity:1;transform:none}` at Nesting
  level 2), which 508-02's fold turns RED identically to @1780 — so it rides the SAME 508-02
  re-string carve-out (below), NOT 508-04. TWO independent byte changes break/degrade these, and each is OWNED by the
  subtask that INTRODUCES its bytes (the each-subtask-green invariant forbids fixing a break one
  subtask later than the subtask that lands it):
  1. **508-02 (lands FIRST)** folds `visibility:visible` into the SAME `previewForceOpenLevel`
     declaration block, so the emitted bytes become
     `.site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}`
     (menuDocumentCss.ts @1256) and, anchored (0,5,0) for depth-2,
     `.site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}`
     (@1263). This turns the Level-1 @1768 and Level-2 @1777/@1780 `toContain`s RED — AND the
     depth-2 @2197 `toContain` in the separate "…styled sublist is revealed" test (@2187-2201),
     whose short unanchored form the fold makes unemittable identically to @1780. Because land
     order is 01→02→03→04 and **508-03 gates BETWEEN 508-02 and 508-04**, 508-02 MUST re-string
     those FOUR `toContain`s (@1768, @1777, @1780, @2197) to the visibility-inclusive form in the SAME atomic unit as its
     `previewForceOpenLevel` change (extending the paired-golden carve-out it already applies in
     `tests/vitest/site/menu-document-css.test.ts` to cover these `menu-design-editor.test.tsx`
     assertions) so BOTH editor tests are GREEN under 508-03's gate. Leaving them for 508-04 would sit
     those editor tests RED across 508-03 — violating each-subtask-green (the same reason R1(a)'s
     @2069-2078 amendment is 508-01-owned). (Board may instead land 508-02+508-04 atomically; either
     way pin this re-string to ONE subtask.)
  2. **§2b (508-04, THIS subtask)** emits the depth-1 open rule at level 0 and consumes 508-02's
     visibility fold, so 508-04 owns exactly TWO editor-test `expect` edits: (a) INVERT @1762-1764
     from `not.toContain` to `toContain` the visibility-inclusive depth-1 rule at level 0; (b)
     re-string @1771-1773 from the now-unemittable short pre-Req2 substring (a silent tautology
     after 508-02's fold — it would pass even if depth-2 wrongly opened at level 1) to the
     visibility-inclusive ANCHORED depth-2 form 508-02 emits @1263
     (`.site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}`)
     so the "depth-2 absent at level 1" `not.toContain` stays a meaningful guard. 508-04 also
     rewrites the `forceOpenLevel` comment @2634-2637. Document explicitly that the level-0 canvas
     preview is intentionally NO LONGER byte-identical to the unforced preview.
  (If 508-02's exact declaration order is not locked at land, both subtasks assert selector-presence
  + a separate insertion-order-agnostic `visibility:visible` check instead of the fixed substring.)
- **No render regressions** — no setState-in-effect warnings; a render+interact pass throws no
  act() / update-depth warnings (mirror the 506/507 editor tests).

**Bun lane (route/runtime — asserted by 508-05, listed here for traceability):**
`tests/integration/routes/menus.test.ts` (a `document` PATCH carrying editor-written
`linkAlign`/`submenuDirection`/`submenuMode` persists per-key without dropping siblings) is
authored in 508-05; 508-04 provides no route change.

**SMOKE:** the ≥5-scenario real-flow SMOKE (owner mandate — PERCEPTIBLE flyout motion, the
accordion cohesive block, direction up/down/left/right, centered dropdown text, correct
container default hints) is authored and run in **508-05**, driving the exact controls this
subtask adds (the "Link alignment" seg, the "Open direction"/"Submenu mode" segs, and the
corrected unset container hints) against the running admin + front — and MUST include the R2
check that the **Level-0 canvas actually shows the open dropdown reacting** to Open direction
(Down/Up/Left/Right) and Submenu mode (Flyout↔Accordion) while the author is on the Level-0 tab
(the §2b `forceOpenLevel` fix). 508-04 does not author the smoke; it MUST leave the controls in
the DOM shapes 508-05's selectors target (labels: "Link alignment", "Open direction", "Submenu
mode", "Min width", "Container padding X/Y") and the level-0 force-open behavior in place.

**Named guards touching this subtask:** editor writes only validated enum tokens or `undefined`
(no unknown key can originate here); the written-token normalize round-trip (READ-trap safety
net) per new key; the R1(a) hint/thumb assert 180/6 (never `range.min`); `submenuDirection`/
`submenuMode` absent on Mobile AND base-only (a Tablet edit lands on `props.navChrome`, never a
`responsive.tablet` override / no dead tablet data, no badge/Reset); `linkAlign` absent from
level-0; level-0 nav selection resolves `forceOpenLevel === 1` (R2 canvas visibility). NO
`schemaVersion` bump; no route/RBAC/endpoint/migration; 504/505/506/507 controls intact (this
subtask only ADDS controls).

---

## Changelog

Closure entry pinned to the next free number **1217** (verified fresh this run: latest present
is `1216-2026-07-03-task-507-menu-indicator-scope-and-hint-alignment.md`; re-verify at closure).
The changelog is authored by **508-05**, not this subtask.

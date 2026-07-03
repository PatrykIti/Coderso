# TASK-506-04: Design Editor — Reset, Defaults & Modern Controls

# FileName: TASK-506-04-Design-Editor-Reset-Defaults-And-Modern-Controls.md

**Parent Task:** TASK-506
**Priority:** High
**Category:** Admin UI / Menus / Site Shell / Responsive
**Estimated Effort:** Large
**Dependencies:** TASK-506-01 (model keystone — HARD dependency: its exported helper
API must land green first: the F1 base-clear wrappers `clearMenuSectionBase` /
`clearMenuNavLevelStyleBase` / `clearMenuNavChromeBase` / `clearMenuBrandStyleBase`, the
F2 provider `resolveMenuControlDefault(section, device, level, key) → { value, sourceLabel }`,
the raw base readers `readMenuSectionBaseValue` / `readMenuNavLevelStyleBaseValue` /
`readMenuNavChromeBaseValue` + the raw override reader `readMenuNavChromeOverrideValue`,
the RESOLVED per-device navChrome READER `resolveMenuNavChrome(section, device)`
(TASK-506-01 @347 — parallel to the already-imported `resolveMenuNavLevelStyle` `@1298`;
the base⊕device merge that populates the level-0 seg/toggle/slider CURRENT value, NOT the
raw base — without it the level-0 controls have no per-device display source),
the level-0 navChrome per-device WRITER `patchMenuNavChromeForDevice` (parallel to the
already-imported `patchMenuNavLevelStyleForDevice`; it — NOT the editor — owns the
desktop-base vs tablet/mobile-responsive branch split that `setChromeField` delegates to),
the widened `NavLevelStyle` fields + the level-0 `navChrome` sub-record (506-01 pins
**Option B** — a `NavItemsProps.navChrome` sub-record, NOT a level-0 entry in `levelStyles`;
if 506-01 flips to Option A the entire level-0 navChrome wiring below is VOID) + its
exported clamp-range tables `NAV_LEVEL_NUMBER_RANGES` / `NAV_CHROME_NUMBER_RANGES` and enum
option arrays the segmented controls bind to), TASK-506-02 (CSS — its `buildMenuDocumentPreviewCss`
canvas-flatten emission + the `previewForceOpenLevel` B3-hidden-state neutralization
must merge before this subtask's in-canvas preview verification), TASK-503/504 editor
scaffolding (`MenuResponsiveControlShell`, `NavLevelControls`, `NavLevelInheritBadge`,
`SegmentedControl`/`SliderControl`/`ColorSwatchControl` primitives, the level-segmented
`Nesting level` selector + `forceOpenLevel` canvas wiring). Rides the existing validated
`PATCH /menus/:id` write path.
**Status:** ✅ Done
**Completed:** 2026-07-03 (changelog 1215)

---

## Overview

**Sole writer of `core/admin/ui/menus/MenuDesignEditor.tsx`.** This subtask is the
EDITOR surface for TASK-506: it makes the two owner-reported UX gaps visible/actionable
and adds the per-level (+ level-0) controls for all five modern bundles. NO model or CSS
edits here — 506-01 owns `menuDocumentV2.ts`, 506-02 owns `menuDocumentCss.ts`. This file
only *consumes* their exported helper/provider/range/enum API and renders controls +
Reset affordances + default hints, and threads the selected level into the canvas
force-open (which 506-02's `previewForceOpenLevel` renders so authors SEE the styled
depth). All new client state is derived; no new endpoint, RBAC, or persisted shape is
introduced here (the doc shape is entirely 506-01's).

Verified against source (`MenuDesignEditor.tsx`, 2346 lines, reads as BINARY to `rg` —
all anchors confirmed via Read / `grep -an`):

- `MenuResponsiveControlShell` `@450-499`: renders the Reset button ONLY when
  `state === "override"` (`@476`); `state` is `"base"` whenever `!isMenuOverrideDevice(device)`
  (`@466-470`), i.e. desktop is ALWAYS `"base"` ⇒ **no reset affordance on the desktop
  base today** (the F1 editor gap). Tooltip copy is the hardcoded device-only
  "Remove the {device} override and inherit the desktop value." (`@493`).
- The one and only resolved-default hint in the whole editor is nav-base `fontSize`'s
  "Inherited from theme ({16}px)" span (`@1644-1651`, `data-menu-font-size-inherited="true"`,
  const `NAV_FONT_SIZE_INHERITED = 16` `@304`). Every other slider shows the misleading
  `range.min` at the unset position: per-level `value ?? NAV_LEVEL_NUMBER_RANGES[key].min`
  (`@1343`); enum/color controls show nothing (F2 gap).
- `NavLevelControls` `@1285-1410` binds `levelStyles[level]` (levels 1/2 only):
  `resolveMenuNavLevelStyle` `@1298`, raw override read `levelOverride` `@1299-1302`,
  `setLevel` `@1303-1311` (`patchMenuNavLevelStyleForDevice`), `resetLevel` `@1312-1318`
  (**responsive-only** — guards `isMenuOverrideDevice(device)` `@1315`, calls
  `clearMenuNavLevelStyleOverride`). Control primitives: `levelControl` `@1319-1331`,
  `swatch` `@1332-1339`, `slider` `@1340-1350`. Existing 16-control list `@1353-1407`.
- Nav-base (level 0) block `@1580-1840`: `navProps` `@1447-1449`, `navOverride`
  `@1456-1459`, `resetNav` `@1460-1466` (**responsive-only** `@1463`), `setNavField`
  `@1476-1486`, `setNavBaseField` (device-defining, always desktop) `@1496-1503`. The
  `Nesting level` SegmentedControl `@1582-1588` (`["0","1","2"]`); `navLevel===0` renders
  the nav-base controls (`@1589-1840`), else `<NavLevelControls level={navLevel} …/>`.
- Level state + canvas: `const [navLevel] = useState<0|1|2>(0)` `@2045`, `navLevelActive`
  `@2101`, `forceOpenLevel` `@2102-2103`, passed to canvas `@2294`; `renderPreviewNavItem`
  (preview mirror) `@513-539` — mirrors the front markup EXACTLY, needs **no change** (all
  506 effects are pure CSS on existing classes).

---

## Security Contract

**UI/client-state + schema-first document-contract extension; no new
route/RBAC/endpoint/migration.** This subtask edits ONLY the admin editor component. It
introduces no new persisted shape (all shapes are 506-01's), no new fetch/mutation
endpoint (writes ride the existing `updateDoc` → `PATCH /menus/:id` `document` envelope,
service-side strict-validated by 506-01's normalizer), and no RBAC/route/migration. All
new UI state is derived from the already-loaded document. Reset affordances call 506-01's
exported base-clear / existing responsive-clear helpers, which normalize to the
byte-identical legacy shape server-side on the next write. Raw stored input never reaches
CSS unvalidated — the editor reads only resolved/normalized values via 506-01's provider.

---

## Implementation Pseudocode (execution-ready — implementer executes WITHOUT rediscovering strategy)

> **Single-writer / land order.** 506-04 opens ONLY after 506-01 (model API) and 506-02
> (CSS + canvas `buildMenuDocumentPreviewCss` / `previewForceOpenLevel`) have landed
> green. This subtask imports their exported symbols and NEVER edits those files. If an
> import is missing, STOP — it is a 506-01/02 gap, not a 506-04 workaround. Do all editor
> work in one pass so the F1 shell change, the F2 hint, and the B1–B5 controls ship
> together (they share the shell + provider plumbing).

### Part F1 — Base-record Reset-to-default affordance

**F1.a — Extend `MenuResponsiveControlShell` (`@450-499`) to render Reset on BASE-with-value.**

```tsx
function MenuResponsiveControlShell({
  device,
  override,        // (existing) raw BASE-record override flag, device-path only
  hasBaseValue,    // NEW: control's OWN base record carries an explicit value (desktop path)
  label,
  onReset,         // (existing) responsive clear — used on tablet/mobile override
  onResetBase,     // NEW: base clear — used on desktop base
  children,
}: {
  device: PageBreakpoint;
  override: boolean;
  hasBaseValue?: boolean;          // optional: controls not yet wired stay unaffected
  label: string;
  onReset: () => void;
  onResetBase?: () => void;
  children: ReactNode;
}) {
  const tone = useEditorControlTone();
  const state: MenuResponsiveBadgeState = !isMenuOverrideDevice(device)
    ? "base"
    : override ? "override" : "inherited";

  // NEW: show Reset for a device override (as today) OR a base value on desktop.
  const showDeviceReset = state === "override";
  const showBaseReset   = state === "base" && hasBaseValue === true && onResetBase != null;
  const showReset       = showDeviceReset || showBaseReset;

  return (
    <div className="grid min-w-0 gap-1" data-menu-responsive-field={state}>
      {children}
      <div className="flex min-h-6 items-center justify-between gap-2">
        <MenuResponsiveStateBadge state={state} device={device} />
        {showReset ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={
                  showBaseReset ? `Reset ${label} to default` : `Reset ${label} to inherited`
                }
                // Keep the existing device hook value stable for 504/501 tests;
                // add a distinct base hook so 506 tests target the base branch.
                data-menu-responsive-reset={label}
                data-menu-responsive-reset-kind={showBaseReset ? "base" : "override"}
                className={/* existing ghost/focus classes */}
                onClick={showBaseReset ? onResetBase : onReset}
              >
                <RotateCcw className="h-3 w-3" />
                {showBaseReset ? "Reset to default" : "Reset"}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6} className="max-w-[240px]">
              {showBaseReset
                ? `Clear the authored ${label.toLowerCase()} and fall back to the theme / inherited default.`
                : `Remove the ${DEVICE_LABELS[device].toLowerCase()} override and inherit the desktop value.`}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
```

- **Byte/behaviour identity guard:** `hasBaseValue`/`onResetBase` are OPTIONAL. Any call
  site NOT passing them behaves EXACTLY as today (device-only reset). This keeps existing
  501/504 shell tests green with ZERO edits **only for UN-MIGRATED callers** (those that do
  not pass the new pair). The moment F1.b opts a control in, a Desktop base value makes that
  control's shell render the base Reset — so any existing test that asserts "no Desktop reset"
  for a NOW-migrated control (e.g. the layout `Horizontal padding` base-scope assertions at
  `menu-design-editor.test.tsx:852`/`:883`) MUST be updated in THIS subtask's own test work
  (see Testing Requirements) to expect the base branch; that is an EXPECTED, in-scope change,
  not a regression. Do NOT rename/remove `data-menu-responsive-reset={label}` — only ADD the
  `-kind` sub-hook.

**F1.b — Base-value predicates + `onResetBase` wiring at every caller group.**

Add a base-value predicate next to each existing raw override reader, and pass both
`hasBaseValue` and `onResetBase` into the shell. `onResetBase` calls 506-01's base-clear
on desktop; on tablet/mobile the shell never shows the base branch (state≠"base"), so the
existing `onReset` (responsive clear) is untouched.

```tsx
// ---- Per-level (levels 1/2) — NavLevelControls @1299-1330 ----
// NEW raw base reader from 506-01 (parallel to readMenuNavLevelStyleOverrideValue):
const levelBaseValue = (key: keyof NavLevelStyle) =>
  section !== undefined &&
  readMenuNavLevelStyleBaseValue(section, level, key) !== undefined;   // hasOwn on props.levelStyles[level]

const resetLevelBase = (key: keyof NavLevelStyle) => () =>
  updateDoc((current) => {
    const target = current.sections[0];
    return target ? clearMenuNavLevelStyleBase(current, target.id, level, key) : current;
  });

const levelControl = (key, label, node) => (
  <MenuResponsiveControlShell
    device={device}
    override={levelOverride(key)}
    hasBaseValue={levelBaseValue(key)}       // NEW
    label={label}
    onReset={resetLevel(key)}
    onResetBase={resetLevelBase(key)}        // NEW
  >…</MenuResponsiveControlShell>
);

// ---- Level-0 nav base — MenuBlockPanel nav-items branch @1456-1503 ----
// Base clear for a FLAT scalar routes through the existing desktop-branch delete
// (setNavField already delete-on-undefined on desktop). Wrap it as a base clear:
const navBaseValue = (key: keyof MenuAppearance) =>
  section !== undefined && readMenuSectionBaseValue(section, "navProps", key) !== undefined;
const resetNavBase = (key: keyof MenuAppearance) => () =>
  updateDoc((current) => {
    const target = current.sections[0];
    return target ? clearMenuSectionBase(current, target.id, "navProps", key) : current;
  });
// EXCLUDE MENU_NAV_DEVICE_DEFINING_KEYS (dropdownDirection @1808-1825, mobileMode
// @1826-1839): they carry resolution defaults + are unwrapped (no shell) — leave as-is.

// ---- Level-0 navChrome (B1/B2/B3/B4 level-0 fields, Option B sub-record) ----
// RESOLVED per-device navChrome — the DISPLAY source the level-0 seg/toggle/slider bind
// their current value to (mirrors `levelStyle` @1298 for levels 1/2). It MUST be the
// per-device merge (base⊕device), NEVER the raw base record: on tablet/mobile an unset
// navChrome field inherits the desktop base, so binding the controls to the raw base would
// make them show blank/wrong values instead of the inherited-desktop value. Do NOT bind to
// `navProps.navChrome` (`resolveMenuSectionAppearanceForDevice(section, device).navProps`
// @1448) either — use the dedicated level-scoped resolver so the merge is explicit:
const chromeStyle: NavChromeStyle =
  section ? resolveMenuNavChrome(section, device) : {};
// Its own raw base reader + base clear from 506-01 (parallel to the nav-level family):
const chromeBaseValue = (key: keyof NavChromeStyle) =>
  section !== undefined && readMenuNavChromeBaseValue(section, key) !== undefined;
const resetChromeBase = (key: keyof NavChromeStyle) => () =>
  updateDoc((current) => {
    const target = current.sections[0];
    return target ? clearMenuNavChromeBase(current, target.id, key) : current;
  });
const chromeOverride = (key: keyof NavChromeStyle) =>
  section !== undefined && isMenuOverrideDevice(device) &&
  readMenuNavChromeOverrideValue(section, device, key) !== undefined;
// Level-0 navChrome per-device WRITER (the SOLE writer of navChrome — mirrors setLevel
// @1303-1311 / setNavField @1476-1486). It ONLY threads `device`; the desktop-base vs
// tablet/mobile-responsive branch split + prune chain lives in 506-01's backing model
// patch fn `patchMenuNavChromeForDevice` (TASK-506-01 @341) — the B1/B2/B3/B4 level-0
// pill controls bind their onChange to this:
const setChromeField = <K extends keyof NavChromeStyle>(
  key: K,
  value: NavChromeStyle[K] | undefined
) =>
  updateDoc((current) => {
    const target = current.sections[0];
    return target
      ? patchMenuNavChromeForDevice(current, target.id, device, {
          [key]: value,
        } as Partial<NavChromeStyle>)
      : current;
  });

// ---- Brand — BrandStyleControls @1152-1176 (F1 generalization; brand not in B-scope) ----
const brandBaseValue = (key: keyof BrandStyle) =>
  block.props.style?.[key] !== undefined;                              // hasOwn on block.props.style
const resetBrandBase = (key: keyof BrandStyle) => () =>
  updateDoc((current) => clearMenuBrandStyleBase(current, block.id, key));
```

Wire the same `hasBaseValue` + `onResetBase` pair into `brandStyleControl` (`@1167-1176`)
and every nav-base shell in `@1589-1840`. **Layout controls** (`@815-928`) similarly get
`layoutBaseValue` + `clearMenuSectionBase(current, id, "layout", key)` for completeness
(F1 is "every control"), EXCLUDING keys that carry resolution defaults if any (mirror the
device-defining exclusion — confirm against 506-01's exclusion list).

> **Type-gate note (layout keys DO type-check — no 506-01 key-type widening needed).** The
> editor's layout keys are `keyof MenuBarLayout` (`layoutOverride` `@796`; `surfaceColor` /
> `borderColor` / `alignment` / `paddingX` / `paddingY` / `borderWidth` / `shadow` / `sticky`
> `@817-919`). In the model, `MenuBarLayout = Pick<MenuAppearance, …>` (`menuDocumentV2.ts`
> `@138`) and `MENU_BAR_LAYOUT_KEYS` is declared `as const satisfies readonly (keyof
> MenuAppearance)[]` (`@107-116`) ⇒ `keyof MenuBarLayout ⊆ keyof MenuAppearance`. So a
> `clearMenuSectionBase(id, "layout", <layoutKey>)` / `readMenuSectionBaseValue(section,
> "layout", <layoutKey>)` call is ASSIGNABLE to 506-01's `key: keyof MenuAppearance` param
> (TASK-506-01 `@380` (`clearMenuSectionBase`) / `@406` (`readMenuSectionBaseValue`)) and
> passes BOTH `bun --cwd core lint:types` AND root
> `tsc -p tsconfig.json --noEmit`. No group-discriminated union / `keyof MenuAppearance |
> keyof MenuBarLayout` widening is required for this subtask's layout wiring.

> **F1 exact base-clear semantics (from 506-01, do not re-derive):** each `clearMenu*Base`
> is a thin wrapper over the existing `patch*ForDevice(..., "desktop", ..., {[key]:undefined})`
> desktop branch, which deletes the key + prunes empty objects to the exact no-override
> byte-identical legacy shape. The editor just calls the wrapper; 506-05 owns the
> byte-identity round-trip test.

### Part F2 — Visible resolved-default hint under EVERY control

**F2.a — One reusable hint component (generalize the `@1644-1651` span).**

```tsx
// Renders ONLY when the control's own record is unset; otherwise null.
function ControlDefaultHint({
  section, device, level, propKey, isSet,
}: {
  section: MenuSectionV2 | undefined;
  device: PageBreakpoint;
  level: 0 | 1 | 2 | "base";        // "base" = brand/layout scalar; 0 = nav-base/chrome
  propKey: string;
  isSet: boolean;                    // control's OWN record carries an explicit value
}) {
  if (isSet || !section) return null;
  const { value, sourceLabel } = resolveMenuControlDefault(section, device, level, propKey);
  if (value === undefined) return null;   // present-only: nothing resolvable ⇒ no hint
  return (
    <span
      data-menu-control-default-hint={propKey}     // stable test hook (per control)
      data-menu-control-default-source={sourceLabel}
      className="text-[10px] font-medium text-muted-foreground"
    >
      {sourceLabel}                                  // e.g. "Default 8px" / "Inherits level 0 (14px)"
    </span>                                          //      "Inherited from theme (16px)" / "Inherited from desktop"
  );
}
```

- `resolveMenuControlDefault` (506-01) is the SOLE source of the value + label — the editor
  NEVER hardcodes a default. Source-label rules (owned by 506-01, restated for the wiring):
  level N (1/2) unset ⇒ `Inherits level N−1 (<v>px)` (walk one level: level 2 ⇒ `Inherits level 1`,
  level 1 ⇒ `Inherits level 0`); level 0 unset ⇒ theme/base-sheet default
  (`Default <v>px` / `Inherited from theme (16px)`); tablet/mobile unset ⇒ `Inherited from desktop`.
- **Replace the misleading `?? .min` display** at the slider level so the THUMB reflects
  the resolved default, not `range.min`:

```tsx
// per-level slider @1340-1350 — value now shows the resolved default at unset
const slider = (key, label) => {
  // NOTE: `levelStyle` is the RESOLVED style (`resolveMenuNavLevelStyle` base⊕device merge,
  // src @1298) — NOT the raw own record. Using it as the thumb-display fallback is fine (it
  // already folds in the inherited value). It must NEVER be used as `isSet` (see F2.b): on an
  // override device an unset field still resolves to a defined value, so `isSet` derived from
  // it would be permanently true and the "Inherited from desktop" hint would never appear.
  const resolved = levelStyle[key] as number | undefined;            // RESOLVED (thumb fallback only)
  const fallback = resolveMenuControlDefault(section, device, level, key).value as number | undefined;
  return (
    <SliderControl
      label={label}
      value={resolved ?? fallback ?? NAV_LEVEL_NUMBER_RANGES[key].min} // .min only if truly unresolvable
      min={NAV_LEVEL_NUMBER_RANGES[key].min}
      max={NAV_LEVEL_NUMBER_RANGES[key].max}
      step={1} unit="px"
      onChange={(next) => setLevel(key, next as never)}               // onChange STILL writes explicit value
    />
  );
};
```

- **DISPLAY-ONLY invariant (mirror the `@1632-1636` note):** the fallback affects only the
  slider thumb + the hint; `onChange` still writes an explicit value; an unset control emits
  ZERO bytes (present-only). This is exactly how the existing fontSize hint behaves.

**F2.b — Mount `<ControlDefaultHint>` under every control group.** For per-level controls,
render it inside `levelControl` (`@1326-1329`) next to `NavLevelInheritBadge` (which stays —
it shows the LEVEL axis; the hint shows the effective NUMBER/enum/color). For nav-base and
navChrome shells pass `level={0}`; for brand and layout shells pass `level="base"` — the two
provider domains 506-01 fixes at TASK-506-01 `@434-446` (`0` = level-0 nav scalar/navChrome;
`"base"` = brand/layout scalar, NEVER a level-0 nav key). Render it after the primitive.
**`isSet` = the device-appropriate RAW own read — NEVER the resolved value.** The resolved
value (`resolveMenuNavLevelStyle` / `levelStyle`, and the `NavLevelInheritBadge` precedent at
src `@1328` which reads `levelStyle[key]`) is ALWAYS defined on an override device for an unset
field (it inherits the desktop base), so deriving `isSet` from it would suppress the mandated
"Inherited from desktop" hint on tablet/mobile. Compute `isSet` from the SAME raw
base/override reader pair each caller already defines (do NOT read the resolved style):
`isSet = isMenuOverrideDevice(device) ? <override>(key) : <baseValue>(key)`, i.e.
desktop ⇒ `readMenu*BaseValue(...) !== undefined`, tablet/mobile ⇒
`readMenu*OverrideValue(...) !== undefined` — reuse the already-defined
`levelBaseValue`/`levelOverride`, `chromeBaseValue`/`chromeOverride`, `navBaseValue`/`navOverride`
pairs (and `brandBaseValue` for brand). **Do NOT collapse this to F1's
`hasBaseValue || override`.** The base readers (`levelBaseValue`/`chromeBaseValue`/`navBaseValue`)
read the DESKTOP base record with NO device guard (src: `navOverride` `@1456` guards
`isMenuOverrideDevice(device)`, the base readers do not), so on an override device a field whose
desktop base carries a value but whose own device record is unset would make `hasBaseValue || override`
true — `ControlDefaultHint` would return null and the mandated "Inherited from desktop" hint would
never appear. F1's `hasBaseValue || override` is equivalent ONLY on desktop, because its
`showBaseReset` is gated on `state === "base"` (`@128`, desktop-only). On tablet/mobile `isSet` MUST
be the override reader ALONE (never OR-ed with the un-guarded base reader).
**Section-only provider (no `block` param needed):** `resolveMenuControlDefault(section, …)`
takes only a `section` and serves EVERY domain 506-04 passes — nav `0/1/2` and layout `"base"`
from `section.layout` + `SHELL_APPEARANCE_DEFAULTS`, and brand `"base"` from its theme default
in `MENU_APPEARANCE_DEFAULTS` (KEY-based; the brand block instance is NOT required because
`isSet` is computed at the brand call site from `block.props.style` and passed IN, so
`ControlDefaultHint` stays `block`-free). Brand on tablet/mobile has no section-side desktop
record, so its "Inherited from desktop" case returns `value === undefined` ⇒ present-only, no
hint (never a crash — mirrors the `@260` guard). Retire the
bespoke `@1644-1651` fontSize span in favour of `<ControlDefaultHint level={0}
propKey="fontSize" …/>` (keep a `data-menu-font-size-inherited` alias only if a 504 test
asserts it — otherwise the generic `data-menu-control-default-hint="fontSize"` hook replaces it).

### Part B1–B5 — New controls (per selected Level + per device)

All controls reuse the existing primitives and the shell (so they inherit F1 Reset + F2
hint automatically). **Levels 1/2** append to `NavLevelControls` (`@1351-1408`) bound to
`NavLevelStyle`. **Level 0** appends to the nav-base block (`@1589-1840`) bound to the
`navChrome` sub-record via `setChromeField` / `chromeOverride` / `resetChromeBase`, reading
its CURRENT display value from the RESOLVED `chromeStyle` (Option B). Add small local
helpers mirroring `swatch`/`slider`:

```tsx
// generic segmented (enum) + toggle (bool) helpers for a NavLevelStyle / NavChromeStyle key.
// The `style` (current-value read), `setKey` (writer), and slider clamp-range table are
// bound PER LEVEL, never hardcoded:
//   • levels 1/2 (NavLevelControls): style = `levelStyle` (resolveMenuNavLevelStyle @1298),
//     setKey = `setLevel`, ranges = NAV_LEVEL_NUMBER_RANGES.
//   • level 0   (nav-base navChrome): style = `chromeStyle` (resolveMenuNavChrome, defined
//     above — the per-device merge, NOT the raw base), setKey = `setChromeField`,
//     ranges = NAV_CHROME_NUMBER_RANGES.
// Binding level-0 `style` to the raw base (chromeBaseValue's underlying record) instead of
// `chromeStyle` would break tablet/mobile display — the controls must show inherited-desktop.
const seg = (key, label, options: readonly string[], labels, unsetSentinel = "inherit") => (
  <SegmentedControl
    label={label}
    value={(style[key] as string | undefined) ?? unsetSentinel}
    options={[unsetSentinel, ...options]}          // first option = clear/inherit
    optionLabels={{ [unsetSentinel]: "Default", ...labels }}
    onChange={(next) => setKey(key, next === unsetSentinel ? undefined : (next as never))}
  />
);
const toggle = (key, label) => (
  <SegmentedControl
    label={label}
    value={style[key] === true ? "on" : style[key] === false ? "off" : "inherit"}
    options={["inherit", "off", "on"]}
    optionLabels={{ inherit: "Default", off: "Off", on: "On" }}
    onChange={(next) =>
      setKey(key, next === "inherit" ? undefined : (next === "on" as never))}
  />
);
// clamp bounds ALWAYS from the exported range tables (NAV_LEVEL_NUMBER_RANGES /
// NAV_CHROME_NUMBER_RANGES) — never hardcode. seg/toggle/slider all wrap in
// levelControl (⇒ shell + F1 Reset + F2 hint) exactly like existing controls.
```

**Control map (order appended after existing controls; wrap each in `levelControl` / the
nav-base shell so it gets Reset + hint):**

```
B1 Item separators  (levels 0/1/2)
  itemDividerShow   → toggle("itemDividerShow","Item divider")
  itemDividerColor  → swatch("itemDividerColor","Divider color")
  itemDividerWidth  → slider  1..8  "Divider width"
  itemDividerStyle  → seg  ["solid","dashed","dotted"]  "Divider style"

B2 Underline indicator + hover  (levels 0/1/2)
  indicator          → seg  ["none","underline","overline"]  "Indicator"
  indicatorColor     → swatch  "Indicator color"
  indicatorThickness → slider  1..6  "Indicator thickness"
  indicatorGrow      → toggle  "Grow on hover"
  hoverUnderline     → toggle  "Underline on hover"
  transitionMs       → slider  0..400  (unit "ms")  "Transition"
  hoverLift          → slider  0..8  "Hover lift"

B3 Caret + flyout  (caret: levels 0/1/2 — parents; flyout: levels 1/2 ONLY)
  showCaret          → toggle  "Show caret"
  caretRotateOnOpen  → toggle  "Rotate caret on open"
  flyoutAnimation    → seg  ["none","fade","slide"]  "Flyout animation"  (LEVELS 1/2 ONLY — NOT level 0)

B4 Pill (LEVEL 0 ONLY, navChrome) + dropdown padding (levels 1/2, NavLevelStyle)
  level 0:  navPillBackground → swatch ; navPillRadius → slider 0..40 ;
            navPillPaddingX → slider 0..40 ; navPillPaddingY → slider 0..32
  levels>=1: containerPaddingX → slider 0..40 ; containerPaddingY → slider 0..32
            (place under the existing "Dropdown container" heading @1385)

B5 Nested submenu placement (LEVEL 2 ONLY — the nested flyout sublist)
  submenuPlacement   → seg  ["right","bottom","left"]  "Submenu placement"
            (label options: Right / Below / Left)
```

- **Level gating:** B4 pill fields render ONLY when `navLevel === 0` (nav-base block). B4
  `containerPadding*` renders for levels ≥ 1 (`NavLevelControls`). B5 `submenuPlacement`
  renders ONLY for `navLevel === 2` — it is a LEVEL-2 container property (02 reads it off
  `baseLevelStyles?.[2]` and emits solely on `LEVEL_CONTAINER_SELECTORS[2]`; a level-1
  submenuPlacement is a deliberate NO-OP, so exposing it there would be a dead control).
  Do NOT show B4/B5 at level 0 (no nested container there). B3 caret controls
  (`showCaret`/`caretRotateOnOpen`) are meaningful on group parents at every level (0/1/2 —
  CSS present-only makes them inert on leaves). B3 **`flyoutAnimation`** renders ONLY for
  `navLevel >= 1` (levels 1/2), NEVER on the level-0 / navChrome pill surface — it is a
  levels-≥1 CONTAINER field animating the level-N sublist that `forceOpenLevel=N` force-opens;
  `forceOpenLevel=0 ⇒ undefined`, so a level-0 flyout control would sit where the reveal is
  never force-opened/neutralized (a dead control defeating Hard Invariant 6 — authors must SEE
  the animation while styling). See 506-02's reconcile note @425-440.
- **`transitionMs` unit:** pass `unit="ms"` to `SliderControl` (not "px") for B2 transition.
- **Enum sentinel:** the first segmented option is the unset/"Default" sentinel that writes
  `undefined` (clears the field → present-only zero bytes → F2 hint appears). This keeps the
  three-state (Default / value-A / value-B …) parity with the existing `fontWeight`/`shadow`
  segmented controls (`@1366-1381`, `@1396-1406`).

### Part — Canvas force-open (B3 animation) + preview mirror

- `renderPreviewNavItem` (`@513-539`) needs **NO change** — every B1–B5 effect is pure CSS
  on the existing `.site-nav-item` / `[data-site-nav-group]` / `.site-nav-link` /
  `.site-nav-group-label` / nested `.site-nav-sublist` classes it already emits.
- The selected level already threads to the canvas force-open (`navLevelActive` `@2101`,
  `forceOpenLevel` `@2102-2103`, `@2294`) so authors SEE separators/indicator/placement.
  **B3 flyoutAnimation:** 506-02's `previewForceOpenLevel` MUST additionally neutralize the
  animated rest state (`display:grid;opacity:1;transform:none`, NO `visibility`) so the fade/slide
  flyout is visible on the force-open canvas — that is a 506-02 CSS change; 506-04 only
  passes the level. If the animated flyout renders invisible on canvas after 506-02 lands,
  STOP and file it against 506-02 (do NOT add a JS workaround in the editor).

### Error handling / edge cases

- `section === undefined` (no nav-items block yet): every predicate short-circuits to
  `false` (mirrors existing `section !== undefined &&` guards) ⇒ no Reset, no hint, no
  crash. `resolveMenuControlDefault` is called only when `section` is present (guarded in
  `ControlDefaultHint`).
- `updateDoc` callbacks always `return current` when `current.sections[0]` is missing
  (mirror `@1305-1310`) — never throw from a control handler.
- No `setState` inside `useEffect`/render (the known menu-editor regression class): all new
  state is derived from `resolveMenuNavLevelStyle` / `resolveMenuControlDefault` per render;
  Reset/onChange only call `updateDoc` from event handlers.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

> The ≥5-scenario SMOKE (owner mandate, computed-style/geometry, real-input playwright) is
> authored in **506-05**, NOT here. This subtask ships the Vitest UI-lane coverage below.

**Vitest lane (Bun-free — UI component, jsdom):** `tests/vitest/ui/menu-design-editor.test.tsx`

- **F1 base Reset renders + clears (per surface):** with a DESKTOP-BASE value authored on a
  per-level field, a nav-base scalar, a navChrome field, and a brand field, assert the shell
  renders the base Reset (`data-menu-responsive-reset-kind="base"`, label "Reset to default",
  aria-label `Reset <label> to default`); click it → the corresponding
  `clearMenu*Base` fires and the field is removed from the doc (assert via `updateDoc`
  reducer result). Assert the base Reset does NOT render when the base record is unset.
  Assert on tablet/mobile the shell still shows the device Reset (`-kind="override"`) and NEVER
  the base branch (byte-identity of existing 501/504 behaviour holds ONLY for shells that don't
  pass `hasBaseValue`/`onResetBase`).
- **Update the migrated-control base-scope assertions (in-scope, expected flip):** because F1.b
  migrates the layout controls, the existing tests that seed a Desktop BASE `layout.paddingX: 8`
  and assert **no** Desktop reset — `menu-design-editor.test.tsx:883` (`No Reset affordance on
  Desktop (base scope)`) and the `:852` base-scope region of the `panel shows RESOLVED values…`
  test — MUST be updated HERE to instead expect the base Reset to render on Desktop
  (`data-menu-responsive-reset-kind="base"`, label "Reset to default") whenever the base value is
  present, and to null only when the base is unset. This assertion flip (null→present) is OWNED by
  506-04, not a 501/504 regression. Audit the sibling assertions for the same flip: `:1351`
  (`Dropdown direction` stays null — device-defining key, correctly EXCLUDED from F1 per the
  `MENU_NAV_DEVICE_DEFINING_KEYS` carve-out, so no update) and the brand base-scope path
  (`:1710` family — update only if a migrated brand base value is seeded).
- **F2 hint under every control:** for an UNSET numeric, enum, and color control at each of
  level N=1/2 (⇒ `Inherits level N−1 (<v>...)`: level 2 ⇒ `Inherits level 1`, level 1 ⇒ `Inherits level 0`), level 0 (⇒ theme/base default text), and
  tablet/mobile (⇒ `Inherited from desktop`), assert `data-menu-control-default-hint={key}`
  renders with the resolved value + source from `resolveMenuControlDefault`; assert the hint
  DISAPPEARS once the own record is set; assert the slider thumb shows the RESOLVED default
  (not `range.min`) at unset. Assert `onChange` still writes an explicit value (present-only:
  unset emits nothing — cross-check the CSS builder if needed, but the byte assertion lives in
  506-05). **`isSet`-derivation regression guard (the F2.b trap):** seed a field with a Desktop
  base value but NO Mobile override, switch to Mobile, and assert `data-menu-control-default-hint={key}`
  STILL renders with "Inherited from desktop" — proving `isSet` uses the override reader ALONE and
  was NOT collapsed to `hasBaseValue || override` (which the desktop base would make true, wrongly
  suppressing the hint).
- **B1–B5 controls write per-level + per-device:** each new control (toggle/seg/slider/swatch)
  on Desktop writes the BASE record (`patchMenuNavLevelStyleForDevice`/`setChromeField` desktop
  branch), on Mobile writes a SPARSE `responsive.mobile` override (assert only the touched key
  present); the enum "Default" sentinel writes `undefined` (clears). B4 pill renders only at
  level 0; B4 `containerPadding*` only at levels ≥ 1; B5 `submenuPlacement` only at level 2. `transitionMs`
  uses `unit="ms"`.
- **No regressions:** no `setState`-in-effect; existing 501/504 shell/level tests for
  **UN-MIGRATED** callers pass with ZERO edits (optional `hasBaseValue`/`onResetBase`
  back-compat). The ONLY existing-test edits allowed in this subtask are the base-scope
  assertion flips for controls F1.b migrates (the `:852`/`:883` layout base-scope assertions
  above) — every other existing 501/504 assertion stays byte-identical. The level-segmented
  selector + `forceOpenLevel` wiring unchanged.

**Type gates (per the typecheck-scope gotcha):** after the prop-signature change to
`MenuResponsiveControlShell`, run BOTH `bun --cwd core lint:types` AND root
`tsc -p tsconfig.json --noEmit` (the latter covers `tests/`, catching any excess-prop error
in the shell callers).

**Named guards asserted here (byte/behaviour-identity boundary this subtask must not cross):**
existing device-only Reset behaviour unchanged for un-migrated callers; `renderPreviewNavItem`
markup unchanged; NO model/CSS file edited (grep-assert `MenuDesignEditor.tsx` is the only
changed source file in the 506-04 diff). Cross-file invariants (present-only zero-byte
emission, `buildSiteShellCss(null)` byte-identity, base-clear round-trip byte-identity) are
owned by 506-01/02/05 — this subtask consumes them, and 506-05 asserts them end-to-end.

---

## Definition of Done

- `MenuResponsiveControlShell` shows a "Reset to default" affordance on any BASE control that
  carries an explicit value (desktop) AND keeps the device "Reset" for tablet/mobile overrides;
  both wired to the correct 506-01 clear helper.
- Every numeric/enum/color control shows a resolved effective-value + source hint when its own
  record is unset, from the single model provider (no hardcoded defaults in the editor); unset
  sliders show the resolved default, not `range.min`.
- B1–B5 controls are present per selected level (0/1/2) + per device, using existing primitives,
  each wrapped in the shell (⇒ Reset + hint), with correct level gating (pill=L0, container
  padding+placement=L≥1) and clamp bounds from the exported range tables.
- `MenuDesignEditor.tsx` is the ONLY source file changed; canvas force-open threads the selected
  level (B3 canvas visibility owned by 506-02).
- Vitest UI-lane green; `bun --cwd core lint`, `lint:types`, root `tsc --noEmit` green.

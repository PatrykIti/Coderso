# TASK-521-03-L01: Hero Tilt Model (type, schema, normalize, default)

# FileName: TASK-521-03-L01-Hero-Tilt-Model.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-03
**Priority:** Medium
**Category:** Widgets (Hero) / Schema
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY the model region of `core/widgets/core/hero.tsx`:
adds `HeroTilt` + `style.tilt?`, the `heroSchema` enum, the `normalizeHeroStyle`
branch, and the default. Disjoint from L02 (editor) and L03 (render).

## Grounded anchors

`HeroData.style` `:133` (`motion?: HeroMotionPreset`); `HeroMotionPreset` enum
`:23` (`none|fade-in|slide-up`) — the exact enum-field template; `heroSchema`
`:285` (`motion: { enum: ["none","fade-in","slide-up"] }`); `normalizeHeroStyle`
`:680-709` (returns `{ …, motion: resolveHeroMotionPreset(value.motion) }` `:709`);
`resolveHeroMotionPreset` `:555`; `heroDefaults` `:323`. The hero style is a
present-only object (`normalizeHeroStyle` returns `undefined` when empty), so a new
optional key stays present-only.

## Implementation pseudocode

```ts
// (1) Type + enum (near HeroMotionPreset :23):
export type HeroTilt = "none" | "subtle" | "strong";
export const heroTilts = ["none","subtle","strong"] as const;
const HERO_TILT_MAX_DEG: Record<HeroTilt, number> = { none: 0, subtle: 5, strong: 8 };

// (2) HeroData.style:
style?: { /* …existing incl. motion… */ tilt?: HeroTilt };

// (3) heroSchema (:285 neighborhood):
tilt: { enum: ["none","subtle","strong"] },

// (4) resolver + normalizeHeroStyle branch (:709 neighborhood):
const resolveHeroTilt = (value: string | undefined): HeroTilt =>
  value === "subtle" || value === "strong" ? value : "none";
// inside normalizeHeroStyle result:
...(value.tilt !== undefined && resolveHeroTilt(value.tilt) !== "none"
  ? { tilt: resolveHeroTilt(value.tilt) } : {}),   // present-only: omit "none"

// (5) heroDefaults.style — leave tilt UNSET (present-only default = no tilt).
```

Export `HERO_TILT_MAX_DEG` (or keep module-local) for L03 to derive the CSS
perspective/max-rotation.

## Regression-test shape (delegated to L04, asserted here)

- Round-trip `style.tilt:"subtle"`; `"none"` omitted; invalid `"wild"` → omitted
  (resolves none); hero with no tilt byte-identical.

## Hard Invariants

1. Present-only (`"none"` omitted; default unset).
2. Enum-guarded via `resolveHeroTilt` (fail-soft none).
3. Separate from `motion`.

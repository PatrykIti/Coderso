# TASK-521-01-L03: Animated-Icon Block Model (type, prop keys, defaults, normalize)

# FileName: TASK-521-01-L03-Animated-Icon-Block-Model.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-01
**Priority:** High
**Category:** Schema (JSON model) / Widgets
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY the block-type / block-prop region of
`core/services/pages/pageDocumentV2.ts`: adds `"animatedIcon"` to `pageBlockTypes`
(`:50-72`), its entry in `pageBlockPropKeys` (`:591`), its default props, and the
block-prop normalization path (whatever `normalizeBlock`/`props` allowlist governs
per-type props). Defines the curated icon/animation vocabulary from the 521-01
shared block. Leaves the pending `icon` block (`case "icon": return null`,
`pageRendererV2.tsx:1913`) UNTOUCHED. Disjoint from L01/L02. The WIDGET file +
renderer case + registry are 521-04.

## Grounded anchors

`pageBlockTypes` `:50-72` (const array; `"icon"` already present at `:67`);
`pageBlockPropKeys: Record<PageBlockType, readonly string[]>` `:591` (per-type prop
allowlist; `icon: ["name","label"]` `:629`); block default-props map (search near
`:836`/`:872` — `icon: null` / `icon: { name: "sparkles", label: "" }`); the block
normalization walks `pageBlockPropKeys[type]` to reject-unknown props. Helpers
`readNumber` (`:1549`), `readSafeColor` (`:1516`), `normalizeEnum` (`:1554`),
`readText` (`:1502`).

## Implementation pseudocode

```ts
// (1) Shared vocabulary (top-of-file const region):
export const animatedIconAnimations = ["none","spin","pulse","bounce","draw"] as const;
export type AnimatedIconAnimation = (typeof animatedIconAnimations)[number];
export const ANIMATED_ICON_SIZE_CLAMP  = { min: 16,  max: 160  } as const;  // px
export const ANIMATED_ICON_SPEED_CLAMP = { min: 400, max: 4000 } as const;  // ms
export const animatedIconNames = [
  "sparkles","star","heart","zap","check","shield","arrow-right","bell","rocket","loader",
] as const;
export type AnimatedIconName = (typeof animatedIconNames)[number];
export const ANIMATED_ICON_NAME_PATTERN = /^[a-z0-9-]{1,48}$/;
// Write-boundary resolver: pattern + set membership, fail-soft to "sparkles".
export const resolveAnimatedIconName = (value: unknown): AnimatedIconName => {
  if (typeof value !== "string" || !ANIMATED_ICON_NAME_PATTERN.test(value)) return "sparkles";
  return (animatedIconNames as readonly string[]).includes(value)
    ? (value as AnimatedIconName) : "sparkles";
};

// (2) Block type + prop keys:
export const pageBlockTypes = [ /* …existing… */, "animatedIcon" ] as const;
pageBlockPropKeys.animatedIcon = ["icon","animation","size","color","speed"] as const;

// (3) Default props (present in the block default map, like other blocks):
animatedIcon: { icon: "sparkles", animation: "pulse", size: 48, color: "var(--primary)", speed: 1600 }

// (4) Per-type prop normalization (in the block-props normalizer, case "animatedIcon"):
const props = {
  icon: resolveAnimatedIconName(input.icon),
  animation: normalizeEnum(input.animation, animatedIconAnimations, "pulse",
    `${path}.animation`, mode),
  size: readNumber(input.size, 48, ANIMATED_ICON_SIZE_CLAMP.min, ANIMATED_ICON_SIZE_CLAMP.max),
  color: readSafeColor(input.color, "var(--primary)"),
  speed: readNumber(input.speed, 1600, ANIMATED_ICON_SPEED_CLAMP.min, ANIMATED_ICON_SPEED_CLAMP.max),
};
```

**Design note:** props are ALWAYS fully-populated (this is a data-carrying block,
not a present-only style extension), so a default `animatedIcon` block round-trips
its five props. Present-only byte-identity applies at the DOCUMENT level: legacy
docs never contain an `animatedIcon` block, so they normalize unchanged; the new
block type only appears once an author inserts it.

## Regression-test shape (delegated to L05, asserted here)

- `pageBlockTypes` contains `"animatedIcon"`; `createPageBlockV2("animatedIcon")`
  yields the default props; round-trip identical; `icon:"../../x"` and
  `icon:"not-in-set"` → `"sparkles"`; `animation:"explode"` → `"pulse"`;
  `size:9999`/`speed:10` clamped; `color:"expression(1)"` → `var(--primary)`;
  an unknown prop `animatedIcon.props.wobble` throws `PageDocumentError`;
  the pending `icon` block still normalizes to `return null` behavior unchanged.

## Hard Invariants

1. `icon` name = pattern + set-membership allowlist (fail-soft `"sparkles"`).
2. All numeric/enum props clamped/enum-guarded; color via `readSafeColor`.
3. `pageBlockPropKeys.animatedIcon` reject-unknown; JSON schema mirror updated if
   block props are schema-validated.
4. Pending `icon` block untouched.

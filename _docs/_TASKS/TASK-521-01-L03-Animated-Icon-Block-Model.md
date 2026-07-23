# TASK-521-01-L03: Animated-Icon Block Model (implement the `icon` block — prop keys, defaults, normalize) — NO capability flip (moved to 521-04)

# FileName: TASK-521-01-L03-Animated-Icon-Block-Model.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-01
**Priority:** High
**Category:** Schema (JSON model) / Widgets
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Edits ONLY the block-model region of
`core/services/pages/pageDocumentV2.ts` to extend the existing `icon` block's PROP
MODEL toward the animated-icon block — **NO new `pageBlockTypes` member** (avoids
the exhaustive `Record<PageBlockType,…>` explosion). Extends `pageBlockPropKeys.icon`
(`:629`) with present-only `animation`/`size`/`color`/`speed`, extends the icon
default props, adds the block-prop normalization for the new keys, and mirrors the
new keys into the Ajv schema. Defines the curated icon/animation vocabulary from the
521-01 shared block. Disjoint from L01/L02.

**IMPORTANT — this leaf does NOT flip the `icon` capability.** The block STAYS a
non-insertable placeholder (`runtimeRenderer:"placeholder"`,
`editorInsertable:false`, reason `"icon-runtime-renderer-pending"`) after 521-01, so
521-01 lands GREEN in isolation against the currently-frozen capability tests
(`tests/vitest/pages/page-editor-control-registry.test.ts:378-407`,
`tests/vitest/ui/page-editor-v2-flow.test.tsx:2324-2330`). The capability flip
(`realRuntimeBlockTypes` + `editorInsertableBlockTypes` add, `pageBlockCapabilityReasons.icon`
delete) MOVED to **521-04-L03**, where it lands WITH the renderer `case "icon"`
(521-04-L02), the palette copy, and the block controls the flow/ui-model tests
require — and where 521-04-L04 owns the edits to those frozen assertions. The
RENDER (`case "icon"`), glyph set, palette copy, and capability flip are all 521-04.
Extending the prop model + defaults here (without inserting the block) is safe: no
live document contains an `icon` block (it renders `null` / is non-insertable), and
a non-insertable block with extra allowlisted props changes no existing test.

## Grounded anchors

`pageBlockTypes` `:50-72` (`"icon"` at `:67` — UNCHANGED); `pageBlockPropKeys.icon
= ["name","label"]` (`:629`); icon default props `{ name:"sparkles", label:"" }`
(`:872`) + the `icon: null` slot map at `:836` (leave `:836` — a different
context); `realRuntimeBlockTypes` (`:691-712`, no `icon`);
`editorInsertableBlockTypes` (`:715-753`, no `icon`); `insertableBlockTypes =
editorInsertableBlockTypes` (`:754`); `pageBlockCapabilityReasons.icon =
"icon-runtime-renderer-pending"` (`:774`). Helpers `readNumber` (`:1549`),
`readSafeColor` (`:1516`), `normalizeEnum` (`:1554`, **fail-CLOSED — throws in
write mode**), `readText` (`:1502`). The per-type block-prop normalizer is
`normalizeBlockProp(type, key, value, mode, path)` (`:2539`) — an `(type, key)`
if-chain, NOT a per-type props object — with a generic string tail
`if (typeof value === "string") return value.trim()` (`:2661`); icon-key branches
MUST precede that tail or `name` bypasses the icon-name allowlist.

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
export const resolveAnimatedIconName = (value: unknown): AnimatedIconName => {
  if (typeof value !== "string" || !ANIMATED_ICON_NAME_PATTERN.test(value)) return "sparkles";
  return (animatedIconNames as readonly string[]).includes(value)
    ? (value as AnimatedIconName) : "sparkles";
};

// (2) Extend the icon prop allowlist (:629):
icon: ["name","label","animation","size","color","speed"],

// (3) Extend icon default props (:872) — present-only new keys default to sensible values:
icon: { name: "sparkles", label: "", animation: "pulse", size: 48,
        color: "var(--primary)", speed: 1600 },

// (4) Icon block-prop normalization — add per-KEY branches to normalizeBlockProp
//     (:2539, the if-chain keyed on (type,key)), placed BEFORE the generic string
//     tail (:2661). There is NO per-type props object to write into — each key is
//     normalized individually as normalizeBlockProp iterates pageBlockPropKeys.icon:
if (type === "icon" && key === "name")      return resolveAnimatedIconName(value);            // allowlist (fail-soft "sparkles")
if (type === "icon" && key === "animation") return normalizeEnum(value, animatedIconAnimations, "none", path, mode); // fail-CLOSED: bad value throws in write mode
if (type === "icon" && key === "size")      return readNumber(value, 48, ANIMATED_ICON_SIZE_CLAMP.min, ANIMATED_ICON_SIZE_CLAMP.max);   // clamp (fail-soft)
if (type === "icon" && key === "color")     return readSafeColor(value, "var(--primary)");   // whitelist (fail-soft)
if (type === "icon" && key === "speed")     return readNumber(value, 1600, ANIMATED_ICON_SPEED_CLAMP.min, ANIMATED_ICON_SPEED_CLAMP.max); // clamp (fail-soft)
// `label` needs no icon-specific branch — it falls through to the generic text
// tail (:2661). CRITICAL: the `name` branch MUST sit above that generic
// `value.trim()` tail, else `name` bypasses the icon-name allowlist (Security §3).

// (5) NO capability flip here. `realRuntimeBlockTypes` (:691),
//     `editorInsertableBlockTypes` (:715), and `pageBlockCapabilityReasons.icon`
//     (:774) are LEFT UNCHANGED by 521-01 (icon stays a non-insertable placeholder),
//     so the frozen capability tests stay green through 521-01. The flip lands in
//     521-04-L03 (with the renderer/palette/controls) — see the Scope note.
```

**Back-compat note:** `name` was previously a free-text prop; switching it to
`resolveAnimatedIconName` (allowlist, fail-soft `"sparkles"`) is safe because the
`icon` block rendered `null` and was non-insertable — no live document carries an
`icon` block with an out-of-set name. The exhaustive records
(`pageBlockPropKeys`, `blockOptionCopy`) already have an `icon` key, so typecheck
stays green with no cross-file atomic land.

## JSON-schema mirror — MANDATORY (not conditional)

The icon block's props ARE Ajv-validated: `pageDocumentV2JsonSchema` auto-includes
every `pageBlockPropKeys` entry via `blockPropJsonSchemaForType(type, key)`
(`pageDocumentV2.ts:1183`, `additionalProperties:false`). That function's
fall-through maps the NEW icon keys WRONG relative to the normalizer, so the Ajv
defence-in-depth layer would be looser than and type-inconsistent with the
authoritative normalizer (violating parent Security Contract §5 "in lockstep"):
- `speed` hits no case → generic tail `return stringSchema` (`:1119`,
  `{type:"string"}`) while the normalizer stores a NUMBER → an Ajv round-trip of an
  icon block FAILS on type.
- `size` matches the global `key === "size"` (`:1091`) → `numericSchema(0,240)`,
  diverging from the icon clamp `16..160`.
- `animation` hits the generic tail → `stringSchema` (accepts ANY string, e.g.
  `"explode"`) whereas the normalizer is fail-CLOSED on the enum.

**REQUIRED edit — add explicit per-(type,key) cases in `blockPropJsonSchemaForType`
BEFORE the global `key === "size"` (`:1091`) and the generic string tail (`:1119`),
mirroring the existing `type === "badge" && key === "size"` precedent (`:1044`):**
```ts
if (type === "icon" && key === "animation") return { type: "string", enum: [...animatedIconAnimations] };
if (type === "icon" && key === "size")      return numericSchema(16, 160);   // BEFORE the generic key==="size" @ :1091
if (type === "icon" && key === "speed")     return numericSchema(400, 4000); // BEFORE the generic string tail @ :1119
// `color` and `name` fall through to stringSchema (type-correct); OPTIONALLY
// constrain: name → { type:"string", enum:[...animatedIconNames] } for tighter Ajv.
```
Keep `additionalProperties:false`. The Ajv layer now matches the normalizer's
types/clamps/enum for every new icon prop.

## Regression-test shape (delegated to L05, asserted here)

- `pageBlockCapabilities.icon` STAYS `{ runtimeRenderer:"placeholder",
  editorInsertable:false, insertable:false, reason:"icon-runtime-renderer-pending" }`
  after 521-01 (NO flip here — the frozen capability tests stay green; the flip +
  its test edits are 521-04-L03/L04). `createPageBlockV2("icon")` yields the
  extended default props `{name,label,animation,size,color,speed}` + round-trips;
  `name:"../../x"` / `name:"not-in-set"` → `"sparkles"` (fail-soft);
  `animation:"explode"` THROWS `PageDocumentError` (enum is fail-closed in write
  mode, NOT silently coerced to `"none"`); `size:9999`/`speed:10` clamped
  (fail-soft); `color:"expression(1)"` → `var(--primary)` (fail-soft); unknown prop
  `icon.props.wobble` throws `PageDocumentError`.
- **Ajv lockstep (L05 case, `tests/vitest/pages/page-document-v2.test.ts`,
  `ajv.compile`):** a normalized icon block with a NUMERIC `speed` (e.g. `1600`)
  and `size` (e.g. `48`) VALIDATES against `pageDocumentV2JsonSchema` — proving
  `blockPropJsonSchemaForType` returns `numericSchema` for icon `speed`/`size`
  (not the generic `stringSchema`) and `enum` for `animation`; a doc that reached
  the schema with a string `speed` would FAIL, guarding the mirror.

## Hard Invariants

1. NO new `pageBlockTypes` member (no exhaustive-record explosion).
2. `name` = pattern + set-membership allowlist (fail-soft `"sparkles"`); numeric
   props (`size`/`speed`) clamped (fail-soft); `animation` enum is fail-CLOSED
   (invalid value throws `PageDocumentError` in write mode); color via
   `readSafeColor` (fail-soft).
3. `pageBlockPropKeys.icon` reject-unknown. **NO capability flip in this leaf** —
   `icon` stays a non-insertable placeholder after 521-01 (frozen capability tests
   stay green); the flip is 521-04-L03.
4. Ajv schema in lockstep with the normalizer: `blockPropJsonSchemaForType` has
   explicit `icon` cases for `animation` (enum), `size` (`16..160`), `speed`
   (`400..4000`) placed BEFORE the generic `key==="size"` (`:1091`) and string tail
   (`:1119`) — the defence-in-depth layer is not looser than the write normalizer.
